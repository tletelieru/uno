import { COLORS, cardPoints, isWild, sameCard, seatAfter } from '@uno/engine'
import type { Action, Card, Color, PlayerView, Seat } from '@uno/engine'

export type PlayAction = Extract<Action, { type: 'play' }>

export function findAction<T extends Action['type']>(
  legal: Action[],
  type: T,
): Extract<Action, { type: T }> | undefined {
  return legal.find((action): action is Extract<Action, { type: T }> => action.type === type)
}

export function plays(legal: Action[]): PlayAction[] {
  return legal.filter((action): action is PlayAction => action.type === 'play')
}

export function fallback(legal: Action[]): Action {
  return findAction(legal, 'draw') ?? findAction(legal, 'pass') ?? legal[0]
}

export function colorCounts(hand: Card[]): Record<Color, number> {
  const counts: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 }
  for (const card of hand) {
    if (!isWild(card)) counts[card.color] += 1 + cardPoints(card) / 100
  }
  return counts
}

export function bestColor(hand: Card[], bonus: Partial<Record<Color, number>> = {}): Color {
  const counts = colorCounts(hand)
  return COLORS.reduce((best, color) =>
    counts[color] + (bonus[color] ?? 0) > counts[best] + (bonus[best] ?? 0) ? color : best,
  )
}

export function without(hand: Card[], card: Card): Card[] {
  const index = hand.findIndex((item) => sameCard(item, card))
  return hand.filter((_, position) => position !== index)
}


export function nextSeat(view: PlayerView): Seat {
  return seatAfter(view.seat, 1, view.direction, view.players)
}

export function previousSeat(view: PlayerView): Seat {
  return seatAfter(view.seat, -1, view.direction, view.players)
}

export function resultingColor(action: PlayAction): Color {
  if (action.card.kind === 'color') return action.card.color
  return action.color ?? 'red'
}
