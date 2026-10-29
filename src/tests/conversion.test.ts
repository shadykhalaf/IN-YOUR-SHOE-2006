/** Conversion pass: pure logic on the COMMITTED snapshot (no network, no timers). */
import { describe, expect, it } from 'vitest';
import indexFile from '../data/catalogue-index.json';
import { FREE_SHIPPING, OFFERS, type FreeShippingRule } from '../config/promotions';
import { collectionProducts, hydrate } from '../lib/catalogue/hydrate';
import type { IndexFile } from '../lib/catalogue/types';
import { frustration, shouldOffer, THRESHOLD, WINDOW_MS, type Signal } from '../lib/frustration';
import { isRage, RAGE, type Press } from '../lib/rageClicks';
import { activeOffers, cleanCode, shippingProgress } from '../lib/incentives';
import { buildShelves, HOME_SHELVES } from '../lib/merch';
import { upsell } from '../lib/upsell';
import { chartState, loadSizeCharts } from '../lib/sizeCharts';

const cat = hydrate(indexFile as unknown as IndexFile);
const RULE: FreeShippingRule = { overEGP: 3999, source: 'test', sourceUrl: 'https://inyourshoe.com/', verifiedOn: '2026-10-26', showUntil: '2026-11-25' };

describe('free-shipping progress (only from a verified merchant rule)', () => {
  it('the configured rule is the one read on the live store, with a re-verify date', () => {
    expect(FREE_SHIPPING).toMatchObject({ overEGP: 3999, verifiedOn: '2026-10-26' });
    expect(FREE_SHIPPING!.showUntil > FREE_SHIPPING!.verifiedOn).toBe(true);
  });
  it('progress below the threshold', () => {
    expect(shippingProgress(2799, RULE, '2026-10-26')).toEqual({ kind: 'progress', threshold: 3999, remaining: 1200, pct: 69 });
  });
  it('“over” means over: exactly 3,999 is not unlocked yet', () => {
    expect(shippingProgress(3999, RULE, '2026-10-26')).toMatchObject({ kind: 'progress', remaining: 0 });
    expect(shippingProgress(4000, RULE, '2026-10-26')).toEqual({ kind: 'unlocked', threshold: 3999 });
  });
  it('no rule, an empty bag, or a stale rule → nothing is claimed', () => {
    expect(shippingProgress(500, null, '2026-10-26')).toEqual({ kind: 'hidden', reason: 'no-rule' });
    expect(shippingProgress(0, RULE, '2026-10-26')).toEqual({ kind: 'hidden', reason: 'empty' });
    expect(shippingProgress(500, RULE, '2026-11-26')).toEqual({ kind: 'hidden', reason: 'stale' });
    expect(shippingProgress(500, RULE, '2026-10-25')).toEqual({ kind: 'hidden', reason: 'stale' });
    expect(shippingProgress(500, { ...RULE, overEGP: 0 }, '2026-10-26')).toEqual({ kind: 'hidden', reason: 'no-rule' });
  });
});

describe('offers and codes', () => {
  it('no offer is configured without merchant authorisation', () => {
    expect(OFFERS).toEqual([]);
  });
  it('offers respect their own date window', () => {
    const o = [{ id: 'a', title: 'A', source: 's', verifiedOn: '2026-10-01', startsOn: '2026-10-10', endsOn: '2026-10-20' }];
    expect(activeOffers(o, '2026-10-09')).toEqual([]);
    expect(activeOffers(o, '2026-10-15')).toHaveLength(1);
    expect(activeOffers(o, '2026-10-21')).toEqual([]);
  });
  it('codes: plain letters/digits/-/_ only, uppercased; everything else refused', () => {
    expect(cleanCode(' cool-10_x ')).toBe('COOL-10_X');
    for (const bad of ['', ' ', 'a b', 'x&y', 'é', '<s>', 'Z'.repeat(65)]) expect(cleanCode(bad)).toBeNull();
  });
});

