import { collectionProducts } from './hydrate';
import type { Catalogue, Product } from './types';

export const PER_PAGE = 48;

/**
 * Sorts backed by real public data only.
 * - featured: the storefront's own order (All Products, or the collection's order)
 * - newest:   products in IYS's own "Newest" collection first, in that order,
 *             then the rest by public created_at (newest first)
 * No "best selling": not reliably exposed as a sort by public data.
 */
export const SORTS = {
  featured: 'Featured',
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  'title-asc': 'A–Z',
  'title-desc': 'Z–A',
} as const;
export type SortKey = keyof typeof SORTS;
export const isSortKey = (s: string | null): s is SortKey => !!s && s in SORTS;

export interface ShopQuery {
  collection: string | null;
  q: string;
  types: string[];
  sizes: string[];
  min: number | null;
  max: number | null;
  inStock: boolean;
  sale: boolean;
  sort: SortKey;
  page: number;
}

export const EMPTY_QUERY: ShopQuery = { collection: null, q: '', types: [], sizes: [], min: null, max: null, inStock: false, sale: false, sort: 'featured', page: 1 };

const num = (s: string | null) => {
  if (s === null || s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function parseQuery(params: URLSearchParams, collection: string | null = null): ShopQuery {
  const page = Math.floor(Number(params.get('page') ?? '1'));
  const sort = params.get('sort');
  return {
    collection,
    q: (params.get('q') ?? '').trim(),
    types: params.getAll('type').filter(Boolean),
    sizes: params.getAll('size').filter(Boolean),
    min: num(params.get('min')),
    max: num(params.get('max')),
    inStock: params.get('stock') === '1',
    sale: params.get('sale') === '1',
    sort: isSortKey(sort) ? sort : 'featured',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Inverse of parseQuery — only non-default values, stable order. */
export function toParams(q: Partial<ShopQuery>): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set('q', q.q);
  for (const t of q.types ?? []) p.append('type', t);
  for (const s of q.sizes ?? []) p.append('size', s);
  if (q.min !== null && q.min !== undefined) p.set('min', String(q.min));
  if (q.max !== null && q.max !== undefined) p.set('max', String(q.max));
  if (q.inStock) p.set('stock', '1');
  if (q.sale) p.set('sale', '1');
  if (q.sort && q.sort !== 'featured') p.set('sort', q.sort);
  if (q.page && q.page > 1) p.set('page', String(q.page));
  return p;
}

/** Base list for a query: a collection (in its own order) or the whole catalogue. */
export function baseList(cat: Catalogue, collection: string | null): Product[] {
  return collection ? collectionProducts(cat, collection) : cat.products;
}

export function matchesFilters(p: Product, q: ShopQuery, skip?: 'types' | 'sizes'): boolean {
  if (skip !== 'types' && q.types.length && !(p.productType && q.types.includes(p.productType))) return false;
  if (skip !== 'sizes' && q.sizes.length) {
    const ok = p.sizes.some((s) => q.sizes.includes(s.label) && (!q.inStock || s.available));
    if (!ok) return false;
  }
  if (q.min !== null && (p.price === null || p.price < q.min)) return false;
  if (q.max !== null && (p.price === null || p.price > q.max)) return false;
  if (q.inStock && p.available !== true) return false;
  if (q.sale && !p.onSale) return false;
  return true;
}

export const applyFilters = (list: Product[], q: ShopQuery) => list.filter((p) => matchesFilters(p, q));

const byTitle = (a: Product, b: Product) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });

/**
 * Stable sort. Ties always fall back to the list's incoming (featured) order,
 * so pagination never shuffles between renders.
 */
export function sortProducts(list: Product[], sort: SortKey, cat: Catalogue): Product[] {
  const pos = new Map(list.map((p, i) => [p.handle, i]));
  const tie = (a: Product, b: Product) => (pos.get(a.handle) ?? 0) - (pos.get(b.handle) ?? 0);
  const out = [...list];
  switch (sort) {
    case 'featured':
      return out;
    case 'newest': {
      const newest = new Map((cat.collections.get('newest')?.order ?? []).map((idx, i) => [idx, i]));
      return out.sort((a, b) => {
        const na = newest.get(a.index);
        const nb = newest.get(b.index);
        if (na !== undefined || nb !== undefined) return (na ?? Infinity) - (nb ?? Infinity) || tie(a, b);
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || tie(a, b);
      });
    }
    case 'price-asc':
      return out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || tie(a, b));
    case 'price-desc':
      return out.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity) || tie(a, b));
    case 'title-asc':
      return out.sort((a, b) => byTitle(a, b) || tie(a, b));
    case 'title-desc':
      return out.sort((a, b) => byTitle(b, a) || tie(a, b));
  }
}

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
}

