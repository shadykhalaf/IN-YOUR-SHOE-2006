import { Icon } from '../../components/os/Icon';
import { brand } from '../../data/assets';
import { concept } from '../../data/copy';
import { BUDDIES } from '../../data/taxonomy';
import { formatCount } from '../../lib/catalogue/format';
import { useCatalogue } from '../../lib/catalogue/load';
import { openChat } from './nav';

export type MyStatus = 'online' | 'away' | 'busy';

/** Buddies = IYS collections that currently have products. */
export function useBuddies() {
  const cat = useCatalogue();
  return BUDDIES.filter((b) => !cat || (cat.collections.get(b.collection)?.count ?? 0) > 0);
}

/** The buddy-list view of the IYS MESSENGER window. */
export function BuddyList({ me, setMe }: { me: MyStatus; setMe: (s: MyStatus) => void }) {
  const cat = useCatalogue();
  const buddies = useBuddies();
  const online = buddies.filter((b) => b.status !== 'busy').length;
  return (
    <div className="win__scroll im">
      <div className="im__me">
        <span className="im__dp">
          <img src={brand.mark} alt="" />
        </span>
        <div>
          <label className="im__status">
            <span className="sr-only">Your status</span>
            <select className="select" value={me} onChange={(e) => setMe(e.target.value as MyStatus)}>
              <option value="online">you (Online)</option>
              <option value="away">you (Away)</option>
              <option value="busy">you (Busy)</option>
            </select>
          </label>
          <p className="im__pm">{concept.messenger.myMood}</p>
        </div>
      </div>
      <p className="im__group">
        ▾ IYS ({online}/{buddies.length})
      </p>
      <ul className="im__list" aria-label="Contacts">
        {buddies.map((b) => {
          const n = cat?.collections.get(b.collection)?.count;
          return (
            <li key={b.id}>
              <button type="button" className="im__buddy" data-buddy={b.id} onClick={() => openChat(b.id, b.name)} aria-label={`Chat with ${b.name}, ${b.status}${n ? `, ${n} items` : ''}`}>
                <span className={`orb orb--${b.status}`} aria-hidden="true" />
                <span className="im__name">
                  <b>{b.name}</b> <small>({b.status})</small>
                  <span className="im__mood">
                    {b.id === 'pjoys' ? '2:13 AM · ' : ''}
                    {b.mood}
                    {n ? ` · ${formatCount(n)} items` : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="im__foot">
        <Icon name="info" size={16} /> Contacts are IYS collections. Statuses are concept UI, not stock levels. No real people, no bots.
      </p>
    </div>
  );
}