describe('u might like these (deterministic upsell)', () => {
  const hoodie = collectionProducts(cat, 'hoodies').find((p) => p.available && p.price)!;
  const jeans = collectionProducts(cat, 'jeans').find((p) => p.available && p.price && !p.collections.includes('all-kids-products'))!;
  it('a top gets bottoms; nothing already in the bag; in stock; not pricier than 1.3×', () => {
    const r = upsell(cat, [hoodie.handle]);
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(3);
    for (const x of r) {
      // a bottom: in one of the rule's IYS collections (collab capsules sit outside all-bottoms)
      expect(x.product.collections.some((c) => ['pants', 'jeans', 'sweatpants', 'all-bottoms'].includes(c))).toBe(true);
      expect(x.product.handle).not.toBe(hoodie.handle);
      expect(x.product.available).toBe(true);
      expect(x.product.price!).toBeLessThanOrEqual(hoodie.price! * 1.3);
    }
  });
  it('a bottom gets tops', () => {
    expect(upsell(cat, [jeans.handle]).every((x) => x.product.collections.some((c) => ['t-shirts', 'hoodies', 'all-tops'].includes(c)))).toBe(true);
  });
  it('gendered pieces get same-audience or unisex ideas, never the other one', () => {
    const female = collectionProducts(cat, 'all-tops').find((p) => p.available && p.price && /^female /i.test(p.title))!;
    expect(upsell(cat, [female.handle]).some((x) => /^male /i.test(x.product.title))).toBe(false);
    const male = collectionProducts(cat, 'all-tops').find((p) => p.available && p.price && /^male /i.test(p.title))!;
    expect(upsell(cat, [male.handle]).some((x) => /^female /i.test(x.product.title))).toBe(false);
  });
  it('is deterministic and never repeats a pick', () => {
    const a = upsell(cat, [hoodie.handle, jeans.handle]);
    expect(upsell(cat, [hoodie.handle, jeans.handle])).toEqual(a);
    expect(new Set(a.map((x) => x.product.handle)).size).toBe(a.length);
    expect(a.some((x) => x.product.collections.some((c) => ['pants', 'jeans', 'sweatpants', 'all-bottoms'].includes(c))) && a.some((x) => x.product.collections.some((c) => ['t-shirts', 'hoodies', 'all-tops'].includes(c)))).toBe(true);
  });
  it('kids items only get kids ideas', () => {
    const kid = collectionProducts(cat, 'all-kids-products').find((p) => p.available && p.collections.includes('all-tops'));
    if (kid) expect(upsell(cat, [kid.handle]).every((x) => x.product.collections.includes('all-kids-products'))).toBe(true);
  });
  it('empty or unknown bag → no ideas', () => {
    expect(upsell(cat, [])).toEqual([]);
    expect(upsell(cat, ['no-such-handle'])).toEqual([]);
  });
});

describe('home shelves (IYS’s own collections)', () => {
  const newest = collectionProducts(cat, 'newest').slice(0, 6).map((p) => p.handle);
  const shelves = buildShelves(cat, HOME_SHELVES, { exclude: newest, per: 6 });
  it('several real shelves, each a real collection with its official title and count', () => {
    expect(shelves.length).toBeGreaterThanOrEqual(4);
    for (const s of shelves) {
      const c = cat.collections.get(s.handle)!;
      expect(s.title).toBe(c.title);
      expect(s.count).toBe(c.count);
      expect(s.products.every((p) => p.collections.includes(s.handle))).toBe(true);
    }
  });
  it('only in-stock items with price + photo, never repeated, never what JUST DROPPED shows', () => {
    const all = shelves.flatMap((s) => s.products);
    expect(all.every((p) => p.available === true && p.price !== null && p.image)).toBe(true);
    expect(new Set(all.map((p) => p.handle)).size).toBe(all.length);
    expect(all.some((p) => newest.includes(p.handle))).toBe(false);
  });
  it('a missing collection is skipped, not invented', () => {
    expect(buildShelves(cat, [{ collection: 'no-such-collection', note: 'x' }])).toEqual([]);
  });
});

