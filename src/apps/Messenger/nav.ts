import { TITLES, useOS, type Rect } from '../../state/os';
import { useSession } from '../../state/preferences';

/**
 * IYS MESSENGER is ONE window. Which view it shows is app state in that
 * window's props: `buddy` (the open conversation, or none = buddy list) and
 * `listRect` (the buddy-list geometry to go back to). Minimize/restore keeps
 * them; closing the window drops them, so a fresh open starts at the list.
 */
export const MESSENGER = 'messenger';

/** The conversation view keeps the size the separate Conversation window used to have. */
const chatSize = (desk: { w: number; h: number }) => ({
  w: Math.round(Math.min(520, desk.w - 16)),
  h: Math.round(Math.min(640, desk.h * 0.86, desk.h - 16)),
});

/** Focus an element that may still be mounting (lazy window), for up to 3 s. */
export function focusWhenReady(selector: string) {
  const until = performance.now() + 3000;
  const tick = () => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) el.focus();
    else if (performance.now() < until) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Open a conversation inside the IYS MESSENGER window (opening Messenger first if needed). */
export function openChat(id: string, name: string, focus = `[data-window="${MESSENGER}"] .chat__back`) {
  if (id === 'pjoys') useSession.getState().markPjoysRead();
  const inChat = Boolean(useOS.getState().windows.find((w) => w.id === MESSENGER)?.props.buddy);
  useOS.getState().open('messenger', { title: `${name} - Conversation`, props: { buddy: id } });
  if (!inChat) {
    // Grow from the buddy list to the conversation size, keeping its right edge (pulled inside the desktop).
    const { windows, desk, setRect, setProps } = useOS.getState();
    const r = windows.find((w) => w.id === MESSENGER)!.rect;
    const { w, h } = chatSize(desk);
    const right = Math.min(r.x + r.w, desk.w - 8);
    setProps(MESSENGER, { listRect: r });
    setRect(MESSENGER, { x: Math.max(8, right - w), y: Math.min(r.y, Math.max(0, desk.h - h - 8)), w, h });
  }
  focusWhenReady(focus);
}

/** Back to the buddy list, in the same window, at the buddy list's size. */
export function showBuddies() {
  const { windows, setProps, setTitle, setRect } = useOS.getState();
  const win = windows.find((w) => w.id === MESSENGER);
  if (!win?.props.buddy) return;
  const was = String(win.props.buddy);
  const list = win.props.listRect as Rect | undefined;
  setProps(MESSENGER, { buddy: null });
  setTitle(MESSENGER, TITLES.messenger);
  if (list) setRect(MESSENGER, { x: win.rect.x + win.rect.w - list.w, y: win.rect.y, w: list.w, h: list.h });
  focusWhenReady(`[data-window="${MESSENGER}"] .im__buddy[data-buddy="${was}"]`);
}
