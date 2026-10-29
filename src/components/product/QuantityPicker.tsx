import { useId } from 'react';
import { MAX_QTY } from '../../state/cart';

/**
 * Qty: [−] 1 [+] for ADD TO BAG, in the same small-button style as MY BAG.
 * Never below 1 (− is disabled there); the upper bound is the bag's per-line
 * safeguard, not a stock count.
 */
export function QuantityPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const id = useId();
  return (
    <div className="props__qty" role="group" aria-labelledby={id} data-repeatable>
      <span id={id}>Qty:</span>
      <button type="button" className="btn btn--small" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        −
      </button>
      <output aria-live="polite" aria-label={`Quantity ${value}`}>
        {value}
      </output>
      <button type="button" className="btn btn--small" onClick={() => onChange(value + 1)} disabled={value >= MAX_QTY} aria-label="Increase quantity">
        +
      </button>
    </div>
  );
}
