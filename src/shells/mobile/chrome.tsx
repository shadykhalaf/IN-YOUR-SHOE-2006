import { useEffect, useId, useRef, useState } from 'react';
import { create } from 'zustand';
import { Icon, type IconName } from '../../components/os/Icon';
import { useBatteryState, type BatteryState } from '../../lib/battery';
import { useNetworkMode } from '../../lib/network';

/**
 * The four doors in front of MSG in the IYS MOBILE bar. GAMES opens the one
 * IYS GAMES screen (an overlay, like MENU and MY BAG); the others are routes.
 * FAVS moved into MENU (FAVORITES), the old home-screen tiles are long gone.
 */
export const BAR_KEYS: { id: 'shop' | 'search' | 'games' | 'stores'; label: string; icon: IconName; to: string | null }[] = [
  { id: 'shop', label: 'SHOP ALL', icon: 'hanger', to: '/shop' },
  { id: 'search', label: 'SEARCH', icon: 'search', to: '/search' },
  { id: 'games', label: 'GAMES', icon: 'games', to: null },
  { id: 'stores', label: 'STORES', icon: 'stores', to: '/stores' },
];
export type BarKey = (typeof BAR_KEYS)[number]['id'] | 'msg';

/**
 * The IYS MOBILE bar: SHOP ALL · SEARCH · GAMES · STORES as glossy portal
 * keys, and the PJOYS message at the very end as a small envelope that only
 * carries a marker while that message is unread. Same 44px+ targets as the
 * soft keys; labels are always visible. The path title ("IYS MOBILE ›
 * SEARCH") is kept for screen readers only: the screen itself shows where u r.
 */
