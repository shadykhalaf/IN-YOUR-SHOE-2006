/**
 * Official IYS size charts, read from the public product page.
 *
 * The storefront renders every product's chart inside its SIZE CHART modal:
 *
 *   <x-modal id="modal-size"> … <div class="prose"> <img src="//inyourshoe.com/cdn/shop/files/LEATHER-JACKET.jpg?v=…"> </div> … </x-modal>
 *
 * Only what sits inside that modal's `.prose` block is the chart (the modal
 * also repeats the product photo above it, which is ignored). Nothing is
 * inferred: no modal → 'none', a modal without chart content → 'empty'.
 *
 *   { status: 'found', images: [{ src, width, height }], table: string[][] | null }
 *   { status: 'none' | 'empty', images: [], table: null }
 */
import { decodeEntities } from './normalize.mjs';

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(tag);
  return m ? decodeEntities(m[2]) : null;
};

/** `//inyourshoe.com/cdn/shop/files/X.jpg?v=1&width=800` → `https://inyourshoe.com/cdn/shop/files/X.jpg?v=1` (no size param). */
export function chartImageUrl(src) {
  if (!src) return null;
  const abs = src.startsWith('//') ? `https:${src}` : src.startsWith('/') ? `https://inyourshoe.com${src}` : src;
  let u;
  try {
    u = new URL(abs);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !/(^|\.)inyourshoe\.com$|^cdn\.shopify\.com$/.test(u.hostname)) return null;
  for (const k of ['width', 'height', 'crop']) u.searchParams.delete(k);
  return u.toString();
}

function balancedInner(s, start, tagName) {
  const tag = new RegExp(`<(\\/?)${tagName}\\b[^>]*>`, 'gi');
  tag.lastIndex = start;
  let depth = 1;
  for (let m = tag.exec(s); m; m = tag.exec(s)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return s.slice(start, m.index);
  }
  return null;
}

const cellText = (html) =>
  decodeEntities(String(html).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/[\s ]+/g, ' ')
    .trim();

export function extractSizeChart(html) {
  const s = String(html ?? '');
  const open = /<x-modal\b[^>]*\bid\s*=\s*(["'])modal-size\1[^>]*>/i.exec(s);
  if (!open) return { status: 'none', images: [], table: null };
  const modal = balancedInner(s, open.index + open[0].length, 'x-modal') ?? '';
  const prose = /<div\b[^>]*\bclass\s*=\s*(["'])(?:[^"']*\s)?prose(?:\s[^"']*)?\1[^>]*>/i.exec(modal);
  const inner = prose ? balancedInner(modal, prose.index + prose[0].length, 'div') ?? '' : '';
  const images = [...inner.matchAll(/<img\b[^>]*>/gi)]
    .map((m) => ({ src: chartImageUrl(attr(m[0], 'src')), width: Number(attr(m[0], 'width')) || null, height: Number(attr(m[0], 'height')) || null }))
    .filter((im) => im.src);
  const tableHtml = /<table\b[\s\S]*?<\/table>/i.exec(inner)?.[0] ?? null;
  const table = tableHtml
    ? [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) => [...r[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => cellText(c[1]))).filter((r) => r.length)
    : null;
  const unique = [...new Map(images.map((im) => [im.src, im])).values()];
  if (!unique.length && !(table && table.length)) return { status: 'empty', images: [], table: null };
  return { status: 'found', images: unique, table: table && table.length ? table : null };
}
