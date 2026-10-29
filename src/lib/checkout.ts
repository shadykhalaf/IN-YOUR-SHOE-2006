import { IYS_STOREFRONT_ORIGIN } from '../config/integrations';
import { useHandoff } from './handoff';
import { noteFrustration } from './frustration';
import { concept } from '../data/copy';
import { MAX_QTY, useCart } from '../state/cart';
import { cleanCode } from './incentives';
import { createLiveCheckout, liveCartEnabled } from './commerce';
import { useOS } from '../state/os';
import { notifyCatchy, WAVE_DELAY_MS } from '../features/catchy/events';

/**
 * Local IYS Retro bag → Shopify cart permalink → the real IYS store.
 *   CHECKOUT  → /cart/{lines}                    → straight into the real checkout
 *   REAL IYS  → /cart/{lines}?storefront=true    → the real online-store cart
 *
 *   https://inyourshoe.com/cart/{variantId}:{quantity},{variantId}:{quantity}
 *
 * A bridge, isolated on purpose: a future Shopify Storefront Cart adapter (or
 * an IYS-side cart-handoff route) can replace the two URL builders without
 * touching MY BAG or the switch. Shopify stays authoritative for live price, stock and market; the
 * local snapshot subtotal is never presented as final.
 */
export interface CheckoutLine {
  variantId: unknown;
  quantity: unknown;
  handle?: string;
  title?: string;
}
export type CheckoutPlan = { ok: true; url: string } | { ok: false; reason: 'empty' | 'invalid-line'; bad: { handle?: string; title?: string }[] };

const isVariantId = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
/** The bag's own contract: whole quantities 1…MAX_QTY. Anything else is never "fixed" into a different order. */
const isQuantity = (q: unknown): q is number => typeof q === 'number' && Number.isSafeInteger(q) && q >= 1 && q <= MAX_QTY;

/**
 * Pure, the one source of truth for `variantId:quantity`: the exact bag, line
 * for line and in bag order, or a refusal that names every line it could not carry.
 */
export function serializeShopifyCart(items: readonly CheckoutLine[] | null | undefined): { ok: true; lines: string } | Extract<CheckoutPlan, { ok: false }> {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, reason: 'empty', bad: [] };
  const bad = items.filter((i) => !i || !isVariantId(i.variantId) || !isQuantity(i.quantity));
  if (bad.length) return { ok: false, reason: 'invalid-line', bad: bad.map((i) => ({ handle: i?.handle, title: i?.title })) };
  return { ok: true, lines: items.map((i) => `${i.variantId}:${i.quantity}`).join(',') };
}

/** Shopify's cart-permalink discount parameter, only for codes that pass `cleanCode`. */
const discountParam = (code: string | null | undefined) => {
  const c = code ? cleanCode(code) : null;
  return c ? `discount=${encodeURIComponent(c)}` : null;
};
const withQuery = (url: string, ...params: (string | null)[]) => {
  const q = params.filter(Boolean).join('&');
  return q ? `${url}?${q}` : url;
};

/** CHECKOUT destination: the cart permalink that continues straight into the real Shopify checkout. */
export function buildShopifyCheckoutUrl(items: readonly CheckoutLine[] | null | undefined, opts: { discount?: string | null } = {}): CheckoutPlan {
  const s = serializeShopifyCart(items);
  return s.ok ? { ok: true, url: withQuery(`${IYS_STOREFRONT_ORIGIN}/cart/${s.lines}`, discountParam(opts.discount)) } : s;
}

/**
 * REAL IYS destination: the same lines loaded into the real online-store cart
 * (`?storefront=true`), so the visitor keeps shopping on inyourshoe.com. An
 * empty bag simply goes to the real homepage (never an empty /cart/).
 */
