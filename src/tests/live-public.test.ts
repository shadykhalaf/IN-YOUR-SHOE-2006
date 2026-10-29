/**
 * Token-less PUBLIC live mode against FIXTURE public-storefront JSON only.
 * No network, no tokens. Proves COMMERCE_PUBLIC reads /products.json +
 * /collections.json and serves a valid catalogue through the same handler.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { shopifyConfig, type Fetcher } from '../../api/_lib/shopify';
import { buildLiveCataloguePublic } from '../../api/_lib/shopify-public';
import { handleCommerce, resetCommerceCache } from '../../api/_lib/commerce';

const PUBLIC = { COMMERCE_PUBLIC: '1', SHOPIFY_STORE_DOMAIN: 'inyourshoe.com' };

const okJson = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });

/** A /products.json-shaped product (public storefront JSON: tags are a comma string, prices are strings). */
const pub = (n: number, over: Record<string, unknown> = {}) => ({
  id: 1000 + n,
  handle: `fixture-tee-${n}`,
  title: `Fixture Tee ${n}`,
  body_html: '<p>Soft cotton.</p>',
  product_type: 'T-Shirt',
  vendor: 'In Your Shoe',
  tags: 'tops, cotton',
  created_at: '2026-10-01T10:00:00Z',
  published_at: '2026-10-01T10:00:00Z',
  options: [{ name: 'Size', position: 1, values: ['S', 'M'] }],
  images: [{ id: 5000 + n, src: `https://cdn.shopify.com/s/files/1/x/tee-${n}.jpg?v=1`, width: 1000, height: 1250 }],
  variants: [
    { id: 9000 + n * 2, title: 'S', option1: 'S', option2: null, option3: null, price: '850.00', compare_at_price: null, available: true, featured_image: null },
    { id: 9001 + n * 2, title: 'M', option1: 'M', option2: null, option3: null, price: '850.00', compare_at_price: '1000.00', available: false, featured_image: null },
  ],
  ...over,
});

/** Route public GET JSON by URL path. */
const router = (products: Record<string, unknown>[]): Fetcher & { urls: string[] } => {
  const urls: string[] = [];
  const f = (async (url: string) => {
    urls.push(url);
    const u = new URL(url);
    const page = Number(u.searchParams.get('page') ?? '1');
    if (u.pathname === '/products.json') return okJson({ products: page === 1 ? products : [] });
    if (u.pathname === '/collections.json') return okJson({ collections: [{ handle: 'all-tops', title: 'All Tops' }, { handle: 'best-sellers', title: 'Best Sellers' }] });
    if (u.pathname.startsWith('/collections/')) {
      if (page > 1) return okJson({ products: [] });
      const handle = u.pathname.split('/')[2];
      const order = handle === 'best-sellers' ? [products[1], products[0]] : products;
      return okJson({ products: order });
    }
    return new Response('not found', { status: 404 });
  }) as unknown as Fetcher & { urls: string[] };
  f.urls = urls;
  return f;
};

beforeEach(() => resetCommerceCache());

describe('shopifyConfig: token-less public mode', () => {
  it('is live in public mode with just a valid domain, no token, publicMode=true', () => {
    const cfg = shopifyConfig(PUBLIC);
    expect(cfg.live).toBe(true);
    expect(cfg.publicMode).toBe(true);
    expect(cfg.storefront).toBeNull();
    expect(cfg.problems).toEqual([]);
  });

  it('a Storefront token still wins over public mode', () => {
    const cfg = shopifyConfig({ ...PUBLIC, COMMERCE_LIVE: '1', SHOPIFY_STORE_DOMAIN: 'iys.myshopify.com', SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'shpat_x' });
    expect(cfg.publicMode).toBe(false);
    expect(cfg.storefront).not.toBeNull();
  });

  it('public mode off without a valid domain', () => {
    expect(shopifyConfig({ COMMERCE_PUBLIC: '1' }).live).toBe(false);
    expect(shopifyConfig({ COMMERCE_PUBLIC: '1', SHOPIFY_STORE_DOMAIN: 'not a host' }).publicMode).toBe(false);
  });
});

describe('buildLiveCataloguePublic: snapshot-format catalogue from public JSON', () => {
  it('builds an index + shards from /products.json and /collections.json', async () => {
    const f = router([pub(1), pub(2), pub(3)]);
    const cat = await buildLiveCataloguePublic('inyourshoe.com', f);
    expect(cat.productCount).toBe(3);
    expect(typeof cat.index).toBe('string');
    // index references products that exist in the shards
    expect(Object.keys(cat.shards).length).toBeGreaterThan(0);
    expect(cat.index).toContain('fixture-tee-1');
    // only the public endpoints were hit — no admin/graphql
    expect(f.urls.every((u) => u.includes('/products.json') || u.includes('/collections'))).toBe(true);
  });

  it('throws when the store returns no products (caller keeps the snapshot)', async () => {
    const empty = (async () => okJson({ products: [] })) as Fetcher;
    await expect(buildLiveCataloguePublic('inyourshoe.com', empty)).rejects.toThrow(/no products/);
  });
});

describe('handleCommerce in public mode', () => {
  const req = (q: string, init: RequestInit & { headers?: Record<string, string> } = {}) =>
    new Request(`https://2000s.example/api/commerce?${q}`, { ...init, headers: { host: '2000s.example', ...(init.headers ?? {}) } });

  it('status reports mode:public, live:true, storefront:false', async () => {
    const r = await handleCommerce(req('op=status'), PUBLIC);
    const body = await r.json();
    expect(body).toMatchObject({ live: true, mode: 'public', storefront: false });
  });

  it('serves a live catalogue index from public JSON', async () => {
    const f = router([pub(1), pub(2)]);
    const r = await handleCommerce(req('op=catalogue&part=index'), PUBLIC, { fetcher: f });
    expect(r.status).toBe(200);
    expect(r.headers.get('X-IYS-Source')).toBe('shopify-storefront');
    expect(await r.text()).toContain('fixture-tee-1');
  });

  it('server cart is unavailable in public mode (client uses the cart permalink)', async () => {
    const r = await handleCommerce(req('op=cart', { method: 'POST', headers: { origin: 'https://2000s.example' }, body: JSON.stringify({ lines: [{ variantId: 9002, quantity: 1 }] }) }), PUBLIC);
    expect(r.status).toBe(501);
    expect((await r.json()).reason).toBe('public-mode');
  });
});
