'use client';

// iter-9 PART 5 - the floating TOC RAIL (owner-validated prototype: verse-toc-rail.html).
// Replaces the doc's left "On this page" column on every non-home page. Thin ticks glued to the
// right edge, quasi-invisible while reading; hover/focus (desktop) or tap (mobile) fades in a raised
// panel with the section rows. Scroll-spy drives the active tick + row (threshold 140px, per proto).
// The items are server-extracted (same source as DocToc) and rendered as real <a href="#id"> in the
// SSR HTML, so the TOC stays crawlable with JS off. Pages with 0 or 1 h2 render no rail.
import { useEffect, useState } from 'react';

import type { TocItem } from '@/lib/verse/tree/toc';

// A few tick widths, cycled by index, so the rail reads as a varied little barcode (proto look).
const TICK_WIDTHS = [18, 12, 15, 11, 16, 13];

export function VerseTocRail({ items }: { items: TocItem[] }): React.ReactElement | null {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (items.length < 2) return;
    const spy = (): void => {
      let cur = 0;
      items.forEach((it, i) => {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top < 140) cur = i;
      });
      setActive(cur);
    };
    spy();
    window.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    return () => { window.removeEventListener('scroll', spy); window.removeEventListener('resize', spy); };
  }, [items]);

  // Pages with 0 or 1 section get no rail (mission rule). Guarded AFTER the hook so hook order is stable.
  if (items.length < 2) return null;

  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string): void => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOpen(false);
  };

  return (
    <nav className={`v-tocrail${open ? ' open' : ''}`} aria-label="On this page">
      {/* mobile only (CSS-gated): tap-outside to close the panel */}
      <div className="v-tocrail-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
      <button
        type="button"
        className="v-tocrail-ticks"
        aria-label="Open the table of contents"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {items.map((it, i) => (
          <span key={it.id} className={i === active ? 'on' : undefined} style={{ width: `${TICK_WIDTHS[i % TICK_WIDTHS.length]}px` }} />
        ))}
      </button>
      <div className="v-tocrail-panel">
        <div className="v-tocrail-label">On this page · {items.length}</div>
        {items.map((it, i) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={[i === active ? 'on' : '', it.level === 3 ? 'sub' : ''].filter(Boolean).join(' ') || undefined}
            aria-current={i === active ? 'true' : undefined}
            onClick={(e) => go(e, it.id)}
          >
            {it.text}
          </a>
        ))}
      </div>
    </nav>
  );
}
