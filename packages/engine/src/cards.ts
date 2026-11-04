export const COLORS = ['red', 'yellow', 'green', 'blue'] as const

export type Color = (typeof COLORS)[number]

export const ACTIONS = ['skip', 'reverse', 'draw2'] as const

export type ActionFace = (typeof ACTIONS)[number]

export type Face = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | ActionFace

export type Card =
  | { kind: 'color'; color: Color; face: Face; copy: 0 | 1 }
  | { kind: 'wild'; face: 'wild' | 'draw4'; copy: 0 | 1 | 2 | 3 }

export const DECK_SIZE = 108

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function cardId(card: Card): string {
  return card.kind === 'wild'
    ? `${card.face}-${card.copy}`
    : `${card.color}-${card.face}-${card.copy}`
}

export function createDeck(): Card[] {
  const colored = COLORS.flatMap((color) => {
    const zero: Card = { kind: 'color', color, face: 0, copy: 0 }
    const pairs = ([0, 1] as const).flatMap((copy) =>
      [...NUMBERS, ...ACTIONS].map((face): Card => ({ kind: 'color', color, face, copy })),
    )
    return [zero, ...pairs]
  })
  const wild = (['wild', 'draw4'] as const).flatMap((face) =>
    ([0, 1, 2, 3] as const).map((copy): Card => ({ kind: 'wild', face, copy })),
  )
  return [...colored, ...wild]
}

export type Seat = number

export type PlayerCount = 2 | 3 | 4 | 5 | 6

export const PLAYER_COUNTS: PlayerCount[] = [2, 3, 4, 5, 6]

export type WildCard = Extract<Card, { kind: 'wild' }>

export type ColorCard = Extract<Card, { kind: 'color' }>

export function isWild(card: Card): card is WildCard {
  return card.kind === 'wild'
}

export function sameCard(a: Card, b: Card): boolean {
  return cardId(a) === cardId(b)
}

export function isDrawCard(card: Card): boolean {
  return card.face === 'draw2' || card.face === 'draw4'
}
