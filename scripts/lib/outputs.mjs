/**
 * Split decision (measured — see README "Catalogue architecture"):
 *
 *   src/data/catalogue-index.json  — compact records for every product:
 *     enough for cards, filters, sort, search, quick add and deep links.
 *     Imported with a dynamic import() so it becomes its own hashed chunk that
 *     loads in parallel with the boot sequence, never blocking it.
 *   public/catalogue/p-XX.json     — full records (description, every image,
 *     every variant), 32 shards keyed by a stable hash of the handle, fetched
 *     only when a product is opened.
 *
 * Everything is serialised with stable key order so re-running the sync on
 * unchanged data produces byte-identical files.
 */
export const SHARD_COUNT = 32;
export const IMAGE_BASE = 'https://cdn.shopify.com/s/files/1/0050/2729/9397/files/';

/** FNV-1a 32-bit — mirrored in src/lib/catalogue/shard.ts. */
export function shardOf(handle) {
  let h = 0x811c9dc5;
  for (let i = 0; i < handle.length; i++) {
    h ^= handle.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % SHARD_COUNT;
}
export const shardName = (n) => `p-${String(n).padStart(2, '0')}.json`;

const shortImg = (src) => (src && src.startsWith(IMAGE_BASE) ? src.slice(IMAGE_BASE.length) : src);

export function buildOutputs(products, collections, meta) {
  const collectionHandles = Object.keys(collections).sort();
  const cIndex = new Map(collectionHandles.map((h, i) => [h, i]));
  const pIndex = new Map(products.map((p, i) => [p.handle, i]));

  const items = products.map((p) => {
    const img = p.images[0] ?? null;
    const sizeIdx = p.sizeOption ? p.options.findIndex((o) => o.name === p.sizeOption) : -1;
    const sizeOnly = sizeIdx === 0 && p.options.length === 1;
    const entry = {
      h: p.handle,
      t: p.title,
      ty: p.productType,
      p: p.price,
      px: p.priceMax !== p.price ? p.priceMax : undefined,
      c: p.compareAtPrice ?? undefined,
      s: p.onSale ? 1 : undefined,
      a: p.available === true ? 1 : p.available === false ? 0 : undefined,
      i: img ? shortImg(img.src) : undefined,
      iw: img?.width ?? undefined,
      ih: img?.height ?? undefined,
      i2: p.images[1] ? shortImg(p.images[1].src) : undefined,
      n: p.images.length,
      v: p.variants.length,
      // sizes: [label, available 1|0|null, variantId (size-only products), variant price when it differs]
      sz: p.sizes.length
        ? p.sizes.map((s) => {
            const variant = sizeOnly ? p.variants.find((v) => v.options[0] === s.label) : null;
            const row = [s.label, s.available ? 1 : 0];
            if (variant) {
              row.push(variant.id);
              if (variant.price !== p.price) row.push(variant.price);
            }
            return row;
          })
        : undefined,
      // single-variant products can be quick-added directly
      qv: p.variants.length === 1 ? [p.variants[0].id, p.variants[0].available === true ? 1 : 0] : undefined,
      o: p.options.length > 1 || (p.options.length === 1 && !sizeOnly) ? p.options.map((o) => o.name) : undefined,
      k: p.collections.map((c) => cIndex.get(c)).filter((x) => x !== undefined).sort((a, b) => a - b),
      tg: p.tags.length ? p.tags.join(' ') : undefined,
      cr: p.createdAt ? p.createdAt.slice(0, 10) : undefined,
    };
    return entry;
  });

  const index = {
    generatedAt: meta.generatedAt,
    currency: meta.currency,
    imageBase: IMAGE_BASE,
    shardCount: SHARD_COUNT,
    collections: collectionHandles.map((h) => ({
      h,
      t: collections[h].title,
      n: collections[h].count,
      o: collections[h].order.map((x) => pIndex.get(x)).filter((x) => x !== undefined),
    })),
    products: items,
  };

  const shards = {};
  const buckets = Array.from({ length: SHARD_COUNT }, () => ({}));
  for (const p of [...products].sort((a, b) => a.handle.localeCompare(b.handle))) {
    const { currencyMismatch: _c, ...rest } = p;
    buckets[shardOf(p.handle)][p.handle] = rest;
  }
  buckets.forEach((b, i) => {
    shards[shardName(i)] = JSON.stringify(b);
  });

  return {
    index: JSON.stringify(index),
    shards,
    meta: `${JSON.stringify(meta, null, 1)}\n`,
  };
}
