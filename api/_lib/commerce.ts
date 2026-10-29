/**
 * /api/commerce: the live-Shopify boundary (see ./shopify.ts for the switch).
 *
 *   GET  ?op=status                     what's configured (booleans only, never a secret)
 *   GET  ?op=catalogue&part=index       live catalogue index, snapshot format
 *   GET  ?op=catalogue&part=shard&n=7   one live detail shard
 *   POST ?op=cart                       Shopify cartCreate for the exact bag (+ codes)
 *   GET  ?op=promotions                 active automatic free shipping (Admin API)
 *
 * Not configured → 503 { ok:false, reason:'not-configured' } and the client
 * stays on the snapshot. Errors never include provider details or secrets.
 */
import { clientKey, createRateLimiter, json, readJson, sameOrigin } from './http.js';
import { activeFreeShipping, buildLiveCatalogue, createCart, shopifyConfig, type Fetcher, type LiveCatalogue, type ShopifyEnv } from './shopify.js';
import { buildLiveCataloguePublic } from './shopify-public.js';

const CATALOGUE_TTL = 10 * 60_000;
const PROMO_TTL = 5 * 60_000;
const MAX_LINES = 50;
const MAX_QTY = 10;

interface Deps {
  fetcher?: Fetcher;
  now?: () => number;
}

let catalogue: { at: number; data: LiveCatalogue } | null = null;
let building: Promise<LiveCatalogue> | null = null;
let promo: { at: number; data: Awaited<ReturnType<typeof activeFreeShipping>> } | null = null;
let promoLoading: Promise<Awaited<ReturnType<typeof activeFreeShipping>>> | null = null;
const cartLimiter = createRateLimiter(20, 60_000);
const readLimiter = createRateLimiter(120, 60_000);

/** Tests only. */
export function resetCommerceCache() {
  catalogue = null;
  building = null;
  promo = null;
  promoLoading = null;
}

const notConfigured = (problems: string[]) => json(503, { ok: false, reason: 'not-configured', problems });
const SHARD = /^p-\d{2}\.json$/;

async function liveCatalogue(env: ShopifyEnv, deps: Deps): Promise<LiveCatalogue> {
  const cfg = shopifyConfig(env);
  const now = (deps.now ?? Date.now)();
  if (catalogue && now - catalogue.at < CATALOGUE_TTL) return catalogue.data;
  // One build at a time per instance (no thundering herd on Shopify).
  // Public mode reads the store's public JSON (no token); token mode uses the Storefront API.
  building ??= (cfg.publicMode ? buildLiveCataloguePublic(cfg.domain!, deps.fetcher) : buildLiveCatalogue(cfg.storefront!, deps.fetcher))
    .then((data) => {
      catalogue = { at: (deps.now ?? Date.now)(), data };
      return data;
    })
    .finally(() => {
      building = null;
    });
  return building;
}

export function validateCartBody(v: unknown): { ok: true; lines: { variantId: number; quantity: number }[]; codes: string[] } | { ok: false; error: string } {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, error: 'Malformed request.' };
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.lines) || o.lines.length < 1 || o.lines.length > MAX_LINES) return { ok: false, error: 'Bag lines missing.' };
  const lines: { variantId: number; quantity: number }[] = [];
  for (const l of o.lines) {
    const x = l as Record<string, unknown>;
    if (!x || !Number.isSafeInteger(x.variantId) || (x.variantId as number) <= 0 || !Number.isSafeInteger(x.quantity) || (x.quantity as number) < 1 || (x.quantity as number) > MAX_QTY) return { ok: false, error: 'A bag line is invalid.' };
    lines.push({ variantId: x.variantId as number, quantity: x.quantity as number });
  }
  const codes = Array.isArray(o.discountCodes) ? o.discountCodes : [];
  if (codes.length > 3 || codes.some((c) => typeof c !== 'string' || !/^[A-Z0-9_-]{1,64}$/i.test(c))) return { ok: false, error: 'Discount code is invalid.' };
  return { ok: true, lines, codes: (codes as string[]).map((c) => c.toUpperCase()) };
}

