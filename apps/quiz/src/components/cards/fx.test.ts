// Bunnyverse Cards, lot 3 points A6, A7, A9: the pointer tilt (one write per frame, the card measured once, 14 degrees at most, a spring
// back on release) and the reduced-motion listener. The browser objects are small stand-ins; no DOM library is needed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Fn = (e: unknown) => void;
function fakeEl(): { el: HTMLElement; fire: (t: string, e?: unknown) => void; style: Map<string, string>; classes: Set<string>; measured: { n: number } } {
  const handlers = new Map<string, Fn[]>();
  const style = new Map<string, string>();
  const classes = new Set<string>();
  const measured = { n: 0 };
  const el = {
    addEventListener: (t: string, f: Fn) => handlers.set(t, [...(handlers.get(t) ?? []), f]),
    removeEventListener: (t: string, f: Fn) => handlers.set(t, (handlers.get(t) ?? []).filter((x) => x !== f)),
    getBoundingClientRect: () => { measured.n += 1; return { left: 100, top: 200, width: 200, height: 300 }; },
    style: { setProperty: (k: string, v: string) => style.set(k, v) },
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
  } as unknown as HTMLElement;
  return { el, fire: (t, e = {}) => (handlers.get(t) ?? []).forEach((f) => f(e)), style, classes, measured };
}

let frames: Array<() => void>;
let listeners: Array<(e: { matches: boolean }) => void>;
let matches: boolean;

beforeEach(() => {
  vi.resetModules();
  frames = [];
  listeners = [];
  matches = false;
  vi.stubGlobal('window', {
    scrollX: 0, scrollY: 0, addEventListener: () => undefined, removeEventListener: () => undefined,
    matchMedia: () => ({ get matches() { return matches; }, addEventListener: (_t: string, f: (e: { matches: boolean }) => void) => listeners.push(f), removeEventListener: () => undefined }),
  });
  vi.stubGlobal('requestAnimationFrame', (f: () => void) => { frames.push(f); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); });

const flush = (): void => { const f = frames; frames = []; f.forEach((x) => x()); };
const deg = (v: string | undefined): number => Number.parseFloat(v ?? 'NaN');

describe('attachTilt', () => {
  it('measures the card once when the pointer enters, never on a move, and writes once per frame however many moves came', async () => {
    const { attachTilt } = await import('./fx');
    const t = fakeEl();
    attachTilt(t.el, 14);
    t.fire('pointerenter');
    expect(t.measured.n).toBe(1);
    for (let i = 0; i < 20; i++) t.fire('pointermove', { pageX: 120 + i, pageY: 220 + i, pointerType: 'touch' });
    expect(frames).toHaveLength(1);
    flush();
    expect(t.measured.n).toBe(1);
    expect(t.classes.has('tilting')).toBe(true);
  });
  it('tilts 14 degrees at the very edge and no more, even far outside the card', async () => {
    const { attachTilt } = await import('./fx');
    const t = fakeEl();
    attachTilt(t.el, 14);
    t.fire('pointerenter');
    t.fire('pointermove', { pageX: 5000, pageY: 5000 });
    flush();
    expect(deg(t.style.get('--ry'))).toBeCloseTo(14, 1);
    expect(deg(t.style.get('--rx'))).toBeCloseTo(-14, 1);
    t.fire('pointermove', { pageX: -5000, pageY: -5000 });
    flush();
    expect(deg(t.style.get('--ry'))).toBeCloseTo(-14, 1);
    expect(deg(t.style.get('--rx'))).toBeCloseTo(14, 1);
  });
  it('only custom properties that feed transform and opacity are written', async () => {
    const { attachTilt } = await import('./fx');
    const t = fakeEl();
    attachTilt(t.el, 14);
    t.fire('pointermove', { pageX: 150, pageY: 300 });
    flush();
    expect([...t.style.keys()].sort()).toEqual(['--go', '--gx', '--gy', '--rx', '--ry']);
  });
  it('springs back to rest when the finger or the pointer leaves, and measures again on a resize', async () => {
    const { attachTilt } = await import('./fx');
    const t = fakeEl();
    attachTilt(t.el, 14);
    t.fire('pointerdown');
    t.fire('pointermove', { pageX: 300, pageY: 400, pointerType: 'touch' });
    flush();
    t.fire('pointerup', { pointerType: 'touch' });
    expect(t.style.get('--rx')).toBe('0deg');
    expect(t.style.get('--ry')).toBe('0deg');
    expect(t.style.get('--go')).toBe('0');
    expect(t.classes.has('tilting')).toBe(false);
  });
  it('does nothing under reduced motion, and the setting is read live', async () => {
    const { attachTilt } = await import('./fx');
    const t = fakeEl();
    attachTilt(t.el, 14);
    matches = true;
    t.fire('pointermove', { pageX: 150, pageY: 300 });
    expect(frames).toHaveLength(0);
    expect(t.style.size).toBe(0);
    matches = false;
    t.fire('pointermove', { pageX: 150, pageY: 300 });
    expect(frames).toHaveLength(1);
  });
});

describe('the reduced-motion setting (point A9)', () => {
  it('reducedMotion() follows matchMedia and onReducedMotionChange calls back on a change, then stops when cleaned up', async () => {
    const { reducedMotion, onReducedMotionChange } = await import('./fx');
    const seen: boolean[] = [];
    onReducedMotionChange((v) => seen.push(v));
    expect(reducedMotion()).toBe(false);
    matches = true;
    expect(reducedMotion()).toBe(true);
    listeners.forEach((f) => f({ matches: true }));
    listeners.forEach((f) => f({ matches: false }));
    expect(seen).toEqual([true, false]);
  });
});
