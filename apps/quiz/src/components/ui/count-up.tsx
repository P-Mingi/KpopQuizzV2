'use client';

import { useEffect, useRef, useState } from 'react';

import { formatCount } from '@/lib/utils';

// Count-up number primitive (Workstream M, M1.13). Animates 0 -> value with
// easeOutCubic. Reduced-motion shows the final value instantly. tabular-nums
// keeps digit widths stable; use on standalone/block numbers (stat tiles, XP,
// score) so the width growth never shifts surrounding vertical layout (no CLS).
// `compact` formats via formatCount (e.g. 12.4k); a boolean prop so it is safe to
// use from server components (no function crosses the server/client boundary).
export function CountUp({ value, durationMs = 900, compact = false }: { value: number; durationMs?: number; compact?: boolean }): React.ReactElement {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value <= 0) { setDisplay(value); return; }

    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, durationMs]);

  return <span className="tabular-nums">{compact ? formatCount(display) : display.toLocaleString()}</span>;
}
