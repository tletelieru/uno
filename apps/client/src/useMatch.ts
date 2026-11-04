import { useContext, useEffect, useEffectEvent, useState } from 'react'
import { BOTS, createRng } from '@uno/bots'
import type { Level } from '@uno/bots'
import {
  HAND_SIZE,
  applyAction,
  createMatch,
  legalActions,
  matchTotals,
  matchWinners,
  startNextRound,
  viewFor,
} from '@uno/engine'
import type { Action, Card, Color, MatchConfig, MatchState } from '@uno/engine'
import type { BotReply, BotRequest } from './botWorker'
import { HUMAN } from './lib/cards'
import { saveRecord } from './lib/history'
import { clearSavedMatch, writeSavedMatch } from './lib/savedMatch'
import { ACTION_SOUNDS, DRAW_SOUNDS, ROUND_SOUNDS, MusicContext, SETUP_TRACKS, SoundContext, trackForMatch } from './lib/sound'

let worker: Worker | null = null
let requestId = 0

function botWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  worker ??= new Worker(new URL('./botWorker.ts', import.meta.url), { type: 'module' })
  return worker
}

const BOT_DELAY = 800
const QUICK_DELAY = 450
const DEAL_STEP = 70
const SETTLE_STEP = 350
const LIFT_HOLD = 320
const LATE_UNO = { easy: 1600, medium: 500, hard: 300 }
const EASY_FORGET = 0.5

export function dealSteps(players: number): number {
  return players * HAND_SIZE + 2
}

function reducedMotion(): boolean {
  return document.documentElement.classList.contains('reduce-motion')
}

const MIN_HOPS = 10
const FIRST_HOP = 60
const HOP_SLOWDOWN = 300
const ANNOUNCE_HOLD = 800

export type Intro = { kind: 'hop'; hop: number } | { kind: 'announce' }

export function hopCount(players: number, dealer: number): number {
  return players * Math.ceil(MIN_HOPS / players) + dealer
}

export function hopDelay(hop: number, total: number): number {
  return FIRST_HOP + HOP_SLOWDOWN * (hop / total) ** 2
}

function startIntro(restored: MatchState | null): Intro | null {
  if (restored) return null
  if (reducedMotion()) return { kind: 'announce' }
  return { kind: 'hop', hop: 0 }
}

function dealProgress(
  intro: Intro | null,
  dealing: boolean,
  deal: { round: number; step: number },
  roundIndex: number,
  total: number,
): number {
  if (intro !== null) return 0
  if (!dealing) return total
  if (reducedMotion()) return total
  return deal.round === roundIndex ? deal.step : 0
}

function spotlightSeat(intro: Intro | null, state: MatchState): number | null {
  if (intro === null) return null
  if (intro.kind === 'announce') return state.dealer
  return intro.hop % state.players
}

function isFresh(state: MatchState): boolean {
  return state.round.moves.every((move) => move.kind === 'draw' && move.penalty)
}

function botDelay(state: MatchState): number {
  const last = state.round.moves.at(-1)
  if (last && last.seat === state.round.turn && last.kind !== 'draw') return QUICK_DELAY
  return BOT_DELAY
}

