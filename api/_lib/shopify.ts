/**
 * LIVE SHOPIFY adapter (server-side only). Off unless ALL of these are set:
 *
 *   COMMERCE_LIVE=1                       explicit server switch
 *   SHOPIFY_STORE_DOMAIN                  e.g. in-your-shoe.myshopify.com (or the storefront domain)
 *   SHOPIFY_STOREFRONT_PRIVATE_TOKEN      Storefront API private token (preferred), or
 *   SHOPIFY_STOREFRONT_PUBLIC_TOKEN       Storefront API public token
 *   SHOPIFY_ADMIN_TOKEN                   optional: Admin API token (read_discounts) for promotions + rewards
 *   SHOPIFY_API_VERSION                   optional, default below
 *
 * Products are mapped into the SAME normalised record the snapshot sync
 * produces (scripts/lib/normalize.mjs) and the SAME index/shard outputs
 * (scripts/lib/outputs.mjs), so the UI has exactly one product model.
 * Every network call is injectable for fixture tests. Tokens never leave
 * the server and are never logged.
 */
// @ts-expect-error: plain ESM module shared with the Node sync scripts
import { normalizeStorefrontProduct } from '../../scripts/lib/normalize.mjs';
// @ts-expect-error: plain ESM module shared with the Node sync scripts
import { buildOutputs } from '../../scripts/lib/outputs.mjs';

export const DEFAULT_API_VERSION = '2026-07';

export interface ShopifyEnv {
  COMMERCE_LIVE?: string;
  /** Token-less public mode: read the store's public storefront JSON, no API key. */
  COMMERCE_PUBLIC?: string;
  SHOPIFY_STORE_DOMAIN?: string;
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN?: string;
  SHOPIFY_STOREFRONT_PUBLIC_TOKEN?: string;
  SHOPIFY_ADMIN_TOKEN?: string;
  SHOPIFY_API_VERSION?: string;
}

export interface Endpoint {
  url: string;
  headers: Record<string, string>;
}
export interface ShopifyConfig {
  live: boolean;
  /** True when live mode is the token-less public-JSON reader (no Storefront token). */
  publicMode: boolean;
  storefront: Endpoint | null;
  admin: Endpoint | null;
  domain: string | null;
  version: string;
  /** Human-readable reasons live mode is off (no secrets in them). */
  problems: string[];
}

const DOMAIN = /^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const VERSION = /^20\d\d-(01|04|07|10)$/;

