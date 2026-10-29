import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { local, session } from './storage';

export type Wallpaper =
  | { kind: 'preset'; id: string }
  | { kind: 'image'; src: string; title: string; sourceUrl?: string };
export type WallpaperMode = 'stretch' | 'center' | 'tile';

interface Preferences {
  sound: boolean;
  crt: boolean;
  wallpaper: Wallpaper;
  wallpaperMode: WallpaperMode;
  setSound: (on: boolean) => void;
  setCrt: (on: boolean) => void;
  setWallpaper: (w: Wallpaper, mode?: WallpaperMode) => void;
  setWallpaperMode: (m: WallpaperMode) => void;
  reset: () => void;
}

export const DEFAULT_WALLPAPER: Wallpaper = { kind: 'preset', id: 'hills' };

/** localStorage: sound (default OFF), CRT, wallpaper. Never window positions. */
export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      sound: false,
      crt: true,
      wallpaper: DEFAULT_WALLPAPER,
      wallpaperMode: 'stretch',
      setSound: (sound) => set({ sound }),
      setCrt: (crt) => set({ crt }),
      setWallpaper: (wallpaper, mode) => set((s) => ({ wallpaper, wallpaperMode: mode ?? s.wallpaperMode })),
      setWallpaperMode: (wallpaperMode) => set({ wallpaperMode }),
      reset: () => set({ crt: true, wallpaper: DEFAULT_WALLPAPER, wallpaperMode: 'stretch' }),
    }),
    {
      name: 'iys2006.preferences',
      storage: local,
      version: 1,
      partialize: ({ sound, crt, wallpaper, wallpaperMode }) => ({ sound, crt, wallpaper, wallpaperMode }),
    },
  ),
);

interface SessionState {
  bootSeen: boolean;
  welcomeSeen: boolean;
  /** PJOYS has texted this session ("u awake?"). */
  pjoysPinged: boolean;
  /** …and that conversation has been opened since. Unread = pinged && !read. */
  pjoysRead: boolean;
  /** IYS MOBILE welcome.htm is minimised to its title bar (restored from that same bar). */
  welcomeMinimized: boolean;
  markBoot: () => void;
  markWelcome: () => void;
  markPjoys: () => void;
  markPjoysRead: () => void;
  setWelcomeMinimized: (min: boolean) => void;
}

/** sessionStorage: boot plays once per browser session. */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      bootSeen: false,
      welcomeSeen: false,
      pjoysPinged: false,
      pjoysRead: false,
      welcomeMinimized: false,
      markBoot: () => set({ bootSeen: true }),
      markWelcome: () => set({ welcomeSeen: true }),
      markPjoys: () => set({ pjoysPinged: true }),
      markPjoysRead: () => set({ pjoysRead: true }),
      setWelcomeMinimized: (welcomeMinimized) => set({ welcomeMinimized }),
    }),
    {
      name: 'iys2006.session',
      storage: session,
      version: 1,
      partialize: ({ bootSeen, welcomeSeen, pjoysPinged, pjoysRead, welcomeMinimized }) => ({ bootSeen, welcomeSeen, pjoysPinged, pjoysRead, welcomeMinimized }),
      // Sessions saved before `pjoysRead` existed never kept an unread marker across reloads: treat them as read.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SessionState>;
        return { ...current, ...p, pjoysRead: p.pjoysRead ?? Boolean(p.pjoysPinged) };
      },
    },
  ),
);

/** The one PJOYS unread state for both shells: texted this session and not opened since. */
export const usePjoysUnread = () => useSession((s) => s.pjoysPinged && !s.pjoysRead);
