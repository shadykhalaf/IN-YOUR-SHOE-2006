import { describe, expect, it, vi } from 'vitest';
import { networkModeFor, subscribeNetworkMode, type NetworkMode } from '../lib/network';

/** A stand-in NetworkInformation: settable `type`, counted listeners, and a trap on speed fields. */
function fakeConnection(type: string | undefined) {
  const target = new EventTarget();
  let listeners = 0;
  const speedReads: string[] = [];
  const conn = {
    type,
    get effectiveType() {
      speedReads.push('effectiveType');
      return '4g';
    },
    get downlink() {
      speedReads.push('downlink');
      return 10;
    },
    get rtt() {
      speedReads.push('rtt');
      return 50;
    },
    addEventListener: (t: string, fn: () => void) => {
      listeners++;
      target.addEventListener(t, fn);
    },
    removeEventListener: (t: string, fn: () => void) => {
      listeners--;
      target.removeEventListener(t, fn);
    },
    set(next: string | undefined) {
      conn.type = next;
      target.dispatchEvent(new Event('change'));
    },
    get listeners() {
      return listeners;
    },
    speedReads,
  };
  return conn;
}
function fakeWindow() {
  const target = new EventTarget();
  const counts = { online: 0, offline: 0 };
  return {
    addEventListener: (t: 'online' | 'offline', fn: () => void) => {
      counts[t]++;
      target.addEventListener(t, fn);
    },
    removeEventListener: (t: 'online' | 'offline', fn: () => void) => {
      counts[t]--;
      target.removeEventListener(t, fn);
    },
    fire: (t: 'online' | 'offline') => target.dispatchEvent(new Event(t)),
    counts,
  };
}

describe('networkModeFor (connection.type is the only Wi-Fi / cellular authority)', () => {
  it.each([
    [true, 'wifi', 'wifi'],
    [true, 'cellular', 'cellular'],
    [true, 'none', 'offline'],
    [false, 'wifi', 'offline'],
    [false, undefined, 'offline'],
    [true, undefined, 'fallback'],
    [true, 'unknown', 'fallback'],
    [true, 'other', 'fallback'],
    [true, 'ethernet', 'fallback'],
    [true, 'bluetooth', 'fallback'],
    [undefined, undefined, 'fallback'],
  ] as const)('onLine %s + type %s → %s', (onLine, type, mode) => {
    expect(networkModeFor(onLine, type)).toBe(mode);
  });
});

describe('subscribeNetworkMode', () => {
  it('no navigator → nothing reported (designed fallback stays)', () => {
    const seen: NetworkMode[] = [];
    subscribeNetworkMode(undefined, fakeWindow(), (m) => seen.push(m))();
    expect(seen).toEqual([]);
  });

  it('no Network Information API (e.g. iOS Safari) → fallback; type missing → fallback', () => {
    const seen: NetworkMode[] = [];
    subscribeNetworkMode({ onLine: true }, fakeWindow(), (m) => seen.push(m))();
    subscribeNetworkMode({ onLine: true, connection: { effectiveType: '4g' } }, fakeWindow(), (m) => seen.push(m))();
    expect(seen).toEqual(['fallback', 'fallback']);
  });

  it('never decides from effectiveType / downlink / rtt', () => {
    const conn = fakeConnection('wifi');
    const seen: NetworkMode[] = [];
    const stop = subscribeNetworkMode({ onLine: true, connection: conn }, fakeWindow(), (m) => seen.push(m));
    conn.set(undefined);
    conn.set('cellular');
    stop();
    expect(seen).toEqual(['wifi', 'fallback', 'cellular']);
    expect(conn.speedReads).toEqual([]);
  });

  it('follows connection `change` live: wifi → cellular → wifi, only on real changes', () => {
    const conn = fakeConnection('wifi');
    const seen: NetworkMode[] = [];
    const stop = subscribeNetworkMode({ onLine: true, connection: conn }, fakeWindow(), (m) => seen.push(m));
    conn.set('cellular');
    conn.set('cellular');
    conn.set('wifi');
    conn.set('none');
    expect(seen).toEqual(['wifi', 'cellular', 'wifi', 'offline']);
    stop();
  });

  it('follows window online / offline', () => {
    const conn = fakeConnection('cellular');
    const nav = { onLine: true, connection: conn };
    const win = fakeWindow();
    const seen: NetworkMode[] = [];
    const stop = subscribeNetworkMode(nav, win, (m) => seen.push(m));
    nav.onLine = false;
    win.fire('offline');
    nav.onLine = true;
    win.fire('online');
    expect(seen).toEqual(['cellular', 'offline', 'cellular']);
    stop();
  });

  it('offline works without the Network Information API too', () => {
    const nav: { onLine: boolean } = { onLine: true };
    const win = fakeWindow();
    const seen: NetworkMode[] = [];
    const stop = subscribeNetworkMode(nav, win, (m) => seen.push(m));
    nav.onLine = false;
    win.fire('offline');
    nav.onLine = true;
    win.fire('online');
    expect(seen).toEqual(['fallback', 'offline', 'fallback']);
    stop();
  });

  it('removes the connection change listener and both window listeners on unmount', () => {
    const conn = fakeConnection('wifi');
    const win = fakeWindow();
    const onChange = vi.fn();
    const stop = subscribeNetworkMode({ onLine: true, connection: conn }, win, onChange);
    expect([conn.listeners, win.counts.online, win.counts.offline]).toEqual([1, 1, 1]);
    stop();
    expect([conn.listeners, win.counts.online, win.counts.offline]).toEqual([0, 0, 0]);
    conn.set('cellular');
    win.fire('offline');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('a connection object that throws on read never breaks the status bar', () => {
    const seen: NetworkMode[] = [];
    const conn = Object.defineProperty({}, 'type', {
      get() {
        throw new Error('blocked');
      },
    });
    subscribeNetworkMode({ onLine: true, connection: conn }, fakeWindow(), (m) => seen.push(m))();
    expect(seen).toEqual(['fallback']);
  });

  it('never touches storage or the network', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const conn = fakeConnection('wifi');
    const stop = subscribeNetworkMode({ onLine: true, connection: conn }, fakeWindow(), () => {});
    conn.set('cellular');
    stop();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
