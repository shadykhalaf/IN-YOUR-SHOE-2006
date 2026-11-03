import { useFit } from '../../lib/fit';

const ADVICE = ['size up one', 'take ur usual size :)', 'size down one'];
const MARKS = ['small', 'true', 'large'];

/**
 * FIT CHECK: the real store's true-to-size value for this product, as a
 * three-step meter. Products without one (or before it loads) show nothing.
 */
export function FitCheck({ handle }: { handle: string }) {
  const fit = useFit(handle);
  if (!fit) return null;
  return (
    <fieldset className="fitcheck" aria-label={`Fit: ${fit.label}`}>
      <legend>
        Fit check <span className="fitcheck__value">{fit.label}</span>
      </legend>
      <div className="fitcheck__meter" aria-hidden="true">
        {MARKS.map((m, i) => (
          <span key={m} className={`fitcheck__cell${i === fit.pos ? ' is-on' : ''}`} />
        ))}
      </div>
      <div className="fitcheck__marks" aria-hidden="true">
        {MARKS.map((m, i) => (
          <span key={m} className={i === fit.pos ? 'is-on' : undefined}>{m}</span>
        ))}
      </div>
      <p className="fitcheck__advice">{ADVICE[fit.pos]}</p>
    </fieldset>
  );
}
