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

### 1. Motor
- Mazo de 108: por color un 0, dos de cada 1–9, dos Salto, dos Reversa y dos +2; 4 comodines y 4 +4.
- Reparto de 7, carta inicial, turnos con reversa y salto, mazo agotado que se revuelve con el pozo.
- "UNO" con penalidad de 2 cartas.
- Reglas de la casa configurables: acumular +2/+4, sacar hasta poder jugar.
- Puntaje: números por su valor, acción 20, comodines 50; partida a 500.

Listo cuando, con tests de propiedades:
- Ninguna carta se pierde ni se duplica (mano + mazo + pozo = 108).
- Toda ronda termina con un ganador y toda acción fuera de `legalActions` se rechaza.

### 2. Bots y simulador
- Fácil: primera carta legal, guarda comodines.
- Medio: elige color según su mano, castiga al que está por ganar.
- Difícil: cuenta cartas y estima colores de los rivales por lo que sacaron.

Listo cuando: `pnpm sim` muestra difícil > medio > fácil en N partidas.

### 3. Mesa
- Inicio: dificultad y cantidad de jugadores. Mesa, resultados, reglas, historial, guardar y retomar partida.
- Bots en Web Worker.

Listo cuando: se juega una partida completa en el celular.

### 4. Pulido
- Animaciones de reparto y movimiento de cartas, música chiptune, efectos, texto grande, letra normal, sin animaciones.

### 5. Publicación
- Pages desde `main`. En tletelieru pasa de `soon` a `live` en la sección Juegos.

## UI propia

- Cartas de color con animación de reversa y botón "UNO".
- Modo daltónico: un símbolo por color.

## Pendiente

- UNO es marca de Mattel. Antes de publicar, decidir si se mantiene el nombre o se cambia.
