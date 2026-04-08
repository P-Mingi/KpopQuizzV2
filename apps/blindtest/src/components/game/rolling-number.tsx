'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  /** Duration of the tween in milliseconds. Default 1000. */
  duration?: number;
  className?: string;
  /** Optional prefix (e.g. "+"). */
  prefix?: string;
  /** Optional suffix (e.g. " pts"). */
  suffix?: string;
}

/**
 * Animates a numeric value from its previous render to the current value
 * using an ease-out cubic over `duration` milliseconds.
 */
export function RollingNumber({ value, duration = 1000, className, prefix, suffix }: Props) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }

    const startTime = performance.now();
    let frame = 0;

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + eased * (to - from));
      setDisplay(current);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}
