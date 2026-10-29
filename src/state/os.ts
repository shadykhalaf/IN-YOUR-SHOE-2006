import { create } from 'zustand';

export type AppId =
  | 'internet'
  | 'messenger'
  | 'wardrobe'
  | 'camera'
  | 'viewer'
  | 'bag'
  | 'control'
  | 'mail'
  | 'readme'
  | 'recycle'
  | 'newsletter'
  | 'help'
  | 'exchange'
  | 'essentials'
  | 'games'
  | 'game'
  | 'sizeguide';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Win {
  id: string;
  app: AppId;
  title: string;
  props: Record<string, unknown>;
  minimized: boolean;
  maximized: boolean;
  z: number;
  rect: Rect;
  /** Bumped on each open() so the window can replay its open animation. */
  opened: number;
}

export type Dialog =
  | { kind: 'welcome' }
  | { kind: 'error'; title: string; message: string; action?: { label: string; handle: string } }
  | { kind: 'confirm-reset' }
  | { kind: 'info'; title: string; lines: string[] }
  /** "HAVING A HARD TIME?": the escape route to the real store (src/lib/frustration.ts). */
  | { kind: 'escape' };

export interface Balloon {
  id: string;
  title: string;
  text: string;
  app?: AppId;
  props?: Record<string, unknown>;
  windowId?: string;
}

/** Sensible default geometry per app, clamped to the desktop (taskbar excluded). */
export function defaultRect(app: AppId, desk: { w: number; h: number }, stack: number): Rect {
  const sizes: Record<AppId, [number, number]> = {
    // Taller than the other apps: the shop page gets the whole first screen (hero + the JUST DROPPED peek).
    internet: [Math.min(1120, desk.w * 0.74), Math.min(860, desk.h - 24)],
    messenger: [268, Math.min(520, desk.h * 0.72)],
    wardrobe: [Math.min(820, desk.w * 0.62), Math.min(560, desk.h * 0.78)],
    camera: [Math.min(800, desk.w * 0.6), Math.min(580, desk.h * 0.82)],
    viewer: [Math.min(760, desk.w * 0.56), Math.min(640, desk.h * 0.9)],
    // tall enough for the bag, the U MIGHT ALSO LIKE row and the checkout footer together
    bag: [420, Math.min(820, desk.h - 40)],
    control: [520, Math.min(520, desk.h * 0.82)],
    mail: [500, 500],
    readme: [420, 320],
    recycle: [460, 360],
    newsletter: [440, 380],
    help: [Math.min(720, desk.w * 0.6), Math.min(560, desk.h * 0.8)],
    exchange: [Math.min(720, desk.w * 0.6), Math.min(560, desk.h * 0.8)],
    essentials: [380, Math.min(470, desk.h * 0.8)],
    games: [Math.min(700, desk.w * 0.6), Math.min(520, desk.h * 0.8)],
    game: [Math.min(640, desk.w * 0.6), Math.min(700, desk.h * 0.94)],
    sizeguide: [Math.min(620, desk.w * 0.5), Math.min(520, desk.h * 0.8)],
  };
  const [w0, h0] = sizes[app];
  const w = Math.round(Math.min(w0, desk.w - 16));
  const h = Math.round(Math.min(h0, desk.h - 16));
  const anchors: Partial<Record<AppId, [number, number]>> = {
    internet: [desk.w * 0.13, 12],
    messenger: [desk.w - w - 24, 24],
    bag: [desk.w - w - 36, desk.h - h - 20],
    // beside the product page, so the chart and the size picker are both in view
    sizeguide: [desk.w - w - 24, 40],
  };
  const [ax, ay] = anchors[app] ?? [(desk.w - w) / 2, (desk.h - h) / 2.4];
  const offset = (stack % 6) * 26;
  return clampRect({ x: Math.round(ax + offset), y: Math.round(ay + offset), w, h }, desk);
}

