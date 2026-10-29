import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const GREEN = 'rgb(125, 255, 154)';
const ORANGE = 'rgb(255, 176, 32)';
const RED = 'rgb(224, 41, 44)';

/** Install a session + a battery mode before the app loads: 'none' removes the API, 'reject' fails it, a number mocks a BatteryManager. */
async function boot(page: Page, mode: 'none' | 'reject' | number) {
  await page.addInitScript((mode) => {
    sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 }));
    if (mode === 'none') delete (Navigator.prototype as { getBattery?: unknown }).getBattery;
    else if (mode === 'reject') (Navigator.prototype as { getBattery?: unknown }).getBattery = () => Promise.reject(new Error('denied'));
    else {
      const m = Object.assign(new EventTarget(), { level: mode, charging: false });
      (Navigator.prototype as { getBattery?: unknown }).getBattery = () => Promise.resolve(m);
      (window as unknown as { __battery: (l: number) => void }).__battery = (l) => {
        m.level = l;
        m.dispatchEvent(new Event('levelchange'));
      };
    }
  }, mode);
  await page.goto('/');
}
const battery = (page: Page) => page.locator('.m-status svg[data-battery]');
const bars = (page: Page) => battery(page).locator('rect').evaluateAll((rs) => rs.slice(2).map((r) => getComputedStyle(r).fill));
const geometry = (page: Page) =>
  page.evaluate(() => {
    const box = (s: string) => {
      const r = document.querySelector(s)!.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height];
    };
    return { status: box('.m-status'), battery: box('.m-status svg[data-battery]'), time: box('.m-status__time'), left: box('.m-status__left'), right: box('.m-status__right') };
  });

test('battery: no Battery Status API (e.g. iOS Safari) → the designed 3 green bars, unchanged', async ({ page }) => {
  await boot(page, 'none');
  await expect(battery(page)).toHaveAttribute('data-battery', 'fallback');
  expect(await bars(page)).toEqual([GREEN, GREEN, GREEN]);
  await expect(page.locator('.m-status__right')).toHaveText('2006');
});

test('battery: API rejects → fallback, no error shown', async ({ page }) => {
  await boot(page, 'reject');
  await page.waitForTimeout(300);
  await expect(battery(page)).toHaveAttribute('data-battery', 'fallback');
  expect(await bars(page)).toEqual([GREEN, GREEN, GREEN]);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('battery: real level drives 3 green / 2 orange / 1 red live, never a number, never a layout shift', async ({ page }) => {
  await boot(page, 0.8);
  await expect(battery(page)).toHaveAttribute('data-battery', 'high');
  expect(await bars(page)).toEqual([GREEN, GREEN, GREEN]);
  const g0 = await geometry(page);
  const set = (l: number) => page.evaluate((l) => (window as unknown as { __battery: (l: number) => void }).__battery(l), l);

  await set(0.5);
  await expect(battery(page)).toHaveAttribute('data-battery', 'medium');
  expect(await bars(page)).toEqual([ORANGE, ORANGE, 'none']);
  await set(0.2);
  await expect(battery(page)).toHaveAttribute('data-battery', 'low');
  expect(await bars(page)).toEqual([RED, 'none', 'none']);
  await set(0);
  expect(await bars(page)).toEqual([RED, 'none', 'none']); // never zero bars

  // the level is internal only: no text in the icon, no % anywhere in the status bar
  expect(await battery(page).evaluate((s) => s.textContent)).toBe('');
  await expect(page.locator('.m-status__right')).toHaveText('2006');
  expect(await page.locator('.m-status').textContent()).not.toContain('%');
  expect((await page.locator('.m-status__left').textContent())!.trim()).toBe('IYS');
  expect(await geometry(page)).toEqual(g0);
});
