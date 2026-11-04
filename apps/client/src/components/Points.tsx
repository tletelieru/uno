import { formatPoints } from '../lib/cards'

interface Props {
  value: number
  block?: boolean
}

export function Points({ value, block = false }: Props) {
  const shape = block
    ? 'flex h-8 items-center justify-center font-pixel text-xl leading-none'
    : 'inline-block px-1 py-0.5'
  const tone = value > 0 ? 'bg-emerald-500/20' : 'bg-raised text-muted'

  return <span className={`pixel-box tabular-nums ${shape} ${tone}`}>{formatPoints(value)}</span>
}
