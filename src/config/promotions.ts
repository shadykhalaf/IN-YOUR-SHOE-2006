/**
 * PROMOTIONS: the merchant's own offers, never invented here.
 *
 * The site reads ONLY what is written below, each entry with where it was
 * verified. There is no free shipping: no screen shows or promises it.
 *
 * To change an offer: edit this one file (an empty list, or null, hides it).
 * Nothing else in the UI needs touching.
 */

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

/** One spend-more-save-more step: a bag subtotal of at least `minEGP` saves `saveEGP` in total. */
export interface SavingsTier {
  minEGP: number;
  saveEGP: number;
}

export interface TieredSavings {
  /** Box title, worded as in the merchant's own cart. */
  title: string;
  /** The steps, ascending by minEGP. */
  tiers: SavingsTier[];
  /** Verbatim merchant wording and where it appears. */
  source: string;
  /** YYYY-MM-DD the steps were read on the live store. */
  verifiedOn: string;
  /** Optional exact start, ISO 8601 with its UTC offset. Without it, the box shows until endsAt. */
  startsAt?: string;
  /**
   * The exact moment the offer ends, ISO 8601 with its UTC offset (Egypt time:
   * +02:00 in winter, +03:00 in summer time). MY BAG stops showing it from then on.
   */
  endsAt: string;
}

/**
 * Single Week savings, read from the cart on inyourshoe.com on 2026-11-10:
 * a 2,648 EGP bag showed "1,111.00 EGP SAVED SO FAR" and "Add 1,796.00 EGP more
 * to save 2,222.00 EGP in total", with steps at 4,444 / 6,666 / 8,888 EGP
 * (SAVE 2,222 / 3,333 / 4,444). The 1,111 already saved is the 2,222 step.
 * Single Week ends on Sunday 15 November 2026 at 12:12 Egypt time (EET,
 * UTC+2): the box disappears at that exact moment, wherever the visitor is.
 */
export const SINGLE_WEEK_SAVINGS: TieredSavings | null = {
  title: 'YOUR SINGLE WEEK SAVINGS',
  tiers: [
    { minEGP: 2222, saveEGP: 1111 },
    { minEGP: 4444, saveEGP: 2222 },
    { minEGP: 6666, saveEGP: 3333 },
    { minEGP: 8888, saveEGP: 4444 },
  ],
  source: 'inyourshoe.com cart: “YOUR SINGLE WEEK SAVINGS”, “Add 1,796.00 EGP more to save 2,222.00 EGP in total”, “1,111.00 EGP SAVED SO FAR”, steps 4,444 / 6,666 / 8,888 (SAVE 2,222 / 3,333 / 4,444)',
  verifiedOn: '2026-11-10',
  endsAt: '2026-11-15T12:12:00+02:00',
};

/**
 * Bag offers. Empty on purpose: no campaign has been authorised for this
 * concept. Add a real one here when the merchant provides it.
 */
export const OFFERS: Offer[] = [];
