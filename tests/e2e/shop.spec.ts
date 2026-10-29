import { desktop, expect, fmt, index, meta, stores, test } from './fixtures';

const browserWin = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: /IYS INTERNET/ });

test.describe('IYS INTERNET commerce', () => {
  test('shop exposes the whole public catalogue with computed pagination', async ({ page }) => {
    await desktop(page, '/shop');
    const b = browserWin(page);
    const total = meta.publicProductsTotal as number;
    const pages = Math.ceil(total / 48);
    await expect(b.locator('.page__meta')).toContainText(`of ${fmt(total)} products`);
    await expect(b.locator('.page__meta')).toContainText(`page 1 of ${pages}`);
    await expect(b.locator('.grid > li')).toHaveCount(48);
    await expect(b.getByRole('status')).toHaveText(`48 of ${fmt(total)} products.`);
    await b.getByRole('button', { name: 'Next »' }).first().click();
    await expect(page).toHaveURL(/page=2/);
    await expect(b.getByLabel('Address', { exact: true })).toHaveValue('http://www.inyourshoe.com/shop?page=2');
    await b.getByRole('button', { name: `Page ${pages}` }).first().click();
    await expect(b.locator('.grid > li')).toHaveCount(total - 48 * (pages - 1));
    const last = index.products[index.products.length - 1];
    await expect(b.getByRole('link', { name: last.t, exact: true })).toBeVisible();
  });

  test('filters + sort update counts and pages, then reset', async ({ page }) => {
    await desktop(page, '/collections/hoodies');
    const b = browserWin(page);
    const hoodies = index.collections.find((c: { h: string }) => c.h === 'hoodies').n;
    await expect(b.locator('.page__meta')).toContainText(`of ${fmt(hoodies)} products`);
    await b.getByRole('checkbox', { name: /^M \(/ }).check();
    await expect(page).toHaveURL(/size=M/);
    const withM = Number((await b.locator('.page__meta b').nth(1).textContent())!.replace(/,/g, ''));
    expect(withM).toBeGreaterThan(0);
    expect(withM).toBeLessThanOrEqual(hoodies);
    await b.getByLabel('Sort by').selectOption('price-asc');
    const prices = await b.locator('.pcard .price__now').allTextContents();
    const nums = prices.map((p) => Number(p.replace(/[^\d.]/g, '')));
    expect([...nums].sort((a, c) => a - c)).toEqual(nums);
    await b.getByRole('button', { name: 'Reset filters' }).first().click();
    await expect(page).toHaveURL(/\/collections\/hoodies$/);
    await expect(b.locator('.page__meta')).toContainText(`of ${fmt(hoodies)} products`);
  });

  test('sale-only uses real compare-at prices; filters never strand a page', async ({ page }) => {
    await desktop(page, '/shop?page=26');
    const b = browserWin(page);
    const saleLabel = b.getByRole('checkbox', { name: /On sale only/ });
    const expected = Number((await b.getByText(/On sale only \(/).textContent())!.match(/\(([\d,]+)\)/)![1]!.replace(/,/g, ''));
    await saleLabel.check();
    await expect(page).toHaveURL(/sale=1/);
    await expect(b.locator('.page__meta')).toContainText(`of ${fmt(expected)} products`);
    await expect(page).not.toHaveURL(/page=26/);
    for (const card of await b.locator('.pcard').all()) await expect(card.locator('s.price__was')).toHaveCount(1);
  });

  test('fuzzy search, exact names, and URL state', async ({ page }) => {
    await desktop(page, '/search?q=ceral');
    const b = browserWin(page);
    await expect(b.locator('.result').first()).toContainText(/Cereal/);
    const name = index.products[Math.floor(index.products.length / 2)].t as string;
    await b.getByLabel(/Search .* products/).fill(name);
    await b.getByLabel(/Search .* products/).press('Enter');
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(name).replace(/%20/g, '(\\+|%20)')}`));
    await expect(b.locator('.result__title').first()).toHaveText(name);
  });

  test('product deep link → variants → add to bag → cart quantities', async ({ page }) => {
    const multi = index.products.find((p: { sz?: unknown[]; a?: number; o?: string[] }) => p.sz && p.sz.length > 1 && p.a === 1 && !p.o);
    await desktop(page, `/product/${multi.h}`);
    const b = browserWin(page);
    await expect(b.getByRole('heading', { level: 1 })).toHaveText(multi.t);
    await expect(b.getByLabel('Address', { exact: true })).toHaveValue(`http://www.inyourshoe.com/products/${multi.h}`);
    await expect(b.getByRole('link', { name: /VIEW CURRENT ITEM ON IYS/ })).toHaveAttribute('href', `https://inyourshoe.com/products/${multi.h}`);
    const add = b.getByRole('button', { name: /Choose size|ADD TO BAG/ });
    await expect(add).toBeDisabled();
    const size = multi.sz.find((s: [string, number]) => s[1] === 1)[0];
    await b.locator('.chip label', { hasText: new RegExp(`^${size}$`) }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(page.locator('.transfer')).toContainText('COPYING ITEM TO:');
    await expect(page.getByRole('button', { name: /Open My Bag, 1 items/ })).toBeVisible();
    await page.getByRole('button', { name: /Open My Bag, 1 items/ }).first().click();
    const bag = page.getByRole('dialog', { name: 'MY BAG' });
    await bag.getByRole('button', { name: /Increase quantity/ }).click();
    const unit = multi.sz.find((s: [string, number, number, number?]) => s[0] === size)[3] ?? multi.p;
    await expect(bag.locator('.bag__total b')).toHaveText(`${fmt(unit * 2)} EGP`);
    // CHECKOUT hands this exact variant × 2 to the official IYS checkout (stubbed: no live store in CI)
    const vid = multi.sz.find((s: [string, number, number]) => s[0] === size)[2];
    await page.route('https://inyourshoe.com/cart/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>IYS checkout (test stub)</title>' }));
    await bag.getByRole('button', { name: 'CHECKOUT' }).click();
    await expect(page).toHaveURL(`https://inyourshoe.com/cart/${vid}:2`);
    await page.goBack();
    await page.getByRole('button', { name: /Open My Bag, 2 items/ }).first().click(); // the local bag survived the handoff
    await bag.getByRole('button', { name: /^Remove / }).click();
    await expect(bag).toContainText('ur bag is empty :(');
  });

  test('first, middle and last catalogue products, a kids and a women item all resolve', async ({ page }) => {
    const pick = (h: string) => index.products.find((p: { h: string }) => p.h === h);
    const kids = index.collections.find((c: { h: string }) => c.h === 'all-kids-products').o[0];
    const women = index.collections.find((c: { h: string }) => c.h === 'women').o[0];
    const targets = [index.products[0], index.products[Math.floor(index.products.length / 2)], index.products[index.products.length - 1], index.products[kids], index.products[women], pick(meta.productsOutsideAllProducts.handles[0])];
    await desktop(page, `/product/${targets[0].h}`);
    for (const t of targets) {
      await page.evaluate((h) => {
        window.history.pushState({ idx: 1 }, '', `/product/${h}`);
        window.dispatchEvent(new PopStateEvent('popstate', { state: { idx: 1 } }));
      }, t.h);
      await expect(browserWin(page).getByRole('heading', { level: 1 })).toHaveText(t.t);
    }
  });

  test('favorites persist across reloads', async ({ page }) => {
    await desktop(page, '/collections/pjoys');
    const b = browserWin(page);
    const first = b.locator('.pcard').first();
    const title = (await first.locator('.pcard__title').textContent())!;
    await first.getByRole('button', { name: /to Favorites/ }).click();
    await page.reload();
    await page.getByRole('button', { name: /Open Favorites, 1 saved/ }).click();
    await expect(browserWin(page).locator('.pcard__title')).toHaveText([title]);
  });

  test('stores directory shows every published store', async ({ page }) => {
    await desktop(page, '/stores');
    const b = browserWin(page);
    await expect(b.locator('.dirtable tbody tr')).toHaveCount(stores.storeCount);
    await expect(b.getByRole('heading', { name: /FIND IYS IRL/ })).toBeVisible();
  });

  test('404 and browser back/forward', async ({ page }) => {
    await desktop(page, '/definitely-not-a-page');
    const b = browserWin(page);
    await expect(b).toContainText('omg this page went offline :(');
    await b.getByRole('button', { name: 'BACK 2 SHOP' }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await b.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page).toHaveURL(/definitely-not-a-page/);
    await b.getByRole('button', { name: 'Forward' }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });

  test('broken remote images degrade honestly with the real title', async ({ page }) => {
    await desktop(page, '/shop');
    await expect(browserWin(page).locator('.img-offline').first()).toContainText('IMAGE COULD NOT LOAD');
    await expect(browserWin(page).locator('.img-offline').first()).toContainText(index.products[0].t);
  });
});
