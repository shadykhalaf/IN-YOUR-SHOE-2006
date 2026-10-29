import type { Page } from '@playwright/test';
import { axe, expect, fmt, index, test } from './fixtures';

/**
 * Navigation + smart search pass (2026-10-27), IYS MOBILE: MENU · IYS top
 * left, MY BAG in the shortcut keys' ice, SHOP ALL · SEARCH · GAMES · STORES ·
 * MSG with no caption above them, IYS home from anywhere (no reload), FRESH
 * PICKS and suggestions under the SEARCH box, journeys 1–4 the way a customer
 * does them (touch), and no sideways scroll at 320–430px.
 */
type P = { h: string; t: string; p: number | null; a?: number; o?: string[]; sz?: [string, number, number?, number?][] };
const products = index.products as P[];
const byHandle = new Map(products.map((p) => [p.h, p]));
const WIDTHS = [320, 360, 375, 390, 393, 414, 430] as const;
const sized = products.find((p) => p.a === 1 && !p.o && p.sz && p.sz.length > 1 && p.sz.some((s) => s[1] === 1 && s[2]) && /hoodie/i.test(p.t))!;
const size = sized.sz!.find((s) => s[1] === 1 && s[2])!;

const session = (page: Page) =>
  page.addInitScript(() => {
    if (!sessionStorage.getItem('iys2006.session')) sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 }));
  });
const seedBag = (page: Page) =>
  page.addInitScript((item) => {
    if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [item] }, version: 1 }));
  }, { key: `${sized.h}::${size[2]}`, handle: sized.h, title: sized.t, variantId: size[2], variantTitle: size[0], size: size[0], quantity: 1, price: sized.p, image: null });
const bar = (page: Page) => page.getByRole('navigation', { name: 'IYS MOBILE bar' });
const homeKey = (page: Page) => page.getByRole('button', { name: 'Go to IYS Retro home' });
const bagKey = (page: Page) => page.locator('.m-topkey--bag');
const bagItems = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.bag') ?? '{"state":{"items":[]}}').state.items.length as number);
/** Marks this document: still marked after IYS home = no reload happened. */
const mark = (page: Page) => page.evaluate(() => ((window as unknown as { __iysDoc: number }).__iysDoc = 1));
const sameDoc = (page: Page) => page.evaluate(() => (window as unknown as { __iysDoc?: number }).__iysDoc === 1);
/** Border, face, shadow and ink as the browser paints them. */
const look = (page: Page, sel: string) =>
  page.locator(sel).first().evaluate((e) => {
    const c = getComputedStyle(e);
    return { border: c.borderTopColor, face: c.backgroundImage, shadow: c.boxShadow, ink: c.color };
  });

