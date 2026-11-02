import { describe, expect, it } from 'vitest'
import { DECK_SIZE, cardId, createDeck } from './cards'
import { shuffle } from './rng'

describe('deck', () => {
  it('has ${DECK_SIZE} unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(DECK_SIZE)
    expect(new Set(deck.map(cardId)).size).toBe(DECK_SIZE)
  })

  it('has one zero and two of every other face per color', () => {
    const deck = createDeck()
    const red = deck.filter((card) => card.kind === 'color' && card.color === 'red')
    expect(red).toHaveLength(25)
    expect(red.filter((card) => card.kind === 'color' && card.face === 0)).toHaveLength(1)
    expect(deck.filter((card) => card.kind === 'wild')).toHaveLength(8)
  })

  it('shuffles the same way for the same seed', () => {
    const deck = createDeck()
    const first = shuffle(deck, 42).items.map(cardId)
    const second = shuffle(deck, 42).items.map(cardId)
    expect(first).toEqual(second)
    expect(new Set(first).size).toBe(DECK_SIZE)
  })
})
