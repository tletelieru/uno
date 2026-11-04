import { describe, expect, it } from 'vitest'
import { TRACKS } from './music'
import { SETUP_TRACKS, trackForMatch } from './sound'

const REST = 0

describe('music tracks', () => {
  it('keeps every track valid', () => {
    for (const track of Object.values(TRACKS)) {
      expect(track.melody).toHaveLength(64)
      expect(track.chords).toHaveLength(4)
      expect(track.bpm).toBeGreaterThanOrEqual(136)
      expect(track.bpm).toBeLessThanOrEqual(150)
      expect(track.melody.every((note) => note === REST || (note >= 48 && note <= 96))).toBe(true)
      track.chords.forEach((chord) => expect(chord).toHaveLength(4))
    }
  })

  it('gives each track its own melody', () => {
    const melodies = Object.values(TRACKS).map((track) => track.melody.join())
    expect(new Set(melodies).size).toBe(melodies.length)
  })

  it('maps every setup to a track', () => {
    expect(SETUP_TRACKS).toEqual({ home: 'intro', round: 'match', lastCard: 'final' })
    expect(trackForMatch(null)).toBe('intro')
  })
})
