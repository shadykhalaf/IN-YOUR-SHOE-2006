import type { Page } from '@playwright/test';
import { axe, expect, test } from './fixtures';

async function boot(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
  await page.goto('/');
  await expect(page.locator('.m-status')).toBeVisible();
}
const pet = (page: Page) => page.locator('.cpet');
const status = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('.m-status')!.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height, document.querySelector('.m-status')!.textContent];
  });

for (const width of [320, 390, 430]) {
  test(`Catchy on IYS Mobile home at ${width}px: fits, taps, hides away from home and comes back`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await boot(page);
    const s0 = await status(page);
    await expect(pet(page)).toBeVisible();
    const p = (await pet(page).boundingBox())!;
    expect(p.height).toBeGreaterThanOrEqual(48);
    expect(p.height).toBeLessThanOrEqual(64);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    // never on top of the app shortcuts
    for (const b of await page.locator('.m-bar__key, .m-gamesentry').all()) {
      const r = (await b.boundingBox())!;
      expect(p.y >= r.y + r.height || p.y + p.height <= r.y).toBe(true);
    }
    await page.getByRole('button', { name: 'Catchy, IYS desktop buddy' }).tap();
    await expect(pet(page)).toHaveAttribute('data-catchy-state', /happy|wake/);
    await expect(page.locator('.cpet__bubble')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await axe(page, '.m-home');
    // an app opens → Catchy steps away; home again → he's back
    await page.getByRole('button', { name: 'SEARCH' }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(pet(page)).toHaveCount(0);
    await page.getByRole('button', { name: '◀ BACK' }).click();
    await expect(pet(page)).toBeVisible();
    // overlays (MENU, BAG, GAMES) suspend him too
    await page.getByRole('button', { name: 'MENU', exact: true }).click();
    await expect(pet(page)).toHaveCount(0);
    await page.getByRole('button', { name: '◀ BACK' }).click();
    await expect(pet(page)).toBeVisible();
    await page.getByRole('button', { name: /My Bag, 0 items/ }).click();
    await expect(pet(page)).toHaveCount(0);
    await page.getByRole('button', { name: /My Bag, 0 items/ }).click();
    await expect(pet(page)).toBeVisible();
    expect(await status(page)).toEqual(s0);
  });
}

test('MENU › Settings: Catchy can be turned off and stays off', async ({ page }) => {
  await boot(page);
  await expect(pet(page)).toBeVisible();
  await page.getByRole('button', { name: 'MENU', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Catchy on the home screen' }).uncheck();
  await page.getByRole('button', { name: '◀ BACK' }).click();
  await expect(page.locator('.m-hero')).toBeVisible();
  await expect(pet(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.m-hero')).toBeVisible();
  await expect(pet(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'MENU', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Catchy on the home screen' }).check();
  await page.getByRole('button', { name: '◀ BACK' }).click();
  await expect(pet(page)).toBeVisible();
});
