import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router';
import { loadCatalogue } from './lib/catalogue/load';
import { useMediaQuery } from './lib/motion';

const DesktopShell = lazy(() => import('./shells/DesktopShell'));
const MobileShell = lazy(() => import('./shells/MobileShell'));
const Showcase = lazy(() => import('./showcase/Showcase'));
const Analytics = lazy(() => import('./lib/analytics'));
// dev-only Catchy fidelity check (dead code in production builds)
const CatchyCompare = import.meta.env.DEV ? lazy(() => import('./features/catchy/dev/CatchyCompare')) : null;

/** Below this width the site switches to IYS MOBILE (a different shell, not a shrunk desktop). */
export const MOBILE_QUERY = '(max-width: 699px)';

export function App() {
  const { pathname } = useLocation();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const showcase = pathname === '/showcase';

  // The catalogue index downloads in parallel with boot; it never blocks it.
  useEffect(() => {
    if (!showcase) void loadCatalogue();
  }, [showcase]);

  if (CatchyCompare && pathname === '/catchy-compare') {
    return (
      <Suspense fallback={null}>
        <CatchyCompare />
      </Suspense>
    );
  }
  if (showcase) {
    return (
      <Suspense fallback={null}>
        <Showcase />
      </Suspense>
    );
  }
  return (
    <>
      <Suspense fallback={<div className="shell-loading" aria-busy="true" />}>{mobile ? <MobileShell /> : <DesktopShell />}</Suspense>
      {import.meta.env.PROD && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) && (
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      )}
    </>
  );
}
