import { useEffect, useState } from 'react';

/**
 * Official IYS size charts (written by `npm run sync-size-charts`): the exact
 * chart image(s) each product page shows in its SIZE CHART modal. Loaded as
 * its own small chunk the first time a product page asks. Nothing here is
 * measured, typed or inferred.
 */
export interface SizeChartImage {
  src: string;
  width: number | null;
  height: number | null;
}
export interface SizeChartFile {
  generatedAt: string;
  charts: Record<string, SizeChartImage>;
  products: Record<string, string[]>;
  /** Product pages that answered 404 at sync time (no longer public on inyourshoe.com). */
  notPublic: string[];
}

let pending: Promise<SizeChartFile> | null = null;
export const loadSizeCharts = () => (pending ??= import('../data/size-charts.generated.json').then((m) => m.default as unknown as SizeChartFile));

export type SizeChartState =
  | { status: 'loading' }
  | { status: 'found'; images: SizeChartImage[]; checkedOn: string }
  /** The product page publishes no chart (or the page is no longer public): never invented. */
  | { status: 'none'; checkedOn: string; gone: boolean }
  | { status: 'error' };

/** Pure: what the guide shows for one product, from the synced file. */
export function chartState(f: SizeChartFile, handle: string): Exclude<SizeChartState, { status: 'loading' | 'error' }> {
  const checkedOn = f.generatedAt.slice(0, 10);
  const images = (f.products[handle] ?? []).map((id) => f.charts[id]).filter((c): c is SizeChartImage => Boolean(c));
  return images.length ? { status: 'found', images, checkedOn } : { status: 'none', checkedOn, gone: (f.notPublic ?? []).includes(handle) };
}

export function useSizeChart(handle: string | undefined): SizeChartState {
  const [state, setState] = useState<SizeChartState>({ status: 'loading' });
  useEffect(() => {
    if (!handle) return;
    let alive = true;
    setState({ status: 'loading' });
    loadSizeCharts().then(
      (f) => alive && setState(chartState(f, handle)),
      () => alive && setState({ status: 'error' }),
    );
    return () => {
      alive = false;
    };
  }, [handle]);
  return state;
}
