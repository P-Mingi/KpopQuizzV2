'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Top-bar streak pill (DESIGN-SPEC 3). Client island so the shell layout stays
// cookie-free / static. Reads the SAME value as the home daily card
// (GET /api/daily/streak -> { streak }). Hidden until a real streak >= 1 exists,
// so a guest or a 0-streak user sees nothing invented.
export function UxStreakPill(): React.ReactElement | null {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/daily/streak')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && typeof d.streak === 'number') setStreak(d.streak); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!streak || streak < 1) return null;

  return (
    <Link href="/daily" className="uxv1-streak" aria-label={`${streak} day streak`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2c1 3-1 4-2 6-1 2 0 4 2 4s3-2 2-4c3 1 5 4 5 7a7 7 0 1 1-14 0c0-3 2-5 3-7 1 2 2 3 3 3 1-3-2-6-2-9z" />
      </svg>
      <span>{streak} {streak === 1 ? 'day' : 'days'}</span>
    </Link>
  );
}