export function shopifyConfig(env: ShopifyEnv): ShopifyConfig {
  const domain = env.SHOPIFY_STORE_DOMAIN?.trim().toLowerCase() || null;
  const version = env.SHOPIFY_API_VERSION?.trim() || DEFAULT_API_VERSION;
  const on = ['1', 'true', 'on', 'yes'].includes((env.COMMERCE_LIVE ?? '').trim().toLowerCase());
  const pubOn = ['1', 'true', 'on', 'yes'].includes((env.COMMERCE_PUBLIC ?? '').trim().toLowerCase());
  const domainValid = Boolean(domain && DOMAIN.test(domain));
  const versionValid = VERSION.test(version);
  const priv = env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.trim();
  const pub = env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN?.trim();
  const okHost = domainValid && versionValid;
  const storefront: Endpoint | null =
    okHost && (priv || pub)
      ? {
          url: `https://${domain}/api/${version}/graphql.json`,
          headers: priv ? { 'Shopify-Storefront-Private-Token': priv } : { 'X-Shopify-Storefront-Access-Token': pub! },
        }
      : null;
  const adminToken = env.SHOPIFY_ADMIN_TOKEN?.trim();
  const admin: Endpoint | null = okHost && adminToken ? { url: `https://${domain}/admin/api/${version}/graphql.json`, headers: { 'X-Shopify-Access-Token': adminToken } } : null;

  // Token mode (a Storefront token + COMMERCE_LIVE) takes precedence. Otherwise,
  // COMMERCE_PUBLIC with a valid domain gives the token-less public-JSON reader.
  const tokenLive = on && Boolean(storefront);
  const publicMode = !tokenLive && pubOn && domainValid;
  const live = tokenLive || publicMode;

  const problems: string[] = [];
  if (!live) {
    if (pubOn) {
      if (!domain) problems.push('SHOPIFY_STORE_DOMAIN is not set');
      else if (!domainValid) problems.push('SHOPIFY_STORE_DOMAIN is not a valid host name');
    } else {
      if (!on) problems.push('COMMERCE_LIVE is not enabled');
      if (!domain) problems.push('SHOPIFY_STORE_DOMAIN is not set');
      else if (!domainValid) problems.push('SHOPIFY_STORE_DOMAIN is not a valid host name');
      if (!versionValid) problems.push('SHOPIFY_API_VERSION must look like 2026-07');
      if (!priv && !pub) problems.push('no Storefront API token');
    }
  }
  return { live, publicMode, storefront, admin, domain, version, problems };
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** GraphQL POST with Shopify-aware retries (429 / 5xx / THROTTLED), Retry-After honoured, 10 s timeout. */
export async function graphql<T>(ep: Endpoint, query: string, variables: Record<string, unknown>, fetcher: Fetcher = fetch, tries = 3): Promise<T> {
  let lastError = 'unknown error';
  for (let attempt = 0; attempt < tries; attempt++) {
    let res: Response;
    try {
      res = await fetcher(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...ep.headers },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(10_000),
      });
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
    if (!res.ok) throw new Error(`Shopify HTTP ${res.status}`);
    const body = (await res.json()) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };
    if (body.errors?.length) {
      if (body.errors.some((e) => e.extensions?.code === 'THROTTLED')) {
        lastError = 'THROTTLED';
        await pause(attempt);
        continue;
      }
      throw new Error(`Shopify GraphQL: ${body.errors.map((e) => e.message).join('; ').slice(0, 300)}`);
    }
    if (!body.data) throw new Error('Shopify GraphQL: empty response');
    return body.data;
  }
  throw new Error(`Shopify unavailable (${lastError})`);
}
const pause = (attempt: number, ms?: number) => new Promise((r) => setTimeout(r, Math.min(ms ?? 400 * 2 ** attempt, 4000)));

/* ── Catalogue ────────────────────────────────────────────────────────── */

const PRODUCTS = `query Products($after: String) @inContext(country: EG, language: EN) {
  products(first: 50, after: $after, sortKey: ID) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id handle title descriptionHtml productType vendor tags createdAt publishedAt
      options { name optionValues { name } }
      images(first: 50) { nodes { id url width height altText } }
      variants(first: 100) { nodes { id title availableForSale selectedOptions { name value } price { amount currencyCode } compareAtPrice { amount currencyCode } image { id } } }
    }
  }
}`;
const COLLECTIONS = `query Collections($after: String) @inContext(country: EG, language: EN) {
  collections(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { handle title } }
}`;
const COLLECTION_PRODUCTS = `query CollectionProducts($handle: String!, $after: String) @inContext(country: EG, language: EN) {
  collection(handle: $handle) { products(first: 250, after: $after) { pageInfo { hasNextPage endCursor } nodes { handle } } }
}`;

interface Page<T> {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: T[];
}
interface Money {
  amount: string;
  currencyCode: string;
}
export interface SfProduct {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  productType: string;
  vendor: string;
  tags: string[];
  createdAt: string;
  publishedAt: string | null;
  options: { name: string; optionValues: { name: string }[] }[];
  images: { nodes: { id: string | null; url: string; width: number | null; height: number | null; altText: string | null }[] };
  variants: { nodes: { id: string; title: string; availableForSale: boolean; selectedOptions: { name: string; value: string }[]; price: Money; compareAtPrice: Money | null; image: { id: string | null } | null }[] };
}

