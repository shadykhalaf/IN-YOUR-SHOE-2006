import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IYS_STOREFRONT_ORIGIN } from '../config/integrations';
import { buildShopifyCheckoutUrl, buildShopifyStorefrontHandoffUrl, serializeShopifyCart, startCheckout, switchToRealIYS, useHandoff } from '../lib/checkout';
import { MAX_QTY, useCart, type CartItem } from '../state/cart';
import { useOS } from '../state/os';

const line = (variantId: unknown, quantity: unknown, handle = `h-${String(variantId)}`) => ({ variantId, quantity, handle, title: handle });
const item = (variantId: number | null, quantity: number, handle: string): CartItem => ({ key: `${handle}::${variantId}`, handle, title: handle, variantId, variantTitle: null, size: null, quantity, price: 100, image: null });

describe('buildShopifyCheckoutUrl (bag → official IYS cart permalink)', () => {
  it('uses the official Egyptian storefront', () => {
    expect(IYS_STOREFRONT_ORIGIN).toBe('https://inyourshoe.com');
  });

  it('one line', () => {
    expect(buildShopifyCheckoutUrl([line(111, 1)])).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/111:1' });
  });

  it('several lines: exact variant IDs and quantities, in bag order', () => {
    expect(buildShopifyCheckoutUrl([line(111, 2), line(222, 1)])).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/111:2,222:1' });
    expect(buildShopifyCheckoutUrl([line(222, 1), line(111, 2)])).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/222:1,111:2' });
  });

  it('keeps real 14-digit Shopify variant IDs exactly (no float formatting)', () => {
    const r = buildShopifyCheckoutUrl([line(46152798765277, 2), line(47312166125789, 1)]);
    expect(r).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/46152798765277:2,47312166125789:1' });
  });

  it('accepts the whole quantity range of the bag', () => {
    expect(buildShopifyCheckoutUrl([line(1, MAX_QTY)])).toEqual({ ok: true, url: `https://inyourshoe.com/cart/1:${MAX_QTY}` });
  });

  it('an empty / missing bag never produces /cart/', () => {
    for (const empty of [[], null, undefined]) expect(buildShopifyCheckoutUrl(empty)).toEqual({ ok: false, reason: 'empty', bad: [] });
  });

  it('a line without a real variant ID stops checkout and is named, never dropped or guessed', () => {
    for (const bad of [null, undefined, 0, -5, 1.5, Number.NaN, '111', 'gid://shopify/ProductVariant/111']) {
      const r = buildShopifyCheckoutUrl([line(111, 1, 'ok'), line(bad, 1, 'broken')]);
      expect(r).toEqual({ ok: false, reason: 'invalid-line', bad: [{ handle: 'broken', title: 'broken' }] });
    }
  });

  it('a malformed quantity stops checkout rather than being changed into a different order', () => {
    for (const q of [0, -1, 2.5, Number.NaN, '2', null, MAX_QTY + 1]) {
      expect(buildShopifyCheckoutUrl([line(111, q, 'x')])).toMatchObject({ ok: false, reason: 'invalid-line' });
    }
  });

  it('every bad line is reported (no partial checkout)', () => {
    const r = buildShopifyCheckoutUrl([line(null, 1, 'a'), line(222, 1, 'ok'), line(333, 0, 'b')]);
    expect(r).toEqual({ ok: false, reason: 'invalid-line', bad: [{ handle: 'a', title: 'a' }, { handle: 'b', title: 'b' }] });
  });
});

describe('startCheckout (the one CHECKOUT action)', () => {
  beforeEach(() => {
    useHandoff.setState({ pending: null });
    useCart.setState({ items: [] });
    useOS.setState({ dialog: null });
  });

  it('sends the exact bag to the real checkout and leaves the local bag untouched', () => {
    const items = [item(46152798765277, 2, 'cereal-killer-pjoys'), item(47312166125789, 1, 'cotton-candy-neck-socks')];
    useCart.setState({ items });
    const go = vi.fn();
    startCheckout(go);
    expect(go).toHaveBeenCalledWith('https://inyourshoe.com/cart/46152798765277:2,47312166125789:1');
    expect(useCart.getState().items).toEqual(items);
    expect(useOS.getState().dialog).toBeNull();
  });

  it('an empty bag does nothing', () => {
    const go = vi.fn();
    startCheckout(go);
    expect(go).not.toHaveBeenCalled();
    expect(useOS.getState().dialog).toBeNull();
  });

  it('a line without a variant: no redirect, an honest message pointing at the item, bag kept', () => {
    const items = [item(111, 1, 'fine'), item(null, 2, 'needs-refresh')];
    useCart.setState({ items });
    const go = vi.fn();
    startCheckout(go);
    expect(go).not.toHaveBeenCalled();
    expect(useOS.getState().dialog).toMatchObject({ kind: 'error', title: 'CHECKOUT COULDN’T START :(', action: { handle: 'needs-refresh' } });
    expect(useCart.getState().items).toEqual(items);
  });
});

