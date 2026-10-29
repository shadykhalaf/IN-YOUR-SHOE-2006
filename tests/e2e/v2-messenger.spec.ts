import type { Page } from '@playwright/test';
import { desktop, expect, test } from './fixtures';

const browserWin = (page: Page) => page.locator('[data-window="internet"]');
const messenger = (page: Page) => page.locator('[data-window="messenger"]');
/** Every Messenger-ish window and taskbar button that exists, by identity. */
const snapshot = (page: Page) =>
  page.evaluate(() => ({
    windows: [...document.querySelectorAll('[data-window]')].map((e) => e.getAttribute('data-window')),
    tasks: [...document.querySelectorAll('.taskbar button')].map((b) => b.textContent!.trim()).filter((t) => /MESSENGER|Conversation/.test(t)),
  }));
const rect = async (page: Page) => (await messenger(page).boundingBox())!;

test.describe('IYS MESSENGER is one window', () => {
  test.use({ reducedMotion: 'reduce' });

  test('buddies and chats switch inside the same window, with one taskbar button and a tiny Back', async ({ page }) => {
    await desktop(page, '/');
    await browserWin(page).locator('.tbtn').first().click();
    await page.getByRole('button', { name: 'Open IYS Messenger' }).click();
    const m = messenger(page);
    await expect(m.locator('.im__list')).toBeVisible();
    expect(await snapshot(page)).toEqual({ windows: ['internet', 'messenger'], tasks: ['IYS MESSENGER'] });
    const list = await rect(page);

    // NEW STUFF opens IN the Messenger window: no new window, no new taskbar button
    await page.getByRole('button', { name: /Chat with NEW STUFF/ }).click();
    await expect(page.getByRole('dialog', { name: 'NEW STUFF - Conversation' })).toBeVisible();
    await expect(m.locator('.chat__to')).toContainText('NEW STUFF');
    expect(await snapshot(page)).toEqual({ windows: ['internet', 'messenger'], tasks: ['NEW STUFF - Conversation'] });
    const chat = await rect(page);
    expect(chat.x + chat.width).toBeLessThanOrEqual(Math.min(list.x + list.width, page.viewportSize()!.width - 8)); // grew leftwards from the list's right edge, inside the desktop
    expect(chat.x + chat.width).toBeGreaterThanOrEqual(list.x + list.width - 12);
    expect(chat.width).toBeGreaterThan(list.width);

    // tiny, real, keyboard-operable Back
    const back = m.getByRole('button', { name: 'back 2 buddies' });
    await expect(back).toBeFocused();
    expect((await back.boundingBox())!.height).toBeLessThanOrEqual(24);
    await page.keyboard.press('Enter');
    await expect(m.locator('.im__list')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'IYS MESSENGER' })).toBeVisible();
    const again = await rect(page);
    expect([again.width, again.height]).toEqual([list.width, list.height]); // back at the buddy-list size…
    expect(again.x + again.width).toBe(chat.x + chat.width); // …from the same right edge
    await expect(m.getByRole('button', { name: /Chat with NEW STUFF/ })).toBeFocused();

    // PJOYS, then Contacts › CAIRO: always the same window
    await m.getByRole('button', { name: /Chat with PJOYS/ }).click();
    await expect(m.locator('.chat__to')).toContainText('PJOYS');
    await m.getByRole('menubar').getByRole('menuitem', { name: 'Contacts', exact: true }).click();
    await page.getByRole('menuitem', { name: 'CAIRO' }).click();
    await expect(m.locator('.chat__to')).toContainText('CAIRO');
    expect(await snapshot(page)).toEqual({ windows: ['internet', 'messenger'], tasks: ['CAIRO - Conversation'] });

    // minimize → the one taskbar button → the same chat is still there
    await m.locator('.tbtn').first().click();
    await expect(m).toBeHidden();
    await page.locator('.taskbar button', { hasText: 'CAIRO - Conversation' }).click();
    await expect(m.locator('.chat__to')).toContainText('CAIRO');

    // Send IM still works in the conversation
    await m.getByRole('menubar').getByRole('menuitem', { name: 'Actions', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Send IM' }).click();
    await expect(page.locator('#compose-chat-cairo')).toBeFocused();
    await page.keyboard.type('hi cairo');
    await page.keyboard.press('Enter');
    await expect(m.getByRole('log')).toContainText('hi cairo');

    // shared products still act (Open → the real product page)
    await m.locator('.xfer').getByRole('button', { name: 'Open' }).first().click();
    await expect(page).toHaveURL(/\/product\//);

    // close while chatting → reopen starts at the buddy list
    await m.evaluate((el: HTMLElement) => el.focus());
    await m.getByRole('button', { name: /^Close/ }).first().click();
    await expect(m).toHaveCount(0);
    await browserWin(page).locator('.tbtn').first().click();
    await page.getByRole('button', { name: 'Open IYS Messenger' }).click();
    await expect(m.locator('.im__list')).toBeVisible();
    expect(await snapshot(page)).toEqual({ windows: ['internet', 'messenger'], tasks: ['IYS MESSENGER'] });
  });

  test('the PJOYS balloon opens the chat in the one Messenger window', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: false }, version: 1 })));
    await page.clock.install();
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
    await page.clock.runFor(10_000);
    await page.getByRole('button', { name: 'Open conversation' }).click();
    await expect(page.getByRole('dialog', { name: 'PJOYS - Conversation' })).toBeVisible();
    expect(await snapshot(page)).toEqual({ windows: ['internet', 'messenger'], tasks: ['PJOYS - Conversation'] });
  });

  test('stays inside the desktop at 1024×768', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await desktop(page, '/');
    await browserWin(page).locator('.tbtn').first().click();
    await page.getByRole('button', { name: 'Open IYS Messenger' }).click();
    await page.getByRole('button', { name: /Chat with HOODIES/ }).click();
    const r = await rect(page);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(1024);
    expect(r.y + r.height).toBeLessThanOrEqual(768 - 34);
  });
});
