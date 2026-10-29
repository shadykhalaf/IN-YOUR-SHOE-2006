/**
 * Live Shopify + rewards server code against FIXTURE GraphQL responses only.
 * No network, no real tokens, no real carts, no real discount codes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter, readJson, sameOrigin } from '../../api/_lib/http';
import { activeFreeShipping, buildLiveCatalogue, codeStatus, createCart, graphql, mapLimit, safeCheckoutUrl, shopifyConfig, toStorefrontJson, type Fetcher, type SfProduct } from '../../api/_lib/shopify';
import { handleCommerce, resetCommerceCache, validateCartBody } from '../../api/_lib/commerce';
import { handleRewards, parseRewards, resetRewards, signTicket, verifyTicket } from '../../api/_lib/rewards';
import { shardOf } from '../lib/catalogue/shard';

const TOKEN = 'shpat_fixture_not_a_real_token';
const LIVE = { COMMERCE_LIVE: '1', SHOPIFY_STORE_DOMAIN: 'iys-fixture.myshopify.com', SHOPIFY_STOREFRONT_PRIVATE_TOKEN: TOKEN };
const ADMIN = { ...LIVE, SHOPIFY_ADMIN_TOKEN: 'shpat_admin_fixture' };

const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } });
/** Route a GraphQL call to a fixture by the operation it contains. */
const router =
  (routes: Record<string, (vars: Record<string, unknown>) => Response | Promise<Response>>): Fetcher & { calls: { url: string; op: string; headers: Record<string, string> }[] } => {
    const calls: { url: string; op: string; headers: Record<string, string> }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      const { query, variables } = JSON.parse(String(init.body)) as { query: string; variables: Record<string, unknown> };
      const op = Object.keys(routes).find((k) => query.includes(k));
      calls.push({ url, op: op ?? '?', headers: init.headers as Record<string, string> });
      if (!op) throw new Error(`no fixture for ${query.slice(0, 40)}`);
      return routes[op]!(variables);
    }) as Fetcher & { calls: typeof calls };
    f.calls = calls;
    return f;
  };

const product = (n: number, over: Partial<SfProduct> = {}): SfProduct => ({
  id: `gid://shopify/Product/${1000 + n}`,
  handle: `fixture-tee-${n}`,
  title: `Fixture Tee ${n}`,
  descriptionHtml: '<p>Soft cotton.</p>',
  productType: 'T-Shirt',
  vendor: 'In Your Shoe',
  tags: ['tops'],
  createdAt: '2026-10-01T10:00:00Z',
  publishedAt: '2026-10-01T10:00:00Z',
  options: [{ name: 'Size', optionValues: [{ name: 'S' }, { name: 'M' }] }],
  images: { nodes: [{ id: `gid://shopify/ProductImage/${5000 + n}`, url: `https://cdn.shopify.com/s/files/1/x/tee-${n}.jpg?v=1`, width: 1000, height: 1250, altText: null }] },
  variants: {
    nodes: [
      { id: `gid://shopify/ProductVariant/${9000 + n * 2}`, title: 'S', availableForSale: true, selectedOptions: [{ name: 'Size', value: 'S' }], price: { amount: '850.0', currencyCode: 'EGP' }, compareAtPrice: null, image: null },
      { id: `gid://shopify/ProductVariant/${9001 + n * 2}`, title: 'M', availableForSale: false, selectedOptions: [{ name: 'Size', value: 'M' }], price: { amount: '850.0', currencyCode: 'EGP' }, compareAtPrice: { amount: '1000.0', currencyCode: 'EGP' }, image: null },
    ],
  },
  ...over,
});
const page = <T,>(nodes: T[]) => ({ pageInfo: { hasNextPage: false, endCursor: null }, nodes });
const catalogueRoutes = (products: SfProduct[]) => ({
  'query Products': () => ok({ products: page(products) }),
  'query Collections': () => ok({ collections: page([{ handle: 'all-tops', title: 'All Tops' }, { handle: 'best-sellers', title: 'Best Sellers' }]) }),
  'query CollectionProducts': (v: Record<string, unknown>) => ok({ collection: { products: page(v.handle === 'best-sellers' ? [{ handle: products[1]!.handle }, { handle: products[0]!.handle }] : products.map((p) => ({ handle: p.handle }))) } }),
});

