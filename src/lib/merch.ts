import { collectionProducts } from './catalogue/hydrate';
import type { Catalogue, Product } from './catalogue/types';

/**
 * Home shelves below JUST DROPPED: IYS's OWN collections, in IYS's own order.
 * Deterministic (no AI, no tracking): the first in-stock products of each
 * collection that are not already shown elsewhere on the page, never the same
 * product on two shelves. A collection that's missing or has nothing left to
 * show after a sync simply doesn't render.
 */
export interface ShelfSpec {
  collection: string;
  /** Concept line under the official collection title. */
  note: string;
}

export const HOME_SHELVES: ShelfSpec[] = [
  { collection: 'best-sellers', note: 'IYS’s own Best Sellers collection' },
  { collection: 'hoodies', note: 'hoodie szn is now xo' },
  { collection: 't-shirts', note: 'tees 4 every mood' },
  { collection: 'all-bottoms', note: 'pants, jeans, swants + more' },
  { collection: 'all-accessories', note: 'socks, caps, bags :)' },
];

export interface Shelf {
  handle: string;
  title: string;
  count: number;
  note: string;
  products: Product[];
}

/**
 * Search's empty state, FRESH PICKS 4 U: the newest piece of each kind
 * (hoodie, tee, pants, pjoys…), walking IYS's own NEW DROPS collection in
 * IYS's own order. In stock, priced and photographed only; deterministic.
 * Nothing here is called a best seller, popular or trending.
 */
const FRESH_KINDS: [string, RegExp][] = [
  ['hoodie', /\bhoodies?\b/],
  ['tee', /\b(tees?|t-?shirts?)\b/],
  ['pants', /\b(pants|swants|trousers|jeans|sweatpants|joggers)\b/],
  ['sweatshirt', /\b(sweatshirts?|crewnecks?|quarter zip(per)?s?)\b/],
  ['knit', /\b(pullovers?|sweaters?|knit\w*|cardigans?)\b/],
  ['jacket', /\b(jackets?|coats?|windbreakers?|blazers?)\b/],
  ['pjoys', /\b(pjoys|pyjamas?|pajamas?|pshorts|pshirts)\b/],
  ['shirt', /(?<!t-)\bshirts?\b/],
  ['shorts', /\b(shorts|jorts|sworts)\b/],
  ['socks', /\bsocks?\b/],
  ['cap', /\b(caps?|hats?|beanies?)\b/],
  ['bag', /\b(bags?|totes?|laptop sleeves?)\b/],
];
export function freshPicks(cat: Catalogue, n = 6): Product[] {
  const used = new Set<string>();
  const picks: Product[] = [];
  for (const p of collectionProducts(cat, 'newest')) {
    if (picks.length >= n) break;
    if (p.available !== true || p.price === null || !p.image) continue;
    const text = `${p.title} ${p.productType ?? ''}`.toLowerCase();
    const kind = FRESH_KINDS.find(([, re]) => re.test(text))?.[0];
    if (!kind || used.has(kind)) continue;
    used.add(kind);
    picks.push(p);
  }
  return picks;
}

/** Search's empty state: where to start, as IYS's own collections (only those that exist and aren't empty). */
export const SEARCH_SHORTCUTS = ['newest', 'hoodies', 't-shirts', 'pjoys', 'fluffy-pjoys', 'pants', 'jeans', 'cairo', 'all-accessories', 'all-kids-products'] as const;
export function searchShortcuts(cat: Catalogue): { handle: string; title: string; count: number }[] {
  return SEARCH_SHORTCUTS.flatMap((h) => {
    const c = cat.collections.get(h);
    return c && c.count > 0 ? [{ handle: h, title: (c.title ?? h).toUpperCase(), count: c.count }] : [];
  });
}

export function buildShelves(cat: Catalogue, specs: readonly ShelfSpec[], { exclude = [], per = 6, min = 3 }: { exclude?: Iterable<string>; per?: number; min?: number } = {}): Shelf[] {
  const used = new Set(exclude);
  const shelves: Shelf[] = [];
  for (const spec of specs) {
    const c = cat.collections.get(spec.collection);
    if (!c || !c.count) continue;
    const picked: Product[] = [];
    for (const p of collectionProducts(cat, spec.collection)) {
      if (picked.length >= per) break;
      if (used.has(p.handle) || p.available !== true || p.price === null || !p.image) continue;
      picked.push(p);
    }
    if (picked.length < min) continue;
    picked.forEach((p) => used.add(p.handle));
    shelves.push({ handle: spec.collection, title: c.title ?? spec.collection.toUpperCase(), count: c.count, note: spec.note, products: picked });
  }
  return shelves;
}
