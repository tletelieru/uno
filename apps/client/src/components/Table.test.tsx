import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cardId, playableCards } from '@uno/engine'
import type { MatchState } from '@uno/engine'
import App from '../App'

function button(name: string | RegExp) {
  return screen.queryByRole('button', { name })
}

function enabled(name: string | RegExp) {
  const found = button(name)
  return found && !found.hasAttribute('disabled') ? found : null
}

let roundSummaries = 0

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function takeTurn() {
  const next = button('Next round')
  if (next) {
    roundSummaries += 1
    expect(screen.getByRole('dialog', { name: /^Round \d+ finished$/ })).toBeTruthy()
    return fireEvent.click(next)
  }
  if (screen.queryByRole('dialog', { name: 'Choose a color' })) {
    return fireEvent.click(screen.getByRole('button', { name: 'red' }))
  }
  const uno = enabled('UNO!')
  if (uno) return fireEvent.click(uno)
  const hand = screen.getByRole('region', { name: 'Your hand' })
  const card = hand.querySelector('[data-card][aria-disabled="false"]')
  if (card) {
    fireEvent.click(card)
    fireEvent.click(card)
    return
  }
  const deck = enabled(/^Draw pile/)
  if (deck) {
    fireEvent.click(deck)
    return fireEvent.click(deck)
  }
  wait(900)
}

function skipIntro() {
  for (let step = 0; step < 160; step++) wait(100)
}

function botCounts() {
  return screen.getAllByLabelText(/^Bot \d, \d+ cards?$/).map((seat) => seat.getAttribute('aria-label'))
}

function start(players: number) {
  fireEvent.click(screen.getByRole('button', { name: String(players) }))
  fireEvent.click(screen.getByRole('button', { name: `Play · ${players} players` }))
}

function handCards() {
  return [...screen.getByRole('region', { name: 'Your hand' }).querySelectorAll('[data-card]')]
}

