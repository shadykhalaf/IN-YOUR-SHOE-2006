import { desktop, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const minimizeBrowser = (page: Page) => browserWin(page).locator('.tbtn').first().click();
const cp = (page: Page) => page.getByRole('dialog', { name: 'CONTROL PANEL' });
const wallpaper = (page: Page) =>
  page.locator('.wallpaper').evaluate((e) => ({ cls: e.className, bg: getComputedStyle(e).backgroundImage, size: getComputedStyle(e).backgroundSize }));

test.describe('IYS Retro V2 fixes', () => {
  test('P2: a fresh visitor gets IYS Hills, and Control Panel shows it selected', async ({ page }) => {
    await desktop(page, '/');
    const wp = await wallpaper(page);
    expect(wp.bg).toContain('/iys/os/hills.svg');
    expect(wp.cls).not.toContain('preset-fw27');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(cp(page).locator('.cp-list label:has(input:checked)')).toContainText('IYS Hills - Y2K sky (Default)');
  });

  test('P3: Set as Wallpaper on a product photo fills the desktop (Stretch = cover); Center/Tile still work; persists', async ({ page }) => {
    await desktop(page, '/product/cereal-killer-pjoys');
    await browserWin(page).locator('.gallery__stage').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Set as Wallpaper' }).click();
    let wp = await wallpaper(page);
    expect(wp.bg).toMatch(/url\("https:\/\//);
    expect(wp.cls).toContain('wallpaper--stretch');
    expect(wp.size).toBe('cover');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open Control Panel' }).click();
    await expect(cp(page).locator('select')).toHaveValue('stretch');
    for (const [m, size] of [['center', 'auto min(78%, 900px)'], ['tile', '180px'], ['stretch', 'cover']] as const) {
      await cp(page).locator('select').selectOption(m);
      await cp(page).getByRole('button', { name: 'Apply' }).click();
      wp = await wallpaper(page);
      expect(wp.cls).toContain(`wallpaper--${m}`);
      expect(wp.size).toBe(size);
    }
    await page.reload();
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    wp = await wallpaper(page);
    expect(wp.cls).toContain('wallpaper--stretch');
    expect(wp.size).toBe('cover');
    expect(wp.bg).toMatch(/url\("https:\/\//);
  });

  test('P4: no em dash renders anywhere we look (text, titles, labels, alt)', async ({ page }) => {
    const scan = () =>
      page.evaluate(() => {
        const bad: string[] = [];
        const EM = '—';
        if (document.title.includes(EM)) bad.push(`title: ${document.title}`);
        if (document.body.innerText.includes(EM)) bad.push(`text: ${document.body.innerText.split('\n').find((l) => l.includes(EM))}`);
        for (const el of document.querySelectorAll('[title],[aria-label],[alt],[placeholder]'))
          for (const a of ['title', 'aria-label', 'alt', 'placeholder']) {
            const v = el.getAttribute(a);
            if (v?.includes(EM)) bad.push(`${a}: ${v}`);
          }
        return bad;
      });
    await desktop(page, '/product/candy-cane-onesie'); // its synced description contains an em dash
    await expect(browserWin(page).locator('.props__desc:not(.props__care)')).toBeVisible();
    expect(await scan()).toEqual([]);
    await page.goto('/');
    await expect(browserWin(page).locator('.top8')).toBeVisible();
    expect(await scan()).toEqual([]);
    await minimizeBrowser(page);
    for (const name of ['Open Control Panel', 'Open IYS Messenger', 'Open IYS Mail', 'Open IYS Newsletter', /Open XCHANGE/, 'Open IYS Camera photos', 'Open README.TXT']) {
      await page.getByRole('button', { name }).click();
      await page.waitForTimeout(250);
      expect(await scan(), String(name)).toEqual([]);
      await page.keyboard.press('Escape'); // close it so it can't cover the next icon
    }
    await page.goto('/stores');
    await expect(browserWin(page)).toContainText('FIND IYS IRL');
    expect(await scan()).toEqual([]);
  });
});

test.describe('IYS MESSENGER menus', () => {
  test.use({ reducedMotion: 'reduce' });

  test('P7: File / Contacts / Actions / Help all open and act; keyboard works', async ({ page }) => {
    await desktop(page, '/');
    await minimizeBrowser(page);
    await page.getByRole('button', { name: 'Open IYS Messenger' }).click();
    const buddy = page.locator('[data-window="messenger"]');
    const bar = buddy.getByRole('menubar');
    // every menu opens
    const expected: Record<string, RegExp[]> = {
      File: [/^New Conversation\.\.\.$/, /^Minimize Messenger$/, /^Close IYS Messenger$/],
      Contacts: [/^PJOYS$/, /^NEW STUFF$/, /^CAIRO$/, /^HOODIES$/, /^ACCESSORIES$/, /^IYS KIDS$/, /^Show Buddy List$/],
      Actions: [/^Start Conversation\.\.\.$/, /^Open My Bag$/, /^Open IYS Internet$/],
      Help: [/^How 2 use IYS Messenger :\)$/, /^About IYS Messenger$/],
    };
    for (const [menu, items] of Object.entries(expected)) {
      await bar.getByRole('menuitem', { name: menu, exact: true }).click();
      await expect(page.getByRole('menu', { name: menu }).getByRole('menuitem')).toHaveText(items);
      await page.keyboard.press('Escape');
    }
    // keyboard: File ↓ → Contacts, Esc closes the menu, not Messenger
    await bar.getByRole('menuitem', { name: 'File', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'New Conversation...' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('menu', { name: 'Contacts' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'NEW STUFF' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(buddy).toBeVisible();
    // Help › How 2 use
    await bar.getByRole('menuitem', { name: 'Help', exact: true }).click();
    await page.getByRole('menuitem', { name: 'How 2 use IYS Messenger :)' }).click();
    const how = page.getByRole('alertdialog', { name: 'How 2 use IYS Messenger :)' });
    await expect(how).toContainText('pick a buddy');
    await expect(how).toContainText('ttyl :)');
    await how.getByRole('button', { name: 'OK' }).click();
    await bar.getByRole('menuitem', { name: 'Help', exact: true }).click();
    await page.getByRole('menuitem', { name: 'About IYS Messenger' }).click();
    await expect(page.getByRole('alertdialog', { name: 'About IYS Messenger' })).toContainText('unofficial concept');
    await page.getByRole('alertdialog').getByRole('button', { name: 'OK' }).click();
    // Contacts › CAIRO opens the conversation IN the same Messenger window
    await bar.getByRole('menuitem', { name: 'Contacts', exact: true }).click();
    await page.getByRole('menuitem', { name: 'CAIRO' }).click();
    await expect(buddy.locator('.chat')).toBeVisible();
    await expect(buddy.locator('.xfer').first()).toBeVisible();
    await expect(page.locator('[data-window]')).toHaveCount(2); // IYS INTERNET + the one Messenger
    // Actions (context-aware) in the conversation
    await bar.getByRole('menuitem', { name: 'Actions', exact: true }).click();
    const acts = await page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem').allTextContents();
    expect(acts.slice(0, 3)).toEqual(['Send IM', 'Open CAIRO Collection', 'View Shared Product']);
    await page.getByRole('menuitem', { name: 'Send IM' }).click();
    await expect(page.locator('#compose-chat-cairo')).toBeFocused();
    if (acts.includes('Add Shared Product to Bag')) {
      await bar.getByRole('menuitem', { name: 'Actions', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Add Shared Product to Bag' }).click();
      await expect(page.getByRole('button', { name: /Open My Bag, 1 items/ }).first()).toBeVisible();
    }
    await bar.getByRole('menuitem', { name: 'Actions', exact: true }).click();
    await page.getByRole('menuitem', { name: 'View Shared Product' }).click();
    await expect(page).toHaveURL(/\/product\//);
    await minimizeBrowser(page); // the product opened in IYS INTERNET, in front
    await buddy.evaluate((el: HTMLElement) => el.focus()); // bring Messenger to the front
    await bar.getByRole('menuitem', { name: 'Actions', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Open CAIRO Collection' }).click();
    await expect(page).toHaveURL(/\/collections\/cairo$/);
    await minimizeBrowser(page);
    // File in a conversation: Close Conversation → back to the buddy list (same window); then Close IYS Messenger
    await buddy.evaluate((el: HTMLElement) => el.focus());
    await bar.getByRole('menuitem', { name: 'File', exact: true }).click();
    await expect(page.getByRole('menu', { name: 'File' }).getByRole('menuitem')).toHaveText(['New Conversation...', 'Minimize Messenger', 'Close Conversation', 'Close IYS Messenger']);
    await page.getByRole('menuitem', { name: 'Close Conversation' }).click();
    await expect(buddy.locator('.im__list')).toBeVisible();
    await expect(buddy.locator('.chat')).toHaveCount(0);
    // buddy-list Actions act on the list again
    await bar.getByRole('menuitem', { name: 'Actions', exact: true }).click();
    await expect(page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem').first()).toHaveText('Start Conversation...');
    await page.keyboard.press('Escape');
    await bar.getByRole('menuitem', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Close IYS Messenger' }).click();
    await expect(buddy).toHaveCount(0);
    await expect(browserWin(page)).toHaveCount(1);
  });
});
