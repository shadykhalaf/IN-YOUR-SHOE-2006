import { launch } from './chromium.mjs';

/**
 * Open /showcase in record mode: 540×960 CSS px at deviceScaleFactor 2 →
 * exactly 1080×1920 pixels. All imagery is local, so no network is used
 * beyond the local preview server; any external request is blocked to prove it.
 */
export async function openShowcase(base) {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const external = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => {
    external.push(r.request().url());
    return r.abort();
  });
  await page.goto(`${base}/showcase?record=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__iysShowcase?.ready === true, null, { timeout: 60_000 });
  const duration = await page.evaluate(() => window.__iysShowcase.duration);
  const seek = (t) =>
    page.evaluate(
      (s) =>
        new Promise((resolve) => {
          window.__iysShowcase.seek(s);
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
      t,
    );
  return { browser, page, duration, seek, external };
}
