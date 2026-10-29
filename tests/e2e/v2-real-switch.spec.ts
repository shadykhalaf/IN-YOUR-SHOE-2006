import type { Page } from '@playwright/test';
import { axe, desktop, expect, index, test } from './fixtures';

type P = { h: string; t: string; a?: number; o?: string[]; sz?: [string, number, number?, number?][]; qv?: [number, number] };
const products = index.products as P[];
const sized = products.find((p) => p.sz && p.sz.length > 1 && p.a === 1 && !p.o && p.sz.some((s) => s[1] === 1 && s[2]))!;
const size = sized.sz!.find((s) => s[1] === 1 && s[2])!;
const single = products.find((p) => p.qv && p.qv[1] === 1 && !p.sz && p.h !== sized.h)!;
const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const realSwitch = (page: Page) => page.getByRole('button', { name: /IYS 2006.*REAL IYS.*switch to the real In Your Shoe store/ });
const bagItems = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.bag') ?? '{"state":{"items":[]}}').state.items.map((i: { variantId: number; quantity: number }) => [i.variantId, i.quantity]));

/** Stub the real store (never reach the live site in CI) and record every hand-off request. */
async function stubRealIys(page: Page) {
  const hits: string[] = [];
  const stub = (r: import('@playwright/test').Route) => {
    hits.push(r.request().url());
    return r.fulfill({ status: 200, contentType: 'text/html', body: '<title>REAL IYS (test stub)</title>' });
  };
  await page.route('https://inyourshoe.com/', stub);
  await page.route('https://inyourshoe.com/cart/**', stub);
  return hits;
}

test.describe('IYS 2006 ↔ REAL IYS switch (desktop)', () => {
  test('the switch sits in the thin top strip, above the desktop, covering nothing', async ({ page }) => {
    await desktop(page, '/');
    const bar = await page.locator('.realbar').boundingBox();
    const desk = await page.locator('.desktop').boundingBox();
    const win = await browserWin(page).boundingBox();
    expect(bar!.y).toBe(0);
    expect(desk!.y).toBe(bar!.height);
    expect(win!.y).toBeGreaterThanOrEqual(desk!.y);
    await expect(realSwitch(page)).toBeVisible();
    await expect(realSwitch(page)).toContainText('IYS 2006');
    await expect(realSwitch(page)).toContainText('REAL IYS');
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await axe(page, '.realbar');
  });

  test('empty bag → REAL IYS opens the real homepage in the same tab', async ({ page }) => {
    const hits = await stubRealIys(page);
    await desktop(page, '/');
    await realSwitch(page).click();
    await expect(page).toHaveURL('https://inyourshoe.com/');
    expect(hits).toEqual(['https://inyourshoe.com/']);
  });

  test('bag built in the real UI → storefront cart with exact variants × quantities; CHECKOUT stays direct; bag kept', async ({ page }) => {
    const hits = await stubRealIys(page);
    await desktop(page, `/product/${sized.h}`);
    const b = browserWin(page);
    await b.locator('.chip label', { hasText: new RegExp(`^${size[0]}$`) }).click();
    await b.getByRole('button', { name: 'Increase quantity' }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await page.goto(`/product/${single.h}`);
    await expect(b.getByRole('heading', { level: 1 })).toHaveText(single.t);
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(page.getByRole('button', { name: /Open My Bag, 3 items/ }).first()).toBeVisible();
    const lines = `${size[2]}:2,${single.qv![0]}:1`;

    await realSwitch(page).click();
    await expect(page).toHaveURL(`https://inyourshoe.com/cart/${lines}?storefront=true`);
    await page.goBack();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    expect(await bagItems(page)).toEqual([
      [size[2], 2],
      [single.qv![0], 1],
    ]);

    // the same bag through CHECKOUT is still the direct-checkout permalink
    await page.getByRole('button', { name: /Open My Bag, 3 items/ }).first().click();
    await page.getByRole('dialog', { name: 'MY BAG' }).getByRole('button', { name: /CHECKOUT xx/ }).click();
    await expect(page).toHaveURL(`https://inyourshoe.com/cart/${lines}`);
    expect(hits).toEqual([`https://inyourshoe.com/cart/${lines}?storefront=true`, `https://inyourshoe.com/cart/${lines}`]);
  });

  test('a line without a real variant stops the switch: no navigation, refresh message, bag kept; keyboard works', async ({ page }) => {
    const hits = await stubRealIys(page);
    await page.addInitScript((items) => {
      if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items }, version: 1 }));
    }, [
      { key: `${single.h}::${single.qv![0]}`, handle: single.h, title: single.t, variantId: single.qv![0], variantTitle: null, size: null, quantity: 1, price: 100, image: null },
      { key: `${sized.h}::default`, handle: sized.h, title: sized.t, variantId: null, variantTitle: null, size: null, quantity: 2, price: 100, image: null },
    ]);
    await desktop(page, '/');
    // the IYS INTERNET window takes focus one frame after it opens; let that land first
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[data-window="internet"]')))).toBe(true);
    await realSwitch(page).focus();
    await expect(realSwitch(page)).toBeFocused();
    await page.keyboard.press('Enter');
    const alert = page.getByRole('alertdialog', { name: 'REAL IYS COULDN’T OPEN :(' });
    await expect(alert).toContainText('ONE OF UR ITEMS NEEDS A REFRESH');
    expect(hits).toEqual([]);
    expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect(await bagItems(page)).toEqual([
      [single.qv![0], 1],
      [null, 2],
    ]);
  });
});
