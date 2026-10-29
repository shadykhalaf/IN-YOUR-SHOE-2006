/**
 * Remote catalogue imagery stays on the official Shopify CDN (no mass download).
 * The CDN accepts a `width` parameter, so we request only what a slot needs.
 */
const WIDTHS = [180, 240, 360, 480, 640, 800, 1000, 1400];

export function sized(src: string, width: number): string {
  if (!src.startsWith('https://cdn.shopify.com/') && !src.includes('/cdn/shop/')) return src;
  const u = new URL(src);
  u.searchParams.set('width', String(width));
  if (/\.heic$/i.test(u.pathname)) u.searchParams.set('format', 'jpg');
  return u.toString();
}

export function srcSet(src: string, max = 1000): string | undefined {
  if (!src.startsWith('https://cdn.shopify.com/')) return undefined;
  return WIDTHS.filter((w) => w <= max)
    .map((w) => `${sized(src, w)} ${w}w`)
    .join(', ');
}
