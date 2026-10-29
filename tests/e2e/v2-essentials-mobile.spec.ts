import { expect, index, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
});

test('mobile MENU lists every essential as an official link', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'MENU', exact: true }).click();
  const list = page.getByRole('list', { name: 'Essentials' });
  const links = list.getByRole('link');
  await expect(links).toHaveCount(8);
  const hrefs = await links.evaluateAll((as) => as.map((a) => [a.getAttribute('href'), a.getAttribute('target')]));
  for (const [h, t] of hrefs) {
    expect(h).toMatch(/^https:\/\/inyourshoe\.com\/(pages|policies)\//);
    expect(t).toBe('_blank');
  }
  expect(hrefs.map((h) => h[0])).toContain('https://inyourshoe.com/pages/exchange-refund-policy');
  expect(hrefs.map((h) => h[0])).toContain('https://inyourshoe.com/policies/terms-of-service');
});

test('mobile product: essentials + PICK SIZE → ADD TO BAG; bag shows policy links', async ({ page }) => {
  const p = index.products.find((x: { sz?: [string, number][]; a?: number; o?: string[] }) => x.sz && x.sz.length > 1 && x.a === 1 && !x.o);
  await page.goto(`/product/${p.h}`);
  await expect(page.getByRole('link', { name: /^Shipping/ })).toHaveAttribute('href', 'https://inyourshoe.com/pages/shipping-policy');
  await expect(page.getByRole('link', { name: /^Exchange & Refund/ })).toHaveAttribute('href', 'https://inyourshoe.com/pages/exchange-refund-policy');
  const center = page.locator('.m-soft__center');
  await expect(center).toHaveText('PICK SIZE');
  await expect(center).toBeDisabled();
  const size = p.sz.find((s: [string, number]) => s[1] === 1)[0];
  await page.locator('.chip label', { hasText: new RegExp(`^${size}$`) }).click();
  await expect(center).toHaveText('+ MY BAG');
  await center.click();
  await page.getByRole('button', { name: /My Bag, 1 items/ }).click();
  await expect(page.getByRole('link', { name: /^Terms & Conditions/ })).toHaveAttribute('href', 'https://inyourshoe.com/pages/terms-conditions');
  await expect(page.getByRole('button', { name: 'CHECKOUT xx' })).toBeVisible();
});

test('mobile dead ends: empty search → SHOP ALL, empty favorites → Shop the drop', async ({ page }) => {
  await page.goto('/search?q=zzzxqq');
  await page.getByRole('link', { name: /^SHOP ALL/ }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await page.goto('/favorites');
  await page.getByRole('link', { name: /^Shop the drop/ }).click();
  await expect(page).toHaveURL(/\/collections\/newest$/);
});
