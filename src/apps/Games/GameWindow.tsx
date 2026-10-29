import { Suspense } from 'react';
import { Window } from '../../components/os/Window';
import { gameMeta, lazyGame, type GameId } from '../../games/registry';
import { useOS, type Win } from '../../state/os';

/** One IYS game in its own window. Minimizing pauses it; closing unmounts it (loop, keys, timers gone). */
export default function GameWindow({ win }: { win: Win }) {
  const meta = gameMeta(win.props.game);
  const Game = meta ? lazyGame(meta.id as GameId) : null;
  const exit = () => {
    const os = useOS.getState();
    os.close(win.id);
    os.open('games');
  };
  return (
    <Window win={win} icon="games">
      {Game ? (
        <Suspense
          fallback={
            <div className="app-loading is-busy" role="status">
              <p>Loading {win.title}...</p>
            </div>
          }
        >
          <Game active={!win.minimized} onExit={exit} compact={false} />
        </Suspense>
      ) : (
        <p className="app-loading">That game isn’t in IYS GAMES.</p>
      )}
    </Window>
  );
}
