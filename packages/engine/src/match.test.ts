import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DECK_SIZE, cardId, createDeck } from './cards'
import type { Card, Color, PlayerCount, Seat } from './cards'
import {
  applyAction,
  cardsInRound,
  createMatch,
  isLegal,
  legalActions,
  matchTotals,
  matchWinners,
  playableCards,
  seatAfter,
  startNextRound,
} from './match'
import type { Action, HouseRules, MatchState, RoundState } from './match'
import { nextRandom } from './rng'
import { cardPoints } from './scoring'
import { viewFor } from './view'

const seeds = fc.integer({ min: 0, max: 2 ** 31 - 1 })
const playerCounts = fc.constantFrom<PlayerCount>(2, 3, 4, 5, 6)
const houseRules = fc.record({ stacking: fc.boolean(), drawToPlay: fc.boolean() })

const MAX_STEPS = 20000

function pick<T>(items: T[], rng: number): { item: T; rng: number } {
  const random = nextRandom(rng)
  return { item: items[Math.floor(random.value * items.length)], rng: random.rng }
}

function preferPlays(legal: Action[]): Action[] {
  const plays = legal.filter((action) => action.type === 'play' || action.type === 'choose')
  return plays.length > 0 ? plays : legal
}

function step(state: MatchState, rng: number): { state: MatchState; rng: number } {
  const roll = nextRandom(rng)
  const watcher = Math.floor(roll.value * state.players)
  const watching = legalActions(state, watcher).filter((action) => action.type === 'catch')
  if (watching.length > 0 && roll.value < 0.5) {
    return { state: applyAction(state, watching[0]), rng: roll.rng }
  }
  const legal = legalActions(state, state.round.turn)
  const pool = roll.value < 0.8 ? preferPlays(legal) : legal
  const chosen = pick(pool, roll.rng)
  return { state: applyAction(state, chosen.item), rng: chosen.rng }
}

function playRound(start: MatchState, seed: number, visit?: (state: MatchState) => void) {
  let state = start
  let rng = seed
  let steps = 0
  while (state.status === 'playing' && steps < MAX_STEPS) {
    visit?.(state)
    ;({ state, rng } = step(state, rng))
    steps += 1
  }
  return { state, rng }
}

function playMatch(
  players: PlayerCount,
  seed: number,
  rules: HouseRules,
  visit?: (state: MatchState) => void,
) {
  let state = createMatch({ players, target: 200, rules }, seed)
  let rng = seed
  const rounds: MatchState[] = []
  for (;;) {
    ;({ state, rng } = playRound(state, rng, visit))
    rounds.push(state)
    if (state.status !== 'roundOver') return { state, rounds }
    state = startNextRound(state)
  }
}

type ColorFace = number | 'skip' | 'reverse' | 'draw2'

const tinted = (color: Color, face: ColorFace, copy: 0 | 1 = 0): Card =>
  ({ kind: 'color', color, face, copy }) as Card

const red = (face: ColorFace, copy: 0 | 1 = 0): Card => tinted('red', face, copy)

function roundWith(hands: Card[][], top: Card, turn: Seat, extra: Partial<RoundState> = {}): RoundState {
  const used = new Set([...hands.flat(), top].map(cardId))
  return {
    hands,
    deck: createDeck().filter((card) => !used.has(cardId(card))),
    discard: [top],
    color: top.kind === 'color' ? top.color : 'red',
    turn,
    direction: 1,
    phase: 'play',
    drawn: null,
    pending: 0,
    called: null,
    exposed: null,
    passes: 0,
    moves: [],
    winner: null,
    ...extra,
  }
}

function stateWith(round: RoundState, rules: Partial<HouseRules> = {}): MatchState {
  return {
    players: round.hands.length as PlayerCount,
    target: 500,
    rules: { stacking: false, drawToPlay: false, ...rules },
    rng: 7,
    dealer: 0,
    roundIndex: 0,
    round,
    results: [],
    status: 'playing',
  }
}

const filler = (count: number, color: Color): Card[] =>
  Array.from({ length: count }, (_, index) => tinted(color, (index % 9) + 1, 1))

