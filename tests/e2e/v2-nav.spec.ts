import type { Page } from '@playwright/test';
import { axe, desktop, expect, fmt, index, test } from './fixtures';

/**
 * Navigation + smart search pass (2026-10-27), desktop: MY BAG in the IYS
 * MOBILE shortcut keys' ice, IYS (home) beside MENU, desktop Catchy kept, the
 * desktop ↔ phone switch, FRESH PICKS and live suggestions on Search.
 */
type P = { h: string; t: string; p: number | null; a?: number; o?: string[]; sz?: [string, number, number?, number?][] };
type C = { h: string; t: string | null; n: number };
const products = index.products as P[];
const collections = index.collections as C[];
const byHandle = new Map(products.map((p) => [p.h, p]));
const sized = products.find((p) => p.a === 1 && !p.o && p.sz && p.sz.length > 1 && p.sz.some((s) => s[1] === 1 && s[2]) && /hoodie/i.test(p.t))!;
const size = sized.sz!.find((s) => s[1] === 1 && s[2])!;
const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const bagItems = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.bag') ?? '{"state":{"items":[]}}').state.items.length as number);
const seedBag = (page: Page) =>
  page.addInitScript((item) => {
    if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [item] }, version: 1 }));
  }, { key: `${sized.h}::${size[2]}`, handle: sized.h, title: sized.t, variantId: size[2], variantTitle: size[0], size: size[0], quantity: 1, price: sized.p, image: null });
/** Computed border / face / ink of an element, and of the shortcut keys' ice tokens. */
const iceOf = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const read = (el: Element) => {
      const c = getComputedStyle(el);
      return { border: c.borderTopColor, face: c.backgroundImage, ink: c.color };
    };
    const probe = document.createElement('div');
    probe.style.cssText = 'border:1px solid var(--ice-border);background-image:var(--ice-face);color:var(--ice-ink)';
    document.body.append(probe);
    const tokens = read(probe);
    probe.remove();
    return { el: read(document.querySelector(s)!), tokens };
  }, sel);

