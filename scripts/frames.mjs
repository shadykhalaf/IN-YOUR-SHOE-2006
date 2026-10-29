/**
 * npm run frames [-- --base=http://127.0.0.1:4173] [-- --t=0.4,1.0,...]
 * Deterministic QA stills of /showcase → out/frames/showcase-<t>.png (1080×1920).
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { openShowcase } from './lib/showcase-page.mjs';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const BASE = arg('base', 'http://127.0.0.1:4173');
const TIMES = arg('t', '0.4,1.0,1.8,2.8,4.2,5.5,7.0,8.8,10.2,11.8,13.5,15.0,16.5,18.2').split(',').map(Number);
const OUT = resolve(arg('out', 'out/frames'));
mkdirSync(OUT, { recursive: true });

const { browser, page, seek, external } = await openShowcase(BASE);
for (const t of TIMES) {
  await seek(t);
  const file = resolve(OUT, `showcase-${t.toFixed(2).padStart(5, '0')}.png`);
  await page.screenshot({ path: file });
  console.log(`[frames] t=${t}s → ${file}`);
}
await browser.close();
if (external.length) {
  console.error(`[frames] ✗ ${external.length} external requests attempted (showcase must be local-only)`, external.slice(0, 5));
  process.exit(1);
}
