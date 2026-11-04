# Plan de desarrollo — UNO

UNO contra bots, de 2 a 6 jugadores.

## Stack

Igual que 7 de Trébol: **web en TypeScript**, PWA instalable, sin backend.

| Área | Elección |
| --- | --- |
| Monorepo | pnpm workspaces |
| Lenguaje | TypeScript estricto |
| Mesa, menús, puntaje | React 19 + Tailwind 4 |
| Build | Vite + vite-plugin-pwa |
| Tests | Vitest + fast-check |
| Bots | Web Worker, mismo contrato que 7 de Trébol |
| Online | Node + WebSockets, servidor autoritativo (fase futura) |

## Estructura

```
apps/
  client/        PWA: mesa, menús, audio
  sim/           CLI de self-play bot contra bot
packages/
  engine/        estado, acciones legales, puntaje. Puro, sin dependencias de UI
  bots/          fácil, medio, difícil
```

## Contrato del motor

```ts
createMatch(config: MatchConfig, seed: number): MatchState
legalActions(state: MatchState, seat: Seat): Action[]
applyAction(state: MatchState, action: Action): MatchState
viewFor(state: MatchState, seat: Seat): PlayerView
score(state: MatchState): Score
```

```ts
interface Bot {
  choose(view: PlayerView, legal: Action[], rng: Rng): Action
}
```

- Estado inmutable y serializable: sirve para guardar partida y para el servidor.
- RNG con semilla: toda partida se puede reproducir.
- Los bots reciben `PlayerView`, nunca `MatchState`. Así no pueden hacer trampa.

## Paleta

Violeta: la mesa queda neutra para que rojo, amarillo, verde y azul resalten. Esos cuatro son colores de carta, no del tema, y tienen modo daltónico con un símbolo por color.

| Var | Claro | Oscuro |
| --- | --- | --- |
| `--bg` | `#e8e3f1` | `#17122a` |
| `--surface` | `#f6f3fb` | `#221b3b` |
| `--raised` | `#d8d0e8` | `#312850` |
| `--ink` | `#1f1a2e` | `#efecf7` |
| `--muted` | `#5c5570` | `#aea6c6` |
| `--accent` | `#5b3cc4` | `#9b82f5` |
| `--on-accent` | `#ffffff` | `#120d24` |
| `--gold` | `#8f5b0c` | `#f0b541` |

## Fases

### 0. Base del repo
- Workspace pnpm, TS, ESLint, Vitest y CI (lint, typecheck, test, build) sobre PRs y pushes a `dev` y `main`. Pages se publica desde `main`.
- Cliente con el baseline ox: EN/ES, claro/oscuro, ícono, footer, ajustes de accesibilidad y la paleta de arriba.
- Mazo definido en `packages/engine/src/cards.ts` con test de cantidad y unicidad.
- En `ox-proxy/projects.json`: `"uno": { "port": 5186, "base": "/uno" }`.

Listo cuando: el link de `ox-test` abre el cliente y CI pasa.

### 1. Motor — listo
- Mazo de 108: por color un 0, dos de cada 1–9, dos Salto, dos Reversa y dos +2; 4 comodines y 4 +4.
- Reparto de 7, carta inicial, turnos con reversa y salto, mazo agotado que se revuelve con el pozo.
- "UNO" con penalidad de 2 cartas.
- Reglas de la casa configurables: acumular +2/+4, sacar hasta poder jugar.
- Puntaje: números por su valor, acción 20, comodines 50; partida a 500.

Listo cuando, con tests de propiedades:
- Ninguna carta se pierde ni se duplica (mano + mazo + pozo = 108).
- Toda ronda termina con un ganador y toda acción fuera de `legalActions` se rechaza.

### 2. Bots y simulador — listo
- Fácil: primera carta legal, guarda comodines.
- Medio: elige color según su mano, castiga al que está por ganar.
- Difícil: cuenta cartas y estima colores de los rivales por lo que sacaron.

Listo cuando: `pnpm sim` muestra difícil ≥ medio ≥ fácil en N partidas. Resultado: medio y difícil le ganan claro a fácil; difícil queda empatado con medio entre bots (ver Decisiones).

### 3. Mesa — listo
- Inicio: dificultad y cantidad de jugadores. Mesa, resultados, reglas, historial, guardar y retomar partida.
- Bots en Web Worker.

Listo cuando: se juega una partida completa en el celular.

### 4. Pulido
- Animaciones de reparto y movimiento de cartas, música chiptune, efectos, texto grande, letra normal, sin animaciones.

### 5. Publicación
- Pages desde `main`. En tletelieru pasa de `soon` a `live` en la sección Juegos.

## Decisiones (fases 1–3)

- **Acciones del motor:** `play` (con `color` si es comodín), `draw`, `pass`, `uno`, `catch` y `choose` (color inicial cuando la primera carta es un comodín).
- **UNO:** se aprieta antes de jugar la penúltima carta. Si no, se abre una ventana: cualquier rival puede pillarte (`catch`, +2) hasta que el siguiente jugador haga su jugada, y tú puedes cantarlo tarde mientras nadie te pille. Los bots cantan siempre salvo el fácil, que olvida un 30% de las veces.
- **Carta sacada:** si sirve, se puede jugar o guardar (`pass`). Si no sirve, el turno pasa solo.
- **Carta inicial:** +4 vuelve al mazo y se revuelve. Salto salta al primero, Reversa hace partir al repartidor en sentido contrario, +2 hace sacar 2 al primero, comodín deja elegir color al primero.
- **Última carta +2/+4:** el siguiente igual saca y esas cartas cuentan para el puntaje.
- **Acumular (regla de la casa):** sobre un +2 se puede tirar +2 o +4; sobre un +4, solo +4. El que no acumula saca el total.
- **Ronda trabada:** si todos pasan sin poder jugar ni sacar (no queda mazo ni pozo para revolver), gana la mano con menos puntos y cobra como siempre. Es muy raro.
- **Repartidor:** al azar con la semilla al crear la partida; rota uno por ronda. Parte el que sigue al repartidor. Al empezar una partida nueva hay un sorteo animado que cae en ese asiento.
- **Pistas:** solo en fácil se resaltan las cartas jugables y se avisa cuándo apretar UNO. En medio y difícil se puede tocar cualquier carta; si no sirve, aparece "No combina con la carta de arriba".
- **Bots:** fácil juega la primera carta legal y guarda comodines, color al azar. Medio elige color según su mano, ataca al siguiente si le quedan 2 cartas o menos y bota cartas altas. Difícil suma conteo de cartas: recuerda qué colores le faltan a cada rival (sacó cuando estaba ese color) y qué color eligieron con comodín, y pilla siempre un UNO olvidado. Se probó Monte Carlo con rollouts (como en 7 de Trébol) y jugaba peor que medio; el UNO depende mucho de la suerte y entre bots que siempre cantan UNO la ventaja de difícil es nula. Contra una persona, difícil pilla todos los UNO olvidados.
- **Música:** tres temas propios (inicio, ronda, y uno más rápido cuando alguien queda con una carta), mismo motor chiptune que 7 de Trébol. Efectos cortos por acción y para el sorteo.

## UI propia

- Cartas de color con animación de reversa y botón "UNO".
- Modo daltónico: un símbolo por color.

## Pendiente

- UNO es marca registrada de Mattel. Antes de publicar, decidir si se mantiene el nombre "UNO" o se cambia.
- Fase 4: animación de cartas que vuelan al sacar, texto grande revisado en la mesa con 6 jugadores.