export function MBar({
  title,
  current,
  counts,
  unread,
  onKey,
  onGames,
  onMessages,
}: {
  title: string;
  current: BarKey | null;
  counts: Partial<Record<BarKey, number | null | undefined>>;
  unread: boolean;
  onKey: (to: string) => void;
  onGames: () => void;
  onMessages: () => void;
}) {
  return (
    <div className="m-bar">
      <p className="m-title sr-only">{title}</p>
      <nav className="m-bar__nav" aria-label="IYS MOBILE bar">
        <ul className="m-bar__keys">
          {BAR_KEYS.map((k) => {
            const n = counts[k.id];
            const name = k.id === 'games' ? `IYS GAMES${n ? `, ${n} games` : ''}` : `${k.label}${n ? `, ${n} items` : ''}`;
            return (
              <li key={k.id}>
                <button type="button" className="m-bar__key" aria-current={current === k.id ? 'page' : undefined} aria-label={name} onClick={() => (k.to ? onKey(k.to) : onGames())}>
                  <Icon name={k.icon} size={20} />
                  <span>{k.label}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className={`m-bar__key m-bar__key--msg${unread ? ' is-unread' : ''}`}
              aria-current={current === 'msg' ? 'page' : undefined}
              aria-label={unread ? 'Messages: 1 new message from PJOYS' : 'Messages: PJOYS, no new messages'}
              onClick={onMessages}
            >
              <Icon name="mail" size={20} />
              <span>MSG</span>
              {unread && (
                <span className="m-bar__marker" aria-hidden="true">
                  1
                </span>
              )}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

/** A screen can claim the centre soft key (e.g. product → ADD). */
export interface SoftAction {
  label: string;
  run: () => void;
  disabled?: boolean;
}
interface CenterState {
  stack: { id: string; action: SoftAction }[];
  action: SoftAction | null;
  put: (id: string, a: SoftAction | null) => void;
}
/** Claims stack: the most recently mounted screen/overlay owns the key. */
export const useCenterKey = create<CenterState>()((set) => ({
  stack: [],
  action: null,
  put: (id, a) =>
    set((st) => {
      const rest = st.stack.filter((x) => x.id !== id);
      const idx = st.stack.findIndex((x) => x.id === id);
      const stack = a ? (idx >= 0 ? st.stack.map((x) => (x.id === id ? { id, action: a } : x)) : [...rest, { id, action: a }]) : rest;
      return { stack, action: stack[stack.length - 1]?.action ?? null };
    }),
}));

export function useClaimCenter(action: SoftAction | null) {
  const id = useId();
  const put = useCenterKey((s) => s.put);
  const run = useRef(action?.run);
  run.current = action?.run;
  const has = Boolean(action);
  const label = action?.label ?? '';
  const disabled = action?.disabled ?? false;
  useEffect(() => {
    put(id, has ? { label, disabled, run: () => run.current?.() } : null);
  }, [id, has, label, disabled, put]);
  useEffect(() => () => put(id, null), [id, put]);
}

/**
 * Network glyph, same 22×14 footprint in every mode. Cellular and the
 * unknown/unsupported fallback are the designed 5 bars (a mode icon, never a
 * measured signal strength); Wi-Fi is the fan; offline leaves the bars unlit.
 */
function Signal() {
  const mode = useNetworkMode();
  if (mode === 'wifi')
    return (
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" shapeRendering="crispEdges" data-network={mode}>
        <g fill="none" stroke="#fff" strokeWidth="2">
          <path d="M3.2 5.2 A11 11 0 0 1 18.8 5.2" />
          <path d="M6.1 8.1 A7 7 0 0 1 15.9 8.1" />
          <path d="M8.9 10.9 A3 3 0 0 1 13.1 10.9" />
        </g>
        <rect x="10" y="12" width="2" height="2" fill="#fff" />
      </svg>
    );
  const off = mode === 'offline';
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" shapeRendering="crispEdges" data-network={mode}>
      {[0, 1, 2, 3, 4].map((i) =>
        off ? (
          <rect key={i} x={i * 4.5 + 0.5} y={12 - (i + 1) * 2.4 + 0.5} width="2" height={(i + 1) * 2.4 - 1} fill="none" stroke="#fff" />
        ) : (
          <rect key={i} x={i * 4.5} y={12 - (i + 1) * 2.4} width="3" height={(i + 1) * 2.4} fill="#fff" />
        ),
      )}
    </svg>
  );
}
/**
 * Same 3-bar icon as always. With the real Battery Status API: 3 green /
 * 2 orange / 1 red; an inactive bar is simply left unfilled (the shell stays,
 * all three rects stay, so the geometry never changes). Without it: the
 * designed 3 green bars, untouched.
 */
const BATTERY_BARS: Record<BatteryState, { lit: number; fill: string }> = {
  fallback: { lit: 3, fill: '#7dff9a' },
  high: { lit: 3, fill: '#7dff9a' },
  medium: { lit: 2, fill: '#ffb020' },
  low: { lit: 1, fill: '#e0292c' },
};
function Battery() {
  const state = useBatteryState();
  const { lit, fill } = BATTERY_BARS[state];
  return (
    <svg width="26" height="13" viewBox="0 0 26 13" aria-hidden="true" shapeRendering="crispEdges" data-battery={state}>
      <rect x="0.5" y="0.5" width="22" height="12" fill="none" stroke="#fff" />
      <rect x="23" y="4" width="2.5" height="5" fill="#fff" />
      <rect x="2.5" y="2.5" width="5" height="8" fill={lit >= 1 ? fill : 'none'} />
      <rect x="8.5" y="2.5" width="5" height="8" fill={lit >= 2 ? fill : 'none'} />
      <rect x="14.5" y="2.5" width="5" height="8" fill={lit >= 3 ? fill : 'none'} />
    </svg>
  );
}

export function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="m-status" role="presentation">
      <span className="m-status__left">
        <Signal /> <b>IYS</b>
      </span>
      <span className="m-status__time" aria-label={`Time ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}>
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className="m-status__right">
        <span className="m-status__target">2006</span>
        <Battery />
      </span>
    </div>
  );
}
