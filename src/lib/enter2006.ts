/**
 * ARRIVAL FROM THE REAL STORE (the "time machine" portal).
 *
 * The live inyourshoe.com announcement bar hands a visitor to this site with:
 *
 *   https://2000s.inyourshoe.com<path>?enter=2006&bag=<encoded JSON lines>
 *
 *   <path>   the matching page: '/', '/products/<handle>', '/collections/<handle>'
 *            (react-router shows it; no work needed here).
 *   bag      encodeURIComponent(JSON.stringify(lines)), each line a compact
 *            record the real cart already knows — so the 2006 bag is seeded
 *            directly, with no catalogue/variant lookup:
 *              { h: handle, v: variantId, q: qty, t: title,
 *                vt: variantTitle|null, s: size|null, p: unitPriceEGP, img: url|null }
 *
 * This is a local convenience only. Shopify stays authoritative: whatever lands
 * in the bag is re-validated (price, stock) at real checkout via the cart
 * permalink, so an odd or stale payload can never place a wrong order.
 */
import { addItem, clampQty, type CartItem, useCart } from '../state/cart';

const MAX_LINES = 50;
const str = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
};
const isVariantId = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const money = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

interface RawLine {
  h?: unknown; v?: unknown; q?: unknown; t?: unknown; vt?: unknown; s?: unknown; p?: unknown; img?: unknown;
}

/**
 * Pure: a decoded ?bag= value → a validated CartItem[] (deduped, quantities
 * clamped), or null when there is nothing usable. Never throws.
 */
export function parseEnterBag(raw: string | null | undefined): CartItem[] | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;

  let items: CartItem[] = [];
  for (const entry of data.slice(0, MAX_LINES)) {
    const l = entry as RawLine;
    const handle = str(l.h, 160);
    if (!handle || !isVariantId(l.v)) continue; // a line with no handle/variant can't be a real bag line
    items = addItem(items, {
      handle,
      title: str(l.t, 200) ?? handle,
      variantId: l.v,
      variantTitle: str(l.vt, 120),
      size: str(l.s, 60),
      price: money(l.p),
      image: str(l.img, 500),
    }, clampQty(Number(l.q)));
  }
  return items.length ? items : null;
}

/** Strip only the portal params, keep the path (and any other query) intact so a refresh won't re-seed. */
function cleanUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('enter') && !url.searchParams.has('bag')) return;
    url.searchParams.delete('enter');
    url.searchParams.delete('bag');
    const qs = url.searchParams.toString();
    window.history.replaceState(null, '', url.pathname + (qs ? `?${qs}` : '') + url.hash);
  } catch {
    /* history unavailable — harmless */
  }
}

let applied = false;
/**
 * Run once at boot. If the visitor arrived through the portal (?enter=2006),
 * replace the local bag with the cart they carried over, then clean the URL.
 * Idempotent and side-effect-safe: any failure leaves the app untouched.
 */
export function applyEnter2006(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  if (applied) return false;
  applied = true;
  try {
    const params = new URLSearchParams(search);
    if (params.get('enter') !== '2006') return false;
    const items = parseEnterBag(params.get('bag'));
    if (items && items.length) useCart.setState({ items });
    cleanUrl();
    return Boolean(items && items.length);
  } catch {
    return false;
  }
}

/** Tests only. */
export function resetEnter2006() {
  applied = false;
}
