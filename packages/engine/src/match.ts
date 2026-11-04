import { COLORS, createDeck, isWild, sameCard } from './cards'
import type { Card, Color, Face, PlayerCount, Seat } from './cards'
import { nextRandom, shuffle } from './rng'
import { handPoints, totalsFor } from './scoring'
import type { RoundResult, Score, Target } from './scoring'

export const HAND_SIZE = 7

export const UNO_PENALTY = 1

export interface HouseRules {
  stacking: boolean
  drawToPlay: boolean
}

export const DEFAULT_RULES: HouseRules = { stacking: true, drawToPlay: false }

export interface MatchConfig {
  players: PlayerCount
  target?: Target
  rules?: Partial<HouseRules>
}

export type Phase = 'choose' | 'play'

export type Direction = 1 | -1

export type Move =
  | { kind: 'play'; seat: Seat; card: Card; color: Color }
  | { kind: 'draw'; seat: Seat; count: number; color: Color; penalty: boolean }
  | { kind: 'pass'; seat: Seat }
  | { kind: 'uno'; seat: Seat }
  | { kind: 'catch'; seat: Seat; target: Seat }
  | { kind: 'choose'; seat: Seat; color: Color }

export interface RoundState {
  hands: Card[][]
  deck: Card[]
  discard: Card[]
  color: Color
  turn: Seat
  direction: Direction
  phase: Phase
  drawn: Card | null
  pending: number
  called: Seat | null
  exposed: Seat | null
  passes: number
  moves: Move[]
  winner: Seat | null
}

export type MatchStatus = 'playing' | 'roundOver' | 'matchOver'

export interface MatchState {
  players: PlayerCount
  target: Target
  rules: HouseRules
  rng: number
  dealer: Seat
  roundIndex: number
  round: RoundState
  results: RoundResult[]
  status: MatchStatus
}

export type Action =
  | { type: 'play'; seat: Seat; card: Card; color?: Color }
  | { type: 'draw'; seat: Seat }
  | { type: 'pass'; seat: Seat }
  | { type: 'uno'; seat: Seat }
  | { type: 'catch'; seat: Seat }
  | { type: 'choose'; seat: Seat; color: Color }

const DRAW_AMOUNT: Partial<Record<Face | 'wild' | 'draw4', number>> = { draw2: 2, draw4: 4 }

export function seatAfter(seat: Seat, steps: number, direction: Direction, players: number): Seat {
  return (((seat + direction * steps) % players) + players) % players
}

export function topCard(round: RoundState): Card {
  return round.discard[round.discard.length - 1]
}

export function matchesTop(card: Card, top: Card, color: Color): boolean {
  if (isWild(card)) return true
  if (card.color === color) return true
  return top.kind === 'color' && top.face === card.face
}

function canStack(card: Card, top: Card, color: Color): boolean {
  if (card.face === 'draw4') return true
  if (card.face !== 'draw2') return false
  return top.face === 'draw2' || card.color === color
}

function drawable(round: RoundState): number {
  return round.deck.length + Math.max(0, round.discard.length - 1)
}

interface Drawing {
  round: RoundState
  rng: number
  cards: Card[]
}

function refill(round: RoundState, rng: number): { round: RoundState; rng: number } {
  if (round.deck.length > 0 || round.discard.length <= 1) return { round, rng }
  const top = topCard(round)
  const { items, rng: next } = shuffle(round.discard.slice(0, -1), rng)
  return { round: { ...round, deck: items, discard: [top] }, rng: next }
}

function drawCards(start: RoundState, rng: number, seat: Seat, count: number): Drawing {
  let round = start
  let current = rng
  const cards: Card[] = []
  for (let taken = 0; taken < count; taken++) {
    ;({ round, rng: current } = refill(round, current))
    if (round.deck.length === 0) break
    cards.push(round.deck[0])
    round = { ...round, deck: round.deck.slice(1) }
  }
  const hands = round.hands.map((hand, index) => (index === seat ? [...hand, ...cards] : hand))
  return { round: { ...round, hands }, rng: current, cards }
}

