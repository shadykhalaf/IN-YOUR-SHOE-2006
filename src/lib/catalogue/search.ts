import Fuse, { type IFuseOptions } from 'fuse.js';
import { bridgeSearch, explain, needsBridge, productText, understand } from './arabic';
import type { Catalogue, Product } from './types';

interface Doc {
  p: Product;
  title: string;
  type: string;
  collections: string;
  tags: string;
}

export const FUSE_OPTIONS: IFuseOptions<Doc> = {
  keys: [
    { name: 'title', weight: 0.62 },
    { name: 'type', weight: 0.18 },
    { name: 'collections', weight: 0.1 },
    { name: 'tags', weight: 0.1 },
  ],
  threshold: 0.34,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
};

export interface Searcher {
  search(q: string): Product[];
  /** For Arabic / Franco queries: what the search understood (e.g. ["hoodie", "black"]); null for plain English. */
  explain(q: string): string[] | null;
}

/** Build once per catalogue; ~1k docs index in a few ms. */
export function createSearcher(cat: Catalogue): Searcher {
  const docs: Doc[] = cat.products.map((p) => ({
    p,
    title: p.title,
    type: p.productType ?? '',
    collections: p.collections.map((h) => cat.collections.get(h)?.title ?? h.replace(/-/g, ' ')).join(' '),
    tags: p.tags,
  }));
  const fuse = new Fuse(docs, FUSE_OPTIONS);
  const fuzzy = (query: string) => {
    // Exact (case-insensitive) title containment always wins, then fuzzy order.
    const lower = query.toLowerCase();
    const results = fuse.search(query);
    const exact = results.filter((r) => r.item.title.toLowerCase().includes(lower));
    const rest = results.filter((r) => !r.item.title.toLowerCase().includes(lower));
    return [...exact, ...rest].map((r) => r.item.p);
  };
  let texts: Map<Product, string> | null = null;
  return {
    search(q: string) {
      const query = normalizeQuery(q);
      if (!query) return [];
      // Plain English keeps the original search exactly; Arabic / Franco goes through the lexicon bridge.
      if (!needsBridge(query)) return fuzzy(query);
      const u = understand(query);
      if (u.concepts.length || u.size) {
        texts ??= new Map(cat.products.map((p) => [p, productText(cat, p)]));
        return bridgeSearch(cat, u, texts);
      }
      // Nothing understood: only the Latin words (if any) are searched; unknown Arabic is never guessed.
      return u.words.length ? fuzzy(u.words.join(' ')) : [];
    },
    explain(q: string) {
      const query = normalizeQuery(q);
      return query && needsBridge(query) ? explain(understand(query)) : null;
    },
  };
}

export const normalizeQuery = (q: string) => q.replace(/\s+/g, ' ').trim().slice(0, 80);

let pending: Promise<Searcher> | null = null;
let forCat: Catalogue | null = null;
/** Lazily builds (and caches) the searcher for a catalogue. */
export function getSearcher(cat: Catalogue): Promise<Searcher> {
  if (!pending || forCat !== cat) {
    forCat = cat;
    pending = Promise.resolve(createSearcher(cat));
  }
  return pending;
}
