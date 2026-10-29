/**
 * Search assistance on the COMMITTED snapshot (no network): suggestions while
 * typing (English, Egyptian Arabic, Franco, mixed) and the empty-box FRESH
 * PICKS. Every suggestion must come from the real catalogue: no invented
 * terms, collections or products, nothing ranked by made-up popularity.
 */
import { describe, expect, it } from 'vitest';
import indexFile from '../data/catalogue-index.json';
import { CONCEPTS, completeWord, normalizeArabic, productText } from '../lib/catalogue/arabic';
import { collectionProducts, hydrate } from '../lib/catalogue/hydrate';
import { CONCEPT_COLLECTION, createSuggester, isEmptyResult, SUGGEST_LIMITS, tokenize, type SuggestResult } from '../lib/catalogue/suggest';
import type { IndexFile, Product } from '../lib/catalogue/types';
import { freshPicks, SEARCH_SHORTCUTS, searchShortcuts } from '../lib/merch';

const cat = hydrate(indexFile as unknown as IndexFile);
const s = createSuggester(cat);
const words = (p: Product) => [...tokenize(p.title), ...tokenize(p.productType ?? '')];
/** Every typed word starts some word of the product (title or type). */
const carries = (p: Product, q: string) => tokenize(q).every((t) => words(p).some((w) => w.startsWith(t)));
const total = (r: SuggestResult) => r.terms.length + r.collections.length + r.products.length;
const conceptMatch = (id: string) => (p: Product) => CONCEPTS[id]!.match.test(productText(cat, p));

const ENGLISH = ['ho', 'hoo', 'hood', 'hoodie', 'overs', 'oversized ho', 'pj', 'fluffy', 'jea', 'black ho', 'cai', 'kid', 'zip', 'wide leg', 'sock', 'linen', 'cap', 'cereal'];
const ARABIC = ['هود', 'هودي', 'هوديز', 'تيشيرت', 'تي شيرت', 'تي ش', 'بنطلون', 'بنط', 'جينز', 'جاكيت', 'سويت شيرت', 'بلوفر', 'بيجامة', 'شراب', 'كاب', 'أسود', 'اسود', 'كحلي', 'رمادي', 'رجالي', 'حريمي', 'اوفر سايز', 'الهود', 'بنطلون اس', 'هودي bl', 'هودي black'];

describe('suggestions: real catalogue only', () => {
  it('every product suggested for an English query carries every typed word', () => {
    for (const q of ENGLISH) for (const p of s.suggest(q).products) expect(carries(p, q), `${q} → ${p.title}`).toBe(true);
  });

  it('every suggested English search term is a phrase real products carry (≥ 1 product, usually 3+)', () => {
    for (const q of ENGLISH)
      for (const t of s.suggest(q).terms) {
        const n = cat.products.filter((p) => carries(p, t.query)).length;
        expect(n, `${q} → "${t.query}"`).toBeGreaterThan(0);
        expect(t.query.startsWith(tokenize(q).join(' ').split(' ')[0]!)).toBe(true);
      }
  });

  it('collections offered exist, are not empty, and are never offered twice under one title', () => {
    for (const q of [...ENGLISH, ...ARABIC, 'trous', 'kids']) {
      const r = s.suggest(q);
      for (const c of r.collections) {
        const real = cat.collections.get(c.handle);
        expect(real, c.handle).toBeTruthy();
        expect(c.count).toBe(real!.count);
        expect(c.count).toBeGreaterThan(0);
      }
      expect(new Set(r.collections.map((c) => c.title)).size).toBe(r.collections.length);
    }
  });

  it('stays small: ≤ 3 terms, ≤ 2 collections, ≤ 4 products, ≤ 8 rows in all', () => {
    for (const q of [...ENGLISH, ...ARABIC]) {
      const r = s.suggest(q);
      expect(r.terms.length).toBeLessThanOrEqual(SUGGEST_LIMITS.terms);
      expect(r.collections.length).toBeLessThanOrEqual(SUGGEST_LIMITS.collections);
      expect(r.products.length).toBeLessThanOrEqual(SUGGEST_LIMITS.products);
      expect(total(r)).toBeLessThanOrEqual(SUGGEST_LIMITS.total);
    }
  });

  it('one letter, nonsense and unknown Arabic suggest nothing (never guessed)', () => {
    for (const q of ['h', 'ه', 'zzzq', 'xqzv', 'قطة', 'سمكة']) expect(isEmptyResult(s.suggest(q)), q).toBe(true);
  });
});

