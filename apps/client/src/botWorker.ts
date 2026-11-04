import { BOTS, createRng } from '@uno/bots'
import type { Level } from '@uno/bots'
import type { Action, PlayerView } from '@uno/engine'

export interface BotRequest {
  id: number
  level: Level
  view: PlayerView
  legal: Action[]
  seed: number
}

export interface BotReply {
  id: number
  action: Action
}

self.onmessage = (event: MessageEvent<BotRequest>) => {
  const { id, level, view, legal, seed } = event.data
  const action = BOTS[level].choose(view, legal, createRng(seed))
  self.postMessage({ id, action } satisfies BotReply)
}
