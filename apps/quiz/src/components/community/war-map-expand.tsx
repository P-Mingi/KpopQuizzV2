'use client';

import { useState } from 'react';

// Client wrapper for the war-map grid so it can collapse to the first few tiles
// with a "See all" toggle. The tiles are server-rendered and ALWAYS passed as
// children (never conditionally rendered), so all 30 group links stay in the
// HTML for crawlers; collapsing only hides the overflow with a CSS class.
export function WarMapExpand({
  total,
  collapsible,
  children,
}: {
  total: number;
  collapsible: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={`wm-grid ${collapsible && !open ? 'wm-collapsed' : ''}`}>
        {children}
      </div>
      {collapsible && (
        <button type="button" className="wm-more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Show less' : `See all ${total}`}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </>
  );
}
