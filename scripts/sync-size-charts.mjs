/**
 * npm run sync-size-charts
 *
 * Reads the OFFICIAL size chart of every snapshot product from its public
 * product page (the theme's SIZE CHART modal, see lib/size-chart.mjs) and writes:
 *
 *   src/data/size-charts.generated.json   (loaded by the app, compact)
 *     charts     chart id → { src, width, height }   official IYS chart images
 *     products   handle   → chart ids                only products whose page shows one
 *     notPublic  handles whose product page no longer exists (404)
 *   docs/SIZE_CHART_COVERAGE.md            counts + exact lists for the merchant follow-up
 *
 * Manual, never automatic. Same polite client as sync-products (sequential,
 * paced, Egypt cookies, 429/5xx backoff). Raw pages are cached in
 * .cache/size-charts/ (gitignored) for 7 days, so a re-run resumes.
 * Measurements are never typed, guessed or derived from variant names.
 *
 * Behind an HTTP proxy, run with NODE_USE_ENV_PROXY=1 (Node ≥ 22.21).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN, get } from './lib/http.mjs';
import { extractSizeChart } from './lib/size-chart.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = resolve(root, '.cache/size-charts');
const OUT = resolve(root, 'src/data/size-charts.generated.json');
const DOC = resolve(root, 'docs/SIZE_CHART_COVERAGE.md');
const FRESH_MS = 7 * 24 * 3600 * 1000;
const offline = process.argv.includes('--offline');
mkdirSync(CACHE, { recursive: true });
const log = (...a) => console.log('[size-charts]', ...a);

const products = readdirSync(resolve(root, 'public/catalogue'))
  .filter((f) => /^p-\d+\.json$/.test(f))
  .flatMap((f) => {
    const d = JSON.parse(readFileSync(resolve(root, 'public/catalogue', f), 'utf8'));
    return Array.isArray(d) ? d : d.products ?? Object.values(d);
  })
  .map((p) => ({ handle: p.handle, productType: p.productType ?? null, sized: Boolean(p.sizeOption) || (p.sizes?.length ?? 0) > 0 }))
  .sort((a, b) => a.handle.localeCompare(b.handle));

/** Cached GET; a 404 is remembered as a `.404` marker (the product page is no longer public). */
async function page(handle, url, suffix) {
  const file = resolve(CACHE, `${handle}${suffix}.html`);
  const gone = `${file}.404`;
  const fresh = (f) => existsSync(f) && (offline || Date.now() - statSync(f).mtimeMs < FRESH_MS);
  if (fresh(gone)) return { status: 404 };
  if (fresh(file)) return { status: 200, html: readFileSync(file, 'utf8') };
  if (offline) return { status: 'uncached' };
  try {
    const html = await get(url, { as: 'text' });
    writeFileSync(file, html);
    return { status: 200, html };
  } catch (e) {
    if (e.status === 404) {
      writeFileSync(gone, '');
      return { status: 404 };
    }
    return { status: 'error', reason: String(e.status ?? e.message) };
  }
}

/** The product template's main section (holds the SIZE CHART modal) — discovered, not hardcoded. */
function mainSection(html) {
  const ids = [...html.matchAll(/id="shopify-section-(template--[^"]+__main)"/g)].map((m) => m[1]);
  return ids.find((id) => html.slice(html.indexOf(`id="shopify-section-${id}"`)).includes('id="modal-size"')) ?? ids[0] ?? null;
}

let section = null;
const charts = new Map();
const byProduct = {};
const report = { none: [], empty: [], notPublic: [], failed: [], viaFullPage: 0 };
const chartId = (src) => decodeURIComponent(new URL(src).pathname.split('/').pop()).replace(/\.[a-z0-9]+$/i, '');

