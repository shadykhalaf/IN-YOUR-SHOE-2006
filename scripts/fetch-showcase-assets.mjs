/**
 * npm run fetch-showcase-assets [-- --force]
 *
 * Downloads ONLY the curated "cinematic" images the concept needs locally —
 * boot, wallpaper, home portal, Pjoys moment, camera, stores, screensaver and
 * the whole /showcase film (which must render with zero network access).
 * The full 1,000+ product catalogue is NOT downloaded: it stays on the
 * official Shopify CDN (see src/lib/catalogue/images.ts).
 *
 * Sources: official public IYS URLs only — the storefront theme (logo,
 * campaign banners), the public store directory, and product images from the
 * synced catalogue snapshot (public/catalogue/*.json). Run `npm run
 * sync-products` and `npm run sync-stores` first.
 *
 * Processing (Sharp): sRGB WebP, quality 84–86, never upscaled
 * (withoutEnlargement), no colour grading — garment colour stays accurate.
 * Any "digital camera" look is applied in CSS at display time, never baked in.
 *
 * Writes:
 *   public/iys/{brand,campaign,stores,products,tiles,thumbs}/…
 *   src/data/assets.generated.json   manifest used by the app + showcase
 *   docs/SOURCES.md                  regenerates the "Local assets" table
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { get } from './lib/http.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const today = new Date().toISOString().slice(0, 10);
const THEME = 'https://inyourshoe.com/cdn/shop/files/';

const curation = JSON.parse(readFileSync(resolve(root, 'src/data/curation.json'), 'utf8'));
const stores = JSON.parse(readFileSync(resolve(root, 'src/data/stores.generated.json'), 'utf8')).stores;
const index = JSON.parse(readFileSync(resolve(root, 'src/data/catalogue-index.json'), 'utf8'));
const details = Object.assign({}, ...readdirSync(resolve(root, 'public/catalogue')).map((f) => JSON.parse(readFileSync(resolve(root, 'public/catalogue', f), 'utf8'))));

const manifest = { generatedAt: new Date().toISOString(), brand: {}, campaign: [], stores: [], products: {}, tiles: [], camera: [], thumbs: {} };
const rows = [];
const log = (...a) => console.log('[assets]', ...a);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function sourceUrl(src, width) {
  const u = new URL(src);
  u.search = '';
  if (width) u.searchParams.set('width', String(width));
  if (/\.heic$/i.test(u.pathname)) u.searchParams.set('format', 'jpg');
  return u.toString();
}

/** Download → Sharp → WebP. Returns { src, width, height, bytes }. */
async function save(url, rel, { width = 1200, quality = 84, keepPng = false, meta }) {
  const out = resolve(root, 'public/iys', rel);
  mkdirSync(dirname(out), { recursive: true });
  const publicPath = `/iys/${rel}`;
  if (!force && existsSync(out)) {
    const m = await sharp(out).metadata();
    rows.push({ file: publicPath, source: url.split('?')[0], ...meta, bytes: statSync(out).size });
    return { src: publicPath, width: m.width, height: m.height };
  }
  const buf = await get(sourceUrl(url, width), { as: 'buffer' });
  let pipe = sharp(buf, { density: 300 }).rotate().resize({ width, withoutEnlargement: true }).toColorspace('srgb');
  pipe = keepPng ? pipe.png({ compressionLevel: 9 }) : pipe.webp({ quality, effort: 5, smartSubsample: true });
  const info = await pipe.toFile(out);
  rows.push({ file: publicPath, source: url.split('?')[0], ...meta, bytes: info.size });
  return { src: publicPath, width: info.width, height: info.height };
}

const product = (h) => {
  const p = details[h];
  if (!p) throw new Error(`curated handle "${h}" is not in the synced catalogue — update src/data/curation.json`);
  return p;
};

