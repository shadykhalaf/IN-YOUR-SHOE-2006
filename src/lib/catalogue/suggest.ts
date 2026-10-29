/**
 * Search assistance: what to suggest while someone types, built only from the
 * real catalogue (titles, product types, IYS's own collections) and the
 * existing Egyptian Arabic / Franco lexicon (arabic.ts). No network, no AI, no
 * popularity data: nothing is ranked as "trending", every product shown really
 * matches what was typed, and English results stay the original search's.
 *
 * Built once per catalogue (a few ms), then each keystroke is a scan of a
 * small vocabulary plus one pass over ~1.2k pre-tokenised titles (well under
 * 2 ms). Product detail shards are never loaded for suggestions.
 */
import { bridgeSearch, CONCEPTS, completeWord, explain, isKnownWord, needsBridge, normalizeArabic, productText, understand } from './arabic';
import type { Catalogue, Product } from './types';

export interface TermSuggestion {
  kind: 'term';
  /** The search this runs (what is shown, too). */
  query: string;
  /** What IYS understands it as, for Arabic / Franco words ("hoodie"); null for plain English. */
  understood: string | null;
}
export interface CollectionSuggestion {
  kind: 'collection';
  handle: string;
  /** Official collection title from the synced catalogue. */
  title: string;
  count: number;
}
export interface SuggestResult {
  query: string;
  terms: TermSuggestion[];
  collections: CollectionSuggestion[];
  products: Product[];
  /** For Arabic / Franco queries: what was understood (as on the results page); null for English. */
  understood: string[] | null;
  /** The first product's title is exactly what was typed: show products first. */
  exact: boolean;
}

export const SUGGEST_LIMITS = { terms: 3, collections: 2, products: 4, total: 8 } as const;

/** Words that never start a suggestion on their own ("the", "and", "x"…). */
const STOP = new Set(['the', 'and', 'of', 'for', 'a', 'an', 'in', 'on', 'with', 'x', 'by', 'to', 'u', 'ur', 'my', 'is', 'it', 'its', 'or']);
/** A phrase must appear in at least this many real product titles / types to be suggested. */
const MIN_PRODUCTS = 3;
/** Collections that are not a meaningful place to send someone from a search. */
const SKIP_COLLECTIONS = new Set(['all-products']);

/** Category / audience concepts → IYS's own collection for them (only shown when it exists and is non-empty). */
export const CONCEPT_COLLECTION: Record<string, string> = {
  hoodie: 'hoodies',
  tee: 't-shirts',
  pants: 'pants',
  jeans: 'jeans',
  sweatshirt: 'crewnecks',
  pullover: 'knitwear',
  jacket: 'jackets-sweaters',
  dress: 'all-dresses',
  pjoys: 'pjoys',
  socks: 'all-socks',
  cap: 'hats-caps',
  slippers: 'pantoufles',
  shorts: 'shorts',
  shirt: 'shirts',
  skirt: 'skirts',
  bag: 'all-bags',
  boxer: 'boxer-shorts',
  leggings: 'leggings',
  set: 'bundles',
  men: 'men',
  women: 'women',
  kids: 'all-kids-products',
};

/** Lowercased word tokens (Arabic normalised as in search), hyphenated words kept whole. */
export function tokenize(s: string): string[] {
  return normalizeArabic(s)
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter(Boolean);
}
/** "Zip-Up Hoodies" and "zip up hoodie" are the same suggestion. */
const variantKey = (phrase: string) =>
  phrase
    .replace(/-/g, ' ')
    .split(' ')
    .map((w) => (w.length > 3 ? w.replace(/s$/, '') : w))
    .join(' ');

interface Entry {
  text: string;
  count: number;
}
interface IndexedProduct {
  p: Product;
  title: string;
  words: string[];
  typeWords: string[];
}
interface IndexedCollection {
  handle: string;
  title: string;
  count: number;
  words: string[];
}

export interface Suggester {
  suggest(q: string): SuggestResult;
}

function buildVocabulary(products: IndexedProduct[]): Entry[] {
  const seen = new Map<string, Set<number>>();
  const add = (phrase: string, i: number) => {
    const s = seen.get(phrase) ?? new Set<number>();
    s.add(i);
    seen.set(phrase, s);
  };
  products.forEach(({ words, typeWords }, i) => {
    for (let a = 0; a < words.length; a++) {
      if (STOP.has(words[a]!) || /^\d+$/.test(words[a]!)) continue;
      for (let n = 1; n <= 3 && a + n <= words.length; n++) {
        const gram = words.slice(a, a + n);
        if (STOP.has(gram[gram.length - 1]!)) continue;
        if (n === 1 && gram[0]!.length < 2) continue;
        add(gram.join(' '), i);
      }
    }
    if (typeWords.length) add(typeWords.join(' '), i);
  });
  let entries = [...seen].map(([text, s]) => ({ text, count: s.size })).filter((e) => e.count >= MIN_PRODUCTS);
  // one spelling per variant (zip-up hoodie / zip up hoodies): the most common
  const best = new Map<string, Entry>();
  for (const e of entries) {
    const k = variantKey(e.text);
    const b = best.get(k);
    if (!b || e.count > b.count || (e.count === b.count && e.text.length < b.text.length)) best.set(k, e);
  }
  entries = [...best.values()];
  // a half phrase ("oversized long") gives way to the phrase it almost always continues into ("oversized long sleeves")
  const longest = new Map<string, number>();
  for (const e of entries) {
    const cut = e.text.lastIndexOf(' ');
    if (cut > 0) longest.set(e.text.slice(0, cut), Math.max(longest.get(e.text.slice(0, cut)) ?? 0, e.count));
  }
  entries = entries.filter((e) => (longest.get(e.text) ?? 0) < 0.8 * e.count);
  return entries.sort((a, b) => b.count - a.count || a.text.length - b.text.length);
}

