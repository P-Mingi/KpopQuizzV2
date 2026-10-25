// SEO Mission 3, part D, point 3: a group whose plays jump. Pure functions, no I/O.
//
// Definition (checked every hour):
//   plays          finished quiz plays (rows of `plays`, the same count as lib/stats/site-stats.ts)
//                  of the group's quizzes.
//   current        plays in the last 24 hours (a rolling window ending now).
//   baseline       the 14 rolling 24-hour windows just before it, zero-filled (a day with no
//                  play counts as 0, or the median would only see busy days).
//   spike          current > SPIKE_MULTIPLIER x median(baseline), and current >= SPIKE_MIN_PLAYS.
//   new spike      a spike now that was not a spike one hour ago (the same rule evaluated at
//                  now - 1 h). Only a new spike alerts, so a long spike sends one e-mail, without
//                  any stored state. A missed hourly run can miss that edge; the next new spike
//                  still alerts.
//
// Why a floor: on 2026-10-15 (read-only query over the last 15 days) the busiest groups had a
// 24-hour count between 50 and 85 for 14-day medians between 28 and 43, while small groups sat
// at medians of 3 to 9. Five times a median of 3 is 15 plays, a normal busy afternoon for a
// small group. 20 plays in 24 hours is the floor under which a jump is noise, not an event.

export const SPIKE_MULTIPLIER = 5;
export const SPIKE_BASELINE_WINDOWS = 14;
export const SPIKE_MIN_PLAYS = 20;
export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const STEP_MS = 60 * 60 * 1000;

/** How far back the plays must be read: 15 windows, plus the hour of the previous evaluation. */
export const LOOKBACK_MS = (SPIKE_BASELINE_WINDOWS + 1) * WINDOW_MS + STEP_MS;

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** The count a window must exceed to be a spike: 5 x the median, never under the floor. */
export function spikeThreshold(baseline: readonly number[]): { median: number; exceed: number } {
  const m = median(baseline);
  return { median: m, exceed: SPIKE_MULTIPLIER * m };
}

export function isSpike(current: number, baseline: readonly number[]): boolean {
  return current >= SPIKE_MIN_PLAYS && current > spikeThreshold(baseline).exceed;
}

export interface WindowCounts {
  /** windows[0] = the last 24 h, windows[1..14] = the baseline, oldest last. */
  windows: number[];
}

export interface GroupCounts {
  now: WindowCounts;
  /** The same windows, evaluated one hour earlier. */
  prev: WindowCounts;
}

/**
 * Bucket play timestamps (ms) by group into the 15 windows ending at `nowMs` and the 15 windows
 * ending one hour earlier. Plays in the future or older than the lookback are ignored.
 */
export function bucketPlays(plays: ReadonlyArray<{ groupId: number; at: number }>, nowMs: number): Map<number, GroupCounts> {
  const n = SPIKE_BASELINE_WINDOWS + 1;
  const out = new Map<number, GroupCounts>();
  const get = (g: number): GroupCounts => {
    let c = out.get(g);
    if (!c) {
      c = { now: { windows: new Array<number>(n).fill(0) }, prev: { windows: new Array<number>(n).fill(0) } };
      out.set(g, c);
    }
    return c;
  };
  for (const p of plays) {
    const age = nowMs - p.at;
    if (!Number.isFinite(age) || age < 0) continue;
    const k = Math.floor(age / WINDOW_MS);
    const ageThen = age - STEP_MS;
    const kThen = ageThen >= 0 ? Math.floor(ageThen / WINDOW_MS) : -1;
    if (k < n || (kThen >= 0 && kThen < n)) {
      const c = get(p.groupId);
      if (k < n) c.now.windows[k]! += 1;
      if (kThen >= 0 && kThen < n) c.prev.windows[kThen]! += 1;
    }
  }
  return out;
}

export interface SpikeFinding {
  groupId: number;
  current: number;
  median: number;
  exceed: number;
}

/** The groups with a NEW spike (a spike now, not one hour ago), biggest ratio first. */
export function detectNewSpikes(counts: ReadonlyMap<number, GroupCounts>): SpikeFinding[] {
  const found: SpikeFinding[] = [];
  for (const [groupId, c] of counts) {
    const [current = 0, ...baseline] = c.now.windows;
    const [currentThen = 0, ...baselineThen] = c.prev.windows;
    if (!isSpike(current, baseline)) continue;
    if (isSpike(currentThen, baselineThen)) continue;
    const t = spikeThreshold(baseline);
    found.push({ groupId, current, median: t.median, exceed: t.exceed });
  }
  const ratio = (f: SpikeFinding): number => f.current / Math.max(f.median, 1);
  return found.sort((a, b) => ratio(b) - ratio(a) || b.current - a.current);
}
