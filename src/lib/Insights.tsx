import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { page, startInsights } from './insights';

/**
 * Mounts the shopping-step counting (see ./insights.ts) and reports each route
 * change. Renders nothing and never throws into the tree.
 */
export default function Insights() {
  const { pathname } = useLocation();

  useEffect(() => { startInsights(); }, []);
  useEffect(() => { page(pathname); }, [pathname]);

  return null;
}
