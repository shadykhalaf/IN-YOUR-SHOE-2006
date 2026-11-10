/** Conversion pass: pure logic on the COMMITTED snapshot (no network, no timers). */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import indexFile from '../data/catalogue-index.json';
import { OFFERS, SINGLE_WEEK_SAVINGS } from '../config/promotions';
import { collectionProducts, hydrate } from '../lib/catalogue/hydrate';
import type { IndexFile } from '../lib/catalogue/types';
import { frustration, shouldOffer, THRESHOLD, WINDOW_MS, type Signal } from '../lib/frustration';
import { isRage, RAGE, type Press } from '../lib/rageClicks';
import { activeOffers, cleanCode, savingsProgress } from '../lib/incentives';
import { buildShelves, HOME_SHELVES } from '../lib/merch';
import { upsell } from '../lib/upsell';
import { chartState, loadSizeCharts } from '../lib/sizeCharts';

const cat = hydrate(indexFile as unknown as IndexFile);

describe('no free shipping anywhere', () => {
  const root = resolve(__dirname, '../..');
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) return n === 'tests' ? [] : files(p);
      return /\.(tsx?|css|html|json|svg)$/.test(n) ? [p] : [];
    });
  it('no screen, line of copy or setting offers or mentions free shipping', () => {
    const hits = [...files(resolve(root, 'src')), resolve(root, 'index.html')].filter((f) => /free[\s_-]*ship/i.test(strip(readFileSync(f, 'utf8'))));
    expect(hits).toEqual([]);
  });
});

describe('Single Week savings (the spend-more-save-more steps from the inyourshoe.com cart)', () => {
  const offer = SINGLE_WEEK_SAVINGS!;
  const now = Date.parse('2026-11-12T12:00:00+02:00');
  const cairo = (ms: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ms).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  };
  it('the configured steps are the ones read on the live cart, ending 15 Nov 2026 at 12:12 Egypt time', () => {
    expect(offer).toMatchObject({ title: 'YOUR SINGLE WEEK SAVINGS', verifiedOn: '2026-11-10', endsAt: '2026-11-15T12:12:00+02:00' });
    expect(offer.tiers.map((t) => [t.minEGP, t.saveEGP])).toEqual([[2222, 1111], [4444, 2222], [6666, 3333], [8888, 4444]]);
    expect(new Date(offer.endsAt).toISOString()).toBe('2026-11-15T10:12:00.000Z');
    expect(cairo(Date.parse(offer.endsAt))).toBe('2026-11-15 12:12');
  });
  it('the screenshot’s 2,648 EGP bag: 1,111 saved so far, 1,796 more to save 2,222 in total', () => {
    const sp = savingsProgress(2648, offer, now);
    expect(sp).toMatchObject({ kind: 'progress', saved: 1111, remaining: 1796, next: { minEGP: 4444, saveEGP: 2222 } });
    if (sp.kind !== 'progress') throw new Error('expected progress');
    expect(sp.steps.map((s) => [s.minEGP, s.saveEGP, s.pct, s.reached])).toEqual([[4444, 2222, 59, false], [6666, 3333, 0, false], [8888, 4444, 0, false]]);
  });
  it('below the first step, the bar starts at it', () => {
    const sp = savingsProgress(1000, offer, now);
    expect(sp).toMatchObject({ kind: 'progress', saved: 0, remaining: 1222, next: { minEGP: 2222, saveEGP: 1111 } });
    if (sp.kind !== 'progress') throw new Error('expected progress');
    expect(sp.steps.map((s) => [s.minEGP, s.pct])).toEqual([[2222, 45], [4444, 0], [6666, 0]]);
  });
  it('reaching a step’s minimum counts', () => {
    const sp = savingsProgress(4444, offer, now);
    expect(sp).toMatchObject({ kind: 'progress', saved: 2222, remaining: 2222, next: { minEGP: 6666, saveEGP: 3333 } });
    if (sp.kind !== 'progress') throw new Error('expected progress');
    expect(sp.steps.map((s) => [s.minEGP, s.pct, s.reached])).toEqual([[4444, 100, true], [6666, 0, false], [8888, 0, false]]);
  });
  it('past the last step: the most there is to save, every step full', () => {
    const sp = savingsProgress(9000, offer, now);
    expect(sp).toMatchObject({ kind: 'max', saved: 4444 });
    if (sp.kind !== 'max') throw new Error('expected max');
    expect(sp.steps.map((s) => [s.minEGP, s.pct, s.reached])).toEqual([[4444, 100, true], [6666, 100, true], [8888, 100, true]]);
  });
  it('ends at 12:12 Egypt time on 15 Nov exactly, the same moment for every visitor', () => {
    expect(savingsProgress(2648, offer, Date.parse('2026-11-15T12:11:59+02:00')).kind).toBe('progress');
    expect(savingsProgress(2648, offer, Date.parse('2026-11-15T12:12:00+02:00'))).toEqual({ kind: 'hidden', reason: 'not-current' });
    // the same two moments, written in other time zones
    expect(savingsProgress(2648, offer, Date.parse('2026-11-15T11:11:59+01:00')).kind).toBe('progress');
    expect(savingsProgress(2648, offer, Date.parse('2026-11-15T10:12:00Z')).kind).toBe('hidden');
    expect(savingsProgress(2648, offer, Date.parse('2026-11-16T09:00:00+02:00')).kind).toBe('hidden');
  });
  it('no offer, an empty bag, before an exact start, or an unreadable end: nothing is shown', () => {
    expect(savingsProgress(2648, null, now)).toEqual({ kind: 'hidden', reason: 'no-offer' });
    expect(savingsProgress(0, offer, now)).toEqual({ kind: 'hidden', reason: 'empty' });
    const later = { ...offer, startsAt: '2026-11-13T00:00:00+02:00' };
    expect(savingsProgress(2648, later, now).kind).toBe('hidden');
    expect(savingsProgress(2648, later, Date.parse('2026-11-13T00:00:00+02:00')).kind).toBe('progress');
    expect(savingsProgress(2648, { ...offer, endsAt: 'not a date' }, now).kind).toBe('hidden');
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
