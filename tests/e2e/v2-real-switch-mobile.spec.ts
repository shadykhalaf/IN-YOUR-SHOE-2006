import type { Page } from '@playwright/test';
import { expect, index, test } from './fixtures';

type P = { h: string; t: string; a?: number; o?: string[]; sz?: [string, number, number?, number?][]; qv?: [number, number] };
const products = index.products as P[];
const sized = products.find((p) => p.sz && p.sz.length > 1 && p.a === 1 && !p.o && p.sz.some((s) => s[1] === 1 && s[2]))!;
const size = sized.sz!.find((s) => s[1] === 1 && s[2])!;
const single = products.find((p) => p.qv && p.qv[1] === 1 && !p.sz && p.h !== sized.h)!;
const realSwitch = (page: Page) => page.getByRole('button', { name: /IYS 2006.*REAL IYS.*switch to the real In Your Shoe store/ });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
  await page.route('https://inyourshoe.com/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>REAL IYS (test stub)</title>' }));
  await page.route('https://inyourshoe.com/cart/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>REAL IYS (test stub)</title>' }));
});

test('mobile: the switch has its own row under the untouched status bar, one line, no sideways scroll', async ({ page }) => {
  await page.goto('/');
  const status = (await page.locator('.m-status').boundingBox())!;
  const row = (await page.locator('.m-realbar').boundingBox())!;
  const sw = (await realSwitch(page).boundingBox())!;
  expect(status.height).toBe(26);
  expect(row.y).toBe(status.y + status.height);
  expect(sw.height).toBeLessThanOrEqual(row.height);
  expect(sw.x).toBeGreaterThanOrEqual(0);
  expect(sw.x + sw.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mobile: empty bag → the real homepage', async ({ page }) => {
  await page.goto('/');
  await realSwitch(page).click();
  await expect(page).toHaveURL('https://inyourshoe.com/');
});

test('mobile: bag built in the real UI → storefront cart (exact variants × quantities), CHECKOUT still direct, bag kept', async ({ page }) => {
  await page.goto(`/product/${sized.h}`);
  await page.locator('.chip label', { hasText: new RegExp(`^${size[0]}$`) }).click();
  await page.getByRole('group', { name: 'Qty:' }).getByRole('button', { name: 'Increase quantity' }).click();
  await page.locator('.m-add').click();
  await page.goto(`/product/${single.h}`);
  await expect(page.locator('.m-add')).toBeEnabled();
  await page.locator('.m-add').click();
  await expect(page.getByRole('button', { name: /My Bag, 3 items/ })).toBeVisible();
  const lines = `${size[2]}:2,${single.qv![0]}:1`;

  await realSwitch(page).click();
  await expect(page).toHaveURL(`https://inyourshoe.com/cart/${lines}?storefront=true`);
  await page.goBack();
  await page.getByRole('button', { name: /My Bag, 3 items/ }).click(); // bag survived
  await page.getByRole('button', { name: 'CHECKOUT xx' }).click();
  await expect(page).toHaveURL(`https://inyourshoe.com/cart/${lines}`);
});

test('mobile: one line and inside the screen at 320 / 360 / 375 / 390 / 414 / 430', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 360, 375, 390, 414, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const sw = (await realSwitch(page).boundingBox())!;
    const lines = await realSwitch(page).evaluate((b) => new Set([...b.querySelectorAll('.realswitch__side')].map((s) => { const r = s.getBoundingClientRect(); return Math.round(r.top + r.height / 2); })).size);
    expect(lines, `${width}px`).toBe(1);
    expect(sw.x, `${width}px`).toBeGreaterThanOrEqual(0);
    expect(sw.x + sw.width, `${width}px`).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px`).toBe(true);
    expect((await page.locator('.m-status').boundingBox())!.height).toBe(26);
  }
});