describe('match', () => {
  it('deals 7 cards to everyone and keeps all 108 cards', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        const state = createMatch({ players }, seed)
        const handSizes = state.round.hands.map((hand) => hand.length)
        expect(handSizes.reduce((sum, size) => sum + size, 0)).toBeGreaterThanOrEqual(players * 7)
        expect(state.round.discard).toHaveLength(1)
        expect(state.round.discard[0].face).not.toBe('draw4')
      }),
    )
  })

  it('never loses or duplicates a card', () => {
    fc.assert(
      fc.property(playerCounts, seeds, houseRules, (players, seed, rules) => {
        playMatch(players, seed, rules, (state) => {
          const ids = cardsInRound(state.round).map(cardId)
          expect(ids).toHaveLength(DECK_SIZE)
          expect(new Set(ids).size).toBe(DECK_SIZE)
        })
      }),
      { numRuns: 40 },
    )
  })

  it('ends every round with a winner who scores the other hands', () => {
    fc.assert(
      fc.property(playerCounts, seeds, houseRules, (players, seed, rules) => {
        const { state, rounds } = playMatch(players, seed, rules)
        expect(state.status).toBe('matchOver')
        rounds.forEach((round, index) => {
          const result = round.results[index]
          expect(round.round.winner).toBe(result.winner)
          const others = result.remaining.reduce(
            (sum, value, seat) => (seat === result.winner ? sum : sum + value),
            0,
          )
          expect(result.points).toBe(others)
          if (!result.blocked) expect(round.round.hands[result.winner]).toHaveLength(0)
        })
        expect(Math.max(...matchTotals(state))).toBeGreaterThanOrEqual(200)
        expect(matchWinners(state)).toHaveLength(1)
      }),
      { numRuns: 40 },
    )
  })

  it('rejects every action outside legalActions', () => {
    const deck = createDeck()
    const anyAction = fc.record({
      seat: fc.integer({ min: 0, max: 5 }),
      type: fc.constantFrom('play', 'draw', 'pass', 'uno', 'catch', 'choose'),
      card: fc.constantFrom(...deck),
      color: fc.constantFrom<Color | undefined>('red', 'yellow', 'green', 'blue', undefined),
    })
    fc.assert(
      fc.property(playerCounts, seeds, fc.array(anyAction, { maxLength: 30 }), (players, seed, tries) => {
        let state = createMatch({ players }, seed)
        let rng = seed
        for (const attempt of tries) {
          const action = { ...attempt, color: attempt.color ?? 'red' } as Action
          if (isLegal(state, action)) state = applyAction(state, action)
          else expect(() => applyAction(state, action)).toThrow('Illegal action')
          if (state.status !== 'playing') return
          ;({ state, rng } = step(state, rng))
          if (state.status !== 'playing') return
        }
      }),
      { numRuns: 60 },
    )
  })

  it('only lets the seat in turn play, draw or pass', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        playRound(createMatch({ players }, seed), seed, (state) => {
          for (let seat = 0; seat < players; seat++) {
            if (seat === state.round.turn) continue
            const kinds = legalActions(state, seat).map((action) => action.type)
            expect(kinds.every((kind) => kind === 'catch' || kind === 'uno')).toBe(true)
          }
        })
      }),
      { numRuns: 20 },
    )
  })

  it('moves the turn by one after a number card, in the current direction', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        playRound(createMatch({ players }, seed), seed, (state) => {
          const { round } = state
          const plays = legalActions(state, round.turn).filter(
            (action) => action.type === 'play' && typeof action.card.face === 'number',
          )
          if (plays.length === 0 || round.hands[round.turn].length === 1) return
          const next = applyAction(state, plays[0])
          expect(next.round.turn).toBe(seatAfter(round.turn, 1, round.direction, players))
        })
      }),
      { numRuns: 20 },
    )
  })

  it('shows each seat only its own hand', () => {
    const state = createMatch({ players: 4 }, 3)
    const view = viewFor(state, 2)
    expect(view.hand).toEqual(state.round.hands[2])
    expect(view.handCounts).toEqual(state.round.hands.map((hand) => hand.length))
    expect(JSON.stringify(view)).not.toContain(JSON.stringify(state.round.deck))
  })
})

