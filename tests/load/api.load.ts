/**
 * Concurrency / load scenarios for the server functions, run IN-PROCESS
 * against fixture providers. Nothing here touches Shopify, Resend, the live
 * IYS store or any deployment: every upstream is a local fake with a
 * configurable latency and failure mode.
 *
 *   npm run load:api            (writes a JSON summary when LOAD_OUT is set)
 *
 * Honest scope: this measures the handlers' own behaviour under concurrency
 * (caching, in-flight dedupe, rate limits, retries, races, error paths) on one
 * Node process. It does not measure Vercel's network, cold starts or CDN.
 */
import { writeFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../api/_lib/http';
import { handleCommerce, resetCommerceCache } from '../../api/_lib/commerce';
import { handleRewards, resetRewards, signTicket } from '../../api/_lib/rewards';
import type { Fetcher, SfProduct } from '../../api/_lib/shopify';
import { handleSupport, type Sender } from '../../api/_lib/support';

const LIVE = { COMMERCE_LIVE: '1', SHOPIFY_STORE_DOMAIN: 'iys-fixture.myshopify.com', SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'fixture-token', SHOPIFY_ADMIN_TOKEN: 'fixture-admin' };
const results: Record<string, unknown> = {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stats(ms: number[]) {
  const s = [...ms].sort((a, b) => a - b);
  const q = (p: number) => Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]! * 10) / 10;
  return { n: s.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) };
}
/** Run `total` jobs with `concurrency` in flight; returns statuses + latencies. */
async function run(total: number, concurrency: number, job: (i: number) => Promise<Response>) {
  const statuses: number[] = [];
  const lat: number[] = [];
  let next = 0;
  const t0 = performance.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < total) {
        const i = next++;
        const t = performance.now();
        const r = await job(i);
        lat.push(performance.now() - t);
        statuses.push(r.status);
        await r.arrayBuffer();
      }
    }),
  );
  const wall = performance.now() - t0;
  const byStatus = statuses.reduce<Record<number, number>>((a, s) => ((a[s] = (a[s] ?? 0) + 1), a), {});
  return { byStatus, latencyMs: stats(lat), wallMs: Math.round(wall), rps: Math.round((total / wall) * 1000) };
}

/* ── fixture Shopify ───────────────────────────────────────────────── */
const product = (n: number): SfProduct => ({
  id: `gid://shopify/Product/${1000 + n}`,
  handle: `load-tee-${n}`,
  title: `Load Tee ${n}`,
  descriptionHtml: '<p>x</p>',
  productType: 'T-Shirt',
  vendor: 'IYS',
  tags: [],
  createdAt: '2026-10-01T00:00:00Z',
  publishedAt: '2026-10-01T00:00:00Z',
  options: [{ name: 'Size', optionValues: [{ name: 'S' }, { name: 'M' }] }],
  images: { nodes: [{ id: `gid://shopify/ProductImage/${n}`, url: `https://cdn.shopify.com/x/${n}.jpg`, width: 800, height: 1000, altText: null }] },
  variants: { nodes: ['S', 'M'].map((s, k) => ({ id: `gid://shopify/ProductVariant/${n * 2 + k}`, title: s, availableForSale: true, selectedOptions: [{ name: 'Size', value: s }], price: { amount: '850.0', currencyCode: 'EGP' }, compareAtPrice: null, image: null })) },
});
const PRODUCTS = Array.from({ length: 1250 }, (_, i) => product(i + 1));
const COLLECTIONS = Array.from({ length: 67 }, (_, i) => ({ handle: `col-${i}`, title: `Col ${i}` }));

function fakeShopify(opts: { latencyMs: number; fail?: (call: number) => number | null }) {
  const counts: Record<string, number> = {};
  let calls = 0;
  let inFlight = 0;
  let peak = 0;
  const f: Fetcher = async (_url, init) => {
    const n = ++calls;
    inFlight++;
    peak = Math.max(peak, inFlight);
    try {
      await sleep(opts.latencyMs);
      const failStatus = opts.fail?.(n) ?? null;
      if (failStatus) return new Response('', { status: failStatus, headers: failStatus === 429 ? { 'retry-after': '0.05' } : {} });
      const { query, variables } = JSON.parse(String(init.body)) as { query: string; variables: { after?: string | null; handle?: string; input?: { lines: { merchandiseId: string; quantity: number }[] } } };
      const op = /query (\w+)|mutation (\w+)/.exec(query)!.slice(1).find(Boolean)!;
      counts[op] = (counts[op] ?? 0) + 1;
      const page = <T,>(all: T[], size: number) => {
        const start = Number(variables.after ?? 0);
        const nodes = all.slice(start, start + size);
        return { pageInfo: { hasNextPage: start + size < all.length, endCursor: String(start + size) }, nodes };
      };
      let data: unknown;
      if (op === 'Products') data = { products: page(PRODUCTS, 50) };
      else if (op === 'Collections') data = { collections: page(COLLECTIONS, 100) };
      else if (op === 'CollectionProducts') data = { collection: { products: page(PRODUCTS.slice(0, 40).map((p) => ({ handle: p.handle })), 250) } };
      else if (op === 'Cart') {
        const lines = variables.input!.lines;
        data = { cartCreate: { cart: { checkoutUrl: 'https://inyourshoe.com/cart/c/fixture', lines: { nodes: lines.map((l) => ({ quantity: l.quantity, merchandise: { id: l.merchandiseId, availableForSale: true } })) }, discountCodes: [], cost: null }, userErrors: [], warnings: [] } };
      } else if (op === 'Code') data = { codeDiscountNodeByCode: { codeDiscount: { __typename: 'DiscountCodeBasic', title: 'x', status: 'ACTIVE', startsAt: null, endsAt: null } } };
      else if (op === 'FreeShipping') data = { discountNodes: { nodes: [] } };
      else data = {};
      return new Response(JSON.stringify({ data }), { status: 200 });
    } finally {
      inFlight--;
    }
  };
  return { f, counts, get calls() { return calls; }, get peak() { return peak; } };
}

