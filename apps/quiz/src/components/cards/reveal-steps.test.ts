// Bunnyverse Cards, lot 3 points A5, A8, A9: the small machines under the pack opening, driven with fake timers (no DOM).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DWELL_HIGH_MS, DWELL_LOW_MS, FADE_MS, FLIP_ALL_MS, SPOTLIGHT_MS, StepRunner, SWEEP_EASE, SWEEP_MS, dwellMs, finishAnimations, leaveWait, spotlightIndex } from './reveal-steps';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('the stay of a card before a tap can leave it (point A5)', () => {
  it('150 ms from Standard to Holo, 450 ms from Era up', () => {
    expect([DWELL_LOW_MS, DWELL_HIGH_MS]).toEqual([150, 450]);
    expect((['C', 'U', 'R'] as const).map(dwellMs)).toEqual([150, 150, 150]);
    expect((['SR', 'UR', 'L'] as const).map(dwellMs)).toEqual([450, 450, 450]);
  });
  it('says how long is left, never negative', () => {
    expect(leaveWait(1000, 1000, 'C')).toBe(150);
    expect(leaveWait(1000, 1100, 'C')).toBe(50);
    expect(leaveWait(1000, 1150, 'C')).toBe(0);
    expect(leaveWait(1000, 5000, 'C')).toBe(0);
    expect(leaveWait(1000, 1100, 'SR')).toBe(350);
    expect(leaveWait(1000, 1449.5, 'L')).toBe(1);
  });
});

describe('the best card of the pack (point A8)', () => {
  it('is the highest rarity, the first on a tie', () => {
    expect(spotlightIndex(['C', 'U', 'R', 'C', 'U'])).toBe(2);
    expect(spotlightIndex(['C', 'UR', 'R', 'UR', 'U'])).toBe(1);
    expect(spotlightIndex(['C', 'C', 'C', 'C', 'L'])).toBe(4);
  });
  it('is none when the five are of one rarity: nothing is better than the others', () => {
    expect(spotlightIndex(['U', 'U', 'U', 'U', 'U'])).toBeNull();
    expect(spotlightIndex([])).toBeNull();
  });
  it('the timings are the brief\'s: spotlight 600 ms, sheen 900 ms with the house easing, a fade of 200 ms', () => {
    expect(SPOTLIGHT_MS).toBe(600);
    expect(SWEEP_MS).toBe(900);
    expect(SWEEP_EASE).toBe('cubic-bezier(.2,.8,.2,1)');
    expect(FADE_MS).toBe(200);
    expect(FLIP_ALL_MS).toBeGreaterThan(0);
  });
});

describe('StepRunner: a tap jumps a running animation to its end (point A5)', () => {
  it('runs the steps on their timers and tells when it is idle', () => {
    const log: string[] = [];
    const idle = vi.fn();
    const r = new StepRunner(idle);
    r.start([[100, () => log.push('a')], [300, () => log.push('b')]]);
    expect(r.busy).toBe(true);
    vi.advanceTimersByTime(100);
    expect(log).toEqual(['a']);
    expect(idle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(log).toEqual(['a', 'b']);
    expect(r.busy).toBe(false);
    expect(idle).toHaveBeenCalledTimes(1);
  });
  it('finish() runs every step not yet run, in order, at once, and then the idle callback; the timers do not run them again', () => {
    const log: string[] = [];
    const idle = vi.fn();
    const r = new StepRunner(idle);
    r.start([[100, () => log.push('a')], [900, () => log.push('b')], [950, () => log.push('c')]]);
    vi.advanceTimersByTime(100);
    expect(r.finish()).toBe(true);
    expect(log).toEqual(['a', 'b', 'c']);
    expect(idle).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(log).toEqual(['a', 'b', 'c']);
    expect(idle).toHaveBeenCalledTimes(1);
  });
  it('finish() with nothing running does nothing and says so', () => {
    const idle = vi.fn();
    expect(new StepRunner(idle).finish()).toBe(false);
    expect(idle).not.toHaveBeenCalled();
  });
  it('a buffered tap runs once the animation is over (the caller\'s idle callback)', () => {
    let queued = false;
    const acted = vi.fn();
    const r: StepRunner = new StepRunner(() => { if (queued) { queued = false; acted(); } });
    r.start([[500, () => undefined]]);
    queued = true;
    r.finish();
    expect(acted).toHaveBeenCalledTimes(1);
  });
  it('cancel() drops the steps without running them', () => {
    const run = vi.fn();
    const r = new StepRunner();
    r.start([[10, run]]);
    r.cancel();
    vi.advanceTimersByTime(100);
    expect(run).not.toHaveBeenCalled();
    expect(r.busy).toBe(false);
  });
});

describe('finishAnimations (point A5, the CSS side)', () => {
  const anim = (end: number): { finish: ReturnType<typeof vi.fn>; effect: { getComputedTiming: () => { endTime: number } } } => ({ finish: vi.fn(), effect: { getComputedTiming: () => ({ endTime: end }) } });
  it('finishes the running animations under the root and leaves an infinite one alone', () => {
    const a = anim(900);
    const loop = anim(Infinity);
    const root = { getAnimations: vi.fn(() => [a, loop]) } as unknown as Element;
    finishAnimations(root);
    expect(a.finish).toHaveBeenCalledTimes(1);
    expect(loop.finish).not.toHaveBeenCalled();
    expect((root as unknown as { getAnimations: ReturnType<typeof vi.fn> }).getAnimations).toHaveBeenCalledWith({ subtree: true });
  });
  it('tolerates no root, no Web Animations API, and an animation that throws', () => {
    expect(() => finishAnimations(null)).not.toThrow();
    expect(() => finishAnimations({} as Element)).not.toThrow();
    const bad = { finish: () => { throw new Error('x'); }, effect: { getComputedTiming: () => ({ endTime: 10 }) } };
    expect(() => finishAnimations({ getAnimations: () => [bad] } as unknown as Element)).not.toThrow();
  });
});
