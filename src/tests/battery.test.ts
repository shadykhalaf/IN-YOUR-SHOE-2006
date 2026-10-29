import { describe, expect, it, vi } from 'vitest';
import { batteryStateForLevel, batteryStateForPercent, subscribeBattery, type BatteryState } from '../lib/battery';

/** A stand-in BatteryManager: an EventTarget with a settable level and listener counting. */
function fakeBattery(level: number) {
  const target = new EventTarget();
  let listeners = 0;
  const battery = {
    level,
    charging: false,
    addEventListener: (type: string, fn: () => void) => {
      listeners++;
      target.addEventListener(type, fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      listeners--;
      target.removeEventListener(type, fn);
    },
    set(next: number) {
      battery.level = next;
      target.dispatchEvent(new Event('levelchange'));
    },
    get listeners() {
      return listeners;
    },
  };
  return battery;
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('battery bucket mapping (exact boundaries)', () => {
  it.each([
    [100, 'high'],
    [99, 'high'],
    [66, 'high'],
    [65, 'medium'],
    [50, 'medium'],
    [33, 'medium'],
    [32, 'low'],
    [20, 'low'],
    [1, 'low'],
    [0, 'low'],
  ] as const)('%i%% → %s', (pct, state) => {
    expect(batteryStateForPercent(pct)).toBe(state);
  });

  it('reads BatteryManager.level (0…1) the same way, rounding to whole percent', () => {
    expect(batteryStateForLevel(1)).toBe('high');
    expect(batteryStateForLevel(0.66)).toBe('high');
    expect(batteryStateForLevel(0.65)).toBe('medium');
    expect(batteryStateForLevel(0.33)).toBe('medium');
    expect(batteryStateForLevel(0.32)).toBe('low');
    expect(batteryStateForLevel(0)).toBe('low'); // never zero bars
    expect(batteryStateForLevel(0.655)).toBe('high'); // 65.5 → 66
  });

  it('ignores anything that is not a real level', () => {
    for (const bad of [Number.NaN, Infinity, '0.5', null, undefined]) expect(batteryStateForLevel(bad)).toBeNull();
  });
});

describe('subscribeBattery (feature-detected, fallback on any failure)', () => {
  it('no navigator / no getBattery → never reports, nothing throws', async () => {
    const seen: BatteryState[] = [];
    subscribeBattery(undefined, (s) => seen.push(s))();
    subscribeBattery({}, (s) => seen.push(s))();
    await flush();
    expect(seen).toEqual([]);
  });

  it('getBattery throwing, rejecting or returning junk → stays on fallback', async () => {
    const seen: BatteryState[] = [];
    subscribeBattery({ getBattery: () => { throw new Error('blocked'); } }, (s) => seen.push(s));
    subscribeBattery({ getBattery: () => Promise.reject(new Error('denied')) }, (s) => seen.push(s));
    subscribeBattery({ getBattery: () => Promise.resolve({ level: 0.5 }) }, (s) => seen.push(s));
    subscribeBattery({ getBattery: () => Promise.resolve(null) }, (s) => seen.push(s));
    await flush();
    expect(seen).toEqual([]);
  });

  it('follows levelchange live, only when the bucket changes', async () => {
    const b = fakeBattery(0.9);
    const seen: BatteryState[] = [];
    const stop = subscribeBattery({ getBattery: () => Promise.resolve(b) }, (s) => seen.push(s));
    await flush();
    expect(seen).toEqual(['high']);
    b.set(0.8); // 90 → 80: same bucket, no update
    b.set(0.66);
    expect(seen).toEqual(['high']);
    b.set(0.5);
    expect(seen).toEqual(['high', 'medium']);
    b.set(0.33);
    b.set(0.2);
    expect(seen).toEqual(['high', 'medium', 'low']);
    b.set(0);
    expect(seen).toEqual(['high', 'medium', 'low']);
    stop();
  });

  it('removes its levelchange listener on unmount, and attaches none if unmounted first', async () => {
    const b = fakeBattery(0.8);
    const onChange = vi.fn();
    const stop = subscribeBattery({ getBattery: () => Promise.resolve(b) }, onChange);
    await flush();
    expect(b.listeners).toBe(1);
    stop();
    expect(b.listeners).toBe(0);
    b.set(0.1);
    expect(onChange).toHaveBeenCalledTimes(1);

    const early = fakeBattery(0.8);
    const stopEarly = subscribeBattery({ getBattery: () => Promise.resolve(early) }, onChange);
    stopEarly();
    await flush();
    expect(early.listeners).toBe(0);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('never touches storage or the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const b = fakeBattery(0.4);
    const stop = subscribeBattery({ getBattery: () => Promise.resolve(b) }, () => {});
    await flush();
    b.set(0.1);
    stop();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
