import type { Page } from '@playwright/test';
import { axe, expect, test } from './fixtures';

/**
 * IYS MOBILE has no Catchy (navigation pass, 2026-10-27): no character, no
 * ledge, no bubbles, no sounds, nothing invisible over the shop, and his code
 * never even loads on a phone. Desktop Catchy is covered by v2-catchy.spec.ts
 * (and the desktop ↔ mobile resize by v2-nav.spec.ts); his games stay.
 */
async function boot(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
  await page.goto('/');
  await expect(page.locator('.m-status')).toBeVisible();
}
const CATCHY = '.cpet, .catchy-layer, .cpet__bubble, .cpet__menu, [aria-label="Catchy, IYS desktop buddy"]';
/** Catchy's code (CatchyPet chunk) requested by the page, if ever. */
function watchCatchyCode(page: Page) {
  const hits: string[] = [];
  page.on('request', (r) => {
    if (/CatchyPet|catchy\.css|features\/catchy\/(CatchyPet|behaviour|movement|adapters)/.test(r.url())) hits.push(r.url());
  });
  return hits;
}

for (const width of [320, 390, 430]) {
  test(`JOURNEY 5 at ${width}px: Catchy never appears on IYS MOBILE (home, scroll, SEARCH, GAMES, home again)`, async ({ page }) => {
    const code = watchCatchyCode(page);
    await page.setViewportSize({ width, height: 800 });
    await boot(page);
    // well past his old first move (4 s) and bubble time
    await page.waitForTimeout(5500);
    await expect(page.locator(CATCHY)).toHaveCount(0);
    // no leftover ledge: every home panel follows the one before at the same gap
    const gaps = await page.evaluate(() => {
      const panels = [...document.querySelectorAll<HTMLElement>('.m-home > section')];
      return panels.slice(1).map((p, i) => Math.round(p.getBoundingClientRect().top - panels[i]!.getBoundingClientRect().bottom));
    });
    expect(gaps.length).toBeGreaterThan(1);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
    // scroll the whole home: still nothing, and nothing over the shop where he used to stand
    await page.locator('#m-main').evaluate((m) => m.scrollTo(0, m.scrollHeight));
    await page.waitForTimeout(400);
    await expect(page.locator(CATCHY)).toHaveCount(0);
    const below = await page.evaluate(() => {
      const r = document.querySelector('.m-panel--drop')!.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width * 0.72, r.bottom + 24);
      return el?.closest('.cpet, .catchy-layer') ? 'catchy' : 'ok';
    });
    expect(below).toBe('ok');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#m-main').evaluate((m) => m.scrollTo(0, 0));
    await axe(page, '.m-home');
    // apps and home again
    await page.getByRole('navigation', { name: 'IYS MOBILE bar' }).getByRole('button', { name: 'SEARCH' }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.locator(CATCHY)).toHaveCount(0);
    await page.getByRole('navigation', { name: 'IYS MOBILE bar' }).getByRole('button', { name: /IYS GAMES/ }).click();
    await expect(page.getByRole('button', { name: 'PLAY CATCHY SNAKE' })).toBeVisible(); // his games are still here
    await expect(page.locator(CATCHY)).toHaveCount(0);
    await page.getByRole('button', { name: 'Go to IYS Retro home' }).click();
    await expect(page.locator('.m-hero')).toBeVisible();
    await page.waitForTimeout(4500);
    await expect(page.locator(CATCHY)).toHaveCount(0);
    expect(code, 'Catchy code requested on a phone').toEqual([]);
  });
}

test('MENU › SETTINGS has no Catchy switch any more; a saved desktop choice is left alone', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('iys2006.catchy.enabled', 'false'));
  await boot(page);
  await page.getByRole('button', { name: 'MENU', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'SETTINGS' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Catchy/i })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /Sounds/ })).toBeVisible();
  await page.getByRole('button', { name: '◀ BACK' }).click();
  await expect(page.locator(CATCHY)).toHaveCount(0);
  // the desktop's own on/off is untouched by the phone
  expect(await page.evaluate(() => localStorage.getItem('iys2006.catchy.enabled'))).toBe('false');
});
