import { describe, expect, it } from 'vitest';
import { addItem, cartKey, itemCount, MAX_QTY, setQuantity, subtotal, type CartItem } from '../state/cart';
import { findVariant, initialSelection, valueAvailable } from '../lib/variants';
import type { ProductDetail } from '../lib/catalogue/types';

const base = { handle: 'h', title: 'T', variantId: 1, variantTitle: 'M', size: 'M', price: 799, image: null };

describe('cart', () => {
  it('adds and merges the same variant', () => {
    let items: CartItem[] = [];
    items = addItem(items, base);
    items = addItem(items, base, 2);
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(3);
    items = addItem(items, { ...base, variantId: 2, variantTitle: 'L', size: 'L' });
    expect(items).toHaveLength(2);
    expect(itemCount(items)).toBe(4);
  });
  it('caps quantity and removes at zero', () => {
    let items = addItem([], base, 50);
    expect(items[0]!.quantity).toBe(MAX_QTY);
    items = setQuantity(items, cartKey('h', 1), 0);
    expect(items).toHaveLength(0);
  });
  it('subtotal uses snapshot prices, rounded to piastres', () => {
    const items = addItem(addItem([], { ...base, price: 799 }, 2), { ...base, variantId: 3, price: 159.5 }, 3);
    expect(subtotal(items)).toBe(2076.5);
  });
});

const p = {
  options: [
    { name: 'Size', values: ['S', 'M'] },
    { name: 'Color', values: ['Black', 'White'] },
  ],
  variants: [
    { id: 1, options: ['S', 'Black'], available: true, price: 799, compareAtPrice: null, title: 'S / Black', imageId: null },
    { id: 2, options: ['M', 'Black'], available: false, price: 799, compareAtPrice: null, title: 'M / Black', imageId: null },
    { id: 3, options: ['M', 'White'], available: true, price: 799, compareAtPrice: null, title: 'M / White', imageId: null },
  ],
} as unknown as ProductDetail;

describe('variant selection', () => {
  it('needs every option before resolving', () => {
    expect(findVariant(p, ['M', null])).toBeNull();
    expect(findVariant(p, ['M', 'White'])?.id).toBe(3);
  });
  it('reports availability in context of the other choice', () => {
    expect(valueAvailable(p, 0, 'M', [null, 'Black'])).toBe(false);
    expect(valueAvailable(p, 0, 'M', [null, 'White'])).toBe(true);
    expect(valueAvailable(p, 1, 'White', ['S', null])).toBe(false); // combination doesn't exist
  });
  it('never preselects a size', () => {
    expect(initialSelection(p)).toEqual([null, null]);
    expect(initialSelection({ ...p, options: [{ name: 'Size', values: ['One Size'] }] } as ProductDetail)).toEqual(['One Size']);
  });
});
