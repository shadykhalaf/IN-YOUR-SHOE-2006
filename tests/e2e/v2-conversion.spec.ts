import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { axe, desktop, expect, index, test } from './fixtures';

/**
 * Conversion pass, desktop: MENU + MY BAG up top, JUST DROPPED in view,
 * official size guide, free-shipping progress, the escape route, IYS MAIL,
 * snapshot safety and a returning shopper. External calls are stubbed: no
 * real checkout, no real email, no live Shopify.
 */
type P = { h: string; t: string; a?: number; o?: string[]; p?: number; sz?: [string, number, number?, number?][]; qv?: [number, number] };
const products = index.products as P[];
const charts = JSON.parse(readFileSync(new URL('../../src/data/size-charts.generated.json', import.meta.url), 'utf8')) as { products: Record<string, string[]>; notPublic: string[] };
const inStockSized = (p: P) => Boolean(p.sz && p.sz.length > 1 && p.a === 1 && !p.o && p.sz.some((s) => s[1] === 1 && s[2]));
const withChart = products.find((p) => inStockSized(p) && charts.products[p.h])!;
const chartSize = withChart.sz!.find((s) => s[1] === 1 && s[2])!;
const noChart = products.find((p) => inStockSized(p) && !charts.products[p.h] && !charts.notPublic.includes(p.h));
const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const bagLines = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.bag') ?? '{"state":{"items":[]}}').state.items.map((i: { variantId: number; quantity: number }) => [i.variantId, i.quantity]));

async function stubStore(page: Page) {
  const hits: string[] = [];
  await page.route('https://inyourshoe.com/cart/**', (r) => {
    hits.push(r.request().url());
    return r.fulfill({ status: 200, contentType: 'text/html', body: '<title>IYS (test stub)</title>' });
  });
  return hits;
}
/** Every request to the optional live endpoints (there must be none in the default build). */
function watchLive(page: Page) {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (/\/api\/(commerce|rewards)/.test(r.url())) calls.push(r.url());
  });
  return calls;
}

test.describe('top strip: MENU (left) and MY BAG (right)', () => {
  test('MENU opens the one IYS menu from the top; Escape closes it and returns focus', async ({ page }) => {
    await desktop(page);
    const menuBtn = page.locator('.topnav--menu');
    const bagBtn = page.locator('.topnav--bag');
    const vw = page.viewportSize()!.width;
    const m = (await menuBtn.boundingBox())!;
    const b = (await bagBtn.boundingBox())!;
    expect(m.x).toBeLessThan(vw * 0.25);
    expect(b.x + b.width).toBeGreaterThan(vw * 0.75);
    expect(m.y).toBeLessThan(40);
    await expect(bagBtn).toHaveAccessibleName('My Bag, empty');
    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#iys-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /IYS MAIL/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(menuBtn).toBeFocused();
    await axe(page, '.realbar');
  });
});

