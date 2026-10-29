import { Window } from '../../components/os/Window';
import { ESSENTIALS_VERIFIED_ON, HELP_PAGES, POLICIES } from '../../data/essentials';
import type { Win } from '../../state/os';

/**
 * IYS ESSENTIALS - navigation only. Each entry opens the official, current
 * In Your Shoe page (the source of truth); no policy text lives here.
 */
export default function Essentials({ win }: { win: Win }) {
  return (
    <Window
      win={win}
      icon="txt"
      statusbar={
        <div className="statusbar">
          <span className="grow">Official pages: inyourshoe.com</span>
          <span>Links checked {ESSENTIALS_VERIFIED_ON}</span>
        </div>
      }
    >
      <div className="win__scroll essentials">
        <section className="box">
          <h3 className="box__title">IYS ESSENTIALS</h3>
          <ul className="box__list">
            {POLICIES.map((e) => (
              <li key={e.id}>
                <a href={e.url} target="_blank" rel="noopener noreferrer" data-autofocus={e.id === 'exchange-refund' ? true : undefined}>
                  {e.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="box">
          <h3 className="box__title">HELP</h3>
          <ul className="box__list">
            {HELP_PAGES.map((e) => (
              <li key={e.id}>
                <a href={e.url} target="_blank" rel="noopener noreferrer">
                  {e.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
        <p className="box__text muted small">
          Navigation only: the official In Your Shoe pages are the source of truth and open in a new tab. Nothing is copied or rewritten here.
        </p>
      </div>
    </Window>
  );
}