/** Clamps out-of-range pages so filters can never strand the user on an empty page. */
export function paginate<T>(list: T[], page: number, perPage = PER_PAGE): Page<T> {
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (p - 1) * perPage;
  const items = list.slice(start, start + perPage);
  return { items, page: p, pageCount, total, from: total ? start + 1 : 0, to: start + items.length };
}

/** "« Previous 1 2 3 4 5 … 26 Next »" window. */
export function pageWindow(page: number, pageCount: number, span = 2): (number | '…')[] {
  const pages = new Set<number>([1, pageCount]);
  for (let i = page - span; i <= page + span; i++) if (i >= 1 && i <= pageCount) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined && n - prev > 1) out.push('…');
    out.push(n);
  });
  return out;
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', 'S/M', 'M/L', 'L/XL', 'ONE SIZE', 'OS'];
export function compareSizes(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a.toUpperCase());
  const ib = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb || a.localeCompare(b);
  if (Number.isFinite(na)) return 1;
  if (Number.isFinite(nb)) return -1;
  return a.localeCompare(b, 'en', { numeric: true });
}

export interface Facets {
  types: { value: string; count: number }[];
  sizes: { value: string; count: number }[];
  priceMin: number | null;
  priceMax: number | null;
  saleCount: number;
  inStockCount: number;
}

/** Facet counts. Each facet is counted with every OTHER active filter applied. */
export function facets(list: Product[], q: ShopQuery): Facets {
  const types = new Map<string, number>();
  const sizes = new Map<string, number>();
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  let saleCount = 0;
  let inStockCount = 0;
  for (const p of list) {
    if (p.productType && matchesFilters(p, q, 'types')) types.set(p.productType, (types.get(p.productType) ?? 0) + 1);
    if (matchesFilters(p, q, 'sizes')) {
      for (const s of new Set(p.sizes.filter((s) => !q.inStock || s.available).map((s) => s.label))) sizes.set(s, (sizes.get(s) ?? 0) + 1);
    }
    if (p.price !== null) {
      priceMin = priceMin === null ? p.price : Math.min(priceMin, p.price);
      priceMax = priceMax === null ? p.price : Math.max(priceMax, p.price);
    }
    if (matchesFilters(p, { ...q, sale: false })) saleCount += p.onSale ? 1 : 0;
    if (matchesFilters(p, { ...q, inStock: false })) inStockCount += p.available === true ? 1 : 0;
  }
  return {
    types: [...types].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value)),
    sizes: [...sizes].map(([value, count]) => ({ value, count })).sort((a, b) => compareSizes(a.value, b.value)),
    priceMin,
    priceMax,
    saleCount,
    inStockCount,
  };
}

/** Full pipeline used by /shop and /collections/:handle. */
export function runQuery(cat: Catalogue, q: ShopQuery) {
  const base = baseList(cat, q.collection);
  const filtered = applyFilters(base, q);
  const sorted = sortProducts(filtered, q.sort, cat);
  return { base, filtered: sorted, page: paginate(sorted, q.page), facets: facets(base, q) };
}