describe('turn order', () => {
  const hands = (players: number, first: Card[]) =>
    Array.from({ length: players }, (_, seat) => (seat === 0 ? first : filler(4, 'blue')))

  it('skips the next player', () => {
    const skip = tinted('red', 'skip')
    const state = stateWith(roundWith(hands(4, [skip, red(3)]), red(5), 0))
    const next = applyAction(state, { type: 'play', seat: 0, card: skip })
    expect(next.round.turn).toBe(2)
  })

  it('reverses the direction', () => {
    const reverse = tinted('red', 'reverse')
    const state = stateWith(roundWith(hands(4, [reverse, red(3)]), red(5), 0))
    const next = applyAction(state, { type: 'play', seat: 0, card: reverse })
    expect(next.round.direction).toBe(-1)
    expect(next.round.turn).toBe(3)
  })

  it('acts as a skip with two players', () => {
    const reverse = tinted('red', 'reverse')
    const state = stateWith(roundWith(hands(2, [reverse, red(3)]), red(5), 0))
    const next = applyAction(state, { type: 'play', seat: 0, card: reverse })
    expect(next.round.turn).toBe(0)
  })

  it('makes the next player take two and then play', () => {
    const draw2 = tinted('red', 'draw2')
    const state = stateWith(roundWith(hands(3, [draw2, red(3)]), red(5), 0))
    const next = applyAction(state, { type: 'play', seat: 0, card: draw2 })
    expect(next.round.pending).toBe(2)
    expect(legalActions(next, 1).filter((action) => action.type !== 'catch')).toEqual([{ type: 'draw', seat: 1 }])
    const drawn = applyAction(next, { type: 'draw', seat: 1 })
    expect(drawn.round.hands[1]).toHaveLength(6)
    expect(drawn.round.turn).toBe(1)
    expect(drawn.round.pending).toBe(0)
  })

  it('makes the next player draw four after a wild draw four and sets the color', () => {
    const draw4: Card = { kind: 'wild', face: 'draw4', copy: 0 }
    const state = stateWith(roundWith(hands(3, [draw4, red(3)]), red(5), 0))
    const next = applyAction(state, { type: 'play', seat: 0, card: draw4, color: 'green' })
    expect(next.round.color).toBe('green')
    const drawn = applyAction(next, { type: 'draw', seat: 1 })
    expect(drawn.round.hands[1]).toHaveLength(8)
    expect(drawn.round.turn).toBe(1)
  })

  it('stacks a +2 of the chosen color on a +4', () => {
    const draw4: Card = { kind: 'wild', face: 'draw4', copy: 0 }
    const yellow = tinted('yellow', 'draw2')
    const red2 = tinted('red', 'draw2')
    const players = [[draw4, red(3), red(4)], [yellow, red2, red(6)], filler(3, 'green')]
    const state = stateWith(roundWith(players, red(5), 0), { stacking: true })
    const played = applyAction(state, { type: 'play', seat: 0, card: draw4, color: 'yellow' })
    expect(playableCards(played, 1)).toEqual([yellow])
    const stacked = applyAction(played, { type: 'play', seat: 1, card: yellow })
    expect(stacked.round.pending).toBe(6)
  })

  it('stacks draw cards when the house rule is on', () => {
    const draw2 = tinted('red', 'draw2')
    const other = tinted('blue', 'draw2')
    const players = [[draw2, red(3)], [other, red(4)], filler(3, 'green')]
    const state = stateWith(roundWith(players, red(5), 0), { stacking: true })
    const called = applyAction(state, { type: 'uno', seat: 0 })
    const stacked = applyAction(called, { type: 'play', seat: 0, card: draw2 })
    expect(stacked.round.pending).toBe(2)
    expect(legalActions(stacked, 1).map((action) => action.type)).toEqual(['uno', 'play', 'draw'])
    const passed = applyAction(stacked, { type: 'play', seat: 1, card: other })
    expect(passed.round.pending).toBe(4)
    const drawn = applyAction(passed, { type: 'draw', seat: 2 })
    expect(drawn.round.hands[2]).toHaveLength(7)
    expect(drawn.round.turn).toBe(2)
  })

  it('keeps the turn after drawing until a card is played', () => {
    const round = roundWith([filler(3, 'blue'), filler(3, 'green')], red(5, 1), 0)
    const deck = [tinted('yellow', 1), red(9), ...round.deck.filter((card) => cardId(card) !== cardId(red(9)) && cardId(card) !== cardId(tinted('yellow', 1)))]
    const first = applyAction(stateWith({ ...round, deck }), { type: 'draw', seat: 0 })
    expect(first.round.turn).toBe(0)
    expect(legalActions(first, 0).map((action) => action.type)).toEqual(['draw'])
    const second = applyAction(first, { type: 'draw', seat: 0 })
    expect(second.round.turn).toBe(0)
    expect(legalActions(second, 0).map((action) => action.type)).toEqual(['play', 'draw'])
    const played = applyAction(second, { type: 'play', seat: 0, card: red(9) })
    expect(played.round.turn).toBe(1)
  })

  it('draws until a playable card when the house rule is on', () => {
    const round = roundWith([filler(3, 'blue'), filler(3, 'green')], red(5, 1), 0)
    const blocker = [tinted('yellow', 1), tinted('yellow', 2), red(9)]
    const ids = new Set(blocker.map(cardId))
    const deck = [...blocker, ...round.deck.filter((card) => !ids.has(cardId(card)))]
    const state = stateWith({ ...round, deck }, { drawToPlay: true })
    const drawn = applyAction(state, { type: 'draw', seat: 0 })
    expect(drawn.round.hands[0]).toHaveLength(6)
    expect(drawn.round.drawn).toEqual(red(9))
  })
})

