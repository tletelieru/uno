import type { CSSProperties } from 'react'
import { seatAfter } from '@uno/engine'
import type { PlayerCount, Seat } from '@uno/engine'
import { seatVector } from '../lib/cards'

interface Props {
  players: PlayerCount
  dealer: Seat
  step: number
}

export function DealAnimation({ players, dealer, step }: Props) {
  const seat = seatAfter(dealer, (step % players) + 1, 1, players)
  const vector = seatVector(seat, players)
  const style = { '--to-x': `${vector.x}px`, '--to-y': `${vector.y}px` } as CSSProperties

  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-1/2 left-1/2 z-10">
      <span key={step} style={style} className="deal-flight card-back" />
    </div>
  )
}
