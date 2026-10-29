import type { Catalogue, Collection, IndexFile, Product } from './types';

const PRODUCT_URL = 'https://inyourshoe.com/products/';

export const fullImage = (base: string, src: string | undefined) => (!src ? null : src.startsWith('https://') ? src : base + src);

/** Compact index JSON → typed, query-ready catalogue. Pure. */
export function hydrate(file: IndexFile): Catalogue {
  const handles = file.collections.map((c) => c.h);
  const products: Product[] = file.products.map((e, index) => ({
    index,
    handle: e.h,
    title: e.t ?? e.h,
    productType: e.ty,
    price: e.p,
    priceMax: e.px ?? e.p,
    compareAtPrice: e.c ?? null,
    onSale: e.s === 1,
    available: e.a === 1 ? true : e.a === 0 ? false : null,
    image: fullImage(file.imageBase, e.i),
    imageWidth: e.iw ?? null,
    imageHeight: e.ih ?? null,
    image2: fullImage(file.imageBase, e.i2),
    imageCount: e.n,
    variantCount: e.v,
    sizes: (e.sz ?? []).map(([label, available, variantId, price]) => ({
      label,
      available: available === 1,
      variantId: variantId ?? null,
      price: price ?? e.p,
    })),
    quickVariant: e.qv ? { id: e.qv[0], available: e.qv[1] === 1 } : null,
    optionNames: e.o ?? null,
    collections: e.k.map((i) => handles[i]).filter((h): h is string => Boolean(h)),
    tags: e.tg ?? '',
    createdAt: e.cr ?? null,
    sourceUrl: PRODUCT_URL + e.h,
  }));
  const collections = new Map<string, Collection>(
    file.collections.map((c) => [c.h, { handle: c.h, title: c.t, count: c.n, order: c.o }]),
  );
  return {
    generatedAt: file.generatedAt,
    currency: file.currency,
    products,
    byHandle: new Map(products.map((p) => [p.handle, p])),
    collections,
  };
}

/** Products of a collection in the storefront's own order. */
export function collectionProducts(cat: Catalogue, handle: string): Product[] {
  const c = cat.collections.get(handle);
  if (!c) return [];
  return c.order.map((i) => cat.products[i]).filter((p): p is Product => Boolean(p));
}

export const collectionCount = (cat: Catalogue | null, handle: string) => cat?.collections.get(handle)?.count ?? null;
