'use client';

import { useEffect, useRef, useState } from 'react';

// UI-1 zone 5 - the "About this quiz" drawer.
//
// This wraps the server-rendered SEO blocks that used to run down the page in
// full. Not one crawlable string moves through here changed: the children are
// rendered by the server exactly as before and stay in the DOM in every state,
// so the crawler and the cold visitor see everything. The ONLY thing this adds
// is a visual collapse, and it is owner-locked to a single rule:
//
//     defaultOpen = !hasPlayed
//
// Server render and first hydration are always OPEN (hasPlayed is false on a
// fresh page), which is why the crawler and a cold visitor get the whole block
// expanded. It collapses to closed CLIENT-SIDE only, and only once the player
// on the same page reaches its result phase and fires `quiz:played`. Someone
// who just finished the quiz gets the tidy drawer; nobody else does.
//
// The panel is never removed from the DOM. When closed it carries the `hidden`
// attribute (out of the a11y tree, still in the served HTML), so this is a
// presentation change, never cloaking.

interface AboutQuizDrawerProps {
  title: string;
  summary: string;
  children: React.ReactNode;
}

export function AboutQuizDrawer({ title, summary, children }: AboutQuizDrawerProps): React.ReactElement {
  const [open, setOpen] = useState(true);
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