for (const [i, p] of products.entries()) {
  const path = `${ORIGIN}/products/${encodeURIComponent(p.handle)}`;
  let r = section ? await page(p.handle, `${path}?section_id=${section}`, '.section') : { status: 'skip' };
  let result = r.status === 200 && r.html.includes('modal-size') ? extractSizeChart(r.html) : null;
  if (!result && r.status !== 404) {
    // First product, or a template whose main section differs: read the full page.
    const full = await page(p.handle, path, '');
    r = full;
    if (full.status === 200) {
      report.viaFullPage++;
      section ??= mainSection(full.html);
      result = extractSizeChart(full.html);
    }
  }
  if (r.status === 404) report.notPublic.push(p.handle);
  else if (!result) report.failed.push({ handle: p.handle, reason: String(r.reason ?? r.status) });
  else if (result.status === 'none') report.none.push(p.handle);
  else if (result.status === 'empty') report.empty.push(p.handle);
  else {
    const ids = [];
    for (const im of result.images) {
      const id = chartId(im.src);
      const prev = charts.get(id);
      if (prev && prev.src !== im.src) log(`  ! chart ${id} has two sources; keeping the first`);
      if (!prev) charts.set(id, { src: im.src, width: im.width, height: im.height });
      ids.push(id);
    }
    if (result.table) report.failed.push({ handle: p.handle, reason: 'chart has an HTML table (not yet rendered by the concept)' });
    byProduct[p.handle] = ids;
  }
  if ((i + 1) % 50 === 0) log(`${i + 1}/${products.length} (charts so far: ${charts.size})`);
}

const sized = products.filter((p) => p.sized);
const has = (h) => Boolean(byProduct[h]);
const typeCoverage = {};
for (const p of products) {
  const t = (typeCoverage[p.productType ?? '(none)'] ??= { products: 0, withChart: 0, notPublic: 0, charts: new Set() });
  t.products++;
  if (has(p.handle)) {
    t.withChart++;
    byProduct[p.handle].forEach((c) => t.charts.add(c));
  }
  if (report.notPublic.includes(p.handle)) t.notPublic++;
}
const generatedAt = new Date().toISOString();
const data = {
  generatedAt,
  source: `${ORIGIN}/products/<handle> (SIZE CHART modal)`,
  charts: Object.fromEntries([...charts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  products: Object.fromEntries(Object.entries(byProduct).sort(([a], [b]) => a.localeCompare(b))),
  notPublic: report.notPublic,
};
writeFileSync(OUT, `${JSON.stringify(data)}\n`);

const isGone = new Set(report.notPublic);
const failedSet = new Set(report.failed.map((f) => f.handle));
const missing = sized.filter((p) => !has(p.handle) && !isGone.has(p.handle) && !failedSet.has(p.handle));
const notSizedWithChart = products.filter((p) => !p.sized && has(p.handle));
const notSizedNoChart = products.filter((p) => !p.sized && !has(p.handle) && !isGone.has(p.handle) && !failedSet.has(p.handle));
const list = (hs) => (hs.length ? hs.map((h) => `- \`${h}\``).join('\n') : '- (none)');
const types = Object.entries(typeCoverage)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([t, v]) => `| ${t} | ${v.products} | ${v.withChart} | ${v.notPublic} | ${[...v.charts].sort().join(', ') || '-'} |`);
const doc = `# Size chart coverage

Generated by \`npm run sync-size-charts\` on ${generatedAt.slice(0, 10)} from each product's public page on
inyourshoe.com (the SIZE CHART modal). Charts are IYS's own images; nothing is measured, typed or inferred.
Units are exactly what IYS printed on each chart image (the charts reviewed by eye state "dimensions in cm");
the concept shows the image as published and never converts or re-types the numbers.

| | count |
| --- | --- |
| snapshot products checked | ${products.length} |
| size-applicable (have a size option) | ${sized.length} |
| size-applicable **with** an official chart | ${sized.filter((p) => has(p.handle)).length} |
| size-applicable **missing** an official chart (page is public, shows none) | ${missing.length} |
| no size option, but the page shows a chart (e.g. bag dimensions) | ${notSizedWithChart.length} |
| no size option and no chart (genuinely not needed, e.g. one-size socks) | ${notSizedNoChart.length} |
| product page no longer public (404 since the catalogue snapshot) | ${report.notPublic.length} |
| distinct official chart images | ${charts.size} |
| pages that could not be read | ${report.failed.length} |

## Merchant follow-up: size-applicable products without a published chart

${list(missing.map((p) => p.handle))}

## Pages that could not be read

${report.failed.length ? report.failed.map((f) => `- \`${f.handle}\`: ${f.reason}`).join('\n') : '- (none)'}

## Snapshot products whose page is no longer public

${list(report.notPublic)}

## By product type

| product type | products | with chart | no longer public | chart images |
| --- | --- | --- | --- | --- |
${types.join('\n')}
`;
writeFileSync(DOC, doc);
log(`wrote ${OUT.replace(root + '/', '')} + ${DOC.replace(root + '/', '')}: ${Object.keys(byProduct).length}/${products.length} products with an official chart, ${charts.size} distinct charts, ${report.notPublic.length} no longer public, ${report.failed.length} failed`);
