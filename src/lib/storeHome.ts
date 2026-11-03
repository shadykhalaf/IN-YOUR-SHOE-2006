import { useEffect, useState } from 'react';
import { STORE_FN_ENDPOINT, STORE_FN_KEY } from '../config/integrations';
import { MENU } from '../data/taxonomy';
import { loadCatalogue } from './catalogue/load';
import type { Catalogue } from './catalogue/types';

/**
 * The real store's homepage and main menu, live from the PUBLISHED theme (the
 * store's Supabase function, action "home"). The 2000s homepage draws the same
 * sections in the same order, and MENU / Links / SHOP BY CATEGORY follow the
 * store's own menu. Nothing loaded (no permission yet, offline): the site keeps
 * its own homepage and menu, exactly as before.
 */
export interface StoreMenuNode { title: string; url: string; collection: string | null; items: StoreMenuNode[] }
export interface StoreCollection { title: string; count: number | null; image: string | null; products: string[] }
export type StoreSection =
  | { type: 'hero'; slides: { image: string; mobileImage: string | null; title: string; subheading: string; label: string; collection: string | null }[] }
  | { type: 'announce'; items: string[] }
  | { type: 'split'; title: string; items: { label: string; collection: string; image: string | null }[] }
  | { type: 'stats'; items: { number: string; label: string }[] }
  | { type: 'feature'; image: string | null; heading: string; subheading: string; text: string; label: string; collection: string | null }
  | { type: 'shelves'; title: string; items: { title: string; collection: string; limit: number }[] }
  | { type: 'tiles'; title: string; items: { label: string; collection: string; image: string | null }[] };
export interface StoreHome { theme: string; menu: StoreMenuNode[]; sections: StoreSection[]; collections: Record<string, StoreCollection> }

const KEY = 'iys2000s.home.v1';
const TTL = 10 * 60 * 1000;
let mem: Promise<StoreHome | null> | null = null;
let ready: StoreHome | null = null;

const KNOWN = new Set(['hero', 'announce', 'split', 'stats', 'feature', 'shelves', 'tiles']);
export function isStoreHome(v: unknown): v is StoreHome {
  const o = v as Partial<StoreHome> | null;
  return Boolean(o && Array.isArray(o.sections) && Array.isArray(o.menu) && o.collections && typeof o.collections === 'object');
}

/** Collections the store's homepage shows that this catalogue doesn't have yet (new since the snapshot). */
export function mergeCollections(cat: Catalogue, home: StoreHome) {
  const at = new Map(cat.products.map((p, i) => [p.handle, i]));
  for (const [handle, c] of Object.entries(home.collections)) {
    if (cat.collections.has(handle)) continue;
    const order = c.products.map((h) => at.get(h)).filter((i): i is number => i !== undefined);
    if (order.length) cat.collections.set(handle, { handle, title: c.title, count: order.length, order });
  }
}

export function loadStoreHome(fetcher: typeof fetch = fetch): Promise<StoreHome | null> {
  if (mem) return mem;
  const finish = (h: StoreHome | null) => {
    if (!h) return null;
    h.sections = h.sections.filter((s) => KNOWN.has(s.type));
    ready = h;
    return loadCatalogue().then((cat) => { mergeCollections(cat, h); return h; }, () => h);
  };
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && Date.now() - saved.at < TTL && isStoreHome(saved.home)) return (mem = Promise.resolve(finish(saved.home)));
  } catch { /* private mode */ }
  if (!STORE_FN_ENDPOINT) return (mem = Promise.resolve(null));
  mem = fetcher(STORE_FN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STORE_FN_KEY}`, apikey: STORE_FN_KEY },
    body: JSON.stringify({ action: 'home' }),
    signal: AbortSignal.timeout(8000),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.ok || !isStoreHome(d)) return null;
      const home: StoreHome = { theme: d.theme, menu: d.menu, sections: d.sections, collections: d.collections };
      try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), home })); } catch { /* private mode */ }
      return finish(home);
    })
    .catch(() => null);
  return mem;
}

export const storeHomeNow = () => ready;

export function useStoreHome(): StoreHome | null {
  const [home, setHome] = useState<StoreHome | null>(ready);
  useEffect(() => {
    let live = true;
    loadStoreHome().then((h) => { if (live && h) setHome(h); });
    return () => { live = false; };
  }, []);
  return home;
}

export interface MenuItem { label: string; collection: string | null; to?: string }

/** The store's menu as this site's menu: each top-level entry, linked to its collection (or its first one). */
export function storeMenu(nodes: StoreMenuNode[]): MenuItem[] {
  const first = (n: StoreMenuNode): string | null => n.collection ?? n.items.map(first).find(Boolean) ?? null;
  const out: MenuItem[] = [];
  for (const n of nodes) {
    const label = n.title.toUpperCase();
    if (!label) continue;
    if (n.collection === 'all' || /\/collections\/all\/?$/.test(n.url)) { out.push({ label, collection: null, to: '/shop' }); continue; }
    const c = first(n);
    if (c) out.push({ label, collection: c });
  }
  return out;
}

/** MENU, Links and SHOP BY CATEGORY: the store's own menu once it's loaded, else the site's own. */
export function useMenu(): MenuItem[] {
  const home = useStoreHome();
  const live = home ? storeMenu(home.menu) : [];
  return live.length ? live : MENU;
}
