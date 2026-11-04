import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Level } from '@uno/bots'
import { HAND_SIZE, matchTotals, matchWinners, playableCards } from '@uno/engine'
import type { Action, Card, Color, Direction, MatchConfig, MatchState, Move, Seat } from '@uno/engine'
import type { Messages } from '../i18n/messages'
import { useMessages } from '../i18n/messages'
import { HUMAN, TINT, cardKey, seatVector } from '../lib/cards'
import { saveRecord } from '../lib/history'
import { clearSavedMatch } from '../lib/savedMatch'
import { useMatch } from '../useMatch'
import { ColorMark, TurnIcon } from './CardGlyphs'
import { ColorPicker } from './ColorPicker'
import { DealAnimation } from './DealAnimation'
import { Hand } from './Hand'
import { OpponentSeat } from './OpponentSeat'
import { Overlay } from './Overlay'
import { ResultEffect } from './ResultEffect'
import { RoundSummary } from './RoundSummary'
import { ScoreTable } from './ScoreTable'
import { UnoCard } from './UnoCard'

interface Props {
  config: MatchConfig
  seed: number
  level: Level
  restored: MatchState | null
  onExit: () => void
}

function hasPlays(state: MatchState): boolean {
  if (state.results.length > 0) return true
  return state.round.moves.some((move) => move.kind === 'play')
}

function saveAbandoned(state: MatchState, seed: number, level: Level): void {
  if (state.status === 'matchOver' || !hasPlays(state)) return
  saveRecord({
    id: seed,
    finishedAt: Date.now(),
    players: state.players,
    level,
    target: state.target,
    results: state.results,
    totals: matchTotals(state),
    winners: [],
    abandoned: true,
  })
}

function describeMove(move: Move | undefined, names: string[], t: Messages): string {
  if (!move) return ''
  const name = names[move.seat]
  switch (move.kind) {
    case 'play':
      return t.movePlayed(name, t.cardName(move.card))
    case 'draw':
      return move.penalty ? t.movePenalty(name, move.count) : t.moveDrew(name, move.count)
    case 'pass':
      return t.movePassed(name)
    case 'uno':
      return t.moveUno(name)
    case 'catch':
      return t.moveCaught(name, names[move.target])
    case 'choose':
      return t.moveChose(name, t.colors[move.color])
  }
}

function lastMove(state: MatchState): Move | undefined {
  const { moves } = state.round
  const last = moves.at(-1)
  if (last?.kind === 'draw' && last.penalty) {
    const before = moves.at(-2)
    if (before?.kind === 'catch') return before
  }
  return last
}

function find<T extends Action['type']>(legal: Action[], type: T) {
  return legal.find((action): action is Extract<Action, { type: T }> => action.type === type)
}

function saidUno(state: MatchState, seat: Seat): boolean {
  const { moves, hands } = state.round
  if (hands[seat].length !== 1) return false
  const called = moves.findLastIndex((move) => move.kind === 'uno' && move.seat === seat)
  const drew = moves.findLastIndex((move) => move.kind === 'draw' && move.seat === seat)
  return called > drew
}

function lastPlaySeat(state: MatchState): Seat | null {
  const play = state.round.moves.findLast((move) => move.kind === 'play')
  return play ? play.seat : null
}

interface StatusProps {
  state: MatchState
  myTurn: boolean
  names: string[]
  stuck: boolean
  notice: string | null
}

function TurnStatus({ state, myTurn, names, stuck, notice }: StatusProps) {
  const t = useMessages()
  const { round } = state
  const text = notice ?? statusText(state, myTurn, names, stuck, t)
  return (
    <p
      aria-live="polite"
      className={`flex h-10 w-full items-center justify-center text-center text-sm leading-tight font-medium ${myTurn ? 'text-gold' : 'text-muted'} ${
        state.status === 'playing' ? '' : 'invisible'
      }`}
      data-turn={round.turn}
    >
      {text}
    </p>
  )
}