describe('Table', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    localStorage.setItem('preferred-lang', 'en')
    document.documentElement.className = ''
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it.each([2, 4, 6])('deals 7 cards with %i players', (players) => {
    render(<App />)
    start(players)
    expect(handCards()).toHaveLength(0)
    skipIntro()
    expect(handCards().length).toBeGreaterThanOrEqual(7)
    expect(screen.getAllByLabelText(/^Bot \d, \d+ cards$/)).toHaveLength(players - 1)
  })

  it('asks before leaving a match', () => {
    render(<App />)
    start(4)
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.getByRole('region', { name: 'Your hand' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, exit' }))
    expect(screen.getByRole('button', { name: 'Play · 4 players' })).toBeTruthy()
    expect(localStorage.getItem('match-history')).toBeNull()
  })

  it('comes back to the match after a reload', () => {
    vi.setSystemTime(42000)
    localStorage.setItem('bot-level', 'easy')
    render(<App />)
    start(3)
    skipIntro()
    for (let step = 0; step < 8; step++) takeTurn()
    const keys = () => handCards().map((card) => card.getAttribute('data-card')).sort()
    const before = keys()
    cleanup()
    render(<App />)
    expect(keys()).toEqual(before)
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, exit' }))
    expect(localStorage.getItem('saved-match')).toBeNull()
  })

  it('starts from an empty table and deals the cards one by one', () => {
    render(<App />)
    start(4)
    const pile = () => screen.getByRole('button', { name: /^Draw pile/ }).querySelector('span')!
    const discard = () => screen.getByLabelText('Discard pile').parentElement!
    expect(handCards()).toHaveLength(0)
    expect(botCounts().every((label) => label!.endsWith(' 0 cards'))).toBe(true)
    expect(pile().classList.contains('invisible')).toBe(true)
    expect(discard().classList.contains('invisible')).toBe(true)
    let partial = false
    for (let step = 0; step < 160 && handCards().length < 7; step++) {
      wait(100)
      const count = handCards().length
      if (count > 0 && count < 7) partial = true
    }
    expect(partial).toBe(true)
    expect(handCards()).toHaveLength(7)
    skipIntro()
    expect(pile().classList.contains('invisible')).toBe(false)
    expect(discard().classList.contains('invisible')).toBe(false)
    expect(screen.getByRole('region', { name: 'Your hand' }).querySelector('.deal-in')).toBeNull()
  })

  it('shows the dealt table at once without animations', () => {
    localStorage.setItem('reduce-motion', 'on')
    render(<App />)
    start(4)
    wait(900)
    wait(10)
    expect(handCards().length).toBeGreaterThanOrEqual(7)
    expect(screen.getByLabelText('Discard pile').parentElement!.classList.contains('invisible')).toBe(false)
  })

  it('lets you tap any card off easy and explains a card that does not match', () => {
    for (let time = 1; time < 200; time++) {
      vi.setSystemTime(time * 1000)
      render(<App />)
      start(2)
      skipIntro()
      const saved = JSON.parse(localStorage.getItem('saved-match')!) as { state: MatchState }
      const legal = new Set(playableCards(saved.state, 0).map(cardId))
      const wrong = saved.state.round.turn === 0 && saved.state.round.phase === 'play' && saved.state.round.pending === 0
        ? handCards().find((card) => !legal.has(card.getAttribute('data-card')!))
        : undefined
      if (!wrong) {
        cleanup()
        localStorage.removeItem('saved-match')
        continue
      }
      expect(handCards().every((card) => card.getAttribute('aria-disabled') === 'false')).toBe(true)
      fireEvent.click(wrong)
      fireEvent.click(wrong)
      expect(screen.getByText('Doesn’t match the top card.')).toBeTruthy()
      expect(handCards()).toHaveLength(saved.state.round.hands[0].length)
      return
    }
    throw new Error('No deal with a card that does not match')
  })

  it('draws the dealer with a spotlight before dealing and holds the bots', () => {
    render(<App />)
    start(4)
    const before = botCounts()
    wait(100)
    expect(document.querySelectorAll('[data-spotlight]')).toHaveLength(1)
    let announced = false
    for (let step = 0; step < 60 && !announced; step++) {
      wait(100)
      announced = Boolean(screen.queryByText(/^Dealer: (You|Bot \d)$/))
    }
    expect(announced).toBe(true)
    expect(botCounts()).toEqual(before)
    const saved = JSON.parse(localStorage.getItem('saved-match')!) as { state: MatchState }
    const names = ['You', 'Bot 1', 'Bot 2', 'Bot 3']
    expect(screen.getByText(`Dealer: ${names[saved.state.dealer]}`)).toBeTruthy()
    skipIntro()
    expect(screen.queryByText(/^Dealer:/)).toBeNull()
    expect(document.querySelectorAll('[data-spotlight]')).toHaveLength(0)
  })

  it('shows the dealer right away without animations', () => {
    localStorage.setItem('reduce-motion', 'on')
    render(<App />)
    start(3)
    expect(screen.getByText(/^Dealer: (You|Bot \d)$/)).toBeTruthy()
  })

  it('skips the dealer draw for a restored match', () => {
    render(<App />)
    start(3)
    skipIntro()
    cleanup()
    render(<App />)
    expect(screen.queryByText(/^Dealer:/)).toBeNull()
    expect(document.querySelectorAll('[data-spotlight]')).toHaveLength(0)
  })

  it('keeps UNO in place and plays a card with a second tap', () => {
    localStorage.setItem('bot-level', 'easy')
    render(<App />)
    start(2)
    const uno = () => screen.getByRole('button', { name: 'UNO!' })
    expect(uno().hasAttribute('disabled')).toBe(true)
    skipIntro()
    for (let step = 0; step < 40; step++) {
      expect(uno()).toBeTruthy()
      const saved = JSON.parse(localStorage.getItem('saved-match')!) as { state: MatchState }
      if (saved.state.round.turn !== 0 || saved.state.round.phase !== 'play') {
        wait(900)
        continue
      }
      const card = handCards().find((item) => item.getAttribute('aria-disabled') === 'false' && !item.getAttribute('aria-label')!.startsWith('Wild'))
      if (!card) return
      const before = handCards().length
      fireEvent.click(card)
      expect(handCards()).toHaveLength(before)
      fireEvent.click(card)
      expect(handCards()).toHaveLength(before - 1)
      return
    }
  })

  it('shows the direction of play', () => {
    render(<App />)
    start(4)
    expect(screen.getByRole('img', { name: /Play goes (left to right|right to left)/ })).toBeTruthy()
  })

  it.each([2, 3])('plays a whole match to 200 with %i players', { timeout: 300000 }, (players) => {
    localStorage.setItem('match-target', '200')
    localStorage.setItem('bot-level', 'easy')
    render(<App />)
    start(players)
    let guard = 0
    while (!screen.queryByText('Match finished') && guard < 20000) {
      takeTurn()
      guard += 1
    }
    expect(screen.getByText('Match finished')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to start' }))
    expect(roundSummaries).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByText(/^1 played/)).toBeTruthy()
    expect(localStorage.getItem('saved-match')).toBeNull()
  })
})