const gidNum = (gid: string | null | undefined) => {
  const n = Number(String(gid ?? '').split('/').pop());
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** Storefront API product → the /products.json shape the snapshot normaliser already understands. */
export function toStorefrontJson(p: SfProduct) {
  const options = p.options.map((o, i) => ({ name: o.name, position: i + 1, values: o.optionValues.map((v) => v.name) }));
  return {
    id: gidNum(p.id),
    handle: p.handle,
    title: p.title,
    body_html: p.descriptionHtml,
    product_type: p.productType,
    vendor: p.vendor,
    tags: p.tags,
    created_at: p.createdAt,
    published_at: p.publishedAt,
    options,
    images: p.images.nodes.map((img) => ({ id: gidNum(img.id), src: img.url, width: img.width, height: img.height, alt: img.altText })),
    variants: p.variants.nodes.map((v) => {
      const vals = options.map((o) => v.selectedOptions.find((s) => s.name === o.name)?.value ?? null);
      return {
        id: gidNum(v.id),
        title: v.title,
        option1: vals[0] ?? null,
        option2: vals[1] ?? null,
        option3: vals[2] ?? null,
        price: v.price.amount,
        compare_at_price: v.compareAtPrice?.amount ?? null,
        available: v.availableForSale,
        featured_image: v.image?.id ? { id: gidNum(v.image.id) } : null,
      };
    }),
  };
}

/** Run fn over items with at most `limit` in flight, results in input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function pages<T>(ep: Endpoint, query: string, vars: Record<string, unknown>, pick: (d: never) => Page<T> | null | undefined, fetcher: Fetcher, maxPages = 200): Promise<T[]> {
  const out: T[] = [];
  let after: string | null = null;
  for (let i = 0; i < maxPages; i++) {
    const data = await graphql<never>(ep, query, { ...vars, after }, fetcher);
    const page = pick(data);
    if (!page) break;
    out.push(...page.nodes);
    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) break;
    after = page.pageInfo.endCursor;
  }
  return out;
}

export interface LiveCatalogue {
  index: string;
  shards: Record<string, string>;
  generatedAt: string;
  productCount: number;
}

/**
 * Build the live catalogue in the snapshot's own format. Fails loudly (throws)
 * on anything that would mislead: no products, duplicate handles, or a
 * non-EGP price (wrong market). The caller then keeps serving the snapshot.
 */
export async function buildLiveCatalogue(ep: Endpoint, fetcher: Fetcher = fetch, now = new Date()): Promise<LiveCatalogue> {
  const retrievedAt = now.toISOString();
  const raw = await pages<SfProduct>(ep, PRODUCTS, {}, (d: { products?: Page<SfProduct> }) => d.products, fetcher);
  if (!raw.length) throw new Error('live catalogue: Shopify returned no products');
  const wrong = raw.filter((p) => p.variants.nodes.some((v) => v.price.currencyCode !== 'EGP'));
  if (wrong.length) throw new Error(`live catalogue: ${wrong.length} products are not priced in EGP (wrong market context)`);
  const handles = new Set<string>();
  for (const p of raw) {
    if (handles.has(p.handle)) throw new Error(`live catalogue: duplicate handle ${p.handle}`);
    handles.add(p.handle);
  }
  const products = raw.map((p) => normalizeStorefrontProduct(toStorefrontJson(p), { retrievedAt, method: 'storefront-api' }) as { handle: string; collections: string[] });
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const cols = await pages<{ handle: string; title: string }>(ep, COLLECTIONS, {}, (d: { collections?: Page<{ handle: string; title: string }> }) => d.collections, fetcher);
  const collectionMeta: Record<string, { title: string; count: number; order: string[] }> = {};
  // Collection order is the merchant's own merchandising, so each collection is read as listed (a few at a time).
  const members = await mapLimit(cols, 4, (c) => pages<{ handle: string }>(ep, COLLECTION_PRODUCTS, { handle: c.handle }, (d: { collection?: { products: Page<{ handle: string }> } | null }) => d.collection?.products, fetcher, 40));
  cols.forEach((c, i) => {
    const order = members[i]!.map((m) => m.handle).filter((h) => byHandle.has(h));
    collectionMeta[c.handle] = { title: c.title, count: order.length, order };
    for (const h of order) byHandle.get(h)!.collections.push(c.handle);
  });
  for (const p of products) p.collections.sort();
  const out = buildOutputs(products, collectionMeta, { generatedAt: retrievedAt, currency: 'EGP' }) as { index: string; shards: Record<string, string> };
  return { index: out.index, shards: out.shards, generatedAt: retrievedAt, productCount: products.length };
}

/* ── Cart (Storefront API) ───────────────────────────────────────────── */

const CART_CREATE = `mutation Cart($input: CartInput!) @inContext(country: EG, language: EN) {
  cartCreate(input: $input) {
    cart {
      checkoutUrl
      lines(first: 100) { nodes { quantity merchandise { ... on ProductVariant { id availableForSale } } } }
      discountCodes { code applicable }
      cost { subtotalAmount { amount currencyCode } }
    }
    userErrors { field message code }
    warnings { code message }
  }
}`;

export interface CartLineIn {
  variantId: number;
  quantity: number;
}
export interface CartResult {
  ok: boolean;
  checkoutUrl: string | null;
  lines: { variantId: number; quantity: number; available: boolean }[];
  discountCodes: { code: string; applicable: boolean }[];
  subtotal: { amount: number; currency: string } | null;
  problems: string[];
}

/** Shopify-hosted checkout only: never redirect anywhere else, whatever the API returns. */
export function safeCheckoutUrl(url: string | null | undefined, storeDomain: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    const h = u.hostname.toLowerCase();
    const ok = h === storeDomain || h.endsWith('.myshopify.com') || h === 'checkout.shopify.com' || h === 'inyourshoe.com' || h.endsWith('.inyourshoe.com') || h === 'shop.app';
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Shopify asks server-side (private token) callers to pass the buyer's IP so
 * its bot protection and rate limits apply per shopper, not per server.
 */
const IP = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]{2,39})$/i;

