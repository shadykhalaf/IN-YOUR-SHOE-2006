import { desktop, expect, fmt, index, test } from './fixtures';
import type { Page } from '@playwright/test';

const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const minimizeBrowser = (page: Page) => browserWin(page).locator('.tbtn').first().click();
const cp = (page: Page) => page.getByRole('dialog', { name: 'CONTROL PANEL' });
const wallpaper = (page: Page) =>
  page.locator('.wallpaper').evaluate((e) => ({ cls: e.className, bg: getComputedStyle(e).backgroundImage }));

test.describe('IYS Retro V2 desktop upgrades', () => {
  test('P1: homepage strip photos keep their proportions inside consistent frames', async ({ page }) => {
    await desktop(page, '/');
    await expect(browserWin(page).locator('.strip__media').first()).toBeVisible();
    const frames = await browserWin(page).locator('.strip__media').evaluateAll((els) =>
      els.map((el) => {
        const f = el.getBoundingClientRect();
        const img = el.querySelector('img, .img-offline')!.getBoundingClientRect();
        return { w: f.width, h: f.height, ih: img.height, iw: img.width };
      }),
    );
    expect(frames.length).toBeGreaterThanOrEqual(12);
    for (const f of frames) {
      expect(Math.abs(f.h / f.w - 1.25)).toBeLessThan(0.03); // 4:5 frame
      expect(f.ih).toBeLessThanOrEqual(f.h + 1); // no 1000px slivers
      expect(f.iw).toBeLessThanOrEqual(f.w + 1);
    }
    const fit = await browserWin(page).locator('.strip__media img').first().evaluate((i) => getComputedStyle(i).objectFit).catch(() => 'contain');
    expect(fit).toBe('contain');
    const page0 = browserWin(page).locator('.browser-page');
    expect(await page0.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  });

  test('P2: every wallpaper preset applies; Blue shows no image', async ({ page }) => {
    await desktop(page, '/');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    const list = cp(page).locator('.cp-list label');
    await expect(list.first()).toBeVisible();
    const n = await list.count();
    expect(n).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < n; i++) {
      const label = (await list.nth(i).textContent()) ?? '';
      await list.nth(i).locator('input').check();
      await cp(page).getByRole('button', { name: 'Apply' }).click();
      const wp = await wallpaper(page);
      if (label.includes('IYS Blue')) expect(wp.bg).toBe('none');
      else expect(wp.bg, label).toMatch(/url\("[^"]+\/iys\/(campaign|os|tiles)\//);
      if (label.includes('(pattern)')) expect(wp.cls).toContain('wallpaper--tile');
      if (label.startsWith('IYS FW27') && !label.includes('Stack')) expect(wp.cls).toContain('wallpaper--preset-fw27');
    }
  });

  test('P2: stale saved preset falls back safely; choice persists; Reset restores default', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('stale-done')) {
        localStorage.setItem('iys2006.preferences', JSON.stringify({ state: { sound: false, crt: true, wallpaper: { kind: 'preset', id: 'gone-forever' }, wallpaperMode: 'stretch' }, version: 1 }));
        sessionStorage.setItem('stale-done', '1');
      }
    });
    await desktop(page, '/');
    // invalid saved id → falls back to the default, IYS Hills
    expect((await wallpaper(page)).bg).toContain('/iys/os/hills.svg');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(cp(page).locator('.cp-list label:has(input:checked)')).toContainText('IYS Hills - Y2K sky (Default)');
    await cp(page).getByRole('button', { name: 'Apply' }).click(); // Apply on a fallback must not throw
    await cp(page).locator('.cp-list label', { hasText: 'IYS × ZED' }).locator('input').check();
    await cp(page).getByRole('button', { name: 'Apply' }).click();
    expect((await wallpaper(page)).bg).toContain('/iys/campaign/zed-1');
    await page.reload();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    expect((await wallpaper(page)).bg).toContain('/iys/campaign/zed-1');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(cp(page).locator('.cp-list label:has(input:checked)')).toContainText('IYS × ZED');
    await cp(page).getByRole('button', { name: /Reset desktop/ }).click();
    await page.getByRole('alertdialog', { name: 'RESET DESKTOP' }).getByRole('button', { name: 'Reset' }).click();
    expect((await wallpaper(page)).bg).toContain('/iys/os/hills.svg');
    await expect(cp(page).locator('.cp-list label:has(input:checked)')).toContainText('IYS Hills - Y2K sky (Default)');
  });

  test('Purbale Catchy: preview, apply (Stretch), persist, sync, switch away, Reset keeps Hills default', async ({ page }) => {
    const res = await page.request.get('/iys/os/purbale-catchy.webp');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/webp');
    await desktop(page, '/');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    const item = cp(page).locator('.cp-list label', { hasText: /^Purbale Catchy$/ });
    await expect(item).toHaveCount(1);
    await item.locator('input').check();
    const screen = cp(page).locator('.monitor__screen');
    await expect(screen).toHaveClass(/monitor__screen--stretch/);
    expect(await screen.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('/iys/os/purbale-catchy.webp');
    expect((await wallpaper(page)).bg).toContain('/iys/os/hills.svg'); // preview only until Apply
    await cp(page).getByRole('button', { name: 'Apply' }).click();
    let wp = await wallpaper(page);
    expect(wp.bg).toContain('/iys/os/purbale-catchy.webp');
    expect(wp.cls).toContain('wallpaper--stretch');
    expect(await page.locator('.wallpaper').evaluate((e) => [getComputedStyle(e).backgroundSize, getComputedStyle(e).backgroundPosition, getComputedStyle(e).backgroundRepeat])).toEqual(['cover', '50% 50%', 'no-repeat']);
    // close / reopen Control Panel stays in sync
    await cp(page).getByRole('button', { name: /^Close/ }).first().click();
    await expect(cp(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(cp(page).locator('.cp-list label:has(input:checked)')).toHaveText('Purbale Catchy');
    // persists after reload
    await page.reload();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    wp = await wallpaper(page);
    expect(wp.bg).toContain('/iys/os/purbale-catchy.webp');
    expect(wp.cls).toContain('wallpaper--stretch');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(cp(page).locator('.cp-list label:has(input:checked)')).toHaveText('Purbale Catchy');
    // switching away still works
    await cp(page).locator('.cp-list label', { hasText: 'IYS × ZED' }).locator('input').check();
    await cp(page).getByRole('button', { name: 'Apply' }).click();
    expect((await wallpaper(page)).bg).toContain('/iys/campaign/zed-1');
    await item.locator('input').check();
    await cp(page).getByRole('button', { name: 'Apply' }).click();
    expect((await wallpaper(page)).bg).toContain('/iys/os/purbale-catchy.webp');
    // Reset Desktop returns to IYS Hills, not Purbale Catchy
    await cp(page).getByRole('button', { name: /Reset desktop/ }).click();
    await page.getByRole('alertdialog', { name: 'RESET DESKTOP' }).getByRole('button', { name: 'Reset' }).click();
    expect((await wallpaper(page)).bg).toContain('/iys/os/hills.svg');
    await expect(cp(page).locator('.cp-list label:has(input:checked)')).toContainText('IYS Hills - Y2K sky (Default)');
  });

  test('P2: product photo → Set as Wallpaper, with Stretch / Center / Tile', async ({ page }) => {
    const p = index.products.find((x: { a?: number; o?: string[] }) => x.a === 1 && !x.o);
    await desktop(page, `/product/${p.h}`);
    await browserWin(page).getByRole('button', { name: /Set as wallpaper/ }).click();
    expect((await wallpaper(page)).bg).toMatch(/url\("https:\/\//);
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(cp(page).locator('.cp-list label:has(input:checked)')).toContainText(`Current: ${p.t}`);
    for (const m of ['center', 'tile', 'stretch'] as const) {
      await cp(page).locator('select').selectOption(m);
      await expect(cp(page).locator(`.monitor__screen--${m}`)).toBeVisible();
      await cp(page).getByRole('button', { name: 'Apply' }).click();
      expect((await wallpaper(page)).cls).toContain(`wallpaper--${m}`);
    }
  });

  test('P3: IYS MAIL sends a real support request; success only after the server says so', async ({ page }) => {
    const posted: unknown[] = [];
    let mode: 'fail' | 'ok' = 'fail';
    await page.route('**/api/support-email', async (route) => {
      posted.push(route.request().postDataJSON());
      await new Promise((r) => setTimeout(r, 300));
      if (mode === 'fail') await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Mail server did not accept the message.' }) });
      else await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await desktop(page, '/');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open IYS Mail' }).click();
    const mail = page.getByRole('dialog', { name: 'IYS MAIL' });
    await expect(mail).toBeVisible();
    await expect(mail.getByLabel('To', { exact: true })).toHaveValue('orders@inyourshoe.com');
    await mail.getByLabel('From:').fill('mona@example.com');
    await mail.getByLabel('Name:').fill('Mona');
    await mail.getByLabel('Order #:').fill('1234');
    await mail.getByLabel('Topic:').selectOption('Delivery');
    await mail.getByLabel('Subject:').fill('Where is my order?');
    await mail.getByLabel('Message').fill('It has not arrived yet.');
    await mail.getByRole('button', { name: 'SEND MAIL :)' }).click();
    await expect(mail.getByRole('button', { name: 'Sending mail...' })).toBeDisabled();
    await expect(mail.getByRole('alert')).toContainText('MAIL NOT SENT :(');
    await expect(mail.getByLabel('Message')).toHaveValue('It has not arrived yet.');
    await expect(mail).not.toContainText('MAIL SENT :) xo');
    mode = 'ok';
    await mail.getByRole('button', { name: 'TRY AGAIN :(' }).click();
    await expect(mail).toContainText('MAIL SENT :) xo');
    // 1 send + 2 bounded automatic retries (same draft, same idempotency key), then the shopper's TRY AGAIN
    expect(posted).toHaveLength(4);
    for (const body of posted) expect(body).toMatchObject({ email: 'mona@example.com', name: 'Mona', order: '1234', topic: 'Delivery', subject: 'Where is my order?', message: 'It has not arrived yet.', website: '' });
  });

  test('P3B: IYS NEWSLETTER is its own app and never fakes a signup', async ({ page }) => {
    await desktop(page, '/');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open IYS Newsletter' }).click();
    const nl = page.getByRole('dialog', { name: 'IYS NEWSLETTER' });
    await expect(nl).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'IYS MAIL' })).toHaveCount(0);
    await expect(nl).toContainText('JOIN THE COOL LIST :)');
    await expect(nl).toContainText('COMING ONLINE SOON');
    // the email field is always editable, even with no provider connected
    const field = nl.getByLabel('Email:');
    await expect(field).toBeEnabled();
    await field.click();
    await page.keyboard.type('test@example.com');
    await expect(field).toHaveValue('test@example.com');
    await page.keyboard.press('Backspace');
    await expect(field).toHaveValue('test@example.co');
    await page.keyboard.type('m');
    await nl.getByRole('button', { name: 'JOIN XO' }).click();
    await expect(nl.getByRole('alert')).toContainText('COOL LIST CONNECTION IS STILL COMING ONLINE :)');
    await expect(nl.getByRole('alert')).toContainText('ur email wasn’t sent yet');
    await expect(field).toHaveValue('test@example.com');
    await expect(nl).not.toContainText('IYS10');
    await expect(nl.getByTestId('newsletter-success')).toHaveCount(0);
  });

  test('P4: IYS INTERNET menus open, act and follow the keyboard', async ({ page }) => {
    await desktop(page, '/');
    const bar = browserWin(page).getByRole('menubar');
    const expected: Record<string, string[]> = {
      File: ['Open Home', 'Open Real IYS Website', 'Close IYS Internet'],
      Edit: ['Find / Search IYS...', 'Copy Current Address'],
      View: ['Refresh', 'Home', 'Back', 'Forward'],
      Favorites: ['Open Favorites'],
      Tools: ['My Bag', 'Control Panel', 'Stores'],
      Help: ['IYS Help & Support', 'Essentials', 'About IYS Internet'],
    };
    for (const [menu, items] of Object.entries(expected)) {
      await bar.getByRole('menuitem', { name: menu, exact: true }).click();
      await expect(page.getByRole('menu', { name: menu }).getByRole('menuitem')).toHaveText(items);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toHaveCount(0);
    }
    // outside click closes an open menu
    await bar.getByRole('menuitem', { name: 'Tools', exact: true }).click();
    await expect(page.getByRole('menu', { name: 'Tools' })).toBeVisible();
    // outside click closes
    await page.locator('.desktop__stamp').click({ force: true });
    await expect(page.getByRole('menu')).toHaveCount(0);
    // keyboard: File ↓ opens, → moves to Edit, Esc closes back to the bar
    await bar.getByRole('menuitem', { name: 'File', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menu', { name: 'File' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Open Home' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Open Real IYS Website' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('menu', { name: 'Edit' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(browserWin(page)).toBeVisible(); // Escape closed the menu, not the window
    // Edit › Find
    await bar.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Find / Search IYS...' }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(browserWin(page).locator('#iys-search')).toBeFocused();
    // Favorites › add current product
    const p = index.products.find((x: { a?: number }) => x.a === 1);
    await page.goto(`/product/${p.h}`);
    await bar.getByRole('menuitem', { name: 'Favorites', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Add Current Item to Favorites' }).click();
    await expect(page.getByRole('button', { name: /Open Favorites, 1 saved/ })).toBeVisible();
    // Tools › Control Panel, Help › IYS Help & Support
    await bar.getByRole('menuitem', { name: 'Tools', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Control Panel' }).click();
    await expect(cp(page)).toBeVisible();
    await bar.getByRole('menuitem', { name: 'Help', exact: true }).click();
    await page.getByRole('menuitem', { name: 'IYS Help & Support' }).click();
    const help = page.getByRole('dialog', { name: 'IYS HELP & SUPPORT' });
    await expect(help).toContainText('IYS HELP CENTER :)');
    await expect(help.getByTestId('odoo-placeholder')).toContainText('ODOO FORM PLACEHOLDER');
    await expect(help.locator('iframe')).toHaveCount(0);
    // File › Close
    await bar.getByRole('menuitem', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Close IYS Internet' }).click();
    await expect(browserWin(page)).toHaveCount(0);
  });

  test('P5: XCHANGE.EXE opens the Exchanges / Refunds placeholder', async ({ page }) => {
    await desktop(page, '/');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: /Open XCHANGE\.EXE/ }).click();
    const x = page.getByRole('dialog', { name: 'XCHANGE.EXE :) - EXCHANGES / REFUNDS FORM' });
    await expect(x).toContainText('EXCHANGES / REFUNDS FORM');
    await expect(x.getByTestId('odoo-placeholder')).toContainText('form connection coming online soon :)');
    await expect(x.locator('form, iframe')).toHaveCount(0);
  });

  test('P6: desktop icons drag, stay put after reload, still open on click, and reset', async ({ page }) => {
    await desktop(page, '/');
    await minimizeBrowser(page);
    const icon = page.getByRole('button', { name: 'Open IYS Camera photos' });
    const a = (await icon.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 120, a.y + a.height / 2 + 30, { steps: 8 });
    await page.mouse.up();
    const b = (await icon.boundingBox())!;
    expect(Math.round(b.x - a.x)).toBe(120);
    expect(Math.round(b.y - a.y)).toBe(30);
    await expect(page.getByRole('dialog', { name: 'IYS CAMERA' })).toHaveCount(0); // drag ≠ click
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('iys2000sv2.desktopIcons') ?? '{}'));
    expect(stored.state.offsets.camera).toEqual({ dx: 120, dy: 30 });
    // can't be dragged off the desktop
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(-500, 5000, { steps: 6 });
    await page.mouse.up();
    const c = (await icon.boundingBox())!;
    const desk = (await page.locator('.desktop').boundingBox())!;
    expect(c.x).toBeGreaterThanOrEqual(desk.x - 1);
    expect(c.y + c.height).toBeLessThanOrEqual(desk.y + desk.height + 1);
    // persists
    await page.reload();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    const d = (await icon.boundingBox())!;
    expect(Math.round(d.x)).toBe(Math.round(c.x));
    expect(Math.round(d.y)).toBe(Math.round(c.y));
    // click still opens
    await minimizeBrowser(page);
    await icon.click();
    await expect(page.getByRole('dialog', { name: 'IYS CAMERA' })).toBeVisible();
    // reset restores the default slot
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await cp(page).getByRole('button', { name: /Reset desktop/ }).click();
    await page.getByRole('alertdialog', { name: 'RESET DESKTOP' }).getByRole('button', { name: 'Reset' }).click();
    await expect.poll(async () => Math.round((await icon.boundingBox())!.x)).toBe(Math.round(a.x));
    expect(Math.round((await icon.boundingBox())!.y)).toBe(Math.round(a.y));
  });

  test('P8: IYS KIDS opens the real Kids collection', async ({ page }) => {
    await desktop(page, '/');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open IYS Kids collection' }).click();
    await expect(page).toHaveURL(/\/collections\/all-kids-products$/);
    const kids = index.collections.find((c: { h: string }) => c.h === 'all-kids-products');
    await expect(browserWin(page)).toContainText(`${fmt(kids.n)}`);
    await expect(browserWin(page).locator('.pcard').first()).toBeVisible();
  });
});
