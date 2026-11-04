import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { sameCard } from '@uno/engine'
import type { Card } from '@uno/engine'
import { useMessages } from '../i18n/messages'
import { cardKey, moveItem, sortHand } from '../lib/cards'
import { readByNumber, sortOrderKey } from '../lib/settings'
import { UnoCard } from './UnoCard'

interface Props {
  header: ReactNode
  actions: ReactNode
  status: ReactNode
  hand: Card[]
  playable: Card[]
  myTurn: boolean
  dealing: boolean
  hints: boolean
  selected: string | null
  onSelect: (key: string | null) => void
  onPlay: (card: Card) => void
}

interface Drag {
  key: string
  element: HTMLButtonElement
  startX: number
  startY: number
  grabX: number
  grabY: number
  x: number
  y: number
  moved: boolean
}

const DRAG_THRESHOLD = 6
const CARD_REM = 4
const SLOT_REM = 2.95
const GAP_REM = 0.25
const DEALT_ROWS = 7

function isReducedMotion(): boolean {
  return document.documentElement.classList.contains('reduce-motion')
}

function syncOrder(order: string[], hand: Card[], byNumber: boolean): string[] {
  const keys = new Set(hand.map(cardKey))
  const kept = order.filter((key) => keys.has(key))
  const known = new Set(kept)
  const added = sortHand(hand, byNumber)
    .map(cardKey)
    .filter((key) => !known.has(key))
  return [...kept, ...added]
}

