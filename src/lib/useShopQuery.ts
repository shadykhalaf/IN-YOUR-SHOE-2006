import { useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { MENU } from '../data/taxonomy';
import { useCatalogue } from './catalogue/load';
import { parseQuery, runQuery, toParams, type ShopQuery } from './catalogue/query';

/** Shared by desktop IYS INTERNET and IYS MOBILE: the URL is the source of truth. */
export function useShopQuery() {
  const { handle } = useParams();
  const [params, setParams] = useSearchParams();
  const cat = useCatalogue();
  const key = params.toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const q = useMemo(() => parseQuery(params, handle ?? null), [key, handle]);
  const collection = handle ? cat?.collections.get(handle) ?? null : null;
  const notFound = Boolean(cat && handle && !collection);
  const result = useMemo(() => (cat && !notFound ? runQuery(cat, q) : null), [cat, q, notFound]);

  const setQuery = useCallback(
    (patch: Partial<ShopQuery>) => {
      setParams(toParams({ ...q, ...patch }));
    },
    [q, setParams],
  );
  const reset = useCallback(() => setParams(new URLSearchParams()), [setParams]);

  // Never strand the user on a page that no longer exists after filtering.
  useEffect(() => {
    if (result && result.page.page !== q.page) setParams(toParams({ ...q, page: result.page.page }), { replace: true });
  }, [result, q, setParams]);

  const departments = useMemo(
    () =>
      MENU.filter((m) => m.collection && cat?.collections.get(m.collection)?.count).map((m) => ({
        value: m.collection!,
        label: m.label,
        count: cat?.collections.get(m.collection!)?.count ?? null,
      })),
    [cat],
  );

  return { cat, q, result, setQuery, reset, handle: handle ?? null, collection, notFound, departments, params };
}

/** Display title for a collection: IYS's own title when public, else our menu label. */
export function collectionTitle(handle: string, official: string | null | undefined): string {
  return official || MENU.find((m) => m.collection === handle)?.label || handle.replace(/-/g, ' ').toUpperCase();
}
