'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { GamePreview } from './game-preview';
import type { PreviewKind, VersusFace } from './game-preview';

// Games-hub redesign: the rotating spotlight. Auto-advances through the game of
// the day + a few featured modes, each with the live game preview on the right.
// Pauses on hover, dots + arrows to navigate, a thin progress bar, and a live
// countdown on the game-of-the-day slide (midnight-UTC reset, same as the old
// daily strip this replaces). Slides are built server-side and passed in.

export interface SpotSlide {
  badge: string;
  title: string;
  desc: string;
  href: string;
  /** CSS custom-property name for the accent, e.g. '--blind'. */
  tint: string;
  preview: PreviewKind;
  meta: string[];
  /** The game-of-the-day slide shows a live "resets in" countdown. */
  countdown?: boolean;
  /** Real idol photos for a This-or-that preview. */
  versus?: VersusFace[] | undefined;
}

const DUR = 5200;

function secondsToMidnightUtc(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.max(0, Math.floor((next - now.getTime()) / 1000));
}
function fmtCountdown(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

const PlayIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);

export function GamesSpotlight({ slides }: { slides: SpotSlide[] }): React.ReactElement | null {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const hasCountdown = slides.some((s) => s.countdown);
  useEffect(() => {
    if (!hasCountdown) return;
    setLeft(secondsToMidnightUtc());
    const t = setInterval(() => setLeft(secondsToMidnightUtc()), 1000);
    return () => clearInterval(t);
  }, [hasCountdown]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    setProgress(0);
    let elapsed = 0;
    const t = setInterval(() => {
      elapsed += 100;
      setProgress(Math.min(100, (elapsed / DUR) * 100));
      if (elapsed >= DUR) { setIdx((i) => (i + 1) % slides.length); elapsed = 0; }
    }, 100);
    return () => clearInterval(t);
  }, [paused, idx, slides.length]);

  const go = useCallback((i: number) => setIdx(((i % slides.length) + slides.length) % slides.length), [slides.length]);

  if (slides.length === 0) return null;
  const tintStyle = (tint: string): React.CSSProperties => ({ ['--gm-tint']: `var(${tint})` } as React.CSSProperties);

  return (
    <section
      className="gsp"
      aria-roledescription="carousel"
      aria-label="Featured games"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="gsp-prog" aria-hidden="true" style={{ width: `${progress}%`, ...tintStyle(slides[idx]!.tint) }} />
      <div className="gsp-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {slides.map((s, i) => (
          <div className="gsp-slide" key={s.title} style={tintStyle(s.tint)} aria-hidden={i !== idx}>
            <div className="gsp-l">
              <span className="gsp-badge"><span className="gsp-dot" aria-hidden="true" />{s.badge}</span>
              <h2 className="gsp-title">{s.title}</h2>
              <p className="gsp-desc">{s.desc}</p>
              {s.meta.length > 0 && (
                <div className="gsp-meta">{s.meta.map((m) => <span key={m} className="gsp-chip">{m}</span>)}</div>
              )}
              <div className="gsp-cta">
                <Link href={s.href} className="gsp-play" tabIndex={i === idx ? 0 : -1}>{PlayIcon} Play now</Link>
                {s.countdown && left !== null && (
                  <span className="gsp-count">{fmtCountdown(left)} <span>left</span></span>
                )}
              </div>
            </div>
            <div className="gsp-r"><GamePreview kind={s.preview} live={i === idx} versus={s.versus} /></div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="gsp-nav" style={tintStyle(slides[idx]!.tint)}>
          <div className="gsp-dots">
            {slides.map((s, i) => (
              <button key={s.title} className={i === idx ? 'on' : ''} aria-label={`Show ${s.title}`} aria-current={i === idx} onClick={() => go(i)} />
            ))}
          </div>
          <button className="gsp-arrow" aria-label="Previous featured game" onClick={() => go(idx - 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="15" height="15"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="gsp-arrow" aria-label="Next featured game" onClick={() => go(idx + 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="15" height="15"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}
    </section>
  );
}
