'use client';

// V-FOUNDATION F1 Phase C - the reading rail (prototype screen 01, note 4). The TOC is
// auto-generated from the body H2/H3 (passed in, server-extracted); this client layer
// adds the scrollspy (active heading) + the progress bar. Pure enhancement: the same
// anchors are real <a href="#id"> that work with JS off (reading order + SEO unaffected).
import { useEffect, useRef, useState } from 'react';

import type { TocItem } from '@/lib/verse/tree/toc';

export function DocToc({ items }: { items: TocItem[] }): React.ReactElement | null {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const progRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items.map((it) => document.getElementById(it.id)).filter((el): el is HTMLElement => !!el);
    // active heading = the last one whose top has crossed the reading line.
    const onScroll = (): void => {
      const line = 96;
      let current = headings[0]?.id ?? null;
      for (const h of headings) { if (h.getBoundingClientRect().top <= line) current = h.id; else break; }
      if (current) setActiveId(current);
      // progress = how far the document body has scrolled through the viewport.
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const pct = total > 0 ? Math.min(100, Math.max(0, (doc.scrollTop / total) * 100)) : 0;
      if (progRef.current) progRef.current.style.width = `${pct}%`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [items]);

  if (items.length === 0) return null;
  return (
    <aside className="vdoc-toc" aria-label="On this page">
      <div className="h">On this page <span>{items.length}</span></div>
      <ol>
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? 'l2' : undefined}>
            <a href={`#${it.id}`} className={activeId === it.id ? 'on' : undefined} aria-current={activeId === it.id ? 'true' : undefined}>{it.text}</a>
          </li>
        ))}
      </ol>
      <div className="prog" aria-hidden="true"><i ref={progRef} /></div>
    </aside>
  );
}
