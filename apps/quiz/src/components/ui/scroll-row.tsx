'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// A horizontal scroll row with DISCREET desktop arrow controls. Trackpad + touch users swipe;
// mouse users had no scrollbar and no way to move these rows - so on fine-pointer (desktop)
// devices a prev/next chevron appears on row-hover or keyboard-focus and fades out at each end.
// Touch devices never show the arrows (swipe already works). The inner scroller keeps whatever
// class the row already uses (its width / snap / gap are untouched), so this wraps EVERY existing
// carousel without a redesign. All arrow styling lives in .scrollrow* in globals.css (tokenized,
// light + dark).
export function ScrollRow({ children, scrollerClassName, scrollerRole, ariaLabel, step }: {
  children: React.ReactNode;
  scrollerClassName?: string | undefined;
  scrollerRole?: string | undefined;
  ariaLabel?: string | undefined;
  step?: number | undefined;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Tolerance absorbs a scroller's resting offset: scroll-snap + padding-left can park a
    // row a few px in (the trending carousel rests at ~16px), which must still read as "start".
    const EPS = 20;
    setCanPrev(el.scrollLeft > EPS);
    setCanNext(el.scrollLeft < max - EPS);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', measure); ro.disconnect(); };
  }, [measure]);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    // ~80% of the viewport, so a click reveals the next batch while keeping one card of context.
    const by = step ?? Math.max(220, Math.round(el.clientWidth * 0.8));
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * by, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div className="scrollrow">
      <button type="button" className="scrollrow-arrow scrollrow-arrow--prev" aria-label="Show previous"
        onClick={() => nudge(-1)} data-show={canPrev ? 'true' : 'false'} tabIndex={canPrev ? 0 : -1} aria-hidden={!canPrev}>
        <Chevron dir="left" />
      </button>
      <div ref={ref} className={scrollerClassName} role={scrollerRole} aria-label={ariaLabel}>
        {children}
      </div>
      <button type="button" className="scrollrow-arrow scrollrow-arrow--next" aria-label="Show more"
        onClick={() => nudge(1)} data-show={canNext ? 'true' : 'false'} tabIndex={canNext ? 0 : -1} aria-hidden={!canNext}>
        <Chevron dir="right" />
      </button>
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={dir === 'left' ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
