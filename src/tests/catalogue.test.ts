/**
 * Integrity of the COMMITTED snapshot (no network). Counts are never typed
 * here — they are read from the generated metadata and compared.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import assetsManifest from '../data/assets.generated.json';
import indexFile from '../data/catalogue-index.json';
import meta from '../data/catalogue-meta.json';
import curation from '../data/curation.json';
import stores from '../data/stores.generated.json';
import { collectionProducts, hydrate } from '../lib/catalogue/hydrate';
import { EMPTY_QUERY, paginate, runQuery } from '../lib/catalogue/query';
import { shardOf } from '../lib/catalogue/shard';
import { createSearcher } from '../lib/catalogue/search';
import type { IndexFile, ProductDetail } from '../lib/catalogue/types';
import { WARDROBE, MENU, BUDDIES } from '../data/taxonomy';

const file = indexFile as unknown as IndexFile;
const cat = hydrate(file);
const shardDir = resolve(__dirname, '../../public/catalogue');
const details: Record<string, ProductDetail> = Object.assign({}, ...readdirSync(shardDir).map((f) => JSON.parse(readFileSync(resolve(shardDir, f), 'utf8'))));

describe('catalogue snapshot', () => {
  it('matches its own metadata', () => {
    expect(cat.products.length).toBe(meta.publicProductsTotal);
    expect(meta.productCount).toBe(meta.publicProductsTotal);
    expect(meta.currency).toBe('EGP');
    expect(meta.market).toBe('Egypt');
    expect(cat.products.reduce((n, p) => n + p.variantCount, 0)).toBe(meta.variantsTotal);
  });

  it('keeps All Products and public-total as distinct, consistent metrics', () => {
    expect(cat.collections.get('all-products')?.count).toBe(meta.allProductsCollectionCount);
    const inAll = new Set(collectionProducts(cat, 'all-products').map((p) => p.handle));
    const outside = cat.products.filter((p) => !inAll.has(p.handle)).map((p) => p.handle).sort();
    expect(outside).toEqual([...meta.productsOutsideAllProducts.handles].sort());
    expect(meta.allProductsCollectionCount + meta.productsOutsideAllProducts.count).toBe(meta.publicProductsTotal);
  });

  it('has unique handles, real prices, images and EGP everywhere', () => {
    expect(new Set(cat.products.map((p) => p.handle)).size).toBe(cat.products.length);
    for (const p of cat.products) {
      expect(p.price, p.handle).not.toBeNull();
      expect(p.image, p.handle).toMatch(/^https:\/\//);
      expect(p.sourceUrl).toBe(`https://inyourshoe.com/products/${p.handle}`);
    }
  });

  it('has a detail record in the right shard for every product', () => {
    expect(Object.keys(details).length).toBe(meta.publicProductsTotal);
    for (const p of cat.products) {
      const shard = JSON.parse(readFileSync(resolve(shardDir, `p-${String(shardOf(p.handle, file.shardCount)).padStart(2, '0')}.json`), 'utf8'));
      expect(shard[p.handle]?.handle, p.handle).toBe(p.handle);
      expect(details[p.handle]!.currency).toBe('EGP');
    }
  });

  it('sale flags always come from a real compare-at price', () => {
    for (const d of Object.values(details)) {
      if (d.onSale) expect(d.variants.some((v) => v.compareAtPrice !== null && v.price !== null && v.compareAtPrice > v.price)).toBe(true);
    }
  });

  it('unfiltered /shop pagination covers every product exactly once', () => {
    const r = runQuery(cat, EMPTY_QUERY);
    const seen: string[] = [];
    for (let i = 1; i <= r.page.pageCount; i++) seen.push(...paginate(r.filtered, i).items.map((p) => p.handle));
    expect(seen.length).toBe(meta.publicProductsTotal);
    expect(new Set(seen).size).toBe(meta.publicProductsTotal);
  });

  it('every curated handle resolves to a real product (with local images)', () => {
    const handles = [...curation.top8, ...curation.pjoysMessenger, ...curation.cairo, curation.hero, ...curation.screensaver, curation.jokes.touchGrass, curation.jokes.gameNight];
    for (const h of handles) {
      expect(cat.byHandle.has(h), h).toBe(true);
      expect((assetsManifest.products as Record<string, unknown>)[h], h).toBeTruthy();
    }
    for (const c of assetsManifest.camera) expect(cat.byHandle.has(c.handle), c.handle).toBe(true);
    for (const h of Object.keys(assetsManifest.thumbs)) expect(cat.byHandle.has(h), h).toBe(true);
  });

  it('menus, folders and buddies only reference synced collections', () => {
    const all = [...MENU.map((m) => m.collection).filter(Boolean), ...BUDDIES.map((b) => b.collection)] as string[];
    const walk = (f: typeof WARDROBE): string[] => f.flatMap((x) => [x.collection, ...walk(x.children ?? [])]);
    for (const h of [...all, ...walk(WARDROBE)]) expect(cat.collections.has(h), h).toBe(true);
  });

  it('store directory is self-consistent', () => {
    expect(stores.stores.length).toBe(stores.storeCount);
    for (const s of stores.stores) {
      expect(s.name).toBeTruthy();
      expect(s.address).toBeTruthy();
    }
    expect(assetsManifest.stores.length).toBeLessThanOrEqual(stores.storeCount);
  });
});

describe('search on the real snapshot', () => {
  const s = createSearcher(cat);
  it('tolerates typos (ceral → cereal)', () => {
    const r = s.search('ceral');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]!.title.toLowerCase()).toContain('cereal');
  });
  it.each(['cairo', 'pjoys', 'hoodie', 'socks', 'kids', 'jeans', 'black'])('finds %s', (q) => {
    expect(s.search(q).length).toBeGreaterThan(0);
  });
  it('an exact product name comes first', () => {
    const target = cat.byHandle.get(curation.hero)!;
    expect(s.search(target.title)[0]!.handle).toBe(target.handle);
  });
  it('cairo surfaces Cairo products first', () => {
    expect(s.search('cairo').slice(0, 5).every((p) => /cairo|kairo/i.test(p.title))).toBe(true);
  });
});
