'use client';

// V-FOUNDATION F4.4 - the anti-overflow FOLD (crawlable-collapse law). The FULL
// content is always in the served HTML: the server renders it EXPANDED, so crawlers
// and no-JS readers get everything. On hydration JS measures the natural height and,
// only if it exceeds the budget, collapses it with a max-height clip (never
// display:none) + a fade + a "Read more" toggle (aria-expanded). Never fetch-on-expand.
import { useEffect, useRef, useState } from 'react';

export function Fold({ children, budgetPx = 220 }: { children: React.ReactNode; budgetPx?: number }): React.ReactElement {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [foldable, setFoldable] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    // measure the natural height against the budget; collapse only when it overflows.
    if (el.scrollHeight > budgetPx + 8) { setFoldable(true); setCollapsed(true); }
  }, [budgetPx]);

  return (
    <div className={`vh2-fold${collapsed ? ' collapsed' : ''}`}>
      <div className="foldbody" ref={bodyRef} style={collapsed ? { maxHeight: budgetPx } : undefined}>
        {children}
      </div>
      {foldable && collapsed ? <div className="fade" aria-hidden="true" /> : null}
      {foldable ? (
        <button type="button" className="foldbtn" aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
          <span className="txt">{collapsed ? 'Read more' : 'Show less'}</span>
          <span className="chev" aria-hidden="true">&#9662;</span>
        </button>
      ) : null}
    </div>
  );
}
