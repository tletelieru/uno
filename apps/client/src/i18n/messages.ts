import { createContext, useContext } from 'react'
import type { Level } from '@uno/bots'
import type { Card, Color } from '@uno/engine'
import type { TextSize } from '../lib/textSize'
import { defaultLocale } from './locales'
import type { Locale } from './locales'

type Outcome = 'won' | 'tied' | 'lost' | 'abandoned'

type ActionFace = Exclude<Card['face'], number>

export interface Messages {
  appName: string
  tagline: string
  players: string
  history: string
  historyEmpty: string
  historySummary: (played: number, won: number) => string
  playerCount: (n: number) => string
  outcomes: Record<Outcome, string>
  rules: string
  difficulty: string
  levels: Record<Level, string>
  levelHints: Record<Level, string>
  playWith: (players: number) => string
  matchSetup: string
  setupSummary: (target: number) => string
  stackingOn: string
  drawToPlayOn: string
  noHouseRules: string
  you: string
  bot: (n: number) => string
  yourHand: string
  yourTurn: string
  pendingTurn: (n: number) => string
  chooseTurn: string
  waiting: (name: string) => string
  sortByColor: string
  sortByNumber: string
  noMoves: string
  noMatch: string
  callUno: string
  catchUno: (name: string) => string
  unoTag: string
  colors: Record<Color, string>
  faces: Record<ActionFace, string>
  cardName: (card: Card) => string
  chooseColor: string
  currentColor: (color: string) => string
  clockwise: string
  counterClockwise: string
  pending: (n: number) => string
  deckLeft: (n: number) => string
  drawPile: string
  discardPile: string
  cardsLeft: (n: number) => string
  dealer: string
  dealerIs: (name: string) => string
  movePlayed: (name: string, card: string) => string
  moveDrew: (name: string, n: number) => string
  movePenalty: (name: string, n: number) => string
  movePassed: (name: string) => string
  moveUno: (name: string) => string
  moveCaught: (name: string, target: string) => string
  moveChose: (name: string, color: string) => string
  settings: string
  textSize: string
  textSizes: Record<TextSize, string>
  plainFont: string
  plainFontHint: string
  reduceMotion: string
  reduceMotionHint: string
  musicOff: string
  musicOnLabel: string
  sound: string
  soundHint: string
  colorSymbols: string
  colorSymbolsHint: string
  matchRules: string
  matchRulesHint: string
  target: string
  targetPoints: (n: number) => string
  stacking: string
  stackingHint: string
  drawToPlay: string
  drawToPlayHint: string
  exit: string
  exitTitle: string
  exitBody: string
  exitConfirm: string
  keepPlaying: string
  close: string
  scoreTitle: string
  round: string
  roundLabel: (n: number, target: number) => string
  goal: (n: number) => string
  roundFinished: string
  roundFinishedN: (n: number) => string
  handBreakdown: (numbers: number, actions: number, wilds: number) => string
  wentOut: (points: number) => string
  roundWinner: (name: string, points: number) => string
  blockedRound: string
  nextRound: string
  matchFinished: string
  backHome: string
  winner: (name: string, points: number) => string
  tie: (names: string) => string
  toLight: string
  toDark: string
  language: string
  install: string
  developedBy: string
  otherGames: string
  showOtherGames: string
  hideOtherGames: string
  showOtherGamesHint: string
}

const enFaces: Record<ActionFace, string> = {
  skip: 'Skip',
  reverse: 'Reverse',
  draw2: '+2',
  wild: 'Wild',
  draw4: 'Wild +4',
}

const esFaces: Record<ActionFace, string> = {
  skip: 'Salto',
  reverse: 'Reversa',
  draw2: '+2',
  wild: 'Comodín',
  draw4: 'Comodín +4',
}

const enColors: Record<Color, string> = { red: 'red', yellow: 'yellow', green: 'green', blue: 'blue' }

const esColors: Record<Color, string> = { red: 'rojo', yellow: 'amarillo', green: 'verde', blue: 'azul' }

