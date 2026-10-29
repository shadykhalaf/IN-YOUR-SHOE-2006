import { concept } from '../../data/copy';
import { switchToRealIYS } from '../../lib/checkout';
import { play } from '../../lib/sound';

/**
 * IYS 2006 ●──○ REAL IYS ↗. One plain button (not role="switch": there is no
 * second local state to toggle back to): the lit side is the site u r on, the
 * other side is the real store, which receives ur bag (see switchToRealIYS).
 */
export function RealSwitch() {
  return (
    <button
      type="button"
      className="realswitch"
      onClick={() => {
        play('click');
        switchToRealIYS();
      }}
    >
      <span className="realswitch__side realswitch__side--on">
        {concept.checkout.here}
        <span className="sr-only"> (you are here):</span>
      </span>
      <span className="realswitch__track" aria-hidden="true">
        <span className="realswitch__thumb" />
      </span>
      <span className="realswitch__side">
        {concept.checkout.real}
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> - {concept.checkout.realHint}</span>
      </span>
    </button>
  );
}
