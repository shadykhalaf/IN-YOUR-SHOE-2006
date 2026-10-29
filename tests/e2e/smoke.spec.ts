import { desktop, expect, fmt, meta, test } from './fixtures';

test('1024×768: browser opens maximised and the shop is usable', async ({ page }) => {
  await desktop(page, '/shop');
  const b = page.getByRole('dialog', { name: /IYS INTERNET/ });
  await expect(b.getByRole('button', { name: /Restore/ })).toBeVisible();
  await expect(b.locator('.page__meta')).toContainText(fmt(meta.publicProductsTotal));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
