import { describe, expect, it } from 'vitest';
import { hydrate } from '../lib/catalogue/hydrate';
import { applyFilters, EMPTY_QUERY, facets, paginate, pageWindow, parseQuery, runQuery, sortProducts, toParams, compareSizes } from '../lib/catalogue/query';
import type { IndexFile } from '../lib/catalogue/types';
import { decorativeFilename, formatEGP } from '../lib/catalogue/format';

/** Tiny synthetic index in the real on-disk shape (logic tests only — never shown in the UI). */
const file: IndexFile = {
  generatedAt: '2026-09-29T00:00:00Z',
  currency: 'EGP',
  imageBase: 'https://cdn.shopify.com/s/files/1/0050/2729/9397/files/',
  shardCount: 32,
  collections: [
    { h: 'newest', t: 'Newest', n: 2, o: [3, 1] },
    { h: 'pjoys', t: 'Pjoys', n: 2, o: [1, 0] },
  ],
  products: [
    { h: 'a', t: 'Alpha Pjoys', ty: 'PJOYS', p: 799, n: 1, v: 2, k: [1], a: 1, sz: [['S', 1, 1], ['M', 0, 2]], cr: '2026-01-01' },
    { h: 'b', t: 'bravo Hoodie', ty: 'Printed Hoodies', p: 1799, c: 1999, s: 1, n: 1, v: 1, k: [0, 1], a: 1, sz: [['M', 1, 3]], cr: '2026-03-01' },
    { h: 'c', t: 'Charlie Socks', ty: 'Neck Socks', p: 159, n: 1, v: 1, k: [], a: 0, qv: [4, 0], cr: '2026-05-01' },
    { h: 'd', t: 'Delta Jeans', ty: 'Jeans', p: 1399, n: 1, v: 2, k: [0], a: 1, sz: [['30', 1, 5], ['28', 1, 6]], cr: '2025-01-01' },
  ],
};
const cat = hydrate(file);

describe('query parsing', () => {
  it('round-trips URL state', () => {
    const q = parseQuery(new URLSearchParams('type=Jeans&size=M&min=100&max=900&stock=1&sale=1&sort=price-asc&page=3'));
    expect(q).toMatchObject({ types: ['Jeans'], sizes: ['M'], min: 100, max: 900, inStock: true, sale: true, sort: 'price-asc', page: 3 });
    expect(parseQuery(toParams(q))).toEqual(q);
  });
  it('ignores junk', () => {
    const q = parseQuery(new URLSearchParams('sort=best-selling&page=-4&min=abc'));
    expect(q.sort).toBe('featured');
    expect(q.page).toBe(1);
    expect(q.min).toBeNull();
  });
  it('omits defaults', () => expect(toParams(EMPTY_QUERY).toString()).toBe(''));
});

describe('filters', () => {
  const q = (p: Partial<typeof EMPTY_QUERY>) => ({ ...EMPTY_QUERY, ...p });
  it('type', () => expect(applyFilters(cat.products, q({ types: ['Jeans'] })).map((p) => p.handle)).toEqual(['d']));
  it('size, respecting in-stock', () => {
    expect(applyFilters(cat.products, q({ sizes: ['M'] })).map((p) => p.handle)).toEqual(['a', 'b']);
    expect(applyFilters(cat.products, q({ sizes: ['M'], inStock: true })).map((p) => p.handle)).toEqual(['b']);
  });
  it('price range', () => expect(applyFilters(cat.products, q({ min: 500, max: 1500 })).map((p) => p.handle)).toEqual(['a', 'd']));
  it('sale only uses real compare-at data', () => expect(applyFilters(cat.products, q({ sale: true })).map((p) => p.handle)).toEqual(['b']));
  it('availability', () => expect(applyFilters(cat.products, q({ inStock: true })).map((p) => p.handle)).toEqual(['a', 'b', 'd']));
  it('facets count each dimension with the other filters applied', () => {
    const f = facets(cat.products, q({ types: ['PJOYS'] }));
    expect(f.types.find((t) => t.value === 'Jeans')?.count).toBe(1);
    expect(f.sizes.map((s) => s.value)).toEqual(['S', 'M']);
    expect(f.saleCount).toBe(0);
  });
});

describe('sorting', () => {
  it('price both ways, stable', () => {
    expect(sortProducts(cat.products, 'price-asc', cat).map((p) => p.handle)).toEqual(['c', 'a', 'd', 'b']);
    expect(sortProducts(cat.products, 'price-desc', cat).map((p) => p.handle)).toEqual(['b', 'd', 'a', 'c']);
  });
  it('A–Z is case-insensitive', () => expect(sortProducts(cat.products, 'title-asc', cat).map((p) => p.handle)).toEqual(['a', 'b', 'c', 'd']));
  it('newest = IYS Newest collection order first, then created date', () =>
    expect(sortProducts(cat.products, 'newest', cat).map((p) => p.handle)).toEqual(['d', 'b', 'c', 'a']));
  it('featured keeps the storefront order', () => expect(runQuery(cat, { ...EMPTY_QUERY, collection: 'pjoys' }).filtered.map((p) => p.handle)).toEqual(['b', 'a']));
  it('orders sizes sensibly', () => expect(['XL', 'S', '32', 'M', '28', 'L/XL'].sort(compareSizes)).toEqual(['S', 'M', 'XL', 'L/XL', '28', '32']));
});

describe('pagination', () => {
  const list = Array.from({ length: 1249 }, (_, i) => i);
  it('computes pages (48 per page)', () => {
    const p = paginate(list, 1);
    expect(p.pageCount).toBe(Math.ceil(1249 / 48));
    expect(p.items).toHaveLength(48);
  });
  it('last page is partial and correct', () => {
    const last = paginate(list, 999);
    expect(last.page).toBe(27);
    expect(last.items[last.items.length - 1]).toBe(1248);
    expect(last.from).toBe(1249 - (1249 % 48) + 1);
  });
  it('covers every item exactly once', () => {
    const seen: number[] = [];
    for (let i = 1; i <= paginate(list, 1).pageCount; i++) seen.push(...paginate(list, i).items);
    expect(seen).toEqual(list);
  });
  it('empty result → page 1 of 1', () => expect(paginate([], 5)).toMatchObject({ page: 1, pageCount: 1, total: 0, from: 0, to: 0 }));
  it('renders a period page window', () => {
    expect(pageWindow(1, 27)).toEqual([1, 2, 3, '…', 27]);
    expect(pageWindow(14, 27)).toEqual([1, '…', 12, 13, 14, 15, 16, '…', 27]);
  });
});

describe('formatting', () => {
  it('formats EGP without conversion', () => {
    expect(formatEGP(1799)).toBe('1,799 EGP');
    expect(formatEGP(null)).toBe('Price unavailable');
  });
  it('makes decorative filenames', () => expect(decorativeFilename('Don’t Go Out Fluffy Pjoys')).toBe('Dont_Go_Out_Fluffy_Pjoys.jpg'));
});
