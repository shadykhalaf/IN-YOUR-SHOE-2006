/**
 * Commerce data source: SNAPSHOT (default, always works) or LIVE (only when
 * explicitly configured AND the server-side Shopify connection answers).
 *
 *   VITE_COMMERCE_MODE=live   asks the client to use /api/commerce
 *   (server) SHOPIFY_*        the credentials, never in this bundle
 *
 * Anything missing, failing or slow → the snapshot keeps working, and the UI
 * never claims something Shopify didn't confirm. See
 * docs/SHOPIFY_GO_LIVE_CHECKLIST.md.
 */
import type { FreeShippingRule } from '../config/promotions';
import type { CartItem } from '../state/cart';

export type CommerceMode = 'snapshot' | 'live';
export const COMMERCE_ENDPOINT = '/api/commerce';

const env = import.meta.env as Record<string, string | undefined>;
export const commerceMode = (): CommerceMode => (env.VITE_COMMERCE_MODE?.trim().toLowerCase() === 'live' ? 'live' : 'snapshot');
/** Live checkout is a second, separate opt-in on top of live mode (VITE_LIVE_CART=1). */
export const liveCartEnabled = () => commerceMode() === 'live' && env.VITE_LIVE_CART?.trim() === '1';

async function post<T>(op: string, body: unknown, timeoutMs = 8000): Promise<T | null> {
  try {
    const res = await fetch(`${COMMERCE_ENDPOINT}?op=${encodeURIComponent(op)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const lines = (items: readonly CartItem[]) => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));

/**
 * LIVE mode only: does Shopify's own cart say this code applies to this bag?
 * 'unchecked' whenever it can't say (snapshot mode, server not configured,
 * network or API error), so the UI falls back to "IYS checks it at checkout".
 */
export async function verifyDiscount(items: readonly CartItem[], code: string): Promise<'applies' | 'does-not-apply' | 'unchecked'> {
  if (commerceMode() !== 'live') return 'unchecked';
  const r = await post<{ ok: boolean; discountCodes?: { code: string; applicable: boolean }[] }>('cart', { lines: lines(items), discountCodes: [code] });
  const found = r?.ok ? r.discountCodes?.find((d) => d.code.toUpperCase() === code.toUpperCase()) : undefined;
  return found ? (found.applicable ? 'applies' : 'does-not-apply') : 'unchecked';
}

/** Shopify-hosted pages only, whatever an API returns (mirrors the server's safeCheckoutUrl). */
export function isShopifyCheckoutUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    return u.protocol === 'https:' && (h === 'inyourshoe.com' || h.endsWith('.inyourshoe.com') || h.endsWith('.myshopify.com') || h === 'checkout.shopify.com' || h === 'shop.app');
  } catch {
    return false;
  }
}

export type LiveCheckout = { kind: 'go'; url: string } | { kind: 'mismatch'; variantIds: (number | null)[] } | { kind: 'unavailable' };

/**
 * LIVE checkout: Shopify's own cartCreate for the exact bag.
 *   go           Shopify took every line exactly → its checkout URL
 *   mismatch     Shopify answered but dropped/changed a line → never continue silently
 *   unavailable  no answer (not configured, network, rate limit) → caller uses the permalink
 */
export async function createLiveCheckout(items: readonly CartItem[], code: string | null): Promise<LiveCheckout> {
  type R = { ok?: boolean; checkoutUrl?: string | null; lines?: { variantId: number; quantity: number; available: boolean }[] };
  const r = await post<R>('cart', { lines: lines(items), discountCodes: code ? [code] : [] });
  if (!r || !Array.isArray(r.lines)) return { kind: 'unavailable' };
  if (r.ok === true && isShopifyCheckoutUrl(r.checkoutUrl)) return { kind: 'go', url: r.checkoutUrl };
  const got = r.lines;
  const off = items.filter((i) => !got.some((g) => g.variantId === i.variantId && g.quantity === i.quantity && g.available));
  return off.length ? { kind: 'mismatch', variantIds: off.map((i) => i.variantId) } : { kind: 'unavailable' };
}

let liveShipping: Promise<FreeShippingRule | null> | null = null;

/**
 * LIVE mode only: the store's active automatic free-shipping discount for
 * Egypt (Admin API via /api/commerce), as a rule valid today. null whenever
 * there is nothing to say: snapshot mode, not configured, error, or no such
 * discount. A missing discount is NOT proof there's no free shipping (it can
 * also be a shipping-rate condition), so callers keep the verified static rule.
 */
export function liveFreeShipping(on: string): Promise<FreeShippingRule | null> {
  if (commerceMode() !== 'live') return Promise.resolve(null);
  liveShipping ??= fetch(`${COMMERCE_ENDPOINT}?op=promotions`, { signal: AbortSignal.timeout(6000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((b: { ok?: boolean; freeShipping?: { minSubtotalEGP?: number; title?: string } | null } | null) => {
      const min = b?.ok ? Number(b.freeShipping?.minSubtotalEGP) : NaN;
      if (!(min > 0)) return null;
      return { overEGP: min, inclusive: true, source: `Shopify automatic discount: ${String(b?.freeShipping?.title ?? '').slice(0, 80)}`, sourceUrl: '', verifiedOn: on, showUntil: on };
    })
    .catch(() => null);
  return liveShipping;
}
