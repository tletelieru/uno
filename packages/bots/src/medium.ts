import { cardPoints, isWild } from '@uno/engine'
import type { Action, Card, Color, PlayerView } from '@uno/engine'
import {
  bestColor,
  colorCounts,
  fallback,
  findAction,
  nextSeat,
  plays,
  previousSeat,
  resultingColor,
  without,
} from './shared'
import type { PlayAction } from './shared'
import type { Bot, Rng } from './types'

const THREAT_CARDS = 2
const NOISE = 0.5
const CATCH_RATE = 0.9

export interface Insight {
  bonus: Partial<Record<Color, number>>
  extra: (view: PlayerView, action: PlayAction) => number
}

const ATTACK: Partial<Record<Card['face'], number>> = { draw4: 60, draw2: 50, skip: 40, reverse: 30 }

export function threatened(view: PlayerView): boolean {
  return view.handCounts[nextSeat(view)] <= THREAT_CARDS
}

function attackScore(view: PlayerView, card: Card): number {
  if (!threatened(view)) return 0
  if (card.face === 'reverse' && view.players > 2) {
    return view.handCounts[previousSeat(view)] <= THREAT_CARDS ? -40 : 30
  }
  return ATTACK[card.face] ?? 0
}

function keepScore(view: PlayerView, card: Card): number {
  if (!isWild(card)) return 0
  const onlyWilds = view.hand.every(isWild)
  if (onlyWilds) return 0
  return card.face === 'draw4' ? -35 : -30
}

export function scorePlay(view: PlayerView, action: PlayAction, insight?: Insight): number {
  const rest = without(view.hand, action.card)
  const counts = colorCounts(rest)
  const color = resultingColor(action)
  const stay = counts[color] * 5
  const dump = isWild(action.card) ? 0 : cardPoints(action.card) / 2
  return (
    stay +
    dump +
    attackScore(view, action.card) +
    keepScore(view, action.card) +
    (insight ? insight.extra(view, action) : 0)
  )
}

export function chooseColor(hand: Card[], insight?: Insight): Color {
  return bestColor(hand, insight?.bonus)
}

function withColor(view: PlayerView, options: PlayAction[], insight?: Insight): PlayAction[] {
  return options.filter((action) => {
    if (!isWild(action.card)) return true
    const rest = without(view.hand, action.card)
    return action.color === chooseColor(rest, insight)
  })
}

export function decide(
  view: PlayerView,
  legal: Action[],
  rng: Rng,
  catchRate: number,
  insight?: Insight,
): Action {
  const caught = findAction(legal, 'catch')
  if (caught && rng() < catchRate) return caught
  const call = findAction(legal, 'uno')
  if (call) return call
  if (findAction(legal, 'choose')) {
    const color = chooseColor(view.hand, insight)
    return legal.find((action) => action.type === 'choose' && action.color === color) ?? legal[0]
  }
  const options = withColor(view, plays(legal), insight)
  if (options.length === 0) return fallback(legal)
  let best = options[0]
  let bestScore = -Infinity
  for (const action of options) {
    const value = scorePlay(view, action, insight) + rng() * NOISE
    if (value > bestScore) {
      best = action
      bestScore = value
    }
  }
  return best
}

export const mediumBot: Bot = {
  choose: (view, legal, rng) => decide(view, legal, rng, CATCH_RATE),
}
