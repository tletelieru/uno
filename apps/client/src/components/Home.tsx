import type { Level } from '@uno/bots'
import { LEVELS } from '@uno/bots'
import { PLAYER_COUNTS } from '@uno/engine'
import type { Card, HouseRules, PlayerCount, Target } from '@uno/engine'
import { useMessages } from '../i18n/messages'
import { PlayingCard } from './PlayingCard'

interface Props {
  level: Level
  onLevel: (level: Level) => void
  players: PlayerCount
  onPlayers: (players: PlayerCount) => void
  target: Target
  rules: HouseRules
  onRules: () => void
  onHistory: () => void
  onStart: () => void
}

const FAN: { card: Card; tilt: number; lift: number }[] = [
  { card: { kind: 'color', color: 'blue', face: 7, copy: 0 }, tilt: -8, lift: 10 },
  { card: { kind: 'wild', face: 'draw4', copy: 0 }, tilt: 0, lift: 0 },
  { card: { kind: 'color', color: 'red', face: 'reverse', copy: 0 }, tilt: 8, lift: 10 },
]

export function Home({
  level,
  onLevel,
  players,
  onPlayers,
  target,
  rules,
  onRules,
  onHistory,
  onStart,
}: Props) {
  const t = useMessages()
  const house = [rules.stacking && t.stackingOn, rules.drawToPlay && t.drawToPlayOn].filter(
    (item): item is string => Boolean(item),
  )
  const groups = [
    {
      label: t.difficulty,
      hint: `${t.difficulty}: ${t.levelHints[level]}`,
      columns: 'grid-cols-3',
      options: LEVELS.map((option) => ({
        key: option,
        label: t.levels[option],
        pressed: level === option,
        onClick: () => onLevel(option),
      })),
    },
    {
      label: t.players,
      hint: `${t.players}: ${t.playerCount(players)}`,
      columns: 'grid-cols-5',
      options: PLAYER_COUNTS.map((option) => ({
        key: String(option),
        label: String(option),
        pressed: players === option,
        onClick: () => onPlayers(option),
      })),
    },
  ]

  return (
    <main className="flex flex-col items-center gap-5">
      <div aria-hidden="true" className="flex justify-center pt-6">
        {FAN.map(({ card, tilt, lift }) => (
          <PlayingCard key={card.face} card={card} tilt={tilt} lift={lift} front={tilt === 0} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-pixel text-6xl leading-none">{t.appName}</h1>
        <p className="text-muted">{t.tagline}</p>
      </div>
      {groups.map((group) => (
        <div key={group.label} role="group" aria-label={group.label} className="flex w-full flex-col gap-1">
          <span className="text-center text-sm text-muted">{group.hint}</span>
          <div className={`grid gap-1 pixel-box bg-surface p-1 ${group.columns}`}>
            {group.options.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={option.pressed}
                onClick={option.onClick}
                className={`pixel-box py-1.5 text-sm font-medium ${
                  option.pressed ? 'bg-raised' : 'text-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onStart}
        className="w-full pixel-box bg-accent py-3 font-pixel text-3xl leading-none text-on-accent"
      >
        {t.playWith(players)}
      </button>
      <section className="flex w-full flex-col gap-2 pixel-box bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-pixel text-2xl leading-none">{t.matchSetup}</h2>
          <div className="flex gap-1">
            {[
              { label: t.history, onClick: onHistory },
              { label: t.rules, onClick: onRules },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="pixel-box bg-raised px-2 py-1 text-xs font-medium"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex flex-wrap gap-1.5 text-sm">
          {[t.setupSummary(target), ...(house.length > 0 ? house : [t.noHouseRules])].map((item) => (
            <li key={item} className="pixel-box bg-raised px-2 py-1">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
