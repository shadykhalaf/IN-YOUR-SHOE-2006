import { collectionProducts } from './catalogue/hydrate';
import type { Catalogue, Product } from './catalogue/types';

/**
 * "u might like these": a few complementary, REAL, in-stock products for the
 * bag. Deterministic rules over IYS's own collections, not AI:
 *
 *   a top in the bag      → bottoms
 *   a bottom in the bag   → tops
 *   homewear / pjoys      → fluffy socks, pantoufles, pshirts
 *   accessories only      → tops
 *   kids items            → only from IYS KIDS
 *
 * Never: something already in the bag, sold out, without a price or photo,
 * or much pricier than what it goes with. Order = IYS's own collection order.
 */
const RULES: { when: string; from: string[] }[] = [
  { when: 'all-tops', from: ['pants', 'jeans', 'sweatpants', 'all-bottoms'] },
  { when: 'all-bottoms', from: ['t-shirts', 'hoodies', 'all-tops'] },
  { when: 'homewear', from: ['fluffy-socks', 'pantoufles', 'pshirts', 'all-socks'] },
  { when: 'all-accessories', from: ['t-shirts', 'all-tops'] },
];
const KIDS = 'all-kids-products';

export interface UpsellPick {
  product: Product;
  /** why it's here, e.g. "goes with ur hoodie" (concept copy). */
  because: string;
}

export const isKids = (p: Product) => p.collections.includes(KIDS);
/** IYS marks gendered pieces in the title ("Female …", "Male …") and in the women / men collections. */
export function audience(p: Product): 'women' | 'men' | 'any' {
  const t = p.title.toLowerCase();
  const w = t.startsWith('female ') || (p.collections.includes('women') && !p.collections.includes('unisex') && !p.collections.includes('men'));
  const m = t.startsWith('male ') || (p.collections.includes('men') && !p.collections.includes('unisex') && !p.collections.includes('women'));
  return w && !m ? 'women' : m && !w ? 'men' : 'any';
}
const label = (p: Product) => (p.productType ?? 'pick').toLowerCase();

export function upsell(cat: Catalogue, bagHandles: readonly string[], { max = 3 } = {}): UpsellPick[] {
  const inBag = new Set(bagHandles);
  const anchors = [...inBag].map((h) => cat.byHandle.get(h)).filter((p): p is Product => Boolean(p));
  // Each bag item proposes its own complements (in IYS's collection order)…
  const lists = anchors.map((anchor) => {
    const rule = RULES.find((r) => anchor.collections.includes(r.when));
    if (!rule) return [];
    const kids = isKids(anchor);
    const who = audience(anchor);
    const ceiling = (anchor.price ?? 0) * 1.3;
    const fits: UpsellPick[] = [];
    const neutral: UpsellPick[] = [];
    for (const from of rule.from) {
      for (const p of collectionProducts(cat, from)) {
        if (fits.length >= max) break;
        const ok = !inBag.has(p.handle) && p.available === true && p.price !== null && p.price <= ceiling && Boolean(p.image) && isKids(p) === kids;
        if (!ok || fits.some((o) => o.product.handle === p.handle) || neutral.some((o) => o.product.handle === p.handle)) continue;
        const a = audience(p);
        const pick = { product: p, because: `goes with ur ${label(anchor)}` };
        // gendered piece → same audience or unisex only; unisex piece → unisex first, then anything
        if (who === 'any' ? a === 'any' : a === who || a === 'any') fits.push(pick);
        else if (who === 'any') neutral.push(pick);
      }
      if (fits.length >= max) break;
    }
    return [...fits, ...neutral].slice(0, max);
  });
  // …then they take turns, so a 2-item bag gets ideas for both.
  const picks: UpsellPick[] = [];
  for (let round = 0; picks.length < max && lists.some((l) => l.length > round); round++) {
    for (const l of lists) {
      const pick = l[round];
      if (pick && picks.length < max && !picks.some((x) => x.product.handle === pick.product.handle)) picks.push(pick);
    }
  }
  return picks;
}
