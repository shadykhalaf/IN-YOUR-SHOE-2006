import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { local } from './storage';

/** Offset of a moved desktop icon from its default grid slot, in CSS px. */
export interface IconOffset {
  dx: number;
  dy: number;
}

interface IconPositions {
  offsets: Record<string, IconOffset>;
  move: (id: string, o: IconOffset) => void;
  reset: () => void;
}

/**
 * Desktop icon positions for IYS Retro V2 only. Icons with no entry sit in
 * their default grid slot; nothing is sent anywhere.
 */
export const ICON_POSITIONS_KEY = 'iys2000sv2.desktopIcons';

export const useIconPositions = create<IconPositions>()(
  persist(
    (set) => ({
      offsets: {},
      move: (id, o) => set((s) => ({ offsets: { ...s.offsets, [id]: { dx: Math.round(o.dx), dy: Math.round(o.dy) } } })),
      reset: () => set({ offsets: {} }),
    }),
    { name: ICON_POSITIONS_KEY, storage: local, version: 1, partialize: ({ offsets }) => ({ offsets }) },
  ),
);