function penalize(drawing: Drawing, seat: Seat, count: number): Drawing {
  const result = drawCards(drawing.round, drawing.rng, seat, count)
  const move: Move = {
    kind: 'draw',
    seat,
    count: result.cards.length,
    color: result.round.color,
    penalty: true,
  }
  return { ...result, round: { ...result.round, moves: [...result.round.moves, move] } }
}

function flipStart(deck: Card[], rng: number): { deck: Card[]; start: Card; rng: number } {
  let pile = deck
  let current = rng
  while (pile[0].face === 'draw4') {
    const reshuffled = shuffle(pile, current)
    pile = reshuffled.items
    current = reshuffled.rng
  }
  return { deck: pile.slice(1), start: pile[0], rng: current }
}

function startRound(players: PlayerCount, dealer: Seat, rng: number): { round: RoundState; rng: number } {
  const shuffled = shuffle(createDeck(), rng)
  const hands: Card[][] = Array.from({ length: players }, () => [])
  const first = seatAfter(dealer, 1, 1, players)
  for (let card = 0; card < HAND_SIZE; card++) {
    for (let offset = 0; offset < players; offset++) {
      hands[seatAfter(first, offset, 1, players)].push(shuffled.items[card * players + offset])
    }
  }
  const flipped = flipStart(shuffled.items.slice(HAND_SIZE * players), shuffled.rng)
  const { start } = flipped
  const base: RoundState = {
    hands,
    deck: flipped.deck,
    discard: [start],
    color: start.kind === 'color' ? start.color : COLORS[0],
    turn: first,
    direction: 1,
    phase: 'play',
    drawn: null,
    pending: 0,
    called: null,
    exposed: null,
    passes: 0,
    moves: [],
    winner: null,
  }
  if (start.kind === 'wild') return { round: { ...base, phase: 'choose' }, rng: flipped.rng }
  if (start.face === 'skip') return { round: { ...base, turn: seatAfter(first, 1, 1, players) }, rng: flipped.rng }
  if (start.face === 'reverse') return { round: { ...base, turn: dealer, direction: -1 }, rng: flipped.rng }
  if (start.face === 'draw2') return { round: { ...base, pending: 2 }, rng: flipped.rng }
  return { round: base, rng: flipped.rng }
}

function resolveRules(rules: Partial<HouseRules> | undefined): HouseRules {
  return { ...DEFAULT_RULES, ...rules }
}

export function createMatch(config: MatchConfig, seed: number): MatchState {
  const { players } = config
  const random = nextRandom(seed)
  const dealer = Math.floor(random.value * players)
  const { round, rng } = startRound(players, dealer, random.rng)
  return {
    players,
    target: config.target ?? 500,
    rules: resolveRules(config.rules),
    rng,
    dealer,
    roundIndex: 0,
    round,
    results: [],
    status: 'playing',
  }
}

export function startNextRound(state: MatchState): MatchState {
  if (state.status !== 'roundOver') throw new Error('The current round has not finished')
  const dealer = seatAfter(state.dealer, 1, 1, state.players)
  const { round, rng } = startRound(state.players, dealer, state.rng)
  return { ...state, rng, dealer, roundIndex: state.roundIndex + 1, round, status: 'playing' }
}

function playActions(seat: Seat, cards: Card[]): Action[] {
  return cards.flatMap((card): Action[] => {
    if (!isWild(card)) return [{ type: 'play', seat, card }]
    return COLORS.map((color): Action => ({ type: 'play', seat, card, color }))
  })
}

export function playableCards(state: MatchState, seat: Seat): Card[] {
  const { round } = state
  if (state.status !== 'playing' || round.turn !== seat) return []
  const top = topCard(round)
  if (round.phase === 'choose') return []
  const hand = round.hands[seat]
  if (round.pending > 0) return state.rules.stacking ? hand.filter((card) => canStack(card, top, round.color)) : []
  return hand.filter((card) => matchesTop(card, top, round.color))
}

