import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/** 'none' removes the Network Information API; a type mocks navigator.connection with a live `change`. */
async function boot(page: Page, mode: 'none' | 'wifi' | 'cellular' | 'ethernet') {
  await page.addInitScript((mode) => {
    sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 }));
    if (mode === 'none') {
      delete (Navigator.prototype as { connection?: unknown }).connection;
      return;
    }
    const c = Object.assign(new EventTarget(), { type: mode, effectiveType: mode === 'wifi' ? '3g' : '4g' });
    Object.defineProperty(Navigator.prototype, 'connection', { configurable: true, get: () => c });
    (window as unknown as { __conn: (t: string) => void }).__conn = (t) => {
      c.type = t;
      c.dispatchEvent(new Event('change'));
    };
  }, mode);
  await page.goto('/');
}
const net = (page: Page) => page.locator('.m-status svg[data-network]');
const conn = (page: Page, t: string) => page.evaluate((t) => (window as unknown as { __conn: (t: string) => void }).__conn(t), t);
const geometry = (page: Page) =>
  page.evaluate(() => {
    const box = (s: string) => {
      const r = document.querySelector(s)!.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height];
    };
    return { status: box('.m-status'), net: box('.m-status svg[data-network]'), time: box('.m-status__time'), target: box('.m-status__target'), battery: box('.m-status svg[data-battery]') };
  });

test('network: no Network Information API (e.g. iOS Safari) → the designed 5 bars, unchanged', async ({ page }) => {
  await boot(page, 'none');
  await expect(net(page)).toHaveAttribute('data-network', 'fallback');
  expect(await net(page).locator('rect').evaluateAll((rs) => rs.map((r) => getComputedStyle(r).fill))).toEqual(Array(5).fill('rgb(255, 255, 255)'));
});

test('network: connection.type drives Wi-Fi / cellular live (never effectiveType), ethernet stays fallback, geometry fixed', async ({ page }) => {
  await boot(page, 'wifi'); // effectiveType '3g' must not make it "cellular"
  await expect(net(page)).toHaveAttribute('data-network', 'wifi');
  await expect(net(page).locator('path')).toHaveCount(3);
  const g0 = await geometry(page);
  await conn(page, 'cellular');
  await expect(net(page)).toHaveAttribute('data-network', 'cellular');
  await expect(net(page).locator('rect')).toHaveCount(5);
  expect(await geometry(page)).toEqual(g0);
  await conn(page, 'wifi');
  await expect(net(page)).toHaveAttribute('data-network', 'wifi');
  await conn(page, 'ethernet');
  await expect(net(page)).toHaveAttribute('data-network', 'fallback');
  await conn(page, 'none');
  await expect(net(page)).toHaveAttribute('data-network', 'offline');
  expect(await geometry(page)).toEqual(g0);
  await expect(page.locator('.m-status svg[data-battery]')).toBeVisible(); // battery untouched
  expect((await page.locator('.m-status__left').textContent())!.trim()).toBe('IYS'); // no added text
});

test('network: really going offline and back (browser online/offline events)', async ({ page, context }) => {
  await boot(page, 'cellular');
  await expect(net(page)).toHaveAttribute('data-network', 'cellular');
  await context.setOffline(true);
  await expect(net(page)).toHaveAttribute('data-network', 'offline');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await context.setOffline(false);
  await expect(net(page)).toHaveAttribute('data-network', 'cellular');
});