describe('suggestions: English', () => {
  it('"hoo" → HOODIES and real hoodies', () => {
    const r = s.suggest('hoo');
    expect(r.collections[0]?.handle).toBe('hoodies');
    expect(r.products.length).toBeGreaterThan(0);
    for (const p of r.products) expect(p.title.toLowerCase()).toContain('hoodie');
  });

  it('a short prefix ranks the likeliest completion first ("ho" → hoodies, "jea" → jeans)', () => {
    for (const p of s.suggest('ho').products) expect(p.title.toLowerCase()).toContain('hoodie');
    for (const p of s.suggest('jea').products) expect(p.title.toLowerCase()).toMatch(/\bjeans\b/);
  });

  it('"overs" completes to oversized / oversized tee / oversized hoodie', () => {
    expect(s.suggest('overs').terms.map((t) => t.query)).toEqual(['oversized', 'oversized tee', 'oversized hoodie']);
    expect(s.suggest('oversized ho').terms.map((t) => t.query)).toContain('oversized hoodie');
  });

  it('an exact product title comes first and says so', () => {
    const p = cat.byHandle.get('dropout-oversized-hoodie')!;
    const r = s.suggest(p.title);
    expect(r.products[0]?.handle).toBe(p.handle);
    expect(r.exact).toBe(true);
    expect(s.suggest('hoodie').exact).toBe(false);
  });

  it('synonyms the lexicon already knows lead to the real category ("trous" → PANTS, "pj" → PJOYS)', () => {
    expect(s.suggest('trous').collections.map((c) => c.handle)).toContain('pants');
    expect(s.suggest('pj').collections.map((c) => c.handle)).toContain('pjoys');
    expect(s.suggest('cai').collections.map((c) => c.handle)).toContain('cairo');
  });

  it('a Franco word being typed completes to the word IYS understands', () => {
    expect(s.suggest('bantal').terms[0]).toMatchObject({ query: 'bantalon', understood: 'pants' });
  });
});

