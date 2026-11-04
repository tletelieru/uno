import type { CSSProperties } from 'react'
import type { Card } from '@uno/engine'
import { UnoCard } from './UnoCard'

interface Props {
  card: Card
  tilt: number
  lift: number
  front?: boolean
}

export function PlayingCard({ card, tilt, lift, front = false }: Props) {
  const style = { '--tilt': `${tilt}deg`, '--lift': `${lift}px` } as CSSProperties

  return (
    <div style={style} className={`playing-card relative -mx-1 ${front ? 'z-10' : ''}`}>
      <UnoCard card={card} size="xl" />
    </div>
  )
}
