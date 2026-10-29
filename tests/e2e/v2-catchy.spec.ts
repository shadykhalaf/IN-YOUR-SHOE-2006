import type { Page } from '@playwright/test';
import { axe, desktop, expect, index, test } from './fixtures';

type P = { h: string; t: string; a?: number; o?: string[]; sz?: [string, number, number?, number?][] };
const products = index.products as P[];
const pjoy = products.find((p) => /pjoys/.test(p.h) && p.sz && p.sz.length > 1 && p.a === 1 && !p.o && p.sz.some((s) => s[1] === 1 && s[2]))!;
const pjoySize = pjoy.sz!.find((s) => s[1] === 1 && s[2])!;

const pet = (page: Page) => page.locator('.cpet');
const hit = (page: Page) => page.getByRole('button', { name: 'Catchy, IYS desktop buddy' });
const state = (page: Page) => pet(page).getAttribute('data-catchy-state');
const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const box = async (page: Page) => (await pet(page).boundingBox())!;
/** What the visitor would actually hit at Catchy's centre. */
const topAt = (page: Page, x: number, y: number) =>
  page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x!, y!);
    return el?.closest('.cpet') ? 'catchy' : el?.closest('[data-window]')?.getAttribute('data-window') ?? el?.tagName ?? null;
  }, [x, y]);

