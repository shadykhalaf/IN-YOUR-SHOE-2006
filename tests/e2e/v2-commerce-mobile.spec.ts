import { readdirSync, readFileSync } from 'node:fs';
import { expect, index, test } from './fixtures';

type Detail = { handle: string; description: string; careGuide?: string | null; options: unknown[]; variants: { available: boolean | null; price: number | null }[] };
const dir = new URL('../../public/catalogue/', import.meta.url);
const details: Detail[] = readdirSync(dir).flatMap((f) => Object.values(JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Record<string, Detail>));
const inIndex = new Set(index.products.map((p: { h: string }) => p.h));
const withCare = details.find((d) => d.careGuide && d.description && d.options.length === 1 && d.variants.length > 1 && d.variants.some((v) => v.available && v.price !== null) && inIndex.has(d.handle))!;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
});

test('mobile product: Description open, Care Guide below it, Qty drives ADD TO BAG, no sideways scroll', async ({ page }) => {
  await page.goto(`/product/${withCare.handle}`);
  const desc = page.locator('details.props__desc:not(.props__care)');
  await expect(desc).toHaveJSProperty('open', true);
  const care = page.locator('details.props__care');
  await expect(care).toHaveJSProperty('open', false);
  expect(await desc.evaluate((d) => d.nextElementSibling?.classList.contains('props__care'))).toBe(true);
  await care.locator('summary').click();
  expect(await care.locator('p').evaluate((p) => p.textContent)).toBe(withCare.careGuide);
  // quantity with real touch-size buttons
  const qty = page.getByRole('group', { name: 'Qty:' });
  const plus = qty.getByRole('button', { name: 'Increase quantity' });
  expect((await plus.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(qty.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled();
  await plus.click();
  await expect(qty.locator('output')).toHaveText('2');
  await expect(page.locator('.m-soft__center')).toBeDisabled(); // size still required
  await page.locator('.chip:not(.is-out) label').first().click();
  await page.locator('.m-soft__center').click();
  await expect(page.getByRole('button', { name: /My Bag, 2 items/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
