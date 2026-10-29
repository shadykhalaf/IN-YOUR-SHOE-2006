import { desktop, expect, index, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';

const OFFICIAL: Record<string, string> = {
  exchange: 'https://inyourshoe.com/pages/exchange-refund-policy',
  shipping: 'https://inyourshoe.com/pages/shipping-policy',
  tc: 'https://inyourshoe.com/pages/terms-conditions',
  tos: 'https://inyourshoe.com/policies/terms-of-service',
  privacy: 'https://inyourshoe.com/pages/privacy-policy',
};
const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const minimizeBrowser = (page: Page) => browserWin(page).locator('.tbtn').first().click();
/** Every official link must be a real new-tab link to inyourshoe.com. */
async function expectOfficial(scope: Locator, name: RegExp, url: string) {
  const a = scope.getByRole('link', { name }).first();
  await expect(a).toHaveAttribute('href', url);
  await expect(a).toHaveAttribute('target', '_blank');
}
const multi = index.products.find((p: { sz?: [string, number][]; a?: number; o?: string[] }) => p.sz && p.sz.length > 1 && p.a === 1 && !p.o);

test.describe('IYS ESSENTIALS everywhere (desktop)', () => {
  test('IYS INTERNET › Help › Essentials and the Start menu open the Essentials window', async ({ page }) => {
    await desktop(page, '/');
    await browserWin(page).getByRole('menubar').getByRole('menuitem', { name: 'Help', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Essentials' }).click();
    const w = page.getByRole('dialog', { name: 'IYS ESSENTIALS' });
    await expect(w).toBeVisible();
    await expectOfficial(w, /^EXCHANGE & REFUND/, OFFICIAL.exchange);
    await expectOfficial(w, /^SHIPPING POLICY/, OFFICIAL.shipping);
    await expectOfficial(w, /^TERMS & CONDITIONS/, OFFICIAL.tc);
    await expectOfficial(w, /^TERMS OF SERVICE/, OFFICIAL.tos);
    await expectOfficial(w, /^PRIVACY POLICY/, OFFICIAL.privacy);
    await expectOfficial(w, /^FAQS/, 'https://inyourshoe.com/pages/faqs');
    await expectOfficial(w, /^TRACK YOUR ORDER/, 'https://inyourshoe.com/pages/track-your-order');
    await expectOfficial(w, /^CONTACT US/, 'https://inyourshoe.com/pages/contact-us');
    await w.getByRole('button', { name: /^Close/ }).click();
    await page.getByRole('button', { name: 'MENU', exact: true }).click() // top-left MENU (the taskbar corner is DESKTOP);
    await page.getByRole('menu', { name: 'IYS menu' }).getByRole('menuitem', { name: /IYS ESSENTIALS/ }).click();
    await expect(page.getByRole('dialog', { name: 'IYS ESSENTIALS' })).toBeVisible();
  });

  test('homepage footer, product page, bag, XCHANGE and Help all expose the essentials', async ({ page }) => {
    await desktop(page, '/');
    const foot = browserWin(page).locator('.portal__foot');
    await expectOfficial(foot, /^Exchange & Refund/, OFFICIAL.exchange);
    await expectOfficial(foot, /^Shipping/, OFFICIAL.shipping);
    await expectOfficial(foot, /^Terms & Conditions/, OFFICIAL.tc);
    await expectOfficial(foot, /^Terms of Service/, OFFICIAL.tos);
    await expectOfficial(foot, /^Privacy/, OFFICIAL.privacy);
    // product
    await page.goto(`/product/${multi.h}`);
    const props = browserWin(page).locator('.props');
    await expectOfficial(props, /^Shipping/, OFFICIAL.shipping);
    await expectOfficial(props, /^Exchange & Refund/, OFFICIAL.exchange);
    await props.getByRole('button', { name: 'All essentials' }).click();
    await expect(page.getByRole('dialog', { name: 'IYS ESSENTIALS' })).toBeVisible();
    await page.getByRole('dialog', { name: 'IYS ESSENTIALS' }).getByRole('button', { name: /^Close/ }).click();
    // bag (with an item)
    const size = multi.sz.find((s: [string, number]) => s[1] === 1)[0];
    await browserWin(page).locator('.chip label', { hasText: new RegExp(`^${size}$`) }).click();
    await browserWin(page).getByRole('button', { name: 'ADD TO BAG' }).click();
    await page.getByRole('button', { name: /Open My Bag, 1 items/ }).first().click();
    const bag = page.getByRole('dialog', { name: 'MY BAG' });
    await expectOfficial(bag, /^Exchange & Refund/, OFFICIAL.exchange);
    await expectOfficial(bag, /^Shipping/, OFFICIAL.shipping);
    await expectOfficial(bag, /^Terms & Conditions/, OFFICIAL.tc);
    await bag.getByRole('button', { name: /^Close/ }).click();
    // XCHANGE: form first, then policy, then IYS MAIL
    await minimizeBrowser(page);
    await page.getByRole('button', { name: /Open XCHANGE\.EXE/ }).click();
    const x = page.getByRole('dialog', { name: /XCHANGE\.EXE/ });
    await expect(x.getByTestId('odoo-placeholder')).toBeVisible();
    await expectOfficial(x, /READ EXCHANGE & REFUND POLICY/, OFFICIAL.exchange);
    await x.getByRole('button', { name: 'CONTACT IYS MAIL' }).click();
    await expect(page.getByRole('dialog', { name: 'IYS MAIL' })).toBeVisible();
  });

  test('Help window offers VIEW ESSENTIALS without becoming the policy page', async ({ page }) => {
    await desktop(page, '/');
    await browserWin(page).getByRole('menubar').getByRole('menuitem', { name: 'Help', exact: true }).click();
    await page.getByRole('menuitem', { name: 'IYS Help & Support' }).click();
    const help = page.getByRole('dialog', { name: 'IYS HELP & SUPPORT' });
    await expect(help.getByTestId('odoo-placeholder')).toBeVisible();
    await help.getByRole('button', { name: 'VIEW ESSENTIALS' }).click();
    await expect(page.getByRole('dialog', { name: 'IYS ESSENTIALS' })).toBeVisible();
  });
});

test.describe('conversion CTAs go where they say (desktop)', () => {
  test('homepage section CTAs', async ({ page }) => {
    await desktop(page, '/');
    const b = browserWin(page);
    const go = async (name: RegExp, url: RegExp, link = true) => {
      await (link ? b.getByRole('link', { name }) : b.getByRole('button', { name })).first().click();
      await expect(page).toHaveURL(url);
      await page.goto('/');
      await expect(b.locator('.top8')).toBeVisible();
    };
    await go(/^Shop the drop/, /\/collections\/newest$/, false);
    await go(/^Explore pjoys xo$/, /\/collections\/pjoys$/, false);
    await go(/see more cool decisions :\) shop all/, /\/shop$/);
    await go(/omg see all .* new drops/, /\/collections\/newest$/);
    await go(/^Explore pjoys xo ›$/, /\/collections\/pjoys$/);
    await go(/^Shop Cairo \(/, /\/collections\/cairo$/);
    await go(/^Open collection \(/, /\/collections\/inyourshoexzed$/);
  });

  test('product: pick size → ADD TO BAG → VIEW BAG / KEEP SHOPPING XO', async ({ page }) => {
    await desktop(page, `/product/${multi.h}`);
    const b = browserWin(page);
    await expect(b.getByRole('button', { name: /Choose size/ })).toBeDisabled();
    const size = multi.sz.find((s: [string, number]) => s[1] === 1)[0];
    await b.locator('.chip label', { hasText: new RegExp(`^${size}$`) }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(b.getByRole('status').filter({ hasText: 'ADDED 2 BAG :)' })).toBeVisible();
    await b.getByRole('button', { name: 'VIEW BAG' }).click();
    const bag = page.getByRole('dialog', { name: 'MY BAG' });
    await expect(bag.locator('.bag__row')).toHaveCount(1);
    await page.route('https://inyourshoe.com/cart/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>IYS checkout (test stub)</title>' }));
    await bag.getByRole('button', { name: /CHECKOUT xx/ }).click();
    await expect(page).toHaveURL(`https://inyourshoe.com/cart/${multi.sz.find((s: [string, number, number]) => s[0] === size)[2]}:1`);
    await page.goBack();
    await page.getByRole('button', { name: /Open My Bag, 1 items/ }).first().click();
    await bag.getByRole('button', { name: 'KEEP SHOPPING XO' }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await page.goto(`/product/${multi.h}`);
    await b.locator('.chip label', { hasText: new RegExp(`^${size}$`) }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await b.getByRole('button', { name: 'KEEP SHOPPING XO' }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });

  test('dead ends lead somewhere: empty bag, empty favorites, empty search, 404', async ({ page }) => {
    await desktop(page, '/');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: /Open My Bag, 0 items/ }).click();
    const bag = page.getByRole('dialog', { name: 'MY BAG' });
    // the two CTAs read as one pair centered under the empty message
    await expect(bag.locator('.bag__empty')).toBeVisible();
    const msg = (await bag.locator('.bag__empty').boundingBox())!;
    const a = (await bag.getByRole('button', { name: /^Shop the drop/ }).boundingBox())!;
    const z = (await bag.getByRole('button', { name: /^Explore pjoys xo/ }).boundingBox())!;
    expect(Math.abs((a.x + z.x + z.width) / 2 - (msg.x + msg.width / 2))).toBeLessThanOrEqual(2);
    await bag.getByRole('button', { name: /^Shop the drop/ }).click();
    await expect(page).toHaveURL(/\/collections\/newest$/);
    await page.goto('/favorites');
    await browserWin(page).getByRole('link', { name: 'SHOP NEW STUFF' }).click();
    await expect(page).toHaveURL(/\/collections\/newest$/);
    await page.goto('/search?q=zzzxqq');
    await browserWin(page).getByRole('link', { name: 'SHOP ALL', exact: true }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await page.goto('/no-such-page');
    await browserWin(page).getByRole('button', { name: 'BACK 2 SHOP' }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });
});
