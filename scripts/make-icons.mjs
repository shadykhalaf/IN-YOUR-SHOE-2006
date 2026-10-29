/** Original app icons (the IYS OS "computer" favicon on IYS blue). Run once: node scripts/make-icons.mjs */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const fav = readFileSync('public/favicon.svg', 'utf8').replace('<svg ', '<svg x="SX" y="SY" width="SW" height="SW" ');
const icon = (size, pad) => {
  const inner = Math.round(size * (1 - pad * 2));
  const off = Math.round(size * pad);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c5ea8"/><stop offset="1" stop-color="#06478e"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/>${fav.replace('SX', off).replace('SY', off).replaceAll('SW', inner)}</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 });
};
await icon(192, 0.14).toFile('public/icons/icon-192.png');
await icon(512, 0.14).toFile('public/icons/icon-512.png');
await icon(512, 0.22).toFile('public/icons/icon-maskable-512.png');
await icon(180, 0.12).toFile('public/icons/apple-touch-icon.png');
console.log('icons written');
