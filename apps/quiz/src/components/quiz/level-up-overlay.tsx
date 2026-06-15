'use client';

import { useEffect, useState } from 'react';

import { playLevelUp } from '@/lib/sounds';
import { Mascot } from '@/components/ui/mascot';
import { shareLevelUp } from '@/lib/share';
import { BragButton } from '@/components/discord/brag-button';

interface Props {
  newLevel: number;
  /** English fan title, e.g. "Bias". */
  title: string;
  /** Korean fan title, e.g. "최애". */
  titleKr: string;
  onDismiss: () => void;
}

/**
 * L2 - the marquee Fan Level reward. Full-screen celebration shown when an XP
 * award crosses a level boundary: celebrate mascot + burst + "You're now a
 * {Title}!" + a shareable level-up card. No auto-dismiss (the Share button needs
 * to be reachable); tap the backdrop or Continue to close. Reduced-motion safe
 * (the entrance is instant; the mascot bob is gated by the F1 CSS rule).
 */
export function LevelUpOverlay({ newLevel, title, titleKr, onDismiss }: Props): React.ReactElement {
  const [show, setShow] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    const t = setTimeout(() => setShow(true), reduce ? 0 : 80);
    playLevelUp();
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate([100, 50, 100]); } catch { /* non-critical */ }
    }
    return () => clearTimeout(t);
  }, []);

  const onShare = async (): Promise<void> => {
    const r = await shareLevelUp(title, newLevel);
    if (r === 'copied') { setShareMsg('Link copied!'); setTimeout(() => setShareMsg(null), 1800); }
    else if (r === 'failed') { setShareMsg('Could not share'); setTimeout(() => setShareMsg(null), 1800); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary/95 backdrop-blur-sm cursor-pointer px-6"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`Level up: you are now a ${title}`}
    >
      <div
        className="flex flex-col items-center text-center cursor-default transition-all duration-300"
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)', opacity: show ? 1 : 0, transform: show ? 'scale(1)' : 'scale(0.9)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* celebrate mascot + burst */}
        <div className="relative flex items-center justify-center" style={{ width: 168, height: 168, marginBottom: 6 }}>
          <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, var(--bg-accent-subtle), transparent 70%)' }} />
          <Mascot variant="celebrate" animate="bob" size={132} alt="" />
        </div>

        <p className="text-[11px] text-accent uppercase tracking-[0.16em] font-bold mb-1">Level up!</p>
        <p className="text-base text-primary">You&apos;re now a</p>
        <p className="text-[34px] leading-tight font-bold text-accent" style={{ fontFamily: 'var(--font-display)' }}>{title}</p>
        <p className="text-sm text-secondary mt-0.5">{titleKr} {'·'} Level {newLevel}</p>

        <button
          type="button"
          onClick={() => void onShare()}
          className="btn-primary mt-6"
          aria-label="Share your level-up"
        >
          Share your level-up
        </button>
        {shareMsg && <p className="text-xs text-secondary mt-2" role="status">{shareMsg}</p>}

        {/* K8 - Post the level-up in the Discord (calls K7). */}
        <div className="mt-3">
          <BragButton payload={{ kind: 'levelup', title, level: newLevel }} compact />
        </div>

        <button type="button" onClick={onDismiss} className="text-xs text-ghost uppercase tracking-wider mt-4 py-2">
          Continue
        </button>
      </div>
    </div>
  );
}
