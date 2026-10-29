import type { Page } from '@playwright/test';
import { axe, expect, test } from './fixtures';

async function boot(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
  await page.goto('/');
  await expect(page.locator('.m-status')).toBeVisible();
}
const game = (page: Page) => page.locator('section.game');
const statusBox = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('.m-status')!.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height, document.querySelector('.m-status svg[data-battery]') !== null, document.querySelector('.m-status svg[data-network]') !== null];
  });

test.describe('IYS GAMES (mobile)', () => {
  test('GAMES key → folder → Snake with the D-pad; soft keys pause, BACK returns; status bar untouched', async ({ page }) => {
    await boot(page);
    const s0 = await statusBox(page);
    // the launcher is the IYS MOBILE bar's GAMES key now (the old home-screen tile is gone)
    await page.getByRole('navigation', { name: 'IYS MOBILE bar' }).getByRole('button', { name: 'IYS GAMES, 6 games' }).click();
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › GAMES');
    for (const t of ['PURBALE CATCHY', 'IYS TOWER', 'CATCHY CHOMP', 'IYS STACKS', 'CATCHY SNAKE', 'CATCHY INVADERS']) await expect(page.getByRole('button', { name: `PLAY ${t}` })).toBeVisible();
    await axe(page, '.m-content');
    await page.getByRole('button', { name: 'PLAY CATCHY SNAKE' }).click();
    await expect(page.locator('.game__cta')).toBeVisible();
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › GAMES › CATCHY SNAKE');
    const center = page.locator('.m-soft__center');
    await expect(center).toHaveText('PLAY');
    await center.click();
    await expect(game(page)).toHaveAttribute('data-phase', 'playing');
    await expect(center).toHaveText('PAUSE');
    await center.click();
    await expect(game(page)).toHaveAttribute('data-phase', 'paused');
    await center.click();
    await expect(game(page)).toHaveAttribute('data-phase', 'playing');
    // the on-screen D-pad steers: straight up into the wall
    await page.getByRole('button', { name: 'Up', exact: true }).click();
    await expect(game(page)).toHaveAttribute('data-phase', 'over', { timeout: 8000 });
    await expect(center).toHaveText('AGAIN');
    await center.click();
    await expect(game(page)).toHaveAttribute('data-phase', 'playing');
    expect(await statusBox(page)).toEqual(s0);
    await expect(page.locator('.m-realbar .realswitch')).toBeVisible();
    // BACK → folder → home; no game UI left behind
    await page.getByRole('button', { name: '◀ BACK' }).click();
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › GAMES');
    await expect(game(page)).toHaveCount(0);
    await page.getByRole('button', { name: '◀ BACK' }).click();
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE');
    await expect(page.locator('.game__touch, .dpad')).toHaveCount(0);
  });

  test('MENU entry; every game launches, takes touch input and pauses', async ({ page }) => {
    await boot(page);
    await page.getByRole('button', { name: 'MENU', exact: true }).click();
    await page.getByRole('button', { name: /IYS GAMES · 6 GAMES/ }).click();
    const center = page.locator('.m-soft__center');
    const cases: [string, (p: Page) => Promise<void>][] = [
      ['IYS STACKS', async (p) => p.getByRole('button', { name: 'Hard drop' }).click()],
      ['CATCHY CHOMP', async (p) => p.getByRole('button', { name: 'Right', exact: true }).click()],
      ['IYS TOWER', async (p) => p.getByRole('button', { name: 'Steer left' }).click()],
      ['CATCHY INVADERS', async (p) => {
        const fire = p.getByRole('button', { name: 'Fire' });
        const b = (await fire.boundingBox())!;
        await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await p.mouse.down();
        await expect.poll(async () => Number(await game(p).getAttribute('data-score')), { timeout: 8000 }).toBeGreaterThan(0);
        await p.mouse.up();
      }],
    ];
    for (const [title, input] of cases) {
      await page.getByRole('button', { name: `PLAY ${title}` }).click();
      await expect(page.locator('.game__cta')).toBeVisible();
      await expect(center).toHaveText('PLAY');
      await center.click();
      await expect(game(page)).toHaveAttribute('data-phase', 'playing');
      await input(page);
      if (title === 'IYS STACKS' || title === 'CATCHY CHOMP') await expect.poll(async () => Number(await game(page).getAttribute('data-score')), { timeout: 6000 }).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await expect(game(page)).toHaveAttribute('data-phase', 'paused');
      await page.getByRole('button', { name: '◀ IYS GAMES' }).first().click();
      await expect(page.getByRole('button', { name: `PLAY ${title}` })).toBeVisible();
    }
    await page.getByRole('button', { name: 'PLAY PURBALE CATCHY' }).click();
    await page.getByRole('button', { name: 'PLAY PJOY PAIRS' }).click();
    await page.locator('.game__cta').click();
    await page.locator('.pcard').first().click();
    await expect(page.locator('.pcard').first()).toHaveClass(/is-up/);
  });

  for (const width of [320, 390, 430]) {
    test(`touch controls fit at ${width}px: no sideways scroll, real tap targets, play area visible`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await boot(page);
      await page.getByRole('navigation', { name: 'IYS MOBILE bar' }).getByRole('button', { name: 'IYS GAMES, 6 games' }).click();
      for (const title of ['CATCHY SNAKE', 'IYS STACKS', 'CATCHY INVADERS', 'IYS TOWER']) {
        await page.getByRole('button', { name: `PLAY ${title}` }).click();
        await expect(game(page)).toBeVisible();
        const m = await page.evaluate(() => {
          const pads = [...document.querySelectorAll<HTMLElement>('.game__touch .pad')].map((b) => b.getBoundingClientRect());
          const stage = document.querySelector('.game__stage')!.getBoundingClientRect();
          const soft = document.querySelector('.m-soft')!.getBoundingClientRect();
          const touch = document.querySelector('.game__touch')!.getBoundingClientRect();
          return { sw: document.documentElement.scrollWidth, iw: innerWidth, pads: pads.map((r) => [r.left, r.right, r.width, r.height]), stageH: stage.height, touchBottom: touch.bottom, softTop: soft.top, stageBottom: stage.bottom, touchTop: touch.top };
        });
        expect(m.sw).toBeLessThanOrEqual(m.iw);
        for (const [l, r, w, h] of m.pads) {
          expect(l).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(m.iw);
          expect(Math.min(w!, h!)).toBeGreaterThanOrEqual(40);
        }
        expect(m.stageH).toBeGreaterThan(200);
        expect(m.stageBottom).toBeLessThanOrEqual(m.touchTop + 1); // controls never cover the board
        await page.getByRole('button', { name: '◀ BACK' }).click();
      }
    });
  }
});
