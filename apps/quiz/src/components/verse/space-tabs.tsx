'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { SpaceTab } from '@/lib/verse/presentation/tabs';

// W-CUSTOM step 9 - the space tab bar. The curator composes which tabs show (3-7)
// via presentation.tabs; the layout passes the final ordered list here. NO
// horizontal-scroll nav: desktop wraps, mobile shows the first 3 inline + a More
// button opening a bottom sheet with the full list. Hidden tabs never hide pages.
const MOBILE_INLINE = 3;

export function SpaceTabs({ slug, tabs }: { slug: string; tabs: SpaceTab[] }): React.ReactElement {
  const pathname = usePathname();
  const base = `/verse/${slug}`;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '') : '';
  const activeSeg = rest.split('/')[0] ?? '';
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(false); };
    document.addEventListener('keydown', onKey);
    sheetRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet]);

  const href = (t: SpaceTab) => (t.seg ? `${base}/${t.seg}` : base);
  const linkStyle = (active: boolean): React.CSSProperties => active
    ? { color: 'var(--verse-ink)', borderBottom: '2px solid var(--verse-accent)', background: 'var(--verse-soft)' }
    : { color: 'var(--text-secondary)', borderBottom: '2px solid transparent' };

  const inline = tabs.slice(0, MOBILE_INLINE);
  const overflow = tabs.slice(MOBILE_INLINE);

  return (
    <nav aria-label="Space sections" className="verse-tabs mb-6">
      {/* Desktop: wraps, no horizontal scroll */}
      <ul className="hidden flex-wrap gap-1.5 border-b border-default pb-0 sm:flex">
        {tabs.map((t) => (
          <li key={t.seg || 'home'}>
            <Link href={href(t)} aria-current={activeSeg === t.seg ? 'page' : undefined}
              className="inline-block whitespace-nowrap rounded-t-lg px-3.5 py-2 text-sm font-semibold transition-colors" style={linkStyle(activeSeg === t.seg)}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Mobile: first 3 inline + More (no horizontal scroll) */}
      <ul className="flex items-stretch gap-1.5 border-b border-default pb-0 sm:hidden">
        {inline.map((t) => (
          <li key={t.seg || 'home'} className="flex-1">
            <Link href={href(t)} aria-current={activeSeg === t.seg ? 'page' : undefined}
              className="block rounded-t-lg px-2 py-2 text-center text-[13px] font-semibold transition-colors" style={linkStyle(activeSeg === t.seg)}>
              {t.label}
            </Link>
          </li>
        ))}
        {overflow.length > 0 ? (
          <li>
            <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet}
              className="rounded-t-lg px-3 py-2 text-[13px] font-semibold text-secondary" style={{ borderBottom: '2px solid transparent' }}>
              More
            </button>
          </li>
        ) : null}
      </ul>

      {sheet ? (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={() => setSheet(false)} />
          <div ref={sheetRef} tabIndex={-1} className="verse-scope absolute inset-x-0 bottom-0 rounded-t-2xl p-4 pb-[calc(16px+env(safe-area-inset-bottom))] outline-none"
            style={{ background: 'var(--bg-surface)', maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: 'var(--border)' }} />
            <ul className="flex flex-col gap-1">
              {tabs.map((t) => (
                <li key={t.seg || 'home'}>
                  <Link href={href(t)} onClick={() => setSheet(false)} aria-current={activeSeg === t.seg ? 'page' : undefined}
                    className="block rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ color: activeSeg === t.seg ? 'var(--verse-ink)' : 'var(--text-primary)', background: activeSeg === t.seg ? 'var(--verse-soft)' : 'transparent' }}>
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