test.describe('CATCHY desktop buddy', () => {
  test('appears by default on the desktop, inside the work area, clear of the strip and the taskbar', async ({ page }) => {
    await desktop(page, '/');
    await expect(pet(page)).toBeVisible();
    const p = await box(page);
    const desk = (await page.locator('.desktop').boundingBox())!;
    const strip = (await page.locator('.realbar').boundingBox())!;
    const bar = (await page.locator('.taskbar').boundingBox())!;
    expect(p.y).toBeGreaterThanOrEqual(strip.y + strip.height);
    expect(p.y + p.height).toBeLessThanOrEqual(bar.y);
    expect(p.x).toBeGreaterThanOrEqual(desk.x);
    expect(p.x + p.width).toBeLessThanOrEqual(desk.x + desk.width);
    expect(p.height).toBeGreaterThanOrEqual(70);
    expect(p.height).toBeLessThanOrEqual(90);
    // he starts somewhere you can actually see him (not under the browser), and off the desktop icons
    expect(await topAt(page, p.x + p.width / 2, p.y + p.height / 2)).toBe('catchy');
    for (const icon of await page.locator('.dicon').all()) {
      const r = (await icon.boundingBox())!;
      const overlaps = p.x < r.x + r.width && p.x + p.width > r.x && p.y < r.y + r.height && p.y + p.height > r.y;
      expect(overlaps).toBe(false);
    }
    expect(['sit', 'sleep', 'idle', 'look']).toContain(await state(page));
    await axe(page, '.catchy-layer');
  });

  test('click → a small reaction and a short line; keyboard works too', async ({ page }) => {
    await desktop(page, '/');
    await hit(page).click();
    await expect(pet(page)).toHaveAttribute('data-catchy-state', /happy|wake/);
    await expect(page.locator('.cpet__bubble')).toBeVisible();
    expect(((await page.locator('.cpet__bubble').textContent()) ?? '').length).toBeLessThanOrEqual(24);
    // arrow keys move him (dragging is not the only way)
    const before = await box(page);
    await hit(page).focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await box(page)).x).toBeLessThan(before.x - 20);
  });

  test('drag: follows the pointer, is clamped inside the desktop, and lands with a bounce', async ({ page }) => {
    await desktop(page, '/');
    await browserWin(page).locator('.tbtn').first().click(); // minimize the browser for a clear desktop
    const p = await box(page);
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
    await page.mouse.down();
    await page.mouse.move(600, 400, { steps: 6 });
    await expect(pet(page)).toHaveAttribute('data-catchy-state', 'dragged');
    // try to throw him into the REAL IYS strip and off the screen
    await page.mouse.move(-200, -200, { steps: 6 });
    await page.mouse.up();
    const q = await box(page);
    const desk = (await page.locator('.desktop').boundingBox())!;
    expect(q.x).toBeGreaterThanOrEqual(desk.x);
    expect(q.y).toBeGreaterThanOrEqual(desk.y);
    await expect(pet(page)).toHaveAttribute('data-catchy-state', 'sit');
    // and below the taskbar
    await page.mouse.move(q.x + 30, q.y + 30);
    await page.mouse.down();
    await page.mouse.move(700, 2000, { steps: 6 });
    await page.mouse.up();
    const r = await box(page);
    const bar = (await page.locator('.taskbar').boundingBox())!;
    expect(r.y + r.height).toBeLessThanOrEqual(bar.y);
    // position survives a reload
    await page.reload();
    await expect(pet(page)).toBeVisible();
    expect(Math.abs((await box(page)).x - r.x)).toBeLessThanOrEqual(2);
  });

  test('windows cover him: he lives on the desktop, not above apps', async ({ page }) => {
    await desktop(page, '/');
    await browserWin(page).locator('.tbtn').first().click();
    // put Catchy in the middle, then open a window on top of that spot
    const p = await box(page);
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
    await page.mouse.down();
    await page.mouse.move(700, 450, { steps: 6 });
    await page.mouse.up();
    const c = await box(page);
    const cx = c.x + c.width / 2;
    const cy = c.y + c.height / 2;
    expect(await topAt(page, cx, cy)).toBe('catchy');
    await page.getByRole('list', { name: 'Open windows' }).getByRole('button', { name: /IYS INTERNET/ }).click();
    await expect(browserWin(page)).toBeVisible();
    expect(await topAt(page, cx, cy)).toBe('internet');
    await browserWin(page).getByRole('button', { name: /^Close/ }).click();
    expect(await topAt(page, cx, cy)).toBe('catchy');
  });

  test('ADD TO BAG: the cart works exactly as before and Catchy notices', async ({ page }) => {
    await desktop(page, `/product/${pjoy.h}`);
    const b = browserWin(page);
    await b.locator('.chip label', { hasText: new RegExp(`^${pjoySize[0]}$`) }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(b.getByRole('status').filter({ hasText: 'ADDED 2 BAG :)' })).toBeVisible();
    await expect(pet(page)).toHaveAttribute('data-catchy-state', /carry-pjoy|excited|run/);
    await expect(page.locator('.cpet__sym')).toHaveText('!!');
    const items = await page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.bag')!).state.items.map((i: { variantId: number; quantity: number }) => [i.variantId, i.quantity]));
    expect(items).toEqual([[pjoySize[2], 1]]);
    // checkout still goes straight to the official checkout, untouched by Catchy
    await page.route('https://inyourshoe.com/cart/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
    await page.getByRole('button', { name: /Open My Bag, 1 items/ }).first().click();
    await page.getByRole('dialog', { name: 'MY BAG' }).getByRole('button', { name: /CHECKOUT xx/ }).click();
    await expect(page).toHaveURL(`https://inyourshoe.com/cart/${pjoySize[2]}:1`);
  });

  test('IYS GAMES: playful reaction, games launch normally, Catchy stays behind the game', async ({ page }) => {
    await desktop(page, '/');
    await browserWin(page).locator('.tbtn').first().click();
    await page.getByRole('button', { name: /^Open IYS Games/ }).click();
    await expect(page.getByRole('dialog', { name: 'IYS GAMES' })).toBeVisible();
    await expect(pet(page)).toHaveAttribute('data-catchy-state', 'happy');
    await page.getByRole('button', { name: 'PLAY CATCHY SNAKE' }).click();
    const game = page.locator('[data-window="game-snake"]');
    await game.locator('.game__cta').click();
    await expect(game.locator('section.game')).toHaveAttribute('data-phase', 'playing');
    const z = await page.evaluate(() => [Number(getComputedStyle(document.querySelector('.catchy-layer')!).zIndex), Number(getComputedStyle(document.querySelector('.win-layer')!).zIndex)]);
    expect(z[0]).toBeLessThan(z[1]!);
    const g = (await game.locator('.game__stage').boundingBox())!;
    expect(await topAt(page, g.x + g.width / 2, g.y + g.height / 2)).toBe('game-snake');
  });

  test('Control Panel → Catchy: hide, survives reload, show again', async ({ page }) => {
    await desktop(page, '/');
    await expect(pet(page)).toBeVisible();
    await browserWin(page).locator('.tbtn').first().click();
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    const cp = page.getByRole('dialog', { name: 'CONTROL PANEL' });
    await cp.getByRole('tab', { name: 'Catchy' }).click();
    const box = cp.getByRole('checkbox', { name: 'Show Catchy on the desktop' });
    await expect(box).toBeChecked();
    await box.press('Space');
    await expect(pet(page)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('iys2006.catchy.enabled'))).toBe('false');
    await page.reload();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(pet(page)).toHaveCount(0);
    await browserWin(page).locator('.tbtn').first().click();
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await cp.getByRole('tab', { name: 'Catchy' }).click();
    await cp.getByRole('checkbox', { name: 'Show Catchy on the desktop' }).check();
    await expect(pet(page)).toBeVisible();
  });

  test('right-click menu: Nap, and Hide Catchy', async ({ page }) => {
    await desktop(page, '/');
    await hit(page).click({ button: 'right' });
    const menu = page.getByRole('menu', { name: 'CATCHY' });
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Nap' }).click();
    await expect(pet(page)).toHaveAttribute('data-catchy-state', 'sleep');
    await hit(page).click({ button: 'right' });
    await page.getByRole('menu', { name: 'CATCHY' }).getByRole('menuitem', { name: 'Hide Catchy' }).click();
    await expect(pet(page)).toHaveCount(0);
  });

  test('nothing about Catchy is sent anywhere', async ({ page }) => {
    const sent: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (r.method() !== 'GET' || (/catchy|track|collect|analytics|insights|beacon/i.test(u) && !/\/assets\//.test(u))) sent.push(`${r.method()} ${u}`);
    });
    await desktop(page, '/');
    await hit(page).click();
    const p = await box(page);
    await page.mouse.move(p.x + 30, p.y + 30);
    await page.mouse.down();
    await page.mouse.move(500, 500, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(sent).toEqual([]);
  });
});

