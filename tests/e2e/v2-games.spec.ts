import type { Locator, Page } from '@playwright/test';
import { axe, desktop, expect, test } from './fixtures';

const GAMES = [
  ['snake', 'CATCHY SNAKE'],
  ['stacks', 'IYS STACKS'],
  ['chomp', 'CATCHY CHOMP'],
  ['tower', 'IYS TOWER'],
  ['invaders', 'CATCHY INVADERS'],
  ['purbale', 'PURBALE CATCHY'],
] as const;

async function openHub(page: Page) {
  await desktop(page, '/');
  await page.locator('[data-window="internet"] .tbtn').first().click();
  await page.getByRole('button', { name: /^Open IYS Games/ }).click();
  const hub = page.getByRole('dialog', { name: 'IYS GAMES' });
  await expect(hub).toBeVisible();
  return hub;
}
async function launch(page: Page, id: string, title: string) {
  await page.getByRole('button', { name: `PLAY ${title}` }).click();
  const win = page.locator(`[data-window="game-${id}"]`);
  await expect(win).toBeVisible();
  return win;
}
const phase = (scope: Locator) => scope.locator('section.game');
async function play(scope: Locator) {
  await scope.locator('.game__cta').click();
  await expect(phase(scope)).toHaveAttribute('data-phase', 'playing');
}
const score = async (scope: Locator) => Number(await phase(scope).getAttribute('data-score'));

/** Pause (P key + button), minimize = pause, restart, then exit back to the folder. */
async function controls(page: Page, win: Locator, title: string) {
  await pauseRestart(page, win, title);
  await win.getByRole('button', { name: /◀ IYS GAMES/ }).first().click();
  await expect(win).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'IYS GAMES' })).toBeVisible();
}
async function pauseRestart(page: Page, win: Locator, title: string) {
  const g = phase(win);
  await win.locator('.game__stage').focus();
  await page.keyboard.press('p');
  await expect(g).toHaveAttribute('data-phase', 'paused');
  await expect(win.locator('.game__big')).toHaveText('PAUSED');
  await win.getByRole('button', { name: 'Resume' }).first().click();
  await expect(g).toHaveAttribute('data-phase', 'playing');
  await win.getByRole('button', { name: `Minimize ${title}` }).click();
  await expect(win).toBeHidden();
  await page.getByRole('list', { name: 'Open windows' }).getByRole('button', { name: new RegExp(title) }).click();
  await expect(g).toHaveAttribute('data-phase', 'paused');
  await win.getByRole('button', { name: 'Restart' }).first().click();
  await expect(g).toHaveAttribute('data-phase', 'playing');
}

