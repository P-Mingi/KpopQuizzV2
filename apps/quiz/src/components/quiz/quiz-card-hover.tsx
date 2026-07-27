'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { QuizTeaser } from '@/lib/quiz/teaser';

// M1.14 desktop hover preview. Wraps a QuizCard (either variant) WITHOUT forking
// it: the wrapper is display:contents so it adds no box and no layout effect,
// and the card stays the single click target. The floating panel is portaled to
// <body>, position:fixed, and pointer-events:none aria-hidden decoration, so it
// escapes the trending carousel's overflow clip, never shifts layout, and never
// steals the click. On SSR and on touch devices it renders nothing extra: the
// listener and panel only mount on desktop pointers, after 400ms of hover.

const HOVER_DELAY_MS = 400;
const PANEL_WIDTH = 240;
const GAP = 10;
const EST_PANEL_HEIGHT = 190; // for bottom-edge clamping before measure

const DIFF_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

interface Coords { left: number; top: number }

function Arrow(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function QuizCardHover({ teaser, children }: { teaser: QuizTeaser; children: React.ReactNode }): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    // Desktop only: coarse/touch pointers never mount the listener or the panel.
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const card = wrapRef.current?.firstElementChild as HTMLElement | null;
    if (!card) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = (): void => { if (timer) { clearTimeout(timer); timer = null; } };
    const hide = (): void => { clear(); setCoords(null); };
    const enter = (): void => {
      clear();
      timer = setTimeout(() => {
        const r = card.getBoundingClientRect();
        // Anchor beside the card on the right; flip to the left near the edge.
        const flip = r.right + GAP + PANEL_WIDTH > window.innerWidth - 8;
        const left = flip ? Math.max(8, r.left - GAP - PANEL_WIDTH) : r.right + GAP;
        const top = Math.max(8, Math.min(r.top, window.innerHeight - 8 - EST_PANEL_HEIGHT));
        setCoords({ left, top });
      }, HOVER_DELAY_MS);
    };

    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', hide);
    // A scroll or resize while hovering would desync the fixed panel: just hide.
    // Capture-phase scroll catches inner scrollers (the trending carousel) too.
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      clear();
      card.removeEventListener('mouseenter', enter);
      card.removeEventListener('mouseleave', hide);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  return (
    <div ref={wrapRef} style={{ display: 'contents' }}>
      {children}
      {coords !== null && createPortal(
        <div className="qch-panel" aria-hidden="true" style={{ left: coords.left, top: coords.top, width: PANEL_WIDTH }}>
          <span className="qch-eyebrow">First question</span>
          <p className="qch-q">{teaser.firstQuestion}</p>
          <div className="qch-chips">
            <span className={`qch-chip qch-diff-${teaser.difficulty}`}>{DIFF_LABEL[teaser.difficulty] ?? teaser.difficulty}</span>
            {teaser.playCount > 0 && <span className="qch-chip">{teaser.playCount.toLocaleString('en-US')} plays</span>}
            {teaser.avgPct !== null && <span className="qch-chip">{teaser.avgPct}% avg</span>}
          </div>
          <span className="qch-play">Play now <Arrow /></span>
        </div>,
        document.body,
      )}
    </div>
  );
}
