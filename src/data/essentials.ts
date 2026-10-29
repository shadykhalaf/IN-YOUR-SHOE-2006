/**
 * IYS ESSENTIALS - the one source of truth for customer policy/help links.
 *
 * Every entry is the CURRENT official In Your Shoe page; the live page is the
 * source of truth. No policy text is copied, summarised or rewritten here.
 * inyourshoe.com sends `X-Frame-Options: DENY` / `frame-ancestors 'none'`, so
 * the pages cannot be embedded and always open on the official site.
 *
 * Verified live (HTTP 200, official page title) on 2026-09-29.
 * Policies: the five policy pages. Help: the other customer-help pages the
 * official footer links to (FAQs, Track Your Order, Contact Us).
 */
export const ESSENTIALS_VERIFIED_ON = '2026-09-29';

export interface Essential {
  id: string;
  /** Label shown in the concept UI. */
  label: string;
  /** Short label for inline text links. */
  short: string;
  /** Official page title on inyourshoe.com. */
  title: string;
  url: string;
}

export const POLICIES: Essential[] = [
  { id: 'exchange-refund', label: 'EXCHANGE & REFUND', short: 'Exchange & Refund', title: 'Exchange & Refund Policy', url: 'https://inyourshoe.com/pages/exchange-refund-policy' },
  { id: 'shipping', label: 'SHIPPING POLICY', short: 'Shipping', title: 'Shipping Policy', url: 'https://inyourshoe.com/pages/shipping-policy' },
  { id: 'terms-conditions', label: 'TERMS & CONDITIONS', short: 'Terms & Conditions', title: 'Terms & Conditions', url: 'https://inyourshoe.com/pages/terms-conditions' },
  { id: 'terms-of-service', label: 'TERMS OF SERVICE', short: 'Terms of Service', title: 'Terms of service', url: 'https://inyourshoe.com/policies/terms-of-service' },
  { id: 'privacy', label: 'PRIVACY POLICY', short: 'Privacy', title: 'Privacy Policy', url: 'https://inyourshoe.com/pages/privacy-policy' },
];

export const HELP_PAGES: Essential[] = [
  { id: 'faqs', label: 'FAQS', short: 'FAQs', title: 'FAQs', url: 'https://inyourshoe.com/pages/faqs' },
  { id: 'track-order', label: 'TRACK YOUR ORDER', short: 'Track Your Order', title: 'Track Your Order', url: 'https://inyourshoe.com/pages/track-your-order' },
  { id: 'contact', label: 'CONTACT US', short: 'Contact Us', title: 'Contact Us', url: 'https://inyourshoe.com/pages/contact-us' },
];

export const ESSENTIALS: Essential[] = [...POLICIES, ...HELP_PAGES];

export const essential = (id: string): Essential => {
  const e = ESSENTIALS.find((x) => x.id === id);
  if (!e) throw new Error(`unknown essential: ${id}`);
  return e;
};