export function buildShopifyStorefrontHandoffUrl(items: readonly CheckoutLine[] | null | undefined, opts: { discount?: string | null } = {}): CheckoutPlan {
  const s = serializeShopifyCart(items);
  if (s.ok) return { ok: true, url: withQuery(`${IYS_STOREFRONT_ORIGIN}/cart/${s.lines}`, 'storefront=true', discountParam(opts.discount)) };
  return s.reason === 'empty' ? { ok: true, url: `${IYS_STOREFRONT_ORIGIN}/` } : s;
}

const sameTab = (url: string) => window.location.assign(url);
export { useHandoff };

let clearTimer = 0;
function handoff(to: 'checkout' | 'real', url: string, go: (url: string) => void) {
  useHandoff.setState({ pending: { to, url, at: Date.now() } });
  if (typeof window !== 'undefined') {
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => useHandoff.setState({ pending: null }), 20_000);
  }
  go(url);
}

/** A line that can't be carried: stop, keep the bag, point at the item (same message for both handoffs). */
function showRefresh(plan: Extract<CheckoutPlan, { ok: false }>, title: string, message: string = concept.checkout.errorMessage) {
  const first = plan.bad.find((b) => b.handle);
  noteFrustration('checkout-error', plan.bad.map((b) => b.handle ?? '?').join(','));
  useOS.getState().showDialog({
    kind: 'error',
    title,
    message,
    action: first?.handle ? { label: concept.checkout.errorAction, handle: first.handle } : undefined,
  });
}

/**
 * The one CHECKOUT action (desktop MY BAG, mobile MY BAG, mobile soft key).
 * The local bag is left as it is: Back, or a line Shopify rejects, finds it intact.
 */
export function startCheckout(go: (url: string) => void = sameTab) {
  const { items, discountCode } = useCart.getState();
  const plan = buildShopifyCheckoutUrl(items, { discount: discountCode });
  if (!plan.ok) return plan.reason === 'empty' ? undefined : showRefresh(plan, concept.checkout.errorTitle);
  // A second press while the redirect is already under way does nothing.
  if (useHandoff.getState().pending) return;
  if (!liveCartEnabled()) return handoff('checkout', plan.url, go);
  // LIVE (opt-in): Shopify builds the cart; the permalink is the fallback whenever it can't answer.
  useHandoff.setState({ pending: { to: 'checkout', url: plan.url, at: Date.now() } });
  return createLiveCheckout(items, cleanCode(discountCode ?? '')).then((r) => {
    if (r.kind === 'go') return handoff('checkout', r.url, go);
    if (r.kind === 'unavailable') return handoff('checkout', plan.url, go);
    useHandoff.setState({ pending: null });
    const bad = items.filter((i) => r.variantIds.includes(i.variantId)).map((i) => ({ handle: i.handle, title: i.title }));
    showRefresh({ ok: false, reason: 'invalid-line', bad }, concept.checkout.errorTitle, concept.checkout.liveMismatch);
  });
}

/**
 * The one IYS 2006 → REAL IYS action (the global switch). One-way: this repo
 * doesn't control inyourshoe.com. Today it hands the bag over by cart
 * permalink; a future IYS-side cart-handoff route only needs to replace
 * `buildShopifyStorefrontHandoffUrl`. The local bag is never cleared.
 */
export function switchToRealIYS(go: (url: string) => void = sameTab) {
  const { items, discountCode } = useCart.getState();
  const plan = buildShopifyStorefrontHandoffUrl(items, { discount: discountCode });
  if (!plan.ok) return showRefresh(plan, concept.checkout.realErrorTitle);
  // Catchy may wave goodbye: at most WAVE_DELAY_MS, and only when he is actually on screen to do it.
  if (useHandoff.getState().pending) return;
  useHandoff.setState({ pending: { to: 'real', url: plan.url, at: Date.now() } });
  if (notifyCatchy({ type: 'real-iys:leave' })) window.setTimeout(() => handoff('real', plan.url, go), WAVE_DELAY_MS);
  else handoff('real', plan.url, go);
}
