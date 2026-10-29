import { Icon, type IconName } from '../os/Icon';

/**
 * The one loading look, borrowed from ADD TO BAG's "COPYING ITEM TO: MY BAG":
 * a little file hopping from one icon to another over the coral segmented
 * progress bar, with a bold "...ing" label. Two sizes:
 *   block   pages, windows, panels (where content will appear)
 *   inline  next to a control (search, checkout handoff, a chart loading)
 * It only ever shows while real work is pending: no minimum duration, no fake
 * delay. Announced politely; never takes focus. Reduced motion: no hopping,
 * the bar stays still.
 */
export function Busy({ label, from = 'internet', to = 'computer', inline = false }: { label: string; from?: IconName; to?: IconName; inline?: boolean }) {
  if (inline)
    return (
      <span className="busy busy--inline" role="status" aria-live="polite">
        <span className="busy__bar progress" aria-hidden="true">
          <span className="progress__bar progress__bar--indeterminate" />
        </span>
        <span className="busy__label">{label}</span>
      </span>
    );
  return (
    <div className="busy busy--block page-loading is-busy" role="status" aria-live="polite">
      <div className="busy__anim" aria-hidden="true">
        <Icon name={from} size={32} />
        <span className="fly-file busy__file">
          <Icon name="txt" size={24} />
        </span>
        <Icon name={to} size={32} />
      </div>
      <p className="busy__label">{label}</p>
      <div className="progress busy__bar" aria-hidden="true">
        <div className="progress__bar progress__bar--indeterminate" />
      </div>
    </div>
  );
}
