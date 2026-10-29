/**
 * Egyptian Arabic search on the COMMITTED snapshot (no network).
 * Invisible / combining characters are built with fromCharCode so this file
 * itself never hides them.
 */
import Fuse from 'fuse.js';
import { describe, expect, it } from 'vitest';
import indexFile from '../data/catalogue-index.json';
import { CONCEPTS, needsBridge, normalizeArabic, productText, understand } from '../lib/catalogue/arabic';
import { hydrate } from '../lib/catalogue/hydrate';
import { createSearcher, FUSE_OPTIONS } from '../lib/catalogue/search';
import type { IndexFile, Product } from '../lib/catalogue/types';

const cat = hydrate(indexFile as unknown as IndexFile);
const s = createSearcher(cat);
const ch = (...codes: number[]) => String.fromCharCode(...codes);
const TATWEEL = ch(0x640);
const FATHA = ch(0x64e);
const SHADDA = ch(0x651);
const ZWNJ = ch(0x200c);
const RLM = ch(0x200f);
const NBSP = ch(0xa0);
const text = (p: Product) => productText(cat, p);
const handles = (r: Product[]) => r.map((p) => p.handle);

/** The original (pre-Arabic) search, re-implemented verbatim, to prove English is unchanged. */
function originalSearch(q: string) {
  const docs = cat.products.map((p) => ({
    p,
    title: p.title,
    type: p.productType ?? '',
    collections: p.collections.map((h) => cat.collections.get(h)?.title ?? h.replace(/-/g, ' ')).join(' '),
    tags: p.tags,
  }));
  const fuse = new Fuse(docs, FUSE_OPTIONS);
  const query = q.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!query) return [];
  const lower = query.toLowerCase();
  const results = fuse.search(query);
  return [...results.filter((r) => r.item.title.toLowerCase().includes(lower)), ...results.filter((r) => !r.item.title.toLowerCase().includes(lower))].map((r) => r.item.p);
}

describe('normalizeArabic', () => {
  it('drops diacritics and tatweel', () => {
    expect(normalizeArabic(`ه${TATWEEL}${TATWEEL}ود${FATHA}ي`)).toBe('هودي');
    expect(normalizeArabic(`بن${SHADDA}طلون`)).toBe('بنطلون');
  });
  it('unifies alef, yeh / alef maqsura, teh marbuta, hamza seats', () => {
    expect(normalizeArabic('أسود')).toBe('اسود');
    expect(normalizeArabic('إبيض')).toBe('ابيض');
    expect(normalizeArabic('آ')).toBe('ا');
    expect(normalizeArabic('هودى')).toBe('هودي');
    expect(normalizeArabic('بيجامة')).toBe('بيجامه');
  });
  it('turns Arabic-Indic and Persian digits into 0-9', () => {
    expect(normalizeArabic('٢٤٩٩')).toBe('2499');
    expect(normalizeArabic('۳')).toBe('3');
  });
  it('collapses Unicode whitespace and strips invisible marks', () => {
    expect(normalizeArabic(`  هودي${NBSP}${NBSP}اسود${RLM} `)).toBe('هودي اسود');
    expect(normalizeArabic(`هو${ZWNJ}دي`)).toBe('هودي');
  });
  it('lowercases Latin and leaves it otherwise alone', () => {
    expect(normalizeArabic('Hoodie BLACK')).toBe('hoodie black');
  });
});

describe('English search is exactly the original search', () => {
  it.each(['hoodie', 'cairo', 'ceral', 'pjoys', 'socks', 'kids', 'jeans', 'black', 'black hoodie', 'tee', 'Cereal Killer PT.2 Hoodie', 'zip up'])('%s', (q) => {
    expect(needsBridge(q)).toBe(false);
    expect(s.explain(q)).toBeNull();
    expect(handles(s.search(q))).toEqual(handles(originalSearch(q)));
  });
});

