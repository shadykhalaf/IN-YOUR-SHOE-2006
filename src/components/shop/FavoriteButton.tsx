import { play } from '../../lib/sound';
import { useFavorites } from '../../state/favorites';
import { useBrowserStatus } from '../../state/status';

export function FavoriteButton({ handle, title, compact }: { handle: string; title: string; compact?: boolean }) {
  const on = useFavorites((s) => s.handles.includes(handle));
  const toggle = useFavorites((s) => s.toggle);
  return (
    <button
      type="button"
      className={`btn ${compact ? 'btn--small fav-btn--compact' : ''} fav-btn${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from Favorites` : `Add ${title} to Favorites`}
      title={on ? 'Remove from Favorites' : 'Add to Favorites'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(handle);
        play('click');
        useBrowserStatus.getState().set(added ? 'Added to Favorites.' : 'Removed from Favorites.');
      }}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span>
      {!compact && <span>{on ? 'IN FAVORITES' : 'ADD TO FAVORITES'}</span>}
    </button>
  );
}
