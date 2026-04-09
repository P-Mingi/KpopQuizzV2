'use client';

import { useEffect, useState } from 'react';

interface Props {
  msUntilReset: number;
  className?: string;
  /** Optional prefix, e.g. "Resets in ". */
  prefix?: string;
  /** When true, shows seconds (HH MM SS). Otherwise HH MM. */
  showSeconds?: boolean;
}

/**
 * Live countdown to KST midnight, driven by the initial `msUntilReset` from
 * the server. Ticks every second in the browser; the server value avoids
 * drift across timezones since the home/daily pages are server-rendered.
 */
export function CountdownTimer({ msUntilReset, className, prefix = '', showSeconds = true }: Props) {
  const [remaining, setRemaining] = useState(msUntilReset);

  useEffect(() => {
    setRemaining(msUntilReset);
  }, [msUntilReset]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  const body = showSeconds
    ? `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
    : `${hours}h ${minutes.toString().padStart(2, '0')}m`;

  return <span className={`tabular-nums ${className ?? ''}`}>{prefix}{body}</span>;
}