test.describe('JOURNEY B: desktop customer (top MENU, bottom DESKTOP, top MY BAG)', () => {
  test('DESKTOP tucks every window away and brings the same ones back, state and bag intact', async ({ page }) => {
    const v = withChart.sz!.find((s) => s[1] === 1 && s[2])!;
    await page.addInitScript((item) => {
      if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [item] }, version: 1 }));
    }, { key: `${withChart.h}::${v[2]}`, handle: withChart.h, title: withChart.t, variantId: v[2], variantTitle: v[0], size: v[0], quantity: 1, price: 100, image: null });
    await desktop(page, `/product/${withChart.h}`);
    // one menu (top left), one show-desktop (bottom left): two different jobs
    await expect(page.getByRole('button', { name: 'MENU', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'IYS menu' })).toHaveCount(0);
    const desk = page.getByRole('button', { name: /^DESKTOP:/ });
    const db = (await desk.boundingBox())!;
    expect(db.x).toBeLessThan(20);
    expect(db.y).toBeGreaterThan(page.viewportSize()!.height - 50);
    // open more windows from the top-left MENU, and write half a mail
    await page.getByRole('button', { name: 'MENU', exact: true }).click();
    await page.locator('#iys-menu').getByRole('menuitem', { name: /IYS MAIL/ }).click();
    const mail = page.locator('[data-window="mail"]');
    await mail.getByLabel('Message').fill('half-written draft');
    await page.locator('.topnav--bag').click();
    const bag = page.getByRole('dialog', { name: 'MY BAG' });
    await expect(bag.locator('.bag__row')).toHaveCount(1);
    const open = await page.locator('[data-window]:visible').count();
    expect(open).toBeGreaterThanOrEqual(3);

    await desk.click();
    await expect(desk).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-window]:visible')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /IYS INTERNET/ }).first()).toBeVisible(); // desktop icons + wallpaper
    await expect(page.locator('.topnav--bag')).toHaveAccessibleName('My Bag, 1 item');

    await desk.click();
    await expect(desk).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-window]:visible')).toHaveCount(open);
    await expect(bag).toBeVisible(); // the window that was active comes back on top
    await expect(mail.getByLabel('Message')).toHaveValue('half-written draft');
    await expect(page.locator('[data-window="internet"]').getByRole('heading', { level: 1 })).toHaveText(withChart.t);

    // after showing the desktop, a single window can also come back from its taskbar button
    await desk.click();
    await page.getByRole('navigation', { name: 'Taskbar' }).getByRole('button', { name: /IYS MAIL/ }).click();
    await expect(mail).toBeVisible();
    await expect(mail.getByLabel('Message')).toHaveValue('half-written draft');
    await expect(desk).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.bag')!).state.items.length)).toBe(1);
  });

  test('top MENU works over a maximized window and from the keyboard', async ({ page }) => {
    await desktop(page);
    await page.locator('[data-window="internet"]').getByRole('button', { name: /^Maximize/ }).click();
    const menuBtn = page.getByRole('button', { name: 'MENU', exact: true });
    await menuBtn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#iys-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menuBtn).toBeFocused();
    await menuBtn.click();
    await expect(page.locator('#iys-menu')).toBeVisible();
  });
});