export function Hand({
  header,
  actions,
  status,
  hand,
  playable,
  myTurn,
  dealing,
  hints,
  selected,
  onSelect,
  onPlay,
}: Props) {
  const t = useMessages()
  const [byNumber, setByNumber] = useState(readByNumber)
  const [order, setOrder] = useState(() => sortHand(hand, byNumber).map(cardKey))
  const [dragging, setDragging] = useState<string | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const dragged = useRef(false)
  const slots = useRef(new Map<string, { left: number; top: number }>())

  const keys = syncOrder(order, hand, byNumber)
  const cards = keys.flatMap((key) => hand.filter((card) => cardKey(card) === key))
  const isPlayable = (card: Card) => playable.some((item) => sameCard(item, card))
  const sortedKeys = sortHand(hand, byNumber).map(cardKey)
  const isSorted = cards.every((card, index) => cardKey(card) === sortedKeys[index])
  const nextByNumber = isSorted ? !byNumber : byNumber

  const applySort = () => {
    localStorage.setItem(sortOrderKey, nextByNumber ? 'number' : 'color')
    setByNumber(nextByNumber)
    setOrder(sortHand(hand, nextByNumber).map(cardKey))
  }

  const place = useCallback(() => {
    const current = drag.current
    const box = grid.current?.getBoundingClientRect()
    if (!current?.moved || !box) return
    const x = current.x - current.grabX - box.left - current.element.offsetLeft
    const y = current.y - current.grabY - box.top - current.element.offsetTop
    current.element.style.translate = `${x}px ${y}px`
  }, [])

  // eslint-disable-next-line local/no-effect -- reserves room for the dealt hand from the grid width in the DOM
  useLayoutEffect(() => {
    const reserve = () => {
      const element = grid.current
      if (!element) return
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const perRow = Math.max(1, Math.floor((element.clientWidth + GAP_REM * rem) / (SLOT_REM * rem)))
      const rows = Math.ceil(DEALT_ROWS / perRow)
      element.style.minHeight = `${rows * CARD_REM + (rows - 1) * GAP_REM}rem`
    }
    reserve()
    window.addEventListener('resize', reserve)
    return () => window.removeEventListener('resize', reserve)
  })

  // eslint-disable-next-line local/no-effect -- animates cards in the DOM from their previous slots
  useLayoutEffect(() => {
    place()
    const buttons = grid.current?.querySelectorAll<HTMLButtonElement>('[data-card]') ?? []
    const next = new Map<string, { left: number; top: number }>()
    const deck = document.querySelector('[data-deck]')?.getBoundingClientRect()
    const drawing = !dealing && slots.current.size > 0 && !isReducedMotion()
    let drawn = 0
    buttons.forEach((button) => {
      const key = button.dataset.card!
      const slot = { left: button.offsetLeft, top: button.offsetTop }
      const previous = slots.current.get(key)
      next.set(key, slot)
      if (!previous && drawing && deck) {
        const box = button.getBoundingClientRect()
        const from = `${deck.left - box.left}px ${deck.top - box.top}px`
        button.animate?.(
          [
            { translate: from, rotate: '-8deg', scale: '1.1' },
            { translate: '0 0', rotate: '0deg', scale: '1' },
          ],
          { duration: 360, delay: drawn * 90, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1.1)', fill: 'backwards' },
        )
        drawn += 1
        return
      }
      if (!previous || key === drag.current?.key) return
      const x = previous.left - slot.left
      const y = previous.top - slot.top
      if ((x === 0 && y === 0) || isReducedMotion()) return
      button.animate?.([{ translate: `${x}px ${y}px` }, { translate: '0 0' }], {
        duration: 160,
        easing: 'ease-out',
      })
    })
    slots.current = next
  }, [order, hand.length, place, dealing])

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, key: string) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    element.setPointerCapture?.(event.pointerId)
    dragged.current = false
    drag.current = {
      key,
      element,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current) return
    current.x = event.clientX
    current.y = event.clientY
    if (!current.moved) {
      const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY)
      if (distance < DRAG_THRESHOLD) return
      current.moved = true
      setDragging(current.key)
    }
    place()
    const box = grid.current?.getBoundingClientRect()
    if (!box) return
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    const from = cards.findIndex((card) => cardKey(card) === current.key)
    const buttons = grid.current?.querySelectorAll<HTMLButtonElement>('[data-card]') ?? []
    for (const [to, button] of [...buttons].entries()) {
      const key = button.dataset.card!
      if (key === current.key) continue
      const { offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height } = button
      const inside = x >= left && x <= left + width && y >= top && y <= top + height
      if (!inside) continue
      const sameRow = top === current.element.offsetTop
      const center = left + width / 2
      const crossed = !sameRow || (to > from ? x >= center : x <= center)
      if (crossed) {
        setOrder(() => moveItem(keys, keys.indexOf(current.key), keys.indexOf(key)))
      }
      break
    }
  }

  const onPointerEnd = () => {
    const current = drag.current
    drag.current = null
    if (!current?.moved) return
    dragged.current = true
    const landing = current.element.style.translate
    current.element.style.translate = ''
    setDragging(null)
    if (isReducedMotion()) return
    current.element.animate?.([{ translate: landing }, { translate: '0 0' }], {
      duration: 140,
      easing: 'ease-out',
    })
  }

  return (
    <section aria-label={t.yourHand} className="flex w-full flex-col items-center gap-2">
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        {header}
        <button
          type="button"
          onClick={applySort}
          className="pixel-box bg-raised px-2 py-1 text-xs font-medium"
        >
          {nextByNumber ? t.sortByNumber : t.sortByColor}
        </button>
      </div>
      {actions}
      {status}
      <div ref={grid} className="relative flex w-full flex-wrap content-start justify-center gap-1">
        {cards.map((card, index) => {
          const key = cardKey(card)
          const canPlay = myTurn && isPlayable(card)
          const tappable = hints ? canPlay : myTurn
          const picked = selected === key && tappable
          const stagger = { '--delay': `${index * 30}ms` } as CSSProperties
          const dimmed = hints && myTurn && !canPlay
          return (
            <button
              key={key}
              type="button"
              data-card={key}
              style={stagger}
              aria-disabled={!tappable}
              aria-pressed={picked}
              aria-label={t.cardName(card)}
              onPointerDown={(event) => onPointerDown(event, key)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false
                  return
                }
                if (!tappable) return
                if (!picked) return onSelect(key)
                onPlay(card)
              }}
              className={`hand-card ${picked ? 'is-picked' : ''} ${dimmed ? 'is-dimmed' : ''} ${
                dragging === key ? 'is-dragging' : ''
              }`}
            >
              <span className={`block ${dealing ? 'deal-in' : ''}`}>
                <UnoCard card={card} highlight={picked} />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
