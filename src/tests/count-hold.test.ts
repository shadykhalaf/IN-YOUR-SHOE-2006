/**
 * Cycle-count hold sync: a variant on custom.count_hold reads as sold out in
 * the live (Storefront API) catalogue, matching the real store.
 */
import { describe, expect, it } from 'vitest';
import { isCountHeld, toStorefrontJson, type SfProduct } from '../../api/_lib/shopify';

describe('isCountHeld', () => {
  it('treats truthy metafield values as held, falsey/absent as not held', () => {
    expect(isCountHeld({ value: 'true' })).toBe(true);
    expect(isCountHeld({ value: '2026-10-29' })).toBe(true);
    expect(isCountHeld({ value: '1' })).toBe(true);
    expect(isCountHeld({ value: 'false' })).toBe(false);
    expect(isCountHeld({ value: '0' })).toBe(false);
    expect(isCountHeld({ value: '' })).toBe(false);
    expect(isCountHeld(null)).toBe(false);
    expect(isCountHeld(undefined)).toBe(false);
  });
});

describe('toStorefrontJson: held variants are marked unavailable', () => {
  const sf = (hold: string | null): SfProduct => ({
    id: 'gid://shopify/Product/1',
    handle: 'crayon-car',
    title: 'Crayon Car',
    descriptionHtml: '',
    productType: 'Zip-Up Hoodies(Kids)',
    vendor: 'IN YOUR SHOE',
    tags: ['kids'],
    createdAt: '2026-01-01T00:00:00Z',
    publishedAt: '2026-01-01T00:00:00Z',
    options: [{ name: 'Size', optionValues: [{ name: '7' }, { name: '9' }] }],
    images: { nodes: [] },
    variants: {
      nodes: [
        { id: 'gid://shopify/ProductVariant/71', title: '7', availableForSale: true, selectedOptions: [{ name: 'Size', value: '7' }], price: { amount: '999.0', currencyCode: 'EGP' }, compareAtPrice: null, image: null, countHold: null },
        { id: 'gid://shopify/ProductVariant/72', title: '9', availableForSale: true, selectedOptions: [{ name: 'Size', value: '9' }], price: { amount: '999.0', currencyCode: 'EGP' }, compareAtPrice: null, image: null, countHold: hold ? { value: hold } : null },
      ],
    },
  });

  it('size 9 on hold -> available:false; size 7 untouched', () => {
    const json = toStorefrontJson(sf('true'));
    const v7 = json.variants.find((v) => v.option1 === '7')!;
    const v9 = json.variants.find((v) => v.option1 === '9')!;
    expect(v7.available).toBe(true);
    expect(v9.available).toBe(false);
  });

  it('no hold -> both available', () => {
    const json = toStorefrontJson(sf(null));
    expect(json.variants.every((v) => v.available)).toBe(true);
  });
});
