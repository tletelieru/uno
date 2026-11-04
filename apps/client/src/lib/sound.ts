import { createContext } from 'react'
import type { Action, MatchState } from '@uno/engine'
import type { Music, TrackId } from './music'

export type SoundId = 'tick' | 'chime' | 'card' | 'draw' | 'uno' | 'roundWon' | 'roundLost'

export interface Sound {
  play: (id: SoundId) => void
}

interface Note {
  frequency: number
  duration: number
  delay?: number
  type?: OscillatorType
  volume?: number
}

const NOTES: Record<SoundId, Note[]> = {
  tick: [{ frequency: 880, duration: 0.03, type: 'square', volume: 0.05 }],
  chime: [
    { frequency: 660, duration: 0.12, type: 'square', volume: 0.06 },
    { frequency: 990, duration: 0.22, delay: 0.1, type: 'square', volume: 0.06 },
  ],
  card: [{ frequency: 320, duration: 0.05, type: 'triangle', volume: 0.08 }],
  draw: [{ frequency: 220, duration: 0.06, type: 'triangle', volume: 0.07 }],
  roundWon: [
    { frequency: 523, duration: 0.1, type: 'square', volume: 0.06 },
    { frequency: 659, duration: 0.1, delay: 0.1, type: 'square', volume: 0.06 },
    { frequency: 784, duration: 0.1, delay: 0.2, type: 'square', volume: 0.06 },
    { frequency: 1047, duration: 0.3, delay: 0.3, type: 'square', volume: 0.06 },
  ],
  roundLost: [
    { frequency: 392, duration: 0.18, type: 'triangle', volume: 0.08 },
    { frequency: 330, duration: 0.18, delay: 0.2, type: 'triangle', volume: 0.08 },
    { frequency: 262, duration: 0.4, delay: 0.4, type: 'triangle', volume: 0.08 },
  ],
  uno: [
    { frequency: 523, duration: 0.08, type: 'square', volume: 0.06 },
    { frequency: 784, duration: 0.14, delay: 0.08, type: 'square', volume: 0.06 },
  ],
}

export const ACTION_SOUNDS: Record<Action['type'], SoundId | null> = {
  play: 'card',
  draw: 'draw',
  pass: null,
  uno: 'uno',
  catch: 'uno',
  choose: null,
}

export const ROUND_SOUNDS = { won: 'roundWon', lost: 'roundLost' } as const satisfies Record<string, SoundId>

export const DRAW_SOUNDS = { hop: 'tick', stop: 'chime', deal: 'draw' } as const satisfies Record<string, SoundId>

export function createSound(): Sound | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null
  let context: AudioContext | null = null
  return {
    play(id) {
      context ??= new AudioContext()
      const now = context.currentTime
      for (const note of NOTES[id]) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const start = now + (note.delay ?? 0)
        oscillator.type = note.type ?? 'square'
        oscillator.frequency.value = note.frequency
        gain.gain.setValueAtTime(note.volume ?? 0.06, start)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start)
        oscillator.stop(start + note.duration)
      }
    },
  }
}

export const SoundContext = createContext<Sound | null>(null)

export const MusicContext = createContext<Music | null>(null)

export const SETUP_TRACKS = { home: 'intro', round: 'match', lastCard: 'final' } as const satisfies Record<
  string,
  TrackId
>

export function trackForMatch(state: MatchState | null): TrackId {
  if (!state) return SETUP_TRACKS.home
  const close = state.status === 'playing' && state.round.hands.some((hand) => hand.length === 1)
  return close ? SETUP_TRACKS.lastCard : SETUP_TRACKS.round
}