test.describe('JOURNEY A: first-time shopper (desktop)', () => {
  test('sees JUST DROPPED without scrolling → product → official size guide → size → bag → shipping progress → checkout', async ({ page }) => {
    const hits = await stubStore(page);
    const live = watchLive(page);
    await desktop(page);
    const b = browserWin(page);
    const drop = b.locator('#portal-drop-title');
    await expect(drop).toContainText('JUST DROPPED');
    // the first JUST DROPPED products peek above the fold of the browser window
    const scroller = b.locator('.browser-page');
    const viewBox = (await scroller.boundingBox())!;
    const firstCard = b.locator('section:has(#portal-drop-title) .strip li').first();
    expect((await firstCard.boundingBox())!.y).toBeLessThan(viewBox.y + viewBox.height);

    await page.goto(`/product/${withChart.h}`);
    await expect(b.getByRole('heading', { level: 1 })).toHaveText(withChart.t);
    await b.getByRole('button', { name: 'SIZE GUIDE' }).click();
    const guide = page.locator('[data-window="sizeguide"]');
    await expect(guide).toBeVisible();
    await expect(guide.locator('img').first()).toHaveAttribute('src', /^https:\/\/(inyourshoe\.com\/cdn|cdn\.shopify\.com)\//);
    await expect(guide).toContainText('Official IYS size chart');
    // the guide never covers the size chips
    const chips = (await b.locator('.variants').boundingBox())!;
    const g = (await guide.boundingBox())!;
    expect(g.x >= chips.x + chips.width || g.x + g.width <= chips.x || g.y >= chips.y + chips.height || g.y + g.height <= chips.y).toBe(true);

    await b.locator('.chip label', { hasText: new RegExp(`^${chartSize[0]}$`) }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(page.locator('.topnav--bag')).toHaveAccessibleName('My Bag, 1 item');
    await page.locator('.topnav--bag').click();
    const bag = page.getByRole('dialog', { name: 'MY BAG' });
    await expect(bag.locator('.bag__row')).toHaveCount(1);
    if ((withChart.p ?? 0) <= 3999) await expect(bag.locator('.bagx-ship')).toContainText(/MORE 4 FREE SHIPPING\*|JUST A LIL MORE/);
    await expect(bag.locator('.bagx-note').first()).toContainText('IYS confirms shipping at checkout');
    await bag.getByRole('button', { name: /CHECKOUT xx/ }).click();
    await expect(page).toHaveURL(`https://inyourshoe.com/cart/${chartSize[2]}:1`);
    expect(hits).toEqual([`https://inyourshoe.com/cart/${chartSize[2]}:1`]);
    expect(live).toEqual([]);
  });

  test('no official chart → says so, never estimates, and offers to ask IYS (prefilled IYS MAIL)', async ({ page }) => {
    test.skip(!noChart, 'every in-stock sized product in this snapshot has an official chart');
    await desktop(page, `/product/${noChart!.h}`);
    await browserWin(page).getByRole('button', { name: 'SIZE GUIDE' }).click();
    const guide = page.locator('[data-window="sizeguide"]');
    await expect(guide).toContainText('hasn’t published a size chart');
    await expect(guide.locator('img')).toHaveCount(0);
    await guide.getByRole('button', { name: 'ASK IYS ABOUT SIZING' }).click();
    const mail = page.locator('[data-window="mail"]');
    await expect(mail.getByLabel('Topic:')).toHaveValue('Product question');
    await expect(mail.getByLabel('Subject:')).toHaveValue(`Sizing: ${noChart!.t}`.slice(0, 120));
  });
});

test.describe('JOURNEY C: Arabic search (desktop)', () => {
  test('هودي finds real hoodies and says what it understood', async ({ page }) => {
    await desktop(page, `/search?q=${encodeURIComponent('هودي')}`);
    const b = browserWin(page);
    await expect(b.locator('.results__understood')).toContainText('hoodie');
    const first = b.locator('.results .card, .results li').first();
    await expect(first).toBeVisible();
    await expect(first).toContainText(/hood/i);
  });
});

test.describe('JOURNEY D: frustrated customer', () => {
  test('one dead end is ignored; a second offers REAL IYS once, carrying the exact bag', async ({ page }) => {
    const hits = await stubStore(page);
    const v = withChart.sz!.find((s) => s[1] === 1 && s[2])!;
    await page.addInitScript((item) => {
      if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [item] }, version: 1 }));
    }, { key: `${withChart.h}::${v[2]}`, handle: withChart.h, title: withChart.t, variantId: v[2], variantTitle: v[0], size: v[0], quantity: 2, price: 100, image: null });
    await desktop(page, '/this-page-does-not-exist');
    await expect(browserWin(page).getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(page.getByText('COMPUTER SAYING NO? :(')).toHaveCount(0);
    await page.goto('/another-missing-page');
    await expect(page.getByText('COMPUTER SAYING NO? :(')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('ur bag (2 items) comes with u.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'NAH I’M GOOD' })).toBeFocused();
    await page.getByRole('button', { name: 'TAKE ME TO REAL IYS ↗' }).click();
    const expected = `https://inyourshoe.com/cart/${v[2]}:2?storefront=true`;
    await expect(page).toHaveURL(expected);
    expect(hits).toEqual([expected]);
  });

  test('“NAH I’M GOOD” means it: no second prompt this session', async ({ page }) => {
    const notFound = browserWin(page).getByRole('heading', { level: 1 });
    await desktop(page, '/missing-a');
    await expect(notFound).toBeVisible();
    await page.goto('/missing-b');
    await page.getByRole('button', { name: 'NAH I’M GOOD' }).click({ timeout: 15_000 });
    await page.goto('/missing-c');
    await expect(notFound).toBeVisible();
    await page.goto('/missing-d');
    await expect(notFound).toBeVisible();
    await page.waitForTimeout(4000);
    await expect(page.getByText('COMPUTER SAYING NO? :(')).toHaveCount(0);
  });
});

test.describe('JOURNEY E (escape route): repeated presses that do nothing', () => {
  /** Four quick real presses on the same spot (a disabled ADD TO BAG never even gets a click event). */
  async function rage(page: Page, x: number, y: number, n = 4) {
    for (let i = 0; i < n; i++) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(140);
    }
  }
  const dialog = (page: Page) => page.getByText('COMPUTER SAYING NO? :(');

  test('pressing the disabled ADD TO BAG 4× → the friendly way out; NAH I’M GOOD → never again this session', async ({ page }) => {
    await desktop(page, `/product/${withChart.h}`);
    const add = browserWin(page).getByRole('button', { name: /Choose size/i });
    await expect(add).toBeDisabled();
    const b = (await add.boundingBox())!;
    await rage(page, b.x + b.width / 2, b.y + b.height / 2);
    await expect(dialog(page)).toBeVisible({ timeout: 6000 });
    await expect(page.getByText('WANNA SHOP THE EASY WAY?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'NAH I’M GOOD' })).toBeFocused();
    await page.getByRole('button', { name: 'NAH I’M GOOD' }).click();
    await expect(dialog(page)).toHaveCount(0);
    await rage(page, b.x + b.width / 2, b.y + b.height / 2, 6);
    await page.waitForTimeout(2500);
    await expect(dialog(page)).toHaveCount(0);
  });

  test('presses that DO something never trigger it: quantity +, MENU open/close, typing', async ({ page }) => {
    await desktop(page, `/product/${withChart.h}`);
    const w = browserWin(page);
    const plus = (await w.getByRole('button', { name: 'Increase quantity' }).boundingBox())!;
    await rage(page, plus.x + plus.width / 2, plus.y + plus.height / 2, 6);
    const menu = (await page.getByRole('button', { name: 'MENU', exact: true }).boundingBox())!;
    await rage(page, menu.x + menu.width / 2, menu.y + menu.height / 2, 4);
    await page.goto('/search');
    await w.getByRole('combobox', { name: /Search/ }).first().fill('hoodie');
    await page.waitForTimeout(2500);
    await expect(dialog(page)).toHaveCount(0);
  });

  test('fresh session: rage → TAKE ME TO REAL IYS carries the exact bag to the real store', async ({ page }) => {
    const hits = await stubStore(page);
    const v = withChart.sz!.find((s) => s[1] === 1 && s[2])!;
    await page.addInitScript((item) => {
      if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [item] }, version: 1 }));
    }, { key: `${withChart.h}::${v[2]}`, handle: withChart.h, title: withChart.t, variantId: v[2], variantTitle: v[0], size: v[0], quantity: 3, price: 100, image: null });
    await desktop(page, `/product/${withChart.h}`);
    const add = (await browserWin(page).getByRole('button', { name: /Choose size/i }).boundingBox())!;
    await rage(page, add.x + add.width / 2, add.y + add.height / 2);
    await expect(page.getByText('ur bag (3 items) comes with u.')).toBeVisible({ timeout: 6000 });
    await page.getByRole('button', { name: 'TAKE ME TO REAL IYS ↗' }).click();
    const expected = `https://inyourshoe.com/cart/${v[2]}:3?storefront=true`;
    await expect(page).toHaveURL(expected);
    expect(hits).toEqual([expected]);
    await page.goBack();
    await expect(page.locator('.topnav--bag')).toHaveAccessibleName('My Bag, 3 items'); // the local bag is kept
  });

  test('no frustration needed: MENU › OPEN REAL IYS ↗ (same bag handoff)', async ({ page }) => {
    await stubStore(page);
    await page.route('https://inyourshoe.com/', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>REAL IYS (test stub)</title>' }));
    await desktop(page);
    await page.getByRole('button', { name: 'MENU', exact: true }).click();
    await page.locator('#iys-menu').getByRole('menuitem', { name: /OPEN REAL IYS/ }).click();
    await expect(page).toHaveURL('https://inyourshoe.com/');
  });
});

