import { COLORS, TARGETS } from '@uno/engine'
import type { HouseRules, Target } from '@uno/engine'
import { locales } from '../i18n/locales'
import type { Locale } from '../i18n/locales'
import { useLocale, useMessages } from '../i18n/messages'
import { TINT } from '../lib/cards'
import { textSizes } from '../lib/textSize'
import type { TextSize } from '../lib/textSize'
import type { ColorMode } from '../lib/theme'
import { ColorMark } from './CardGlyphs'
import { MoonIcon, MusicIcon, MusicOffIcon, SunIcon } from './icons'
import { Overlay } from './Overlay'

interface Props {
  mode: ColorMode
  onToggleMode: () => void
  onLocale: (locale: Locale) => void
  textSize: TextSize
  onTextSize: (next: TextSize) => void
  reduceMotion: boolean
  onReduceMotion: (next: boolean) => void
  plainFont: boolean
  onPlainFont: (next: boolean) => void
  colorSymbols: boolean
  onColorSymbols: (next: boolean) => void
  musicOn: boolean
  onMusic: (next: boolean) => void
  soundOn: boolean
  onSound: (next: boolean) => void
  target: Target
  onTarget: (next: Target) => void
  rules: HouseRules
  onRulesChange: (next: HouseRules) => void
  onRules: () => void
  otherGames: boolean
  onOtherGames: (next: boolean) => void
  onClose: () => void
}

interface CheckItem {
  label: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}

const iconButton = 'flex size-10 shrink-0 items-center justify-center pixel-box bg-raised'

const SAMPLE: Record<TextSize, string> = {
  normal: 'text-sm',
  large: 'text-lg',
  xlarge: 'text-2xl',
}

function CheckList({ items }: { items: CheckItem[] }) {
  return items.map((item) => (
    <label key={item.label} className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(event) => item.onChange(event.target.checked)}
        className="pixel-check"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{item.label}</span>
        <span className="block text-xs text-muted">{item.hint}</span>
      </span>
    </label>
  ))
}

export function Settings({
  mode,
  onToggleMode,
  onLocale,
  textSize,
  onTextSize,
  reduceMotion,
  onReduceMotion,
  plainFont,
  onPlainFont,
  colorSymbols,
  onColorSymbols,
  musicOn,
  onMusic,
  soundOn,
  onSound,
  target,
  onTarget,
  rules,
  onRulesChange,
  onRules,
  otherGames,
  onOtherGames,
  onClose,
}: Props) {
  const t = useMessages()
  const locale = useLocale()
  const modeLabel = mode === 'dark' ? t.toLight : t.toDark
  const musicLabel = musicOn ? t.musicOff : t.musicOnLabel

  const comfort: CheckItem[] = [
    { label: t.sound, hint: t.soundHint, checked: soundOn, onChange: onSound },
    { label: t.plainFont, hint: t.plainFontHint, checked: plainFont, onChange: onPlainFont },
    { label: t.showOtherGames, hint: t.showOtherGamesHint, checked: otherGames, onChange: onOtherGames },
    { label: t.reduceMotion, hint: t.reduceMotionHint, checked: reduceMotion, onChange: onReduceMotion },
    { label: t.colorSymbols, hint: t.colorSymbolsHint, checked: colorSymbols, onChange: onColorSymbols },
  ]

  const house: CheckItem[] = [
    {
      label: t.stacking,
      hint: t.stackingHint,
      checked: rules.stacking,
      onChange: (stacking) => onRulesChange({ ...rules, stacking }),
    },
    {
      label: t.drawToPlay,
      hint: t.drawToPlayHint,
      checked: rules.drawToPlay,
      onChange: (drawToPlay) => onRulesChange({ ...rules, drawToPlay }),
    },
  ]

  return (
    <Overlay title={t.settings} onClose={onClose}>
      <div className="flex items-center justify-center gap-2">
        <div role="group" aria-label={t.language} className="flex pixel-box bg-raised p-0.5">
          {locales.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={locale === option}
              onClick={() => onLocale(option)}
              className={`pixel-box px-3 py-1.5 text-sm ${
                locale === option ? 'bg-accent text-on-accent' : 'text-muted'
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
        {[
          {
            label: musicLabel,
            pressed: musicOn,
            onClick: () => onMusic(!musicOn),
            icon: musicOn ? <MusicIcon /> : <MusicOffIcon />,
          },
          {
            label: modeLabel,
            pressed: undefined,
            onClick: onToggleMode,
            icon: mode === 'dark' ? <SunIcon /> : <MoonIcon />,
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            aria-pressed={item.pressed}
            title={item.label}
            onClick={item.onClick}
            className={iconButton}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div role="group" aria-label={t.textSize} className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t.textSize}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {textSizes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={textSize === option}
              onClick={() => onTextSize(option)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 pixel-box px-1 py-1.5 text-xs font-medium ${
                textSize === option ? 'bg-accent text-on-accent' : 'bg-raised text-muted'
              }`}
            >
              <span aria-hidden="true" className={`leading-none font-bold ${SAMPLE[option]}`}>
                A
              </span>
              {t.textSizes[option]}
            </button>
          ))}
        </div>
      </div>
      <CheckList items={comfort} />
      <div aria-hidden="true" className="flex justify-center gap-2">
        {COLORS.map((color) => (
          <span
            key={color}
            className={`color-chip pixel-box flex size-9 items-center justify-center text-white ${TINT[color]}`}
          >
            <ColorMark color={color} className="uno-corner size-4" />
          </span>
        ))}
      </div>
      <section className="flex flex-col gap-2 border-t-2 border-line pt-3">
        <h3 className="font-pixel text-2xl leading-none">{t.matchRules}</h3>
        <div role="group" aria-label={t.target} className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{t.target}</span>
          <div className="flex pixel-box bg-raised p-0.5">
            {TARGETS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={target === option}
                onClick={() => onTarget(option)}
                className={`pixel-box px-3 py-1.5 text-sm ${
                  target === option ? 'bg-accent text-on-accent' : 'text-muted'
                }`}
              >
                {t.targetPoints(option)}
              </button>
            ))}
          </div>
        </div>
        <CheckList items={house} />
        <p className="text-xs text-muted">{t.matchRulesHint}</p>
      </section>
      {[
        { label: t.rules, onClick: onRules },
        { label: t.close, onClick: onClose },
      ].map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="pixel-box bg-raised py-2 font-medium"
        >
          {item.label}
        </button>
      ))}
    </Overlay>
  )
}