/** Product strips may scroll inside themselves; nothing else may scroll sideways (same rule as v2-conversion-mobile). */
const CAROUSELS = 'ul.m-drop, .m-gallery, .m-tabs, .gallery__thumbs, .viewer__film, [data-carousel]';
const sideways = (page: Page) =>
  page.evaluate((carousels) => {
    const all = [document.documentElement, ...document.querySelectorAll('body *')];
    return all
      .filter((e) => e.scrollWidth > e.clientWidth + 1 && (e === document.documentElement || /auto|scroll/.test(getComputedStyle(e).overflowX)) && !e.matches(carousels))
      .map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(' ')[0]} ${e.scrollWidth}>${e.clientWidth}`);
  }, CAROUSELS);
/** A real finger drag (touchstart → touchmove… → touchend), so the browser scrolls whatever is under it. */
async function touchDrag(page: Page, x: number, y: number, dx: number, dy: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 12, y: y + (dy * i) / 12 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(250);
}

test.describe('header: MENU · IYS | 2006 / REAL IYS | MY BAG', () => {
  test('at 320–440px (every breakpoint edge too): in that order, apart, on screen, nothing cut off; MY BAG keeps its label; the IYS mark loads; the five keys fit', async ({ page }) => {
    await session(page);
    await seedBag(page);
    await page.goto('/');
    await expect(page.locator('.m-shell')).toBeVisible();
    await expect.poll(() => page.locator('.m-topkey__iys').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    await expect(homeKey(page)).toHaveAttribute('title', 'IYS home');
    for (const w of [...new Set([...WIDTHS, 359, 374, 399, 400, 412, 439, 440])].sort((a, b) => a - b)) {
      await page.setViewportSize({ width: w, height: 800 });
      const g = await page.evaluate(() => {
        const box = (s: string) => {
          const r = document.querySelector(s)!.getBoundingClientRect();
          return { l: r.left, r: r.right, t: r.top, b: r.bottom, h: r.height, w: r.width };
        };
        // nothing cut off: every visible label sits inside its own key, and nothing that clips (the bar labels) is clipping
        // (the bag badge hangs over MY BAG's corner by design; it is checked against the screen edge instead)
        const cut: string[] = [];
        for (const key of document.querySelectorAll<HTMLElement>('.m-realbar button, .m-bar__key')) {
          const k = key.getBoundingClientRect();
          const texts = document.createTreeWalker(key, NodeFilter.SHOW_TEXT);
          for (let n = texts.nextNode(); n; n = texts.nextNode()) {
            if (!n.textContent?.trim() || n.parentElement?.closest('.sr-only, .m-topkey__badge, .m-bar__marker')) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            const t = range.getBoundingClientRect();
            if (t.width && (t.left < k.left - 0.5 || t.right > k.right + 0.5)) cut.push(`${key.className}: "${n.textContent.trim()}" spills out`);
          }
        }
        for (const e of document.querySelectorAll<HTMLElement>('.m-realbar *, .m-bar__key, .m-bar__key *'))
          if (e.clientWidth > 0 && !e.closest('.sr-only') && /hidden|clip/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1) cut.push(`${e.className}: "${e.textContent?.trim()}" clipped`);
        const keys = [...document.querySelectorAll('.m-bar__key')].map((k) => {
          const r = k.getBoundingClientRect();
          return { l: r.left, r: r.right, h: r.height };
        });
        const my = getComputedStyle(document.querySelector('.m-topkey__my')!).display !== 'none';
        return { menu: box('.m-topkey--menu'), home: box('.m-topkey--home'), sw: box('.m-realbar .realswitch'), bag: box('.m-topkey--bag'), badge: box('.m-topkey__badge'), cut, keys, my, doc: document.documentElement.scrollWidth };
      });
      const at = `${w}px`;
      expect(g.menu.l, at).toBeGreaterThanOrEqual(0);
      expect(g.home.l - g.menu.r, at).toBeGreaterThanOrEqual(2); // MENU | IYS, side by side
      expect(g.home.l - g.menu.r, at).toBeLessThanOrEqual(8);
      expect(Math.abs((g.home.t + g.home.b) / 2 - (g.menu.t + g.menu.b) / 2), at).toBeLessThanOrEqual(1);
      expect(g.sw.l - g.home.r, at).toBeGreaterThanOrEqual(1); // apart, never touching
      expect(g.bag.l - g.sw.r, at).toBeGreaterThanOrEqual(1);
      expect(g.my, `${at}: "MY BAG" from 400px up, "BAG" below (as before IYS arrived)`).toBe(w >= 400);
      expect(g.bag.r, at).toBeLessThanOrEqual(w);
      expect(g.badge.r, at).toBeLessThanOrEqual(w);
      expect(Math.min(g.menu.h, g.home.h, g.bag.h), at).toBeGreaterThanOrEqual(32);
      expect(g.home.w, at).toBeGreaterThanOrEqual(32);
      expect(g.cut, at).toEqual([]);
      expect(g.keys, at).toHaveLength(5);
      for (const k of g.keys) {
        expect(k.l, at).toBeGreaterThanOrEqual(0);
        expect(k.r, at).toBeLessThanOrEqual(w);
        expect(k.h, at).toBeGreaterThanOrEqual(44);
      }
      expect(g.doc, at).toBeLessThanOrEqual(w);
      expect(await sideways(page), at).toEqual([]);
    }
    await axe(page, '.m-head');
  });

  test('no IYS MOBILE caption over the keys any more (screen readers still hear where u r); the keys start at the top of the bar', async ({ page }) => {
    await session(page);
    await page.goto('/search');
    const title = page.locator('.m-title');
    await expect(title).toHaveText('IYS MOBILE › SEARCH');
    const g = await page.evaluate(() => {
      const t = document.querySelector('.m-title')!;
      const bar = document.querySelector('.m-bar')!.getBoundingClientRect();
      const key = document.querySelector('.m-bar__key')!.getBoundingClientRect();
      const r = t.getBoundingClientRect();
      return { area: r.width * r.height, sr: t.classList.contains('sr-only'), barH: bar.height, keyTop: key.top - bar.top, keyH: key.height };
    });
    expect(g.sr).toBe(true);
    expect(g.area).toBeLessThanOrEqual(1);
    expect(g.keyTop).toBeLessThanOrEqual(7);
    expect(g.barH).toBeLessThanOrEqual(g.keyH + 14);
  });

  test('MY BAG wears exactly the shortcut keys’ ice (and their green when open); badge; it opens and closes the ONE bag', async ({ page }) => {
    await session(page);
    await seedBag(page);
    await page.goto('/');
    const shop = bar(page).getByRole('button', { name: /^SHOP ALL/ });
    await expect(shop).not.toHaveAttribute('aria-current', 'page');
    const key = await look(page, '.m-bar__key');
    expect(await look(page, '.m-topkey--bag')).toEqual(key);
    expect(await look(page, '.m-topkey--home')).toEqual(key);
    expect(key.border).toBe('rgb(156, 200, 242)'); // #9cc8f2
    const bag = bagKey(page);
    await expect(bag).toHaveAccessibleName('MY BAG: 1 item');
    await expect(bag.locator('.m-topkey__badge')).toHaveText('1');
    await bag.tap();
    await expect(bag).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › MY BAG');
    await expect(page.locator('.bag__row')).toHaveCount(1);
    await expect(page.locator('.m-h1', { hasText: 'MY BAG' })).toHaveCount(1);
    // open = the keys' own pressed / current green (read from a key the stylesheet marks current)
    const pressed = await page.evaluate(() => {
      const probe = document.createElement('button');
      probe.className = 'm-bar__key';
      probe.setAttribute('aria-current', 'page');
      document.querySelector('.m-bar__keys')!.append(probe);
      const c = getComputedStyle(probe);
      const out = { border: c.borderTopColor, face: c.backgroundImage, shadow: c.boxShadow, ink: c.color };
      probe.remove();
      return out;
    });
    expect(await look(page, '.m-topkey--bag')).toEqual(pressed);
    await bag.tap();
    await expect(bag).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.bag__row')).toHaveCount(0);
    await expect(page.locator('.m-hero')).toBeVisible();
    expect(await bagItems(page)).toBe(1);
  });
});

test.describe('the bar: SHOP ALL · SEARCH · GAMES · STORES · MSG', () => {
  test('JOURNEY 3: GAMES opens the one IYS GAMES; a game plays by touch; IYS takes u home with the bag as it was', async ({ page }) => {
    await session(page);
    await seedBag(page);
    await page.goto('/');
    await mark(page);
    await expect(bar(page).locator('.m-bar__key')).toHaveCount(5);
    expect((await bar(page).locator('.m-bar__key').allInnerTexts()).map((l) => l.trim())).toEqual(['SHOP ALL', 'SEARCH', 'GAMES', 'STORES', 'MSG']);
    const games = bar(page).getByRole('button', { name: 'IYS GAMES, 6 games' });
    await games.tap();
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › GAMES');
    await expect(games).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.m-games')).toHaveCount(1);
    for (const t of ['PURBALE CATCHY', 'IYS TOWER', 'CATCHY CHOMP', 'IYS STACKS', 'CATCHY SNAKE', 'CATCHY INVADERS']) await expect(page.getByRole('button', { name: `PLAY ${t}` })).toBeVisible();
    await page.getByRole('button', { name: 'PLAY CATCHY SNAKE' }).tap();
    const center = page.locator('.m-soft__center');
    await expect(center).toHaveText('PLAY');
    await center.tap();
    const game = page.locator('section.game');
    await expect(game).toHaveAttribute('data-phase', 'playing');
    await page.getByRole('button', { name: 'Up', exact: true }).tap(); // the D-pad steers (straight into the wall)
    await expect(game).toHaveAttribute('data-phase', 'over', { timeout: 8000 });
    await expect(games).toHaveAttribute('aria-current', 'page');
    // GAMES again: back to the same folder, never a second IYS GAMES
    await games.tap();
    await expect(page.locator('.m-games')).toHaveCount(1);
    await expect(game).toHaveCount(0);
    await page.getByRole('button', { name: 'PLAY IYS STACKS' }).tap();
    await center.tap();
    await expect(game).toHaveAttribute('data-phase', 'playing');
    await homeKey(page).tap();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.m-hero')).toBeVisible();
    await expect(page.locator('section.game, .m-games, .game__touch, .dpad')).toHaveCount(0);
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE');
    await expect(games).not.toHaveAttribute('aria-current', 'page');
    await expect(bagKey(page)).toHaveAccessibleName('MY BAG: 1 item');
    expect(await bagItems(page)).toBe(1);
    expect(await sameDoc(page)).toBe(true);
  });

  test('JOURNEY 4: favorite a hoodie → MENU › FAVS lists it → IYS home → still saved after a reload', async ({ page }) => {
    await session(page);
    await page.goto(`/product/${sized.h}`);
    await page.getByRole('button', { name: `Add ${sized.t} to Favorites` }).tap();
    await expect(page.getByRole('button', { name: `Remove ${sized.t} from Favorites` })).toHaveAttribute('aria-pressed', 'true');
    await expect(bar(page).getByRole('button', { name: /FAVS/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'IYS MENU' }).tap();
    const favs = page.getByRole('button', { name: /FAVS · MY FAVORITES/ });
    await expect(favs).toContainText('1 saved');
    await favs.tap();
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › FAVORITES');
    await expect(page.locator('.m-h1')).toHaveText('FAVORITES (1)');
    await expect(page.locator('.m-row', { hasText: sized.t })).toBeVisible();
    await expect(bar(page).locator('[aria-current="page"]')).toHaveCount(0);
    await homeKey(page).tap();
    await expect(page.locator('.m-hero')).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'IYS MENU' }).tap();
    await expect(page.getByRole('button', { name: /FAVS · MY FAVORITES/ })).toContainText('1 saved');
    await page.getByRole('button', { name: /FAVS · MY FAVORITES/ }).tap();
    await page.locator('.m-row', { hasText: sized.t }).tap();
    await expect(page.locator('.m-h1--product')).toHaveText(sized.t);
    await expect(page.getByRole('button', { name: `Remove ${sized.t} from Favorites` })).toHaveAttribute('aria-pressed', 'true');
  });

  test('IYS goes home from every screen and every overlay: no reload, overlays closed, Back still works', async ({ page }) => {
    test.setTimeout(90_000);
    await session(page);
    await page.goto('/');
    await mark(page);
    const goHome = async (from: string) => {
      await homeKey(page).tap();
      await expect(page, from).toHaveURL(/\/$/);
      await expect(page.locator('.m-hero'), from).toBeVisible();
      await expect(page.locator('.m-title'), from).toHaveText('IYS MOBILE');
      await expect(page.locator('.m-routes'), from).toBeVisible();
      expect(await sameDoc(page), `${from}: the page reloaded`).toBe(true);
    };
    // screens, reached the way a customer reaches them
    await bar(page).getByRole('button', { name: /^SHOP ALL/ }).tap();
    await expect(page).toHaveURL(/\/shop$/);
    await goHome('SHOP ALL');
    await bar(page).getByRole('button', { name: /^SEARCH/ }).tap();
    await page.locator('#m-q').fill('hoodie');
    await page.locator('#m-q').press('Enter');
    await expect(page.locator('.m-row').first()).toBeVisible();
    await goHome('search results');
    await page.locator('.m-panel--drop .m-drop__card').first().tap();
    await expect(page.locator('.m-h1--product')).toBeVisible();
    await goHome('product');
    await bar(page).getByRole('button', { name: /^STORES/ }).tap();
    await expect(page).toHaveURL(/\/stores$/);
    await goHome('STORES');
    await page.goBack(); // IYS pushed a new entry: Back returns to where u were
    await expect(page).toHaveURL(/\/stores$/);
    expect(await sameDoc(page)).toBe(true);
    await page.getByRole('button', { name: 'IYS MENU' }).tap();
    await page.getByRole('button', { name: /FAVS · MY FAVORITES/ }).tap();
    await expect(page).toHaveURL(/\/favorites$/);
    await goHome('FAVORITES');
    await page.goto('/collections/hoodies');
    await mark(page);
    await expect(page.locator('.m-row').first()).toBeVisible();
    await goHome('a collection');
    // overlays, over the home and over another screen
    const overlays: [string, string, () => Promise<void>][] = [
      ['MENU', 'MENU', () => page.getByRole('button', { name: 'IYS MENU' }).tap()],
      ['MY BAG', 'MY BAG', () => bagKey(page).tap()],
      ['MSG', 'MESSAGES', () => bar(page).locator('.m-bar__key--msg').tap()],
      ['GAMES', 'GAMES', () => bar(page).getByRole('button', { name: /IYS GAMES/ }).tap()],
      ['CAMERA', 'CAMERA', async () => {
        await page.getByRole('button', { name: 'IYS MENU' }).tap();
        await page.getByRole('button', { name: /CAMERA/ }).tap();
      }],
      ['a game', 'GAMES › CATCHY SNAKE', async () => {
        await bar(page).getByRole('button', { name: /IYS GAMES/ }).tap();
        await page.getByRole('button', { name: 'PLAY CATCHY SNAKE' }).tap();
      }],
      ['OPTIONS over SHOP ALL', 'OPTIONS', async () => {
        await bar(page).getByRole('button', { name: /^SHOP ALL/ }).tap();
        await page.locator('.m-options').tap();
      }],
      ['MY BAG over STORES', 'MY BAG', async () => {
        await bar(page).getByRole('button', { name: /^STORES/ }).tap();
        await bagKey(page).tap();
      }],
    ];
    for (const [name, title, openIt] of overlays) {
      await openIt();
      await expect(page.locator('.m-title'), name).toHaveText(`IYS MOBILE › ${title}`);
      await goHome(name);
    }
    // already home: back to the top
    await page.locator('#m-main').evaluate((m) => m.scrollTo(0, 900));
    await expect.poll(() => page.locator('#m-main').evaluate((m) => m.scrollTop)).toBeGreaterThan(300);
    await homeKey(page).tap();
    await expect.poll(() => page.locator('#m-main').evaluate((m) => m.scrollTop)).toBe(0);
    expect(await sameDoc(page)).toBe(true);
  });
});

test.describe('SEARCH: FRESH PICKS + suggestions in the page (touch)', () => {
  const input = (page: Page) => page.getByRole('combobox', { name: 'SEARCH' });

  test('JOURNEY 1: SEARCH → FRESH PICKS → "hood" → a real hoodie → u pick the size → ADD → MY BAG', async ({ page }) => {
    await session(page);
    await page.goto('/');
    await bar(page).getByRole('button', { name: /^SEARCH/ }).tap();
    await expect(page).toHaveURL(/\/search$/);
    const fresh = page.locator('.m-fresh');
    await expect(fresh.getByRole('heading', { name: /fresh picks 4 u/ })).toBeVisible();
    const cards = fresh.locator('a.m-drop__card');
    await expect(cards).toHaveCount(6);
    for (const a of await cards.all()) {
      const p = byHandle.get((await a.getAttribute('href'))!.replace('/product/', ''))!;
      expect(p).toBeTruthy();
      expect(p.a).toBe(1);
      await expect(a).toContainText(p.t);
      await expect(a.locator('.price__now')).toHaveText(`${fmt(p.p!)} EGP`);
    }
    for (const c of await fresh.locator('.fresh__chip').all()) expect((await c.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await axe(page, '.m-fresh');
    // typing: suggestions replace the picks, right under the box
    const box = input(page);
    await box.tap();
    await box.pressSequentially('hood', { delay: 50 });
    const list = page.getByRole('listbox', { name: 'Suggestions for hood' });
    await expect(list).toBeVisible();
    await expect(box).toHaveAttribute('aria-expanded', 'true');
    await expect(box).toHaveAttribute('aria-controls', (await list.getAttribute('id'))!);
    await expect(fresh).toHaveCount(0);
    const pop = (await page.locator('.suggest__pop').boundingBox())!;
    const form = (await page.locator('.m-search').boundingBox())!;
    expect(pop.y).toBeGreaterThanOrEqual(form.y + form.height - 1);
    expect(pop.x).toBeGreaterThanOrEqual(0);
    expect(pop.x + pop.width).toBeLessThanOrEqual(390);
    const rows = list.locator('.suggest__opt--product');
    expect(await rows.count()).toBeGreaterThan(0);
    const titles = await rows.locator('.suggest__pname').allInnerTexts();
    for (const [i, o] of (await rows.all()).entries()) {
      const name = (await o.getAttribute('aria-label'))!;
      expect(titles[i]!.toLowerCase()).toContain('hood');
      expect(products.some((p) => p.t === titles[i] && name.startsWith(`${p.t}, ${fmt(p.p!)} EGP`)), name).toBe(true);
      expect((await o.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await axe(page, '.m-content');
    // a hoodie u can buy in one size option (no colour step)
    const at = titles.findIndex((t) => products.some((p) => p.t === t && p.a === 1 && !p.o && p.sz?.some((s) => s[1] === 1)));
    expect(at).toBeGreaterThanOrEqual(0);
    await rows.nth(at).tap();
    await expect(page).toHaveURL(/\/product\//);
    const p = byHandle.get(new URL(page.url()).pathname.split('/').pop()!)!;
    expect(p.t).toBe(titles[at]);
    await expect(page.locator('.m-h1--product')).toHaveText(p.t);
    // nothing chosen for u: no size picked (unless there is only one), nothing in the bag
    if ((p.sz?.length ?? 0) > 1) {
      await expect(page.locator('.chip input:checked')).toHaveCount(0);
      await expect(page.locator('.m-add')).toBeDisabled();
    }
    expect(await bagItems(page)).toBe(0);
    const chip = page.locator('.chip:not(.is-out) label').first();
    const sizeLabel = (await chip.innerText()).trim();
    await chip.tap();
    await page.locator('.m-add').tap();
    await expect(bagKey(page)).toHaveAccessibleName('MY BAG: 1 item');
    await bagKey(page).tap();
    const row = page.locator('.bag__row');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(p.t);
    await expect(row).toContainText(sizeLabel);
    await expect(row.getByLabel('Quantity 1')).toBeVisible();
  });

  test('JOURNEY 2: هود → هودي (hoodie), IYS understood → real hoodies at real prices → one opens → IYS home', async ({ page }) => {
    await session(page);
    await page.goto('/');
    await mark(page);
    await bar(page).getByRole('button', { name: /^SEARCH/ }).tap();
    const box = input(page);
    await box.tap();
    await box.pressSequentially('هود', { delay: 60 });
    await expect(page.locator('.suggest__understood')).toContainText('hoodie');
    const term = page.getByRole('option', { name: 'Search for هودي (hoodie)' });
    await expect(term).toBeVisible();
    await expect(box).toHaveAttribute('dir', 'auto');
    for (const n of await page.locator('.suggest__opt--product').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!))) expect(n.toLowerCase()).toContain('hoodie');
    await axe(page, '.suggest__pop');
    await term.tap();
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent('هودي')}`));
    await expect(box).toHaveValue('هودي');
    await expect(page.locator('.m-understood')).toContainText('hoodie');
    const first = page.locator('.m-row').first();
    const title = (await first.locator('.m-row__info > b').innerText()).trim();
    const price = (await first.locator('.price__now').innerText()).trim();
    expect(title.toLowerCase()).toContain('hoodie');
    await first.tap();
    await expect(page).toHaveURL(/\/product\//);
    const p = byHandle.get(new URL(page.url()).pathname.split('/').pop()!)!;
    expect(p.t).toBe(title);
    expect(price).toBe(`${fmt(p.p!)} EGP`);
    await expect(page.locator('.m-h1--product')).toHaveText(p.t);
    await homeKey(page).tap();
    await expect(page.locator('.m-hero')).toBeVisible();
    expect(await sameDoc(page)).toBe(true);
  });

  test('keyboard and screen reader on the phone too: ↓ highlights without rewriting, Esc keeps the text, GO searches what was typed', async ({ page }) => {
    await session(page);
    await page.goto('/search');
    const box = input(page);
    await box.tap();
    await box.pressSequentially('overs', { delay: 40 });
    const list = page.getByRole('listbox');
    await expect(list).toBeVisible();
    await box.press('ArrowDown');
    const first = page.getByRole('option').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(box).toHaveAttribute('aria-activedescendant', (await first.getAttribute('id'))!);
    await expect(box).toHaveValue('overs');
    await expect(page.locator('.m-search [role="status"]')).toContainText(/\d+ suggestions?\./);
    await box.press('Escape');
    await expect(list).toHaveCount(0);
    await expect(box).toHaveValue('overs');
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › SEARCH');
    await page.locator('.m-soft__center').tap(); // GO
    await expect(page).toHaveURL(/q=overs$/);
    await expect(page.locator('.m-meta').first()).toContainText('overs');
    await expect(page.locator('.m-row').first()).toBeVisible();
    // empty the box: FRESH PICKS again, never a "0 results" flash
    await box.fill('');
    await expect(page.locator('.m-fresh')).toBeVisible();
    await expect(page.getByText('0 results')).toHaveCount(0);
  });
});

