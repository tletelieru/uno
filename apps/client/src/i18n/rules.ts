import type { Locale } from './locales'

interface RuleSection {
  tab: string
  rules: string[]
}

interface RulesText {
  sections: RuleSection[]
}

export const rulesText: Record<Locale, RulesText> = {
  en: {
    sections: [
      {
        tab: "Basics",
        rules: [
          "108-card deck in red, yellow, green and blue, plus wild cards. 2 to 6 players.",
          "Each player gets 7 cards. Empty your hand first to win the round.",
        ],
      },
      {
        tab: "Turn",
        rules: [
          "Play a card that matches the top card by color, number or symbol, or a wild card.",
          "If you cannot or do not want to play, draw one card.",
          "Skip, Reverse and Draw Two change the turn. Wild picks the color. Wild Draw Four also makes the next player draw 4.",
          "Say \"UNO\" when you have one card left, or draw 2.",
        ],
      },
      {
        tab: "Points",
        rules: [
          "The winner scores the cards left in the other hands: numbers at face value, action cards 20, wild cards 50.",
          "First to 500 wins the match.",
        ],
      },
    ],
  },
  es: {
    sections: [
      {
        tab: "Base",
        rules: [
          "Mazo de 108 cartas en rojo, amarillo, verde y azul, más comodines. De 2 a 6 jugadores.",
          "A cada jugador le tocan 7 cartas. El primero que se queda sin cartas gana la ronda.",
        ],
      },
      {
        tab: "Turno",
        rules: [
          "Juegas una carta que coincida con la de arriba en color, número o símbolo, o un comodín.",
          "Si no puedes o no quieres jugar, sacas una carta.",
          "Salto, Reversa y +2 cambian el turno. El comodín elige color. El +4 además hace sacar 4 al siguiente.",
          "Di \"UNO\" cuando te quede una carta, o sacas 2.",
        ],
      },
      {
        tab: "Puntos",
        rules: [
          "El ganador suma las cartas que quedan en las otras manos: números por su valor, cartas de acción 20, comodines 50.",
          "El primero en llegar a 500 gana la partida.",
        ],
      },
    ],
  },
}
