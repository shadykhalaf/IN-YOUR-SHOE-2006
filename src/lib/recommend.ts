import { collectionProducts } from './catalogue/hydrate';
import type { Catalogue, Product } from './catalogue/types';
import { audience, isKids, upsell, type UpsellPick } from './upsell';

/**
 * MORE LIKE THIS (every product page) and the MY BAG carousel. Deterministic
 * rules over IYS's own catalogue and collection order; no AI, no invented
 * popularity. In priority order:
 *
 *   1. same style in another colour (title without colour words matches)
 *   2. IYS's narrowest shared collections (e.g. CEREAL KILLER, IYS × ZED, FLUFFY SOCKS)
 *   3. things it goes with (the bag rules in ./upsell.ts)
 *   4. fallback: the same kind of piece, then IYS's BEST SELLERS collection
 *
 * Always real, in stock, priced and with a photo; never the product itself
 * or what's already in the bag; kids pieces only next to kids pieces; a
 * gendered piece only next to the same audience or unisex.
 */
export type Pick = UpsellPick;

const COLOURS = new Set(
  'black white blue navy baby sky light dark red pink rose fuchsia purple lilac lavender violet green olive mint sage khaki beige cream offwhite off-white ivory brown camel tan grey gray charcoal yellow mustard orange coral peach burgundy maroon wine teal turquoise aqua denim indigo silver gold multicolor multicolour washed acid'.split(' '),
);
/** Collections that are merchandising lists, not "what kind of thing": never used for similarity. */
const BROAD = new Set(['all-products', 'on-sale', 'newest', 'best-sellers', 'end-of-season-sale', 'unisex', 'women', 'men', 'kids', 'all-kids-products', 'outwear', 'the-vacation-edit', 'bundles', 'others']);

/** A collection bigger than this is a department ("all tops"), too loose to call "like this". */
const NARROW_MAX = 150;

/** "Blue & Navy Striped Daydreamer Boxy Long Sleeves" → "striped daydreamer boxy long sleeves". */
export function styleStem(title: string): string {
  const words = title.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w && !COLOURS.has(w) && w !== 'and');
  return words.length >= 2 ? words.join(' ') : '';
}

const shoppable = (p: Product) => p.available === true && p.price !== null && Boolean(p.image);

export function moreLikeThis(cat: Catalogue, handle: string, { max = 12, exclude = [] as readonly string[] } = {}): Pick[] {
  const me = cat.byHandle.get(handle);
  if (!me) return [];
  const skip = new Set([handle, ...exclude]);
  const kids = isKids(me);
  const who = audience(me);
  const picks: Pick[] = [];
  const fits = (p: Product) => {
    if (skip.has(p.handle) || !shoppable(p) || isKids(p) !== kids) return false;
    const a = audience(p);
    return who === 'any' || a === who || a === 'any';
  };
  const add = (p: Product, because: string, cap = max) => {
    if (picks.length >= cap || !fits(p)) return;
    skip.add(p.handle);
    picks.push({ product: p, because });
  };

  // 1. same style, other colour
  const stem = styleStem(me.title);
  if (stem) for (const p of cat.products) if (styleStem(p.title) === stem) add(p, 'same style, other colour', 4);

  // 2. narrowest shared collections, two at a time so one family can't fill the whole row
  const narrow = me.collections
    .filter((h) => !BROAD.has(h))
    .map((h) => cat.collections.get(h))
    .filter((c): c is NonNullable<typeof c> => Boolean(c && c.count > 1 && c.count <= NARROW_MAX))
    .sort((a, b) => a.count - b.count)
    .slice(0, 3);
  const lists = narrow.map((c) => ({ title: (c.title ?? c.handle).toLowerCase(), items: collectionProducts(cat, c.handle) }));
  for (let i = 0; picks.length < max - 3 && lists.some((l) => l.items.length > i); i++)
    for (const l of lists) if (l.items[i]) add(l.items[i]!, `more ${l.title}`, max - 3);

  // 3. what it goes with
  for (const u of upsell(cat, [handle], { max: 4 })) add(u.product, 'goes with it');

  // 4. fallback: same kind of piece, then IYS best sellers
  if (picks.length < max) for (const p of cat.products) if (me.productType && p.productType === me.productType) add(p, `more ${me.productType.toLowerCase()}`);
  if (picks.length < max) for (const p of collectionProducts(cat, 'best-sellers')) add(p, 'IYS best seller');
  return picks;
}

/**
 * MY BAG carousel: complements first (./upsell.ts, round-robin over the bag),
 * then more like the bag's newest item, never what's already in the bag.
 */
export function bagIdeas(cat: Catalogue, bagHandles: readonly string[], max = 10): Pick[] {
  if (!bagHandles.length) return [];
  const picks = upsell(cat, bagHandles, { max: 6 });
  const taken = new Set([...bagHandles, ...picks.map((p) => p.product.handle)]);
  const last = bagHandles[bagHandles.length - 1]!;
  for (const p of moreLikeThis(cat, last, { max, exclude: [...taken] })) if (picks.length < max) picks.push(p);
  return picks;
}
