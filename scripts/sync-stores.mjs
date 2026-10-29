/**
 * npm run sync-stores [-- --offline]
 *
 * Reads the PUBLIC store directory (https://inyourshoe.com/pages/store-locations)
 * and writes src/data/stores.generated.json: store names, address lines,
 * opening hours, phone numbers and "Directions" links exactly as published.
 * No coordinates are invented; the store count is whatever the page lists.
 *
 * Store photos referenced here are downloaded separately by
 * `npm run fetch-showcase-assets`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN, get } from './lib/http.mjs';
import { absUrl, cleanImageUrl, decodeEntities } from './lib/normalize.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = `${ORIGIN}/pages/store-locations`;
const cache = resolve(root, '.cache/sync/store-locations.html');

const text = (html) =>
  decodeEntities(String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

export function parseStores(html) {
  const sections = String(html).split(/class="\s*media-with-text\s+image-with-text/).slice(1);
  const stores = [];
  for (const s of sections) {
    const name = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(s);
    if (!name) continue;
    const overline = /content-block--overline[^>]*>([\s\S]*?)<\/div>/.exec(s);
    const body = /content-block--text[^>]*>([\s\S]*?)<\/div>/.exec(s)?.[1] ?? '';
    const fields = {};
    for (const m of body.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)) fields[text(m[1]).join(' ').toLowerCase()] = text(m[2]);
    const maps = /href="(https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps)[^"]+)"/.exec(s)?.[1] ?? null;
    const img = /media-with-text__media-image--desktop[\s\S]*?src="([^"]+)"/.exec(s)?.[1] ?? /<img[\s\S]*?src="([^"]+)"/.exec(s)?.[1] ?? null;
    const address = overline ? text(overline[1]).join(' ').replace(/^Address:\s*/i, '').trim() : null;
    const phone = (fields['phone number'] ?? []).join(' ').replace(/\s+/g, '').trim() || null;
    stores.push({
      name: text(name[1]).join(' '),
      address: address || null,
      hours: fields['opening hours'] ?? [],
      phone,
      mapsUrl: maps ? decodeEntities(maps) : null,
      photoSourceUrl: img ? cleanImageUrl(absUrl(img)) : null,
    });
  }
  return stores;
}

async function main() {
  const offline = process.argv.includes('--offline');
  let html;
  if (offline) html = readFileSync(cache, 'utf8');
  else {
    html = await get(URL_, { as: 'text' });
    mkdirSync(dirname(cache), { recursive: true });
    writeFileSync(cache, html);
  }
  const stores = parseStores(html);
  if (stores.length < 1) throw new Error('no stores parsed — page structure changed?');
  const bad = stores.filter((s) => !s.name || !s.address);
  if (bad.length) throw new Error(`stores missing name/address: ${JSON.stringify(bad)}`);
  const out = { generatedAt: new Date().toISOString(), source: URL_, storeCount: stores.length, stores };
  const file = resolve(root, 'src/data/stores.generated.json');
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
  console.log(`[stores] ${stores.length} stores from ${URL_}${prev ? ` (was ${prev.storeCount})` : ''}`);
  for (const s of stores) console.log(`  · ${s.name} — ${s.address} — ${s.phone ?? 'no public phone'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('[stores] ✗', e.message);
    process.exit(1);
  });
}
