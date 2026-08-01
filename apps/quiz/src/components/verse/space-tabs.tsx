'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useBuildMode } from '@/components/verse/build-mode';

import type { BuildRole } from '@/components/verse/build-mode';
import type { SpaceTab } from '@/lib/verse/presentation/tabs';

// V-MODES step 2 - the build layer's nav entries, min-gated by role and
// revealed only in Build mode. Client-side rank mirror of lib/verse/roles
// (that module is server-only).
export interface BuildTab { label: string; seg: string; minRole: 'member' | 'contributor' | 'curator' }
const ROLE_RANK: Record<BuildRole, number> = { visitor: 0, member: 1, contributor: 2, curator: 3, space_admin: 4 };

// W-CUSTOM step 9 - the space tab bar. The curator composes which tabs show (3-7)
// via presentation.tabs; the layout passes the final ordered list here. NO
// horizontal-scroll nav: desktop wraps, mobile shows the first 3 inline + a More
// button opening a bottom sheet with the full list. Hidden tabs never hide pages.
const MOBILE_INLINE = 3;

// V-POLISH-2 A1/A6 - ORPHAN SEGMENTS: pages that live under the space but are
// not in the curator's tab set (Browse, the studio, curate, any hidden tab)
// still deserve an active marker, or the reader loses "where am I". The chip
// renders as the active tab would, without becoming a navigable duplicate.
const SEGMENT_LABELS: Record<string, string> = {
  content: 'Browse', curate: 'Curate', studio: 'Studio', about: 'About',
  wiki: 'Wiki', songs: 'Songs', photocards: 'Photocards', collectibles: 'Collectibles',
  members: 'Members', discography: 'Discography', timeline: 'Timeline', quests: 'Quests',
  essays: 'Essays', community: 'Community', awards: 'Awards', tours: 'Tours', shows: 'Shows', ost: 'OST',
};
const orphanLabel = (seg: string): string => SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);

// V-POLISH-2 A6 - the More sheet groups by intent instead of one flat list.
const SHEET_GROUPS: { label: string; segs: string[] }[] = [
  { label: 'The space', segs: ['', 'members', 'discography', 'timeline', 'about'] },
  { label: 'The catalog', segs: ['songs', 'wiki', 'awards', 'tours', 'shows', 'ost', 'photocards', 'collectibles'] },
  { label: 'The community', segs: ['essays', 'community'] },
];

export function SpaceTabs({ slug, tabs, buildTabs = [] }: { slug: string; tabs: SpaceTab[]; buildTabs?: BuildTab[] }): React.ReactElement {
  const pathname = usePathname();
  // V-MODES (locked Q1/Q2): the reader set renders for everyone, first paint
  // and crawlers included. The build layer appears only in Build mode, filtered
  // to the viewer's actual role.
  const { role, on: buildOn } = useBuildMode();
  const buildItems = buildOn ? buildTabs.filter((t) => ROLE_RANK[role] >= ROLE_RANK[t.minRole]) : [];
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
  const orphan = activeSeg && !tabs.some((t) => t.seg === activeSeg) ? orphanLabel(activeSeg) : null;

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
        {orphan ? (
          <li aria-current="page">
            <span className="inline-block whitespace-nowrap rounded-t-lg px-3.5 py-2 text-sm font-semibold" style={linkStyle(true)}>{orphan}</span>
          </li>
        ) : null}
        {buildItems.length > 0 ? (
          // A labeled group so screen readers announce these as the build set,
          // not more reader tabs (the accent hue alone is a color-only cue). The
          // divider stays decorative. Text is pulled toward verse-ink so a pale
          // curator accent never drops the label under the contrast floor.
          <li className="contents">
            <ul role="group" aria-label="Build tools" className="flex flex-wrap items-stretch gap-1.5">
              <li aria-hidden className="self-center px-1"><span className="block h-5 w-px" style={{ background: 'var(--verse-line)' }} /></li>
              {buildItems.map((t) => (
                <li key={`build-${t.seg}`}>
                  <Link href={`${base}/${t.seg}`} aria-current={activeSeg === t.seg ? 'page' : undefined}
                    className="inline-block whitespace-nowrap rounded-t-lg px-3.5 py-2 text-sm font-bold transition-colors"
                    style={{
                      color: 'color-mix(in srgb, var(--verse-cta, var(--verse-accent)) 62%, var(--verse-ink))',
                      borderBottom: activeSeg === t.seg ? '2px solid var(--verse-cta, var(--verse-accent))' : '2px solid transparent',
                      background: activeSeg === t.seg ? 'var(--verse-soft)' : 'transparent',
                    }}>
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
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
        {orphan ? (
          <li className="flex flex-1 items-center justify-center" aria-current="page">
            <span className="block rounded-t-lg px-2 py-2 text-center text-[13px] font-semibold" style={linkStyle(true)}>{orphan}</span>
          </li>
        ) : null}
        {overflow.length > 0 || buildItems.length > 0 ? (
          <li className="flex items-center">
            {/* Flat disclosure, not a chip: accent-ink label + a chevron that rotates
                when the sheet opens. The chevron is the affordance and the accent
                color sets it apart from the muted tabs, so no pill/badge/shadow is
                needed. Tap area stays full height; visual weight stays light. */}
            <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet}
              aria-label={`Show ${overflow.length + buildItems.length} more sections`}
              className="inline-flex items-center gap-0.5 px-3 py-2 text-[13px] font-semibold transition-opacity active:opacity-60"
              style={{ color: 'var(--verse-ink)' }}>
              More
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: sheet ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
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
            {(() => {
              const grouped = SHEET_GROUPS.map((g) => ({ ...g, items: tabs.filter((t) => g.segs.includes(t.seg)) })).filter((g) => g.items.length);
              const leftovers = tabs.filter((t) => !SHEET_GROUPS.some((g) => g.segs.includes(t.seg)));
              const sections = leftovers.length ? [...grouped, { label: 'More', segs: [], items: leftovers }] : grouped;
              // The build group renders last, only in Build mode, role-filtered.
              if (buildItems.length) sections.push({ label: 'The build', segs: [], items: buildItems.map((t) => ({ label: t.label, seg: t.seg })) });
              return sections.map((g) => (
                <div key={g.label} className="mb-2 last:mb-0">
                  <p className="px-4 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tertiary">{g.label}</p>
                  <ul className="flex flex-col gap-0.5">
                    {g.items.map((t) => (
                      <li key={t.seg || 'home'}>
                        <Link href={href(t)} onClick={() => setSheet(false)} aria-current={activeSeg === t.seg ? 'page' : undefined}
                          className="block rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ color: activeSeg === t.seg ? 'var(--verse-ink)' : 'var(--text-primary)', background: activeSeg === t.seg ? 'var(--verse-soft)' : 'transparent' }}>
                          {t.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
