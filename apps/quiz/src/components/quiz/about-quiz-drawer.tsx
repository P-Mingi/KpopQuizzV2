'use client';

import { useEffect, useRef, useState } from 'react';

// UI-1 zone 5 - the "About this quiz" drawer.
//
// This wraps the server-rendered SEO blocks that used to run down the page in
// full. Not one crawlable string moves through here changed: the children are
// rendered by the server exactly as before and stay in the DOM in every state,
// so the crawler and the cold visitor see everything.
//
// Owner rule (2026-09-21): DEFAULT CLOSED. The drawer opens on click. This is a
// presentation-only change and SEO-safe: the panel is NEVER removed from the DOM
// - closed it carries the `hidden` attribute (out of the a11y tree, still in the
// served HTML), which is the standard expandable-section pattern that mobile-first
// indexing fully indexes and weights. Never cloaking. The `quiz:played` /
// result-phase listener below is now redundant for the default (already closed)
// but is kept so an open drawer still tidies itself after a play.

interface AboutQuizDrawerProps {
  title: string;
  summary: string;
  children: React.ReactNode;
}

export function AboutQuizDrawer({ title, summary, children }: AboutQuizDrawerProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If the player somehow already reached its result before this mounted
    // (a returning visitor landing mid-state), close straight away. Otherwise
    // wait for the played signal. Either way, cold arrival stays open.
    if (typeof document !== 'undefined' && document.body.dataset.quizPhase === 'result') {
      setOpen(false);
    }
    const onPlayed = (): void => setOpen(false);
    window.addEventListener('quiz:played', onPlayed);
    return () => window.removeEventListener('quiz:played', onPlayed);
  }, []);

  return (
    <div className="about-drawer" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="about-drawer-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="t">
          {title}
          <small>{summary}</small>
        </span>
        <span className="about-drawer-chev" aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="var(--txt2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div ref={panelRef} className="about-drawer-panel" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
