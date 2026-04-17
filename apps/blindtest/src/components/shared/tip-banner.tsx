'use client';

import { useState, useEffect } from 'react';

interface TipBannerProps {
  tips: string[];
  intervalMs?: number;
  icon?: React.ReactNode;
  variant?: 'default' | 'gameplay';
}

export function TipBanner({ tips, intervalMs = 5000, icon, variant = 'default' }: TipBannerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (tips.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % tips.length), intervalMs);
    return () => clearInterval(t);
  }, [tips.length, intervalMs]);

  const isGameplay = variant === 'gameplay';

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-30 px-3.5 md:px-5 pb-2.5 md:pb-3 flex justify-center pointer-events-none ${
      isGameplay
        ? 'bg-gradient-to-t from-[#0a0716]/95 to-transparent'
        : 'bg-gradient-to-t from-[var(--bg-primary)]/95 to-transparent'
    }`}>
      <div className={`flex items-center gap-1.5 md:gap-2 px-3.5 md:px-5 py-[7px] md:py-2 rounded-full ${
        isGameplay
          ? 'bg-white/[0.04] border border-white/[0.06]'
          : 'bg-[rgba(212,83,126,0.06)] border border-[rgba(212,83,126,0.10)] dark:bg-white/[0.05] dark:border-white/[0.08]'
      }`}>
        {/* Icon */}
        <div className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 opacity-50">
          {icon || (
            <svg viewBox="0 0 14 14" fill="none" stroke={isGameplay ? 'rgba(255,255,255,0.3)' : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" className={isGameplay ? '' : 'text-[#D4537E] dark:text-white/30'}>
              <circle cx="7" cy="7" r="5" />
              <path d="M7 4.5v2.5l2 1.5" />
            </svg>
          )}
        </div>

        {/* Tip text */}
        <p
          key={index}
          className={`text-[9px] md:text-[10px] font-medium animate-[tipFade_300ms_ease-out] ${
            isGameplay
              ? 'text-white/30'
              : 'text-[#993556] dark:text-white/35'
          }`}
        >
          {tips[index]}
        </p>
      </div>
    </div>
  );
}
