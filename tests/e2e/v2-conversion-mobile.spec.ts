import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { axe, expect, index, test } from './fixtures';

/**
 * Conversion pass, IYS MOBILE: the bar (SHOP ALL · SEARCH · GAMES · STORES ·
 * MSG; FAVS moved into MENU in the 2026-10-27 navigation pass), the PJOYS marker instead of a popup, JUST DROPPED in the first
 * screen, welcome.htm minimize, size guide, bag extras and journeys B + C.
 */
type P = { h: string; t: string; a?: number; o?: string[]; p?: number; sz?: [string, number, number?, number?][] };
const products = index.products as P[];
const charts = JSON.parse(readFileSync(new URL('../../src/data/size-charts.generated.json', import.meta.url), 'utf8')) as { products: Record<string, string[]> };
const withChart = products.find((p) => p.sz && p.sz.length > 1 && p.a === 1 && !p.o && p.sz.some((s) => s[1] === 1 && s[2]) && charts.products[p.h])!;
const chartSize = withChart.sz!.find((s) => s[1] === 1 && s[2])!;

const session = (page: Page, state: Record<string, unknown> = { bootSeen: true, welcomeSeen: true, pjoysPinged: true }) =>
  page.addInitScript((s) => {
    if (!sessionStorage.getItem('iys2006.session')) sessionStorage.setItem('iys2006.session', JSON.stringify({ state: s, version: 1 }));
  }, state);
const stubStore = (page: Page) => page.route('https://inyourshoe.com/cart/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>IYS (test stub)</title>' }));
const bar = (page: Page) => page.getByRole('navigation', { name: 'IYS MOBILE bar' });

