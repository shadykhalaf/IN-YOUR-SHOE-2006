import { noEmDash } from './format';
import type { ProductDetail } from './types';

/** FNV-1a 32-bit — must match scripts/lib/outputs.mjs `shardOf`. */
export function shardOf(handle: string, count: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < handle.length; i++) {
    h ^= handle.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % count;
}

export const shardUrl = (n: number) => `/catalogue/p-${String(n).padStart(2, '0')}.json`;
/** The same shard built from live Shopify by /api/commerce (only when the index itself came from there). */
export const liveShardUrl = (n: number) => `/api/commerce?op=catalogue&part=shard&n=${n}`;

const shards = new Map<string, Promise<Record<string, ProductDetail>>>();

/** Full product record (description, all images, all variants), fetched on demand. */
export async function loadDetail(handle: string, shardCount: number, live = false): Promise<ProductDetail | null> {
  const n = shardOf(handle, shardCount);
  const key = `${live ? 'live' : 'snap'}:${n}`;
  let p = shards.get(key);
  if (!p) {
    p = fetch(live ? liveShardUrl(n) : shardUrl(n)).then((r) => {
      if (!r.ok) throw new Error(`catalogue shard ${n}: ${r.status}`);
      // Normalise every string in the shard for display (no em dashes); the JSON file stays as synced.
      return r.text().then((t) => {
        const records = JSON.parse(noEmDash(t)) as Record<string, ProductDetail>;
        // Shards written before care guides were synced have no field: that means "none known".
        for (const d of Object.values(records)) d.careGuide ??= null;
        return records;
      });
    });
    p.catch(() => shards.delete(key));
    shards.set(key, p);
  }
  const shard = await p;
  return shard[handle] ?? null;
}
