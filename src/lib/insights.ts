/**
 * IYS 2000s — what people do on the site, counted without naming anyone.
 *
 * Each visit makes up a random id so visits can be counted; no email, no name,
 * no customer id, no IP and no fingerprinting. Everything is sent to the same
 * collector the Singles Day waiting room uses, under site "2000s", so both can
 * be read side by side.
 *
 * It only watches stores and the router that already exist, so no feature code
 * has to call it. Vercel Web Analytics keeps doing page views as before; this
 * adds the shopping steps that page views cannot see.
 */
import { useCart } from '../state/cart';
import { useFavorites } from '../state/favorites';
import { useHandoff } from './handoff';

const URL_ = 'https://larkvlkettqrzgkoegvo.supabase.co/functions/v1/k2-track';
const SITE = '2000s';
const SID = 'iys2006.sid';

type Event = { name: string; handle?: string };

let sess = '';
let queue: Event[] = [];
let timer: number | null = null;
const sent = new Set<string>();

function sessionId(): string {
  if (sess) return sess;
  try { sess = window.sessionStorage.getItem(SID) ?? ''; } catch { /* private mode */ }
  if (!sess) {
    sess = (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).replace(/[^a-z0-9]/g, '');
    try { window.sessionStorage.setItem(SID, sess); } catch { /* private mode */ }
  }
  return sess;
}

function flush(beacon = false) {
  if (timer !== null) { window.clearTimeout(timer); timer = null; }
  if (!queue.length) return;
  const body = JSON.stringify({ site: SITE, sess: sessionId(), events: queue.splice(0, 60) });
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(URL_, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(URL_, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* a lost count is not worth an error */ });
  } catch { /* never let counting break the page */ }
}

/** Records one thing, at most once per visit. */
export function track(name: string, handle?: string) {
  const key = `${name}|${handle ?? ''}`;
  if (sent.has(key)) return;
  sent.add(key);
  queue.push(handle ? { name, handle } : { name });
  if (timer === null) timer = window.setTimeout(() => flush(), 1500);
}

/** The route, as a name rather than a URL: /product/foo becomes "product". */
function routeName(path: string): string {
  const first = path.replace(/^\/+/, '').split('/')[0] ?? '';
  if (!first) return 'home';
  return first.slice(0, 40).replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'home';
}

/** Called on every route change by the <Insights /> component. */
export function page(path: string) {
  track('page', routeName(path));
  const m = /^\/products?\/([^/?#]+)/.exec(path);
  if (m?.[1]) { track('product_view', decodeURIComponent(m[1])); track('product_any'); }
  const c = /^\/collections\/([^/?#]+)/.exec(path);
  if (c?.[1]) track('collection_view', decodeURIComponent(c[1]));
}

let started = false;

/** Subscribes to the stores. Safe to call more than once. */
export function startInsights() {
  if (started || typeof window === 'undefined') return;
  started = true;

  track('visit');
  try {
    if (new URLSearchParams(window.location.search).has('enter')) track('from_time_machine');
  } catch { /* a bad query string is not worth an error */ }

  /* The bag: a line that was not there before is an add. */
  let lastKeys = new Set(useCart.getState().items.map((i) => i.key));
  useCart.subscribe((s) => {
    const keys = new Set(s.items.map((i) => i.key));
    keys.forEach((k) => {
      if (!lastKeys.has(k)) {
        track('add_to_cart', s.items.find((i) => i.key === k)?.handle);
        track('cart_any');
      }
    });
    lastKeys = keys;
  });

  /* Favourites: a handle that was not there before is a save. */
  let lastFavs = new Set(useFavorites.getState().handles);
  useFavorites.subscribe((s) => {
    const favs = new Set(s.handles);
    favs.forEach((h) => { if (!lastFavs.has(h)) { track('favorite', h); track('favorite_any'); } });
    lastFavs = favs;
  });

  /* Leaving for Shopify: either to pay, or to the real store. */
  useHandoff.subscribe((s) => {
    if (!s.pending) return;
    track(s.pending.to === 'checkout' ? 'checkout' : 'to_real_store');
    flush(true);
  });

  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
}