test.describe('JOURNEYS C + D: real product carousels (product page + MY BAG)', () => {
  const hoodie = products.find((p) => /hoodie/i.test(p.t) && inStockSized(p))!;
  const priceOf = new Map(products.map((p) => [p.h, p.p]));

  test('MORE LIKE THIS sits below ADD TO BAG, scrolls inside itself, and every card is a real product at its real price', async ({ page }) => {
    await desktop(page, `/product/${hoodie.h}`);
    const w = browserWin(page);
    const reco = w.getByRole('region', { name: /MORE LIKE THIS/ });
    await expect(reco).toBeVisible();
    expect((await reco.boundingBox())!.y).toBeGreaterThan((await w.getByRole('button', { name: /Choose size/i }).boundingBox())!.y);
    const cards = reco.locator('.reco__card');
    expect(await cards.count()).toBeGreaterThanOrEqual(6);
    for (const card of (await cards.all()).slice(0, 6)) {
      const h = (await card.getAttribute('href'))!.replace('/product/', '');
      expect(h).not.toBe(hoodie.h);
      expect(priceOf.has(h), h).toBe(true);
      await expect(card.locator('.price')).toContainText(new Intl.NumberFormat('en-US').format(priceOf.get(h)!));
    }
    const track = reco.locator('.reco__track');
    await reco.getByRole('button', { name: /^More products/ }).click();
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(0);
    await reco.getByRole('button', { name: /^Previous products/ }).click();
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBe(0);
    // keyboard
    await track.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(0);
    // open one: the real product page, its title and price
    const first = cards.first();
    const target = (await first.getAttribute('href'))!.replace('/product/', '');
    await first.click();
    await expect(page).toHaveURL(new RegExp(`/product/${target}$`));
    await expect(w.getByRole('heading', { level: 1 })).toHaveText(products.find((p) => p.h === target)!.t);
  });

  test('MY BAG ideas: no size is ever preselected; + ADD only after picking one; it joins the same bag', async ({ page }) => {
    const v = hoodie.sz!.find((s) => s[1] === 1 && s[2])!;
    await page.addInitScript((item) => {
      if (!localStorage.getItem('iys2006.bag')) localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [item] }, version: 1 }));
    }, { key: `${hoodie.h}::${v[2]}`, handle: hoodie.h, title: hoodie.t, variantId: v[2], variantTitle: v[0], size: v[0], quantity: 1, price: hoodie.p, image: null });
    await desktop(page);
    await page.locator('.topnav--bag').click();
    const bag = page.getByRole('dialog', { name: 'MY BAG' });
    const reco = bag.getByRole('region', { name: /U MIGHT ALSO LIKE/ });
    await expect(reco).toBeVisible();
    expect(await reco.locator('.reco__item').count()).toBeGreaterThanOrEqual(6);
    await expect(reco.locator('.bagx-idea__sizes [aria-pressed="true"]')).toHaveCount(0);
    const idea = reco.locator('.reco__item').filter({ has: page.locator('.bagx-idea__sizes') }).first();
    await expect(idea.getByRole('button', { name: /^\+ ADD/ })).toHaveCount(0);
    await idea.locator('.bagx-idea__sizes button:not([disabled])').first().click();
    await idea.getByRole('button', { name: /^\+ ADD/ }).click();
    await expect(bag.locator('.bag__row')).toHaveCount(2);
    const lines = await page.evaluate(() => JSON.parse(localStorage.getItem('iys2006.bag')!).state.items.map((i: { quantity: number }) => i.quantity));
    expect(lines).toEqual([1, 1]);
    await expect(page.locator('.topnav--bag')).toHaveAccessibleName('My Bag, 2 items');
  });
});