test.describe('IYS GAMES (desktop)', () => {
  test('folder: desktop icon + Start menu, six games with PLAY and MY HIGH SCORES, no axe issues', async ({ page }) => {
    const hub = await openHub(page);
    for (const [, title] of GAMES) await expect(hub.getByRole('button', { name: `PLAY ${title}` })).toBeVisible();
    await expect(hub.locator('[data-game-tile]')).toHaveCount(6);
    await expect(hub.getByRole('heading', { name: 'MY HIGH SCORES' })).toBeVisible();
    await expect(hub.getByText(/coming soon/i)).toHaveCount(0);
    await axe(page, '[data-window="games"]');
    await hub.getByRole('button', { name: 'Close IYS GAMES' }).click();
    await page.getByRole('button', { name: 'MENU', exact: true }).click() // top-left MENU (the taskbar corner is DESKTOP);
    await page.getByRole('menu', { name: 'IYS menu' }).getByRole('menuitem', { name: /IYS GAMES/ }).click();
    await expect(page.getByRole('dialog', { name: 'IYS GAMES' })).toBeVisible();
  });

  test('CATCHY SNAKE: steer into the wall → GAME OVER, score saved locally', async ({ page }) => {
    await openHub(page);
    const win = await launch(page, 'snake', 'CATCHY SNAKE');
    await axe(page, '[data-window="game-snake"]');
    await play(win);
    await controls(page, win, 'CATCHY SNAKE');
    const again = await launch(page, 'snake', 'CATCHY SNAKE');
    await play(again);
    await page.keyboard.press('ArrowUp');
    await expect(phase(again)).toHaveAttribute('data-phase', 'over', { timeout: 8000 });
    await expect(again.locator('.game__big')).toHaveText('GAME OVER :(');
    await expect(again.getByRole('button', { name: 'TRY AGAIN XD' })).toBeVisible();
  });

  test('IYS STACKS: moves, rotates, hard drops and tops out', async ({ page }) => {
    await openHub(page);
    const win = await launch(page, 'stacks', 'IYS STACKS');
    await play(win);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await expect.poll(() => score(win)).toBeGreaterThan(0);
    await controls(page, win, 'IYS STACKS');
    const again = await launch(page, 'stacks', 'IYS STACKS');
    await play(again);
    for (let i = 0; i < 60 && (await phase(again).getAttribute('data-phase')) === 'playing'; i++) await page.keyboard.press('Space');
    await expect(phase(again)).toHaveAttribute('data-phase', 'over');
  });

  test('CATCHY CHOMP: Catchy eats socks along the corridor', async ({ page }) => {
    await openHub(page);
    const win = await launch(page, 'chomp', 'CATCHY CHOMP');
    await play(win);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => score(win), { timeout: 6000 }).toBeGreaterThanOrEqual(10);
    await controls(page, win, 'CATCHY CHOMP');
  });

  test('IYS TOWER: Catchy bounces on its own; steering + height score or a fall', async ({ page }) => {
    await openHub(page);
    const win = await launch(page, 'tower', 'IYS TOWER');
    await play(win);
    await controls(page, win, 'IYS TOWER');
    const again = await launch(page, 'tower', 'IYS TOWER');
    await play(again);
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowLeft');
    await expect.poll(async () => (await score(again)) > 0 || (await phase(again).getAttribute('data-phase')) === 'over', { timeout: 30_000 }).toBe(true);
  });

  test('CATCHY INVADERS: firing destroys invaders', async ({ page }) => {
    await openHub(page);
    const win = await launch(page, 'invaders', 'CATCHY INVADERS');
    await play(win);
    await page.keyboard.down('Space');
    await expect.poll(() => score(win), { timeout: 8000 }).toBeGreaterThan(0);
    await page.keyboard.up('Space');
    await controls(page, win, 'CATCHY INVADERS');
  });

  test('PURBALE CATCHY: Closet perfect fit, Pjoy Pairs cleared, a packed box', async ({ page }) => {
    await openHub(page);
    const win = await launch(page, 'purbale', 'PURBALE CATCHY');
    await axe(page, '[data-window="game-purbale"]');
    // CATCHY CLOSET
    await win.getByRole('button', { name: 'PLAY CATCHY CLOSET' }).click();
    await play(win);
    for (const piece of (await win.getByTestId('closet-target').textContent())!.split(' · ')) await win.getByRole('button', { name: piece, exact: true }).click();
    await win.getByRole('button', { name: 'CHECK THE LOOK' }).click();
    await expect.poll(() => score(win)).toBeGreaterThan(0);
    await axe(page, '[data-window="game-purbale"]');
    await win.getByRole('button', { name: '◀ PURBALE' }).first().click();
    // PJOY PAIRS (easy): solve it by remembering what was seen
    await win.getByRole('button', { name: 'PLAY PJOY PAIRS' }).click();
    await win.getByRole('radio', { name: /EASY/ }).check();
    await play(win);
    const cards = win.locator('.pcard');
    const n = await cards.count();
    expect(n).toBe(12);
    const label = async (i: number) => (await cards.nth(i).getAttribute('aria-label'))!.replace(/^Card \d+: /, '').replace(/ \(paired\)$/, '');
    const isDone = async (i: number) => (await cards.nth(i).getAttribute('class'))!.includes('is-matched');
    const known = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      if ((await isDone(i)) || [...known.values()].includes(i)) continue;
      await cards.nth(i).click();
      const a = await label(i);
      if (known.has(a)) {
        await cards.nth(known.get(a)!).click();
        known.delete(a);
        continue;
      }
      let j = i + 1;
      while (j < n && ((await isDone(j)) || [...known.values()].includes(j))) j++;
      await cards.nth(j).click();
      const b = await label(j);
      if (a !== b) {
        known.set(a, i);
        if (known.has(b)) {
          const k = known.get(b)!;
          known.delete(b);
          await cards.nth(k).click();
          await cards.nth(j).click();
        } else known.set(b, j);
      }
    }
    await expect(phase(win)).toHaveAttribute('data-phase', 'over');
    await expect(win.getByText('ALL PAIRED!!').first()).toBeVisible();
    await win.getByRole('button', { name: '◀ PURBALE' }).first().click();
    // PACK THE DROP
    await win.getByRole('button', { name: 'PLAY PACK THE DROP' }).click();
    await play(win);
    for (const li of await win.getByTestId('pack-list').locator('li').all()) {
      const text = (await li.textContent())!.replace(/^\d+ × /, '');
      const q = Number(await li.getAttribute('data-qty'));
      for (let k = 0; k < q; k++) await win.getByRole('button', { name: `Add ${text}`, exact: true }).click();
    }
    await win.getByRole('button', { name: /PACK IT/ }).click();
    await expect.poll(() => score(win)).toBeGreaterThan(0);
    await pauseRestart(page, win, 'PURBALE CATCHY');
    // mini game → Purbale menu → IYS GAMES
    await win.getByRole('button', { name: '◀ PURBALE' }).first().click();
    await win.getByRole('button', { name: '◀ IYS GAMES' }).click();
    await expect(win).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'IYS GAMES' })).toBeVisible();
  });

  test('games never steal keys from the rest of the OS', async ({ page }) => {
    await openHub(page);
    const win = await launch(page, 'stacks', 'IYS STACKS');
    await play(win);
    // another window has focus: Space / arrows go there, not to the game
    await page.getByRole('button', { name: 'Quick launch: IYS Internet' }).click();
    await expect(page.locator('[data-window="internet"]')).toBeVisible();
    await page.locator('[data-window="internet"] .titlebar').click();
    for (let i = 0; i < 5; i++) await page.keyboard.press('Space');
    expect(await score(win)).toBe(0);
    // back in the game, Space hard-drops
    await page.getByRole('list', { name: 'Open windows' }).getByRole('button', { name: /IYS STACKS/ }).click();
    await win.locator('.game__stage').focus();
    await page.keyboard.press('Space');
    await expect.poll(() => score(win)).toBeGreaterThan(0);
  });
});