describe('shopifyConfig: live only when explicitly switched on and credentialed', () => {
  it('is off by default and says why, without echoing secrets', () => {
    const c = shopifyConfig({});
    expect(c.live).toBe(false);
    expect(c.problems).toEqual(expect.arrayContaining(['COMMERCE_LIVE is not enabled', 'SHOPIFY_STORE_DOMAIN is not set', 'no Storefront API token']));
    const withToken = shopifyConfig({ SHOPIFY_STOREFRONT_PRIVATE_TOKEN: TOKEN, SHOPIFY_STORE_DOMAIN: 'iys-fixture.myshopify.com' });
    expect(withToken.live).toBe(false);
    expect(JSON.stringify(withToken.problems)).not.toContain(TOKEN);
  });
  it('builds the Storefront endpoint with the private token header; Admin only with its own token', () => {
    const c = shopifyConfig(LIVE);
    expect(c.live).toBe(true);
    expect(c.storefront!.url).toBe('https://iys-fixture.myshopify.com/api/2026-07/graphql.json');
    expect(c.storefront!.headers).toEqual({ 'Shopify-Storefront-Private-Token': TOKEN });
    expect(c.admin).toBeNull();
    expect(shopifyConfig(ADMIN).admin!.url).toBe('https://iys-fixture.myshopify.com/admin/api/2026-07/graphql.json');
  });
  it('rejects a malformed domain or API version instead of calling it', () => {
    expect(shopifyConfig({ ...LIVE, SHOPIFY_STORE_DOMAIN: 'evil.com/x?y=' }).live).toBe(false);
    expect(shopifyConfig({ ...LIVE, SHOPIFY_API_VERSION: 'latest' }).live).toBe(false);
  });
});

describe('graphql(): retries what Shopify says to retry, nothing else', () => {
  const ep = shopifyConfig(LIVE).storefront!;
  it('retries 429 and THROTTLED, then succeeds', async () => {
    vi.useFakeTimers();
    let n = 0;
    const f: Fetcher = async () => {
      n++;
      if (n === 1) return new Response('', { status: 429, headers: { 'retry-after': '0.01' } });
      if (n === 2) return new Response(JSON.stringify({ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] }), { status: 200 });
      return ok({ shop: { name: 'IYS' } });
    };
    const p = graphql<{ shop: { name: string } }>(ep, 'query { shop { name } }', {}, f);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ shop: { name: 'IYS' } });
    expect(n).toBe(3);
    vi.useRealTimers();
  });
  it('does not retry a 401 and never puts the token in the error', async () => {
    const f = vi.fn<Fetcher>(async () => new Response('bad token ' + TOKEN, { status: 401 }));
    await expect(graphql(ep, 'query { shop { name } }', {}, f)).rejects.toThrow('Shopify HTTP 401');
    expect(f).toHaveBeenCalledTimes(1);
    await graphql(ep, 'q', {}, f).catch((e: Error) => expect(e.message).not.toContain(TOKEN));
  });
});