function statusText(state: MatchState, myTurn: boolean, names: string[], stuck: boolean, t: Messages): string {
  const { round } = state
  if (!myTurn) return t.waiting(names[round.turn])
  if (round.phase === 'choose') return t.chooseTurn
  if (round.pending > 0) return t.pendingTurn(round.pending)
  if (stuck) return t.noMoves
  return t.yourTurn
}

export function Table({ config, seed, level, restored, onExit }: Props) {
  const t = useMessages()
  const match = useMatch(config, seed, level, restored)
  const { state, holding, dealing, dealStep, intro, spotlight, legal } = match
  const handCards = HAND_SIZE * state.players
  const landed = (seat: Seat) => {
    if (dealStep >= handCards) return state.round.hands[seat].length
    const offset = (seat - state.dealer - 1 + state.players * 2) % state.players
    return Math.min(HAND_SIZE, Math.max(0, Math.ceil((dealStep - offset) / state.players)))
  }
  const pileShown = dealStep > handCards
  const discardShown = dealStep >= handCards + 2
  const [scoresOpen, setScoresOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [wild, setWild] = useState<Card | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [deckPick, setDeckPick] = useState<string | null>(null)
  const [pick, setPick] = useState<{ seat: Seat; at: string } | null>(null)
  const { round, players } = state
  const names = Array.from({ length: players }, (_, seat) => (seat === HUMAN ? t.you : t.bot(seat)))
  const totals = matchTotals(state)
  const winners = matchWinners(state)
  const playing = state.status === 'playing'
  const myTurn = playing && !holding && round.turn === HUMAN
  const playable = myTurn ? playableCards(state, HUMAN) : []
  const drawAction = find(legal, 'draw')
  const passAction = find(legal, 'pass')
  const unoAction = find(legal, 'uno')
  const catchAction = find(legal, 'catch')
  const stuck = Boolean(passAction)
  const top = round.discard[round.discard.length - 1]
  const from = lastPlaySeat(state)
  const vector = from === null ? null : seatVector(from, players)
  const enter = vector
    ? ({ '--from-x': `${vector.x}px`, '--from-y': `${vector.y}px` } as CSSProperties)
    : undefined
  const humanWon = winners.includes(HUMAN)
  const opponents = names.slice(1).map((name, index) => ({ name, seat: index + 1 }))
  const exposedBot = round.exposed !== null && round.exposed !== HUMAN ? round.exposed : null


  const playCard = (card: Card) => {
    setSelected(null)
    if (!playable.some((item) => cardKey(item) === cardKey(card))) return setNotice(moveKey)
    if (card.kind === 'wild') return setWild(card)
    match.play(card)
  }

  const hints = level === 'easy'
  const announcing = intro?.kind === 'announce'
  const logLine = announcing ? t.dealerIs(names[state.dealer]) : describeMove(lastMove(state), names, t)
  const moveKey = `${state.roundIndex}:${round.moves.length}`
  const illegal = notice === moveKey
  const unoLabel = hints && catchAction && exposedBot !== null ? t.catchUno(names[exposedBot]) : t.callUno
  const target = pick?.at === moveKey ? pick.seat : null
  const catchable = Boolean(catchAction) && target !== null && round.exposed === target
  const unoReady = Boolean(unoAction) || catchable || (hints && Boolean(catchAction))
  const shout = () => {
    setPick(null)
    if (catchable) return match.catchUno()
    if (unoAction) return match.callUno()
    if (catchAction) match.catchUno()
  }
  const canDraw = myTurn && Boolean(drawAction)
  const deckLifted = (canDraw && deckPick === moveKey) || match.botLift
  const tapDeck = () => {
    if (!deckLifted) {
      setSelected(null)
      return setDeckPick(moveKey)
    }
    setDeckPick(null)
    match.draw()
  }
  const selectCard = (key: string | null) => {
    setDeckPick(null)
    setSelected(key)
  }

  return (
    <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-x-clip overflow-y-auto overscroll-contain">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setScoresOpen(true)}
          className="min-w-0 flex-1 pixel-box bg-surface px-3 py-1.5 text-left"
        >
          <span className="block font-pixel text-xl leading-none">
            {t.roundLabel(state.roundIndex + 1, state.target)}
          </span>
          <span className="block truncate text-xs text-muted">
            {t.you}: {totals[HUMAN]}
          </span>
        </button>
        {[
          { label: t.scoreTitle, onClick: () => setScoresOpen(true) },
          { label: t.exit, onClick: () => setExitOpen(true) },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="pixel-button bg-raised px-3 py-1 text-ink"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {opponents.map(({ name, seat }) => (
          <OpponentSeat
            key={seat}
            name={name}
            cards={landed(seat)}
            points={totals[seat]}
            dealer={intro === null && state.dealer === seat}
            active={playing && !holding && round.turn === seat}
            spotlight={spotlight === seat}
            exposed={hints && round.exposed === seat}
            dealing={holding}
            said={saidUno(state, seat)}
            targeted={target === seat}
            onTarget={() => setPick(target === seat ? null : { seat, at: moveKey })}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-1">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label={`${t.drawPile}, ${t.deckLeft(round.deck.length)}`}
            aria-pressed={deckLifted}
            disabled={!canDraw}
            onClick={tapDeck}
            className="relative flex flex-col items-center gap-1 disabled:cursor-default"
          >
            <span data-deck className={`relative ml-6 block h-24 w-16 ${pileShown ? 'score-pop' : 'invisible'}`}>
              {[4, 3, 2, 1, 0].map((offset) => (
                <span
                  key={offset}
                  style={{
                    translate: offset === 0 && deckLifted ? '0 -12px' : `${offset * -6}px 0`,
                    rotate: offset === 0 && deckLifted ? '-2deg' : '0deg',
                  }}
                  className="deck-card card-shadow back-pattern absolute inset-0"
                />
              ))}
            </span>
            <span className={`text-xs text-muted ${pileShown ? '' : 'invisible'}`}>{t.deckLeft(round.deck.length)}</span>
          </button>
          <DirectionMark direction={round.direction} pending={round.pending} />
          <DiscardPile top={top} color={round.color} count={round.discard.length} enter={enter} shown={discardShown} />
        </div>
        <p aria-live="polite" className="h-5 truncate text-center text-sm text-gold">
          {logLine}
        </p>
      </div>

      <Hand
        key={state.roundIndex}
        header={
          <>
            <span
              aria-current={myTurn ? 'true' : undefined}
              className={`min-w-30 pixel-box border-2 bg-surface px-2 py-0.5 text-center font-pixel text-lg leading-none tabular-nums ${
                myTurn ? 'turn-glow border-gold' : 'border-transparent'
              } ${spotlight === HUMAN ? 'spotlight' : ''}`}
            >
              {t.you} · {t.cardsLeft(landed(HUMAN))}
            </span>
          </>
        }
        actions={
          <button
            type="button"
            disabled={!unoReady}
            onClick={shout}
            className={`uno-button w-full truncate pixel-box px-1 py-2 font-pixel text-xl leading-none ${
              hints && unoReady ? 'is-urgent' : ''
            }`}
          >
            {unoLabel}
          </button>
        }
        status={<TurnStatus state={state} myTurn={myTurn} names={names} stuck={stuck} notice={illegal ? t.noMatch : null} />}
        hand={round.hands[HUMAN].slice(0, landed(HUMAN))}
        playable={playable}
        myTurn={myTurn}
        dealing={holding}
        hints={hints}
        selected={selected}
        onSelect={selectCard}
        onPlay={playCard}
      />

      {dealing && dealStep < handCards && (
        <DealAnimation players={players} dealer={state.dealer} step={dealStep} />
      )}

      {wild && myTurn && (
        <ColorPicker
          onPick={(color) => {
            setWild(null)
            match.play(wild, color)
          }}
          onClose={() => setWild(null)}
        />
      )}

      {myTurn && round.phase === 'choose' && <ColorPicker onPick={match.choose} />}

      {exitOpen && (
        <Overlay title={t.exitTitle} onClose={() => setExitOpen(false)}>
          <p className="font-pixel text-xl leading-tight text-muted">{t.exitBody}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExitOpen(false)}
              className="pixel-button bg-raised py-2.5 text-ink"
            >
              {t.keepPlaying}
            </button>
            <button
              type="button"
              onClick={() => {
                saveAbandoned(state, seed, level)
                clearSavedMatch()
                onExit()
              }}
              className="pixel-button bg-rose-700 py-2.5 text-white"
            >
              {t.exitConfirm}
            </button>
          </div>
        </Overlay>
      )}

      {scoresOpen && (
        <Overlay title={t.scoreTitle} onClose={() => setScoresOpen(false)}>
          <ScoreTable names={names} results={state.results} target={state.target} />
          <button
            type="button"
            onClick={() => setScoresOpen(false)}
            className="pixel-box bg-raised py-2 font-medium"
          >
            {t.close}
          </button>
        </Overlay>
      )}

      {state.status === 'roundOver' && (
        <RoundSummary state={state} names={names} onNext={match.next} />
      )}

      {state.status === 'matchOver' && <ResultEffect won={humanWon} />}

      {state.status === 'matchOver' && (
        <Overlay title={t.matchFinished}>
          <p
            className={`text-center font-pixel text-3xl leading-none text-gold ${
              humanWon ? 'result-win' : 'result-lose'
            }`}
          >
            {winners.length > 1
              ? t.tie(winners.map((seat) => names[seat]).join(', '))
              : t.winner(names[winners[0]], totals[winners[0]])}
          </p>
          <ScoreTable names={names} results={state.results} target={state.target} />
          <button
            type="button"
            onClick={onExit}
            className="pixel-box bg-accent py-2 font-medium text-on-accent"
          >
            {t.backHome}
          </button>
        </Overlay>
      )}
    </main>
  )
}

function DirectionMark({ direction, pending }: { direction: Direction; pending: number }) {
  const t = useMessages()
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        key={direction}
        role="img"
        aria-label={direction === 1 ? t.clockwise : t.counterClockwise}
        className="direction-flip pixel-box block bg-surface px-2 py-1.5 text-gold"
      >
        <TurnIcon className={`block h-[21px] w-[27px] ${direction === 1 ? '' : '-scale-x-100'}`} />
      </span>
      <span
        aria-hidden={pending === 0}
        className={`pixel-box uno-tag px-1.5 py-0.5 font-pixel text-lg leading-none ${pending > 0 ? 'pass-pop' : 'invisible'}`}
      >
        {t.pending(Math.max(pending, 2))}
      </span>
    </div>
  )
}

interface DiscardProps {
  top: Card
  color: Color
  count: number
  enter: CSSProperties | undefined
  shown: boolean
}

function DiscardPile({ top, color, count, enter, shown }: DiscardProps) {
  const t = useMessages()
  return (
    <div className={`flex w-28 flex-col items-center gap-1 ${shown ? '' : 'invisible'}`}>
      <div aria-label={t.discardPile} className={`active-color ${TINT[color]}`}>
        <div key={`${count}-${shown}`} style={enter} className={enter ? 'discard-enter' : 'start-flip'}>
          <UnoCard card={top} size="lg" />
        </div>
      </div>
      <span className={`flex items-center gap-1 text-xs ${TINT[color]}`}>
        <span className="color-chip pixel-box flex size-3 items-center justify-center">
          <ColorMark color={color} className="size-2 text-white" />
        </span>
        <span className="text-muted">{t.currentColor(t.colors[color])}</span>
      </span>
    </div>
  )
}
