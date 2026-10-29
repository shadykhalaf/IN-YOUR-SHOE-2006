import { Icon } from '../../components/os/Icon';
import { Window } from '../../components/os/Window';
import { concept } from '../../data/copy';
import type { Win } from '../../state/os';

/** Easter egg (concept copy): the one folder that stays empty. */
export default function RecycleBin({ win }: { win: Win }) {
  return (
    <Window
      win={win}
      icon="recycle"
      menubar={['File', 'Edit', 'View', 'Help']}
      statusbar={
        <div className="statusbar">
          <span className="grow">1 object</span>
        </div>
      }
    >
      <div className="explorer__main win__scroll recycle">
        <ul className="folders">
          <li>
            <span className="folders__item">
              <Icon name="folder" size={48} />
              <span>{concept.recycle.folder}</span>
              <small>0 items</small>
            </span>
          </li>
        </ul>
        <p className="explorer__note">{concept.recycle.empty}</p>
        <p className="catchy">{concept.catchy.recycle}</p>
      </div>
    </Window>
  );
}
