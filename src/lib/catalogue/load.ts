import { useEffect, useState } from 'react';
import { commerceMode, COMMERCE_ENDPOINT } from '../commerce';
import { hydrate } from './hydrate';
import { loadDetail } from './shard';
import type { Catalogue, IndexFile, ProductDetail } from './types';

let promise: Promise<Catalogue> | null = null;
let ready: Catalogue | null = null;
/** Where the loaded catalogue came from: the bundled snapshot, or live Shopify through /api/commerce. */
let source: { kind: 'snapshot' | 'live'; shardCount: number } | null = null;

const LIVE_TIMEOUT_MS = 6000;

/** A live index is used only if it is complete and priced in EGP; otherwise the snapshot. */
export function isUsableIndex(v: unknown): v is IndexFile {
  const o = v as Partial<IndexFile> | null;
  return Boolean(o && o.currency === 'EGP' && Number.isInteger(o.shardCount) && (o.shardCount as number) > 0 && Array.isArray(o.products) && o.products.length > 0 && Array.isArray(o.collections));
}

async function liveIndex(): Promise<IndexFile | null> {
  try {
    const res = await fetch(`${COMMERCE_ENDPOINT}?op=catalogue&part=index`, { signal: AbortSignal.timeout(LIVE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const v: unknown = await res.json();
    return isUsableIndex(v) ? v : null;
  } catch {
    return null;
  }
}

const snapshotIndex = () => import('../../data/catalogue-index.json').then((m) => m.default as unknown as IndexFile);

/**
 * The compact index is its own chunk (dynamic import), requested as soon as
 * the app starts so it downloads while the boot sequence plays — it never
 * blocks the boot animation. In LIVE mode the server's Shopify index is tried
 * first (bounded by a timeout); any failure falls back to the snapshot.
 */
export function loadCatalogue(): Promise<Catalogue> {
  if (!promise) {
    promise = (async () => {
      const live = commerceMode() === 'live' ? await liveIndex() : null;
      const file = live ?? (await snapshotIndex());
      source = { kind: live ? 'live' : 'snapshot', shardCount: file.shardCount };
      ready = hydrate(file);
      return ready;
    })();
    promise.catch(() => {
      promise = null;
    });
  }
  return promise;
}

export const catalogueSource = () => source?.kind ?? null;

export const catalogueNow = () => ready;

export function useCatalogue(): Catalogue | null {
  const [cat, setCat] = useState<Catalogue | null>(ready);
  useEffect(() => {
    if (ready) {
      setCat(ready);
      return;
    }
    let alive = true;
    loadCatalogue().then((c) => alive && setCat(c));
    return () => {
      alive = false;
    };
  }, []);
  return cat;
}

type DetailState = { status: 'loading' } | { status: 'ready'; product: ProductDetail } | { status: 'missing' } | { status: 'error'; error: string };

export function useProductDetail(handle: string | undefined): DetailState {
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  useEffect(() => {
    if (!handle) return;
    let alive = true;
    setState({ status: 'loading' });
    loadCatalogue()
      .then(() => loadDetail(handle, source!.shardCount, source!.kind === 'live'))
      .then((p) => alive && setState(p ? { status: 'ready', product: p } : { status: 'missing' }))
      .catch((e: Error) => alive && setState({ status: 'error', error: e.message }));
    return () => {
      alive = false;
    };
  }, [handle]);
  return state;
}
