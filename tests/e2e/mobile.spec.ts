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

test('MENU › RECYCLE BIN › Not Important › Really Not Important › DONT OPEN › Please › Amr Throwback; ◀ BACK walks back up', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'IYS MENU' }).click();
  await page.getByRole('button', { name: 'RECYCLE BIN' }).click();
  const title = page.locator('.m-title');
  const path = page.locator('.m-recycle__path');
  await expect(title).toHaveText('IYS MOBILE › RECYCLE BIN');
  await expect(page.locator('.m-h1')).toHaveText('RECYCLE BIN');
  await expect(path).toHaveText('C:\\IYS\\RECYCLE BIN\\');
  await expect(page.locator('.m-menu__static')).toContainText('BORING_OUTFITS');
  const names = ['Not Important', 'Really Not Important', 'DONT OPEN', 'Please'];
  let where = 'C:\\IYS\\RECYCLE BIN\\';
  for (const name of names) {
    const folder = page.getByRole('button', { name: new RegExp(`^${name}.*1 item$`) });
    expect((await folder.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await folder.click();
    where += `${name}\\`;
    await expect(title).toHaveText(`IYS MOBILE › RECYCLE BIN › ${name}`);
    await expect(page.locator('.m-h1')).toHaveText(name);
    await expect(path).toHaveText(where);
  }
  const tile = page.getByRole('button', { name: 'Open Amr_Throwback.jpg: Amr Throwback' });
  await expect.poll(() => tile.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await tile.click();
  await expect(title).toHaveText('IYS MOBILE › RECYCLE BIN › Amr_Throwback.jpg');
  const photo = page.locator('.m-viewer img');
  await expect(photo).toHaveAttribute('alt', /^Amr Throwback/);
  await expect.poll(() => photo.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(960);
  await expect(page.locator('.m-viewer__cap')).toHaveText('Amr_Throwback.jpg · Amr Throwback');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  const back = page.getByRole('button', { name: /BACK/ });
  for (const name of [...names].reverse()) {
    await back.click();
    await expect(title).toHaveText(`IYS MOBILE › RECYCLE BIN › ${name}`);
  }
  await back.click();
  await expect(title).toHaveText('IYS MOBILE › RECYCLE BIN');
  await back.click();
  await expect(title).toHaveText('IYS MOBILE');
  // opening it again starts at the top
  await page.getByRole('button', { name: 'IYS MENU' }).click();
  await page.getByRole('button', { name: 'RECYCLE BIN' }).click();
  await expect(path).toHaveText('C:\\IYS\\RECYCLE BIN\\');
});

test('mobile primary CTA opens the newest drop', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Shop the drop/ }).click();
  await expect(page).toHaveURL(/\/collections\/newest$/);
  const nw = index.collections.find((c: { h: string }) => c.h === 'newest');
  await expect(page.locator('.m-meta').first()).toContainText(`${fmt(nw.n)} products`);
});
