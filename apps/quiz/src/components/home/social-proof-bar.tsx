'use client';

import { useEffect, useState } from 'react';

interface LiveStats {
  online: number;
  todayPlays: number;
  totalPlays: number;
}

interface Props {
  /** Optional SSR fallback values shown before the live fetch resolves. */
  initialOnline?: number;
  initialTotalPlays?: number;
}

// Baseline "social proof" bounds for the online counter. When the real
// recent-plays count is lower than the drifted minimum, show the minimum
// instead so the bar never reads "1 fan playing" on quiet nights.
const MIN_ONLINE = 12;
const MAX_PADDING = 16;
const DRIFT_INTERVAL_MS = 30_000;

/**
 * Deterministic pseudo-random padding in the [0, MAX_PADDING) range that
 * changes once every 30 seconds. Uses a linear congruential hash over the
 * current 30s bucket so every client sees the same number at the same time
 * (without needing a shared store) and the jump between ticks is unrelated
 * to the previous value, which gives an "organic" feel.
 */
function getDriftPadding(now: number): number {
  const seed = Math.floor(now / DRIFT_INTERVAL_MS);
  const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280;
  return Math.floor(pseudoRandom * MAX_PADDING);
}

function getDisplayOnline(real: number | undefined, now: number): number | undefined {
  if (real === undefined) return undefined;
  const baseline = MIN_ONLINE + getDriftPadding(now);
  return Math.max(real, baseline);
}

/**
 * Thin pill bar above the trending section showing live social proof.
 * Fetches `/api/stats/live` on mount and pads the "online" count with a
 * slowly-drifting baseline (12-28) so the bar never shows a humiliating
 * "1 fan" on quiet nights. When real traffic exceeds the baseline, the
 * real number wins.
 */
export function SocialProofBar({
  initialOnline,
  initialTotalPlays,
}: Props = {}): React.ReactElement {
  const [stats, setStats] = useState<LiveStats | null>(
    initialOnline !== undefined && initialTotalPlays !== undefined
      ? { online: initialOnline, todayPlays: 0, totalPlays: initialTotalPlays }
      : null,
  );
  // Bumped on every 30s interval tick so the drifted display number
  // recomputes without re-fetching the API. The value itself is unused;
  // it just triggers a re-render.
  const [driftTick, setDriftTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/stats/live');
        if (!res.ok) return;
        const data: LiveStats = await res.json();
        if (!cancelled) setStats(data);
      } catch {
        // Non-critical; keep fallback/null
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setDriftTick((t) => t + 1);
    }, DRIFT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // driftTick is intentionally read so the hooks linter knows this
  // expression depends on it, guaranteeing a fresh `Date.now()` per tick.
  void driftTick;
  const online = getDisplayOnline(stats?.online, Date.now());
  const total = stats?.totalPlays;

  const loaded = online !== undefined;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-accent-bg rounded-[10px] mb-4">
      <span
        className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 animate-pulse"
        aria-hidden="true"
      />
      <span className="text-[11px] text-accent-hover flex-1 truncate">
        {loaded ? (
          <span className="tabular-nums">{online.toLocaleString()}</span>
        ) : (
          <span className="inline-block align-middle" style={{ width: 30, height: 14, borderRadius: 4, background: 'var(--bg-elevated)', animation: 'shimmerBg 1.5s infinite' }} />
        )}{' '}
        fans playing right now
      </span>
      <span className="text-[11px] font-semibold text-accent-hover flex-shrink-0 tabular-nums">
        {loaded ? (
          <>{(total ?? 0).toLocaleString()}</>
        ) : (
          <span className="inline-block align-middle" style={{ width: 36, height: 14, borderRadius: 4, background: 'var(--bg-elevated)', animation: 'shimmerBg 1.5s infinite' }} />
        )}{' '}
        quizzes played
      </span>
    </div>
  );
}
