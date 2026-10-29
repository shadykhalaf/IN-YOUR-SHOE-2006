import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM module shared with the Node sync scripts
import * as N from '../../scripts/lib/normalize.mjs';
// @ts-expect-error — plain ESM module shared with the Node sync scripts
import { shardOf as shardOfScript } from '../../scripts/lib/outputs.mjs';
// @ts-expect-error — plain ESM module shared with the Node sync scripts
import { parseStores } from '../../scripts/sync-stores.mjs';
import { shardOf } from '../lib/catalogue/shard';

const storefront = {
  id: 1,
  title: 'Cereal Killer Pjoys',
  handle: 'cereal-killer-pjoys',
  vendor: 'IN YOUR SHOE',
  product_type: 'PJOYS',
  tags: ['homewear', '2JUN26C', 'FW27', 'Online Out of Stock', 'Pjoys', 'M'],
  body_html: '<p><span>Relax, it&rsquo;s just about breakfast.</span></p><p>Unisex fit<br>- Male model: M</p>',
  created_at: '2026-06-24T12:41:53+03:00',
  published_at: '2026-09-01T14:30:57+03:00',
  options: [
    { name: 'Size', position: 1, values: ['S', 'M'] },
    { name: 'Color', position: 2, values: ['Black'] },
  ],
  variants: [
    { id: 11, title: 'S / Black', option1: 'S', option2: 'Black', option3: null, price: '799.00', compare_at_price: null, available: false },
    { id: 12, title: 'M / Black', option1: 'M', option2: 'Black', option3: null, price: '799.00', compare_at_price: '999.00', available: true },
  ],
  images: [{ id: 5, src: 'https://cdn.shopify.com/s/files/1/0050/2729/9397/files/a.jpg?v=123', width: 1005, height: 1256, alt: 'Cereal &amp; milk' }],
};

describe('normalisation', () => {
  it('parses EGP money without converting', () => {
    expect(N.parseMoney('1,299.50')).toBe(1299.5);
    expect(N.parseMoney('799.00')).toBe(799);
    expect(N.parseMoney(null)).toBeNull();
    expect(N.parseMoney('')).toBeNull();
    expect(N.fromCents(79900)).toBe(799);
  });

  it('keeps descriptive tags and drops merchandising codes / app flags', () => {
    expect(N.publicTags(storefront.tags)).toEqual(['homewear', 'Pjoys']);
  });

  it('converts body_html to plain text (no remote HTML in the app)', () => {
    const t = N.htmlToText(storefront.body_html);
    expect(t).toContain('Relax, it’s just about breakfast.');
    expect(t).toContain('- Male model: M');
    expect(t).not.toMatch(/</);
  });

  it('normalises a storefront product faithfully', () => {
    const p = N.normalizeStorefrontProduct(storefront, { retrievedAt: 'x' });
    expect(p.price).toBe(799);
    expect(p.currency).toBe('EGP');
    expect(p.onSale).toBe(true); // a variant has compare-at > price
    expect(p.compareAtPrice).toBeNull(); // cheapest variant (S) has none — nothing invented
    expect(p.available).toBe(true);
    expect(p.sizes).toEqual([
      { label: 'S', available: false },
      { label: 'M', available: true },
    ]);
    expect(p.colors).toEqual(['Black']);
    expect(p.images[0].src).toBe('https://cdn.shopify.com/s/files/1/0050/2729/9397/files/a.jpg');
    expect(p.images[0].alt).toBe('Cereal & milk');
    expect(p.sourceUrl).toBe('https://inyourshoe.com/products/cereal-killer-pjoys');
  });

  it('treats "Default Title" as no options', () => {
    const p = N.normalizeStorefrontProduct({ ...storefront, options: [{ name: 'Title', values: ['Default Title'] }], variants: [{ id: 9, title: 'Default Title', option1: 'Default Title', price: '159.00', available: true }] }, {});
    expect(p.options).toEqual([]);
    expect(p.sizes).toEqual([]);
    expect(p.variants).toHaveLength(1);
  });

  it('reads Ajax prices in minor units', () => {
    const p = N.normalizeAjaxProduct({ id: 1, handle: 'x', title: 'X', type: 'Socks', options: [], variants: [{ id: 1, price: 15900, compare_at_price: null, available: true, options: [] }], media: [] }, {});
    expect(p.price).toBe(159);
    expect(p.sourceMethod).toBe('product.js');
  });

  it('flags JSON-LD offers in a foreign currency instead of importing them', () => {
    const p = N.normalizeJsonLdProduct({ name: 'X', offers: [{ price: '20.00', priceCurrency: 'SAR', availability: 'https://schema.org/InStock' }] }, 'x', {});
    expect(p.currencyMismatch).toBe(true);
    expect(p.price).toBeNull();
  });

  it('extracts JSON-LD Product blocks', () => {
    const html = '<script type="application/ld+json">{"@type":"Organization"}</script><script type="application/ld+json">{"@type":"Product","name":"Y"}</script>';
    expect(N.extractJsonLdProduct(html)?.name).toBe('Y');
  });

  it('detects international-market URLs', () => {
    expect(N.isInternationalMarketUrl('https://inyourshoe.com/en-sa/products/x')).toBe(true);
    expect(N.isInternationalMarketUrl('https://inyourshoe.com/products/x')).toBe(false);
  });

  it('fails loudly on integrity problems', () => {
    const a = N.normalizeStorefrontProduct(storefront, {});
    const { errors, report } = N.validateCatalogue([a, a], { discoveredHandles: ['cereal-killer-pjoys'], expectedMin: 1 });
    expect(report.duplicateHandles).toEqual(['cereal-killer-pjoys']);
    expect(errors.join(' ')).toMatch(/duplicate/);
    const shrink = N.validateCatalogue([a], { expectedMin: 1, previousCount: 100 });
    expect(shrink.errors.join(' ')).toMatch(/shrank/);
  });

  it('client shard hash matches the sync script', () => {
    for (const h of ['cereal-killer-pjoys', 'kairo-pop-jersey', 'a', 'female-denim-blue-washed-wide-leg-jeans']) {
      expect(shardOf(h, 32)).toBe(shardOfScript(h));
    }
  });

  it('parses the public store directory structure', () => {
    const html = `<div class="
    media-with-text
    image-with-text x"><div class="content-block content-block--overline ff">Address: Ground floor - near gate</div>
    <h2 class="h">CITY STARS</h2><div class="content-block content-block--text rte"><h3>Opening Hours</h3><p>Sat-Wed: 10 AM - 11 PM<br/>Thu-Fri: 10 AM - 12 AM</p><h3>Phone Number</h3><p>010 1234</p></div>
    <a href="https://maps.app.goo.gl/abc">Directions</a><img class="image media-with-text__media-image--desktop" src="//inyourshoe.com/cdn/shop/files/s.jpg?v=1&width=320"></div>`;
    const [s] = parseStores(html);
    expect(s).toMatchObject({ name: 'CITY STARS', address: 'Ground floor - near gate', phone: '0101234', mapsUrl: 'https://maps.app.goo.gl/abc', photoSourceUrl: 'https://inyourshoe.com/cdn/shop/files/s.jpg' });
    expect(s.hours).toEqual(['Sat-Wed: 10 AM - 11 PM', 'Thu-Fri: 10 AM - 12 AM']);
  });
});