test.describe('top strip: MENU · IYS (left), MY BAG (right)', () => {
  test('MY BAG wears the shortcut keys’ glossy ice (same tokens); badge counts; one bag window', async ({ page }) => {
    await desktop(page, `/product/${sized.h}`);
    const bag = page.locator('.topnav--bag');
    const { el, tokens } = await iceOf(page, '.topnav--bag');
    expect(el).toEqual(tokens);
    expect(el.border).toBe('rgb(156, 200, 242)'); // #9cc8f2, the keys' own border
    await expect(bag).toHaveAccessibleName('My Bag, empty');
    await expect(bag.locator('.topnav__badge')).toHaveCount(0);
    const w = browserWin(page);
    await w.locator('.chip label', { hasText: new RegExp(`^${size[0]}$`) }).click();
    await w.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(bag).toHaveAccessibleName('My Bag, 1 item');
    await expect(bag.locator('.topnav__badge')).toHaveText('1');
    await bag.click();
    await bag.click();
    await expect(page.locator('[data-window="bag"]')).toHaveCount(1);
    await expect(page.getByRole('dialog', { name: 'MY BAG' }).locator('.bag__row')).toHaveCount(1);
    // hover / focus states exist and stay readable
    await page.mouse.move(0, 500);
    const before = await bag.evaluate((e) => getComputedStyle(e).boxShadow);
    await bag.hover();
    expect(await bag.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe(before);
    await bag.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    expect(await bag.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('solid');
    await axe(page, '.realbar');
  });

  for (const [w, h] of [
    [1024, 768],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`${w}×${h}: IYS sits right beside MENU, MY BAG top right, the switch centred; nothing overlaps`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await desktop(page);
      await expect.poll(() => page.locator('.realbar img').evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).complete))).toBe(true);
      const box = async (sel: string) => (await page.locator(sel).boundingBox())!;
      const menu = await box('.topnav--menu');
      const home = await box('.topnav--home');
      const sw = await box('.realbar .realswitch');
      const bag = await box('.topnav--bag');
      expect(home.x - (menu.x + menu.width)).toBeGreaterThanOrEqual(2);
      expect(home.x - (menu.x + menu.width)).toBeLessThanOrEqual(10);
      expect(Math.abs(home.y + home.height / 2 - (menu.y + menu.height / 2))).toBeLessThanOrEqual(1);
      expect(home.x + home.width).toBeLessThan(sw.x);
      expect(sw.x + sw.width).toBeLessThan(bag.x);
      expect(Math.abs(sw.x + sw.width / 2 - w / 2)).toBeLessThanOrEqual(2);
      expect(bag.x + bag.width).toBeGreaterThan(w - 12);
      expect(home.y + home.height).toBeLessThanOrEqual(26);
      await expect(page.getByRole('button', { name: 'Go to IYS Retro home' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(w);
    });
  }

  test('the strip never jumps while the IYS marks load (MENU and IYS keep their place)', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route(/\/iys\/brand\/iys-mark(-white)?\.svg$/, async (route) => {
      await held;
      await route.continue();
    });
    // (held images would hold the load event too: wait for the desktop itself instead)
    await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    await expect(page.locator('.realbar img')).toHaveCount(2);
    const boxes = () => page.evaluate(() => ['.topnav--menu', '.topnav--home', '.realbar .realswitch'].map((s) => {
      const r = document.querySelector(s)!.getBoundingClientRect();
      return [r.left, r.right];
    }));
    expect(await page.locator('.realbar img').evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).complete).length)).toBe(0);
    const before = await boxes();
    release();
    await expect.poll(() => page.locator('.realbar img').evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
    expect(await boxes()).toEqual(before);
  });

  test('IYS from a product: IYS INTERNET home in the same window, in front; other windows, bag, favorites and settings untouched; Back returns', async ({ page }) => {
    await seedBag(page);
    await desktop(page, `/product/${sized.h}`);
    const w = browserWin(page);
    await w.getByRole('button', { name: `Add ${sized.t} to Favorites` }).click();
    await page.locator('.topnav--bag').click();
    await expect(page.locator('[data-window="bag"]')).toHaveClass(/is-active/);
    const keep = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => /icons|preferences|favorites|bag|catchy/.test(k))));
    await page.getByRole('button', { name: 'Go to IYS Retro home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(w.locator('#portal-drop-title')).toContainText('JUST DROPPED');
    await expect(w).toHaveClass(/is-active/);
    await expect(page.locator('[data-window="internet"]')).toHaveCount(1);
    await expect(page.locator('[data-window="bag"]')).toHaveCount(1); // still open, just behind
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => /icons|preferences|favorites|bag|catchy/.test(k))))).toEqual(keep);
    expect(await bagItems(page)).toBe(1);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/product/${sized.h}$`));
    await expect(w.getByRole('heading', { level: 1 })).toHaveText(sized.t);
  });

  test('MY BAG still loading, then IYS: the bag arriving late never pulls itself back in front of IYS INTERNET', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route(/\/assets\/Bag-[\w-]+\.js$/, async (route) => {
      await held;
      await route.continue();
    });
    await seedBag(page);
    await desktop(page, `/product/${sized.h}`);
    await page.locator('.topnav--bag').click();
    await expect(page.locator('[data-window="bag"]')).toContainText('Loading MY BAG');
    await page.getByRole('button', { name: 'Go to IYS Retro home' }).click();
    const w = browserWin(page);
    await expect(w).toHaveClass(/is-active/);
    release();
    await expect(page.locator('[data-window="bag"] .bag__row')).toHaveCount(1);
    await page.waitForTimeout(300); // the late window's open frame has passed
    await expect(w).toHaveClass(/is-active/);
    await expect(page.locator('[data-window="bag"]')).not.toHaveClass(/is-active/);
    const z = await page.evaluate(() => ['internet', 'bag'].map((id) => Number(getComputedStyle(document.querySelector(`[data-window="${id}"]`)!.closest('[style*="z-index"]')!).zIndex)));
    expect(z[0]).toBeGreaterThan(z[1]!);
    await expect(w.locator('#portal-drop-title')).toContainText('JUST DROPPED');
  });

  test('IYS INTERNET arriving late never takes the focus back from the top strip; a window u open still gets it', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route(/\/assets\/Browser-[\w-]+\.js$/, async (route) => {
      await held;
      await route.continue();
    });
    // (not desktop(): that waits for the real IYS INTERNET, held back here)
    await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
    await page.goto('/');
    await expect(browserWin(page)).toContainText('Loading'); // its "Loading IYS INTERNET..." window is up, the real one is on its way
    const sw = page.getByRole('button', { name: /IYS 2006.*REAL IYS.*switch to the real In Your Shoe store/ });
    await sw.focus();
    release();
    await expect(browserWin(page).locator('#portal-drop-title')).toBeVisible();
    await page.waitForTimeout(300); // the late window's open frame has passed
    await expect(sw).toBeFocused();
    await expect(browserWin(page)).toHaveClass(/is-active/);
    // opening a window still puts u in it
    await page.getByRole('button', { name: 'Open IYS Messenger' }).click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[data-window]')?.getAttribute('data-window'))).toBe('messenger');
  });

  test('IYS brings IYS INTERNET back when minimized, after DESKTOP, and reopens it when closed: always one window', async ({ page }) => {
    await desktop(page, '/stores');
    const w = browserWin(page);
    const home = page.getByRole('button', { name: 'Go to IYS Retro home' });
    await w.getByRole('button', { name: /^Minimize/ }).click();
    await expect(w).toBeHidden();
    await home.click();
    await expect(w).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    const desk = page.getByRole('button', { name: /^DESKTOP:/ });
    await desk.click();
    await expect(w).toBeHidden();
    await home.click();
    await expect(w).toBeVisible();
    await expect(desk).toHaveAttribute('aria-pressed', 'false');
    await w.getByRole('button', { name: /^Close/ }).click();
    await expect(page.locator('[data-window="internet"]')).toHaveCount(0);
    await home.click();
    await expect(page.locator('[data-window="internet"]')).toHaveCount(1);
    await expect(w.locator('#portal-drop-title')).toBeVisible();
  });

  test('IYS when already home: back to the top of the home page', async ({ page }) => {
    await desktop(page);
    const scroller = browserWin(page).locator('.browser-page');
    await expect(browserWin(page).locator('#portal-drop-title')).toBeVisible();
    await scroller.evaluate((el) => el.scrollTo(0, 1200));
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
    await page.getByRole('button', { name: 'Go to IYS Retro home' }).click();
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBe(0);
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('desktop Catchy stays (JOURNEYS 6 and 7)', () => {
  test('JOURNEY 6: Catchy is on the desktop, reacts to a poke, and still works after MENU, MY BAG and IYS home', async ({ page }) => {
    await desktop(page);
    const pet = page.locator('.cpet');
    await expect(pet).toHaveCount(1);
    await expect(pet).toBeVisible();
    const poke = page.getByRole('button', { name: 'Catchy, IYS desktop buddy' });
    await poke.click();
    await expect(pet).toHaveAttribute('data-catchy-state', /happy|wake/);
    await expect(page.locator('.cpet__bubble')).toBeVisible();
    await page.getByRole('button', { name: 'MENU', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.locator('.topnav--bag').click();
    await page.getByRole('button', { name: 'Go to IYS Retro home' }).click();
    await expect(page.locator('.cpet')).toHaveCount(1);
    await page.waitForTimeout(3200); // his last line clears
    await poke.click();
    await expect(page.locator('.cpet__bubble')).toBeVisible();
  });

  test('JOURNEY 7: desktop → phone → desktop: Catchy only on the desktop, one of everything, the right nav each time', async ({ page }) => {
    await desktop(page);
    await expect(page.locator('.cpet')).toHaveCount(1);
    await expect(page.locator('.topnav--home')).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.m-shell')).toBeVisible();
    await expect(page.locator('.cpet, .catchy-layer, .cpet__bubble, .cpet__menu')).toHaveCount(0);
    await expect(page.locator('.realbar')).toHaveCount(0);
    const keys = page.getByRole('navigation', { name: 'IYS MOBILE bar' }).locator('.m-bar__key');
    expect((await keys.allInnerTexts()).map((l) => l.trim())).toEqual(['SHOP ALL', 'SEARCH', 'GAMES', 'STORES', 'MSG']);
    await expect(page.locator('.m-topkey--home')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('.m-shell')).toHaveCount(0);
    await expect(page.locator('.cpet')).toHaveCount(1);
    await expect(page.locator('.topnav--home')).toHaveCount(1);
    await expect(page.locator('.m-topkey--home, .m-bar')).toHaveCount(0);
  });
});

test.describe('Search: FRESH PICKS + suggestions (desktop)', () => {
  const box = (page: Page) => browserWin(page).getByRole('combobox', { name: /Search/ });
  const options = (page: Page) => page.getByRole('option');

  test('empty box: FRESH PICKS are real products at real prices; categories are IYS’s own with real counts; clearing comes back to them', async ({ page }) => {
    await desktop(page, '/search');
    const fresh = browserWin(page).locator('.fresh');
    await expect(fresh.getByRole('heading', { name: /FRESH PICKS 4 U/ })).toBeVisible();
    const cards = fresh.locator('.fresh__grid a');
    await expect(cards).toHaveCount(6);
    for (const a of await cards.all()) {
      const h = (await a.getAttribute('href'))!.replace('/product/', '');
      const p = byHandle.get(h)!;
      expect(p, h).toBeTruthy();
      expect(p.a).toBe(1);
      await expect(a).toContainText(p.t);
      await expect(a.locator('.price__now')).toHaveText(`${fmt(p.p!)} EGP`);
    }
    const chips = fresh.locator('.fresh__chip');
    expect(await chips.count()).toBeGreaterThanOrEqual(6);
    for (const c of await chips.all()) {
      const h = (await c.getAttribute('href'))!.replace('/collections/', '');
      const col = collections.find((x) => x.h === h)!;
      await expect(c).toContainText(`(${fmt(col.n)})`);
    }
    await axe(page, '.fresh');
    // search, then empty the box: FRESH PICKS again, never a "did not match" flash
    await box(page).fill('hoodie');
    await box(page).press('Enter');
    await expect(page).toHaveURL(/q=hoodie/);
    await expect(browserWin(page).locator('.results__list li').first()).toBeVisible();
    await expect(fresh).toHaveCount(0);
    await box(page).fill('');
    await expect(browserWin(page).locator('.fresh')).toBeVisible();
    await expect(browserWin(page).getByText('did not match')).toHaveCount(0);
  });

  test('hoo → HOODIES + real hoodies; ↓ ↑ never rewrite what was typed; Enter opens the highlighted product (no size, nothing in the bag)', async ({ page }) => {
    await desktop(page, '/search');
    const input = box(page);
    await input.click();
    await input.pressSequentially('hoo', { delay: 40 });
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(options(page).first()).toHaveAccessibleName('HOODIES, 126 products');
    const names = await options(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!));
    for (const n of names.slice(1)) expect(n.toLowerCase()).toContain('hoodie');
    await input.press('ArrowDown');
    await input.press('ArrowDown');
    await expect(input).toHaveValue('hoo');
    const second = options(page).nth(1);
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(input).toHaveAttribute('aria-activedescendant', (await second.getAttribute('id'))!);
    await input.press('ArrowUp');
    await expect(options(page).first()).toHaveAttribute('aria-selected', 'true');
    await input.press('ArrowDown');
    const pick = (await second.getAttribute('aria-label'))!.split(',')[0]!;
    await input.press('Enter');
    await expect(browserWin(page).getByRole('heading', { level: 1 })).toHaveText(pick);
    await expect(page).toHaveURL(/\/product\//);
    await expect(browserWin(page).locator('.chip input:checked')).toHaveCount(0);
    expect(await bagItems(page)).toBe(0);
  });

  test('Escape closes and keeps the text; Enter with nothing highlighted searches what was typed; Tab moves on', async ({ page }) => {
    await desktop(page, '/search');
    const input = box(page);
    await input.click();
    await input.pressSequentially('overs', { delay: 30 });
    await expect(page.getByRole('listbox')).toBeVisible();
    await input.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(input).toHaveValue('overs');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(browserWin(page)).toBeVisible(); // Esc never closed the window
    await input.press('ArrowDown');
    await expect(page.getByRole('listbox')).toBeVisible();
    await input.press('Tab');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(input).not.toBeFocused();
    await input.click();
    await input.press('End');
    await input.pressSequentially('ized', { delay: 30 });
    await input.press('Enter');
    await expect(page).toHaveURL(/q=oversized$/);
    await expect(browserWin(page).locator('.results__meta')).toContainText('oversized');
  });

  test('mouse: a click on a suggestion lands (no blur race); a suggested search runs; a click outside closes', async ({ page }) => {
    await desktop(page, '/search');
    const input = box(page);
    await input.click();
    await input.pressSequentially('overs', { delay: 30 });
    await page.getByRole('option', { name: 'Search for oversized hoodie' }).click();
    await expect(page).toHaveURL(/q=oversized(\+|%20)hoodie/);
    await expect(input).toHaveValue('oversized hoodie');
    await input.click();
    await input.press('End');
    await input.pressSequentially(' b', { delay: 30 });
    await expect(page.getByRole('listbox')).toBeVisible();
    await browserWin(page).locator('.search__title').click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await input.click();
    await input.fill('pj');
    await page.getByRole('option', { name: /^FLUFFY PJOYS, [\d,]+ products$/ }).click();
    await expect(page).toHaveURL(/\/collections\/fluffy-pjoys$/);
  });

  test('Arabic: هود → هودي (hoodie), IYS understood, real hoodies; choosing the word runs the Arabic search', async ({ page }) => {
    await desktop(page, '/search');
    const input = box(page);
    await input.click();
    await input.pressSequentially('هود', { delay: 60 });
    const pop = browserWin(page).locator('.suggest__pop');
    await expect(pop.locator('.suggest__understood')).toContainText('hoodie');
    const term = options(page).first();
    await expect(term).toHaveAccessibleName('Search for هودي (hoodie)');
    for (const n of (await options(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!))).slice(2)) expect(n.toLowerCase()).toContain('hoodie');
    await axe(page, '.suggest__pop');
    await term.click();
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent('هودي')}`));
    await expect(browserWin(page).locator('.results__understood')).toContainText('hoodie');
  });

  test('honest misses: nonsense says so with a way out; a typo offers the main search’s closest matches', async ({ page }) => {
    await desktop(page, '/search');
    const input = box(page);
    await input.click();
    await input.pressSequentially('zzzq', { delay: 30 });
    const none = browserWin(page).locator('.suggest__none');
    await expect(none).toContainText('No exact matches');
    await expect(none.getByRole('link', { name: /SHOP ALL/ })).toBeVisible();
    await input.fill('ceral');
    await expect(page.getByRole('group', { name: 'CLOSEST MATCHES' })).toBeVisible();
    for (const n of await options(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!))) expect(n.toLowerCase()).toContain('cereal');
  });
});
