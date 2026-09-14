'use client';

import { useEffect, useState } from 'react';

// The signed-in blind-test streak, real data only (reads /api/daily/streak like
// BlindStreak). Renders nothing when there is no streak (anon or 0), so the hub
// never shows a fabricated "1 day". Two shapes: the header chip and the band pill.
function useStreak(): number {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/daily/streak', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { streak: 0 }))
      .then((d) => { if (!cancelled) setStreak(typeof d?.streak === 'number' ? d.streak : 0); })
      .catch(() => { /* fail closed */ });
    return () => { cancelled = true; };
  }, []);
  return streak;
}

export function StreakChip(): React.ReactElement | null {
  const streak = useStreak();
  if (streak <= 0) return null;
  return (
    <span className="gh-chip" data-testid="streak-chip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2 1-4 2-8z" /></svg>
      Your streak: {streak} {streak === 1 ? 'day' : 'days'}
    </span>
  );
}

export function StreakPill(): React.ReactElement | null {
  const streak = useStreak();
  if (streak <= 0) return null;
  return (
    <span className="gh-band-pill" data-testid="streak-pill">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2 1-4 2-8z" /></svg>
      Streak {streak} · keep it
    </span>
  );
}
