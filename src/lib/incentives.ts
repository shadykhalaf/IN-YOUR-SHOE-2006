import type { Offer, SavingsTier, TieredSavings } from '../config/promotions';

/** YYYY-MM-DD for "today" in the visitor's own clock (offer windows are dates, not instants). */
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type SavingsStep = SavingsTier & { pct: number; reached: boolean };

export type SavingsProgress =
  | { kind: 'hidden'; reason: 'no-offer' | 'not-current' | 'empty' }
  | { kind: 'progress'; saved: number; next: SavingsTier; remaining: number; steps: SavingsStep[] }
  | { kind: 'max'; saved: number; steps: SavingsStep[] };

/**
 * Spend-more-save-more progress from the merchant's steps. Pure.
 * - no offer, a moment before startsAt or from endsAt on, or an empty bag:
 *   hidden (exact instants, so the offer ends at the same moment for everyone)
 * - reaching a step's minimum counts (2,648 needs 1,796 more for 4,444)
 * - the bar shows `shown` steps from the next one to reach (the last ones once
 *   fewer remain), the first filling from 0, as in the cart on inyourshoe.com
 */
export function savingsProgress(subtotal: number, offer: TieredSavings | null, now: number, shown = 3): SavingsProgress {
  const tiers = offer ? offer.tiers.filter((t) => t.minEGP > 0 && t.saveEGP > 0).sort((a, b) => a.minEGP - b.minEGP) : [];
  if (!offer || !tiers.length) return { kind: 'hidden', reason: 'no-offer' };
  const starts = offer.startsAt === undefined ? -Infinity : Date.parse(offer.startsAt);
  if (!(now >= starts && now < Date.parse(offer.endsAt))) return { kind: 'hidden', reason: 'not-current' };
  if (!(subtotal > 0)) return { kind: 'hidden', reason: 'empty' };
  const nextIdx = tiers.findIndex((t) => subtotal < t.minEGP);
  const reached = nextIdx === -1 ? tiers.length : nextIdx;
  const saved = reached ? tiers[reached - 1]!.saveEGP : 0;
  const start = Math.max(0, Math.min(reached, tiers.length - shown));
  const view = tiers.slice(start, start + shown);
  const steps = view.map((t, i): SavingsStep => {
    const from = i === 0 ? 0 : view[i - 1]!.minEGP;
    const done = subtotal >= t.minEGP;
    const pct = done ? 100 : Math.max(0, Math.min(99, Math.floor(((subtotal - from) / (t.minEGP - from)) * 100)));
    return { ...t, pct, reached: done };
  });
  if (nextIdx === -1) return { kind: 'max', saved, steps };
  const next = tiers[nextIdx]!;
  return { kind: 'progress', saved, next, remaining: Math.ceil(next.minEGP - subtotal), steps };
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
