/**
 * TOKEN-LESS live catalogue (server-side). Reads the store's PUBLIC storefront
 * JSON — the exact same endpoints the snapshot sync uses (scripts/sync-products.mjs):
 *
 *   https://<domain>/products.json?limit=250&page=N          bulk catalogue
 *   https://<domain>/collections.json?limit=250              collection titles
 *   https://<domain>/collections/<h>/products.json?page=N    membership + order
 *
 * No API key, no app, nothing to expire. Products are fed through the SAME
 * normaliser the sync and the Storefront-API path use (normalizeStorefrontProduct
 * is written for the /products.json shape), and the SAME buildOutputs, so the
 * UI gets a byte-compatible catalogue whether it comes from the snapshot, a
 * Storefront token, or this public reader.
 *
 * Note: /products.json never exposes metafields, so a variant placed on a
 * cycle-count hold (custom.count_hold) still reads as available here. Real
 * stock is still enforced at Shopify checkout; the hold is a soft pause.
 */
// @ts-expect-error: plain ESM module shared with the Node sync scripts
import { normalizeStorefrontProduct } from '../../scripts/lib/normalize.mjs';
// @ts-expect-error: plain ESM module shared with the Node sync scripts
import { buildOutputs } from '../../scripts/lib/outputs.mjs';
import { mapLimit, type Fetcher, type LiveCatalogue } from './shopify.js';

const pause = (attempt: number, ms?: number) => new Promise((r) => setTimeout(r, Math.min(ms ?? 400 * 2 ** attempt, 4000)));

/** GET public JSON with Shopify-aware retries (429 / 5xx, Retry-After honoured, 10 s timeout). */
async function getJson<T>(url: string, fetcher: Fetcher, tries = 3): Promise<T> {
  let lastError = 'unknown error';
  for (let attempt = 0; attempt < tries; attempt++) {
    let res: Response;
    try {
      res = await fetcher(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
    } catch (e) {
      lastError = `network: ${(e as Error).message}`;
      await pause(attempt);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      lastError = `HTTP ${res.status}`;
      const ra = Number(res.headers.get('retry-after'));
      await pause(attempt, Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined);
      continue;
    }
    if (res.status === 404) throw Object.assign(new Error('HTTP 404'), { status: 404 });
    if (!res.ok) throw new Error(`Shopify HTTP ${res.status}`);
    return (await res.json()) as T;
  }
  throw new Error(`Shopify unavailable (${lastError})`);
}

interface RawProduct {
  handle: string;
  [k: string]: unknown;
}

/**
 * Build the live catalogue from public storefront JSON, in the snapshot's own
 * format. Throws (so the caller keeps serving the snapshot) only when the store
 * returns nothing at all.
 */
export async function buildLiveCataloguePublic(domain: string, fetcher: Fetcher = fetch, now = new Date()): Promise<LiveCatalogue> {
  const origin = `https://${domain}`;
  const retrievedAt = now.toISOString();

  // 1. Bulk products (first write wins — same as the sync).
  const raw = new Map<string, RawProduct>();
  for (let page = 1; page < 60; page++) {
    const data = await getJson<{ products?: RawProduct[] }>(`${origin}/products.json?limit=250&page=${page}`, fetcher);
    const products = data.products ?? [];
    if (!products.length) break;
    for (const p of products) if (p?.handle && !raw.has(p.handle)) raw.set(p.handle, p);
  }
  if (!raw.size) throw new Error('live catalogue: products.json returned no products');

  // 2. Collection titles (best-effort).
  let cols: { handle: string; title: string }[] = [];
  try {
    const data = await getJson<{ collections?: { handle: string; title: string }[] }>(`${origin}/collections.json?limit=250`, fetcher);
    cols = (data.collections ?? []).filter((c) => c?.handle);
  } catch {
    cols = [];
  }

  // 3. Ordered membership per collection (a few at a time; also fills any gaps).
  const members = await mapLimit(cols, 4, async (c) => {
    const order: string[] = [];
    for (let page = 1; page < 30; page++) {
      let data: { products?: RawProduct[] };
      try {
        data = await getJson<{ products?: RawProduct[] }>(`${origin}/collections/${encodeURIComponent(c.handle)}/products.json?limit=250&page=${page}`, fetcher);
      } catch {
        break; // 404 / unreachable collection — skip it
      }
      const products = data.products ?? [];
      if (!products.length) break;
      for (const p of products) {
        if (!p?.handle) continue;
        order.push(p.handle);
        if (!raw.has(p.handle)) raw.set(p.handle, p);
      }
    }
    return [...new Set(order)];
  });

  // 4. Normalise everything through the shared normaliser.
  const products = [...raw.values()].map((p) => normalizeStorefrontProduct(p, { retrievedAt, method: 'products.json' }) as { handle: string; collections: string[] });
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const collectionMeta: Record<string, { title: string; count: number; order: string[] }> = {};
  cols.forEach((c, i) => {
    const order = members[i]!.filter((h) => byHandle.has(h));
    collectionMeta[c.handle] = { title: c.title ?? c.handle, count: order.length, order };
    for (const h of order) byHandle.get(h)!.collections.push(c.handle);
  });
  for (const p of products) p.collections.sort();

  const out = buildOutputs(products, collectionMeta, { generatedAt: retrievedAt, currency: 'EGP' }) as { index: string; shards: Record<string, string> };
  return { index: out.index, shards: out.shards, generatedAt: retrievedAt, productCount: products.length };
}
