'use client';

import { useState, useEffect, useRef } from 'react';

export function RunningTimer({ isRunning }: { isRunning: boolean }): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!isRunning) return;
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  function formatElapsed(s: number): string {
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${String(sec).padStart(2, '0')}`;
    }
    return `${s}s`;
  }

  if (!isRunning && elapsed === 0) return <span />;

  return (
    <span className="text-xs text-tertiary tabular-nums flex items-center gap-1">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
        <path d="M6 3v3l2 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
      {formatElapsed(elapsed)}
    </span>
  );
}
