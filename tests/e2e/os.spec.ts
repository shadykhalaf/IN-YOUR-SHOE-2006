import { curation, desktop, expect, stores, test } from './fixtures';

test.describe('IYS OS', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('boots, can be skipped, and asks the cool-decision question', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('IYS PERSONAL COMPUTER')).toBeVisible();
    await page.getByRole('button', { name: /SKIP/ }).click();
    const dialog = page.getByRole('alertdialog', { name: 'IYS.EXE' });
    await expect(dialog).toContainText('You’re about to make a Cool Decision!');
    await dialog.getByRole('button', { name: 'Obviously' }).click();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    await expect(page.getByLabel('Address', { exact: true })).toHaveValue('http://www.inyourshoe.com/');
    // boot plays once per session
    await page.reload();
    await expect(page.getByText('IYS PERSONAL COMPUTER')).toHaveCount(0);
  });

  test('boot sequence finishes on its own in about 2 s', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('IYS PERSONAL COMPUTER')).toBeAttached();
    const t0 = Date.now();
    await expect(page.getByRole('alertdialog', { name: 'IYS.EXE' })).toBeVisible({ timeout: 6000 });
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});

test.describe('window manager', () => {
  test('open, focus, minimize, restore, maximize, close', async ({ page }) => {
    await desktop(page);
    await page.getByRole('button', { name: 'Open IYS Camera photos' }).click();
    const cam = page.getByRole('dialog', { name: 'IYS CAMERA' });
    await expect(cam).toBeVisible();
    const task = page.getByRole('navigation', { name: 'Taskbar' }).getByRole('button', { name: 'IYS CAMERA' });
    await expect(task).toHaveAttribute('aria-pressed', 'true');

    await cam.getByRole('button', { name: 'Minimize IYS CAMERA' }).click();
    await expect(cam).toBeHidden();
    await expect(task).toHaveAttribute('aria-pressed', 'false');
    await task.click();
    await expect(cam).toBeVisible();

    await cam.getByRole('button', { name: 'Maximize IYS CAMERA' }).click();
    await expect(cam.getByRole('button', { name: 'Restore IYS CAMERA' })).toBeVisible();
    const box = await cam.boundingBox();
    expect(box!.width).toBeGreaterThan(1400);
    await cam.getByRole('button', { name: 'Restore IYS CAMERA' }).click();

    // focus/z-order: clicking the browser brings it forward
    const browser = page.getByRole('dialog', { name: /IYS INTERNET/ });
    await page.getByRole('navigation', { name: 'Taskbar' }).getByRole('button', { name: /IYS INTERNET/ }).click();
    await expect(page.getByRole('navigation', { name: 'Taskbar' }).getByRole('button', { name: /IYS INTERNET/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(browser).toBeVisible();

    // Escape closes the focused window
    await task.click();
    await cam.focus();
    await page.keyboard.press('Escape');
    await expect(cam).toHaveCount(0);
  });

  test('apps reuse one window instead of spawning duplicates', async ({ page }) => {
    await desktop(page);
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(page.getByRole('dialog', { name: 'CONTROL PANEL' })).toHaveCount(1);
  });

  test('windows can be dragged but stay on screen', async ({ page }) => {
    await desktop(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    const win = page.getByRole('dialog', { name: 'CONTROL PANEL' });
    await expect(win.getByRole('tab', { name: 'Wallpaper' })).toBeVisible();
    const bar = win.locator('.titlebar');
    const b = (await bar.boundingBox())!;
    await page.mouse.move(b.x + 60, b.y + 10);
    await page.mouse.down();
    await page.mouse.move(3000, 3000, { steps: 6 });
    await page.mouse.up();
    const after = (await win.boundingBox())!;
    expect(after.x + after.width).toBeLessThanOrEqual(1440);
    expect(after.y + after.height).toBeLessThanOrEqual(900 - 34 + 1);
  });

  test('IYS menu lists real departments with counts', async ({ page }) => {
    await desktop(page);
    await page.getByRole('button', { name: 'MENU', exact: true }).click() // top-left MENU (the taskbar corner is DESKTOP);
    const menu = page.getByRole('menu', { name: 'IYS menu' });
    await expect(menu.getByRole('menuitem', { name: /PJOYS/ }).first()).toBeVisible();
    await menu.getByRole('menuitem', { name: /^CAIRO/ }).click();
    await expect(page).toHaveURL(/\/collections\/cairo$/);
  });

  test('taskbar clock is the real device clock, with the time-machine target', async ({ page }) => {
    await desktop(page);
    const clock = page.locator('.tray .clock');
    await expect(clock).toHaveAttribute('aria-label', /Time machine target: 2006/);
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    await expect(clock).toHaveText(new RegExp(now.split(':')[0]!));
  });
});

test.describe('apps', () => {
  test('messenger: PJOYS sends real Pjoys as attachments', async ({ page }) => {
    await desktop(page);
    await page.getByRole('button', { name: 'Open IYS Messenger' }).click();
    await page.getByRole('button', { name: /Chat with PJOYS/ }).click();
    const chat = page.getByRole('dialog', { name: 'PJOYS - Conversation' });
    const log = chat.getByRole('log');
    await expect(log).toContainText('u awake?');
    await expect(log).toContainText('enta sa7y?');
    const idx = JSON.parse(JSON.stringify(curation.pjoysMessenger)) as string[];
    await expect(log.getByRole('button', { name: /^Open .*Pjoys/ }).first()).toBeVisible();
    await expect(log.getByText('Transfer complete.').first()).toBeVisible();
    expect(idx.length).toBeGreaterThan(3);
    await log.getByRole('button', { name: /Set .* pattern as wallpaper/ }).first().click();
    await expect(page.getByRole('status').filter({ hasText: 'WALLPAPER UPDATED xo' })).toBeVisible();
  });

  test('touch grass: TOUCH_GRASS.EXE opens the real product (no error dialog)', async ({ page }) => {
    await desktop(page);
    await page.locator('[data-window="internet"] .tbtn').first().click();
    await page.getByRole('button', { name: /TOUCH_GRASS\.EXE/ }).click();
    await expect(page).toHaveURL(new RegExp(`/product/${curation.jokes.touchGrass}$`));
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ }).getByRole('heading', { level: 1 })).toContainText('Touch Grass');
  });

  test('camera: DCIM folders open the image viewer; set as wallpaper persists', async ({ page }) => {
    await desktop(page);
    await page.getByRole('button', { name: 'Open IYS Camera photos' }).click();
    const cam = page.getByRole('dialog', { name: 'IYS CAMERA' });
    await cam.getByRole('button', { name: /STORES/ }).click();
    await expect(cam.locator('.contact li')).toHaveCount(stores.stores.filter((s: { photoSourceUrl: string | null }) => s.photoSourceUrl).length);
    await cam.locator('.contact__frame').first().click();
    const viewer = page.getByRole('dialog', { name: /image viewer/i });
    await expect(viewer).toBeVisible();
    await viewer.getByRole('button', { name: 'Next image' }).click();
    await viewer.getByRole('button', { name: /Set as wallpaper/ }).click();
    await expect(page.getByRole('status').filter({ hasText: 'WALLPAPER UPDATED xo' })).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.preferences')!).state.wallpaper);
    expect(saved.kind).toBe('image');
    await page.reload();
    await expect(page.locator('.wallpaper')).toHaveAttribute('style', /\/iys\/stores\//);
  });

  test('wardrobe folders show counts from the data', async ({ page }) => {
    await desktop(page);
    await page.getByRole('button', { name: /Open My Wardrobe/ }).click();
    const w = page.getByRole('dialog', { name: 'MY WARDROBE' });
    const idx = await import('./fixtures').then((m) => m.index);
    const pjoys = idx.collections.find((c: { h: string }) => c.h === 'pjoys').n;
    await w.getByRole('button', { name: /^HOMEWEAR/ }).first().click();
    await expect(w.getByRole('button', { name: new RegExp(`PJOYS.*${pjoys} items`) }).first()).toBeVisible();
  });

  test('control panel: tabs work by keyboard; snapshot facts are generated', async ({ page }) => {
    await desktop(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    const cp = page.getByRole('dialog', { name: 'CONTROL PANEL' });
    await cp.getByRole('tab', { name: 'Wallpaper' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(cp.getByRole('tab', { name: 'Sound' })).toHaveAttribute('aria-selected', 'true');
    await cp.getByRole('tab', { name: 'System' }).click();
    const m = await import('./fixtures').then((x) => x.meta);
    await expect(cp).toContainText(new Intl.NumberFormat('en-US').format(m.publicProductsTotal));
    await expect(cp).toContainText(new Intl.NumberFormat('en-US').format(m.allProductsCollectionCount));
    await cp.getByRole('tab', { name: 'Screen' }).click();
    await cp.getByLabel(/CRT FILTER/).uncheck();
    await expect(page.locator('.crt')).toHaveCount(0);
  });

  test('sound is off by default and never autoplays', async ({ page }) => {
    await desktop(page);
    await expect(page.getByRole('button', { name: 'Turn sound on' })).toHaveAttribute('aria-pressed', 'false');
  });
});
