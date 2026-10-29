import type { FreeShippingRule, Offer } from '../config/promotions';

/** YYYY-MM-DD for "today" in the visitor's own clock (offer windows are dates, not instants). */
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type ShippingProgress =
  | { kind: 'hidden'; reason: 'no-rule' | 'stale' | 'empty' }
  | { kind: 'progress'; threshold: number; remaining: number; pct: number }
  | { kind: 'unlocked'; threshold: number };

/**
 * Free-shipping progress from a verified merchant rule. Pure.
 * - no rule, or past its re-verify date → hidden (never a stale promise)
 * - empty bag → hidden
 * - the announcement says OVER, so exactly the threshold is not yet "unlocked"
 *   (a live Shopify minimum-subtotal rule is inclusive: `inclusive: true`)
 */
export function shippingProgress(subtotal: number, rule: FreeShippingRule | null, on: string): ShippingProgress {
  if (!rule || !(rule.overEGP > 0)) return { kind: 'hidden', reason: 'no-rule' };
  if (on > rule.showUntil || on < rule.verifiedOn) return { kind: 'hidden', reason: 'stale' };
  if (!(subtotal > 0)) return { kind: 'hidden', reason: 'empty' };
  if (rule.inclusive ? subtotal >= rule.overEGP : subtotal > rule.overEGP) return { kind: 'unlocked', threshold: rule.overEGP };
  const remaining = Math.max(0, Math.ceil(rule.overEGP - subtotal));
  return { kind: 'progress', threshold: rule.overEGP, remaining, pct: Math.min(99, Math.floor((subtotal / rule.overEGP) * 100)) };
}

/** Offers that are inside their own date window today. */
export const activeOffers = (offers: readonly Offer[], on: string) => offers.filter((o) => (!o.startsOn || on >= o.startsOn) && (!o.endsOn || on <= o.endsOn));

/**
 * Discount codes the concept is willing to pass to Shopify: a conservative
 * subset of what Shopify accepts (letters, digits, - and _), 1-64 chars.
 * Anything else is refused rather than "fixed".
 */
export function cleanCode(input: string): string | null {
  const c = input.trim().toUpperCase();
  return /^[A-Z0-9_-]{1,64}$/.test(c) ? c : null;
}
