import type { Card } from '@uno/engine'
import { cardTint } from '../lib/cards'
import { ColorMark, ReverseIcon, SkipIcon } from './CardGlyphs'

export type CardSize = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  card: Card
  size?: CardSize
  highlight?: boolean
}

interface SizeStyle {
  box: string
  corner: string
  top: string
  bottom: string
  cornerIcon: string
  glyph: string
  icon: string
  mark: string
  chip: string
}

const SIZES: Record<CardSize, SizeStyle> = {
  sm: {
    box: 'h-11 w-7 border-2',
    corner: 'text-sm',
    top: 'top-0 left-0.5',
    bottom: 'rotate-180 bottom-0 right-0.5',
    cornerIcon: 'size-2',
    glyph: 'text-xl',
    icon: 'size-3.5',
    mark: 'top-0.5 right-0.5 size-1.5',
    chip: 'size-1.5',
  },
  md: {
    box: 'h-16 w-11 border-2',
    corner: 'text-lg',
    top: 'top-0 left-1',
    bottom: 'rotate-180 bottom-0 right-1',
    cornerIcon: 'size-2.5',
    glyph: 'text-3xl',
    icon: 'size-5',
    mark: 'top-1 right-1 size-2',
    chip: 'size-2',
  },
  lg: {
    box: 'h-24 w-16 border-[3px]',
    corner: 'text-2xl',
    top: 'top-0.5 left-1.5',
    bottom: 'rotate-180 bottom-0.5 right-1.5',
    cornerIcon: 'size-3.5',
    glyph: 'text-5xl',
    icon: 'size-8',
    mark: 'top-1.5 right-1.5 size-3',
    chip: 'size-3',
  },
  xl: {
    box: 'hero-card h-36 w-24 border-4 sm:h-44 sm:w-30',
    corner: 'text-3xl',
    top: 'top-1 left-2.5',
    bottom: 'rotate-180 bottom-1 right-2.5',
    cornerIcon: 'size-4',
    glyph: 'text-7xl',
    icon: 'size-12',
    mark: 'top-2.5 right-2.5 size-4',
    chip: 'size-4',
  },
}

function Corner({ card, style, flip = false }: { card: Card; style: SizeStyle; flip?: boolean }) {
  const place = flip ? style.bottom : style.top
  const label = cornerLabel(card)
  return (
    <span className={`uno-corner absolute leading-none ${style.corner} ${place} ${marked(card)}`}>
      {label ?? <CornerIcon card={card} style={style} />}
    </span>
  )
}

function marked(card: Card): string {
  return card.face === 6 || card.face === 9 ? 'underline decoration-2 underline-offset-2' : ''
}

function cornerLabel(card: Card): string | null {
  if (typeof card.face === 'number') return String(card.face)
  if (card.face === 'draw2') return '+2'
  if (card.face === 'draw4') return '+4'
  return null
}

function CornerIcon({ card, style }: { card: Card; style: SizeStyle }) {
  if (card.face === 'skip') return <SkipIcon className={`mt-0.5 block ${style.cornerIcon}`} />
  if (card.face === 'reverse') return <ReverseIcon className={`mt-0.5 block ${style.cornerIcon}`} />
  return <span className={`wild-chip mt-0.5 block ${style.chip}`} />
}

function Glyph({ card, style }: { card: Card; style: SizeStyle }) {
  if (card.face === 'skip') return <SkipIcon className={style.icon} />
  if (card.face === 'reverse') return <ReverseIcon className={style.icon} />
  if (card.face === 'wild') return null
  return <span className={`leading-none ${style.glyph} ${marked(card)}`}>{cornerLabel(card)}</span>
}

export function UnoCard({ card, size = 'md', highlight = false }: Props) {
  const style = SIZES[size]
  return (
    <span className="card-shadow block">
      <span
        className={`card-face uno-card font-pixel ${style.box} ${cardTint(card)} ${
          highlight ? 'is-highlight' : ''
        }`}
      >
        <span className="uno-oval" />
        <span className="uno-glyph absolute inset-0 flex items-center justify-center">
          <Glyph card={card} style={style} />
        </span>
        <Corner card={card} style={style} />
        {size !== 'sm' && <Corner card={card} style={style} flip />}
        {card.kind === 'color' && (
          <ColorMark color={card.color} className={`uno-corner absolute ${style.mark}`} />
        )}
      </span>
    </span>
  )
}
