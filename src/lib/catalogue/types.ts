/** Raw compact index entry — written by scripts/lib/outputs.mjs. */
export interface IndexEntry {
  h: string;
  t: string | null;
  ty: string | null;
  p: number | null;
  px?: number;
  c?: number;
  s?: 1;
  a?: 1 | 0;
  i?: string;
  iw?: number;
  ih?: number;
  i2?: string;
  n: number;
  v: number;
  sz?: [string, 1 | 0, number?, number?][];
  qv?: [number, 1 | 0];
  o?: string[];
  k: number[];
  tg?: string;
  cr?: string;
}

export interface IndexFile {
  generatedAt: string;
  currency: 'EGP';
  imageBase: string;
  shardCount: number;
  collections: { h: string; t: string | null; n: number; o: number[] }[];
  products: IndexEntry[];
}

export interface SizeOption {
  label: string;
  /** From public variant availability. */
  available: boolean;
  /** Only set for products whose single option is Size (quick add). */
  variantId: number | null;
  price: number | null;
}

/** A product as used by cards, filters, sort and search. */
export interface Product {
  /** Position in the storefront's own All Products order. */
  index: number;
  handle: string;
  title: string;
  productType: string | null;
  price: number | null;
  priceMax: number | null;
  compareAtPrice: number | null;
  onSale: boolean;
  /** true / false from public variant availability; null when not exposed. */
  available: boolean | null;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  image2: string | null;
  imageCount: number;
  variantCount: number;
  sizes: SizeOption[];
  quickVariant: { id: number; available: boolean } | null;
  /** Option names when the product needs the full picker (multi-option). */
  optionNames: string[] | null;
  collections: string[];
  tags: string;
  createdAt: string | null;
  sourceUrl: string;
}

export interface Collection {
  handle: string;
  /** Official collection title from /collections.json (null if not exposed). */
  title: string | null;
  count: number;
  /** Product indexes in the storefront's own collection order. */
  order: number[];
}

export interface Catalogue {
  generatedAt: string;
  currency: 'EGP';
  products: Product[];
  byHandle: Map<string, Product>;
  collections: Map<string, Collection>;
}

/** Full record from public/catalogue/p-XX.json. */
export interface ProductDetail {
  id: number | null;
  handle: string;
  title: string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  description: string;
  /**
   * The product's own official care guide as plain text lines, or null when IYS
   * publishes none (never inferred). Source-agnostic: filled today by the
   * catalogue sync from the public product page; a Shopify metafield / product
   * content field can fill the same field later without touching the UI.
   */
  careGuide: string | null;
  currency: 'EGP';
  price: number | null;
  priceMax: number | null;
  compareAtPrice: number | null;
  onSale: boolean;
  available: boolean | null;
  options: { name: string; values: string[] }[];
  sizeOption: string | null;
  colorOption: string | null;
  sizes: { label: string; available: boolean }[];
  colors: string[];
  variants: {
    id: number | null;
    title: string | null;
    options: (string | null)[];
    price: number | null;
    compareAtPrice: number | null;
    available: boolean | null;
    imageId: number | null;
  }[];
  images: { id: number | null; src: string; width: number | null; height: number | null; alt: string | null }[];
  createdAt: string | null;
  publishedAt: string | null;
  sourceUrl: string;
  retrievedAt: string | null;
  sourceMethod: string;
  collections: string[];
}
