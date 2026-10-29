import { expect, fmt, index, meta, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
});

test('IYS MOBILE is a separate shell (no desktop windows)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.m-shell')).toBeVisible();
  await expect(page.locator('.win')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Soft keys' })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(`SHOP ALL, ${meta.publicProductsTotal} items`) })).toBeVisible();
  // One clear primary + secondary CTA, both above the fold.
  for (const name of [/^Shop the drop/, /^Explore pjoys/]) {
    const cta = page.getByRole('button', { name });
    await expect(cta).toBeInViewport({ ratio: 1 });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('mobile shop → product → add via soft key → bag', async ({ page }) => {
  await page.goto('/collections/pjoys');
  const pj = index.collections.find((c: { h: string }) => c.h === 'pjoys');
  await expect(page.locator('.m-meta').first()).toContainText(`${fmt(pj.n)} products`);
  await page.locator('.m-row').first().click();
  await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › GALLERY');
  const center = page.locator('.m-soft__center');
  await expect(center).toBeDisabled();
  await page.locator('.chip:not(.is-out) label').first().click();
  const needsColor = await page.locator('.variants__group').count();
  if (needsColor > 1) await page.locator('.variants__group').nth(1).locator('.chip:not(.is-out) label').first().click();
  await expect(center).toHaveText('+ MY BAG');
  await center.click();
  await expect(page.getByRole('button', { name: /My Bag, 1 items/ })).toBeVisible();
  await page.getByRole('button', { name: /My Bag, 1 items/ }).click();
  await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › MY BAG');
  await expect(page.locator('.bag__row')).toHaveCount(1);
  await page.getByRole('button', { name: /BACK/ }).click();
  await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › GALLERY');
});

test('mobile search tolerates typos', async ({ page }) => {
  await page.goto('/search?q=ceral');
  await expect(page.locator('.m-row').first()).toContainText(/Cereal/);
});

test('mobile touch targets are at least 44px', async ({ page }) => {
  await page.goto('/');
  for (const el of await page.locator('.m-bar__key, .m-soft button, .m-cta .btn').all()) {
    const b = (await el.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
});

test('mobile primary CTA opens the newest drop', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Shop the drop/ }).click();
  await expect(page).toHaveURL(/\/collections\/newest$/);
  const nw = index.collections.find((c: { h: string }) => c.h === 'newest');
  await expect(page.locator('.m-meta').first()).toContainText(`${fmt(nw.n)} products`);
});