for (const w of WIDTHS) {
  test(`${w}px: nothing scrolls sideways (document and #m-main) on home, SEARCH (empty, typing, Arabic), GAMES, MENU and MY BAG; touch drags scroll`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 800 });
    await session(page);
    await page.goto('/');
    await expect(page.locator('.m-panel--drop .m-drop__card').first()).toBeVisible();
    const main = page.locator('#m-main');
    const check = async (state: string) => {
      await main.evaluate((m) => m.scrollTo(0, m.scrollHeight)); // lower sections into the layout too
      expect(await sideways(page), `${state} at ${w}px`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${state} at ${w}px`).toBeLessThanOrEqual(w);
      expect(await main.evaluate((m) => m.scrollWidth - m.clientWidth), `${state} at ${w}px`).toBeLessThanOrEqual(1);
      await main.evaluate((m) => m.scrollTo(0, 0));
    };
    await check('home');
    // a finger: up/down scrolls the screen, sideways moves only the strip under it, never the page
    await touchDrag(page, w / 2, 650, 0, -300);
    await expect.poll(() => main.evaluate((m) => m.scrollTop)).toBeGreaterThan(100);
    await main.evaluate((m) => m.scrollTo(0, 0));
    const strip = page.locator('.m-panel--drop ul.m-drop');
    await strip.scrollIntoViewIfNeeded();
    const s = (await strip.boundingBox())!;
    await touchDrag(page, s.x + s.width * 0.75, s.y + s.height / 2, -s.width * 0.6, 0);
    await expect.poll(() => strip.evaluate((u) => u.scrollLeft)).toBeGreaterThan(0);
    const hero = (await page.locator('.m-hero').boundingBox())!;
    await touchDrag(page, hero.x + hero.width * 0.75, hero.y + 30, -w * 0.5, 0);
    expect(await page.evaluate(() => [scrollX, document.querySelector('#m-main')!.scrollLeft])).toEqual([0, 0]);
    // SEARCH, empty and typing
    await bar(page).getByRole('button', { name: /^SEARCH/ }).tap();
    await expect(page.locator('.m-fresh')).toBeVisible();
    await check('SEARCH, empty');
    const box = page.locator('#m-q');
    await box.tap();
    await box.pressSequentially('hood', { delay: 30 });
    await expect(page.getByRole('listbox')).toBeVisible();
    const pop = (await page.locator('.suggest__pop').boundingBox())!;
    expect(pop.x).toBeGreaterThanOrEqual(0);
    expect(pop.x + pop.width).toBeLessThanOrEqual(w);
    expect(await sideways(page), `SEARCH, typing at ${w}px`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
    await box.fill('');
    await box.pressSequentially('هودي bl', { delay: 30 });
    await expect(page.getByRole('option', { name: /^Search for هودي black/ })).toBeVisible();
    expect(await sideways(page), `SEARCH, Arabic at ${w}px`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
    await box.blur();
    // GAMES, MENU, MY BAG
    await bar(page).getByRole('button', { name: /IYS GAMES/ }).tap();
    await expect(page.getByRole('button', { name: 'PLAY CATCHY SNAKE' })).toBeVisible();
    await check('GAMES');
    await page.getByRole('button', { name: 'IYS MENU' }).tap();
    await expect(page.getByRole('button', { name: /FAVS · MY FAVORITES/ })).toBeVisible();
    await check('MENU');
    await bagKey(page).tap();
    await expect(page.locator('.m-title')).toHaveText('IYS MOBILE › MY BAG');
    await check('MY BAG');
  });
}
