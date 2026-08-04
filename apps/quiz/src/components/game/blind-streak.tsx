'use client';

import { useEffect, useState } from 'react';

// The blind-test streak on the hub's TODAY card. Real data only (law 10): reads
// the signed-in user's daily streak from /api/daily/streak. Min-gate (law 5):
// renders nothing when there is no real streak (anon or streak 0), so the card
// never advertises a fabricated number. Progressive enhancement: the server
// renders the card without it; this fills in client-side when authed.
export function BlindStreak(): React.ReactElement | null {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/daily/streak', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { streak: 0 }))
      .then((d) => { if (!cancelled) setStreak(typeof d?.streak === 'number' ? d.streak : 0); })
      .catch(() => { /* fail closed: no streak shown */ });
    return () => { cancelled = true; };
  }, []);

  if (streak <= 0) return null;
  return (
    <span className="gh2-streak"> · streak {streak}<span aria-hidden="true"> ●</span></span>
  );
}