function windowActions(round: RoundState, seat: Seat): Action[] {
  if (round.exposed === null) return []
  if (round.exposed === seat) return [{ type: 'uno', seat }]
  return [{ type: 'catch', seat }]
}

function turnActions(state: MatchState, seat: Seat): Action[] {
  const { round } = state
  if (round.phase === 'choose') {
    return COLORS.map((color): Action => ({ type: 'choose', seat, color }))
  }
  const cards = playableCards(state, seat)
  const plays = playActions(seat, cards)
  const canCall =
    cards.length > 0 && round.hands[seat].length === 2 && round.called !== seat
  const call: Action[] = canCall ? [{ type: 'uno', seat }] : []
  if (round.pending > 0) return [...call, ...plays, { type: 'draw', seat }]
  if (drawable(round) > 0) return [...call, ...plays, { type: 'draw', seat }]
  if (plays.length > 0) return [...call, ...plays]
  return [{ type: 'pass', seat }]
}

export function legalActions(state: MatchState, seat: Seat): Action[] {
  if (state.status !== 'playing') return []
  const { round } = state
  const window = windowActions(round, seat)
  if (round.turn !== seat) return window
  const own = turnActions(state, seat)
  const extra = window.filter((action) => !own.some((item) => item.type === action.type))
  return [...extra, ...own]
}

function sameAction(a: Action, b: Action): boolean {
  if (a.type !== b.type || a.seat !== b.seat) return false
  if (a.type === 'play' && b.type === 'play') {
    return sameCard(a.card, b.card) && a.color === b.color
  }
  if (a.type === 'choose' && b.type === 'choose') return a.color === b.color
  return true
}

export function isLegal(state: MatchState, action: Action): boolean {
  return legalActions(state, action.seat).some((legal) => sameAction(legal, action))
}

function withRound(state: MatchState, round: RoundState, rng = state.rng): MatchState {
  return { ...state, round, rng }
}

function logMove(round: RoundState, move: Move): RoundState {
  return { ...round, moves: [...round.moves, move] }
}

function blockedWinner(round: RoundState): Seat {
  const order = round.hands.map((hand, seat) => ({ seat, points: handPoints(hand), cards: hand.length }))
  order.sort((a, b) => a.points - b.points || a.cards - b.cards || a.seat - b.seat)
  return order[0].seat
}

function finishRound(state: MatchState, round: RoundState, rng: number, winner: Seat, blocked: boolean): MatchState {
  const remaining = round.hands.map(handPoints)
  const points = remaining.reduce((sum, value, seat) => (seat === winner ? sum : sum + value), 0)
  const results = [...state.results, { winner, points, remaining, blocked }]
  const totals = totalsFor(results, state.players)
  const status = totals.some((total) => total >= state.target) ? 'matchOver' : 'roundOver'
  return {
    ...state,
    rng,
    round: { ...round, winner, exposed: null, called: null, drawn: null, pending: 0 },
    results,
    status,
  }
}

function endTurn(round: RoundState, players: number): RoundState {
  return {
    ...round,
    turn: seatAfter(round.turn, 1, round.direction, players),
    phase: 'play',
    drawn: null,
    called: null,
  }
}

function applyPlay(state: MatchState, seat: Seat, card: Card, chosen: Color | undefined): MatchState {
  const { players } = state
  const before = state.round
  const color = card.kind === 'color' ? card.color : (chosen ?? COLORS[0])
  const hands = before.hands.map((hand, index) =>
    index === seat ? hand.filter((held) => !sameCard(held, card)) : hand,
  )
  const left = hands[seat].length
  const exposed = left === 1 && before.called !== seat ? seat : null
  const round: RoundState = logMove(
    {
      ...before,
      hands,
      discard: [...before.discard, card],
      color,
      exposed,
      called: null,
      drawn: null,
      passes: 0,
      phase: 'play',
    },
    { kind: 'play', seat, card, color },
  )
  const amount = DRAW_AMOUNT[card.face] ?? 0
  const next = seatAfter(seat, 1, round.direction, players)
  if (left === 0) {
    const total = round.pending + amount
    if (total === 0) return finishRound(state, round, state.rng, seat, false)
    const drawing = penalize({ round, rng: state.rng, cards: [] }, next, total)
    return finishRound(state, drawing.round, drawing.rng, seat, false)
  }
  if (card.face === 'skip') return withRound(state, { ...round, turn: seatAfter(seat, 2, round.direction, players) })
  if (card.face === 'reverse') {
    const direction: Direction = round.direction === 1 ? -1 : 1
    const turn = players === 2 ? seat : seatAfter(seat, 1, direction, players)
    return withRound(state, { ...round, direction, turn })
  }
  if (amount > 0) return withRound(state, { ...round, pending: round.pending + amount, turn: next })
  return withRound(state, { ...round, turn: next })
}