function nameCard(card: Card, faces: Record<ActionFace, string>, colors: Record<Color, string>): string {
  if (card.kind === 'wild') return faces[card.face]
  const face = typeof card.face === 'number' ? String(card.face) : faces[card.face]
  return `${face} ${colors[card.color]}`
}

export const messages: Record<Locale, Messages> = {
  en: {
    appName: 'UNO',
    tagline: 'Match colors and numbers and empty your hand first, against bots.',
    players: 'Players',
    history: 'History',
    historyEmpty: 'Finished matches will appear here.',
    historySummary: (played, won) => `${played} played · ${won} won`,
    playerCount: (n) => `${n} players`,
    outcomes: { won: 'You won', tied: 'Tie', lost: 'You lost', abandoned: 'Abandoned' },
    rules: 'Rules',
    difficulty: 'Difficulty',
    levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    levelHints: {
      easy: 'bots that sometimes forget UNO',
      medium: 'bots that pick colors and attack',
      hard: 'bots that count cards',
    },
    playWith: (players) => `Play · ${players} players`,
    matchSetup: 'Match',
    setupSummary: (target) => `Play to ${target} points`,
    stackingOn: 'Stacking +2/+4',
    drawToPlayOn: 'Draw until you can play',
    noHouseRules: 'Official rules',
    you: 'You',
    bot: (n) => `Bot ${n}`,
    yourHand: 'Your hand',
    yourTurn: 'Your turn. Tap a card twice to play it, or tap the deck twice to draw.',
    pendingTurn: (n) => `Tap the deck twice to take ${n}, then play.`,
    chooseTurn: 'Choose the starting color.',
    waiting: (name) => `${name} is playing…`,
    sortByColor: 'By color',
    sortByNumber: 'By number',
    noMoves: 'No moves and no cards to draw.',
    noMatch: 'Doesn’t match the top card.',
    callUno: 'UNO!',
    catchUno: (name) => `Catch ${name}`,
    unoTag: 'UNO',
    colors: enColors,
    faces: enFaces,
    cardName: (card) => nameCard(card, enFaces, enColors),
    chooseColor: 'Choose a color',
    currentColor: (color) => `Color: ${color}`,
    clockwise: 'Play goes left to right',
    counterClockwise: 'Play goes right to left',
    pending: (n) => `+${n} pending`,
    deckLeft: (n) => `${n} left`,
    drawPile: 'Draw pile',
    discardPile: 'Discard pile',
    cardsLeft: (n) => `${n} ${n === 1 ? 'card' : 'cards'}`,
    dealer: 'Dealer',
    dealerIs: (name) => `Dealer: ${name}`,
    movePlayed: (name, card) => `${name}: ${card}`,
    moveDrew: (name, n) => `${name} drew ${n}`,
    movePenalty: (name, n) => `${name} takes ${n}`,
    movePassed: (name) => `${name} passed`,
    moveUno: (name) => `${name}: UNO!`,
    moveCaught: (name, target) => `${name} caught ${target}: +1`,
    moveChose: (name, color) => `${name} chose ${color}`,
    settings: 'Settings',
    textSize: 'Text size',
    textSizes: { normal: 'Normal', large: 'Large', xlarge: 'Extra large' },
    plainFont: 'Plain font',
    plainFontHint: 'Uses a regular font instead of the pixel one.',
    reduceMotion: 'Turn off animations',
    reduceMotionHint: 'Cards appear without flying, spinning or bouncing.',
    musicOff: 'Turn music off',
    musicOnLabel: 'Turn music on',
    sound: 'Sound effects',
    soundHint: 'Short beeps for cards, UNO and the dealer draw.',
    colorSymbols: 'Color symbols',
    colorSymbolsHint: 'Adds a shape to each color: red triangle, yellow circle, green square, blue diamond.',
    matchRules: 'Match rules',
    matchRulesHint: 'Changes apply to the next match.',
    target: 'Play to',
    targetPoints: (n) => `${n} points`,
    stacking: 'Stack +2 and +4',
    stackingHint: 'Answer a +2 with a +2 or +4, and a +4 with a +4 or a +2 of the chosen color. The next one takes the total.',
    drawToPlay: 'Draw until you can play',
    drawToPlayHint: 'Keep drawing until you get a card you can play.',
    exit: 'Exit',
    exitTitle: 'Leave this match?',
    exitBody: 'You will lose the match in progress.',
    exitConfirm: 'Yes, exit',
    keepPlaying: 'Keep playing',
    close: 'Close',
    scoreTitle: 'Score',
    round: 'Round',
    roundLabel: (n, target) => `Round ${n} · to ${target}`,
    goal: (n) => `First to ${n} points wins the match.`,
    roundFinished: 'Round finished',
    roundFinishedN: (n) => `Round ${n} finished`,
    handBreakdown: (numbers, actions, wilds) =>
      `Numbers ${numbers} · actions ${actions} · wilds ${wilds} = ${numbers + actions + wilds}`,
    wentOut: (points) => `Out of cards, takes the ${points} points left in the other hands`,
    roundWinner: (name, points) => `${name} won the round: +${points}`,
    blockedRound: 'Nobody could play or draw, so the lightest hand wins.',
    nextRound: 'Next round',
    matchFinished: 'Match finished',
    backHome: 'Back to start',
    winner: (name, points) => `${name} won with ${points} points`,
    tie: (names) => `Tie: ${names}`,
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    language: 'Language',
    install: 'Install app',
    developedBy: 'Developed by',
    otherGames: 'Other games',
    showOtherGames: 'Show other games',
    hideOtherGames: 'Hide other games',
    showOtherGamesHint: 'Links to the other card games: a side column on wide screens, a header button on narrow ones.',
  },
  es: {
    appName: 'UNO',
    tagline: 'Junta colores y números y quédate sin cartas primero, contra bots.',
    players: 'Jugadores',
    history: 'Historial',
    historyEmpty: 'Aquí aparecerán las partidas terminadas.',
    historySummary: (played, won) => `${played} jugadas · ${won} ganadas`,
    playerCount: (n) => `${n} jugadores`,
    outcomes: { won: 'Ganaste', tied: 'Empate', lost: 'Perdiste', abandoned: 'Abandonada' },
    rules: 'Reglas',
    difficulty: 'Dificultad',
    levels: { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' },
    levelHints: {
      easy: 'bots que a veces olvidan el UNO',
      medium: 'bots que eligen color y atacan',
      hard: 'bots que cuentan cartas',
    },
    playWith: (players) => `Jugar · ${players} jugadores`,
    matchSetup: 'Partida',
    setupSummary: (target) => `Se juega a ${target} puntos`,
    stackingOn: 'Acumular +2/+4',
    drawToPlayOn: 'Sacar hasta poder jugar',
    noHouseRules: 'Reglas oficiales',
    you: 'Tú',
    bot: (n) => `Bot ${n}`,
    yourHand: 'Tu mano',
    yourTurn: 'Tu turno. Toca una carta dos veces para jugarla, o el mazo dos veces para sacar.',
    pendingTurn: (n) => `Toca el mazo dos veces para sacar ${n} y luego juega.`,
    chooseTurn: 'Elige el color inicial.',
    waiting: (name) => `Juega ${name}…`,
    sortByColor: 'Por color',
    sortByNumber: 'Por número',
    noMoves: 'No tienes jugada ni cartas para sacar.',
    noMatch: 'No combina con la carta de arriba.',
    callUno: '¡UNO!',
    catchUno: (name) => `Pillar a ${name}`,
    unoTag: 'UNO',
    colors: esColors,
    faces: esFaces,
    cardName: (card) => nameCard(card, esFaces, esColors),
    chooseColor: 'Elige un color',
    currentColor: (color) => `Color: ${color}`,
    clockwise: 'El turno va de izquierda a derecha',
    counterClockwise: 'El turno va de derecha a izquierda',
    pending: (n) => `+${n} acumulado`,
    deckLeft: (n) => `quedan ${n}`,
    drawPile: 'Mazo',
    discardPile: 'Pozo',
    cardsLeft: (n) => `${n} ${n === 1 ? 'carta' : 'cartas'}`,
    dealer: 'Repartidor',
    dealerIs: (name) => `Da: ${name}`,
    movePlayed: (name, card) => `${name}: ${card}`,
    moveDrew: (name, n) => `${name} sacó ${n}`,
    movePenalty: (name, n) => `${name} saca ${n}`,
    movePassed: (name) => `${name} pasa`,
    moveUno: (name) => `${name}: ¡UNO!`,
    moveCaught: (name, target) => `${name} pilló a ${target}: +1`,
    moveChose: (name, color) => `${name} eligió ${color}`,
    settings: 'Ajustes',
    textSize: 'Tamaño del texto',
    textSizes: { normal: 'Normal', large: 'Grande', xlarge: 'Muy grande' },
    plainFont: 'Letra normal',
    plainFontHint: 'Usa una letra común en vez de la pixelada.',
    reduceMotion: 'Desactivar animaciones',
    reduceMotionHint: 'Las cartas aparecen sin volar, girar ni rebotar.',
    musicOff: 'Apagar música',
    musicOnLabel: 'Encender música',
    sound: 'Efectos de sonido',
    soundHint: 'Pitidos cortos para las cartas, el UNO y el sorteo de quién da.',
    colorSymbols: 'Símbolos de color',
    colorSymbolsHint: 'Agrega una forma a cada color: rojo triángulo, amarillo círculo, verde cuadrado, azul rombo.',
    matchRules: 'Reglas de la partida',
    matchRulesHint: 'Los cambios valen desde la próxima partida.',
    target: 'Se juega a',
    targetPoints: (n) => `${n} puntos`,
    stacking: 'Acumular +2 y +4',
    stackingHint: 'Responde un +2 con un +2 o +4, y un +4 con un +4 o un +2 del color elegido. El siguiente saca el total.',
    drawToPlay: 'Sacar hasta poder jugar',
    drawToPlayHint: 'Sigues sacando hasta que te toca una carta que puedes jugar.',
    exit: 'Salir',
    exitTitle: '¿Seguro que quieres salir?',
    exitBody: 'Se perderá la partida en curso.',
    exitConfirm: 'Sí, salir',
    keepPlaying: 'Seguir jugando',
    close: 'Cerrar',
    scoreTitle: 'Puntaje',
    round: 'Ronda',
    roundLabel: (n, target) => `Ronda ${n} · a ${target}`,
    goal: (n) => `El primero en llegar a ${n} puntos gana la partida.`,
    roundFinished: 'Fin de la ronda',
    roundFinishedN: (n) => `Fin de la ronda ${n}`,
    handBreakdown: (numbers, actions, wilds) =>
      `Números ${numbers} · acción ${actions} · comodines ${wilds} = ${numbers + actions + wilds}`,
    wentOut: (points) => `Se quedó sin cartas y se lleva los ${points} puntos de las otras manos`,
    roundWinner: (name, points) => `${name} ganó la ronda: +${points}`,
    blockedRound: 'Nadie podía jugar ni sacar, así que gana la mano más liviana.',
    nextRound: 'Siguiente ronda',
    matchFinished: 'Fin de la partida',
    backHome: 'Volver al inicio',
    winner: (name, points) => `Ganador: ${name} con ${points} puntos`,
    tie: (names) => `Empate: ${names}`,
    toLight: 'Cambiar a modo claro',
    toDark: 'Cambiar a modo oscuro',
    language: 'Idioma',
    install: 'Instalar app',
    developedBy: 'Desarrollado por',
    otherGames: 'Otros juegos',
    showOtherGames: 'Mostrar otros juegos',
    hideOtherGames: 'Ocultar otros juegos',
    showOtherGamesHint: 'Enlaces a los otros juegos de naipes: una columna lateral en pantallas anchas y un botón en la cabecera en las angostas.',
  },
}

export const LocaleContext = createContext<Locale>(defaultLocale)

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useMessages(): Messages {
  return messages[useLocale()]
}
