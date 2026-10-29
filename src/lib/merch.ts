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
