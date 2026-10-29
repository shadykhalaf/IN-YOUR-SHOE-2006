import { expect, test } from '@playwright/test';

// The service worker is enabled on "localhost" (not on 127.0.0.1, which the
// other suites use so they stay cache-free).
const ORIGIN = 'http://localhost:4173';

test('PWA: registers, survives refresh, and the shell works offline', async ({ page, context }) => {
  await page.addInitScript(() => sessionStorage.setItem('iys2006.session', JSON.stringify({ state: { bootSeen: true, welcomeSeen: true, pjoysPinged: true }, version: 1 })));
  await page.goto(`${ORIGIN}/`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  const manifest = await (await page.request.get(`${ORIGIN}/manifest.webmanifest`)).json();
  expect(manifest.name).toBe('IYS Internet 2006 - Concept');

  await context.setOffline(true);
  await page.goto(`${ORIGIN}/shop?page=2`);
  await expect(page.getByRole('alert')).toContainText('INTERNET CONNECTION LOST');
  await expect(page.getByRole('dialog', { name: /IYS INTERNET/ })).toBeVisible();
  await expect(page.locator('.pcard').first()).toBeVisible();
  await context.setOffline(false);
});
