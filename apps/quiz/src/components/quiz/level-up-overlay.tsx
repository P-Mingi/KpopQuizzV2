'use client';

import { useEffect, useState } from 'react';

import { playLevelUp } from '@/lib/sounds';

interface Props {
  newLevel: number;
  /** English fan-culture title, e.g. "Stan". */
  title: string;
  /** Korean fan-culture title, e.g. "덕". */
  titleKr: string;
  onDismiss: () => void;
}

/**
 * Full-screen celebration overlay shown when the player crosses a level
 * threshold. Ring spins in, level number + title fade up, level-up chime
 * plays, device vibrates (if supported), auto-dismisses after 3s.
 *
 * Tap anywhere to dismiss early.
 */
export function LevelUpOverlay({
  newLevel,
  title,
  titleKr,
  onDismiss,
}: Props): React.ReactElement {
  const [show, setShow] = useState(false);
  const [showRing, setShowRing] = useState(false);

  useEffect(() => {
    // Mount animations
    const t1 = setTimeout(() => setShow(true), 100);
    const t2 = setTimeout(() => setShowRing(true), 300);

    // Sound + haptic feedback
    playLevelUp();
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // Non-critical
      }
    }

    // Auto-dismiss
    const dismissTimer = setTimeout(onDismiss, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary/95 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
      role="dialog"
      aria-label={`Level up to level ${newLevel}`}
    >
      {/* Ring */}
      <div
        className="transition-all duration-[600ms]"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          opacity: showRing ? 1 : 0,
          transform: showRing ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(-180deg)',
        }}
      >
        <div className="w-[96px] h-[96px] rounded-full border-[3px] border-accent flex items-center justify-center mb-5">
          <span className="text-4xl font-bold text-accent tabular-nums">{newLevel}</span>
        </div>
      </div>

      {/* Text */}
      <div
        className="text-center transition-all duration-500"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          opacity: show ? 1 : 0,
          transform: show ? 'scale(1)' : 'scale(0.8)',
        }}
      >
        <p className="text-[10px] text-accent uppercase tracking-[0.12em] mb-1 font-semibold">
          Level up!
        </p>
        <p className="text-4xl font-bold text-primary tabular-nums">{newLevel}</p>
        <p className="text-sm font-semibold text-accent mt-2">
          {title} <span className="font-normal">({titleKr})</span>
        </p>
        <p className="text-sm text-accent mt-2">축하해!</p>
      </div>

      <p className="absolute bottom-8 text-[10px] text-ghost uppercase tracking-wider">
        Tap to continue
      </p>
    </div>
  );
}
