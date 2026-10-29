import { readdirSync, readFileSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { desktop, expect, index, test } from './fixtures';

type Detail = { handle: string; description: string; careGuide?: string | null; available: boolean | null; options: unknown[]; variants: { available: boolean | null; price: number | null }[] };
const dir = new URL('../../public/catalogue/', import.meta.url);
const details: Detail[] = readdirSync(dir).flatMap((f) => Object.values(JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as Record<string, Detail>));
const inIndex = new Set(index.products.map((p: { h: string }) => p.h));
const sized = (d: Detail) => d.options.length === 1 && d.variants.length > 1 && d.variants.some((v) => v.available && v.price !== null);
/** Real products from the synced snapshot: one that publishes a care guide, one that publishes none (single variant). */
const withCare = details.find((d) => d.careGuide && d.description && sized(d) && inIndex.has(d.handle))!;
const noCare = details.find((d) => d.careGuide === null && d.description && d.options.length === 0 && d.variants[0]?.available && inIndex.has(d.handle))!;

const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const box = async (l: Locator) => (await l.boundingBox())!;
const firstSize = async (page: Page) => browserWin(page).locator('.chip:not(.is-out) label').first().click();

test.describe('product page: description, care guide, quantity (desktop)', () => {
  test('Description starts open, can be closed, and the next product starts open again', async ({ page }) => {
    await desktop(page, `/product/${withCare.handle}`);
    const desc = browserWin(page).locator('details.props__desc:not(.props__care)');
    await expect(desc).toHaveJSProperty('open', true);
    await expect(desc.locator('p')).toBeVisible();
    await desc.locator('summary').click();
    await expect(desc).toHaveJSProperty('open', false);
    await page.goto(`/product/${noCare.handle}`);
    await expect(browserWin(page).locator('.props__title')).toBeVisible();
    await expect(browserWin(page).locator('details.props__desc:not(.props__care)')).toHaveJSProperty('open', true);
  });

  test('Care Guide: the official text, directly below Description, closed; absent when none is published', async ({ page }) => {
    await desktop(page, `/product/${withCare.handle}`);
    const b = browserWin(page);
    const desc = b.locator('details.props__desc:not(.props__care)');
    const care = b.locator('details.props__care');
    await expect(care).toHaveCount(1);
    await expect(care).toHaveJSProperty('open', false);
    expect(await desc.evaluate((d) => d.nextElementSibling?.classList.contains('props__care'))).toBe(true);
    await care.locator('summary').click();
    await expect(care.locator('summary')).toHaveText('Care Guide');
    expect(await care.locator('p').evaluate((p) => p.textContent)).toBe(withCare.careGuide);
    await page.goto(`/product/${noCare.handle}`);
    await expect(b.locator('.props__title')).toBeVisible();
    await expect(b.locator('details.props__desc:not(.props__care)')).toBeVisible();
    await expect(b.locator('.props__care')).toHaveCount(0);
    await expect(b.getByText('Care Guide')).toHaveCount(0);
  });

  test('Quantity: starts at 1, never below 1, and ADD TO BAG adds exactly that many; the same variant increments', async ({ page }) => {
    await desktop(page, `/product/${withCare.handle}`);
    const b = browserWin(page);
    const qty = b.getByRole('group', { name: 'Qty:' });
    const minus = qty.getByRole('button', { name: 'Decrease quantity' });
    const plus = qty.getByRole('button', { name: 'Increase quantity' });
    await expect(qty.locator('output')).toHaveText('1');
    await expect(minus).toBeDisabled();
    await expect(b.getByRole('button', { name: /^Choose size/ })).toBeDisabled(); // size still required
    await plus.click();
    await plus.click();
    await plus.click();
    await expect(qty.locator('output')).toHaveText('4');
    await minus.click();
    await expect(qty.locator('output')).toHaveText('3');
    await firstSize(page);
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(page.getByRole('button', { name: /Open My Bag, 3 items/ }).first()).toBeVisible();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click(); // same variant again, qty 3
    await expect(page.getByRole('button', { name: /Open My Bag, 6 items/ }).first()).toBeVisible();
    const bag = JSON.parse((await page.evaluate(() => localStorage.getItem('iys2006.bag')))!).state.items;
    expect(bag).toHaveLength(1);
    expect(bag[0].quantity).toBe(6);
    // a product without sizes: quantity still works; the next product starts at 1
    await page.goto(`/product/${noCare.handle}`);
    await expect(b.getByRole('group', { name: 'Qty:' }).locator('output')).toHaveText('1');
    await b.getByRole('group', { name: 'Qty:' }).getByRole('button', { name: 'Increase quantity' }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(page.getByRole('button', { name: /Open My Bag, 8 items/ }).first()).toBeVisible();
  });

  test('layout: image, price and sizes stay put; only the compact Qty row sits above ADD TO BAG; Description/Care never move it', async ({ page }) => {
    await desktop(page, `/product/${withCare.handle}`);
    const b = browserWin(page);
    await expect(b.locator('.props__qty')).toBeVisible(); // full product loaded (not the instant shell)
    const img = await box(b.locator('.gallery__stage'));
    const price = await box(b.locator('.props__price'));
    const sizes = await box(b.locator('.variants'));
    const qty = await box(b.locator('.props__qty'));
    const add = b.locator('.props__add');
    const a0 = await box(add);
    expect(price.y).toBeLessThan(sizes.y);
    expect(qty.y - (sizes.y + sizes.height)).toBeLessThanOrEqual(12);
    expect(a0.y - (qty.y + qty.height)).toBeLessThanOrEqual(8); // Qty row (≤ 26 px) + 6 px gap, nothing else
    expect(qty.height).toBeLessThanOrEqual(26);
    expect(a0.y).toBeLessThan(img.y + img.height); // the purchase controls stay beside the image
    const desc = b.locator('details.props__desc:not(.props__care)');
    expect((await box(desc)).y).toBeGreaterThan(a0.y);
    await desc.locator('summary').click();
    await b.locator('.props__care summary').click();
    expect((await box(add)).y).toBe(a0.y);
  });
});
