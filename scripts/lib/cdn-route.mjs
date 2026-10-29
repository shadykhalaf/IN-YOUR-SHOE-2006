/**
 * QA helper: serve official Shopify CDN images to headless Chromium through a
 * small on-disk cache with limited concurrency (keeps screenshot runs
 * deterministic and polite). Used by scripts/qa-screens.mjs only — never by
 * the app, and never for /showcase (which is fully local).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), '.cache/cdn');
mkdirSync(dir, { recursive: true });
let active = 0;
const queue = [];
const slot = () => (active < 4 ? (active++, Promise.resolve()) : new Promise((r) => queue.push(r)));
const release = () => (queue.length ? queue.shift()() : active--);

export async function routeCdn(page) {
  await page.route(/^https:\/\/(cdn\.shopify\.com|inyourshoe\.com\/cdn)\//, async (route) => {
    const url = route.request().url();
    const file = resolve(dir, createHash('sha1').update(url).digest('hex'));
    if (existsSync(file)) return route.fulfill({ status: 200, contentType: 'image/jpeg', body: readFileSync(file) });
    await slot();
    try {
      for (let i = 0; i < 3; i++) {
        const res = await fetch(url).catch(() => null);
        if (res?.ok) {
          const body = Buffer.from(await res.arrayBuffer());
          writeFileSync(file, body);
          return route.fulfill({ status: 200, contentType: res.headers.get('content-type') ?? 'image/jpeg', body });
        }
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
      return route.abort();
    } finally {
      release();
    }
  });
}
