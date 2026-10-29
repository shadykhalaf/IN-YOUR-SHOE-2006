import { axe, desktop, expect, index, test } from './fixtures';

test.describe('axe (serious + critical)', () => {
  test('desktop + home portal', async ({ page }) => {
    await desktop(page);
    await expect(page.locator('.portal__official')).toBeVisible();
    await axe(page);
  });
  test('shop + filters', async ({ page }) => {
    await desktop(page, '/shop');
    await expect(page.locator('.pcard').first()).toBeVisible();
    await axe(page);
  });
  test('product', async ({ page }) => {
    await desktop(page, `/product/${index.products[0].h}`);
    await expect(page.locator('.props__title')).toBeVisible();
    await axe(page);
  });
  test('bag, messenger, control panel', async ({ page }) => {
    await desktop(page);
    await page.getByRole('button', { name: /Open My Bag/ }).first().click();
    await page.getByRole('button', { name: 'Open IYS Messenger' }).click();
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(page.getByRole('dialog', { name: 'CONTROL PANEL' })).toBeVisible();
    await axe(page);
  });
});