describe('uno', () => {
  it('penalizes a player who forgets to call it and is caught', () => {
    const state = stateWith(roundWith([[red(3), red(4)], filler(4, 'blue')], red(5), 0))
    const played = applyAction(state, { type: 'play', seat: 0, card: red(3) })
    expect(played.round.exposed).toBe(0)
    expect(legalActions(played, 1)[0]).toEqual({ type: 'catch', seat: 1 })
    const caught = applyAction(played, { type: 'catch', seat: 1 })
    expect(caught.round.hands[0]).toHaveLength(2)
    expect(caught.round.exposed).toBeNull()
    expect(caught.round.turn).toBe(1)
  })

  it('is safe when called before playing', () => {
    const state = stateWith(roundWith([[red(3), red(4)], filler(4, 'blue')], red(5), 0))
    const called = applyAction(state, { type: 'uno', seat: 0 })
    const played = applyAction(called, { type: 'play', seat: 0, card: red(3) })
    expect(played.round.exposed).toBeNull()
    expect(legalActions(played, 1).some((action) => action.type === 'catch')).toBe(false)
  })

  it('closes the window once the next player acts', () => {
    const state = stateWith(roundWith([[red(3), red(4)], filler(4, 'blue')], red(5), 0))
    const played = applyAction(state, { type: 'play', seat: 0, card: red(3) })
    const moved = applyAction(played, { type: 'draw', seat: 1 })
    expect(moved.round.exposed).toBeNull()
  })

  it('accepts a late call before anyone catches it', () => {
    const state = stateWith(roundWith([[red(3), red(4)], filler(4, 'blue')], red(5), 0))
    const played = applyAction(state, { type: 'play', seat: 0, card: red(3) })
    const late = applyAction(played, { type: 'uno', seat: 0 })
    expect(late.round.exposed).toBeNull()
  })
})

describe('scoring', () => {
  it('scores numbers at face value, actions 20 and wilds 50', () => {
    expect(cardPoints(red(7))).toBe(7)
    expect(cardPoints(tinted('blue', 'skip'))).toBe(20)
    expect(cardPoints({ kind: 'wild', face: 'draw4', copy: 1 })).toBe(50)
  })

  it('gives the winner the points left in the other hands', () => {
    const hands = [[red(3)], [tinted('blue', 'skip'), red(9, 1)], [{ kind: 'wild', face: 'wild', copy: 0 } as Card]]
    const state = stateWith(roundWith(hands, red(5), 0))
    const done = applyAction(state, { type: 'play', seat: 0, card: red(3) })
    expect(done.status).toBe('roundOver')
    expect(done.results[0]).toMatchObject({ winner: 0, points: 79 })
  })

  it('ends the match once someone reaches the target', () => {
    const hands = [[red(3)], filler(9, 'blue')]
    const state = { ...stateWith(roundWith(hands, red(5), 0)), target: 200 as const }
    const before = { ...state, results: [{ winner: 0, points: 190, remaining: [0, 190], blocked: false }] }
    const done = applyAction(before, { type: 'play', seat: 0, card: red(3) })
    expect(done.status).toBe('matchOver')
    expect(matchWinners(done)).toEqual([0])
  })
})

describe('dealer', () => {
  it('picks the dealer from the seed and lets the next seat start', () => {
    const dealers = new Set<number>()
    for (let seed = 0; seed < 60; seed++) {
      const state = createMatch({ players: 4 }, seed)
      dealers.add(state.dealer)
      expect(createMatch({ players: 4 }, seed).dealer).toBe(state.dealer)
      const start = state.round.discard[0]
      if (typeof start.face === 'number') expect(state.round.turn).toBe(seatAfter(state.dealer, 1, 1, 4))
    }
    expect(dealers.size).toBe(4)
  })
})
