import { COLORS, cardId, createDeck, isWild } from '@uno/engine'
import type { Card, Color, PlayerView } from '@uno/engine'
import { decide } from './medium'
import type { Insight } from './medium'
import { nextSeat, resultingColor } from './shared'
import type { PlayAction } from './shared'
import type { Bot } from './types'

const VOID_BONUS = 8
const PICKED_PENALTY = 15

export interface Reading {
  voids: Set<Color>[]
  picked: (Color | null)[]
  unseen: Record<Color, number>
}

export function unseenCards(view: PlayerView): Card[] {
  const seen = new Set([...view.hand, ...view.discard].map(cardId))
  return createDeck().filter((card) => !seen.has(cardId(card)))
}

export function readTable(view: PlayerView): Reading {
  const voids = Array.from({ length: view.players }, () => new Set<Color>())
  const picked: (Color | null)[] = Array.from({ length: view.players }, () => null)
  for (const move of view.moves) {
    if (move.kind === 'draw' && !move.penalty) voids[move.seat].add(move.color)
    if (move.kind === 'choose') picked[move.seat] = move.color
    if (move.kind !== 'play') continue
    voids[move.seat].delete(move.color)
    if (isWild(move.card)) picked[move.seat] = move.color
  }
  const unseen: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 }
  for (const card of unseenCards(view)) {
    if (!isWild(card)) unseen[card.color] += 1
  }
  return { voids, picked, unseen }
}

function colorEdge(reading: Reading, view: PlayerView, color: Color): number {
  const next = nextSeat(view)
  let edge = 0
  if (reading.voids[next].has(color)) edge += VOID_BONUS
  if (reading.picked[next] === color) edge -= PICKED_PENALTY
  return edge
}

export function insightFor(view: PlayerView): Insight {
  const reading = readTable(view)
  const bonus = Object.fromEntries(
    COLORS.map((color) => [color, colorEdge(reading, view, color) / 10]),
  ) as Record<Color, number>
  return {
    bonus,
    extra: (current: PlayerView, action: PlayAction) => {
      return colorEdge(reading, current, resultingColor(action))
    },
  }
}

export const hardBot: Bot = {
  choose: (view, legal, rng) => decide(view, legal, rng, 1, insightFor(view)),
}
