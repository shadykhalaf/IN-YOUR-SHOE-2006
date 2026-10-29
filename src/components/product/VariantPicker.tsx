import { useId } from 'react';
import type { ProductDetail } from '../../lib/catalogue/types';
import { valueAvailable } from '../../lib/variants';

/** Real options/values from the public product JSON, as real radio groups. */
export function VariantPicker({ p, selected, onSelect }: { p: ProductDetail; selected: (string | null)[]; onSelect: (optionIndex: number, value: string) => void }) {
  const id = useId();
  if (!p.options.length) return null;
  return (
    <div className="variants">
      {p.options.map((o, oi) => (
        <fieldset key={o.name} className="variants__group">
          <legend>
            {o.name}: <b>{selected[oi] ?? 'choose one'}</b>
          </legend>
          <div className="variants__values">
            {o.values.map((v) => {
              const avail = valueAvailable(p, oi, v, selected);
              const inputId = `${id}-${oi}-${v}`;
              return (
                <span key={v} className={`chip${avail === false ? ' is-out' : ''}`}>
                  <input type="radio" id={inputId} name={`${id}-${o.name}`} value={v} checked={selected[oi] === v} disabled={avail === false} onChange={() => onSelect(oi, v)} />
                  <label htmlFor={inputId}>
                    {v}
                    {avail === false && <span className="sr-only"> (sold out)</span>}
                  </label>
                </span>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