function applyDraw(state: MatchState, seat: Seat): MatchState {
  const { round: before, rules } = state
  const round = { ...before, exposed: null, passes: 0 }
  if (round.pending > 0) {
    const drawing = penalize({ round, rng: state.rng, cards: [] }, seat, round.pending)
    return withRound(state, { ...drawing.round, pending: 0 }, drawing.rng)
  }
  let drawing: Drawing = { round, rng: state.rng, cards: [] }
  const drawnCards: Card[] = []
  let last: Card | undefined
  do {
    drawing = drawCards(drawing.round, drawing.rng, seat, 1)
    last = drawing.cards[0]
    if (last) drawnCards.push(last)
  } while (rules.drawToPlay && last && !matchesTop(last, topCard(round), round.color))
  const logged = logMove(drawing.round, {
    kind: 'draw',
    seat,
    count: drawnCards.length,
    color: round.color,
    penalty: false,
  })
  return withRound(state, { ...logged, drawn: last ?? null }, drawing.rng)
}

function applyPass(state: MatchState, seat: Seat): MatchState {
  const { round: before, players } = state
  const passes = before.passes + 1
  const round = logMove({ ...before, exposed: null, passes }, { kind: 'pass', seat })
  if (passes >= players) return finishRound(state, round, state.rng, blockedWinner(round), true)
  return withRound(state, endTurn(round, players))
}

function applyCatch(state: MatchState, seat: Seat): MatchState {
  const target = state.round.exposed
  if (target === null) throw new Error('Illegal action')
  const round = logMove({ ...state.round, exposed: null }, { kind: 'catch', seat, target })
  const drawing = penalize({ round, rng: state.rng, cards: [] }, target, UNO_PENALTY)
  return withRound(state, drawing.round, drawing.rng)
}

export function applyAction(state: MatchState, action: Action): MatchState {
  if (!isLegal(state, action)) throw new Error('Illegal action')
  const { round } = state
  switch (action.type) {
    case 'uno': {
      const exposed = round.exposed === action.seat ? null : round.exposed
      const called = round.exposed === action.seat ? round.called : action.seat
      return withRound(state, logMove({ ...round, called, exposed }, { kind: 'uno', seat: action.seat }))
    }
    case 'catch':
      return applyCatch(state, action.seat)
    case 'choose':
      return withRound(
        state,
        logMove({ ...round, color: action.color, phase: 'play' }, {
          kind: 'choose',
          seat: action.seat,
          color: action.color,
        }),
      )
    case 'draw':
      return applyDraw(state, action.seat)
    case 'pass':
      return applyPass(state, action.seat)
    case 'play':
      return applyPlay(state, action.seat, action.card, action.color)
  }
}

export function matchTotals(state: MatchState): number[] {
  return totalsFor(state.results, state.players)
}

export function matchWinners(state: MatchState): Seat[] {
  const totals = matchTotals(state)
  const best = Math.max(...totals)
  if (best <= 0) return []
  return totals.flatMap((total, seat) => (total === best ? [seat] : []))
}

export function score(state: MatchState): Score {
  return { totals: matchTotals(state), winners: matchWinners(state) }
}

export function cardsInRound(round: RoundState): Card[] {
  return [...round.hands.flat(), ...round.deck, ...round.discard]
}
