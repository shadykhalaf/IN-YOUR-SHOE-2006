import type { Page } from '@playwright/test';
import { expect, index, test } from './fixtures';

type P = { h: string; t: string; a?: number; o?: string[]; sz?: [string, number, number?, number?][]; qv?: [number, number] };
const products = index.products as P[];
const sized = products.find((p) => p.sz && p.sz.length > 1 && p.a === 1 && !p.o && p.sz.some((s) => s[1] === 1 && s[2]))!;
const size = sized.sz!.find((s) => s[1] === 1 && s[2])!;
const single = products.find((p) => p.qv && p.qv[1] === 1 && !p.sz && p.h !== sized.h)!;
const expected = `https://inyourshoe.com/cart/${size[2]}:2,${single.qv![0]}:1`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript((items) => {
    sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 }));
    if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items }, version: 1 }));
  }, [
    { key: `${sized.h}::${size[2]}`, handle: sized.h, title: sized.t, variantId: size[2], variantTitle: size[0], size: size[0], quantity: 2, price: 100, image: null },
    { key: `${single.h}::${single.qv![0]}`, handle: single.h, title: single.t, variantId: single.qv![0], variantTitle: null, size: null, quantity: 1, price: 100, image: null },
  ]);
  await page.route('https://inyourshoe.com/cart/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>IYS checkout (test stub)</title>' }));
});
const openBag = (page: Page) => page.getByRole('button', { name: /My Bag, 3 items/ }).click();

test('mobile: the in-page CHECKOUT xx and the CHECKOUT soft key send the same exact bag', async ({ page }) => {
  await page.goto('/');
  await openBag(page);
  await page.getByRole('button', { name: 'CHECKOUT xx' }).click();
  await expect(page).toHaveURL(expected);
  await page.goBack();
  await openBag(page); // bag still there
  await expect(page.locator('.m-soft__center')).toHaveText('CHECKOUT');
  await page.locator('.m-soft__center').click();
  await expect(page).toHaveURL(expected);
});
