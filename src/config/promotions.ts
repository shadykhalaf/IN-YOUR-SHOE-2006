/**
 * PROMOTIONS: the merchant's own rules, never invented here.
 *
 * Snapshot mode reads ONLY what is written below, each entry with where it was
 * verified and until when it may be shown without re-checking. When live
 * Shopify mode is configured, /api/commerce?op=promotions can replace these
 * with the store's real active discounts (see docs/SHOPIFY_GO_LIVE_CHECKLIST.md).
 *
 * To change an offer: edit this one file (or set it to null / an empty list to
 * hide it). Nothing else in the UI needs touching.
 */

export interface FreeShippingRule {
  /** Free shipping when the bag's merchandise subtotal is strictly OVER this, in EGP. */
  overEGP: number;
  /** true = "at least" (Shopify's own minimum-subtotal discounts). The announcement says OVER, so omitted here. */
  inclusive?: boolean;
  /** Verbatim merchant wording and where it appears. */
  source: string;
  sourceUrl: string;
  /** YYYY-MM-DD the wording was read on the live store. */
  verifiedOn: string;
  /** YYYY-MM-DD after which the concept stops showing it until someone re-verifies it. */
  showUntil: string;
}

export interface Offer {
  id: string;
  /** Short, exact description of the merchant's offer. */
  title: string;
  /** A real, merchant-authorised code (only if the merchant published or provided it). */
  code?: string;
  conditions?: string;
  source: string;
  verifiedOn: string;
  /** YYYY-MM-DD (inclusive) bounds, when the merchant gave them. */
  startsOn?: string;
  endsOn?: string;
}

/** Read on https://inyourshoe.com/ (announcement bar + navigation) on 2026-10-26. */
export const FREE_SHIPPING: FreeShippingRule | null = {
  overEGP: 3999,
  source: 'inyourshoe.com announcement bar: “FREE SHIPPING OVER 3999 EGP” (menu: “Free delivery over 3,999 EGP”)',
  sourceUrl: 'https://inyourshoe.com/',
  verifiedOn: '2026-10-26',
  showUntil: '2026-11-25',
};

/**
 * Bag offers. Empty on purpose: no campaign has been authorised for this
 * concept, and the newsletter's 10% code is only ever revealed by IYS NEWSLETTER
 * after a confirmed signup. Add a real one here when the merchant provides it.
 */
export const OFFERS: Offer[] = [];