test('the bar holds SHOP ALL · SEARCH · GAMES · STORES and MSG at its end; 44px keys; the old tiles are gone', async ({ page }) => {
  await session(page);
  await page.goto('/');
  const keys = bar(page).locator('.m-bar__key');
  await expect(keys).toHaveCount(5);
  const labels = await keys.allInnerTexts();
  expect(labels.map((l) => l.trim())).toEqual(['SHOP ALL', 'SEARCH', 'GAMES', 'STORES', 'MSG']);
  for (const k of await keys.all()) expect((await k.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.m-grid, .m-notify, .m-gamesentry')).toHaveCount(0);
  await axe(page, '.m-bar');
});

test('PJOYS arrives as a marker on MSG (no popup over the shop); reading it clears it for good', async ({ page }) => {
  await session(page, { bootSeen: true, welcomeSeen: true, pjoysPinged: false });
  await page.goto('/');
  const msg = bar(page).locator('.m-bar__key--msg');
  await expect(msg).toHaveAccessibleName('Messages: PJOYS, no new messages');
  await expect(msg).toHaveAccessibleName('Messages: 1 new message from PJOYS', { timeout: 12_000 });
  await expect(msg.locator('.m-bar__marker')).toHaveText('1');
  await expect(page.locator('.m-notify')).toHaveCount(0);
  await msg.click();
  await expect(page.getByRole('log', { name: 'Messages from PJOYS' })).toBeVisible();
  await page.getByRole('button', { name: /BACK/ }).click();
  await expect(msg).toHaveAccessibleName('Messages: PJOYS, no new messages');
  await page.reload();
  await page.waitForTimeout(500);
  await expect(bar(page).locator('.m-bar__marker')).toHaveCount(0);
});

for (const [w, h] of [
  [360, 800],
  [390, 844],
  [430, 932],
] as const) {
  test(`JUST DROPPED peeks in the first screen at ${w}×${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await session(page);
    await page.goto('/');
    const card = page.locator('.m-panel--drop .m-drop__card').first();
    await expect(card).toBeVisible();
    expect((await card.boundingBox())!.y).toBeLessThan(h - 40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
  });
}

test('welcome.htm can be minimized and stays minimized this session', async ({ page }) => {
  await session(page);
  await page.goto('/');
  const hero = page.getByRole('region', { name: 'welcome.htm' });
  const before = (await page.locator('.m-panel--drop').boundingBox())!.y;
  await hero.getByRole('button', { name: 'Minimize welcome.htm' }).click();
  const restore = hero.getByRole('button', { name: 'Restore welcome.htm' });
  await expect(restore).toBeFocused();
  await expect(restore).toHaveAttribute('aria-expanded', 'false');
  expect((await page.locator('.m-panel--drop').boundingBox())!.y).toBeLessThan(before);
  await page.reload();
  await expect(hero.getByRole('button', { name: 'Restore welcome.htm' })).toBeVisible();
  await hero.getByRole('button', { name: 'Restore welcome.htm' }).click();
  await expect(hero.getByRole('button', { name: /^Shop the drop/ })).toBeVisible();
});

test('JOURNEY B (360px): bar SEARCH → product → FAVS → size guide → MY BAG → checkout handoff', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await session(page);
  await stubStore(page);
  await page.goto('/');
  await bar(page).getByRole('button', { name: 'SEARCH' }).click();
  await expect(page).toHaveURL(/\/search$/);
  await page.locator('#m-q').fill(withChart.t);
  await page.locator('#m-q').press('Enter');
  await page.locator('.m-row', { hasText: withChart.t }).first().click();
  await expect(page.locator('.m-h1--product')).toHaveText(withChart.t);
  await page.getByRole('button', { name: `Add ${withChart.t} to Favorites` }).click();
  await expect(page.getByRole('button', { name: `Remove ${withChart.t} from Favorites` })).toHaveAttribute('aria-pressed', 'true');
  const guideBtn = page.getByRole('button', { name: 'SIZE GUIDE' });
  await guideBtn.click();
  await expect(guideBtn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#m-sizeguide img').first()).toHaveAttribute('src', /^https:\/\/(inyourshoe\.com\/cdn|cdn\.shopify\.com)\//);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.locator('.chip label', { hasText: new RegExp(`^${chartSize[0]}$`) }).click();
  await page.locator('.m-add').click();
  await page.getByRole('button', { name: /My Bag, 1 items/ }).click();
  await expect(page.locator('.bag__row')).toHaveCount(1);
  if ((withChart.p ?? 0) <= 3999) await expect(page.locator('.bagx-ship')).toContainText(/FREE SHIPPING\*/);
  await page.getByRole('button', { name: 'CHECKOUT xx' }).click();
  await expect(page).toHaveURL(`https://inyourshoe.com/cart/${chartSize[2]}:1`);
});

test('JOURNEY C (mobile): بنطلون → real pants, an understood line, add one to the bag', async ({ page }) => {
  await session(page);
  await page.goto(`/search?q=${encodeURIComponent('بنطلون')}`);
  await expect(page.locator('.m-understood')).toContainText('pants');
  await expect(page.locator('.m-meta').first()).toContainText(/\d+ results 4/);
  await page.locator('.m-row').first().click();
  await expect(page.locator('.m-add')).toBeVisible(); // full product (sizes) loaded before choosing
  const chip = page.locator('.variants__group').first().locator('.chip:not(.is-out) label').first();
  if (await chip.count()) await chip.click();
  if ((await page.locator('.variants__group').count()) > 1) await page.locator('.variants__group').nth(1).locator('.chip:not(.is-out) label').first().click();
  await page.locator('.m-add').click();
  await expect(page.getByRole('button', { name: /My Bag, 1 items/ })).toBeVisible();
});

/*
 * Sideways overflow regression (iPhone report 2026-10-26): the DOCUMENT never
 * overflowed; the app's own page scroller (#m-main) did, because an
 * absolutely positioned sr-only span inside a product strip escaped the
 * strip's clip. So every scroller is measured, not only the document.
 * Product strips/galleries may scroll inside themselves; nothing else may.
 */
const CAROUSELS = 'ul.m-drop, .m-gallery, .m-tabs, .gallery__thumbs, .viewer__film, [data-carousel]';
const sideways = (page: Page) =>
  page.evaluate((carousels) => {
    const all = [document.documentElement, ...document.querySelectorAll('body *')];
    return all
      .filter((e) => e.scrollWidth > e.clientWidth + 1 && (e === document.documentElement || /auto|scroll/.test(getComputedStyle(e).overflowX)) && !e.matches(carousels))
      .map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(' ')[0]} ${e.scrollWidth}>${e.clientWidth}`);
  }, CAROUSELS);

test('no sideways page scroll on any screen at 320–430px (the document AND the app scroller)', async ({ page }) => {
  test.setTimeout(120_000);
  const sizedHoodie = products.find((p) => p.sz && p.a === 1 && /hoodie/i.test(p.t))!;
  await session(page);
  for (const path of ['/', '/shop', `/product/${sizedHoodie.h}`, '/search?q=hoodie', `/search?q=${encodeURIComponent('بنطلون')}`, '/favorites', '/stores']) {
    for (const w of [320, 360, 375, 390, 393, 414, 430]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto(path);
      await expect(page.locator('.m-shell')).toBeVisible();
      await page.waitForTimeout(300);
      // bring the lower sections (shelves, newsletter, footer) into the layout too
      await page.evaluate(() => {
        const m = document.querySelector('#m-main')!;
        m.scrollTop = m.scrollHeight;
      });
      expect(await sideways(page), `${path} at ${w}px`).toEqual([]);
    }
  }
});

test('a sideways scroll moves only the product strip under the pointer, never the page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await session(page);
  await page.goto('/');
  await page.locator('.m-panel--drop .m-drop__card').first().waitFor();
  await page.evaluate(() => {
    const m = document.querySelector('#m-main')!;
    m.scrollTop = m.scrollHeight;
  });
  const left = () => page.evaluate(() => document.querySelector('#m-main')!.scrollLeft);
  const title = page.locator('.m-panel__title').last();
  await title.hover({ position: { x: 5, y: 5 } });
  await page.mouse.wheel(400, 0);
  await page.waitForTimeout(300);
  expect(await left()).toBe(0);
  const strip = page.locator('ul.m-drop').last();
  await strip.hover();
  await page.mouse.wheel(300, 0);
  await expect.poll(() => strip.evaluate((u) => u.scrollLeft)).toBeGreaterThan(0);
  expect(await left()).toBe(0);
  expect(await page.evaluate(() => [scrollX, document.documentElement.scrollWidth - document.documentElement.clientWidth])).toEqual([0, 0]);
});

test('top chrome: MENU top left and MY BAG top right around the 2006 / REAL IYS switch, 360–430px', async ({ page }) => {
  await session(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [{ key: 'a', handle: 'x', title: 'x', variantId: 1, variantTitle: null, size: null, quantity: 3, price: 100, image: null }] }, version: 1 }));
  });
  await page.goto('/');
  for (const w of [320, 360, 375, 390, 393, 414, 430]) {
    await page.setViewportSize({ width: w, height: 800 });
    const menu = (await page.getByRole('button', { name: 'IYS MENU' }).boundingBox())!;
    const sw = (await page.getByRole('button', { name: /IYS 2006.*REAL IYS/ }).boundingBox())!;
    const bag = (await page.getByRole('button', { name: 'MY BAG: 3 items' }).boundingBox())!;
    const badge = (await page.locator('.m-topkey__badge').boundingBox())!;
    expect(menu.x, `${w}`).toBeLessThan(12);
    expect(menu.x + menu.width, `${w}`).toBeLessThanOrEqual(sw.x);
    expect(sw.x + sw.width, `${w}`).toBeLessThanOrEqual(bag.x);
    expect(badge.x + badge.width, `${w}`).toBeLessThanOrEqual(w);
    expect(bag.x + bag.width, `${w}`).toBeGreaterThan(w - 20);
    expect(Math.min(menu.height, bag.height), `${w}`).toBeGreaterThanOrEqual(32);
    expect(await sideways(page), `${w}`).toEqual([]);
  }
});

test('top MENU / MY BAG and the soft keys share ONE menu and ONE bag (same state, same count)', async ({ page }) => {
  await session(page);
  await page.goto(`/product/${withChart.h}`);
  await expect(page.locator('.m-add')).toBeVisible();
  await page.locator('.chip label', { hasText: new RegExp(`^${chartSize[0]}$`) }).click();
  await page.locator('.m-add').click();
  const top = page.getByRole('button', { name: 'MY BAG: 1 item' });
  const soft = page.getByRole('navigation', { name: 'Soft keys' }).getByRole('button', { name: /My Bag, 1 items/ });
  await expect(top).toBeVisible();
  await expect(soft).toBeVisible();
  await top.click();
  await expect(top).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.bag__row')).toHaveCount(1);
  await soft.click(); // the soft key closes the same bag
  await expect(page.locator('.bag__row')).toHaveCount(0);
  await expect(top).toHaveAttribute('aria-expanded', 'false');
  // MENU from a product page (where the soft key says BACK): one menu, toggles
  const menu = page.getByRole('button', { name: 'IYS MENU' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › MENU');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › GALLERY');
  // and from search
  await page.goto('/search?q=hoodie');
  await page.getByRole('button', { name: 'MY BAG: 1 item' }).click();
  await expect(page.locator('.bag__row')).toHaveCount(1);
});

test('escape route on IYS MOBILE: 4 taps on the disabled ADD → dialog fits the phone → TAKE ME TO REAL IYS carries the bag', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await session(page);
  await stubStore(page);
  await page.addInitScript((item) => {
    if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [item] }, version: 1 }));
  }, { key: `${withChart.h}::${chartSize[2]}`, handle: withChart.h, title: withChart.t, variantId: chartSize[2], variantTitle: chartSize[0], size: chartSize[0], quantity: 2, price: 100, image: null });
  await page.goto(`/product/${withChart.h}`);
  const add = page.locator('.m-add');
  await expect(add).toBeDisabled();
  const b = (await add.boundingBox())!;
  for (let i = 0; i < 4; i++) {
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(150);
  }
  const dlg = page.getByRole('alertdialog', { name: 'IYS.EXE' });
  await expect(dlg).toBeVisible({ timeout: 6000 });
  await expect(dlg).toContainText('COMPUTER SAYING NO? :(');
  const d = (await dlg.boundingBox())!;
  expect(d.x).toBeGreaterThanOrEqual(0);
  expect(d.x + d.width).toBeLessThanOrEqual(360);
  expect(d.y + d.height).toBeLessThanOrEqual(800);
  await dlg.getByRole('button', { name: 'TAKE ME TO REAL IYS ↗' }).click();
  await expect(page).toHaveURL(`https://inyourshoe.com/cart/${chartSize[2]}:2?storefront=true`);
});

test('escape route never fires from game taps on IYS MOBILE', async ({ page }) => {
  await session(page);
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Soft keys' }).getByRole('button', { name: 'MENU', exact: true }).click();
  await page.getByRole('button', { name: 'IYS GAMES · 6 GAMES' }).click(); // MENU's entry (the bar's GAMES key is "IYS GAMES, 6 games")
  await page.getByRole('button', { name: 'PLAY CATCHY SNAKE' }).click();
  await page.locator('.game__cta').click();
  const pad = (await page.locator('.pad').first().boundingBox())!;
  for (let i = 0; i < 8; i++) {
    await page.touchscreen.tap(pad.x + pad.width / 2, pad.y + pad.height / 2);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(2500);
  await expect(page.getByText('COMPUTER SAYING NO? :(')).toHaveCount(0);
});

test('IYS MOBILE MENU › OPEN REAL IYS ↗ is always there (no frustration needed)', async ({ page }) => {
  await session(page);
  await page.route('https://inyourshoe.com/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>REAL IYS (test stub)</title>' }));
  await page.goto('/stores');
  await page.getByRole('button', { name: 'IYS MENU' }).click();
  await page.getByRole('button', { name: /OPEN REAL IYS/ }).click();
  await expect(page).toHaveURL('https://inyourshoe.com/');
});

test('mobile product page: MORE LIKE THIS scrolls by itself; the page never scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await session(page);
  await page.goto(`/product/${withChart.h}`);
  await expect(page.locator('.m-add')).toBeVisible();
  const reco = page.getByRole('region', { name: /MORE LIKE THIS/ });
  await reco.scrollIntoViewIfNeeded();
  const track = reco.locator('.reco__track');
  await track.hover();
  await page.mouse.wheel(300, 0);
  await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.querySelector('#m-main')!.scrollLeft)).toBe(0);
  expect(await sideways(page)).toEqual([]);
  await reco.locator('.reco__card').first().click();
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.locator('.m-h1--product')).not.toHaveText(withChart.t);
});