/** Every query word is the start of some word in `words` (word-prefix AND match). */
const matchesAll = (qw: string[], words: string[]) => qw.every((t) => words.some((w) => w.startsWith(t)));

export function createSuggester(cat: Catalogue): Suggester {
  const products: IndexedProduct[] = cat.products.map((p) => ({ p, title: tokenize(p.title).join(' '), words: tokenize(p.title), typeWords: tokenize(p.productType ?? '') }));
  const vocab = buildVocabulary(products);
  /** How many products carry each title word: a prefix ranks the products whose word is the likeliest completion ("ho" → hoodie) first. */
  const wordFreq = new Map<string, number>();
  for (const ip of products) for (const w of new Set(ip.words)) wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
  const collections: IndexedCollection[] = [...cat.collections.values()]
    .filter((c) => c.count > 0 && !SKIP_COLLECTIONS.has(c.handle))
    .map((c) => ({ handle: c.handle, title: (c.title ?? c.handle.replace(/-/g, ' ')).toUpperCase(), count: c.count, words: [...tokenize(c.title ?? ''), ...c.handle.split('-')] }));
  const byHandle = new Map(collections.map((c) => [c.handle, c]));
  let texts: Map<Product, string> | null = null;

  const collectionFor = (concept: string) => {
    const h = CONCEPT_COLLECTION[concept];
    return h ? byHandle.get(h) : undefined;
  };
  const asSuggestion = (c: IndexedCollection): CollectionSuggestion => ({ kind: 'collection', handle: c.handle, title: c.title, count: c.count });

  function rankProducts(qn: string, qw: string[]): Product[] {
    if (qn.length < 2) return [];
    const scored: { p: Product; score: number }[] = [];
    for (const ip of products) {
      let score = 0;
      let ok = true;
      for (const t of qw) {
        let at = -1;
        let freq = 0;
        ip.words.forEach((w, i) => {
          const f = w.startsWith(t) ? wordFreq.get(w) ?? 0 : -1;
          if (f > freq || (at < 0 && f >= 0)) (at = i), (freq = Math.max(f, 0));
        });
        if (at >= 0) {
          score += (ip.words[at] === t ? 30 : 20) + Math.max(0, 5 - at) + 10 * Math.log10(1 + freq);
          continue;
        }
        if (t.length >= 3 && ip.typeWords.some((w) => w.startsWith(t))) {
          score += 8;
          continue;
        }
        ok = false;
        break;
      }
      if (!ok) continue;
      if (ip.title === qn) score += 1000;
      // "dropout ov…" → Dropout Oversized Hoodie; too short a prefix ("ho") says nothing about which title
      else if (qn.length >= 4 && ip.title.startsWith(qn)) score += 300;
      if (ip.p.available === true) score += 2;
      scored.push({ p: ip.p, score });
    }
    return scored
      .sort((a, b) => b.score - a.score || a.p.index - b.p.index)
      .slice(0, SUGGEST_LIMITS.products)
      .map((s) => s.p);
  }

  function englishTerms(qn: string, qw: string[], taken: Set<string>): TermSuggestion[] {
    const out: TermSuggestion[] = [];
    const push = (text: string) => {
      const k = variantKey(text);
      if (out.length >= SUGGEST_LIMITS.terms || taken.has(k) || text === qn) return;
      taken.add(k);
      out.push({ kind: 'term', query: text, understood: null });
    };
    for (const e of vocab) if (e.text.startsWith(qn)) push(e.text);
    // "black hoo" → "black hoodie", only when real products carry every word
    if (out.length < SUGGEST_LIMITS.terms && qw.length > 1) {
      const head = qw.slice(0, -1).join(' ');
      const last = qw[qw.length - 1]!;
      for (const e of vocab) {
        if (out.length >= SUGGEST_LIMITS.terms) break;
        if (e.text.includes(' ') || !e.text.startsWith(last) || e.text === last) continue;
        const phrase = `${head} ${e.text}`;
        const words = phrase.split(' ');
        let n = 0;
        for (const ip of products) if (matchesAll(words, ip.words) && ++n >= 2) break;
        if (n >= 2) push(phrase);
      }
    }
    return out;
  }

  function englishCollections(qn: string, qw: string[]): IndexedCollection[] {
    const hits = collections.filter((c) => matchesAll(qw, c.words));
    // synonyms the lexicon already knows ("trousers" → PANTS, "tee" → T-SHIRTS)
    for (const w of qw) {
      const concept = understand(w).concepts[0] ?? (w.length >= 3 ? completeWord(w, 1)[0]?.concept : undefined);
      const c = concept ? collectionFor(concept) : undefined;
      if (c && !hits.includes(c)) hits.push(c);
    }
    return uniqueTitles(hits.sort((a, b) => Number(b.title.toLowerCase().startsWith(qn)) - Number(a.title.toLowerCase().startsWith(qn)) || b.count - a.count)).slice(0, SUGGEST_LIMITS.collections);
  }
  /** Two IYS collections can share a title ("KIDS"): offer the bigger one only. */
  function uniqueTitles(list: IndexedCollection[]): IndexedCollection[] {
    const best = new Map<string, IndexedCollection>();
    for (const c of list) if (!best.has(c.title) || best.get(c.title)!.count < c.count) best.set(c.title, c);
    return list.filter((c) => best.get(c.title) === c);
  }

  function bridged(q: string, qw: string[], trailingSpace: boolean): SuggestResult {
    const terms: TermSuggestion[] = [];
    let search = qw.join(' ');
    const last = qw[qw.length - 1]!;
    const pair = qw.length > 1 ? `${qw[qw.length - 2]} ${last}` : null;
    if (!trailingSpace && !isKnownWord(last) && !(pair && isKnownWord(pair))) {
      // complete a two-word phrase ("تي ش" → "تي شيرت"), else the last word once it has 2+ letters
      const phrases = pair ? completeWord(pair).map((c) => ({ ...c, drop: 2 })) : [];
      const options = phrases.length ? phrases : last.length >= 2 ? completeWord(last).map((c) => ({ ...c, drop: 1 })) : [];
      const used = new Set<string>();
      for (const o of options) {
        if (terms.length >= SUGGEST_LIMITS.terms || used.has(o.concept)) continue;
        used.add(o.concept);
        const query = [...qw.slice(0, qw.length - o.drop), o.word].join(' ');
        terms.push({ kind: 'term', query, understood: CONCEPTS[o.concept]?.label ?? o.concept });
      }
      if (terms[0]) search = terms[0].query;
    }
    const u = understand(search);
    texts ??= new Map(cat.products.map((p) => [p, productText(cat, p)]));
    const found = u.concepts.length || u.size ? bridgeSearch(cat, u, texts) : [];
    const cols: IndexedCollection[] = [];
    for (const c of u.concepts) {
      const col = collectionFor(c);
      if (col && !cols.includes(col)) cols.push(col);
    }
    return { query: q, terms, collections: uniqueTitles(cols).slice(0, SUGGEST_LIMITS.collections).map(asSuggestion), products: found.slice(0, SUGGEST_LIMITS.products), understood: explain(u).length ? explain(u) : null, exact: false };
  }

  return {
    suggest(raw: string): SuggestResult {
      const q = raw.replace(/\s+/g, ' ').trimStart().slice(0, 80);
      const qw = tokenize(q);
      const empty: SuggestResult = { query: q.trim(), terms: [], collections: [], products: [], understood: null, exact: false };
      // one letter is too little to suggest anything worth reading
      if (!qw.length || qw.join(' ').length < 2) return empty;
      const trailingSpace = /\s$/.test(q);
      let result: SuggestResult;
      if (needsBridge(q)) result = bridged(q.trim(), qw, trailingSpace);
      else {
        const qn = qw.join(' ');
        const cols = englishCollections(qn, qw);
        const taken = new Set(cols.map((c) => variantKey(c.title.toLowerCase())));
        const terms = trailingSpace ? [] : englishTerms(qn, qw, taken);
        // a Franco word being typed ("bantal…") completes to the word IYS understands
        if (!terms.length && !trailingSpace && qw.length === 1) {
          for (const c of completeWord(qw[0]!)) if (terms.length < SUGGEST_LIMITS.terms && needsBridge(c.word)) terms.push({ kind: 'term', query: c.word, understood: CONCEPTS[c.concept]?.label ?? c.concept });
        }
        const found = rankProducts(qn, qw);
        result = { query: q.trim(), terms, collections: cols.map(asSuggestion), products: found, understood: null, exact: Boolean(found[0]) && tokenize(found[0]!.title).join(' ') === qn };
      }
      // never more than SUGGEST_LIMITS.total rows: products give way first, then terms
      let over = result.terms.length + result.collections.length + result.products.length - SUGGEST_LIMITS.total;
      while (over > 0 && result.products.length > 2) (result.products = result.products.slice(0, -1)), over--;
      while (over > 0 && result.terms.length > 1) (result.terms = result.terms.slice(0, -1)), over--;
      return result;
    },
  };
}

const cache = new WeakMap<Catalogue, Suggester>();
/** Builds (once per catalogue) and returns the suggester. */
export function getSuggester(cat: Catalogue): Suggester {
  let s = cache.get(cat);
  if (!s) {
    s = createSuggester(cat);
    cache.set(cat, s);
  }
  return s;
}

export const isEmptyResult = (r: SuggestResult) => !r.terms.length && !r.collections.length && !r.products.length;
