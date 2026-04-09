'use client';

import { useEffect, useState } from 'react';

export type MascotMood = 'idle' | 'correct' | 'wrong' | 'combo';

interface Props {
  mood: MascotMood;
  /** When true, the mascot is fixed to the viewport corner. Default true. */
  fixed?: boolean;
}

const HEAD_COLOR: Record<MascotMood, string> = {
  idle: 'var(--accent)',
  correct: 'var(--correct)',
  wrong: 'var(--wrong)',
  combo: 'var(--combo)',
};

const GLOW_COLOR: Record<MascotMood, string> = {
  idle: 'rgba(212, 83, 126, 0.15)',
  correct: 'rgba(15, 110, 86, 0.20)',
  wrong: 'rgba(163, 45, 45, 0.15)',
  combo: 'rgba(186, 117, 23, 0.25)',
};

/**
 * Lightstick mascot with 4 facial expressions. Floats on a 2s idle loop
 * and briefly plays a reaction animation (bounce / droop / vibrate) when
 * the mood changes. By default it's fixed to the bottom-right of the
 * viewport with pointer-events disabled so it never blocks taps.
 */
export function LightstickMascot({ mood, fixed = true }: Props): React.ReactElement {
  const [animClass, setAnimClass] = useState<string>('mascot-idle');

  useEffect(() => {
    if (mood === 'correct') {
      setAnimClass('mascot-bounce');
      const t = setTimeout(() => setAnimClass('mascot-idle'), 600);
      return () => clearTimeout(t);
    }
    if (mood === 'wrong') {
      setAnimClass('mascot-droop');
      const t = setTimeout(() => setAnimClass('mascot-idle'), 600);
      return () => clearTimeout(t);
    }
    if (mood === 'combo') {
      setAnimClass('mascot-vibrate');
      const t = setTimeout(() => setAnimClass('mascot-idle'), 800);
      return () => clearTimeout(t);
    }
    setAnimClass('mascot-idle');
    return undefined;
  }, [mood]);

  const wrapperClass = fixed
    ? `fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 pointer-events-none ${animClass}`
    : `inline-block ${animClass}`;

  return (
    <div className={wrapperClass} aria-hidden="true">
      <svg width="48" height="68" viewBox="0 0 48 68">
        {/* Glow halo */}
        <circle cx="24" cy="18" r="22" fill={GLOW_COLOR[mood]} />

        {/* Stick */}
        <rect x="22" y="32" width="4" height="28" rx="2" fill="#888780" />
        {/* Stick highlight */}
        <rect x="22" y="32" width="4" height="8" rx="2" fill="#B4B2A9" />

        {/* Head */}
        <circle cx="24" cy="18" r="16" fill={HEAD_COLOR[mood]} />

        {/* Face variants */}
        {mood === 'idle' && (
          <>
            <circle cx="18" cy="16" r="2.5" fill="#0D0D0F" />
            <circle cx="30" cy="16" r="2.5" fill="#0D0D0F" />
            <circle cx="19" cy="15" r="0.8" fill="rgba(255,255,255,0.6)" />
            <circle cx="31" cy="15" r="0.8" fill="rgba(255,255,255,0.6)" />
            <path
              d="M18 22 Q24 26 30 22"
              fill="none"
              stroke="#0D0D0F"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
        {mood === 'correct' && (
          <>
            <path
              d="M15 15 Q18 12 21 15"
              fill="none"
              stroke="#0D0D0F"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M27 15 Q30 12 33 15"
              fill="none"
              stroke="#0D0D0F"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 21 Q24 28 32 21"
              fill="none"
              stroke="#0D0D0F"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        )}
        {mood === 'wrong' && (
          <>
            <line x1="15" y1="13" x2="20" y2="16" stroke="#0D0D0F" strokeWidth="2" strokeLinecap="round" />
            <line x1="28" y1="16" x2="33" y2="13" stroke="#0D0D0F" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M19 24 Q24 20 29 24"
              fill="none"
              stroke="#0D0D0F"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
        {mood === 'combo' && (
          <>
            <circle cx="17" cy="15" r="3.5" fill="#0D0D0F" />
            <circle cx="31" cy="15" r="3.5" fill="#0D0D0F" />
            <circle cx="18.5" cy="13.5" r="1.2" fill="rgba(255,255,255,0.7)" />
            <circle cx="32.5" cy="13.5" r="1.2" fill="rgba(255,255,255,0.7)" />
            <ellipse cx="24" cy="23" rx="5" ry="4" fill="#0D0D0F" />
          </>
        )}
      </svg>
    </div>
  );
}
