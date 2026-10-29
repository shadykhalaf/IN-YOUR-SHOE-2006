import { useEffect, useState } from 'react';

/**
 * Real connection MODE → the IYS Mobile status bar's network glyph.
 *
 * Only `navigator.connection.type` may say Wi-Fi vs cellular (feature-detected,
 * never a user-agent check). `effectiveType`, `downlink` and `rtt` describe
 * measured speed, not the transport, and are deliberately never read; no
 * signal strength is claimed for either mode. `navigator.onLine` / the window
 * `online`/`offline` events give the broad offline state. Anything else, or a
 * browser without the API (e.g. iOS Safari), stays 'fallback' = the designed
 * icon. Nothing here is stored, logged or sent anywhere, and no browser global
 * is touched at import time.
 */
export type NetworkMode = 'fallback' | 'wifi' | 'cellular' | 'offline';

interface ConnectionLike {
  type?: unknown;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
}
interface NavigatorLike {
  onLine?: unknown;
  connection?: unknown;
}
interface WindowLike {
  addEventListener: (type: 'online' | 'offline', listener: () => void) => void;
  removeEventListener: (type: 'online' | 'offline', listener: () => void) => void;
}

/** onLine + connection.type → mode. ethernet / other / unknown / missing are not Wi-Fi or cellular: fallback. */
export function networkModeFor(onLine: unknown, type: unknown): NetworkMode {
  if (onLine === false || type === 'none') return 'offline';
  if (type === 'wifi') return 'wifi';
  if (type === 'cellular') return 'cellular';
  return 'fallback';
}

/**
 * Report the current mode, then every change of mode (connection `change`,
 * window `online`/`offline`). Returns an unsubscribe that removes all three
 * listeners.
 */
export function subscribeNetworkMode(nav: NavigatorLike | undefined, win: WindowLike | undefined, onChange: (mode: NetworkMode) => void): () => void {
  if (!nav) return () => {};
  const conn = typeof nav.connection === 'object' && nav.connection !== null ? (nav.connection as ConnectionLike) : undefined;
  const read = (): NetworkMode => {
    try {
      return networkModeFor(nav.onLine, conn?.type);
    } catch {
      return 'fallback';
    }
  };
  let last = read();
  onChange(last);
  const update = () => {
    const next = read();
    if (next !== last) {
      last = next;
      onChange(next);
    }
  };
  const listensToConn = typeof conn?.addEventListener === 'function' && typeof conn?.removeEventListener === 'function';
  if (listensToConn) conn!.addEventListener!('change', update);
  win?.addEventListener('online', update);
  win?.addEventListener('offline', update);
  return () => {
    if (listensToConn) conn!.removeEventListener!('change', update);
    win?.removeEventListener('online', update);
    win?.removeEventListener('offline', update);
  };
}

/** 'fallback' until (and unless) the browser truthfully reports the mode. */
export function useNetworkMode(): NetworkMode {
  const [mode, setMode] = useState<NetworkMode>('fallback');
  useEffect(() => subscribeNetworkMode(typeof navigator === 'undefined' ? undefined : navigator, typeof window === 'undefined' ? undefined : window, setMode), []);
  return mode;
}
