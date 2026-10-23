import { describe, expect, it } from 'vitest';

import {
  bucketPlays, detectNewSpikes, isSpike, LOOKBACK_MS, median, SPIKE_BASELINE_WINDOWS, SPIKE_MIN_PLAYS,
  SPIKE_MULTIPLIER, spikeThreshold, STEP_MS, WINDOW_MS,
} from './spikes';

const NOW = Date.parse('2026-10-15T12:00:00Z');
const H = 60 * 60 * 1000;

/** n plays of a group spread inside window k (k = 0: the last 24 h) of the evaluation at NOW. */
function playsInWindow(groupId: number, k: number, n: number, offsetMs = 2 * H): Array<{ groupId: number; at: number }> {
  return Array.from({ length: n }, (_, i) => ({ groupId, at: NOW - k * WINDOW_MS - offsetMs - i * 1000 }));
}

/** n plays inside the last hour: a jump the evaluation of one hour ago could not see yet. */
const lastHour = (groupId: number, n: number): Array<{ groupId: number; at: number }> => playsInWindow(groupId, 0, n, 10 * 60 * 1000);

/** A 14-window baseline with a given daily count, for one group. */
function baseline(groupId: number, perWindow: number): Array<{ groupId: number; at: number }> {
  return Array.from({ length: SPIKE_BASELINE_WINDOWS }, (_, i) => playsInWindow(groupId, i + 1, perWindow)).flat();
}

describe('median', () => {
  it('odd and even lengths, unsorted input, empty', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([5])).toBe(5);
    expect(median([])).toBe(0);
  });

  it('counts zero days: a group busy on 6 of 14 days has a median of 0', () => {
    expect(median([0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9])).toBe(0);
  });

  it('does not mutate its input', () => {
    const v = [3, 1, 2];
    median(v);
    expect(v).toEqual([3, 1, 2]);
  });
});

describe('the 5x threshold', () => {
  it('is 5 times the 14-window median', () => {
    expect(SPIKE_MULTIPLIER).toBe(5);
    expect(spikeThreshold(new Array(14).fill(10))).toEqual({ median: 10, exceed: 50 });
  });

  it('a spike must EXCEED 5x the median: exactly 5x is not one', () => {
    const base = new Array(14).fill(10);
    expect(isSpike(50, base)).toBe(false);
    expect(isSpike(51, base)).toBe(true);
  });

  it('never fires under the floor, even with a zero median', () => {
    const quiet = new Array(14).fill(0);
    expect(isSpike(SPIKE_MIN_PLAYS - 1, quiet)).toBe(false);
    expect(isSpike(SPIKE_MIN_PLAYS, quiet)).toBe(true);
  });

  it('a busy group needs 5x its own level, not the floor', () => {
    const busy = new Array(14).fill(40);
    expect(isSpike(150, busy)).toBe(false);
    expect(isSpike(201, busy)).toBe(true);
  });
});

describe('bucketPlays', () => {
  it('puts plays in rolling 24-hour windows ending now, and in the windows ending one hour earlier', () => {
    const plays = [
      { groupId: 1, at: NOW - 30 * 60 * 1000 }, // 30 min ago: current window now, too recent for the previous evaluation
      { groupId: 1, at: NOW - 23.5 * H }, // window 0 now, window 0 one hour ago
      { groupId: 1, at: NOW - 24.5 * H }, // window 1 now, window 0 one hour ago
    ];
    const c = bucketPlays(plays, NOW).get(1)!;
    expect(c.now.windows[0]).toBe(2);
    expect(c.now.windows[1]).toBe(1);
    expect(c.prev.windows[0]).toBe(2);
    expect(c.now.windows).toHaveLength(SPIKE_BASELINE_WINDOWS + 1);
  });

  it('ignores plays in the future and before the lookback', () => {
    const c = bucketPlays([
      { groupId: 2, at: NOW + 1000 },
      { groupId: 2, at: NOW - LOOKBACK_MS - 1000 },
    ], NOW);
    expect(c.size).toBe(0);
  });

  it('the lookback covers 15 windows plus the previous hour', () => {
    expect(LOOKBACK_MS).toBe(15 * WINDOW_MS + STEP_MS);
  });
});

describe('detectNewSpikes', () => {
  it('flags a group above 5x its median, with the numbers', () => {
    const plays = [...baseline(7, 10), ...lastHour(7, 60)];
    const found = detectNewSpikes(bucketPlays(plays, NOW));
    expect(found).toEqual([{ groupId: 7, current: 60, median: 10, exceed: 50 }]);
  });

  it('a normal day is not a spike', () => {
    const plays = [...baseline(7, 10), ...playsInWindow(7, 0, 14)];
    expect(detectNewSpikes(bucketPlays(plays, NOW))).toEqual([]);
  });

  it('alerts once: a spike that was already a spike one hour ago is not new', () => {
    // 60 plays spread over the last 20 hours: the window ending an hour ago already held most.
    const old = Array.from({ length: 60 }, (_, i) => ({ groupId: 7, at: NOW - 2 * H - i * 15 * 60 * 1000 }));
    expect(detectNewSpikes(bucketPlays([...baseline(7, 10), ...old], NOW))).toEqual([]);
  });

  it('the hour that crosses the threshold is the new spike', () => {
    // 45 plays earlier today, then 15 in the last hour: 45 was under 50, 60 is over.
    const earlier = playsInWindow(7, 0, 45, 3 * H);
    const found = detectNewSpikes(bucketPlays([...baseline(7, 10), ...earlier, ...lastHour(7, 15)], NOW));
    expect(found.map((f) => f.groupId)).toEqual([7]);
  });

  it('a new group with no history needs the floor', () => {
    expect(detectNewSpikes(bucketPlays(lastHour(9, SPIKE_MIN_PLAYS - 1), NOW))).toEqual([]);
    expect(detectNewSpikes(bucketPlays(lastHour(9, SPIKE_MIN_PLAYS), NOW)).map((f) => f.groupId)).toEqual([9]);
  });

  it('sorts the biggest jump first', () => {
    const plays = [
      ...baseline(1, 10), ...lastHour(1, 60), // 6x
      ...baseline(2, 4), ...lastHour(2, 80), // 20x
    ];
    expect(detectNewSpikes(bucketPlays(plays, NOW)).map((f) => f.groupId)).toEqual([2, 1]);
  });
});
