/**
 * npm run qa:screens [-- --base=http://127.0.0.1:4173] [-- --out=docs/qa]
 *
 * Canonical visual-QA screenshots of the real site (build + preview first).
 * CDN product images go through a small polite cache (scripts/lib/cdn-route.mjs).
 * Writes a SMALL intentional set of JPEGs — not hundreds.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { routeCdn } from './lib/cdn-route.mjs';
import { launch } from './lib/chromium.mjs';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const BASE = arg('base', 'http://127.0.0.1:4173');
const OUT = resolve(arg('out', 'docs/qa'));
const ONLY = arg('only', '');
mkdirSync(OUT, { recursive: true });

const SESSION = `sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 }))`;

const shots = [
  { name: 'desktop-home', w: 1440, h: 900, path: '/', session: true, wait: 2500 },
  { name: 'desktop-boot', w: 1440, h: 900, path: '/', fresh: true, wait: 1150, noIdle: true },
  { name: 'desktop-browser-1366', w: 1366, h: 768, path: '/', session: true, wait: 2500 },
  { name: 'shop-page-1', w: 1440, h: 900, path: '/shop', session: true, wait: 3000 },
  { name: 'search', w: 1440, h: 900, path: '/search?q=cairo', session: true, wait: 3000 },
  { name: 'product', w: 1440, h: 900, path: '/product/cairo-is-a-mindset-oversized-hoodie', session: true, wait: 3000, actions: [['click', ".chip label >> text='M'"]] },
  { name: 'product-1024', w: 1024, h: 768, path: '/product/cereal-killer-fluffy-pjoys', session: true, wait: 3000 },
  {
    name: 'pjoy-messenger',
    w: 1440,
    h: 900,
    path: '/?noboot',
    wait: 1000,
    actions: [
      ['click', "text=Obviously"],
      ['wait', 10500],
      ['click', 'text=Open conversation'],
      ['wait', 9500],
    ],
  },
  { name: 'camera', w: 1440, h: 900, path: '/', session: true, wait: 1500, actions: [['click', '.dicon[aria-label="Open IYS Camera photos"]'], ['wait', 1800]] },
  { name: 'wardrobe', w: 1440, h: 900, path: '/', session: true, wait: 1500, actions: [['click', '.dicon[aria-label^="Open My Wardrobe"]'], ['wait', 600], ['click', ".explorer__tree-item:has-text('HOODIES')"], ['wait', 2500]] },
  {
    name: 'bag',
    w: 1440,
    h: 900,
    path: '/product/cereal-killer-pjoys',
    session: true,
    wait: 2500,
    actions: [['click', ".chip label >> text='M'"], ['click', ".chip label >> text='Black'"], ['click', 'text=ADD TO BAG'], ['wait', 1400], ['click', '.dicon[aria-label^="Open My Bag"]'], ['wait', 900]],
  },
  { name: 'stores', w: 1440, h: 900, path: '/stores', session: true, wait: 2500 },
  { name: 'mobile-home', w: 390, h: 844, mobile: true, path: '/', session: true, wait: 2000 },
  { name: 'mobile-shop', w: 360, h: 800, mobile: true, path: '/collections/pjoys', session: true, wait: 2500 },
  { name: 'mobile-product', w: 430, h: 932, mobile: true, path: '/product/cereal-killer-pjoys', session: true, wait: 2500 },
  { name: 'mobile-messages', w: 390, h: 844, mobile: true, path: '/', session: true, wait: 1500, actions: [['click', "text=MENU"], ['wait', 300], ['click', "text=MESSAGES · PJOYS"], ['wait', 6000]] },
];

const browser = await launch();
for (const s of shots) {
  if (ONLY && !s.name.includes(ONLY)) continue;
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.mobile ? 2 : 1, isMobile: Boolean(s.mobile), hasTouch: Boolean(s.mobile), ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await routeCdn(page);
  if (s.session) await page.addInitScript(SESSION);
  await page.goto(BASE + s.path, { waitUntil: s.noIdle ? 'domcontentloaded' : 'networkidle' });
  await page.waitForTimeout(s.wait);
  for (const [kind, v] of s.actions ?? []) {
    if (kind === 'wait') await page.waitForTimeout(v);
    else await page.click(v, { timeout: 8000 }).catch((e) => console.warn(`  ! ${s.name}: ${e.message.split('\n')[0]}`));
  }
  await page.waitForTimeout(500);
  const file = resolve(OUT, `${s.name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 78 });
  console.log(`[qa] ${s.name} ${s.w}×${s.h} → ${file}`);
  await ctx.close();
}
await browser.close();