export async function handleCommerce(req: Request, env: ShopifyEnv, deps: Deps = {}): Promise<Response> {
  const url = new URL(req.url);
  const op = url.searchParams.get('op');
  const cfg = shopifyConfig(env);
  const who = clientKey(req);

  if (op === 'status' && req.method === 'GET') {
    return json(200, { ok: true, live: cfg.live, mode: cfg.publicMode ? 'public' : cfg.live ? 'token' : 'off', storefront: Boolean(cfg.storefront), admin: Boolean(cfg.admin), apiVersion: cfg.version, problems: cfg.problems });
  }

  if (op === 'catalogue' && req.method === 'GET') {
    if (!cfg.live) return notConfigured(cfg.problems);
    if (!readLimiter.take(who)) return json(429, { ok: false, error: 'Too many requests.' });
    const part = url.searchParams.get('part');
    let data: LiveCatalogue;
    try {
      data = await liveCatalogue(env, deps);
    } catch {
      return json(502, { ok: false, reason: 'shopify-unavailable' });
    }
    const cache = { 'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=3600' };
    if (part === 'index') return new Response(data.index, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'X-IYS-Source': 'shopify-storefront', ...cache } });
    if (part === 'shard') {
      const n = Number(url.searchParams.get('n'));
      const name = `p-${String(n).padStart(2, '0')}.json`;
      if (!Number.isInteger(n) || !SHARD.test(name) || !(name in data.shards)) return json(404, { ok: false, error: 'No such shard.' });
      return new Response(data.shards[name], { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...cache } });
    }
    return json(400, { ok: false, error: 'Unknown part.' });
  }

  if (op === 'cart' && req.method === 'POST') {
    if (!sameOrigin(req)) return json(403, { ok: false, error: 'Forbidden.' });
    // Token-less public mode has no server cart: the client checks out via a cart permalink.
    if (cfg.publicMode) return json(501, { ok: false, reason: 'public-mode', error: 'Server cart needs a Storefront API token; this build checks out via cart permalink.' });
    if (!cfg.live) return notConfigured(cfg.problems);
    if (!cartLimiter.take(who)) return json(429, { ok: false, error: 'Too many requests. Try again in a minute.' });
    const body = await readJson(req, 8_000);
    if (!body.ok) return json(body.status, { ok: false, error: body.error });
    const v = validateCartBody(body.value);
    if (!v.ok) return json(400, { ok: false, error: v.error });
    try {
      return json(200, await createCart(cfg, v.lines, v.codes, deps.fetcher, who));
    } catch {
      return json(502, { ok: false, reason: 'shopify-unavailable' });
    }
  }

  if (op === 'promotions' && req.method === 'GET') {
    if (!cfg.live || !cfg.admin) return notConfigured(cfg.admin ? cfg.problems : [...cfg.problems, 'no Admin API token (read_discounts)']);
    if (!readLimiter.take(who)) return json(429, { ok: false, error: 'Too many requests.' });
    const now = (deps.now ?? Date.now)();
    let data: Awaited<ReturnType<typeof activeFreeShipping>>;
    try {
      if (promo && now - promo.at <= PROMO_TTL) data = promo.data;
      else {
        // One Admin API read at a time per instance, however many bags open at once.
        promoLoading ??= activeFreeShipping(cfg, deps.fetcher, new Date(now))
          .then((d) => {
            promo = { at: now, data: d };
            return d;
          })
          .finally(() => {
            promoLoading = null;
          });
        data = await promoLoading;
      }
    } catch {
      return json(502, { ok: false, reason: 'shopify-unavailable' });
    }
    return json(200, { ok: true, freeShipping: data }, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
  }

  return json(405, { ok: false, error: 'Unknown operation.' }, { Allow: 'GET, POST' });
}
