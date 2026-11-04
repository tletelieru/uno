import { easyBot } from './easy'
import { hardBot } from './hard'
import { mediumBot } from './medium'
import type { Bot, Level } from './types'

export { EASY_CALL_RATE, createRng, easyBot, randomBot } from './easy'
export { hardBot, readTable, unseenCards } from './hard'
export { mediumBot } from './medium'
export type { Bot, Level, Rng } from './types'

export const LEVELS: Level[] = ['easy', 'medium', 'hard']

export const BOTS: Record<Level, Bot> = {
  easy: easyBot,
  medium: mediumBot,
  hard: hardBot,
}