/** Windows can never be lost off-screen: a 120×28 grab area always stays visible. */
export function clampRect(r: Rect, desk: { w: number; h: number }): Rect {
  const w = Math.min(r.w, desk.w);
  const h = Math.min(r.h, desk.h);
  const x = Math.min(Math.max(r.x, -w + 120), desk.w - 120);
  const y = Math.min(Math.max(r.y, 0), desk.h - 28);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

interface OSState {
  windows: Win[];
  activeId: string | null;
  top: number;
  desk: { w: number; h: number };
  dialog: Dialog | null;
  balloon: Balloon | null;
  /** Transient taskbar/OS status line (e.g. "WALLPAPER UPDATED xo"). */
  notice: { text: string; at: number } | null;
  startOpen: boolean;
  /** Where the IYS menu was opened from: the taskbar button, or the top strip's MENU button. */
  startAnchor: 'taskbar' | 'top';
  /**
   * DESKTOP (show desktop) is on: which windows it tucked away and which one
   * was active, so pressing it again brings exactly those back. Cleared as soon
   * as the visitor opens or focuses a window themselves.
   */
  desktopShown: { ids: string[]; activeId: string | null } | null;
  setDesk: (w: number, h: number) => void;
  open: (app: AppId, opts?: { id?: string; title?: string; props?: Record<string, unknown>; maximized?: boolean; focus?: boolean }) => string;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setRect: (id: string, rect: Partial<Rect>) => void;
  setTitle: (id: string, title: string) => void;
  /** Merge app state into a window's props (e.g. which view IYS MESSENGER shows). */
  setProps: (id: string, props: Record<string, unknown>) => void;
  minimizeAll: () => void;
  /** DESKTOP button: minimize every window, or restore the ones it minimized. Nothing is closed. */
  toggleDesktop: () => void;
  closeAll: () => void;
  showDialog: (d: Dialog | null) => void;
  showBalloon: (b: Balloon | null) => void;
  notify: (text: string) => void;
  setStart: (open: boolean, anchor?: 'taskbar' | 'top') => void;
}

export const TITLES: Record<AppId, string> = {
  internet: 'IYS INTERNET',
  messenger: 'IYS MESSENGER',
  wardrobe: 'MY WARDROBE',
  camera: 'IYS CAMERA',
  viewer: 'IYS IMAGE VIEWER',
  bag: 'MY BAG',
  control: 'CONTROL PANEL',
  mail: 'IYS MAIL',
  readme: 'README.TXT - Notepad',
  recycle: 'RECYCLE BIN',
  newsletter: 'IYS NEWSLETTER',
  help: 'IYS HELP & SUPPORT',
  exchange: 'XCHANGE.EXE :) - EXCHANGES / REFUNDS FORM',
  essentials: 'IYS ESSENTIALS',
  games: 'IYS GAMES',
  game: 'IYS GAME',
  sizeguide: 'SIZE GUIDE',
};

const topActive = (windows: Win[]) =>
  windows.filter((w) => !w.minimized).reduce<Win | null>((a, b) => (!a || b.z > a.z ? b : a), null)?.id ?? null;

export const useOS = create<OSState>()((set, get) => ({
  windows: [],
  activeId: null,
  top: 10,
  desk: { w: typeof window === 'undefined' ? 1280 : window.innerWidth, h: typeof window === 'undefined' ? 800 : window.innerHeight - 34 },
  dialog: null,
  balloon: null,
  notice: null,
  startOpen: false,
  startAnchor: 'taskbar',
  desktopShown: null,
  setDesk: (w, h) =>
    set((s) => ({
      desk: { w, h },
      windows: s.windows.map((win) => ({ ...win, rect: clampRect(win.rect, { w, h }) })),
    })),
  open: (app, opts = {}) => {
    const id = opts.id ?? app;
    const s = get();
    const existing = s.windows.find((w) => w.id === id);
    const z = s.top + 1;
    if (existing) {
      set({
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, minimized: false, z, props: { ...w.props, ...opts.props }, title: opts.title ?? w.title, maximized: opts.maximized ?? w.maximized } : w,
        ),
        activeId: id,
        top: z,
        startOpen: false,
        desktopShown: null,
      });
      return id;
    }
    const narrow = s.desk.w < 1100;
    const win: Win = {
      id,
      app,
      title: opts.title ?? TITLES[app],
      props: opts.props ?? {},
      minimized: false,
      maximized: opts.maximized ?? (narrow && (app === 'internet' || app === 'wardrobe' || app === 'camera')),
      z,
      rect: defaultRect(app, s.desk, s.windows.length),
      opened: Date.now(),
    };
    set({ windows: [...s.windows, win], activeId: id, top: z, startOpen: false, desktopShown: null });
    return id;
  },
  close: (id) =>
    set((s) => {
      const windows = s.windows.filter((w) => w.id !== id);
      return { windows, activeId: s.activeId === id ? topActive(windows) : s.activeId };
    }),
  focus: (id) =>
    set((s) => {
      if (s.activeId === id && s.windows.find((w) => w.id === id)?.z === s.top) return s;
      const z = s.top + 1;
      return { windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)), activeId: id, top: z, desktopShown: null };
    }),
  minimize: (id) =>
    set((s) => {
      const windows = s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
      return { windows, activeId: s.activeId === id ? topActive(windows) : s.activeId };
    }),
  restore: (id) => get().focus(id),
  toggleMaximize: (id) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)) })),
  setRect: (id, rect) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, rect: clampRect({ ...w.rect, ...rect }, s.desk) } : w)) })),
  setTitle: (id, title) => set((s) => ({ windows: s.windows.map((w) => (w.id === id && w.title !== title ? { ...w, title } : w)) })),
  setProps: (id, props) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, props: { ...w.props, ...props } } : w)) })),
  minimizeAll: () => set((s) => ({ windows: s.windows.map((w) => ({ ...w, minimized: true })), activeId: null })),
  toggleDesktop: () =>
    set((s) => {
      if (s.desktopShown) {
        const back = new Set(s.desktopShown.ids);
        const windows = s.windows.map((w) => (back.has(w.id) ? { ...w, minimized: false } : w));
        const active = s.desktopShown.activeId && windows.some((w) => w.id === s.desktopShown!.activeId && !w.minimized) ? s.desktopShown.activeId : topActive(windows);
        return { windows, activeId: active, desktopShown: null, startOpen: false };
      }
      const ids = s.windows.filter((w) => !w.minimized).map((w) => w.id);
      if (!ids.length) return { startOpen: false };
      return { windows: s.windows.map((w) => ({ ...w, minimized: true })), activeId: null, desktopShown: { ids, activeId: s.activeId }, startOpen: false };
    }),
  closeAll: () => set({ windows: [], activeId: null }),
  showDialog: (dialog) => set({ dialog }),
  showBalloon: (balloon) => set({ balloon }),
  notify: (text) => set({ notice: { text, at: Date.now() } }),
  setStart: (startOpen, anchor) => set((s) => ({ startOpen, startAnchor: startOpen ? anchor ?? 'taskbar' : s.startAnchor })),
}));