test.describe('MY HIGH SCORES (local only)', () => {
  const dieInSnake = async (page: Page) => {
    const win = await launch(page, 'snake', 'CATCHY SNAKE');
    await play(win);
    await page.keyboard.press('ArrowUp');
    await expect(phase(win)).toHaveAttribute('data-phase', 'over', { timeout: 8000 });
    return win;
  };
  const topOut = async (page: Page) => {
    const win = await launch(page, 'stacks', 'IYS STACKS');
    await play(win);
    for (let i = 0; i < 80 && (await phase(win).getAttribute('data-phase')) === 'playing'; i++) await page.keyboard.press('Space');
    await expect(phase(win)).toHaveAttribute('data-phase', 'over');
    return win;
  };

  test('saves a new best, a lower score never overwrites it, survives reload, nothing is sent', async ({ page }) => {
    const sent: string[] = [];
    page.on('request', (r) => {
      if (r.method() !== 'GET' || /score/i.test(r.url())) sent.push(`${r.method()} ${r.url()}`);
    });
    await openHub(page);
    await expect(page.locator('[data-game-tile="stacks"]')).toContainText('BEST -');
    const win = await topOut(page);
    const best = await score(win);
    expect(best).toBeGreaterThan(0);
    await expect(win.locator('.game__new')).toHaveText('NEW HIGH SCORE!!');
    expect(await page.evaluate(() => localStorage.getItem('iys2006.games.stacks.highScore'))).toBe(String(best));
    await win.getByRole('button', { name: 'Close IYS STACKS' }).click();
    // a worse run (snake, straight into the wall) can't touch a higher stored best
    await page.evaluate(() => localStorage.setItem('iys2006.games.snake.highScore', '99999'));
    const s = await dieInSnake(page);
    await expect(s.locator('.game__new')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('iys2006.games.snake.highScore'))).toBe('99999');
    // reload: still there, shown on the folder
    await page.reload();
    await page.locator('[data-window="internet"] .tbtn').first().click();
    await page.getByRole('button', { name: /^Open IYS Games/ }).click();
    await expect(page.locator('[data-game-tile="stacks"]')).toContainText(`BEST ${best}`);
    await expect(page.locator('[data-game-tile="snake"]')).toContainText('BEST 99999');
    expect(sent).toEqual([]);
  });

  test('blocked storage never crashes a game', async ({ page }) => {
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k.startsWith('iys2006.games.')) throw new Error('QuotaExceededError');
        return set.call(this, k, v);
      };
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = function (k: string) {
        if (k.startsWith('iys2006.games.')) throw new Error('SecurityError');
        return get.call(this, k);
      };
    });
    await openHub(page);
    const win = await dieInSnake(page);
    await expect(win.locator('.game__big')).toHaveText('GAME OVER :(');
    await win.getByRole('button', { name: 'TRY AGAIN XD' }).click();
    await expect(phase(win)).toHaveAttribute('data-phase', 'playing');
  });

  test('closing a game stops its loop and listeners', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __raf: number; __vis: number };
      w.__raf = 0;
      w.__vis = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        w.__raf++;
        return raf(cb);
      };
      const add = document.addEventListener.bind(document);
      const rem = document.removeEventListener.bind(document);
      document.addEventListener = ((t: string, l: EventListenerOrEventListenerObject, o?: unknown) => {
        if (t === 'visibilitychange') w.__vis++;
        return add(t, l, o as AddEventListenerOptions);
      }) as typeof document.addEventListener;
      document.removeEventListener = ((t: string, l: EventListenerOrEventListenerObject, o?: unknown) => {
        if (t === 'visibilitychange') w.__vis--;
        return rem(t, l, o as EventListenerOptions);
      }) as typeof document.removeEventListener;
    });
    await openHub(page);
    const rate = () =>
      page.evaluate(async () => {
        const w = window as unknown as { __raf: number };
        const a = w.__raf;
        await new Promise((r) => setTimeout(r, 1000));
        return w.__raf - a;
      });
    const vis0 = await page.evaluate(() => (window as unknown as { __vis: number }).__vis);
    const idle = await rate();
    const win = await launch(page, 'invaders', 'CATCHY INVADERS');
    await play(win);
    expect(await rate()).toBeGreaterThan(idle + 20);
    await win.getByRole('button', { name: 'Close CATCHY INVADERS' }).click();
    await expect(win).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(await rate()).toBeLessThanOrEqual(idle + 5);
    expect(await page.evaluate(() => (window as unknown as { __vis: number }).__vis)).toBe(vis0);
  });
});
