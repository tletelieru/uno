import { parseArgs } from 'node:util'
import { BOTS, createRng, randomBot } from '@uno/bots'
import type { Bot } from '@uno/bots'
import {
  PLAYER_COUNTS,
  applyAction,
  createMatch,
  legalActions,
  matchTotals,
  matchWinners,
  startNextRound,
  viewFor,
} from '@uno/engine'
import type { MatchState, PlayerCount, Target } from '@uno/engine'

const { values } = parseArgs({
  options: {
    matches: { type: 'string', default: '1000' },
    players: { type: 'string', default: '4' },
    seed: { type: 'string', default: '1' },
    target: { type: 'string', default: '500' },
    hero: { type: 'string' },
    field: { type: 'string' },
    stacking: { type: 'boolean', default: false },
    'draw-to-play': { type: 'boolean', default: false },
  },
})

const CATALOG: Record<string, Bot> = { random: randomBot, ...BOTS }

const MATCHUPS: [string, string][] = [
  ['medium', 'easy'],
  ['hard', 'medium'],
  ['hard', 'easy'],
]

const matches = Number(values.matches)
const players = Number(values.players) as PlayerCount
const firstSeed = Number(values.seed)
const target = Number(values.target) as Target
const rules = { stacking: values.stacking, drawToPlay: values['draw-to-play'] }
const single = values.hero && values.field ? [[values.hero, values.field] as [string, string]] : null
const matchups = single ?? MATCHUPS

const valid =
  Number.isInteger(matches) &&
  matches > 0 &&
  PLAYER_COUNTS.includes(players) &&
  (target === 200 || target === 500) &&
  matchups.every(([hero, field]) => CATALOG[hero] && CATALOG[field])

if (!valid) {
  console.error(
    'Usage: pnpm sim [--hero <bot> --field <bot>] [--matches <n>] [--players <2-6>] [--target <200|500>] [--stacking] [--draw-to-play]',
  )
  process.exit(1)
}

function playMatch(seed: number, heroSeat: number, hero: Bot, field: Bot): MatchState {
  const rng = createRng(seed)
  let state = createMatch({ players, target, rules }, seed)
  while (state.status !== 'matchOver') {
    if (state.status === 'roundOver') {
      state = startNextRound(state)
      continue
    }
    const seat = state.round.turn
    const bot = seat === heroSeat ? hero : field
    state = applyAction(state, bot.choose(viewFor(state, seat), legalActions(state, seat), rng))
  }
  return state
}

function run(heroName: string, fieldName: string) {
  const hero = CATALOG[heroName]
  const field = CATALOG[fieldName]
  let wins = 0
  let rounds = 0
  let points = 0
  const started = performance.now()
  for (let index = 0; index < matches; index++) {
    const heroSeat = index % players
    const state = playMatch(firstSeed + index, heroSeat, hero, field)
    if (matchWinners(state).includes(heroSeat)) wins += 1
    rounds += state.results.length
    points += matchTotals(state)[heroSeat]
  }
  const rate = wins / matches
  const margin = 1.96 * Math.sqrt((rate * (1 - rate)) / matches)
  const elapsed = performance.now() - started
  return { heroName, fieldName, rate, margin, rounds: rounds / matches, points: points / matches, ms: elapsed / matches }
}

const flags = [rules.stacking && 'stacking', rules.drawToPlay && 'draw to play'].filter(Boolean)
console.log(
  `${players} players, to ${target}, ${matches} matches per row${flags.length > 0 ? `, ${flags.join(', ')}` : ''}`,
)
console.log(`even odds: ${(100 / players).toFixed(1)}%`)
for (const [heroName, fieldName] of matchups) {
  const result = run(heroName, fieldName)
  console.log(
    `${result.heroName.padEnd(7)} vs ${result.fieldName.padEnd(7)} wins ${(result.rate * 100).toFixed(1)}% ±${(result.margin * 100).toFixed(1)}  ${result.rounds.toFixed(1)} rounds/match  ${result.points.toFixed(0)} pts  ${result.ms.toFixed(2)} ms/match`,
  )
}
