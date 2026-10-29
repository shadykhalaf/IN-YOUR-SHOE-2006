import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assets, WALLPAPERS } from '../data/assets';
import { concept } from '../data/copy';
import { BUDDIES } from '../data/taxonomy';
import { loadDetail } from '../lib/catalogue/shard';
import { noEmDash } from '../lib/catalogue/format';
import { subscribe } from '../lib/newsletter';
import { touchGrassPath } from '../lib/useBrowse';
import { DEFAULT_WALLPAPER } from '../state/preferences';

const root = resolve(__dirname, '../..');
const EM = '—';

describe('Point 1 - newsletter adapter never fakes a signup', () => {
  it('no endpoint → not-configured, no request, no code', async () => {
    const f = vi.fn();
    expect(await subscribe('test@example.com', null, f as unknown as typeof fetch)).toEqual({ status: 'not-configured' });
    expect(f).not.toHaveBeenCalled();
  });
  it('configured endpoint still submits and reveals IYS10 only on { ok: true }', async () => {
    const f = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ email: 'test@example.com' });
      return new Response('{"ok":true}', { status: 200 });
    });
    expect(await subscribe(' Test@Example.com ', '/signup', f as unknown as typeof fetch)).toEqual({ status: 'subscribed', code: 'IYS10' });
  });
});

describe('Point 2 - IYS Hills is the default wallpaper', () => {
  it('fresh default, list order and fallback all resolve to hills', () => {
    expect(DEFAULT_WALLPAPER).toEqual({ kind: 'preset', id: 'hills' });
    // Desktop + Control Panel fall back to WALLPAPERS[0] for unknown ids.
    expect(WALLPAPERS[0]!.id).toBe('hills');
    expect(WALLPAPERS[0]!.src).toBe('/iys/os/hills.svg');
    expect(WALLPAPERS.find((w) => w.id === 'removed') ?? WALLPAPERS[0]).toBe(WALLPAPERS[0]);
  });
});

describe('Point 4 - no em dashes can render', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) return n === 'tests' ? [] : files(p);
      return /\.(tsx?|css|html)$/.test(n) ? [p] : [];
    });
  it('first-party source has zero U+2014 outside comments', () => {
    const hits = [...files(resolve(root, 'src')), resolve(root, 'index.html'), resolve(root, 'vite.config.ts')]
      .map((f) => [f, (strip(readFileSync(f, 'utf8')).match(new RegExp(EM, 'g')) ?? []).length] as const)
      .filter(([, n]) => n > 0);
    expect(hits).toEqual([]);
  });
  it('synced/generated data is normalised at display time', async () => {
    expect(noEmDash(`FW27 campaign ${EM} desktop banner`)).toBe('FW27 campaign - desktop banner');
    expect(JSON.stringify(assets)).not.toContain(EM);
    const shard = JSON.stringify({ x: { handle: 'x', description: `soft ${EM} warm`, title: 'X' } });
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(shard, { status: 200 }));
    const d = await loadDetail('x', 1);
    expect(d?.description).toBe('soft - warm');
    spy.mockRestore();
  });
  afterEach(() => vi.restoreAllMocks());
});

describe('Point 5 - TOUCH_GRASS.EXE route', () => {
  it('opens the curated product, or searches if it is missing', () => {
    expect(touchGrassPath('touch-grass-pjoys')).toBe('/product/touch-grass-pjoys');
    expect(touchGrassPath(undefined)).toBe('/search?q=touch%20grass');
    expect(concept.touchGrass).not.toHaveProperty('message');
  });
});

describe('Point 6 - Messenger copy is 2000s IM, not modern emoji', () => {
  it('keeps the same contacts and uses era shorthand', () => {
    expect(BUDDIES.map((b) => b.name)).toEqual(['PJOYS', 'NEW STUFF', 'CAIRO', 'HOODIES', 'ACCESSORIES', 'IYS KIDS']);
    const all = [...BUDDIES.flatMap((b) => [b.mood, b.opener]), ...concept.messenger.pjoysAfter, concept.messenger.pjoysWallpapers, concept.messenger.pjoysOutro(30), concept.messenger.buddyOutro(8, 48), concept.messenger.autoReply('X')].join(' ');
    for (const cue of ['brb', 'lol', 'ttyl', 'XD', '<3', ' u ', ' 4 ', 'rn', ';)', ':P']) expect(all, cue).toContain(cue);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(all).not.toContain(EM);
  });
});