describe('escape-route signal score', () => {
  const s = (kind: Signal['kind'], key: string, at: number): Signal => ({ kind, key, at });
  const t = 1_000_000;
  it('one 404 or one empty search never triggers', () => {
    expect(shouldOffer([s('not-found', '/a', t)], t)).toBe(false);
    expect(shouldOffer([s('no-results', 'x', t)], t)).toBe(false);
  });
  it('two genuine failures trigger', () => {
    expect(shouldOffer([s('not-found', '/a', t), s('not-found', '/b', t + 10)], t + 10)).toBe(true);
    expect(shouldOffer([s('checkout-error', 'x', t), s('no-results', 'q', t), s('no-results', 'r', t)], t)).toBe(true);
  });
  it('the same page / query twice counts once', () => {
    expect(frustration([s('not-found', '/a', t), s('not-found', '/a', t + 5)], t + 5)).toEqual({ score: 2, events: 1, rage: false });
    expect(shouldOffer([s('no-results', 'q', t), s('no-results', 'q', t), s('no-results', 'q', t), s('no-results', 'q', t)], t)).toBe(false);
  });
  it('old signals expire', () => {
    expect(frustration([s('not-found', '/a', t), s('not-found', '/b', t)], t + WINDOW_MS + 1).score).toBe(0);
    expect(THRESHOLD).toBe(4);
  });
});

describe('official size charts: the synced file matches what the guide reads', () => {
  it('every product points at a real chart image on an IYS/Shopify host; nothing typed in', async () => {
    const f = await loadSizeCharts();
    expect(f.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(f.notPublic)).toBe(true);
    for (const ids of Object.values(f.products)) for (const id of ids) expect(f.charts[id], id).toBeDefined();
    for (const c of Object.values(f.charts)) expect(new URL(c.src).hostname).toMatch(/^(inyourshoe\.com|cdn\.shopify\.com)$/);
  });
  it('found → the images; no chart → none (never estimated); 404 page → gone', async () => {
    const f = await loadSizeCharts();
    const [withChart] = Object.keys(f.products);
    expect(chartState(f, withChart!)).toMatchObject({ status: 'found' });
    expect(chartState(f, 'no-such-product-handle')).toMatchObject({ status: 'none', gone: false });
    const fake = { ...f, notPublic: ['gone-tee'] };
    expect(chartState(fake, 'gone-tee')).toMatchObject({ status: 'none', gone: true });
  });
});

describe('rage presses (repeated presses that change nothing)', () => {
  const at = (ms: number, x = 100, y = 100, print = 'same'): Press => ({ x, y, at: ms, print });
  it('4 presses in 2 s on the same spot with nothing changing → rage', () => {
    expect(RAGE).toEqual({ presses: 4, withinMs: 2000, radiusPx: 48 });
    expect(isRage([at(0), at(300), at(600), at(900)])).toBe(true);
    expect(isRage([at(0), at(500, 120, 110), at(1000, 90, 95), at(1900, 130, 70)])).toBe(true);
  });
  it('a double or triple click is not rage', () => {
    expect(isRage([at(0), at(150)])).toBe(false);
    expect(isRage([at(0), at(150), at(300)])).toBe(false);
  });
  it('slow presses, presses all over the screen, or presses that DID change something are not rage', () => {
    expect(isRage([at(0), at(800), at(1600), at(2400)])).toBe(false);
    expect(isRage([at(0), at(200, 300, 100), at(400), at(600)])).toBe(false);
    // each press changed what's on screen (quantity, next page, menu toggling...)
    expect(isRage([at(0, 100, 100, 'a'), at(200, 100, 100, 'b'), at(400, 100, 100, 'c'), at(600, 100, 100, 'd')])).toBe(false);
    expect(isRage([at(0, 100, 100, 'open'), at(200, 100, 100, 'closed'), at(400, 100, 100, 'open'), at(600, 100, 100, 'closed')])).toBe(false);
  });
  it('one rage burst is enough to offer the way out; one ordinary error still is not', () => {
    const t = 1_000_000;
    expect(shouldOffer([{ kind: 'rage-click', key: 'button:pick a size first :)', at: t }], t)).toBe(true);
    expect(shouldOffer([{ kind: 'not-found', key: '/x', at: t }], t)).toBe(false);
    expect(frustration([{ kind: 'rage-click', key: 'b', at: t }], t)).toEqual({ score: 4, events: 1, rage: true });
  });
});
