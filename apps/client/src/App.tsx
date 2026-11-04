import { useEffect, useLayoutEffect, useState } from 'react'
import type { Level } from '@uno/bots'
import type { HouseRules, MatchConfig, MatchState, PlayerCount, Target } from '@uno/engine'
import { useInstall } from './useInstall'
import { pickLocale, preferredLocaleKey } from './i18n/locales'
import type { Locale } from './i18n/locales'
import { LocaleContext } from './i18n/messages'
import {
  colorSymbolsKey,
  drawToPlayKey,
  levelKey,
  musicKey,
  plainFontKey,
  playersKey,
  readColorSymbols,
  readLevel,
  readPlainFont,
  readPlayers,
  readReduceMotion,
  readRules,
  readMusic,
  readSound,
  readTarget,
  reduceMotionKey,
  soundKey,
  stackingKey,
  targetKey,
} from './lib/settings'
import { readSavedMatch } from './lib/savedMatch'
import { createMusic } from './lib/music'
import { MusicContext, SETUP_TRACKS, SoundContext, createSound, trackForMatch } from './lib/sound'
import { pickTextSize, textSizeKey, textSizeScale } from './lib/textSize'
import type { TextSize } from './lib/textSize'
import { colorModeKey, pickColorMode, prefersDark } from './lib/theme'
import type { ColorMode } from './lib/theme'
import { Footer } from './components/Footer'
import { OtherGamesAside, OtherGamesDialog } from './components/OtherGames'
import { otherGamesKey, readOtherGames } from './lib/otherGames'
import { Header } from './components/Header'
import { History } from './components/History'
import { Home } from './components/Home'
import { Rules } from './components/Rules'
import { Settings } from './components/Settings'
import { Table } from './components/Table'

interface Session {
  config: MatchConfig
  seed: number
  level: Level
  restored: MatchState | null
}

function restoreSession(): Session | null {
  const saved = readSavedMatch()
  if (!saved) return null
  const { state, seed, level } = saved
  const config = { players: state.players, target: state.target, rules: state.rules }
  return { config, seed, level, restored: state }
}

function onOff(next: boolean): string {
  return next ? 'on' : 'off'
}

