import { create } from 'zustand';

/**
 * The handoff in flight (CHECKOUT or REAL IYS): the bag shows the shared busy
 * look, the button can't be pressed twice, and a slow redirect gets a direct
 * link. Cleared if the visitor comes back (Back / bfcache) or after 20 s.
 */
interface Handoff {
  pending: { to: 'checkout' | 'real'; url: string; at: number } | null;
}
export const useHandoff = create<Handoff>()(() => ({ pending: null }));
if (typeof window !== 'undefined') window.addEventListener('pageshow', () => useHandoff.setState({ pending: null }));