describe('live catalogue: same product model as the snapshot', () => {
  it('maps Storefront products into the snapshot index + shards, keeping merchant collection order', async () => {
    const products = [product(1), product(2)];
    const cat = await buildLiveCatalogue(shopifyConfig(LIVE).storefront!, router(catalogueRoutes(products)), new Date('2026-10-26T00:00:00Z'));
    expect(cat.productCount).toBe(2);
    const index = JSON.parse(cat.index) as { currency: string; shardCount: number; products: { h: string }[]; collections: { h: string; o?: number[] }[] };
    expect(index.currency).toBe('EGP');
    expect(index.products.map((p) => p.h).sort()).toEqual(['fixture-tee-1', 'fixture-tee-2']);
    expect(Object.keys(cat.shards).length).toBe(index.shardCount);
    const all = Object.values(cat.shards).map((s) => JSON.parse(s) as Record<string, { variants: { id: number; available: boolean; price: number }[] }>);
    const tee = all.find((s) => s['fixture-tee-1'])!['fixture-tee-1']!;
    expect(tee.variants.map((v) => [v.id, v.available, v.price])).toEqual([[9002, true, 850], [9003, false, 850]]);
  });
  it('refuses a catalogue priced outside EGP (wrong market) or with duplicate handles', async () => {
    const usd = product(1, { variants: { nodes: [{ ...product(1).variants.nodes[0]!, price: { amount: '20', currencyCode: 'USD' } }] } });
    await expect(buildLiveCatalogue(shopifyConfig(LIVE).storefront!, router(catalogueRoutes([usd, product(2)])))).rejects.toThrow(/not priced in EGP/);
    await expect(buildLiveCatalogue(shopifyConfig(LIVE).storefront!, router(catalogueRoutes([product(1), product(1)])))).rejects.toThrow(/duplicate handle/);
  });
  it('toStorefrontJson keeps variant options in option order', () => {
    const j = toStorefrontJson(product(3));
    expect(j.variants[0]).toMatchObject({ id: 9006, option1: 'S', price: '850.0', available: true });
    expect(j.options).toEqual([{ name: 'Size', position: 1, values: ['S', 'M'] }]);
  });
  it('mapLimit keeps order and never exceeds its concurrency', async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (x) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight--;
      return x * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60, 70]);
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('live cart: exact bag or nothing', () => {
  const cfg = shopifyConfig(LIVE);
  const cartRoute = (cart: unknown, extra: Record<string, unknown> = {}) => router({ 'mutation Cart': () => ok({ cartCreate: { cart, userErrors: [], warnings: [], ...extra } }) });
  const line = (id: number, quantity: number, available = true) => ({ quantity, merchandise: { id: `gid://shopify/ProductVariant/${id}`, availableForSale: available } });
  it('returns the Shopify checkout URL only when every line came back exactly', async () => {
    const f = cartRoute({ checkoutUrl: 'https://inyourshoe.com/cart/c/abc?key=1', lines: { nodes: [line(11, 2), line(12, 1)] }, discountCodes: [{ code: 'REALCODE', applicable: true }], cost: { subtotalAmount: { amount: '2550.0', currencyCode: 'EGP' } } });
    const r = await createCart(cfg, [{ variantId: 11, quantity: 2 }, { variantId: 12, quantity: 1 }], ['REALCODE'], f);
    expect(r).toMatchObject({ ok: true, checkoutUrl: 'https://inyourshoe.com/cart/c/abc?key=1', subtotal: { amount: 2550, currency: 'EGP' } });
    expect(f.calls[0]!.headers['Shopify-Storefront-Private-Token']).toBe(TOKEN);
  });
  it('passes the shopper IP to Shopify (private token) and ignores junk', async () => {
    const cart = { checkoutUrl: 'https://inyourshoe.com/cart/c/abc', lines: { nodes: [line(11, 1)] }, discountCodes: [], cost: null };
    const f = cartRoute(cart);
    await createCart(cfg, [{ variantId: 11, quantity: 1 }], [], f, '203.0.113.7');
    await createCart(cfg, [{ variantId: 11, quantity: 1 }], [], f, 'unknown');
    expect(f.calls[0]!.headers['Shopify-Storefront-Buyer-IP']).toBe('203.0.113.7');
    expect(f.calls[1]!.headers['Shopify-Storefront-Buyer-IP']).toBeUndefined();
  });
  it('flags a dropped line, a changed quantity or a sold-out variant', async () => {
    const base = { checkoutUrl: 'https://inyourshoe.com/cart/c/abc', discountCodes: [], cost: null };
    expect((await createCart(cfg, [{ variantId: 11, quantity: 2 }, { variantId: 12, quantity: 1 }], [], cartRoute({ ...base, lines: { nodes: [line(11, 2)] } }))).ok).toBe(false);
    expect((await createCart(cfg, [{ variantId: 11, quantity: 2 }], [], cartRoute({ ...base, lines: { nodes: [line(11, 1)] } }))).ok).toBe(false);
    expect((await createCart(cfg, [{ variantId: 11, quantity: 2 }], [], cartRoute({ ...base, lines: { nodes: [line(11, 2, false)] } }))).ok).toBe(false);
  });
  it('never hands out a non-Shopify redirect, whatever the API returns', async () => {
    const r = await createCart(cfg, [{ variantId: 11, quantity: 1 }], [], cartRoute({ checkoutUrl: 'https://evil.example/pay', lines: { nodes: [line(11, 1)] }, discountCodes: [], cost: null }));
    expect(r).toMatchObject({ ok: false, checkoutUrl: null });
    expect(safeCheckoutUrl('http://inyourshoe.com/cart/c/x', 'inyourshoe.com')).toBeNull();
    expect(safeCheckoutUrl('https://inyourshoe.com.evil.example/x', 'inyourshoe.com')).toBeNull();
    expect(safeCheckoutUrl('https://iys.myshopify.com/checkouts/cn/x', null)).toBe('https://iys.myshopify.com/checkouts/cn/x');
  });
  it('validates the bag body before anything reaches Shopify', () => {
    expect(validateCartBody({ lines: [{ variantId: 1, quantity: 1 }] }).ok).toBe(true);
    expect(validateCartBody({ lines: [] }).ok).toBe(false);
    expect(validateCartBody({ lines: [{ variantId: -1, quantity: 1 }] }).ok).toBe(false);
    expect(validateCartBody({ lines: [{ variantId: 1, quantity: 11 }] }).ok).toBe(false);
    expect(validateCartBody({ lines: [{ variantId: 1, quantity: 1 }], discountCodes: ['A B'] }).ok).toBe(false);
    expect(validateCartBody({ lines: Array.from({ length: 51 }, (_, i) => ({ variantId: i + 1, quantity: 1 })) }).ok).toBe(false);
  });
});

describe('promotions + codes (Admin API, read-only)', () => {
  const cfg = shopifyConfig(ADMIN);
  const now = new Date('2026-10-26T12:00:00Z');
  const fs = (over: Record<string, unknown>) => ({ discount: { __typename: 'DiscountAutomaticFreeShipping', title: 'Free shipping', status: 'ACTIVE', startsAt: '2026-10-01T00:00:00Z', endsAt: null, minimumRequirement: { __typename: 'DiscountMinimumSubtotal', greaterThanOrEqualToSubtotal: { amount: '3999.0', currencyCode: 'EGP' } }, destinationSelection: { __typename: 'DiscountCountries', countries: ['EG'], includeRestOfWorld: false }, ...over } });
  it('reads the active EGP free-shipping minimum for Egypt (inclusive)', async () => {
    const f = router({ 'query FreeShipping': () => ok({ discountNodes: { nodes: [fs({}), fs({ status: 'EXPIRED', minimumRequirement: { __typename: 'DiscountMinimumSubtotal', greaterThanOrEqualToSubtotal: { amount: '100', currencyCode: 'EGP' } } })] } }) });
    expect(await activeFreeShipping(cfg, f, now)).toMatchObject({ minSubtotalEGP: 3999, inclusive: true });
    expect(f.calls[0]!.headers['X-Shopify-Access-Token']).toBe('shpat_admin_fixture');
  });
  it('ignores scheduled, other-country and non-EGP discounts', async () => {
    const f = router({ 'query FreeShipping': () => ok({ discountNodes: { nodes: [fs({ startsAt: '2026-12-01T00:00:00Z' }), fs({ destinationSelection: { __typename: 'DiscountCountries', countries: ['AE'], includeRestOfWorld: false } }), fs({ minimumRequirement: { __typename: 'DiscountMinimumSubtotal', greaterThanOrEqualToSubtotal: { amount: '100', currencyCode: 'USD' } } })] } }) });
    expect(await activeFreeShipping(cfg, f, now)).toBeNull();
  });
  it('codeStatus: ACTIVE inside its window only; unknown code → null', async () => {
    const code = (d: unknown) => router({ 'query Code': () => ok({ codeDiscountNodeByCode: d }) });
    expect(await codeStatus(cfg, 'REALCODE', code({ codeDiscount: { __typename: 'DiscountCodeBasic', title: 'x', status: 'ACTIVE', startsAt: null, endsAt: '2026-11-01T00:00:00Z' } }), now)).toMatchObject({ active: true });
    expect(await codeStatus(cfg, 'REALCODE', code({ codeDiscount: { __typename: 'DiscountCodeBasic', title: 'x', status: 'ACTIVE', startsAt: null, endsAt: '2026-10-01T00:00:00Z' } }), now)).toMatchObject({ active: false });
    expect(await codeStatus(cfg, 'NOPE', code(null), now)).toBeNull();
  });
});

describe('/api/commerce handler', () => {
  beforeEach(() => resetCommerceCache());
  const req = (q: string, init: RequestInit & { headers?: Record<string, string> } = {}) => new Request(`https://retro.example/api/commerce?${q}`, { ...init, headers: { host: 'retro.example', ...(init.headers ?? {}) } });
  it('reports status as booleans only, never a token', async () => {
    const r = await handleCommerce(req('op=status'), ADMIN);
    const text = await r.text();
    expect(JSON.parse(text)).toMatchObject({ ok: true, live: true, storefront: true, admin: true });
    expect(text).not.toContain('shpat_');
  });
  it('not configured → 503 not-configured (the client keeps the snapshot)', async () => {
    const r = await handleCommerce(req('op=catalogue&part=index'), {});
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ reason: 'not-configured' });
  });
  it('serves index + shards from one cached build (one Shopify build per TTL)', async () => {
    const f = router(catalogueRoutes([product(1), product(2)]));
    const a = await handleCommerce(req('op=catalogue&part=index'), LIVE, { fetcher: f });
    const index = JSON.parse(await a.text()) as { shardCount: number };
    const n = shardOf('fixture-tee-1', index.shardCount);
    const b = await handleCommerce(req(`op=catalogue&part=shard&n=${n}`), LIVE, { fetcher: f });
    expect(a.status).toBe(200);
    expect(a.headers.get('cache-control')).toContain('s-maxage=600');
    expect(b.status).toBe(200);
    expect(Object.keys(JSON.parse(await b.text()) as object)).toContain('fixture-tee-1');
    expect(f.calls.filter((c) => c.op === 'query Products')).toHaveLength(1);
    expect((await handleCommerce(req('op=catalogue&part=shard&n=../../etc'), LIVE, { fetcher: f })).status).toBe(404);
  });
  it('Shopify down → 502 without provider details', async () => {
    const f: Fetcher = async () => new Response('upstream secret detail', { status: 403 });
    const r = await handleCommerce(req('op=catalogue&part=index'), LIVE, { fetcher: f });
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('secret');
  });
  it('cart requires same-origin POST + a valid body', async () => {
    const body = JSON.stringify({ lines: [{ variantId: 11, quantity: 1 }] });
    expect((await handleCommerce(req('op=cart', { method: 'POST', body, headers: { 'content-type': 'application/json', origin: 'https://evil.example' } }), LIVE)).status).toBe(403);
    expect((await handleCommerce(req('op=cart', { method: 'POST', body: '{"lines":[]}', headers: { 'content-type': 'application/json', origin: 'https://retro.example' } }), LIVE)).status).toBe(400);
    expect((await handleCommerce(req('op=cart', { method: 'GET' }), LIVE)).status).toBe(405);
  });
  it('promotions need the Admin token', async () => {
    expect((await handleCommerce(req('op=promotions'), LIVE)).status).toBe(503);
  });
});

