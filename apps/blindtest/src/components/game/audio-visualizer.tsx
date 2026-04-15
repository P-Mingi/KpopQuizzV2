'use client';

import { useEffect, useRef } from 'react';

export function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying || !barsRef.current) return;
    const bars = barsRef.current.children;
    const interval = setInterval(() => {
      for (let i = 0; i < bars.length; i++) {
        const h = 20 + Math.random() * 60;
        const o = 0.3 + Math.random() * 0.7;
        (bars[i] as HTMLElement).style.height = `${h}px`;
        (bars[i] as HTMLElement).style.opacity = `${o}`;
      }
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div
      ref={barsRef}
      className="flex items-end justify-center gap-[2px] md:gap-[3px] h-[70px] md:h-[100px] mb-3 md:mb-5"
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-1 md:w-[5px] rounded-sm md:rounded-[3px] bg-accent transition-all duration-100"
          style={{ height: `${20 + Math.random() * 40}px`, opacity: 0.4 + Math.random() * 0.5 }}
        />
      ))}
    </div>
  );
}
