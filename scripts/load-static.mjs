#!/usr/bin/env node
/**
 * Static load test for a LOCAL preview of the built site (npm run build &&
 * npm run preview). Virtual shoppers fetch what a real visit fetches: the
 * SPA shell, the catalogue index chunk, product shards, the size-chart chunk
 * and the main bundle, in random order, with keep-alive.
 *
 *   node scripts/load-static.mjs [baseURL] [--users 100] [--seconds 30] [--out file.json]
 *
 * SAFETY: only localhost / 127.0.0.1 targets are accepted. This must never be
 * pointed at inyourshoe.com, Shopify, or a production deployment. Authorised
 * staging needs a deliberate code change, not a flag.
 */
import { readdirSync, writeFileSync } from 'node:fs';

const flags = {};
const positional = [];
for (let a = process.argv.slice(2), i = 0; i < a.length; i++) {
  if (a[i].startsWith('--')) flags[a[i].slice(2)] = a[++i];
  else positional.push(a[i]);
}
const opt = (name, fallback) => flags[name] ?? fallback;
const base = (positional[0] ?? 'http://127.0.0.1:4173').replace(/\/$/, '');
const host = new URL(base).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error(`Refusing to load-test ${host}: local previews only (see the header of this file).`);
  process.exit(2);
}
const users = Number(opt('users', 100));
const seconds = Number(opt('seconds', 30));
const out = opt('out', null);

const assets = readdirSync(new URL('../dist/assets/', import.meta.url));
const pick = (re) => assets.find((f) => re.test(f));
const indexChunk = pick(/^catalogue-index-.*\.js$/);
const sizeChunk = pick(/^size-charts\.generated-.*\.js$/);
const mainChunk = pick(/^index-.*\.js$/);
if (!indexChunk || !mainChunk) {
  console.error('dist/ is missing the expected chunks: run npm run build first.');
  process.exit(2);
}
const routes = [
  { name: 'shell /', path: '/' },
  { name: 'shell /product', path: '/product/some-product' },
  { name: 'shell /search', path: `/search?q=${encodeURIComponent('هودي')}` },
  { name: 'main bundle', path: `/assets/${mainChunk}` },
  { name: 'catalogue index', path: `/assets/${indexChunk}` },
  ...(sizeChunk ? [{ name: 'size charts', path: `/assets/${sizeChunk}` }] : []),
  ...Array.from({ length: 8 }, () => ({ name: 'product shard', path: null })),
];

const lat = new Map();
const errors = new Map();
let bytes = 0;
let total = 0;
const deadline = Date.now() + seconds * 1000;

async function user() {
  while (Date.now() < deadline) {
    const r = routes[Math.floor(Math.random() * routes.length)];
    const path = r.path ?? `/catalogue/p-${String(Math.floor(Math.random() * 32)).padStart(2, '0')}.json`;
    const t = performance.now();
    try {
      const res = await fetch(base + path);
      const buf = await res.arrayBuffer();
      bytes += buf.byteLength;
      if (!res.ok) errors.set(`${r.name} ${res.status}`, (errors.get(`${r.name} ${res.status}`) ?? 0) + 1);
    } catch (e) {
      errors.set(`${r.name} ${e.code ?? e.message}`, (errors.get(`${r.name} ${e.code ?? e.message}`) ?? 0) + 1);
    }
    const ms = performance.now() - t;
    if (!lat.has(r.name)) lat.set(r.name, []);
    lat.get(r.name).push(ms);
    total++;
  }
}

const q = (s, p) => Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 10) / 10;
const t0 = Date.now();
const cpu0 = process.cpuUsage();
await Promise.all(Array.from({ length: users }, user));
const wall = (Date.now() - t0) / 1000;
const cpu = process.cpuUsage(cpu0);
const summary = {
  target: base,
  users,
  seconds: Math.round(wall),
  requests: total,
  rps: Math.round(total / wall),
  errorRate: Number(([...errors.values()].reduce((a, b) => a + b, 0) / Math.max(1, total)).toFixed(4)),
  errors: Object.fromEntries(errors),
  mbTransferred: Math.round(bytes / 1e6),
  loadGeneratorCpuSeconds: Math.round((cpu.user + cpu.system) / 1e5) / 10,
  byRoute: Object.fromEntries(
    [...lat].map(([k, v]) => {
      const s = [...v].sort((a, b) => a - b);
      return [k, { n: s.length, p50: q(s, 0.5), p95: q(s, 0.95), p99: q(s, 0.99), max: q(s, 1) }];
    }),
  ),
};
console.log(JSON.stringify(summary, null, 1));
if (out) writeFileSync(out, JSON.stringify(summary, null, 1));
