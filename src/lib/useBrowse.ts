import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useOS } from '../state/os';

/** Navigate IYS INTERNET to a real route and bring the browser forward. */
export function useBrowse() {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (to: string) => {
      const same = location.pathname + location.search === to;
      if (!same) navigate(to);
      useOS.getState().open('internet');
    },
    [navigate, location.pathname, location.search],
  );
}

export const productPath = (handle: string) => `/product/${handle}`;
export const collectionPath = (handle: string | null) => (handle ? `/collections/${handle}` : '/shop');
/** TOUCH_GRASS.EXE: the curated product, or a search if it ever leaves the snapshot. */
export const touchGrassPath = (handle: string | null | undefined) => (handle ? productPath(handle) : `/search?q=${encodeURIComponent('touch grass')}`);
/** The fake address bar mirrors the real route on the official domain. */
export function fakeAddress(pathname: string, search: string): string {
  const path = pathname.replace(/^\/product\//, '/products/');
  return `http://www.inyourshoe.com${path === '/' ? '/' : path}${search}`;
}