const get = (q: string, ip: string) => new Request(`https://retro.example/api/commerce?${q}`, { headers: { host: 'retro.example', 'x-forwarded-for': ip } });
const post = (path: string, body: unknown, ip: string, extra: Record<string, string> = {}) =>
  new Request(`https://retro.example${path}`, { method: 'POST', body: JSON.stringify(body), headers: { host: 'retro.example', origin: 'https://retro.example', 'content-type': 'application/json', 'x-forwarded-for': ip, ...extra } });
const ip = (i: number) => `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;

describe('/api/commerce under concurrency (fixture Shopify, 1,250 products, 67 collections)', () => {
  beforeEach(() => resetCommerceCache());

  it('cold-cache stampede: 500 simultaneous visitors → ONE Shopify build, everyone served', async () => {
    const shop = fakeShopify({ latencyMs: 20 });
    const r = await run(500, 500, (i) => handleCommerce(get('op=catalogue&part=index', ip(i)), LIVE, { fetcher: shop.f }));
    results.catalogueColdStampede = { ...r, shopifyCalls: shop.calls, productPages: shop.counts.Products, peakShopifyConcurrency: shop.peak };
    expect(r.byStatus).toEqual({ 200: 500 });
    expect(shop.counts.Products).toBe(25); // one build: 1,250 / 50 per page
    expect(shop.peak).toBeLessThanOrEqual(4); // collection reads 4 at a time, never a flood
  });

  it('warm cache: 20,000 index + shard reads, no Shopify calls', async () => {
    const shop = fakeShopify({ latencyMs: 20 });
    await handleCommerce(get('op=catalogue&part=index', ip(1)), LIVE, { fetcher: shop.f });
    const before = shop.calls;
    const r = await run(20_000, 200, (i) => handleCommerce(get(i % 2 ? 'op=catalogue&part=index' : `op=catalogue&part=shard&n=${i % 32}`, ip(i + 10)), LIVE, { fetcher: shop.f }));
    results.catalogueWarm = { ...r, shopifyCallsDuringRun: shop.calls - before };
    expect(shop.calls - before).toBe(0);
    expect(Object.keys(r.byStatus).every((s) => s === '200' || s === '404')).toBe(true);
  });

  it('Shopify down: every request fails fast and honestly (502), no crash, no retry storm', async () => {
    const shop = fakeShopify({ latencyMs: 5, fail: () => 503 });
    const r = await run(300, 300, (i) => handleCommerce(get('op=catalogue&part=index', ip(i)), LIVE, { fetcher: shop.f }));
    results.catalogueShopifyDown = { ...r, shopifyCalls: shop.calls };
    expect(r.byStatus).toEqual({ 502: 300 });
    expect(shop.calls).toBe(3); // one shared build, 3 attempts with backoff
  });

  it('Shopify throttling (429 then OK): retried with Retry-After, all visitors served', async () => {
    const shop = fakeShopify({ latencyMs: 5, fail: (n) => (n <= 2 ? 429 : null) });
    const r = await run(200, 200, (i) => handleCommerce(get('op=catalogue&part=index', ip(i)), LIVE, { fetcher: shop.f }));
    results.catalogueThrottled = r;
    expect(r.byStatus).toEqual({ 200: 200 });
  });

  it('promotions: 300 bags opening at once → one Admin API read', async () => {
    const shop = fakeShopify({ latencyMs: 30 });
    const r = await run(300, 300, (i) => handleCommerce(get('op=promotions', ip(i)), LIVE, { fetcher: shop.f }));
    results.promotionsColdStampede = { ...r, adminCalls: shop.calls };
    expect(r.byStatus).toEqual({ 200: 300 });
    expect(shop.calls).toBe(1);
  });

  it('cart: 400 shoppers at once each get their own exact Shopify cart; one IP hammering is limited', async () => {
    const shop = fakeShopify({ latencyMs: 80 });
    const body = (i: number) => ({ lines: [{ variantId: 1000 + i, quantity: 1 + (i % 3) }] });
    const many = await run(400, 400, (i) => handleCommerce(post('/api/commerce?op=cart', body(i), ip(i)), LIVE, { fetcher: shop.f }));
    const one = await run(40, 40, (i) => handleCommerce(post('/api/commerce?op=cart', body(i), '192.0.2.1'), LIVE, { fetcher: shop.f }));
    results.cartManyShoppers = many;
    results.cartOneIpBurst = one;
    expect(many.byStatus).toEqual({ 200: 400 });
    expect(one.byStatus).toEqual({ 200: 20, 429: 20 });
  });
});

describe('/api/support-email under concurrency (mocked sender, nothing is emailed)', () => {
  it('300 different customers at once: all delivered once; one IP bursting is limited to 5', async () => {
    let sent = 0;
    const send: Sender = async () => {
      await sleep(100);
      sent++;
      return true;
    };
    const env = { RESEND_API_KEY: 'fixture', SUPPORT_FROM_EMAIL: 'IYS <mail@fixture.example>' };
    const msg = { email: 'a@example.com', name: 'Load', order: '', topic: 'Delivery', subject: 'Load test', message: 'hello there', website: '' };
    const limiter = createRateLimiter(5, 10 * 60_000);
    const many = await run(300, 300, (i) => handleSupport(post('/api/support-email', msg, ip(i)), env, send, new Date(), limiter));
    const before = sent;
    const burst = await run(20, 20, () => handleSupport(post('/api/support-email', msg, '198.51.100.9'), env, send, new Date(), limiter));
    results.mailManyCustomers = { ...many, delivered: before };
    results.mailOneIpBurst = { ...burst, delivered: sent - before };
    expect(many.byStatus).toEqual({ 200: 300 });
    expect(before).toBe(300);
    expect(burst.byStatus).toEqual({ 200: 5, 429: 15 });
  });

  it('provider outage: honest 502 for everyone, no unhandled errors', async () => {
    const send: Sender = async () => {
      throw new Error('provider down');
    };
    const env = { RESEND_API_KEY: 'fixture', SUPPORT_FROM_EMAIL: 'IYS <mail@fixture.example>' };
    const msg = { email: 'a@example.com', name: 'Load', order: '', topic: 'Delivery', subject: 'Load test', message: 'hello there', website: '' };
    const r = await run(200, 200, (i) => handleSupport(post('/api/support-email', msg, ip(i)), env, send, new Date(), createRateLimiter(5, 60_000)));
    results.mailProviderDown = r;
    expect(r.byStatus).toEqual({ 502: 200 });
  });
});

describe('/api/rewards under concurrency (fixture Admin API)', () => {
  const SECRET = 'load-secret-'.padEnd(40, 'x');
  const env = { ...LIVE, REWARDS_SECRET: SECRET, GAME_REWARDS: JSON.stringify([{ id: 'snake-500', game: 'snake', minScore: 500, code: 'FIXTURECODE', label: '10% OFF', description: 'fixture', minPlaySeconds: 10 }]) };
  beforeEach(() => resetRewards());

  it('100 simultaneous claims replaying ONE ticket: exactly one code', async () => {
    const shop = fakeShopify({ latencyMs: 15 });
    const now = Date.now();
    const ticket = await signTicket(SECRET, 'snake', now - 60_000, 'load-nonce-0123456789abcd');
    const r = await run(100, 100, (i) => handleRewards(post('/api/rewards?op=claim', { rewardId: 'snake-500', ticket, score: 900 }, ip(i)), env, { fetcher: shop.f, now: () => now }));
    results.rewardsReplayRace = r;
    expect(r.byStatus).toEqual({ 200: 1, 409: 99 });
  });

  it('300 players listing rewards at once: one Admin API check per 5 minutes', async () => {
    const shop = fakeShopify({ latencyMs: 15 });
    const r = await run(300, 300, (i) => handleRewards(new Request('https://retro.example/api/rewards?op=list', { headers: { host: 'retro.example', 'x-forwarded-for': ip(i) } }), env, { fetcher: shop.f }));
    results.rewardsList = { ...r, adminCalls: shop.calls };
    expect(r.byStatus).toEqual({ 200: 300 });
    expect(shop.calls).toBe(1); // one configured reward → one Admin API check, however many players
  });
});

afterAll(() => {
  console.log(JSON.stringify(results, null, 1));
  if (process.env.LOAD_OUT) writeFileSync(process.env.LOAD_OUT, JSON.stringify(results, null, 1));
});