async function main() {
  // ── Brand (current official marks) ───────────────────────────────────
  const markSvg = await get(`${THEME}IYS_LOGO.svg`, { as: 'text' });
  mkdirSync(resolve(root, 'public/iys/brand'), { recursive: true });
  writeFileSync(resolve(root, 'public/iys/brand/iys-mark.svg'), markSvg);
  // White variant: identical geometry, fill colour swapped for dark backgrounds.
  writeFileSync(resolve(root, 'public/iys/brand/iys-mark-white.svg'), markSvg.replace(/fill="#000000"/g, 'fill="#FFFFFF"'));
  rows.push({ file: '/iys/brand/iys-mark.svg', source: `${THEME}IYS_LOGO.svg`, type: 'logo', subject: 'IYS mark (current, homepage header)', bytes: markSvg.length });
  rows.push({ file: '/iys/brand/iys-mark-white.svg', source: `${THEME}IYS_LOGO.svg`, type: 'logo (white fill variant)', subject: 'IYS mark — fill #000→#FFF, geometry untouched', bytes: markSvg.length });
  manifest.brand.mark = '/iys/brand/iys-mark.svg';
  manifest.brand.markWhite = '/iys/brand/iys-mark-white.svg';
  manifest.brand.wordmarkWhite = (await save(`${THEME}INYOURSHOE-LOGO-WHITE.png`, 'brand/in-your-shoe-white.png', { width: 1100, keepPng: true, meta: { type: 'logo', subject: 'IN YOUR SHOE wordmark, white (current header logo)' } })).src;
  manifest.brand.wordmark = (await save(`${THEME}Name_PNG_aa2488c8-8e3c-4a35-bd7f-8e36f9e671ea.png`, 'brand/in-your-shoe-black.png', { width: 692, keepPng: true, meta: { type: 'logo', subject: 'IN YOUR SHOE wordmark, black (current)' } })).src;

  // ── Campaign (current homepage slider) ───────────────────────────────
  const campaign = [
    { id: 'fw27-1', file: 'FW27-DESKTOP-01_jpg.jpg', title: 'FW27 campaign — desktop banner 1', group: 'FW27' },
    { id: 'fw27-2', file: 'FW27-DESKTOP-02_jpg.jpg', title: 'FW27 campaign — desktop banner 2', group: 'FW27' },
    { id: 'fw27-m1', file: 'FW27-MOBILE-01_jpg.jpg', title: 'FW27 campaign — mobile banner 1', group: 'FW27' },
    { id: 'fw27-m2', file: 'FW27-MOBILE-02_jpg.jpg', title: 'FW27 campaign — mobile banner 2', group: 'FW27' },
    { id: 'zed-1', file: 'DESKTOP-SLIDER-UPDATED-ZED_jpg.jpg', title: 'IYS × ZED — desktop banner', group: 'IYS x ZED' },
    { id: 'zed-m1', file: 'MOBILE-SLIDER-UPDATED-ZED_jpg.jpg', title: 'IYS × ZED — mobile banner', group: 'IYS x ZED' },
  ];
  for (const c of campaign) {
    const img = await save(THEME + c.file, `campaign/${c.id}.webp`, { width: 1920, quality: 82, meta: { type: 'campaign', subject: c.title } });
    manifest.campaign.push({ id: c.id, title: c.title, group: c.group, ...img, sourceUrl: THEME + c.file });
  }
  log(`campaign: ${manifest.campaign.length}`);

  // ── Stores (public store directory photos) ───────────────────────────
  for (const s of stores) {
    if (!s.photoSourceUrl) continue;
    const img = await save(s.photoSourceUrl, `stores/${slug(s.name)}.webp`, { width: 1200, quality: 80, meta: { type: 'store photo', subject: s.name } });
    manifest.stores.push({ name: s.name, ...img, sourceUrl: s.photoSourceUrl });
  }
  log(`stores: ${manifest.stores.length}`);

  // ── Curated products (2 images each) ─────────────────────────────────
  const featured = [...new Set([...curation.top8, ...curation.pjoysMessenger, ...curation.cairo, curation.hero, ...curation.screensaver, ...Object.values(curation.jokes)])];
  for (const h of featured) {
    const p = product(h);
    const imgs = [];
    for (const [i, im] of p.images.slice(0, 2).entries()) {
      const saved = await save(im.src, `products/${h}-${i + 1}.webp`, { width: 900, quality: 84, meta: { type: 'product image', subject: p.title } });
      imgs.push({ ...saved, alt: im.alt, sourceUrl: im.src });
    }
    manifest.products[h] = { title: p.title, price: p.price, compareAtPrice: p.compareAtPrice, images: imgs };
  }
  log(`products: ${Object.keys(manifest.products).length}`);

  // ── Camera (DCIM) — lifestyle frames from real product shoots ───────
  for (const [n, c] of curation.camera.entries()) {
    const p = product(c.handle);
    const im = p.images[c.image];
    if (!im) throw new Error(`${c.handle} has no image #${c.image}`);
    const saved = await save(im.src, `camera/${c.folder.toLowerCase()}-${String(n + 1).padStart(2, '0')}.webp`, { width: 1000, quality: 84, meta: { type: 'product lifestyle photo', subject: p.title } });
    manifest.camera.push({ folder: c.folder, handle: c.handle, title: p.title, ...saved, sourceUrl: im.src });
  }

  // ── Pattern tiles (wallpaper "Tile" mode) ────────────────────────────
  for (const t of curation.tiles) {
    const p = product(t.handle);
    const im = p.images[t.image];
    const saved = await save(im.src, `tiles/${t.handle}.webp`, { width: 640, quality: 84, meta: { type: 'product detail photo (pattern)', subject: p.title } });
    manifest.tiles.push({ handle: t.handle, title: p.title, ...saved, sourceUrl: im.src });
  }

  // ── Showcase grid thumbnails (first image, small) ────────────────────
  const coll = index.collections.find((c) => c.h === curation.showcaseGrid.collection);
  const gridHandles = coll.o.slice(0, curation.showcaseGrid.count).map((i) => index.products[i].h);
  for (const h of gridHandles) {
    const p = product(h);
    const saved = await save(p.images[0].src, `thumbs/${h}.webp`, { width: 280, quality: 78, meta: { type: 'product thumbnail', subject: p.title } });
    manifest.thumbs[h] = { title: p.title, price: p.price, ...saved };
  }
  log(`thumbs: ${gridHandles.length}`);

  // Remove files no longer referenced (keeps public/iys lean after re-curation).
  const keep = new Set(rows.map((r) => resolve(root, 'public', r.file.slice(1))));
  for (const dir of ['campaign', 'stores', 'products', 'camera', 'tiles', 'thumbs']) {
    const d = resolve(root, 'public/iys', dir);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (!keep.has(resolve(d, f))) rmSync(resolve(d, f));
  }

  writeFileSync(resolve(root, 'src/data/assets.generated.json'), `${JSON.stringify(manifest, null, 1)}\n`);
  writeSources();
  const total = rows.reduce((n, r) => n + r.bytes, 0);
  log(`${rows.length} local assets, ${(total / 1024 / 1024).toFixed(2)} MB → src/data/assets.generated.json`);
}

function writeSources() {
  const file = resolve(root, 'docs/SOURCES.md');
  const table = [
    `Retrieved ${today} by \`npm run fetch-showcase-assets\`. ${rows.length} files.`,
    '',
    '| local file | official source URL | type | subject | retrieved |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| \`public${r.file}\` | ${r.source} | ${r.type} | ${String(r.subject).replace(/\|/g, '/')} | ${today} |`),
  ].join('\n');
  const doc = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const start = '<!-- assets:start -->';
  const end = '<!-- assets:end -->';
  const next = doc.includes(start) ? doc.replace(new RegExp(`${start}[\\s\\S]*${end}`), `${start}\n${table}\n${end}`) : `${doc}\n\n## Local assets\n\n${start}\n${table}\n${end}\n`;
  writeFileSync(file, next);
}

main().catch((e) => {
  console.error('[assets] ✗', e.message);
  process.exit(1);
});
