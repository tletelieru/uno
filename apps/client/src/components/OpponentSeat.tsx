import { useMessages } from '../i18n/messages'
import { BotHand } from './BotHand'

interface Props {
  name: string
  cards: number
  dealing: boolean
  points: number
  dealer: boolean
  active: boolean
  spotlight: boolean
  exposed: boolean
  said: boolean
  targeted: boolean
  onTarget: () => void
}

function seatBorder(targeted: boolean, active: boolean): string {
  if (targeted) return 'border-accent'
  if (active) return 'turn-glow border-gold'
  return 'border-transparent'
}

export function OpponentSeat({
  name,
  cards,
  points,
  dealer,
  active,
  spotlight,
  exposed,
  dealing,
  said,
  targeted,
  onTarget,
}: Props) {
  const t = useMessages()

  return (
    <button
      type="button"
      onClick={onTarget}
      aria-pressed={targeted}
      aria-current={active ? 'true' : undefined}
      data-spotlight={spotlight ? "true" : undefined}
      aria-label={`${name}, ${t.cardsLeft(cards)}`}
      className={`relative flex min-w-0 flex-1 flex-col items-center pixel-box border-2 bg-surface px-0.5 pt-0.5 pb-1 leading-tight ${
        seatBorder(targeted, active)
      } ${spotlight ? 'spotlight' : ''}`}
    >
      <span className="flex max-w-full items-center gap-0.5 truncate font-pixel text-lg leading-none">
        {name}
        {dealer && (
          <span title={t.dealer} className="text-gold">
            ●
          </span>
        )}
      </span>
      <BotHand cards={cards} active={active} dealing={dealing} />
      <span className="flex items-center gap-1 text-xs text-muted">
        <span key={cards} className="draw-pop inline-block tabular-nums text-ink">
          {t.cardsLeft(cards)}
        </span>
      </span>
      <span className="text-xs text-muted tabular-nums">{points}</span>
      {cards === 1 && said && (
        <span className="uno-shout uno-tag absolute top-0 right-0 px-1.5 py-0.5 font-pixel text-xl leading-none">
          {t.callUno}
        </span>
      )}
      {cards === 1 && !said && exposed && (
        <span className="pass-pop uno-tag uno-button is-urgent absolute top-0 right-0 px-1 font-pixel text-sm leading-none">
          {t.unoTag}
        </span>
      )}
    </button>
  )
}
