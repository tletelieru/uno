import type { ReactNode } from 'react'
import { COLORS, cardId, cardPoints } from '@uno/engine'
import type { Card } from '@uno/engine'
import type { RuleExample } from '../i18n/rules'
import { TINT } from '../lib/cards'
import { ColorMark, TurnIcon } from './CardGlyphs'
import { UnoCard } from './UnoCard'

const tint = (face: Extract<Card, { kind: 'color' }>['face']): Card => ({ kind: 'color', color: 'red', face, copy: 0 }) as Card

const DECK: { card: Card; count: string }[] = [
  { card: tint(0), count: '×1' },
  { card: tint(5), count: '1–9 ×2' },
  { card: tint('skip'), count: '×2' },
  { card: tint('reverse'), count: '×2' },
  { card: tint('draw2'), count: '×2' },
  { card: { kind: 'wild', face: 'wild', copy: 0 }, count: '×4' },
  { card: { kind: 'wild', face: 'draw4', copy: 0 }, count: '×4' },
]

const POINTS: Card[] = [
  { kind: 'color', color: 'blue', face: 7, copy: 0 },
  { kind: 'color', color: 'green', face: 'skip', copy: 0 },
  { kind: 'wild', face: 'draw4', copy: 0 },
]

const SEATS = [0, 1, 2, 3]

const UNO_HAND: Card[] = [
  { kind: 'color', color: 'blue', face: 4, copy: 0 },
  { kind: 'color', color: 'green', face: 6, copy: 0 },
]

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-center gap-1.5">{children}</div>
}

function Labeled({ card, label, faded = false }: { card: Card; label: string; faded?: boolean }) {
  return (
    <span className={`flex flex-col items-center gap-0.5 ${faded ? 'opacity-50' : ''}`}>
      <UnoCard card={card} size="sm" />
      <span className="font-pixel text-sm leading-none">{label}</span>
    </span>
  )
}

function Backs({ count }: { count: number }) {
  return (
    <span className="flex">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={`back-pattern block h-8 w-5 ${index > 0 ? '-ml-2.5' : ''}`}
        />
      ))}
    </span>
  )
}

function Seats({ skipped, next }: { skipped: number | null; next: number }) {
  return (
    <span className="flex gap-1">
      {SEATS.map((seat) => {
        const state = seatState(seat, skipped, next)
        return (
          <span
            key={seat}
            className={`pixel-box flex size-6 items-center justify-center font-pixel text-base leading-none ${state}`}
          >
            {seat + 1}
          </span>
        )
      })}
    </span>
  )
}

function seatState(seat: number, skipped: number | null, next: number): string {
  if (seat === 0) return 'bg-accent text-on-accent'
  if (seat === skipped) return 'bg-raised text-muted line-through'
  if (seat === next) return 'bg-gold text-surface'
  return 'bg-raised'
}

function Chips() {
  return (
    <span className="grid grid-cols-2 gap-0.5">
      {COLORS.map((color) => (
        <span key={color} className={`color-chip pixel-box flex size-4 items-center justify-center text-white ${TINT[color]}`}>
          <ColorMark color={color} className="size-2.5" />
        </span>
      ))}
    </span>
  )
}

const Arrow = () => <span className="font-pixel text-2xl leading-none text-gold">→</span>

export function RuleIllustration({ example }: { example: RuleExample }) {
  switch (example.kind) {
    case 'deck':
      return (
        <Row>
          {DECK.map(({ card, count }) => (
            <Labeled key={cardId(card)} card={card} label={count} />
          ))}
        </Row>
      )
    case 'hand':
      return (
        <Row>
          <Backs count={example.count} />
          <span className="font-pixel text-lg leading-none">×{example.count}</span>
        </Row>
      )
    case 'match':
      return (
        <Row>
          <UnoCard card={example.top} size="md" />
          <Arrow />
          {example.plays.map((card) => (
            <Labeled key={cardId(card)} card={card} label="✓" />
          ))}
          <Labeled card={example.wrong} label="✗" faded />
        </Row>
      )
    case 'draw':
      return (
        <Row>
          <UnoCard card={example.top} size="sm" />
          <Backs count={1} />
          <Arrow />
          <Labeled card={{ kind: 'color', color: 'yellow', face: 9, copy: 0 }} label="✓" />
        </Row>
      )
    case 'uno':
      return (
        <Row>
          {UNO_HAND.map((card) => (
            <UnoCard key={cardId(card)} card={card} size="sm" />
          ))}
          <Arrow />
          <UnoCard card={{ kind: 'color', color: 'green', face: 6, copy: 0 }} size="sm" />
          <span className="uno-button pixel-box px-2 py-1 font-pixel text-lg leading-none">UNO!</span>
        </Row>
      )
    case 'skip':
      return (
        <Row>
          <UnoCard card={{ kind: 'color', color: 'blue', face: 'skip', copy: 0 }} size="sm" />
          <Seats skipped={1} next={2} />
        </Row>
      )
    case 'reverse':
      return (
        <Row>
          <UnoCard card={{ kind: 'color', color: 'yellow', face: 'reverse', copy: 0 }} size="sm" />
          <TurnIcon className="size-6 text-gold" />
          <Arrow />
          <TurnIcon className="size-6 -scale-x-100 text-gold" />
          <Seats skipped={null} next={3} />
        </Row>
      )
    case 'penalty':
      return (
        <Row>
          <UnoCard card={example.card} size="sm" />
          <Arrow />
          <Backs count={example.count} />
          <Seats skipped={1} next={2} />
        </Row>
      )
    case 'wild':
      return (
        <Row>
          <UnoCard card={{ kind: 'wild', face: 'wild', copy: 0 }} size="sm" />
          <Chips />
          <UnoCard card={example.card} size="sm" />
          <Chips />
          <Backs count={4} />
        </Row>
      )
    case 'points':
      return (
        <Row>
          {POINTS.map((card) => (
            <Labeled key={cardId(card)} card={card} label={String(cardPoints(card))} />
          ))}
        </Row>
      )
    case 'cards':
      return (
        <Row>
          {example.cards.map((card) => (
            <UnoCard key={cardId(card)} card={card} size="sm" />
          ))}
        </Row>
      )
  }
}
