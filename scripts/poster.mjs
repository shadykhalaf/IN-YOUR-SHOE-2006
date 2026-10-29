/**
 * npm run poster [-- --base=http://127.0.0.1:4173]
 *
 * Social poster (1080×1350 → out/iys-2000s-v2-poster.jpg, not committed)
 * and the OpenGraph image (1200×630 → public/og-poster.jpg, committed, small),
 * composed from a real /showcase frame + the official wordmark. Both carry the
 * unofficial-concept credit.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { openShowcase } from './lib/showcase-page.mjs';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const BASE = arg('base', 'http://127.0.0.1:4173');
mkdirSync('out', { recursive: true });

const { browser, page, seek } = await openShowcase(BASE);
await seek(16.45);
const chaos = await page.screenshot({ type: 'png' });
await seek(8.9);
const product = await page.screenshot({ type: 'png' });
await browser.close();

const wordmark = await sharp('public/iys/brand/in-your-shoe-white.png').resize({ width: 560 }).toBuffer();
const text = (w, h, lines) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines
      .map(([t, x, y, size, fill, weight = 'bold', family = 'DejaVu Sans, Verdana, sans-serif', anchor = 'start']) => `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${t}</text>`)
      .join('')}</svg>`,
  );

// 1080×1350 poster: the desktop chaos frame + a title band.
const top = await sharp(chaos).extract({ left: 0, top: 0, width: 1080, height: 1080 }).toBuffer();
await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#06478e' } })
  .composite([
    { input: top, left: 0, top: 0 },
    { input: wordmark, left: 60, top: 1118 },
    {
      input: text(1080, 1350, [
        ['IYS INTERNET 2006', 60, 1238, 54, '#ff6060'],
        ['UNOFFICIAL SPECULATIVE CONCEPT — NOT AFFILIATED WITH IN YOUR SHOE', 60, 1290, 20, '#ffffff', 'normal', 'DejaVu Sans Mono, monospace'],
        ['OMAR AKRAM · 2026', 60, 1322, 22, '#ffffff', 'bold'],
      ]),
      left: 0,
      top: 0,
    },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(resolve('out/iys-2000s-v2-poster.jpg'));

// 1200×630 OpenGraph image.
const left = await sharp(product).extract({ left: 0, top: 40, width: 1080, height: 1260 }).resize({ height: 630 }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#06478e' } })
  .composite([
    { input: left, left: 0, top: 0 },
    { input: await sharp('public/iys/brand/in-your-shoe-white.png').resize({ width: 560 }).toBuffer(), left: 590, top: 170 },
    {
      input: text(1200, 630, [
        ['IYS INTERNET 2006', 590, 300, 52, '#ff6060'],
        ['A 2000s internet concept for today’s', 590, 350, 24, '#ffffff', 'normal'],
        ['In Your Shoe catalogue.', 590, 382, 24, '#ffffff', 'normal'],
        ['UNOFFICIAL CONCEPT · NOT AFFILIATED', 590, 470, 18, '#ffffff', 'normal', 'DejaVu Sans Mono, monospace'],
        ['WITH IN YOUR SHOE · OMAR AKRAM 2026', 590, 496, 18, '#ffffff', 'normal', 'DejaVu Sans Mono, monospace'],
      ]),
      left: 0,
      top: 0,
    },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(resolve('public/og-poster.jpg'));

console.log('[poster] out/iys-2000s-v2-poster.jpg (1080×1350) + public/og-poster.jpg (1200×630)');
