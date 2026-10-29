/**
 * Everything the film shows — LOCAL curated imagery only (rendering needs no
 * network) and counts read from the generated catalogue snapshot.
 */
import { assets, brand, campaign, curation } from '../data/assets';
import indexFile from '../data/catalogue-index.json';
import meta from '../data/catalogue-meta.json';
import storesData from '../data/stores.generated.json';
import type { IndexFile } from '../lib/catalogue/types';

const idx = indexFile as unknown as IndexFile;
const count = (h: string) => idx.collections.find((c) => c.h === h)?.n ?? 0;
const local = (h: string, i = 0) => {
  const p = assets.products[h];
  const im = p?.images[i] ?? p?.images[0];
  if (!p || !im) throw new Error(`showcase: no local image for ${h} - run npm run fetch-showcase-assets`);
  return { handle: h, title: p.title, price: p.price, compareAtPrice: p.compareAtPrice, src: im.src };
};

export const SC = {
  brand,
  wallpaper: campaign('fw27-m1')!.src,
  wallpaper2: assets.camera.find((c) => c.folder === 'PJOYS')!.src,
  total: meta.publicProductsTotal,
  pages: Math.ceil(meta.publicProductsTotal / 48),
  pjoysCount: count('pjoys'),
  storesCount: storesData.storeCount,
  top8: curation.top8.map((h) => local(h)),
  pjoys: curation.pjoysMessenger.slice(0, 6).map((h) => local(h)),
  cairo: curation.cairo.slice(0, 4).map((h) => local(h)),
  hero: local(curation.hero),
  hero2: local(curation.hero, 1),
  thumbs: Object.entries(assets.thumbs).map(([h, t]) => ({ handle: h, title: t.title, src: t.src })),
  camera: assets.camera.map((c) => c.src),
  store: assets.stores[0]!,
  tiles: assets.tiles.map((t) => t.src),
  folders: [
    { label: 'TOPS', n: count('all-tops') },
    { label: 'PJOYS', n: count('pjoys') },
    { label: 'ACCESSORIES', n: count('all-accessories') },
    { label: 'WOMEN', n: count('women') },
    { label: 'KIDS', n: count('all-kids-products') },
    { label: 'CAIRO', n: count('cairo') },
  ],
  snapshot: meta.generatedAt.slice(0, 10),
};

/** Every image the film needs (preloaded + decoded before `ready`). */
export const SC_IMAGES = [
  SC.brand.wordmarkWhite,
  SC.brand.markWhite,
  SC.brand.wordmark,
  SC.wallpaper,
  SC.wallpaper2,
  SC.hero.src,
  SC.hero2.src,
  SC.store.src,
  ...SC.top8.map((p) => p.src),
  ...SC.pjoys.map((p) => p.src),
  ...SC.cairo.map((p) => p.src),
  ...SC.thumbs.map((t) => t.src),
  ...SC.camera,
  ...SC.tiles,
];
