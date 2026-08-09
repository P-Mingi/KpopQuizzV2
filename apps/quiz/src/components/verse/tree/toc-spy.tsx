'use client';
// V3 nav - the "On this page" TOC with a scroll-spy. This is the ONLY client-JS piece of the
// left nav: it scans the rendered page for [data-toc] sections (SSR'd by the page), builds the
// same-page anchor list, and highlights the section currently under the top of the viewport via
// an IntersectionObserver. The Navigate space-nav above it is fully SSR/crawlable. When the page
// has no [data-toc] sections the whole block self-hides. prefers-reduced-motion is honoured by
// the CSS (html scroll-behavior), so no JS smooth-scroll here.
import { useEffect, useState } from 'react';

interface TocItem { id: string; label: string }

export function VerseTocSpy(): React.ReactElement | null {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const secs = Array.from(document.querySelectorAll<HTMLElement>('[data-toc]'))
      .filter((el) => el.id);
    const list = secs.map((el) => ({ id: el.id, label: el.dataset.toc ?? el.id }));
    setItems(list);
    if (!secs.length) return;
    if (!active) setActive(secs[0]!.id);

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-88px 0px -68% 0px', threshold: 0 },
    );
    secs.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
    // one-shot: the home sections are stable for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items.length) return null;

  return (
    <div className="v-side-group v-toc-group">
      <p className="v-side-eyebrow">On this page</p>
      <ul className="v-toc">
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} className={`v-toc-link${active === it.id ? ' active' : ''}`}
               aria-current={active === it.id ? 'true' : undefined}>
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
