/**
 * Client side of live mode + rewards, with fetch mocked. Live mode is opt-in
 * (VITE_COMMERCE_MODE=live, VITE_LIVE_CART=1, VITE_GAME_REWARDS=1); the
 * default build never calls these endpoints.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commerceMode, createLiveCheckout, isShopifyCheckoutUrl, liveCartEnabled, verifyDiscount } from '../lib/commerce';
import { isUsableIndex } from '../lib/catalogue/load';
import { startCheckout, useHandoff } from '../lib/checkout';
import { shippingProgress } from '../lib/incentives';
import { claimReward, earned, liveRewards, nextReward, resetRewardsCache, rewardsOn, type PublicReward } from '../lib/rewards';
import { useCart, type CartItem } from '../state/cart';
import { useOS } from '../state/os';

const item = (variantId: number, quantity: number, handle: string): CartItem => ({ key: `${handle}::${variantId}`, handle, title: handle, variantId, variantTitle: null, size: null, quantity, price: 100, image: null });
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('defaults: snapshot mode, nothing live is called', () => {
  it('is snapshot unless explicitly switched on', () => {
    expect(commerceMode()).toBe('snapshot');
    expect(liveCartEnabled()).toBe(false);
    expect(rewardsOn()).toBe(false);
  });
  it('verifyDiscount and liveRewards make no request in snapshot mode', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await verifyDiscount([item(1, 1, 'a')], 'CODE')).toBe('unchecked');
    expect(await liveRewards()).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
  it('live checkout needs BOTH switches', () => {
    vi.stubEnv('VITE_COMMERCE_MODE', 'live');
    expect(liveCartEnabled()).toBe(false);
    vi.stubEnv('VITE_LIVE_CART', '1');
    expect(liveCartEnabled()).toBe(true);
  });
});

describe('live checkout (opt-in): exact Shopify cart, else permalink or an honest stop', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_COMMERCE_MODE', 'live');
    vi.stubEnv('VITE_LIVE_CART', '1');
    useHandoff.setState({ pending: null });
    useOS.setState({ dialog: null });
    useCart.setState({ items: [item(11, 2, 'tee'), item(12, 1, 'pants')], discountCode: null });
  });
  it('goes to the Shopify checkout URL when every line came back', async () => {
    const f = vi.fn(() => reply(200, { ok: true, checkoutUrl: 'https://inyourshoe.com/cart/c/abc', lines: [{ variantId: 11, quantity: 2, available: true }, { variantId: 12, quantity: 1, available: true }] }));
    vi.stubGlobal('fetch', f);
    const go = vi.fn();
    await startCheckout(go);
    expect(go).toHaveBeenCalledWith('https://inyourshoe.com/cart/c/abc');
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ lines: [{ variantId: 11, quantity: 2 }, { variantId: 12, quantity: 1 }], discountCodes: [] });
  });
  it('falls back to the cart permalink when the live API can’t answer', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(503, { ok: false, reason: 'not-configured' })));
    const go = vi.fn();
    await startCheckout(go);
    expect(go).toHaveBeenCalledWith('https://inyourshoe.com/cart/11:2,12:1');
  });
  it('stops, keeps the bag and names the item when Shopify changed a line', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(200, { ok: false, checkoutUrl: 'https://inyourshoe.com/cart/c/abc', lines: [{ variantId: 11, quantity: 2, available: true }, { variantId: 12, quantity: 1, available: false }] })));
    const go = vi.fn();
    await startCheckout(go);
    expect(go).not.toHaveBeenCalled();
    expect(useHandoff.getState().pending).toBeNull();
    expect(useCart.getState().items).toHaveLength(2);
    expect(useOS.getState().dialog).toMatchObject({ kind: 'error', action: { handle: 'pants' } });
  });
  it('never follows a non-Shopify URL from the API', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(200, { ok: true, checkoutUrl: 'https://evil.example/pay', lines: [{ variantId: 11, quantity: 2, available: true }] })));
    expect(await createLiveCheckout([item(11, 2, 'tee')], null)).toEqual({ kind: 'unavailable' });
    for (const bad of ['http://inyourshoe.com/x', 'https://inyourshoe.com.evil.example/', 'javascript:alert(1)', 42]) expect(isShopifyCheckoutUrl(bad)).toBe(false);
    expect(isShopifyCheckoutUrl('https://iys.myshopify.com/checkouts/cn/1')).toBe(true);
  });
  it('a double press while the live cart is being built sends one request', async () => {
    const f = vi.fn(() => reply(200, { ok: true, checkoutUrl: 'https://inyourshoe.com/cart/c/abc', lines: [{ variantId: 11, quantity: 2, available: true }, { variantId: 12, quantity: 1, available: true }] }));
    vi.stubGlobal('fetch', f);
    const go = vi.fn();
    await Promise.all([startCheckout(go), startCheckout(go)]);
    expect(f).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledTimes(1);
  });
});

describe('live catalogue + promotions guards', () => {
  it('uses a live index only if it is complete and in EGP', () => {
    expect(isUsableIndex({ currency: 'EGP', shardCount: 32, products: [{}], collections: [] })).toBe(true);
    expect(isUsableIndex({ currency: 'USD', shardCount: 32, products: [{}], collections: [] })).toBe(false);
    expect(isUsableIndex({ currency: 'EGP', shardCount: 0, products: [{}], collections: [] })).toBe(false);
    expect(isUsableIndex({ currency: 'EGP', shardCount: 32, products: [], collections: [] })).toBe(false);
    expect(isUsableIndex('<!doctype html>')).toBe(false);
  });
  it('a live Shopify minimum is inclusive; the announcement rule is strictly over', () => {
    const base = { overEGP: 3999, source: 's', sourceUrl: '', verifiedOn: '2026-10-26', showUntil: '2026-10-26' };
    expect(shippingProgress(3999, base, '2026-10-26').kind).toBe('progress');
    expect(shippingProgress(3999, { ...base, inclusive: true }, '2026-10-26').kind).toBe('unlocked');
  });
});

describe('game rewards (client)', () => {
  const r = (id: string, minScore: number, requiresWin = false): PublicReward => ({ id, game: 'snake', minScore, requiresWin, label: id, description: 'd', conditions: null, minPlaySeconds: 30 });
  const list = [r('small', 100), r('big', 500), r('win', 0, true)];
  it('picks the best reward actually earned, and the next one to aim for', () => {
    expect(earned(list, 'snake', 50, false)).toBeNull();
    expect(earned(list, 'snake', 120, false)!.id).toBe('small');
    expect(earned(list, 'snake', 900, false)!.id).toBe('big');
    expect(earned(list, 'snake', 0, true)!.id).toBe('win');
    expect(earned(list, 'tower', 900, true)).toBeNull();
    expect(nextReward(list, 'snake', 120)!.id).toBe('big');
    expect(nextReward(list, 'snake', 900)).toBeNull();
  });
  it('lists only well-formed rewards from the server, once per page load', async () => {
    vi.stubEnv('VITE_GAME_REWARDS', '1');
    resetRewardsCache();
    const f = vi.fn(() => reply(200, { ok: true, rewards: [r('small', 100), { id: 'broken' }] }));
    vi.stubGlobal('fetch', f);
    expect((await liveRewards()).map((x) => x.id)).toEqual(['small']);
    await liveRewards();
    expect(f).toHaveBeenCalledTimes(1);
    resetRewardsCache();
  });
  it('a failed claim never produces a code', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(400, { ok: false, error: 'Not earned yet. Keep playing :)' })));
    expect(await claimReward('small', 't', 1, false)).toEqual({ ok: false, error: 'Not earned yet. Keep playing :)' });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    expect((await claimReward('small', 't', 1, false)).ok).toBe(false);
  });
});
