import { describe, expect, it } from 'vitest';
import indexFile from '../data/catalogue-index.json';
import { hydrate } from '../lib/catalogue/hydrate';
import type { IndexFile } from '../lib/catalogue/types';
import { bagIdeas, moreLikeThis, styleStem } from '../lib/recommend';
import { audience, isKids } from '../lib/upsell';

const cat = hydrate(indexFile as unknown as IndexFile);

describe('MORE LIKE THIS (every product page)', () => {
  it('every product in the catalogue gets at least 6 real, in-stock picks, never itself, no duplicates', () => {
    let fewest = Infinity;
    for (const p of cat.products) {
      const picks = moreLikeThis(cat, p.handle);
      fewest = Math.min(fewest, picks.length);
      const handles = picks.map((x) => x.product.handle);
      expect(handles, p.handle).not.toContain(p.handle);
      expect(new Set(handles).size, p.handle).toBe(handles.length);
      for (const x of picks) {
        expect(x.product.available && x.product.price !== null && Boolean(x.product.image), x.product.handle).toBe(true);
        expect(isKids(x.product), `${p.handle} → ${x.product.handle}`).toBe(isKids(p));
        const a = audience(p);
        if (a !== 'any') expect(['any', a], `${p.handle} → ${x.product.handle}`).toContain(audience(x.product));
      }
    }
    expect(fewest).toBeGreaterThanOrEqual(6);
  });
  it('puts the same style in another colour first, then IYS’s own narrow collections', () => {
    expect(styleStem('Blue & Navy Striped Daydreamer Boxy Long Sleeves')).toBe('striped daydreamer boxy long sleeves');
    const colourway = cat.products.find((p) => styleStem(p.title) && cat.products.filter((q) => styleStem(q.title) === styleStem(p.title) && q.available && q.image && q.price !== null).length >= 3)!;
    const picks = moreLikeThis(cat, colourway.handle);
    expect(picks[0]!.because).toBe('same style, other colour');
    expect(styleStem(picks[0]!.product.title)).toBe(styleStem(colourway.title));
    const ck = cat.products.find((p) => p.collections.includes('cereal-killer') && p.available)!;
    expect(moreLikeThis(cat, ck.handle).some((x) => x.product.collections.includes('cereal-killer'))).toBe(true);
  });
  it('is deterministic', () => {
    const h = cat.products[10]!.handle;
    expect(moreLikeThis(cat, h).map((x) => x.product.handle)).toEqual(moreLikeThis(cat, h).map((x) => x.product.handle));
  });
});

describe('MY BAG carousel', () => {
  const hoodie = cat.products.find((p) => p.collections.includes('hoodies') && p.available && !isKids(p))!;
  it('complements first (a hoodie → bottoms), then more like the bag, never what is in the bag', () => {
    const picks = bagIdeas(cat, [hoodie.handle]);
    expect(picks.length).toBeGreaterThanOrEqual(6);
    expect(picks.length).toBeLessThanOrEqual(10);
    expect(picks[0]!.because).toMatch(/^goes with ur/);
    expect(picks[0]!.product.collections.some((c) => ['pants', 'jeans', 'sweatpants', 'all-bottoms'].includes(c))).toBe(true);
    expect(picks.map((x) => x.product.handle)).not.toContain(hoodie.handle);
    expect(new Set(picks.map((x) => x.product.handle)).size).toBe(picks.length);
  });
  it('an empty bag gets nothing', () => {
    expect(bagIdeas(cat, [])).toEqual([]);
  });
});
