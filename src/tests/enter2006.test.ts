/**
 * Arrival from the real store (?enter=2006&bag=...). Pure parsing + the
 * one-shot seeder, no network.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { applyEnter2006, parseEnterBag, resetEnter2006 } from '../lib/enter2006';
import { useCart } from '../state/cart';

const line = (over: Record<string, unknown> = {}) => ({ h: 'don-panic-hoodie', v: 123456789, q: 2, t: "Don't Panic Hoodie", vt: 'M', s: 'M', p: 1299, img: 'https://cdn/x.jpg', ...over });
const enc = (lines: unknown[]) => encodeURIComponent(JSON.stringify(lines));

beforeEach(() => {
  resetEnter2006();
  useCart.setState({ items: [], discountCode: null });
});

describe('parseEnterBag', () => {
  it('maps a valid payload to cart items with clamped quantities', () => {
    const items = parseEnterBag(JSON.stringify([line(), line({ v: 222, q: 99 })]));
    expect(items).toHaveLength(2);
    expect(items![0]).toMatchObject({ handle: 'don-panic-hoodie', variantId: 123456789, quantity: 2, size: 'M', price: 1299 });
    expect(items![1]!.quantity).toBe(10); // clamped to MAX_QTY
  });

  it('dedupes the same variant into one line', () => {
    const items = parseEnterBag(JSON.stringify([line({ q: 1 }), line({ q: 3 })]));
    expect(items).toHaveLength(1);
    expect(items![0]!.quantity).toBe(4);
  });

  it('drops lines with no handle or a bad variant id, keeps the good ones', () => {
    const items = parseEnterBag(JSON.stringify([line(), line({ h: '' }), line({ v: -1, h: 'x' }), line({ v: 1.5, h: 'y' })]));
    expect(items).toHaveLength(1);
  });

  it('coerces a bad price to 0 and falls back title->handle', () => {
    const items = parseEnterBag(JSON.stringify([{ h: 'tee', v: 5, q: 1, p: 'oops' }]));
    expect(items![0]).toMatchObject({ price: 0, title: 'tee', variantTitle: null, size: null });
  });

  it('returns null for junk, empty, or non-array input', () => {
    expect(parseEnterBag('not json')).toBeNull();
    expect(parseEnterBag('[]')).toBeNull();
    expect(parseEnterBag('{"h":"x"}')).toBeNull();
    expect(parseEnterBag(null)).toBeNull();
  });

  it('caps the number of lines', () => {
    const many = Array.from({ length: 80 }, (_, i) => line({ v: 1000 + i, h: `p-${i}` }));
    expect(parseEnterBag(JSON.stringify(many))!.length).toBe(50);
  });
});

describe('applyEnter2006', () => {
  it('seeds the bag only when ?enter=2006 is present', () => {
    expect(applyEnter2006(`?bag=${enc([line()])}`)).toBe(false); // no enter flag
    expect(useCart.getState().items).toHaveLength(0);

    resetEnter2006();
    expect(applyEnter2006(`?enter=2006&bag=${enc([line()])}`)).toBe(true);
    expect(useCart.getState().items).toHaveLength(1);
  });

  it('runs at most once', () => {
    expect(applyEnter2006(`?enter=2006&bag=${enc([line()])}`)).toBe(true);
    expect(applyEnter2006(`?enter=2006&bag=${enc([line({ v: 999 })])}`)).toBe(false);
    expect(useCart.getState().items).toHaveLength(1);
  });

  it('an enter with an empty/invalid bag leaves the existing bag untouched', () => {
    useCart.setState({ items: [{ key: 'k', handle: 'old', title: 'Old', variantId: 7, variantTitle: null, size: null, quantity: 1, price: 10, image: null }], discountCode: null });
    applyEnter2006('?enter=2006&bag=%5B%5D');
    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().items[0]!.handle).toBe('old');
  });
});