export function useMatch(config: MatchConfig, seed: number, level: Level, restored: MatchState | null) {
  const [state, setState] = useState(() => restored ?? createMatch(config, seed))
  const [rng] = useState(() => createRng(seed))
  const [dealt, setDealt] = useState<number | null>(restored && !isFresh(restored) ? restored.roundIndex : null)
  const [intro, setIntro] = useState<Intro | null>(() => startIntro(restored))
  const sound = useContext(SoundContext)
  const music = useContext(MusicContext)
  const dealing = intro === null && state.status === 'playing' && dealt !== state.roundIndex && isFresh(state)
  const [deal, setDeal] = useState({ round: -1, step: 0 })
  const [botLift, setBotLift] = useState(false)
  const holding = intro !== null || dealing
  const total = dealSteps(state.players)
  const dealStep = dealProgress(intro, dealing, deal, state.roundIndex, total)
  const hops = hopCount(state.players, state.dealer)
  const spotlight = spotlightSeat(intro, state)

  function act(action: Action) {
    const next = applyAction(state, action)
    const effect = ACTION_SOUNDS[action.type]
    if (effect) sound?.play(effect)
    music?.setTrack(trackForMatch(next))
    if (next.status === 'roundOver') {
      const won = next.results[next.results.length - 1].winner === HUMAN
      sound?.play(won ? ROUND_SOUNDS.won : ROUND_SOUNDS.lost)
    }
    if (next.status === 'matchOver') {
      saveRecord({
        id: seed,
        finishedAt: Date.now(),
        players: next.players,
        level,
        target: next.target,
        results: next.results,
        totals: matchTotals(next),
        winners: matchWinners(next),
      })
      if (sound) music?.jingle(matchWinners(next).includes(HUMAN))
    }
    setState(next)
  }

  const actFromBot = useEffectEvent(act)

  // eslint-disable-next-line local/no-effect -- persists the match in progress to localStorage
  useEffect(() => {
    if (state.status === 'matchOver') clearSavedMatch()
    else writeSavedMatch({ state, seed, level })
  }, [state, seed, level])

  // eslint-disable-next-line local/no-effect -- drives the dealer draw with timers before the first deal
  useEffect(() => {
    if (intro === null) return
    if (intro.kind === 'announce') {
      const timer = setTimeout(() => setIntro(null), ANNOUNCE_HOLD)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      if (intro.hop < hops) {
        sound?.play(DRAW_SOUNDS.hop)
        setIntro({ kind: 'hop', hop: intro.hop + 1 })
        return
      }
      sound?.play(DRAW_SOUNDS.stop)
      setIntro({ kind: 'announce' })
    }, hopDelay(intro.hop, hops))
    return () => clearTimeout(timer)
  }, [intro, hops, sound])

  // eslint-disable-next-line local/no-effect -- runs bot turns with timers and the bot Web Worker
  useEffect(() => {
    if (intro !== null) return
    if (dealing) {
      const step = deal.round === state.roundIndex ? deal.step : 0
      if (step >= total || reducedMotion()) {
        const timer = setTimeout(() => setDealt(state.roundIndex), step >= total ? SETTLE_STEP : 0)
        return () => clearTimeout(timer)
      }
      const delay = step >= total - 2 ? SETTLE_STEP : DEAL_STEP
      const timer = setTimeout(() => {
        if (step < total - 2) sound?.play(DRAW_SOUNDS.deal)
        setDeal({ round: state.roundIndex, step: step + 1 })
      }, delay)
      return () => clearTimeout(timer)
    }
    const seat = state.round.turn
    if (state.status !== 'playing') return
    if (seat === HUMAN) {
      const options = legalActions(state, HUMAN)
      if (options.length !== 1 || options[0].type !== 'pass') return
      const timer = setTimeout(() => actFromBot(options[0]), BOT_DELAY * 2)
      return () => clearTimeout(timer)
    }
    const delay = botDelay(state)
    let lift: ReturnType<typeof setTimeout> | undefined
    const perform = (action: Action) => {
      if (action.type !== 'draw' || reducedMotion()) return actFromBot(action)
      setBotLift(true)
      lift = setTimeout(() => {
        lift = undefined
        setBotLift(false)
        actFromBot(action)
      }, LIFT_HOLD)
    }
    const cancelLift = () => {
      if (lift === undefined) return
      clearTimeout(lift)
      setBotLift(false)
    }
    const view = viewFor(state, seat)
    const actions = legalActions(state, seat)
    const thinker = level === 'easy' ? null : botWorker()
    if (!thinker) {
      const timer = setTimeout(() => {
        perform(BOTS[level].choose(view, actions, rng))
      }, delay)
      return () => {
        clearTimeout(timer)
        cancelLift()
      }
    }
    const id = (requestId += 1)
    let waited = false
    let reply: Action | null = null
    const commit = () => {
      if (waited && reply) perform(reply)
    }
    const timer = setTimeout(() => {
      waited = true
      commit()
    }, delay)
    thinker.onmessage = (event: MessageEvent<BotReply>) => {
      if (event.data.id !== id) return
      reply = event.data.action
      commit()
    }
    const botSeed = Math.floor(rng() * 2 ** 31)
    thinker.postMessage({ id, level, view, legal: actions, seed: botSeed } satisfies BotRequest)
    return () => {
      clearTimeout(timer)
      cancelLift()
      thinker.onmessage = null
    }
  }, [state, intro, dealing, deal, total, sound, rng, level])

  // eslint-disable-next-line local/no-effect -- lets a bot that skipped UNO shout it late with a timer
  useEffect(() => {
    if (holding || state.status !== 'playing') return
    const seat = state.round.exposed
    if (seat === null || seat === HUMAN) return
    const timer = setTimeout(() => {
      if (level === 'easy' && rng() < EASY_FORGET) return
      actFromBot({ type: 'uno', seat })
    }, LATE_UNO[level])
    return () => clearTimeout(timer)
  }, [state, holding, level, rng])

  const legal: Action[] = holding ? [] : legalActions(state, HUMAN)

  return {
    state,
    holding,
    dealing,
    dealStep,
    intro,
    spotlight,
    legal,
    botLift,
    play: (card: Card, color?: Color) => act({ type: 'play', seat: HUMAN, card, color }),
    draw: () => act({ type: 'draw', seat: HUMAN }),
    callUno: () => act({ type: 'uno', seat: HUMAN }),
    catchUno: () => act({ type: 'catch', seat: HUMAN }),
    choose: (color: Color) => act({ type: 'choose', seat: HUMAN, color }),
    next: () => {
      music?.setTrack(SETUP_TRACKS.round)
      setState(startNextRound(state))
    },
  }
}
