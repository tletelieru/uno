import type { Card, Seat } from './cards'

export const ACTION_POINTS = 20

export const WILD_POINTS = 50

export const TARGETS = [200, 500] as const

export type Target = (typeof TARGETS)[number]

export interface RoundResult {
  winner: Seat
  points: number
  remaining: number[]
  blocked: boolean
}

export interface Score {
  totals: number[]
  winners: Seat[]
}

export function cardPoints(card: Card): number {
  if (card.kind === 'wild') return WILD_POINTS
  return typeof card.face === 'number' ? card.face : ACTION_POINTS
}

export function handPoints(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + cardPoints(card), 0)
}

export function roundPoints(result: RoundResult, seat: Seat): number {
  return result.winner === seat ? result.points : 0
}

export function totalsFor(results: RoundResult[], players: number): number[] {
  return Array.from({ length: players }, (_, seat) =>
    results.reduce((total, result) => total + roundPoints(result, seat), 0),
  )
}
