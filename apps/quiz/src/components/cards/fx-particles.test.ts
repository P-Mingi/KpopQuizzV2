// KpopCards (agent C), lot 5: the particle layer is one canvas at one canvas pixel per screen pixel, never more than 260 particles at once,
// and nothing under reduced motion.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let matches = false;
const frames: Array<() => void> = [];
beforeEach(() => {
  vi.resetModules(); frames.length = 0; matches = false;
  vi.stubGlobal('window', { devicePixelRatio: 3, addEventListener: () => undefined, removeEventListener: () => undefined, matchMedia: () => ({ get matches() { return matches; }, addEventListener: () => undefined, removeEventListener: () => undefined }) });
  vi.stubGlobal('innerWidth', 390); vi.stubGlobal('innerHeight', 664);
  vi.stubGlobal('requestAnimationFrame', (f: () => void) => { frames.push(f); return frames.length; });
});
afterEach(() => { vi.unstubAllGlobals(); });

function canvas(): HTMLCanvasElement {
  const cx = { setTransform: () => undefined, clearRect: () => undefined, beginPath: () => undefined, arc: () => undefined, fill: () => undefined, fillRect: () => undefined, save: () => undefined, restore: () => undefined, translate: () => undefined, rotate: () => undefined, globalAlpha: 1, fillStyle: '' };
  return { width: 0, height: 0, getContext: () => cx } as unknown as HTMLCanvasElement;
}

describe('the particle layer', () => {
  it('one canvas pixel per screen pixel, even on a 3x phone', async () => {
    const { Fx } = await import('./fx');
    const cv = canvas(); new Fx(cv);
    expect([cv.width, cv.height]).toEqual([390, 664]);
  });
  it('never holds more than 260 particles, bursts and rain together', async () => {
    const { Fx } = await import('./fx');
    const f = new Fx(canvas());
    f.burst(10, 10, { n: 120 }); f.burst(10, 10, { n: 120 }); f.rain(['#fff'], 160); f.burst(10, 10, { n: 90 });
    expect(f.count).toBeLessThanOrEqual(260);
    expect(f.count).toBeGreaterThan(200);
  });
  it('draws nothing under reduced motion', async () => {
    matches = true;
    const { Fx } = await import('./fx');
    const f = new Fx(canvas());
    f.burst(10, 10, { n: 50 }); f.rain(['#fff'], 50);
    expect(f.count).toBe(0);
  });
});
