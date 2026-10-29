import { gameMeta, type GameId } from '../../games/registry';
import { useOS } from '../../state/os';

/** One window per game (re-opening focuses it). */
export function openGame(id: GameId) {
  const meta = gameMeta(id);
  if (!meta) return;
  useOS.getState().open('game', { id: `game-${id}`, title: meta.title, props: { game: id } });
}
