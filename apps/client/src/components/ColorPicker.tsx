import { COLORS } from '@uno/engine'
import type { Color } from '@uno/engine'
import { useMessages } from '../i18n/messages'
import { TINT } from '../lib/cards'
import { ColorMark } from './CardGlyphs'
import { Overlay } from './Overlay'

interface Props {
  onPick: (color: Color) => void
  onClose?: () => void
}

export function ColorPicker({ onPick, onClose }: Props) {
  const t = useMessages()

  return (
    <Overlay title={t.chooseColor} translucent onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onPick(color)}
            className={`color-swatch pixel-box flex h-20 flex-col items-center justify-center gap-1 font-pixel text-2xl text-white ${TINT[color]}`}
          >
            <ColorMark color={color} className="uno-corner size-5" />
            <span className="uno-corner first-letter:uppercase">{t.colors[color]}</span>
          </button>
        ))}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="pixel-box bg-raised py-2 font-medium">
          {t.close}
        </button>
      )}
    </Overlay>
  )
}
