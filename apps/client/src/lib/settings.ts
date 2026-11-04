import type { Level } from '@uno/bots'
import type { HouseRules, PlayerCount, Target } from '@uno/engine'

export const levelKey = 'bot-level'

export function readLevel(): Level {
  const saved = localStorage.getItem(levelKey)
  if (saved === 'easy' || saved === 'hard') return saved
  return 'medium'
}

export const playersKey = 'player-count'

export function readPlayers(): PlayerCount {
  const saved = Number(localStorage.getItem(playersKey))
  if (saved >= 2 && saved <= 6) return saved as PlayerCount
  return 4
}

export const targetKey = 'match-target'

export function readTarget(): Target {
  return localStorage.getItem(targetKey) === '200' ? 200 : 500
}

export const stackingKey = 'house-stacking'

export const drawToPlayKey = 'house-draw-to-play'

export function readRules(): HouseRules {
  return {
    stacking: localStorage.getItem(stackingKey) !== 'off',
    drawToPlay: localStorage.getItem(drawToPlayKey) === 'on',
  }
}

export const colorSymbolsKey = 'color-symbols'

export function readColorSymbols(): boolean {
  return localStorage.getItem(colorSymbolsKey) === 'on'
}

export const sortOrderKey = 'sort-order'

export function readByNumber(): boolean {
  return localStorage.getItem(sortOrderKey) === 'number'
}

export const plainFontKey = 'plain-font'

export function readPlainFont(): boolean {
  return localStorage.getItem(plainFontKey) === 'on'
}

export const reduceMotionKey = 'reduce-motion'

export function readReduceMotion(): boolean {
  return localStorage.getItem(reduceMotionKey) === 'on'
}

export const soundKey = 'sound-effects'

export function readSound(): boolean {
  return localStorage.getItem(soundKey) !== 'off'
}

export const musicKey = 'music'

export function readMusic(): boolean {
  return localStorage.getItem(musicKey) !== 'off'
}