export default function App() {
  const install = useInstall()
  const [locale, setLocale] = useState<Locale>(() =>
    pickLocale(localStorage.getItem(preferredLocaleKey), navigator.languages),
  )
  const [mode, setMode] = useState<ColorMode>(() =>
    pickColorMode(localStorage.getItem(colorModeKey), prefersDark()),
  )
  const [session, setSession] = useState<Session | null>(restoreSession)
  const [level, setLevel] = useState<Level>(readLevel)
  const [players, setPlayers] = useState<PlayerCount>(readPlayers)
  const [target, setTarget] = useState<Target>(readTarget)
  const [rules, setRules] = useState<HouseRules>(readRules)
  const [colorSymbols, setColorSymbols] = useState(readColorSymbols)
  const [soundOn, setSoundOn] = useState(readSound)
  const [sound] = useState(createSound)
  const [musicOn, setMusicOn] = useState(readMusic)
  const [music] = useState(() => createMusic(trackForMatch(session?.restored ?? null)))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [otherGamesOn, setOtherGamesOn] = useState(readOtherGames)
  const [otherGamesOpen, setOtherGamesOpen] = useState(false)
  const showOtherGames = (next: boolean) => {
    localStorage.setItem(otherGamesKey, next ? 'on' : 'off')
    setOtherGamesOn(next)
  }
  const [rulesOpen, setRulesOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(readReduceMotion)
  const [plainFont, setPlainFont] = useState(readPlainFont)
  const [textSize, setTextSize] = useState<TextSize>(() =>
    pickTextSize(localStorage.getItem(textSizeKey)),
  )

  // eslint-disable-next-line local/no-effect -- syncs language, theme and accessibility classes on the document element
  useLayoutEffect(() => {
    const root = document.documentElement
    root.lang = locale
    root.classList.toggle('dark', mode === 'dark')
    root.classList.toggle('color-symbols', colorSymbols)
    root.classList.toggle('reduce-motion', reduceMotion)
    root.classList.toggle('plain-font', plainFont)
    root.style.colorScheme = mode
    root.style.fontSize = textSizeScale[textSize]
  }, [locale, mode, colorSymbols, reduceMotion, plainFont, textSize])

  // eslint-disable-next-line local/no-effect -- plays or pauses the Web Audio music with the setting and tab visibility
  useEffect(() => {
    if (!music || !musicOn) return
    const sync = () => {
      if (document.hidden) music.pause()
      else music.play()
    }
    window.addEventListener('pointerdown', sync, { once: true })
    document.addEventListener('visibilitychange', sync)
    if (navigator.userActivation?.hasBeenActive) sync()
    return () => {
      window.removeEventListener('pointerdown', sync)
      document.removeEventListener('visibilitychange', sync)
      music.pause()
    }
  }, [music, musicOn])

  return (
    <LocaleContext value={locale}>
      <MusicContext value={musicOn ? music : null}>
      <SoundContext value={soundOn ? sound : null}>
      <div
        className={`mx-auto flex max-w-lg flex-col gap-3 p-4 ${
          session ? 'h-dvh overflow-hidden' : 'relative min-h-dvh'
        }`}
      >
        <Header
          otherGames={{
            on: otherGamesOn,
            onOpen: () => setOtherGamesOpen(true),
            onToggle: session ? null : () => showOtherGames(!otherGamesOn),
          }}
          textSize={textSize}
          onInstall={install}
          settingsOpen={settingsOpen}
          onSettings={() => setSettingsOpen(true)}
        />
        {settingsOpen && (
          <Settings
            otherGames={otherGamesOn}
            onOtherGames={showOtherGames}
            mode={mode}
            onToggleMode={() => {
              const next = mode === 'dark' ? 'light' : 'dark'
              localStorage.setItem(colorModeKey, next)
              setMode(next)
            }}
            onLocale={(next) => {
              localStorage.setItem(preferredLocaleKey, next)
              setLocale(next)
            }}
            textSize={textSize}
            onTextSize={(next) => {
              localStorage.setItem(textSizeKey, next)
              setTextSize(next)
            }}
            reduceMotion={reduceMotion}
            onReduceMotion={(next) => {
              localStorage.setItem(reduceMotionKey, onOff(next))
              setReduceMotion(next)
            }}
            plainFont={plainFont}
            onPlainFont={(next) => {
              localStorage.setItem(plainFontKey, onOff(next))
              setPlainFont(next)
            }}
            colorSymbols={colorSymbols}
            onColorSymbols={(next) => {
              localStorage.setItem(colorSymbolsKey, onOff(next))
              setColorSymbols(next)
            }}
            musicOn={musicOn}
            onMusic={(next) => {
              localStorage.setItem(musicKey, onOff(next))
              setMusicOn(next)
            }}
            soundOn={soundOn}
            onSound={(next) => {
              localStorage.setItem(soundKey, onOff(next))
              setSoundOn(next)
            }}
            target={target}
            onTarget={(next) => {
              localStorage.setItem(targetKey, String(next))
              setTarget(next)
            }}
            rules={rules}
            onRulesChange={(next) => {
              localStorage.setItem(stackingKey, onOff(next.stacking))
              localStorage.setItem(drawToPlayKey, onOff(next.drawToPlay))
              setRules(next)
            }}
            onRules={() => {
              setSettingsOpen(false)
              setRulesOpen(true)
            }}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {rulesOpen && <Rules onClose={() => setRulesOpen(false)} />}
        {historyOpen && <History onClose={() => setHistoryOpen(false)} />}
        {otherGamesOpen && <OtherGamesDialog onClose={() => setOtherGamesOpen(false)} />}
        {session ? (
          <Table
            key={session.seed}
            config={session.config}
            seed={session.seed}
            level={session.level}
            restored={session.restored}
            onExit={() => {
              music?.setTrack(SETUP_TRACKS.home)
              setSession(null)
            }}
          />
        ) : (
          <>
            <Home
              level={level}
              onLevel={(next) => {
                localStorage.setItem(levelKey, next)
                setLevel(next)
              }}
              players={players}
              onPlayers={(next) => {
                localStorage.setItem(playersKey, String(next))
                setPlayers(next)
              }}
              target={target}
              rules={rules}
              onRules={() => setRulesOpen(true)}
              onHistory={() => setHistoryOpen(true)}
              onStart={() => {
                music?.setTrack(SETUP_TRACKS.round)
                setSession({
                  config: { players, target, rules },
                  seed: Date.now() | 0,
                  level,
                  restored: null,
                })
              }}
            />
            {otherGamesOn && <OtherGamesAside textSize={textSize} />}
            <Footer />
          </>
        )}
      </div>
      </SoundContext>
      </MusicContext>
    </LocaleContext>
  )
}