describe('/api/rewards: real merchant codes only', () => {
  const SECRET = 'x'.repeat(40);
  const reward = { id: 'snake-500', game: 'snake', minScore: 500, code: 'MERCHANTCODE', label: '10% OFF', description: 'on ur next order', minPlaySeconds: 30 };
  const env = (over: Record<string, unknown> = {}, e: Record<string, string> = ADMIN) => ({ ...e, REWARDS_SECRET: SECRET, GAME_REWARDS: JSON.stringify([{ ...reward, ...over }]) });
  const active = router({ 'query Code': () => ok({ codeDiscountNodeByCode: { codeDiscount: { __typename: 'DiscountCodeBasic', title: 'x', status: 'ACTIVE', startsAt: null, endsAt: null } } }) });
  const expired = router({ 'query Code': () => ok({ codeDiscountNodeByCode: { codeDiscount: { __typename: 'DiscountCodeBasic', title: 'x', status: 'EXPIRED', startsAt: null, endsAt: null } } }) });
  const get = (q: string, ip = '203.0.113.1') => new Request(`https://retro.example/api/rewards?${q}`, { headers: { host: 'retro.example', 'x-forwarded-for': ip } });
  const claim = (body: unknown, ip = '203.0.113.1', origin = 'https://retro.example') =>
    new Request('https://retro.example/api/rewards?op=claim', { method: 'POST', body: JSON.stringify(body), headers: { host: 'retro.example', origin, 'content-type': 'application/json', 'x-forwarded-for': ip } });
  beforeEach(() => resetRewards());

  it('parses the merchant mapping strictly and drops bad entries', () => {
    expect(parseRewards(undefined).rewards).toEqual([]);
    expect(parseRewards('nope').problems).toEqual(['GAME_REWARDS is not valid JSON']);
    const r = parseRewards(JSON.stringify([reward, { ...reward, id: 'Bad ID' }, { ...reward, game: 'pong' }, { ...reward, code: 'has space' }]));
    expect(r.rewards).toHaveLength(1);
    expect(r.problems).toHaveLength(3);
  });
  it('lists nothing when not configured, or when the secret is weak', async () => {
    expect(await (await handleRewards(get('op=list'), {})).json()).toMatchObject({ rewards: [], reason: 'not-configured' });
    expect(await (await handleRewards(get('op=list'), { ...env(), REWARDS_SECRET: 'short' })).json()).toMatchObject({ rewards: [] });
  });
  it('lists only codes Shopify says are ACTIVE, and never includes the code', async () => {
    const r = await (await handleRewards(get('op=list'), env(), { fetcher: active })).text();
    expect(JSON.parse(r).rewards).toHaveLength(1);
    expect(r).not.toContain('MERCHANTCODE');
    resetRewards();
    expect((await (await handleRewards(get('op=list'), env(), { fetcher: expired })).json()).rewards).toEqual([]);
  });
  it('without Admin access, only a merchant-confirmed date keeps a reward on', async () => {
    const t = Date.parse('2026-10-26T12:00:00Z');
    expect((await (await handleRewards(get('op=list'), env({}, LIVE), { now: () => t })).json()).rewards).toEqual([]);
    resetRewards();
    expect((await (await handleRewards(get('op=list'), env({ merchantConfirmedUntil: '2026-10-31' }, LIVE), { now: () => t })).json()).rewards).toHaveLength(1);
    resetRewards();
    expect((await (await handleRewards(get('op=list'), env({ merchantConfirmedUntil: '2026-10-01' }, LIVE), { now: () => t })).json()).rewards).toEqual([]);
  });
  it('tickets are HMAC-signed and tamper-evident', async () => {
    const t = await signTicket(SECRET, 'snake', 1000, 'abcdefghijklmnop');
    expect(await verifyTicket(SECRET, t)).toEqual({ game: 'snake', issuedAt: 1000, nonce: 'abcdefghijklmnop' });
    expect(await verifyTicket(SECRET, t.replace('snake', 'tower'))).toBeNull();
    expect(await verifyTicket('y'.repeat(40), t)).toBeNull();
    expect(await verifyTicket(SECRET, 'garbage')).toBeNull();
  });
  it('claim: earned + played long enough + single use → the code; otherwise no code', async () => {
    let now = Date.parse('2026-10-26T12:00:00Z');
    const deps = { fetcher: active, now: () => now, nonce: () => 'nonce-0123456789abcdef' };
    const { ticket } = (await (await handleRewards(get('op=ticket&game=snake'), env(), deps)).json()) as { ticket: string };
    expect(typeof ticket).toBe('string');
    // too quick
    expect((await handleRewards(claim({ rewardId: 'snake-500', ticket, score: 900, won: false }), env(), deps)).status).toBe(400);
    now += 45_000;
    // not earned
    const low = await handleRewards(claim({ rewardId: 'snake-500', ticket, score: 499 }), env(), deps);
    expect(low.status).toBe(400);
    expect(await low.text()).not.toContain('MERCHANTCODE');
    // earned
    const good = await handleRewards(claim({ rewardId: 'snake-500', ticket, score: 500 }, '203.0.113.2'), env(), deps);
    expect(await good.json()).toMatchObject({ ok: true, code: 'MERCHANTCODE' });
    // the same run can't claim twice
    expect((await handleRewards(claim({ rewardId: 'snake-500', ticket, score: 500 }, '203.0.113.3'), env(), deps)).status).toBe(409);
  });
  it('claim refuses cross-origin calls, other games’ tickets and expired codes', async () => {
    const now = Date.parse('2026-10-26T12:00:00Z');
    const ticket = await signTicket(SECRET, 'tower', now - 60_000, 'nonce-tower-0123456789');
    expect((await handleRewards(claim({ rewardId: 'snake-500', ticket, score: 900 }, '203.0.113.4', 'https://evil.example'), env(), { fetcher: active, now: () => now })).status).toBe(403);
    expect((await handleRewards(claim({ rewardId: 'snake-500', ticket, score: 900 }, '203.0.113.4'), env(), { fetcher: active, now: () => now })).status).toBe(400);
    const snakeTicket = await signTicket(SECRET, 'snake', now - 60_000, 'nonce-snake-0123456789');
    const r = await handleRewards(claim({ rewardId: 'snake-500', ticket: snakeTicket, score: 900 }, '203.0.113.5'), env(), { fetcher: expired, now: () => now });
    expect(r.status).toBe(410);
    expect(await r.text()).not.toContain('MERCHANTCODE');
  });
  it('simultaneous claims with one ticket: exactly one gets the code', async () => {
    const now = Date.parse('2026-10-26T12:00:00Z');
    const ticket = await signTicket(SECRET, 'snake', now - 60_000, 'nonce-race-0123456789ab');
    const slowActive: Fetcher = async (u, i) => {
      await new Promise((r) => setTimeout(r, 5));
      return active(u, i);
    };
    const rs = await Promise.all(Array.from({ length: 5 }, (_, i) => handleRewards(claim({ rewardId: 'snake-500', ticket, score: 900 }, `192.0.2.${i + 10}`), env(), { fetcher: slowActive, now: () => now })));
    const statuses = rs.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409, 409, 409, 409]);
  });
  it('claims are rate-limited per client', async () => {
    const now = Date.parse('2026-10-26T12:00:00Z');
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await handleRewards(claim({ rewardId: 'snake-500', ticket: 'x', score: 1 }, '198.51.100.77'), env(), { fetcher: active, now: () => now })).status);
    expect(statuses.slice(0, 5).every((s) => s === 400)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('http helpers', () => {
  it('sameOrigin compares Origin with the requested host', () => {
    expect(sameOrigin(new Request('https://a.example/x', { headers: { origin: 'https://a.example', host: 'a.example' } }))).toBe(true);
    expect(sameOrigin(new Request('https://a.example/x', { headers: { origin: 'https://b.example', host: 'a.example' } }))).toBe(false);
    expect(sameOrigin(new Request('https://a.example/x', { headers: { host: 'a.example' } }))).toBe(false);
  });
  it('readJson caps size and requires JSON', async () => {
    expect(await readJson(new Request('https://a/x', { method: 'POST', body: 'x'.repeat(20), headers: { 'content-type': 'application/json' } }), 10)).toMatchObject({ ok: false, status: 413 });
    expect(await readJson(new Request('https://a/x', { method: 'POST', body: '{}', headers: { 'content-type': 'text/plain' } }), 10)).toMatchObject({ ok: false, status: 415 });
    expect(await readJson(new Request('https://a/x', { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } }), 10)).toEqual({ ok: true, value: { a: 1 } });
  });
  it('rate limiter: sliding window per key', () => {
    let t = 0;
    const l = createRateLimiter(2, 1000, () => t);
    expect([l.take('a'), l.take('a'), l.take('a'), l.take('b')]).toEqual([true, true, false, true]);
    t = 1001;
    expect(l.take('a')).toBe(true);
  });
});
