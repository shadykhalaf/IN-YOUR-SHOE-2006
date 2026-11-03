import { useEffect, useState } from 'react';
import { FIT_ENDPOINT, FIT_KEY } from '../config/integrations';

/**
 * Fit (true to size) for each product, from the real store's product metafield
 * custom.fit. One request per visit (all products at once), kept for the
 * session. Anything else than the three known values is ignored (no guessing).
 */
export type FitPos = 0 | 1 | 2; // runs small · true to size · runs large
export interface Fit { label: string; pos: FitPos }

const KEY = 'iys2000s.fits.v1';
const TTL = 10 * 60 * 1000;
let mem: Promise<Record<string, string>> | null = null;

export function fitFromValue(raw: string | null | undefined): Fit | null {
  const v = String(raw ?? '').trim();
  const k = v.toLowerCase().replace(/\s+/g, ' ');
  const pos: FitPos | null = k === 'runs small' ? 0 : k === 'true to size' ? 1 : k === 'runs large' ? 2 : null;
  return pos === null ? null : { label: v, pos };
}

export function loadFits(fetcher: typeof fetch = fetch): Promise<Record<string, string>> {
  if (mem) return mem;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && Date.now() - saved.at < TTL && saved.fits) return (mem = Promise.resolve(saved.fits));
  } catch { /* private mode */ }
  if (!FIT_ENDPOINT) return (mem = Promise.resolve({}));
  mem = fetcher(FIT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FIT_KEY}`, apikey: FIT_KEY },
    body: JSON.stringify({ action: 'fits' }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const fits = d && d.ok && d.fits && typeof d.fits === 'object' ? (d.fits as Record<string, string>) : {};
      if (d && d.ok) {
        try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), fits })); } catch { /* private mode */ }
      } else {
        mem = null; // try again on the next product page
      }
      return fits;
    })
    .catch(() => {
      mem = null;
      return {};
    });
  return mem;
}

/** The fit of one product, or null (no value, or not loaded yet). */
export function useFit(handle: string | null | undefined): Fit | null {
  const [fit, setFit] = useState<Fit | null>(null);
  useEffect(() => {
    let live = true;
    setFit(null);
    if (!handle) return;
    loadFits().then((fits) => { if (live) setFit(fitFromValue(fits[handle])); });
    return () => { live = false; };
  }, [handle]);
  return fit;
}
