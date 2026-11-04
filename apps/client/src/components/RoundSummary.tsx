import { cardId, cardPoints, isWild } from '@uno/engine'
import type { Card, MatchState } from '@uno/engine'
import { useMessages } from '../i18n/messages'
import type { Messages } from '../i18n/messages'
import { sortHand } from '../lib/cards'
import { Overlay } from './Overlay'
import { Points } from './Points'
import { ScoreTable } from './ScoreTable'
import { UnoCard } from './UnoCard'

interface Props {
  state: MatchState
  names: string[]
  onNext: () => void
}

function breakdown(hand: Card[], t: Messages): string {
  const sum = (filter: (card: Card) => boolean) =>
    hand.filter(filter).reduce((total, card) => total + cardPoints(card), 0)
  const numbers = sum((card) => typeof card.face === 'number')
  const actions = sum((card) => !isWild(card) && typeof card.face !== 'number')
  const wilds = sum(isWild)
  return t.handBreakdown(numbers, actions, wilds)
}

export function RoundSummary({ state, names, onNext }: Props) {
  const t = useMessages()
  const result = state.results[state.results.length - 1]
  const { hands } = state.round

  return (
    <Overlay title={t.roundFinishedN(state.results.length)}>
      <ul className="flex flex-col gap-1.5">
        {names.map((name, seat) => {
          const winner = seat === result.winner
          const hand = sortHand(hands[seat], false)
          return (
            <li
              key={name}
              className={`flex flex-col gap-1 pixel-box px-2 py-1.5 ${
                winner ? 'bg-emerald-500/20' : 'bg-raised'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-pixel text-xl leading-none">{name}</span>
                <Points value={winner ? result.points : 0} />
              </span>
              {hand.length > 0 && (
                <span className="flex flex-wrap gap-0.5">
                  {hand.map((card) => (
                    <UnoCard key={cardId(card)} card={card} size="sm" />
                  ))}
                </span>
              )}
              <span className="text-xs text-muted">
                {winner && hand.length === 0 ? t.wentOut(result.points) : breakdown(hand, t)}
              </span>
            </li>
          )
        })}
      </ul>
      {result.blocked && <p className="text-sm text-muted">{t.blockedRound}</p>}
      <ScoreTable names={names} results={state.results} target={state.target} />
      <button
        type="button"
        onClick={onNext}
        className="w-full pixel-box bg-accent py-2.5 font-pixel text-2xl leading-none text-on-accent"
      >
        {t.nextRound}
      </button>
    </Overlay>
  )
}