export async function createCart(cfg: ShopifyConfig, lines: CartLineIn[], discountCodes: string[], fetcher: Fetcher = fetch, buyerIp?: string): Promise<CartResult> {
  if (!cfg.storefront) throw new Error('storefront not configured');
  const ep = buyerIp && IP.test(buyerIp) && cfg.storefront.headers['Shopify-Storefront-Private-Token'] ? { ...cfg.storefront, headers: { ...cfg.storefront.headers, 'Shopify-Storefront-Buyer-IP': buyerIp } } : cfg.storefront;
  type R = {
    cartCreate: {
      cart: null | {
        checkoutUrl: string;
        lines: { nodes: { quantity: number; merchandise: { id: string; availableForSale: boolean } }[] };
        discountCodes: { code: string; applicable: boolean }[];
        cost: { subtotalAmount: Money } | null;
      };
      userErrors: { message: string }[];
      warnings: { message: string }[];
    };
  };
  const data = await graphql<R>(
    ep,
    CART_CREATE,
    { input: { lines: lines.map((l) => ({ merchandiseId: `gid://shopify/ProductVariant/${l.variantId}`, quantity: l.quantity })), discountCodes, buyerIdentity: { countryCode: 'EG' } } },
    fetcher,
  );
  const c = data.cartCreate.cart;
  const problems = [...data.cartCreate.userErrors.map((e) => e.message), ...data.cartCreate.warnings.map((w) => w.message)].map((m) => m.slice(0, 200));
  const got = (c?.lines.nodes ?? []).map((n) => ({ variantId: gidNum(n.merchandise.id) ?? 0, quantity: n.quantity, available: n.merchandise.availableForSale }));
  // The bag must come back exactly: same variants, same quantities, all purchasable.
  const exact = got.length === lines.length && lines.every((l) => got.some((g) => g.variantId === l.variantId && g.quantity === l.quantity && g.available));
  const checkoutUrl = safeCheckoutUrl(c?.checkoutUrl, cfg.domain);
  return {
    ok: Boolean(c && exact && checkoutUrl),
    checkoutUrl,
    lines: got,
    discountCodes: c?.discountCodes ?? [],
    subtotal: c?.cost ? { amount: Number(c.cost.subtotalAmount.amount), currency: c.cost.subtotalAmount.currencyCode } : null,
    problems,
  };
}

