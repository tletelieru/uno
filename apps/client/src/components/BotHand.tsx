import { useLayoutEffect, useRef } from 'react'

const CARD_W = 0.875
const CARD_H = 1.25
const ROOM = 3.5
const MAX_SPACING = 0.45
const MAX_SHOWN = 14
const FLIGHT = 420
const STAGGER = 90

function flyFromDeck(target: HTMLElement, order: number): void {
  const deck = document.querySelector('[data-deck]')?.getBoundingClientRect()
  if (!deck || document.documentElement.classList.contains('reduce-motion')) return
  const end = target.getBoundingClientRect()
  const ghost = document.createElement('span')
  ghost.className = 'back-pattern card-shadow'
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${end.left}px`,
    top: `${end.top}px`,
    width: `${end.width}px`,
    height: `${end.height}px`,
    zIndex: '30',
    pointerEvents: 'none',
    transformOrigin: 'top left',
  })
  document.body.append(ghost)
  target.style.opacity = '0'
  const from = `${deck.left - end.left}px ${deck.top - end.top}px`
  const scale = `${deck.width / end.width} ${deck.height / end.height}`
  const flight = ghost.animate?.(
    [
      { translate: from, scale, rotate: '-6deg' },
      { translate: '0 0', scale: '1', rotate: '0deg' },
    ],
    { duration: FLIGHT, delay: order * STAGGER, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1.05)', fill: 'backwards' },
  )
  const land = () => {
    ghost.remove()
    target.style.opacity = ''
  }
  if (flight) flight.onfinish = land
  else land()
}

export function BotHand({ cards, active, dealing }: { cards: number; active: boolean; dealing: boolean }) {
  const fan = useRef<HTMLDivElement>(null)
  const seen = useRef(cards)
  const shown = Math.min(cards, MAX_SHOWN)
  const room = shown > 1 ? (ROOM - CARD_W) / (shown - 1) : 0
  const overlap = `${Math.min(room, MAX_SPACING) - CARD_W}rem`

  // eslint-disable-next-line local/no-effect -- flies drawn cards from the deck to the end of the fan in the DOM
  useLayoutEffect(() => {
    const before = seen.current
    seen.current = cards
    if (dealing || cards <= before) return
    const spans = [...(fan.current?.children ?? [])] as HTMLElement[]
    const added = Math.min(cards - before, spans.length)
    spans.slice(spans.length - added).forEach(flyFromDeck)
  }, [cards, dealing])

  return (
    <div aria-hidden="true" className="flex h-6 items-center justify-center">
      <div ref={fan} className={`flex items-center ${active ? 'fan-active' : ''}`}>
        {Array.from({ length: shown }, (_, index) => (
          <span
            key={index}
            style={{
              width: `${CARD_W}rem`,
              height: `${CARD_H}rem`,
              marginLeft: index > 0 ? overlap : undefined,
            }}
            className="fan-card back-pattern"
          />
        ))}
      </div>
    </div>
  )
}
