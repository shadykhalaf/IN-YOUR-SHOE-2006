import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

export const meta = JSON.parse(readFileSync(new URL('../../src/data/catalogue-meta.json', import.meta.url), 'utf8'));
export const index = JSON.parse(readFileSync(new URL('../../src/data/catalogue-index.json', import.meta.url), 'utf8'));
export const stores = JSON.parse(readFileSync(new URL('../../src/data/stores.generated.json', import.meta.url), 'utf8'));
export const curation = JSON.parse(readFileSync(new URL('../../src/data/curation.json', import.meta.url), 'utf8'));
export const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);

/** Remote CDN images are blocked: tests never depend on IYS being reachable. */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.route(/^https:\/\/(cdn\.shopify\.com|inyourshoe\.com\/cdn)\//, (r) => r.abort());
    await page.route(/_vercel\/insights/, (r) => r.abort());
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await use(page);
    expect(errors, 'uncaught page errors').toEqual([]);
  },
});
export { expect };

/** Desktop without boot/welcome (session flags pre-set). */
export async function desktop(page: Page, path = '/') {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
  await page.goto(path);
  await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
}

export async function axe(page: Page, include?: string) {
  let b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  if (include) b = b.include(include);
  const r = await b.analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}
