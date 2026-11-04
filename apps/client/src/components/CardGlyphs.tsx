import type { Color } from '@uno/engine'
import { PixelIcon } from './PixelIcon'

const SKIP = [
  '..#####..',
  '.##...##.',
  '##...####',
  '#...###.#',
  '#..###..#',
  '#.###...#',
  '####...##',
  '.##...##.',
  '..#####..',
]

const REVERSE = [
  '...#.....',
  '..##.....',
  '.########',
  '..##....#',
  '...#....#',
  '#....#...',
  '#....##..',
  '########.',
  '.....##..',
  '.....#...',
]

const TURN = [
  '#...#....',
  '##..##...',
  '.##..##..',
  '..##..##.',
  '.##..##..',
  '##..##...',
  '#...#....',
]

const MARKS: Record<Color, string[]> = {
  red: ['...#...', '..###..', '..###..', '.#####.', '.#####.', '#######', '#######'],
  yellow: ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'],
  green: ['.......', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.', '.......'],
  blue: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
}

export function SkipIcon({ className }: { className: string }) {
  return <PixelIcon rows={SKIP} className={className} />
}

export function ReverseIcon({ className }: { className: string }) {
  return <PixelIcon rows={REVERSE} className={className} />
}

export function TurnIcon({ className }: { className: string }) {
  return <PixelIcon rows={TURN} className={className} />
}

export function ColorMark({ color, className }: { color: Color; className: string }) {
  return (
    <span aria-hidden="true" className={`color-mark ${className}`}>
      <PixelIcon rows={MARKS[color]} className="size-full" />
    </span>
  )
}
