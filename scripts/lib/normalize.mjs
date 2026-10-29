/**
 * Pure normalisation + validation for the public IYS catalogue.
 * No network, no fs — unit-tested in src/tests/normalize.test.ts.
 *
 * Rule: never fabricate. A field that the public source does not expose is
 * `null` (or an empty array), never a guess.
 */

export const CURRENCY = 'EGP';
export const MARKET_PREFIXES = ['/en-sa', '/en-uae', '/en-kw', '/en-international', '/en-uk', '/en-us', '/en-qa', '/en-bh', '/en-om'];

/** Shopify money string ("999.00") or number → EGP number with 2dp precision. */
export function parseMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Ajax (`/products/<h>.js`) prices are integer minor units. */
export const fromCents = (cents) => (cents === null || cents === undefined ? null : Math.round(cents) / 100);

/**
 * Public Shopify tags on this storefront mix descriptive words ("homewear",
 * "Pjoys") with merchandising codes ("2JUN26C", "FW27", "Sep26") and app flags
 * ("bis-hidden", "Online Out of Stock"). Only descriptive tags are kept, and
 * only as search keywords — availability is NEVER inferred from a tag.
 */
const TAG_CODE = /^(\d*[a-z]{2,9}\d{2,4}[a-z]?|[a-z]{1,3}\d{2,4}|\d+[a-z]*\d*|[a-z]{1,2})$/i;
const TAG_FLAGS = new Set(['bis-hidden', 'online out of stock', 'specialprices', 'sp', 'black_friday', 'endseason', 'restock', 'all products', 'china', 'xs', 's', 'm', 'l', 'xl', 'xxl']);
export function publicTags(tags) {
  const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const t = String(raw).trim();
    const k = t.toLowerCase();
    if (!t || TAG_FLAGS.has(k) || TAG_CODE.test(t) || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };
export function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** body_html → plain text paragraphs (the app never injects remote HTML). */
export function htmlToText(html) {
  if (!html) return '';
  const text = String(html)
    .replace(/<(script|style|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter((l, i, arr) => l || (i > 0 && arr[i - 1]))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const absUrl = (src) => (!src ? null : src.startsWith('//') ? `https:${src}` : src.startsWith('/') ? `https://inyourshoe.com${src}` : src);
/** Strip the cache-busting `v=` param; the app adds `width=` itself. */
export const cleanImageUrl = (src) => {
  const u = absUrl(src);
  if (!u) return null;
  try {
    const url = new URL(u);
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
};

export function isValidHttpsUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** True if a URL points at a non-Egyptian market of the storefront. */
export const isInternationalMarketUrl = (u) => {
  try {
    const path = new URL(u).pathname;
    return MARKET_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  } catch {
    return false;
  }
};

const SIZE_OPTION = /^(size|sizes|المقاس)$/i;
const COLOR_OPTION = /^colou?rs?$/i;

function optionsFrom(options) {
  // A single "Title: Default Title" option is Shopify's way of saying "no options".
  const list = (options ?? []).map((o, i) => ({
    name: String(o.name ?? `Option ${i + 1}`),
    position: o.position ?? i + 1,
    values: (o.values ?? []).map(String),
  }));
  if (list.length === 1 && list[0].name === 'Title' && list[0].values.length === 1 && list[0].values[0] === 'Default Title') return [];
  return list;
}

function deriveOptionFacets(options, variants) {
  const sizeOpt = options.find((o) => SIZE_OPTION.test(o.name.trim()));
  const colorOpt = options.find((o) => COLOR_OPTION.test(o.name.trim()));
  const idx = (o) => options.indexOf(o);
  const sizes = sizeOpt
    ? sizeOpt.values.map((label) => ({
        label,
        available: variants.some((v) => v.options[idx(sizeOpt)] === label && v.available === true),
      }))
    : [];
  const colors = colorOpt ? [...colorOpt.values] : [];
  return { sizes, colors, sizeOption: sizeOpt?.name ?? null, colorOption: colorOpt?.name ?? null };
}

function priceSummary(variants) {
  const priced = variants.filter((v) => v.price !== null);
  if (!priced.length) return { price: null, priceMax: null, compareAtPrice: null, onSale: false };
  const cheapest = priced.reduce((a, b) => (b.price < a.price ? b : a));
  const price = cheapest.price;
  const priceMax = Math.max(...priced.map((v) => v.price));
  const onSaleVariants = priced.filter((v) => v.compareAtPrice !== null && v.compareAtPrice > v.price);
  const compareAtPrice = cheapest.compareAtPrice !== null && cheapest.compareAtPrice > cheapest.price ? cheapest.compareAtPrice : null;
  return { price, priceMax, compareAtPrice, onSale: onSaleVariants.length > 0 };
}

/** `/products.json` (Shopify storefront JSON) product → normalised record. */
export function normalizeStorefrontProduct(p, { retrievedAt, method = 'products.json' } = {}) {
  const options = optionsFrom(p.options);
  const variants = (p.variants ?? []).map((v) => ({
    id: v.id ?? null,
    title: v.title ?? null,
    options: [v.option1, v.option2, v.option3].slice(0, Math.max(options.length, 0)).map((x) => (x === null || x === undefined ? null : String(x))),
    price: parseMoney(v.price),
    compareAtPrice: parseMoney(v.compare_at_price),
    available: typeof v.available === 'boolean' ? v.available : null,
    imageId: v.featured_image?.id ?? null,
  }));
  const images = (p.images ?? [])
    .map((img) => ({
      id: img.id ?? null,
      src: cleanImageUrl(img.src),
      width: img.width ?? null,
      height: img.height ?? null,
      alt: img.alt ? decodeEntities(String(img.alt)).trim() : null,
    }))
    .filter((i) => i.src);
  return finish(p, { options, variants, images, retrievedAt, method, productType: p.product_type, createdAt: p.created_at, publishedAt: p.published_at, tags: p.tags, body: p.body_html });
}

/** `/products/<handle>.js` (Shopify Ajax API) product → normalised record. */
export function normalizeAjaxProduct(p, { retrievedAt, method = 'product.js' } = {}) {
  const options = optionsFrom(p.options);
  const variants = (p.variants ?? []).map((v) => ({
    id: v.id ?? null,
    title: v.title ?? null,
    options: (v.options ?? [v.option1, v.option2, v.option3]).slice(0, options.length).map((x) => (x === null || x === undefined ? null : String(x))),
    price: fromCents(v.price),
    compareAtPrice: fromCents(v.compare_at_price),
    available: typeof v.available === 'boolean' ? v.available : null,
    imageId: v.featured_image?.id ?? null,
  }));
  const media = (p.media ?? []).filter((m) => m.media_type === 'image');
  const images = media.length
    ? media.map((m) => ({ id: m.id ?? null, src: cleanImageUrl(m.src), width: m.width ?? null, height: m.height ?? null, alt: m.alt ? decodeEntities(m.alt).trim() : null }))
    : (p.images ?? []).map((src) => ({ id: null, src: cleanImageUrl(src), width: null, height: null, alt: null }));
  return finish(p, { options, variants, images: images.filter((i) => i.src), retrievedAt, method, productType: p.type, createdAt: p.created_at, publishedAt: p.published_at, tags: p.tags, body: p.description });
}

/**
 * JSON-LD `Product` embedded in a public product page → normalised record.
 * Last-resort fallback: JSON-LD exposes less (no option structure), so
 * variants are only recorded when each offer names itself.
 */
export function normalizeJsonLdProduct(ld, handle, { retrievedAt, method = 'json-ld' } = {}) {
  const offers = Array.isArray(ld.offers) ? ld.offers : ld.offers?.offers ?? (ld.offers ? [ld.offers] : []);
  const currencyOk = offers.every((o) => !o.priceCurrency || o.priceCurrency === CURRENCY);
  const variants = offers.map((o) => ({
    id: o.sku ? null : null,
    title: o.name && o.name !== ld.name ? String(o.name).replace(`${ld.name} - `, '') : null,
    options: [],
    price: currencyOk ? parseMoney(o.price) : null,
    compareAtPrice: null,
    available: typeof o.availability === 'string' ? /InStock/i.test(o.availability) : null,
    imageId: null,
  }));
  const imgs = (Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : []).map((i) => (typeof i === 'string' ? i : i.url));
  return finish(
    { id: null, handle, title: ld.name, vendor: ld.brand?.name ?? null },
    {
      options: [],
      variants,
      images: imgs.map((src) => ({ id: null, src: cleanImageUrl(src), width: null, height: null, alt: null })).filter((i) => i.src),
      retrievedAt,
      method,
      productType: null,
      createdAt: null,
      publishedAt: null,
      tags: [],
      body: ld.description ?? '',
      currencyMismatch: !currencyOk,
    },
  );
}

function finish(p, x) {
  const { sizes, colors, sizeOption, colorOption } = deriveOptionFacets(x.options, x.variants);
  const prices = priceSummary(x.variants);
  const availability = x.variants.some((v) => v.available === true) ? true : x.variants.length && x.variants.every((v) => v.available === false) ? false : null;
  const handle = String(p.handle ?? '').trim();
  return {
    id: p.id ?? null,
    handle,
    title: p.title ? decodeEntities(String(p.title)).trim() : null,
    productType: x.productType ? String(x.productType).trim() : null,
    vendor: p.vendor ?? null,
    tags: publicTags(x.tags),
    description: htmlToText(x.body),
    currency: CURRENCY,
    ...prices,
    available: availability,
    options: x.options.map(({ name, values }) => ({ name, values })),
    sizeOption,
    colorOption,
    sizes,
    colors,
    variants: x.variants,
    images: x.images,
    createdAt: x.createdAt ?? null,
    publishedAt: x.publishedAt ?? null,
    // Filled from the product page by the sync (extractCareGuide); null = none published.
    careGuide: null,
    sourceUrl: `https://inyourshoe.com/products/${handle}`,
    retrievedAt: x.retrievedAt ?? null,
    sourceMethod: x.method,
    currencyMismatch: Boolean(x.currencyMismatch),
    collections: [],
  };
}

/**
 * The OFFICIAL care guide of one product, from its public IYS product page
 * (or that page's product section via Shopify's public Section Rendering API).
 *
 * The live theme renders each product's own care guide into
 * `<div class="care-guide">`: inside a "Care Guide" accordion row on the
 * clothing template, directly in a content block on the accessories template.
 * Products that publish none have neither the block nor the row.
 *
 * Only presentation noise is normalised (tags → line breaks, entities,
 * whitespace); wording, punctuation and order are kept exactly.
 *
 *   { status: 'found',  text }             official care guide
 *   { status: 'none',   text: null }       IYS publishes no care guide for it
 *   { status: 'failed', text: null, reason } care content exists but could not be read
 */
export function extractCareGuide(html) {
  const s = String(html ?? '');
  const row = /<summary\b[^>]*>\s*Care\s+Guide\s*</i.test(s);
  const open = /<div\b[^>]*\bclass\s*=\s*(["'])(?:[^"']*\s)?care-guide(?:\s[^"']*)?\1[^>]*>/gi;
  const texts = [];
  for (const m of s.matchAll(open)) {
    const inner = balancedDivInner(s, m.index + m[0].length);
    if (inner === null) return { status: 'failed', text: null, reason: 'unbalanced care-guide markup' };
    texts.push(careText(inner));
  }
  if (!texts.length) return row ? { status: 'failed', text: null, reason: 'Care Guide row without care-guide content' } : { status: 'none', text: null };
  const distinct = [...new Set(texts)];
  if (distinct.length > 1) return { status: 'failed', text: null, reason: 'conflicting care-guide blocks' };
  const text = distinct[0];
  if (!text) return { status: 'failed', text: null, reason: 'empty care-guide block' };
  if (/[<>]|\{\{|\{%|Liquid error|translation missing/i.test(text)) return { status: 'failed', text: null, reason: 'malformed care-guide text' };
  return { status: 'found', text };
}

/**
 * Care-guide HTML → text the way a browser renders it: source whitespace
 * (including newlines) collapses to a space; only <br> and block ends break
 * lines. No words are added, removed or reordered.
 */
function careText(html) {
  const text = String(html)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .split('\n')
    .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** Inner HTML of the <div> whose opening tag ends at `start`, honouring nested divs; null if unbalanced. */
function balancedDivInner(s, start) {
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 1;
  for (let m = tag.exec(s); m; m = tag.exec(s)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return s.slice(start, m.index);
  }
  return null;
}

/** Parse every JSON-LD block of a page and return the first Product. */
export function extractJsonLdProduct(html) {
  const blocks = [...String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, body] of blocks) {
    try {
      const data = JSON.parse(body.trim());
      const list = Array.isArray(data) ? data : data['@graph'] ?? [data];
      const product = list.find((d) => d && (d['@type'] === 'Product' || (Array.isArray(d['@type']) && d['@type'].includes('Product'))));
      if (product) return product;
    } catch {
      /* malformed block — try the next */
    }
  }
  return null;
}

/** `<loc>` values of a sitemap document. */
export const sitemapLocs = (xml) => [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeEntities(m[1].trim()));

export const handleFromProductUrl = (u) => {
  const m = /\/products\/([^/?#]+)/.exec(u);
  return m ? decodeURIComponent(m[1]) : null;
};

/**
 * Integrity report. `errors` are fatal (sync exits non-zero and does not write).
 */
export function validateCatalogue(products, { discoveredHandles = [], expectedMin = 1, previousCount = null } = {}) {
  const handles = products.map((p) => p.handle);
  const seen = new Map();
  for (const h of handles) seen.set(h, (seen.get(h) ?? 0) + 1);
  const duplicates = [...seen].filter(([, n]) => n > 1).map(([h]) => h);
  const collections = new Set(products.flatMap((p) => p.collections));
  const types = new Set(products.map((p) => p.productType).filter(Boolean));
  const invalidUrls = [];
  for (const p of products) {
    if (!isValidHttpsUrl(p.sourceUrl)) invalidUrls.push(p.sourceUrl);
    for (const i of p.images) if (!isValidHttpsUrl(i.src)) invalidUrls.push(i.src);
  }
  const international = products.filter((p) => isInternationalMarketUrl(p.sourceUrl)).map((p) => p.handle);
  const report = {
    discovered: new Set(discoveredHandles).size,
    normalized: products.length,
    uniqueHandles: seen.size,
    duplicateHandles: duplicates,
    withImages: products.filter((p) => p.images.length > 0).length,
    withoutImages: products.filter((p) => p.images.length === 0).map((p) => p.handle),
    withPrices: products.filter((p) => p.price !== null).length,
    withoutPrices: products.filter((p) => p.price === null).map((p) => p.handle),
    withCompareAt: products.filter((p) => p.onSale).length,
    variantCount: products.reduce((n, p) => n + p.variants.length, 0),
    collectionCount: collections.size,
    productTypeCount: types.size,
    invalidUrls,
    unparseable: [],
    currencyMismatches: products.filter((p) => p.currency !== CURRENCY || p.currencyMismatch).map((p) => p.handle),
    internationalContamination: international,
    missingFromSync: discoveredHandles.filter((h) => !seen.has(h)),
  };
  const errors = [];
  if (products.length < expectedMin) errors.push(`only ${products.length} products (expected ≥ ${expectedMin})`);
  if (duplicates.length) errors.push(`duplicate handles: ${duplicates.slice(0, 10).join(', ')}`);
  if (report.currencyMismatches.length) errors.push(`currency mismatches: ${report.currencyMismatches.length}`);
  if (international.length) errors.push(`international-market URLs: ${international.length}`);
  if (invalidUrls.length) errors.push(`invalid URLs: ${invalidUrls.length}`);
  if (products.length && report.withoutPrices.length / products.length > 0.02) errors.push(`${report.withoutPrices.length} products without a price`);
  if (products.length && report.withoutImages.length / products.length > 0.05) errors.push(`${report.withoutImages.length} products without images`);
  if (report.missingFromSync.length > Math.max(5, discoveredHandles.length * 0.02)) errors.push(`${report.missingFromSync.length} discovered products could not be synced`);
  if (previousCount && products.length < previousCount * 0.8) errors.push(`catalogue shrank from ${previousCount} to ${products.length} (>20%) — refusing to overwrite`);
  return { report, errors };
}
