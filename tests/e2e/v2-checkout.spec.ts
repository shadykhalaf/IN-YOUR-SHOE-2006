import type { Page } from '@playwright/test';
import { desktop, expect, index, test } from './fixtures';

type P = { h: string; t: string; a?: number; o?: string[]; sz?: [string, number, number?, number?][]; qv?: [number, number] };
const products = index.products as P[];
/** A size-only product with an in-stock size, and a different single-variant in-stock product. */
const sized = products.find((p) => p.sz && p.sz.length > 1 && p.a === 1 && !p.o && p.sz.some((s) => s[1] === 1 && s[2]))!;
const size = sized.sz!.find((s) => s[1] === 1 && s[2])!;
const single = products.find((p) => p.qv && p.qv[1] === 1 && !p.sz && p.h !== sized.h)!;
const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const bagItems = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.bag') ?? '{"state":{"items":[]}}').state.items.map((i: { variantId: number; quantity: number }) => [i.variantId, i.quantity]));

/** Stub the real store: count every cart permalink request, never reach the live checkout in CI. */
async function stubCheckout(page: Page) {
  const hits: string[] = [];
  await page.route('https://inyourshoe.com/cart/**', (r) => {
    hits.push(r.request().url());
    return r.fulfill({ status: 200, contentType: 'text/html', body: '<title>IYS checkout (test stub)</title>' });
  });
  return hits;
}

test.describe('CHECKOUT → the real IYS Shopify checkout', () => {
  test('two products, chosen variant × 2 and × 1 → one cart permalink with exactly those lines; bag kept', async ({ page }) => {
    const hits = await stubCheckout(page);
    await desktop(page, `/product/${sized.h}`);
    const b = browserWin(page);
    await b.locator('.chip label', { hasText: new RegExp(`^${size[0]}$`) }).click();
    await b.getByRole('button', { name: 'Increase quantity' }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await page.goto(`/product/${single.h}`);
    await expect(b.getByRole('heading', { level: 1 })).toHaveText(single.t);
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await page.getByRole('button', { name: /Open My Bag, 3 items/ }).first().click();
    const bag = page.getByRole('dialog', { name: 'MY BAG' });
    await expect(bag.locator('.bag__row')).toHaveCount(2);
    expect(await bagItems(page)).toEqual([
      [size[2], 2],
      [single.qv![0], 1],
    ]);

    await bag.getByRole('button', { name: /CHECKOUT xx/ }).click();
    const expected = `https://inyourshoe.com/cart/${size[2]}:2,${single.qv![0]}:1`;
    await expect(page).toHaveURL(expected);
    expect(hits).toEqual([expected]);

    await page.goBack();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    expect(await bagItems(page)).toEqual([
      [size[2], 2],
      [single.qv![0], 1],
    ]);
  });

  test('a line without a real variant stops checkout with an honest message: no redirect, nothing dropped, bag kept', async ({ page }) => {
    const hits = await stubCheckout(page);
    await page.addInitScript(([good, broken]) => {
      if (localStorage.getItem('iys2006.bag')) return;
      localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [good, broken] }, version: 1 }));
    }, [
      { key: `${single.h}::${single.qv![0]}`, handle: single.h, title: single.t, variantId: single.qv![0], variantTitle: null, size: null, quantity: 1, price: 100, image: null },
      { key: `${sized.h}::default`, handle: sized.h, title: sized.t, variantId: null, variantTitle: null, size: null, quantity: 2, price: 100, image: null },
    ]);
    await desktop(page, '/');
    await browserWin(page).locator('.tbtn').first().click();
    await page.getByRole('button', { name: /Open My Bag, 3 items/ }).first().click();
    await page.getByRole('dialog', { name: 'MY BAG' }).getByRole('button', { name: /CHECKOUT xx/ }).click();
    const alert = page.getByRole('alertdialog', { name: 'CHECKOUT COULDN’T START :(' });
    await expect(alert).toContainText('ONE OF UR ITEMS NEEDS A REFRESH');
    expect(hits).toEqual([]);
    expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect(await bagItems(page)).toEqual([
      [single.qv![0], 1],
      [null, 2],
    ]);
    await alert.getByRole('button', { name: 'Open item' }).click();
    await expect(page).toHaveURL(new RegExp(`/product/${sized.h}$`));
  });
});
