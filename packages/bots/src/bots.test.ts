import { applyAction, createMatch, legalActions, startNextRound, viewFor } from '@uno/engine'
import type { Action, Card, Color, MatchState, PlayerView } from '@uno/engine'
import { describe, expect, it } from 'vitest'
import { BOTS, EASY_CALL_RATE, LEVELS, createRng, easyBot, hardBot, mediumBot, readTable } from './index'

const tinted = (color: Color, face: number | 'skip' | 'reverse' | 'draw2', copy: 0 | 1 = 0): Card =>
  ({ kind: 'color', color, face, copy }) as Card

const wild: Card = { kind: 'wild', face: 'wild', copy: 0 }

function baseView(hand: Card[], top: Card, extra: Partial<PlayerView> = {}): PlayerView {
  return {
    seat: 0,
    players: 4,
    target: 500,
    rules: { stacking: false, drawToPlay: false },
    dealer: 3,
    roundIndex: 0,
    results: [],
    status: 'playing',
    hand,
    handCounts: [hand.length, 7, 7, 7],
    top,
    discard: [top],
    deckCount: 60,
    color: top.kind === 'color' ? top.color : 'red',
    turn: 0,
    direction: 1,
    phase: 'play',
    drawn: null,
    pending: 0,
    called: null,
    exposed: null,
    moves: [],
    winner: null,
    ...extra,
  }
}

function playsFor(view: PlayerView, cards: Card[]): Action[] {
  return [
    ...cards.flatMap((card): Action[] =>
      card.kind === 'wild'
        ? (['red', 'yellow', 'green', 'blue'] as const).map((color) => ({ type: 'play', seat: 0, card, color }))
        : [{ type: 'play', seat: 0, card }],
    ),
    { type: 'draw', seat: view.seat },
  ]
}

function playMatch(players: 2 | 4 | 6, seed: number, pick: (seat: number) => (typeof BOTS)['easy']) {
  const rng = createRng(seed)
  let state: MatchState = createMatch({ players, target: 200 }, seed)
  while (state.status !== 'matchOver') {
    if (state.status === 'roundOver') {
      state = startNextRound(state)
      continue
    }
    const seat = state.round.turn
    const legal = legalActions(state, seat)
    const action = pick(seat).choose(viewFor(state, seat), legal, rng)
    expect(legal).toContainEqual(action)
    state = applyAction(state, action)
  }
  return state
}

describe('bots', () => {
  it.each(LEVELS)('%s finishes matches from views only with legal actions', (level) => {
    for (const players of [2, 4, 6] as const) {
      const state = playMatch(players, players * 11, () => BOTS[level])
      expect(state.status).toBe('matchOver')
    }
  })

  it('repeats the same rng sequence for the same seed', () => {
    const a = createRng(9)
    const b = createRng(9)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('easyBot', () => {
  it('plays the first legal card and keeps wild cards', () => {
    const hand = [wild, tinted('blue', 3), tinted('red', 8)]
    const view = baseView(hand, tinted('red', 5))
    const action = easyBot.choose(view, playsFor(view, [wild, tinted('red', 8)]), createRng(2))
    expect(action).toMatchObject({ type: 'play', card: tinted('red', 8) })
  })

  it('sometimes forgets to call UNO', () => {
    const view = baseView([tinted('red', 1), tinted('red', 2)], tinted('red', 5))
    const legal: Action[] = [{ type: 'uno', seat: 0 }, ...playsFor(view, view.hand)]
    const calls = Array.from({ length: 200 }, (_, seed) => easyBot.choose(view, legal, createRng(seed + 1)))
    const rate = calls.filter((action) => action.type === 'uno').length / calls.length
    expect(rate).toBeGreaterThan(EASY_CALL_RATE - 0.15)
    expect(rate).toBeLessThan(EASY_CALL_RATE + 0.15)
  })
})

describe('mediumBot', () => {
  it('always calls UNO', () => {
    const view = baseView([tinted('red', 1), tinted('red', 2)], tinted('red', 5))
    const legal: Action[] = [{ type: 'uno', seat: 0 }, ...playsFor(view, view.hand)]
    for (let seed = 1; seed < 30; seed++) {
      expect(mediumBot.choose(view, legal, createRng(seed)).type).toBe('uno')
    }
  })

  it('picks the wild color it holds the most of', () => {
    const hand = [wild, tinted('green', 2), tinted('green', 7), tinted('blue', 3)]
    const view = baseView(hand, tinted('red', 5))
    const action = mediumBot.choose(view, playsFor(view, [wild]), createRng(1))
    expect(action).toMatchObject({ type: 'play', color: 'green' })
  })

  it('attacks the next player when they are about to win', () => {
    const draw2 = tinted('red', 'draw2')
    const hand = [tinted('red', 9), draw2, tinted('blue', 4)]
    const view = baseView(hand, tinted('red', 5), { handCounts: [3, 1, 7, 7] })
    const action = mediumBot.choose(view, playsFor(view, [tinted('red', 9), draw2]), createRng(1))
    expect(action).toMatchObject({ type: 'play', card: draw2 })
  })
})

describe('hardBot', () => {
  it('remembers the colors a rival had to draw on', () => {
    const view = baseView([tinted('red', 1)], tinted('red', 5), {
      moves: [
        { kind: 'draw', seat: 1, count: 1, color: 'yellow', penalty: false },
        { kind: 'draw', seat: 2, count: 2, color: 'green', penalty: true },
      ],
    })
    const reading = readTable(view)
    expect(reading.voids[1].has('yellow')).toBe(true)
    expect(reading.voids[2].size).toBe(0)
  })

  it('switches to a color the next player is missing', () => {
    const hand = [tinted('red', 4), tinted('yellow', 4), tinted('red', 9, 1), tinted('yellow', 8)]
    const view = baseView(hand, tinted('blue', 4), {
      moves: [{ kind: 'draw', seat: 1, count: 1, color: 'yellow', penalty: false }],
    })
    const legal = playsFor(view, [tinted('red', 4), tinted('yellow', 4)])
    const action = hardBot.choose(view, legal, createRng(3))
    expect(action).toMatchObject({ type: 'play', card: tinted('yellow', 4) })
  })

  it('always catches a forgotten UNO', () => {
    const view = baseView([tinted('red', 1)], tinted('red', 5), { exposed: 1 })
    const legal: Action[] = [{ type: 'catch', seat: 0 }, ...playsFor(view, view.hand)]
    for (let seed = 1; seed < 20; seed++) {
      expect(hardBot.choose(view, legal, createRng(seed)).type).toBe('catch')
    }
  })
})