test.describe('CATCHY with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('REAL IYS: a quick goodbye wave, then the same cart-preserving hand-off', async ({ page }) => {
    const hits: string[] = [];
    await page.route('https://inyourshoe.com/', (r) => {
      hits.push(r.request().url());
      return r.fulfill({ status: 200, contentType: 'text/html', body: '<title>REAL IYS (stub)</title>' });
    });
    await desktop(page, '/');
    // a clear view of Catchy so the wave can be seen
    await browserWin(page).locator('.tbtn').first().click();
    // record every pose Catchy takes (the wave only lasts until the page leaves)
    const poses: string[] = [];
    await page.exposeFunction('__catchyPose', (s: string) => void poses.push(s));
    await page.evaluate(() => {
      const el = document.querySelector('.cpet')!;
      new MutationObserver(() => (window as unknown as { __catchyPose: (s: string) => void }).__catchyPose(el.getAttribute('data-catchy-state')!)).observe(el, { attributes: true, attributeFilter: ['data-catchy-state'] });
    });
    const t0 = Date.now();
    await page.getByRole('button', { name: /IYS 2006.*REAL IYS/ }).click();
    await expect(page).toHaveURL('https://inyourshoe.com/');
    expect(Date.now() - t0).toBeLessThan(3_000);
    expect(poses).toContain('wave');
    expect(hits).toEqual(['https://inyourshoe.com/']);
  });

  test('he wanders on his own, and never leaves the desktop', async ({ page }) => {
    await page.clock.install();
    await desktop(page, '/');
    await browserWin(page).locator('.tbtn').first().click();
    const desk = (await page.locator('.desktop').boundingBox())!;
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      await page.clock.runFor(4_000);
      seen.add((await state(page))!);
      const p = await box(page);
      expect(p.x).toBeGreaterThanOrEqual(desk.x - 0.5);
      expect(p.y).toBeGreaterThanOrEqual(desk.y - 0.5);
      expect(p.x + p.width).toBeLessThanOrEqual(desk.x + desk.width + 0.5);
      expect(p.y + p.height).toBeLessThanOrEqual(desk.y + desk.height + 0.5);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
