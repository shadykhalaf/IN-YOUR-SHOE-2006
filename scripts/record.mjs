/**
 * npm run record [-- --base=http://127.0.0.1:4173] [-- --fps=60] [-- --out=out/iys-2000s-v2-showcase.mp4]
 *
 * Deterministic frame-by-frame render of /showcase: for every frame the GSAP
 * master timeline is seeked to frame/fps, a 1080×1920 PNG is captured with
 * Playwright and piped straight into FFmpeg → H.264 (yuv420p), 60 fps.
 * Needs a running build (`npm run build && npm run preview`) and ffmpeg on PATH.
 * The MP4 is written to out/ (gitignored) — it is never committed.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { openShowcase } from './lib/showcase-page.mjs';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const BASE = arg('base', 'http://127.0.0.1:4173');
const FPS = Number(arg('fps', '60'));
const OUT = resolve(arg('out', 'out/iys-2000s-v2-showcase.mp4'));
mkdirSync(dirname(OUT), { recursive: true });

const { browser, page, duration, seek, external } = await openShowcase(BASE);
const frames = Math.round(duration * FPS);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-r', String(FPS), OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));

const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await seek(f / FPS);
  const png = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 60 === 0) console.log(`[record] ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await done;
await browser.close();
if (external.length) throw new Error(`external requests during render: ${external.length}`);
console.log(`[record] ✓ ${frames} frames @ ${FPS} fps → ${OUT}`);
