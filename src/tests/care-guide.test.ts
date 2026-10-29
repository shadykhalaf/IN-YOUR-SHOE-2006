import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM module shared with the Node sync scripts
import * as N from '../../scripts/lib/normalize.mjs';
// @ts-expect-error — plain ESM module shared with the Node sync scripts
import { buildOutputs } from '../../scripts/lib/outputs.mjs';
import { addItem, cartKey, clampQty, MAX_QTY, type CartItem } from '../state/cart';

const root = resolve(__dirname, '../..');
const fixture = (name: string) => readFileSync(resolve(__dirname, 'fixtures/care', name), 'utf8');

/** Real IYS product-page structures (captured, trimmed; see each file's header). */
describe('care guide extraction (official product pages)', () => {
  it('clothing template: reads the Care Guide accordion row', () => {
    expect(N.extractCareGuide(fixture('clothing-accordion.html'))).toEqual({
      status: 'found',
      text: '- Machine wash as usual.\n- Avoid rubbing.\n- Do not iron.\n- Made of 100% polyester.',
    });
  });

  it('accessories template: reads the care-guide content block (no accordion row)', () => {
    expect(N.extractCareGuide(fixture('accessories-liquid-block.html'))).toEqual({
      status: 'found',
      text: '- Machine wash with lukewarm water.\n- 70% combed cotton / 20% polyamide / 5% elastane',
    });
  });

  it('keeps the official wording exactly: no bullets added, stray characters and "&" kept', () => {
    expect(N.extractCareGuide(fixture('no-bullets.html')).text).toBe('Gentle wash with cold water\nAvoid rubbing\nDo not iron\nMade of Cotton');
    expect(N.extractCareGuide(fixture('verbatim-apostrophe.html')).text).toBe("'- Machine wash with cold water.\n- Iron on low heat.\n- Made of a blend of polyester & cotton.");
  });

  it('only presentation noise is normalised (source newlines, <br>, entities, whitespace)', () => {
    const html = '<div class="care-guide">\n  - Wash  with lukewarm&nbsp;water.<br />\n- Add a small amount of the mild detergent.<br/>\n  </div>';
    expect(N.extractCareGuide(html)).toEqual({ status: 'found', text: '- Wash with lukewarm water.\n- Add a small amount of the mild detergent.' });
  });

  it('no published care guide → null, never a fallback', () => {
    const r = N.extractCareGuide(fixture('no-care-guide.html'));
    expect(r).toEqual({ status: 'none', text: null });
    expect(N.extractCareGuide('')).toEqual({ status: 'none', text: null });
  });

  it('care content that exists but cannot be read is a failure, not "none"', () => {
    const row = '<details><summary class="accordion-item__title">\n Care Guide\n <span></span></summary><div class="rte"></div></details>';
    expect(N.extractCareGuide(row)).toMatchObject({ status: 'failed', reason: 'Care Guide row without care-guide content' });
    expect(N.extractCareGuide('<div class="care-guide">  <br/> </div>')).toMatchObject({ status: 'failed', reason: 'empty care-guide block' });
    expect(N.extractCareGuide('<div class="care-guide">Wash cold<div>')).toMatchObject({ status: 'failed', reason: 'unbalanced care-guide markup' });
    expect(N.extractCareGuide('<div class="care-guide">A</div><div class="care-guide">B</div>')).toMatchObject({ status: 'failed', reason: 'conflicting care-guide blocks' });
    expect(N.extractCareGuide('<div class="care-guide">Liquid error: x</div>')).toMatchObject({ status: 'failed', reason: 'malformed care-guide text' });
  });

  it('the same block rendered twice (e.g. two layouts) is one guide', () => {
    const b = '<div class="care-guide">Wash cold</div>';
    expect(N.extractCareGuide(b + b)).toEqual({ status: 'found', text: 'Wash cold' });
  });
});

describe('care guide in the catalogue model', () => {
  const storefront = {
    id: 1,
    title: 'Cereal Killer Pjoys',
    handle: 'cereal-killer-pjoys',
    product_type: 'PJOYS',
    tags: [],
    body_html: '<p>Relax, it&rsquo;s just about breakfast.</p>',
    options: [{ name: 'Size', position: 1, values: ['S', 'M'] }],
    variants: [
      { id: 11, title: 'S', option1: 'S', price: '799.00', compare_at_price: null, available: true },
      { id: 12, title: 'M', option1: 'M', price: '799.00', compare_at_price: null, available: false },
    ],
    images: [{ id: 5, src: 'https://cdn.shopify.com/s/files/1/0050/2729/9397/files/a.jpg', width: 10, height: 10 }],
  };

  it('normalised products start with careGuide null; description and variants are untouched', () => {
    const p = N.normalizeStorefrontProduct(storefront, { retrievedAt: 'x' });
    expect(p.careGuide).toBeNull();
    expect(p.description).toBe('Relax, it’s just about breakfast.');
    expect(p.variants.map((v: { id: number; available: boolean }) => [v.id, v.available])).toEqual([
      [11, true],
      [12, false],
    ]);
  });

  it('care text lives in the detail shards, never in the compact index', () => {
    const p = N.normalizeStorefrontProduct(storefront, { retrievedAt: 'x' });
    p.careGuide = '- Machine wash as usual.\n- Do not iron.';
    const out = buildOutputs([p], {}, { generatedAt: 'x', currency: 'EGP' });
    expect(out.index).not.toContain('Machine wash');
    expect(out.index).not.toContain('careGuide');
    const shard = Object.values(out.shards as Record<string, string>).find((s) => s.includes(p.handle))!;
    expect(JSON.parse(shard)[p.handle].careGuide).toBe(p.careGuide);
  });

  it('synced data: every care guide is a non-empty string or null, and only in shards', () => {
    const dir = resolve(root, 'public/catalogue');
    const records = readdirSync(dir).flatMap((f) => Object.values(JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as Record<string, { careGuide?: string | null }>));
    expect(records.length).toBeGreaterThan(1000);
    for (const r of records) if (r.careGuide !== undefined && r.careGuide !== null) expect(r.careGuide.trim().length).toBeGreaterThan(0);
    expect(readFileSync(resolve(root, 'src/data/catalogue-index.json'), 'utf8')).not.toContain('careGuide');
  });
});

describe('quantity → bag (Shopify-ready add path)', () => {
  const item = { handle: 'h', title: 'T', variantId: 1, variantTitle: 'M', size: 'M', price: 799, image: null };

  it('clampQty never gives 0, a negative, a fraction or NaN', () => {
    expect([clampQty(0), clampQty(-3), clampQty(Number.NaN), clampQty(2.7), clampQty(3), clampQty(99)]).toEqual([1, 1, 1, 2, 3, MAX_QTY]);
  });

  it('adding quantity 3 adds 3; the same variant again increments (never replaces)', () => {
    let items: CartItem[] = addItem([], item, 3);
    expect(items[0]!.quantity).toBe(3);
    items = addItem(items, item, 2);
    expect(items).toHaveLength(1);
    expect(items[0]!.key).toBe(cartKey('h', 1));
    expect(items[0]!.quantity).toBe(5);
  });

  it('a bad quantity can never remove or shrink a line', () => {
    const items = addItem([], item, 2);
    expect(addItem(items, item, 0)[0]!.quantity).toBe(3);
    expect(addItem(items, item, -5)[0]!.quantity).toBe(3);
  });
});
