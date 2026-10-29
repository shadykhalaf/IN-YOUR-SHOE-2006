import { useEffect, useId, useState } from 'react';
import { formatCount } from '../../lib/catalogue/format';
import { SORTS, type Facets, type ShopQuery, type SortKey } from '../../lib/catalogue/query';

/**
 * Filters styled as a CONTROL PANEL but built from real form controls.
 * A facet only appears when the data actually supports it.
 */
export function FilterPanel({ q: fromUrl, facets, onChange: commit, onReset, departments, onDepartment }: {
  q: ShopQuery;
  facets: Facets;
  onChange: (patch: Partial<ShopQuery>) => void;
  onReset: () => void;
  departments?: { value: string; label: string; count: number | null }[];
  onDepartment?: (handle: string) => void;
}) {
  const id = useId();
  // Optimistic mirror of the URL query: React Router applies URL updates in a
  // transition, so controls driven only by the URL would visibly snap back
  // until it commits (noticeable on slow devices). Local state updates at once
  // and re-syncs whenever the URL changes.
  const [q, setQ] = useState(fromUrl);
  useEffect(() => setQ(fromUrl), [fromUrl]);
  const onChange = (patch: Partial<ShopQuery>) => {
    const next = { ...q, ...patch };
    setQ(next);
    commit(next);
  };
  const [min, setMin] = useState(q.min?.toString() ?? '');
  const [max, setMax] = useState(q.max?.toString() ?? '');
  useEffect(() => {
    setMin(q.min?.toString() ?? '');
    setMax(q.max?.toString() ?? '');
  }, [q.min, q.max]);

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const active = q.types.length + q.sizes.length + (q.min !== null ? 1 : 0) + (q.max !== null ? 1 : 0) + (q.inStock ? 1 : 0) + (q.sale ? 1 : 0);

  return (
    <aside className="filters" aria-label="Filters">
      <div className="filters__head">
        <b>CONTROL PANEL</b>
        <span>{active ? `${active} active` : 'No filters'}</span>
      </div>
      <div className="filters__body">
        <div className="fieldset-plain">
          <label htmlFor={`${id}-sort`} className="filters__label">
            Sort by
          </label>
          <select id={`${id}-sort`} className="select" value={q.sort} onChange={(e) => onChange({ sort: e.target.value as SortKey, page: 1 })}>
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {departments && onDepartment && (
          <div className="fieldset-plain">
            <label htmlFor={`${id}-dep`} className="filters__label">
              Department
            </label>
            <select id={`${id}-dep`} className="select" value={q.collection ?? ''} onChange={(e) => onDepartment(e.target.value)}>
              <option value="">All public products</option>
              {departments.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                  {d.count !== null ? ` (${formatCount(d.count)})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <fieldset className="fieldset">
          <legend>Availability</legend>
          <label className="field-row">
            <input type="checkbox" className="check" checked={q.inStock} onChange={(e) => onChange({ inStock: e.target.checked, page: 1 })} />
            In stock only ({formatCount(facets.inStockCount)})
          </label>
          {(facets.saleCount > 0 || q.sale) && (
            <label className="field-row">
              <input type="checkbox" className="check" checked={q.sale} onChange={(e) => onChange({ sale: e.target.checked, page: 1 })} />
              <span>
                On sale only ({formatCount(facets.saleCount)})
              </span>
            </label>
          )}
        </fieldset>

        {facets.priceMin !== null && facets.priceMax !== null && facets.priceMax > facets.priceMin && (
          <fieldset className="fieldset">
            <legend>Price (EGP)</legend>
            <form
              className="filters__price"
              onSubmit={(e) => {
                e.preventDefault();
                const lo = min.trim() === '' ? null : Math.max(0, Number(min));
                const hi = max.trim() === '' ? null : Math.max(0, Number(max));
                onChange({ min: Number.isFinite(lo as number) ? lo : null, max: Number.isFinite(hi as number) ? hi : null, page: 1 });
              }}
            >
              <label>
                <span className="sr-only">Minimum price in EGP</span>
                <input className="input" type="number" inputMode="numeric" min={0} placeholder={String(Math.floor(facets.priceMin))} value={min} onChange={(e) => setMin(e.target.value)} />
              </label>
              <span aria-hidden="true">–</span>
              <label>
                <span className="sr-only">Maximum price in EGP</span>
                <input className="input" type="number" inputMode="numeric" min={0} placeholder={String(Math.ceil(facets.priceMax))} value={max} onChange={(e) => setMax(e.target.value)} />
              </label>
              <button type="submit" className="btn btn--small">
                Apply
              </button>
            </form>
          </fieldset>
        )}

        {(facets.sizes.length > 0 || q.sizes.length > 0) && (
          <fieldset className="fieldset">
            <legend>Size</legend>
            <div className="filters__sizes">
              {facets.sizes.map((s) => (
                <label key={s.value} className="size-check">
                  <input type="checkbox" className="check" checked={q.sizes.includes(s.value)} onChange={() => onChange({ sizes: toggle(q.sizes, s.value), page: 1 })} />
                  <span>
                    {s.value} <small>({formatCount(s.count)})</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {(facets.types.length > 1 || q.types.length > 0) && (
          <fieldset className="fieldset">
            <legend>Product type</legend>
            <div className="filters__types">
              {facets.types.map((t) => (
                <label key={t.value} className="field-row">
                  <input type="checkbox" className="check" checked={q.types.includes(t.value)} onChange={() => onChange({ types: toggle(q.types, t.value), page: 1 })} />
                  <span>
                    {t.value} <small>({formatCount(t.count)})</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <button type="button" className="btn" onClick={onReset} disabled={!active && q.sort === 'featured'}>
          Reset filters
        </button>
      </div>
    </aside>
  );
}
