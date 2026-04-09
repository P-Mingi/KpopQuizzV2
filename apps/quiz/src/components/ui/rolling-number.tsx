'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  /** Animation duration in ms. Default 1000ms. */
  duration?: number;
  className?: string;
}

/**
 * Count-up number that animates from 0 to the value on mount, then from
 * the previous value to the new one on subsequent updates. Uses an
 * ease-out cubic curve.
 */
export function RollingNumber({ value, duration = 1000, className }: Props): React.ReactElement {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }

    const startTime = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + eased * (to - from)));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString('en-US')}</span>;
}
