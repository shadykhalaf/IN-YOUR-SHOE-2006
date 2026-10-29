import { lazy, Suspense } from 'react';
import { gameMeta, lazyGame, type GameId } from '../../games/registry';
import { useClaimCenter } from './chrome';

const GamesHub = lazy(() => import('../../games/GamesHub'));

function Loading() {
  // Hold the centre key while a game chunk loads, so an early tap can't leave the screen.
  useClaimCenter({ label: 'LOADING', disabled: true, run: () => {} });
  return (
    <p className="m-meta" role="status">
      Loading IYS GAMES...
    </p>
  );
}

/** Mobile IYS GAMES: the folder, or one game on its own screen (◀ BACK returns to the folder). */
export function MGames({ game, setGame, close }: { game: GameId | null; setGame: (g: GameId | null) => void; close: () => void }) {
  const meta = game ? gameMeta(game) : undefined;
  const Game = meta ? lazyGame(meta.id) : null;
  return Game ? (
    <div className="m-gamescreen">
      <Suspense fallback={<Loading />}>
        <Game active onExit={() => setGame(null)} compact />
      </Suspense>
    </div>
  ) : (
    <Hub setGame={setGame} close={close} />
  );
}

function Hub({ setGame, close }: { setGame: (g: GameId) => void; close: () => void }) {
  useClaimCenter({ label: 'HOME', run: close });
  return (
    <div className="m-page m-games">
      <Suspense fallback={<Loading />}>
        <GamesHub onPlay={setGame} compact />
      </Suspense>
    </div>
  );
}
