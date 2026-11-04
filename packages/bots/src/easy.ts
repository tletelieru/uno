import { COLORS, isWild, nextRandom, sameCard } from '@uno/engine'
import type { Action } from '@uno/engine'
import { fallback, findAction, plays } from './shared'
import type { Bot, Rng } from './types'

export const EASY_CALL_RATE = 0.4

const CATCH_RATE = 0.4

export function createRng(seed: number): Rng {
  let state = seed
  return () => {
    const random = nextRandom(state)
    state = random.rng
    return random.value
  }
}

export const randomBot: Bot = {
  choose: (_view, legal, rng) => legal[Math.floor(rng() * legal.length)],
}

function pickWild(legal: Action[], rng: Rng): Action | undefined {
  const wilds = plays(legal)
  if (wilds.length === 0) return undefined
  const color = COLORS[Math.floor(rng() * COLORS.length)]
  return wilds.find((action) => action.color === color) ?? wilds[0]
}

export const easyBot: Bot = {
  choose(view, legal, rng) {
    const caught = findAction(legal, 'catch')
    if (caught && rng() < CATCH_RATE) return caught
    const call = findAction(legal, 'uno')
    if (call && rng() < EASY_CALL_RATE) return call
    const choose = legal.filter((action) => action.type === 'choose')
    if (choose.length > 0) return choose[Math.floor(rng() * choose.length)]
    const options = plays(legal)
    for (const card of view.hand) {
      if (isWild(card)) continue
      const match = options.find((action) => sameCard(action.card, card))
      if (match) return match
    }
    return pickWild(legal, rng) ?? fallback(legal)
  },
}
