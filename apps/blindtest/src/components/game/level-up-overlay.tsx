'use client';

import { useEffect, useState } from 'react';
import { playLevelUp } from '@/lib/sounds';
import { hapticHeavy } from '@/lib/haptics';

interface Props {
  newLevel: number;
  title: string;
  onDismiss: () => void;
}

/**
 * Full-screen celebratory overlay shown when the player levels up.
 * Stays visible for 3 seconds then calls onDismiss.
 */
export function LevelUpOverlay({ newLevel, title, onDismiss }: Props) {
  const [show, setShow] = useState(false);
  const [showRing, setShowRing] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 100);
    const t2 = setTimeout(() => setShowRing(true), 300);
    playLevelUp();
    hapticHeavy();
    const t3 = setTimeout(onDismiss, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/90 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
      role="dialog"
      aria-label="Level up"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Ring spins in */}
        <div
          className="transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: showRing ? 1 : 0,
            transform: showRing ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-180deg)',
          }}
        >
          <div className="w-[100px] h-[100px] rounded-full border-[3px] border-accent flex items-center justify-center">
            <span className="text-4xl font-bold text-accent tabular-nums">{newLevel}</span>
          </div>
        </div>

        {/* Text scales up */}
        <div
          className="text-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: show ? 1 : 0,
            transform: show ? 'scale(1)' : 'scale(0.8)',
          }}
        >
          <p className="text-[10px] text-accent uppercase tracking-[0.15em] font-semibold mb-1">
            Level up!
          </p>
          <p className="text-sm font-semibold text-primary">{title}</p>
        </div>
      </div>
    </div>
  );
}
