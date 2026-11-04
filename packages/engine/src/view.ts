import type { Card, Color, PlayerCount, Seat } from './cards'
import { topCard } from './match'
import type { Direction, HouseRules, MatchState, MatchStatus, Move, Phase } from './match'
import type { RoundResult, Target } from './scoring'

export interface PlayerView {
  seat: Seat
  players: PlayerCount
  target: Target
  rules: HouseRules
  dealer: Seat
  roundIndex: number
  results: RoundResult[]
  status: MatchStatus
  hand: Card[]
  handCounts: number[]
  top: Card
  discard: Card[]
  deckCount: number
  color: Color
  turn: Seat
  direction: Direction
  phase: Phase
  drawn: Card | null
  pending: number
  called: Seat | null
  exposed: Seat | null
  moves: Move[]
  winner: Seat | null
}

export function viewFor(state: MatchState, seat: Seat): PlayerView {
  const { round } = state
  return {
    seat,
    players: state.players,
    target: state.target,
    rules: state.rules,
    dealer: state.dealer,
    roundIndex: state.roundIndex,
    results: state.results,
    status: state.status,
    hand: round.hands[seat],
    handCounts: round.hands.map((hand) => hand.length),
    top: topCard(round),
    discard: round.discard,
    deckCount: round.deck.length,
    color: round.color,
    turn: round.turn,
    direction: round.direction,
    phase: round.phase,
    drawn: round.turn === seat ? round.drawn : null,
    pending: round.pending,
    called: round.called,
    exposed: round.exposed,
    moves: round.moves,
    winner: round.winner,
  }
}
