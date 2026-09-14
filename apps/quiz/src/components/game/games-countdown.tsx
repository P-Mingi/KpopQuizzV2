'use client';

import { useEffect, useState } from 'react';

import { msUntilUtcMidnight, formatCountdown } from '@/lib/games/reset-countdown';

// Live countdown to the daily reset (UTC midnight, the daily blind test's rule).
// Client-only so /games stays static/ISR - no server clock, no request on load.
// Renders a stable placeholder until mounted so SSR + first paint do not mismatch.
export function GamesCountdown(): React.ReactElement {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = (): void => setLabel(formatCountdown(msUntilUtcMidnight()));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  return <span suppressHydrationWarning>{label ?? '--:--:--'}</span>;
}