describe('suggestions: Egyptian Arabic and mixed', () => {
  it('every directive word is understood and leads to real matching products', () => {
    const cases: [string, string][] = [
      ['هودي', 'hoodie'], ['هوديز', 'hoodie'], ['تيشيرت', 'tee'], ['تي شيرت', 'tee'], ['بنطلون', 'pants'], ['جينز', 'jeans'], ['جاكيت', 'jacket'], ['سويت شيرت', 'sweatshirt'],
      ['بلوفر', 'pullover'], ['بيجامة', 'pjoys'], ['شراب', 'socks'], ['كاب', 'cap'], ['أسود', 'black'], ['اسود', 'black'], ['كحلي', 'navy'], ['رمادي', 'grey'], ['رجالي', 'men'], ['حريمي', 'women'], ['اوفر سايز', 'oversized'],
    ];
    for (const [q, concept] of cases) {
      const r = s.suggest(q);
      expect(r.understood, q).toContain(CONCEPTS[concept]!.label);
      expect(r.products.length, q).toBeGreaterThan(0);
      for (const p of r.products) expect(conceptMatch(concept)(p), `${q} → ${p.title}`).toBe(true);
      const col = CONCEPT_COLLECTION[concept];
      if (col && (cat.collections.get(col)?.count ?? 0) > 0) expect(r.collections.map((c) => c.handle), q).toContain(col);
    }
  });

  it('completes Arabic as it is typed: هود → هودي, تي ش → تي شيرت, بنط → بنطلون, الهود → الهودي', () => {
    expect(s.suggest('هود').terms[0]).toMatchObject({ query: 'هودي', understood: 'hoodie' });
    expect(s.suggest('تي ش').terms.map((t) => t.query)).toEqual(['تي شيرت']);
    expect(s.suggest('بنط').terms[0]?.query).toBe('بنطلون');
    expect(s.suggest('الهود').terms[0]?.query).toBe('الهودي');
    expect(s.suggest('بنطلون اس').terms[0]).toMatchObject({ query: 'بنطلون اسود', understood: 'black' });
  });

  it('Alef forms, diacritics and tatweel give the same suggestions', () => {
    const base = s.suggest('اسود').products.map((p) => p.handle);
    expect(s.suggest('أسود').products.map((p) => p.handle)).toEqual(base);
    const fatha = String.fromCharCode(0x64e);
    const tatweel = String.fromCharCode(0x640);
    expect(s.suggest(`هو${fatha}د${tatweel}ي`).products.map((p) => p.handle)).toEqual(s.suggest('هودي').products.map((p) => p.handle));
  });

  it('mixed Arabic + English: هودي black → black hoodies; هودي bl → هودي black / هودي blue', () => {
    for (const p of s.suggest('هودي black').products) expect(conceptMatch('hoodie')(p) && conceptMatch('black')(p), p.title).toBe(true);
    expect(s.suggest('هودي bl').terms.map((t) => t.query)).toEqual(['هودي black', 'هودي blue']);
  });

  it('completeWord never returns the prefix itself and keeps one spelling per concept', () => {
    expect(completeWord('هود')).toEqual([{ word: 'هودي', concept: 'hoodie' }]);
    expect(completeWord('bant')[0]).toEqual({ word: 'bantalon', concept: 'pants' });
    for (const p of ['هود', 'بن', 'جا', 'bla', 'pyj']) {
      const out = completeWord(p);
      expect(new Set(out.map((o) => o.concept)).size).toBe(out.length);
      for (const o of out) expect(normalizeArabic(o.word)).not.toBe(normalizeArabic(p));
    }
  });
});

describe('suggestions: speed', () => {
  it('builds in well under a quarter second and answers each keystroke in milliseconds', () => {
    const t0 = performance.now();
    const fresh = createSuggester(cat);
    expect(performance.now() - t0).toBeLessThan(250);
    const qs = [...ENGLISH, ...ARABIC];
    const t1 = performance.now();
    for (const q of qs) fresh.suggest(q);
    expect((performance.now() - t1) / qs.length).toBeLessThan(10);
  });
});

describe('FRESH PICKS 4 U (empty search)', () => {
  const picks = freshPicks(cat, 6);
  const newest = collectionProducts(cat, 'newest');

  it('six real, in-stock, priced, photographed products from IYS’s own NEW DROPS, in IYS’s order', () => {
    expect(picks).toHaveLength(6);
    for (const p of picks) {
      expect(cat.byHandle.get(p.handle)).toBe(p);
      expect(p.available).toBe(true);
      expect(p.price).toBeGreaterThan(0);
      expect(p.image).toMatch(/^https:\/\//);
      expect(newest).toContain(p);
    }
    const order = picks.map((p) => newest.indexOf(p));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(freshPicks(cat, 6).map((p) => p.handle)).toEqual(picks.map((p) => p.handle));
  });

  it('one of each kind (no two hoodies), the first of its kind in NEW DROPS', () => {
    expect(new Set(picks.map((p) => p.productType)).size).toBe(picks.length);
    expect(picks[0]).toBe(newest.find((p) => p.available === true && p.price !== null && p.image && /\bhoodies?\b/.test(`${p.title} ${p.productType}`.toLowerCase())));
  });

  it('category shortcuts are IYS’s own collections, with their real counts', () => {
    const shortcuts = searchShortcuts(cat);
    expect(shortcuts.length).toBeGreaterThanOrEqual(6);
    for (const c of shortcuts) {
      expect(SEARCH_SHORTCUTS).toContain(c.handle);
      expect(c.count).toBe(cat.collections.get(c.handle)!.count);
      expect(c.count).toBeGreaterThan(0);
    }
  });
});
