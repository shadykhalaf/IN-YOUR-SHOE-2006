import { Window } from '../../components/os/Window';
import GamesHub from '../../games/GamesHub';
import type { Win } from '../../state/os';
import { openGame } from './open';

/** IYS GAMES — the folder window. */
export default function GamesFolder({ win }: { win: Win }) {
  return (
    <Window
      win={win}
      icon="games"
      menubar={['File', 'View', 'Help']}
      statusbar={
        <div className="statusbar">
          <span className="grow">6 objects</span>
          <span>MY HIGH SCORES: this device only</span>
        </div>
      }
    >
      <GamesHub onPlay={openGame} />
    </Window>
  );
}