test.describe('JOURNEY G (loading): photos load in the ADD TO BAG language', () => {
  test('a slow photo shows the same flying-file + coral bar as ADD TO BAG; it clears when the photo arrives; a failed photo never spins forever', async ({ page }) => {
    // hold every product photo until released (the fixture normally aborts them)
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const tiny = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
    await page.route(/^https:\/\/(cdn\.shopify\.com|inyourshoe\.com\/cdn)\//, async (r) => {
      await gate;
      await r.fulfill({ status: 200, contentType: 'image/png', body: tiny });
    });
    await desktop(page, `/product/${withChart.h}`);
    const w = browserWin(page);
    const galleryLoader = w.locator('.gallery__stage .imgload--gallery');
    await expect(galleryLoader).toBeVisible();
    await expect(galleryLoader).toContainText('Copying photo...');
    await expect.poll(() => galleryLoader.evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);
    await expect(w.locator('.reco .imgload--card').first()).toBeAttached();
    const fly = await galleryLoader.locator('.fly-file').evaluate((e) => getComputedStyle(e).animationName);
    // the ADD TO BAG transfer dialog uses the very same animation + bar
    await w.locator('.chip label', { hasText: new RegExp(`^${chartSize[0]}$`) }).click();
    await w.getByRole('button', { name: 'ADD TO BAG' }).click();
    const transferFly = await page.locator('.transfer .fly-file').evaluate((e) => getComputedStyle(e).animationName);
    expect(fly).toBe('iys-fly');
    expect(transferFly).toBe(fly);
    await expect(galleryLoader.locator('.progress .progress__bar')).toBeAttached();
    release();
    await expect(w.locator('.gallery__stage .imgload')).toHaveCount(0);
    await expect(w.locator('.gallery__stage img')).toBeVisible();
  });
  test('a photo that never arrives stops loading after 25 s in view and offers Retry (no endless loader)', async ({ page }) => {
    await page.clock.install();
    await page.route(/^https:\/\/(cdn\.shopify\.com|inyourshoe\.com\/cdn)\//, () => {}); // never answers
    await desktop(page, `/product/${withChart.h}`);
    const stage = browserWin(page).locator('.gallery__stage');
    await expect(stage.locator('.imgload--gallery')).toBeAttached();
    // advance the fake clock in steps: the in-view callback may land after the first jump on a busy machine
    await expect
      .poll(async () => {
        await page.clock.fastForward(5_000);
        return stage.textContent();
      }, { timeout: 20_000 })
      .toContain('IMAGE COULD NOT LOAD :(');
    await expect(stage.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(stage.locator('.imgload')).toHaveCount(0);
  });
  test('a photo that fails shows the honest IMAGE COULD NOT LOAD box, not a loader', async ({ page }) => {
    await desktop(page, `/product/${withChart.h}`); // fixture: every CDN photo fails
    const w = browserWin(page);
    await expect(w.locator('.gallery__stage')).toContainText('IMAGE COULD NOT LOAD :(');
    await expect(w.locator('.gallery__stage .imgload')).toHaveCount(0);
  });
});

test.describe('JOURNEY F: IYS MAIL (mocked delivery, nothing is emailed)', () => {
  async function openMail(page: Page) {
    await desktop(page);
    await page.locator('.topnav--menu').click();
    await page.locator('#iys-menu').getByRole('menuitem', { name: /IYS MAIL/ }).click();
    const mail = page.locator('[data-window="mail"]');
    await mail.getByLabel('From:').fill('shopper@example.com');
    await mail.getByLabel('Name:').fill('Test Shopper');
    await mail.getByLabel('Topic:').selectOption('Delivery');
    await mail.getByLabel('Subject:').fill('Where is my order?');
    await mail.getByLabel('Message').fill('Hi IYS, this is an automated test.');
    return mail;
  }
  test('a crashed mail function is retried automatically (same draft key) until it confirms → MAIL SENT', async ({ page }) => {
    const keys: string[] = [];
    await page.route('**/api/support-email', (r) => {
      keys.push(r.request().headers()['x-idempotency-key'] ?? '');
      // what Vercel answers when a function cannot start: plain text 500
      return keys.length === 1 ? r.fulfill({ status: 500, contentType: 'text/plain', body: 'A server error has occurred FUNCTION_INVOCATION_FAILED' }) : r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    const mail = await openMail(page);
    await mail.getByRole('button', { name: 'SEND MAIL :)' }).click();
    await expect(mail).toContainText('MAIL SENT :) xo');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(keys[1]).toBe(keys[0]);
  });
  test('every attempt fails → MAIL NOT SENT with the reason, draft kept; TRY AGAIN reuses the key; never a false "sent"', async ({ page }) => {
    const keys: string[] = [];
    let healthy = false;
    await page.route('**/api/support-email', (r) => {
      keys.push(r.request().headers()['x-idempotency-key'] ?? '');
      return healthy ? r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) : r.fulfill({ status: 500, contentType: 'text/plain', body: 'FUNCTION_INVOCATION_FAILED' });
    });
    const mail = await openMail(page);
    await mail.getByRole('button', { name: 'SEND MAIL :)' }).click();
    await expect(mail.getByRole('alert')).toContainText('MAIL NOT SENT :(', { timeout: 15_000 });
    await expect(mail.getByRole('alert')).toContainText('HTTP 500');
    await expect(mail).not.toContainText('MAIL SENT :)');
    expect(keys).toHaveLength(3); // 1 + 2 bounded automatic retries
    await expect(mail.getByLabel('Message')).toHaveValue('Hi IYS, this is an automated test.');
    await expect(mail.getByRole('link', { name: 'OPEN EMAIL APP ↗' })).toHaveAttribute('href', /^mailto:orders@inyourshoe\.com\?subject=Where%20is%20my%20order%3F&body=/);
    healthy = true;
    await mail.getByRole('button', { name: 'TRY AGAIN :(' }).click();
    await expect(mail).toContainText('MAIL SENT :) xo');
    expect(new Set(keys).size).toBe(1);
  });
  test('the mail service refuses the message → says it was NOT sent, no retry storm', async ({ page }) => {
    let n = 0;
    await page.route('**/api/support-email', (r) => {
      n++;
      return r.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'provider-rejected', error: 'The mail service refused this message, so it was NOT sent. Please email orders@inyourshoe.com directly.' }) });
    });
    const mail = await openMail(page);
    await mail.getByRole('button', { name: 'SEND MAIL :)' }).click();
    await expect(mail.getByRole('alert')).toContainText('refused this message, so it was NOT sent');
    expect(n).toBe(1);
  });
  test('not connected → says NOT sent and offers OPEN EMAIL APP, never “sent”', async ({ page }) => {
    await page.route('**/api/support-email', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'not-connected', error: 'IYS MAIL is not connected yet.' }) }));
    const mail = await openMail(page);
    await mail.getByRole('button', { name: 'SEND MAIL :)' }).click();
    await expect(mail.getByRole('alert')).toContainText('IYS MAIL IS NOT CONNECTED YET');
    await expect(mail.getByRole('alert')).toContainText('NOT sent');
    await expect(mail.getByRole('link', { name: 'OPEN EMAIL APP ↗' })).toHaveAttribute('href', /^mailto:orders@inyourshoe\.com\?/);
    await expect(mail).not.toContainText('MAIL SENT');
    await axe(page, '[data-window="mail"]');
  });
});

