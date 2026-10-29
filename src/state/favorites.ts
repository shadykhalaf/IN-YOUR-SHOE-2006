import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { local } from './storage';

interface FavoritesState {
  handles: string[];
  toggle: (handle: string) => boolean;
  has: (handle: string) => boolean;
  remove: (handle: string) => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      handles: [],
      toggle: (handle) => {
        const on = !get().handles.includes(handle);
        set((s) => ({ handles: on ? [handle, ...s.handles] : s.handles.filter((h) => h !== handle) }));
        return on;
      },
      has: (handle) => get().handles.includes(handle),
      remove: (handle) => set((s) => ({ handles: s.handles.filter((h) => h !== handle) })),
    }),
    { name: 'iys2006.favorites', storage: local, version: 1 },
  ),
);