describe('Egyptian Arabic shopping words', () => {
  const allMatch = (r: Product[], re: RegExp) => r.length > 0 && r.every((p) => re.test(text(p)));
  it('هودي finds every hoodie, and only hoodies', () => {
    const r = s.search('هودي');
    expect(allMatch(r, CONCEPTS.hoodie!.match)).toBe(true);
    expect(r.length).toBe(cat.products.filter((p) => CONCEPTS.hoodie!.match.test(text(p))).length);
    expect(s.explain('هودي')).toEqual(['hoodie']);
  });
  it.each(['هوديز', 'الهودي', 'هودى', `هـ${TATWEEL}ودي`])('%s = هودي', (q) => {
    expect(handles(s.search(q))).toEqual(handles(s.search('هودي')));
  });
  it('تي شيرت / تيشيرت / تشيرت are tees', () => {
    const a = s.search('تي شيرت');
    expect(allMatch(a, CONCEPTS.tee!.match)).toBe(true);
    expect(handles(s.search('تيشيرت'))).toEqual(handles(a));
    expect(handles(s.search('تشيرت'))).toEqual(handles(a));
  });
  it.each([
    ['بنطلون', 'pants'],
    ['بناطيل', 'pants'],
    ['جينز', 'jeans'],
    ['سويت شيرت', 'sweatshirt'],
    ['بلوفر', 'pullover'],
    ['جاكيت', 'jacket'],
    ['فستان', 'dress'],
    ['بيجامة', 'pjoys'],
    ['شراب', 'socks'],
    ['كاب', 'cap'],
    ['bantalon', 'pants'],
    ['bigama', 'pjoys'],
  ])('%s → %s', (q, concept) => {
    expect(understand(q).concepts).toEqual([concept]);
    expect(allMatch(s.search(q), CONCEPTS[concept]!.match)).toBe(true);
  });
  it('colours combine with a category (and alef spelling does not matter)', () => {
    const r = s.search('هودي أسود');
    expect(r.every((p) => /\bhoodies?\b/.test(text(p)) && /\bblack\b/.test(text(p)))).toBe(true);
    expect(r.length).toBeGreaterThan(0);
    expect(handles(s.search('هودي اسود'))).toEqual(handles(r));
    expect(s.explain('هودي أسود')).toEqual(['hoodie', 'black']);
  });
  it.each([
    ['ابيض', 'white'],
    ['أبيض', 'white'],
    ['كحلي', 'navy'],
    ['رمادي', 'grey'],
    ['رجالي', 'men'],
    ['حريمي', 'women'],
    ['واسع', 'wide'],
    ['أوفر سايز', 'oversized'],
  ])('%s → %s', (q, concept) => {
    expect(understand(q).concepts).toEqual([concept]);
    expect(s.search(q).length).toBeGreaterThan(0);
  });
  it('mixed Arabic / English input', () => {
    expect(handles(s.search('hoodie اسود'))).toEqual(handles(s.search('هودي اسود')));
    const r = s.search('هودي cairo');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => /\bhoodies?\b/.test(text(p)) && text(p).includes('cairo'))).toBe(true);
  });
  it('a size filters to products with that size really available', () => {
    const r = s.search('هودي مقاس L');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.sizes.some((z) => z.available && z.label.toUpperCase() === 'L'))).toBe(true);
  });
  it('titles that say it rank first, in stock before sold out', () => {
    const r = s.search('هودي');
    const firstOther = r.findIndex((p) => !/\bhoodies?\b/i.test(p.title));
    if (firstOther >= 0) expect(r.slice(firstOther).some((p) => /\bhoodies?\b/i.test(p.title))).toBe(false);
  });
});

describe('honest empty results and query safety', () => {
  it('something IYS does not sell → no products (never random ones)', () => {
    expect(s.search('جزمة')).toEqual([]);
    expect(s.explain('جزمة')).toEqual(['shoes']);
  });
  it('unknown Arabic is never guessed', () => {
    expect(s.search('كلمهغريبه')).toEqual([]);
  });
  it('empty and whitespace-only queries return nothing', () => {
    expect(s.search('')).toEqual([]);
    expect(s.search(`   ${NBSP} `)).toEqual([]);
  });
  it.each(['(((', '.*', '<script>alert(1)</script>', 'هودي ((( [', 'a'.repeat(5000), `هودي${'ا'.repeat(4000)}`])('does not throw on %s', (q) => {
    expect(() => s.search(q)).not.toThrow();
  });
});