describe('REAL IYS handoff (storefront cart) vs CHECKOUT (direct checkout)', () => {
  it('one serializer feeds both destinations', () => {
    expect(serializeShopifyCart([line(111, 2), line(222, 1)])).toEqual({ ok: true, lines: '111:2,222:1' });
  });

  it('empty bag → the real homepage, never an empty /cart/', () => {
    for (const empty of [[], null, undefined]) expect(buildShopifyStorefrontHandoffUrl(empty)).toEqual({ ok: true, url: 'https://inyourshoe.com/' });
  });

  it('one / several lines → the storefront cart permalink, exact IDs, quantities and order', () => {
    expect(buildShopifyStorefrontHandoffUrl([line(111, 1)])).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/111:1?storefront=true' });
    expect(buildShopifyStorefrontHandoffUrl([line(111, 2), line(222, 1)])).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/111:2,222:1?storefront=true' });
    expect(buildShopifyStorefrontHandoffUrl([line(46152798765277, 2), line(47312166125789, 1)])).toEqual({
      ok: true,
      url: 'https://inyourshoe.com/cart/46152798765277:2,47312166125789:1?storefront=true',
    });
  });

  it('regression: CHECKOUT keeps going straight to checkout (no ?storefront)', () => {
    const items = [line(111, 2), line(222, 1)];
    expect(buildShopifyCheckoutUrl(items)).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/111:2,222:1' });
    expect((buildShopifyCheckoutUrl(items) as { url: string }).url).not.toContain('storefront');
    expect((buildShopifyStorefrontHandoffUrl(items) as { url: string }).url).not.toBe((buildShopifyCheckoutUrl(items) as { url: string }).url);
  });

  it('bad lines stop the handoff too: no URL, every bad line named', () => {
    for (const [vid, q] of [[null, 1], [undefined, 1], ['111', 1], [-1, 1], [111, Number.NaN], [111, 0], [111, MAX_QTY + 1], [111, 1.5]] as const) {
      expect(buildShopifyStorefrontHandoffUrl([line(222, 1, 'ok'), line(vid, q, 'bad')])).toEqual({ ok: false, reason: 'invalid-line', bad: [{ handle: 'bad', title: 'bad' }] });
    }
  });
});

describe('switchToRealIYS (the one action behind the global switch)', () => {
  beforeEach(() => {
    useHandoff.setState({ pending: null });
    useCart.setState({ items: [] });
    useOS.setState({ dialog: null });
  });

  it('empty bag → the real homepage, no dialog', () => {
    const go = vi.fn();
    switchToRealIYS(go);
    expect(go).toHaveBeenCalledWith('https://inyourshoe.com/');
    expect(useOS.getState().dialog).toBeNull();
  });

  it('filled bag → storefront cart with the exact bag; local bag untouched', () => {
    const items = [item(46152798765277, 2, 'cereal-killer-pjoys'), item(47312166125789, 1, 'cotton-candy-neck-socks')];
    useCart.setState({ items });
    const go = vi.fn();
    switchToRealIYS(go);
    expect(go).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith('https://inyourshoe.com/cart/46152798765277:2,47312166125789:1?storefront=true');
    expect(useCart.getState().items).toEqual(items);
  });

  it('a bad line → no navigation, the existing refresh message, bag kept', () => {
    const items = [item(111, 1, 'fine'), item(null, 2, 'needs-refresh')];
    useCart.setState({ items });
    const go = vi.fn();
    switchToRealIYS(go);
    expect(go).not.toHaveBeenCalled();
    expect(useOS.getState().dialog).toMatchObject({ kind: 'error', title: 'REAL IYS COULDN’T OPEN :(', message: expect.stringContaining('ONE OF UR ITEMS NEEDS A REFRESH'), action: { handle: 'needs-refresh' } });
    expect(useCart.getState().items).toEqual(items);
  });
});

describe('discount code + double-press guard (conversion pass)', () => {
  beforeEach(() => {
    useHandoff.setState({ pending: null });
    useCart.setState({ items: [], discountCode: null });
    useOS.setState({ dialog: null });
  });

  it('a clean code rides along as Shopify’s ?discount= on both destinations', () => {
    const items = [line(111, 2)];
    expect(buildShopifyCheckoutUrl(items, { discount: 'cool10' })).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/111:2?discount=COOL10' });
    expect(buildShopifyStorefrontHandoffUrl(items, { discount: 'COOL10' })).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/111:2?storefront=true&discount=COOL10' });
  });

  it('anything that isn’t a plain code is dropped, never “fixed” (no injection into the URL)', () => {
    for (const bad of ['a b', 'x&storefront=false', '../', '<script>', '', 'Z'.repeat(65)]) {
      expect(buildShopifyCheckoutUrl([line(111, 1)], { discount: bad })).toEqual({ ok: true, url: 'https://inyourshoe.com/cart/111:1' });
    }
  });

  it('empty bag + code → still just the real homepage', () => {
    expect(buildShopifyStorefrontHandoffUrl([], { discount: 'COOL10' })).toEqual({ ok: true, url: 'https://inyourshoe.com/' });
  });

  it('the bag’s saved code is used by CHECKOUT', () => {
    useCart.setState({ items: [item(111, 1, 'a')], discountCode: 'COOL10' });
    const go = vi.fn();
    startCheckout(go);
    expect(go).toHaveBeenCalledWith('https://inyourshoe.com/cart/111:1?discount=COOL10');
  });

  it('pressing CHECKOUT twice while the redirect is under way navigates once', () => {
    useCart.setState({ items: [item(111, 1, 'a')] });
    const go = vi.fn();
    startCheckout(go);
    startCheckout(go);
    expect(go).toHaveBeenCalledTimes(1);
    expect(useHandoff.getState().pending).toMatchObject({ to: 'checkout' });
  });
});