/* ── Promotions + discount codes (Admin API, read_discounts) ─────────── */

const FREE_SHIPPING = `query FreeShipping {
  discountNodes(first: 50, query: "status:active") {
    nodes { discount { __typename
      ... on DiscountAutomaticFreeShipping { title status startsAt endsAt
        minimumRequirement { __typename ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount currencyCode } } }
        destinationSelection { __typename ... on DiscountCountries { countries includeRestOfWorld } ... on DiscountCountryAll { allCountries } } }
    } }
  }
}`;

export interface LiveFreeShipping {
  minSubtotalEGP: number;
  inclusive: true;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
}

/** The store's ACTIVE automatic free-shipping discount for Egypt with an EGP minimum subtotal, or null. */
export async function activeFreeShipping(cfg: ShopifyConfig, fetcher: Fetcher = fetch, now = new Date()): Promise<LiveFreeShipping | null> {
  if (!cfg.admin) throw new Error('admin not configured');
  type D = {
    __typename: string;
    title?: string;
    status?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    minimumRequirement?: { __typename: string; greaterThanOrEqualToSubtotal?: Money } | null;
    destinationSelection?: { __typename: string; countries?: string[]; includeRestOfWorld?: boolean; allCountries?: boolean } | null;
  };
  const data = await graphql<{ discountNodes: { nodes: { discount: D }[] } }>(cfg.admin, FREE_SHIPPING, {}, fetcher);
  const t = now.getTime();
  const found = data.discountNodes.nodes
    .map((n) => n.discount)
    .filter((d) => d.__typename === 'DiscountAutomaticFreeShipping' && d.status === 'ACTIVE')
    .filter((d) => (!d.startsAt || Date.parse(d.startsAt) <= t) && (!d.endsAt || Date.parse(d.endsAt) > t))
    .filter((d) => d.minimumRequirement?.__typename === 'DiscountMinimumSubtotal' && d.minimumRequirement.greaterThanOrEqualToSubtotal?.currencyCode === 'EGP')
    .filter((d) => d.destinationSelection?.allCountries || d.destinationSelection?.includeRestOfWorld || d.destinationSelection?.countries?.includes('EG'))
    .sort((a, b) => Number(a.minimumRequirement!.greaterThanOrEqualToSubtotal!.amount) - Number(b.minimumRequirement!.greaterThanOrEqualToSubtotal!.amount))[0];
  if (!found) return null;
  return { minSubtotalEGP: Number(found.minimumRequirement!.greaterThanOrEqualToSubtotal!.amount), inclusive: true, title: found.title ?? 'Free shipping', startsAt: found.startsAt ?? null, endsAt: found.endsAt ?? null };
}

const CODE_STATUS = `query Code($code: String!) {
  codeDiscountNodeByCode(code: $code) { codeDiscount { __typename
    ... on DiscountCodeBasic { title status startsAt endsAt }
    ... on DiscountCodeFreeShipping { title status startsAt endsAt }
    ... on DiscountCodeBxgy { title status startsAt endsAt }
  } }
}`;

/** Is this merchant discount code ACTIVE right now? (Admin API; null = not found.) */
export async function codeStatus(cfg: ShopifyConfig, code: string, fetcher: Fetcher = fetch, now = new Date()): Promise<{ active: boolean; title: string; endsAt: string | null; kind: string } | null> {
  if (!cfg.admin) throw new Error('admin not configured');
  type C = { __typename: string; title: string; status: string; startsAt: string | null; endsAt: string | null };
  const data = await graphql<{ codeDiscountNodeByCode: { codeDiscount: C } | null }>(cfg.admin, CODE_STATUS, { code }, fetcher);
  const d = data.codeDiscountNodeByCode?.codeDiscount;
  if (!d) return null;
  const t = now.getTime();
  const inWindow = (!d.startsAt || Date.parse(d.startsAt) <= t) && (!d.endsAt || Date.parse(d.endsAt) > t);
  return { active: d.status === 'ACTIVE' && inWindow, title: d.title, endsAt: d.endsAt, kind: d.__typename };
}
