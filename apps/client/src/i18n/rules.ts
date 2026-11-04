import type { Card, Color } from '@uno/engine'
import type { Locale } from './locales'

type ColorFace = Extract<Card, { kind: 'color' }>['face']

export type RuleExample =
  | { kind: 'deck' }
  | { kind: 'hand'; count: number }
  | { kind: 'match'; top: Card; plays: Card[]; wrong: Card }
  | { kind: 'draw'; top: Card }
  | { kind: 'uno' }
  | { kind: 'skip' }
  | { kind: 'reverse' }
  | { kind: 'penalty'; card: Card; count: number }
  | { kind: 'wild'; card: Card }
  | { kind: 'points' }
  | { kind: 'cards'; cards: Card[] }

export interface Rule {
  text: string
  example?: RuleExample
}

interface RuleSection {
  tab: string
  rules: Rule[]
}

const tint = (color: Color, face: ColorFace): Card => ({ kind: 'color', color, face, copy: 0 }) as Card

const wild = (face: 'wild' | 'draw4'): Card => ({ kind: 'wild', face, copy: 0 })

const EXAMPLES: (RuleExample | undefined)[][] = [
  [{ kind: 'deck' }, { kind: 'hand', count: 7 }, { kind: 'cards', cards: [wild('draw4')] }, undefined],
  [
    { kind: 'match', top: tint('red', 7), plays: [tint('red', 2), tint('blue', 7), wild('wild')], wrong: tint('green', 4) },
    { kind: 'draw', top: tint('yellow', 3) },
    { kind: 'uno' },
  ],
  [
    { kind: 'skip' },
    { kind: 'reverse' },
    { kind: 'penalty', card: tint('green', 'draw2'), count: 2 },
    { kind: 'wild', card: wild('draw4') },
    { kind: 'cards', cards: [tint('blue', 'skip'), tint('yellow', 'reverse'), wild('wild')] },
  ],
  [{ kind: 'points' }, undefined, { kind: 'cards', cards: [tint('red', 'draw2'), tint('blue', 'draw2'), wild('draw4')] }, undefined],
]

function illustrate(sections: { tab: string; rules: string[] }[]): RulesText {
  return {
    sections: sections.map((section, index) => ({
      tab: section.tab,
      rules: section.rules.map((text, rule) => ({ text, example: EXAMPLES[index][rule] })),
    })),
  }
}

interface RulesText {
  sections: RuleSection[]
}

export const rulesText: Record<Locale, RulesText> = {
  en: illustrate(
    [
      {
        tab: 'Basics',
        rules: [
          '108-card deck in red, yellow, green and blue, plus wild cards. 2 to 6 players.',
          'Each player gets 7 cards. Empty your hand first to win the round.',
          'The top card of the deck starts the discard pile. A Wild +4 goes back and the deck is shuffled.',
          'When the deck runs out, the discard pile is shuffled into a new deck.',
        ],
      },
      {
        tab: 'Turn',
        rules: [
          'Play a card that matches the top card by color, number or symbol, or a wild card.',
          'There is no passing. If you cannot or do not want to play, draw a card and keep going until you play one.',
          'Press UNO when you play your second-to-last card. To catch a rival who forgot, tap their seat and press UNO: they take 1.',
        ],
      },
      {
        tab: 'Cards',
        rules: [
          'Skip: the next player loses their turn.',
          'Reverse: play changes direction. With 2 players it works like a Skip.',
          '+2: the next player takes 2 and then plays.',
          'Wild: you choose the color. Wild +4: you choose the color and the next player takes 4 and then plays.',
          'If the starting card is an action, it applies to the first player. If it is a Wild, the first player chooses the color.',
        ],
      },
      {
        tab: 'Points',
        rules: [
          'The winner scores the cards left in the other hands: numbers at face value, action cards 20, wild cards 50.',
          'First to 500 wins the match. Settings can make it 200.',
          'Optional house rules in Settings: stack +2 and +4, and draw until you can play.',
          'If nobody can play or draw, the round ends and the hand with the fewest points wins.',
        ],
      },
    ],
  ),
  es: illustrate(
    [
      {
        tab: 'Base',
        rules: [
          'Mazo de 108 cartas en rojo, amarillo, verde y azul, más comodines. De 2 a 6 jugadores.',
          'A cada jugador le tocan 7 cartas. El primero que se queda sin cartas gana la ronda.',
          'La primera carta del mazo abre el pozo. Si es un Comodín +4, vuelve al mazo y se revuelve.',
          'Cuando se acaba el mazo, el pozo se revuelve y pasa a ser el mazo nuevo.',
        ],
      },
      {
        tab: 'Turno',
        rules: [
          'Juegas una carta que coincida con la de arriba en color, número o símbolo, o un comodín.',
          'No se pasa. Si no puedes o no quieres jugar, sacas una carta y sigues hasta jugar una.',
          'Aprieta UNO cuando juegues tu penúltima carta. Para pillar a un rival que lo olvidó, toca su asiento y aprieta UNO: saca 1.',
        ],
      },
      {
        tab: 'Cartas',
        rules: [
          'Salto: el siguiente pierde el turno.',
          'Reversa: el turno cambia de sentido. Con 2 jugadores funciona como un Salto.',
          '+2: el siguiente saca 2 y luego juega.',
          'Comodín: eliges el color. Comodín +4: eliges el color y el siguiente saca 4 y luego juega.',
          'Si la carta inicial es de acción, afecta al primer jugador. Si es un comodín, el primer jugador elige el color.',
        ],
      },
      {
        tab: 'Puntos',
        rules: [
          'El ganador suma las cartas que quedan en las otras manos: números por su valor, cartas de acción 20, comodines 50.',
          'El primero en llegar a 500 gana la partida. En Ajustes se puede jugar a 200.',
          'Reglas de la casa opcionales en Ajustes: acumular +2 y +4, y sacar hasta poder jugar.',
          'Si nadie puede jugar ni sacar, la ronda termina y gana la mano con menos puntos.',
        ],
      },
    ],
  ),
}
