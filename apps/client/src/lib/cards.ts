import { COLORS, cardId } from '@uno/engine'
import type { Card, Color, PlayerCount, Seat } from '@uno/engine'

export const HUMAN = 0

export const TINT: Record<Color | 'wild', string> = {
  red: 'tint-red',
  yellow: 'tint-yellow',
  green: 'tint-green',
  blue: 'tint-blue',
  wild: 'tint-wild',
}

export function cardTint(card: Card): string {
  return card.kind === 'wild' ? TINT.wild : TINT[card.color]
}

export function cardKey(card: Card): string {
  return cardId(card)
}

const FACE_ORDER: Card['face'][] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'skip', 'reverse', 'draw2', 'wild', 'draw4']

function colorRank(card: Card): number {
  return card.kind === 'wild' ? COLORS.length : COLORS.indexOf(card.color)
}

function faceRank(card: Card): number {
  return FACE_ORDER.indexOf(card.face)
}

export function sortHand(hand: Card[], byNumber: boolean): Card[] {
  return [...hand].sort((a, b) => {
    const color = colorRank(a) - colorRank(b)
    const face = faceRank(a) - faceRank(b)
    if (byNumber) return face || color || a.copy - b.copy
    return color || face || a.copy - b.copy
  })
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const result = [...items]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

export function formatPoints(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

export interface Vector {
  x: number
  y: number
}

const ROW_WIDTH = 320
const ROW_Y = -230
const HUMAN_Y = 260

export function seatVector(seat: Seat, players: PlayerCount): Vector {
  if (seat === HUMAN) return { x: 0, y: HUMAN_Y }
  const slots = players - 1
  const x = ((seat - 0.5) / slots - 0.5) * ROW_WIDTH
  return { x, y: ROW_Y }
}