test.describe('JOURNEY G: snapshot / live safety', () => {
  test('boots with no keys, never calls the live endpoints, and games show no reward UI', async ({ page }) => {
    const live = watchLive(page);
    await desktop(page, `/product/${withChart.h}`);
    await expect(browserWin(page).getByRole('heading', { level: 1 })).toHaveText(withChart.t);
    await page.locator('[data-window="internet"] .tbtn').first().click();
    await page.getByRole('button', { name: /^Open IYS Games/ }).click();
    await page.getByRole('button', { name: 'PLAY CATCHY SNAKE' }).click();
    const game = page.locator('[data-window="game-snake"]');
    await expect(game.locator('.game__overlay')).toBeVisible();
    await expect(game.locator('.game__reward, .game__reward-hint')).toHaveCount(0);
    expect(live).toEqual([]);
  });
});

test.describe('JOURNEY H: returning shopper', () => {
  test('saved bag + favorites survive reloads; re-adding the same size increments instead of duplicating', async ({ page }) => {
    const v = withChart.sz!.find((s) => s[1] === 1 && s[2])!;
    await page.addInitScript(
      ([item, fav]) => {
        if (localStorage.getItem('iys2006.bag')) return;
        localStorage.setItem('iys2006.bag', JSON.stringify({ state: { items: [item], discountCode: null }, version: 1 }));
        localStorage.setItem('iys2006.favorites', JSON.stringify({ state: { handles: [fav] }, version: 1 }));
      },
      [{ key: `${withChart.h}::${v[2]}`, handle: withChart.h, title: withChart.t, variantId: v[2], variantTitle: v[0], size: v[0], quantity: 1, price: 100, image: null }, withChart.h] as const,
    );
    await desktop(page);
    await expect(page.locator('.topnav--bag')).toHaveAccessibleName('My Bag, 1 item');
    await page.reload();
    await expect(page.locator('.topnav--bag')).toHaveAccessibleName('My Bag, 1 item');
    await page.goto(`/product/${withChart.h}`);
    const b = browserWin(page);
    await expect(b.getByRole('button', { name: `Remove ${withChart.t} from Favorites` }).first()).toBeVisible();
    await b.locator('.chip label', { hasText: new RegExp(`^${v[0]}$`) }).click();
    await b.getByRole('button', { name: 'ADD TO BAG' }).click();
    await expect(page.locator('.topnav--bag')).toHaveAccessibleName('My Bag, 2 items');
    expect(await bagLines(page)).toEqual([[v[2], 2]]);
  });
});
