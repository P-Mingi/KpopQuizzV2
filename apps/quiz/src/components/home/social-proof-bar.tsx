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

/**
 * Thin pill bar above the trending section showing live social proof.
 * Fetches `/api/stats/live` on mount and replaces the initial/hardcoded
 * values. Shows "-" until the fetch resolves.
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

  const online = stats?.online;
  const total = stats?.totalPlays;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-accent-bg rounded-[10px] mb-4">
      <span
        className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 animate-pulse"
        aria-hidden="true"
      />
      <span className="text-[11px] text-accent-hover flex-1 truncate">
        <span className="tabular-nums">{online !== undefined ? online.toLocaleString() : '-'}</span>{' '}
        {online === 1 ? 'fan' : 'fans'} playing right now
      </span>
      <span className="text-[11px] font-semibold text-accent-hover flex-shrink-0 tabular-nums">
        {total !== undefined ? total.toLocaleString() : '-'} quizzes played
      </span>
    </div>
  );
}
