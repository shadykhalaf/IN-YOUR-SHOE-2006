import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameProps } from './shared/GameShell';
import type { ScoreId } from './shared/scores';

export type GameId = 'purbale' | 'tower' | 'chomp' | 'stacks' | 'snake' | 'invaders';

export interface GameMeta {
  id: GameId;
  title: string;
  blurb: string;
  /** Local bests shown on the folder tile (Purbale Catchy has one per mini game). */
  scores: { id: ScoreId; label: string }[];
  load: () => Promise<{ default: ComponentType<GameProps> }>;
}

/** The six IYS GAMES. Each game is its own lazily loaded chunk. */
export const GAMES: GameMeta[] = [
  { id: 'purbale', title: 'PURBALE CATCHY', blurb: 'Three little Catchy games: style the look, match the Pjoys, pack the drop.', scores: [{ id: 'purbale-closet', label: 'CLOSET' }, { id: 'purbale-pairs', label: 'PAIRS' }, { id: 'purbale-pack', label: 'PACK' }], load: () => import('./purbale/PurbaleCatchy') },
  { id: 'tower', title: 'IYS TOWER', blurb: 'Catchy bounces on its own. Steer up the wardrobe, the laundry and the Cairo sky.', scores: [{ id: 'tower', label: 'BEST' }], load: () => import('./tower/Tower') },
  { id: 'chomp', title: 'CATCHY CHOMP', blurb: 'Grab every sock in the closet maze. A Pjoy lets Catchy chase the laundry monsters.', scores: [{ id: 'chomp', label: 'BEST' }], load: () => import('./chomp/Chomp') },
  { id: 'stacks', title: 'IYS STACKS', blurb: 'Fold the falling pieces into full lines. Clear four at once for a big drop.', scores: [{ id: 'stacks', label: 'BEST' }], load: () => import('./stacks/Stacks') },
  { id: 'snake', title: 'CATCHY SNAKE', blurb: 'Catchy leads a sock trail. Eat socks, grab a Pjoy bonus, never bite yourself.', scores: [{ id: 'snake', label: 'BEST' }], load: () => import('./snake/Snake') },
  { id: 'invaders', title: 'CATCHY INVADERS', blurb: 'Catchy’s UFO vs. runaway socks, laundry blobs and a boss. 5 waves.', scores: [{ id: 'invaders', label: 'BEST' }], load: () => import('./invaders/Invaders') },
];

export const gameMeta = (id: unknown): GameMeta | undefined => GAMES.find((g) => g.id === id);

const cache = new Map<GameId, LazyExoticComponent<ComponentType<GameProps>>>();
export function lazyGame(id: GameId) {
  let c = cache.get(id);
  if (!c) {
    c = lazy(gameMeta(id)!.load);
    cache.set(id, c);
  }
  return c;
}
