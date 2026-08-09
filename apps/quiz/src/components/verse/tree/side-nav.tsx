// V3 nav (iteration 3) - the ONE Verse nav, with TWO clean IN-FLOW states (no overlay):
//  - .v-side-open  : the ~250px expanded column (real logo + relocated global chrome + space nav + TOC).
//  - .v-side-rail  : a ~60px uniform ICON column, rendered separately so every icon (global AND space)
//                    is a plain 40px square with no borrowed top-nav button chrome. Toggling the
//                    #v-nav-collapse checkbox REFLOWS the row (globals.css); nothing floats over content.
// Both are SSR/crawlable; the collapse is a deliberate click on the chevron (no hover-peek). The only
// client JS is the scroll-spy TOC and the two ThemeToggle islands.
import Link from 'next/link';

import { VerseLogo } from '@/components/verse/brand/verse-logo';
import { OrbitMark } from '@/components/verse/brand/verse-wordmarks';
import { WorldToggle } from '@/components/layout/world-toggle';
import { TopNavLinks } from '@/components/layout/top-nav-links';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { TopNavProfile } from '@/components/layout/top-nav-profile';
import { VerseTocSpy } from './toc-spy';

import type { NavNode, NavRef } from '@/lib/verse/tree/nav';

function hrefFor(spaceSlug: string, ref: NavRef | undefined): string | null {
  if (!ref) return null;
  if (ref.kind === 'page') return `/verse/${spaceSlug}/${ref.slug}`;
  return null; // an auto-index target renders as a plain label until its index route lands
}
// A section with no target of its own opens to its first child page, so its rail icon still navigates.
function sectionHref(spaceSlug: string, n: NavNode): string | null {
  return hrefFor(spaceSlug, n.ref) ?? (n.children ?? []).map((c) => hrefFor(spaceSlug, c.ref)).find(Boolean) ?? null;
}

const svg = (children: React.ReactNode): React.ReactElement => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
// A small stroke icon per top-level section (rail + a match for the open tree).
function SectionIcon({ label }: { label: string }): React.ReactElement {
  const l = label.toLowerCase();
  if (/music|song|disco|album|track/.test(l)) return svg(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>);
  if (/member|idol|people|roster/.test(l)) return svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>);
  if (/show|tour|tv|video|watch|stage/.test(l)) return svg(<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M10 8l4 2.5-4 2.5z" fill="currentColor" stroke="none" /><path d="M8 21h8" /></>);
  if (/fandom|army|community|fan/.test(l)) return svg(<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />);
  if (/about|info|company|award|record|history/.test(l)) return svg(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>);
  return svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>);
}
const ICONS = {
  play: svg(<polygon points="9 7 17 12 9 17 9 7" fill="currentColor" stroke="none" />),
  fandoms: svg(<><path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" /></>),
  community: svg(<><circle cx="9" cy="7" r="3.4" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1z" /><circle cx="17.5" cy="8.5" r="2.4" /><path d="M16.5 13.6A4.6 4.6 0 0 1 21.5 18v1H18" /></>),
  search: svg(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>),
  person: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 12 0v1" transform="translate(2 0)" /></>),
  home: svg(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>),
  browse: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.5 9h17M3.5 15h17" /></>),
};

export function VerseSideNav({ spaceSlug, tree, spaceName, spaceLabel }: {
  spaceSlug: string; tree: NavNode[]; spaceName: string; spaceLabel: string;
}): React.ReactElement {
  return (
    <aside className="v-sidenav" aria-label={`${spaceName} navigation`}>
      {/* COLLAPSED: a uniform 40px icon column, shown only in the rail state (globals.css). */}
      <div className="v-side-rail">
        <label htmlFor="v-nav-collapse" className="v-railbtn v-rail-toggle" title="Expand sidebar" aria-label="Expand the sidebar">
          {svg(<><path d="M13 6l6 6-6 6" /><path d="M5 6l6 6-6 6" /></>)}
        </label>
        <Link href="/verse" className="v-railbtn v-rail-logo" title="KpopVerse home" aria-label="KpopVerse home"><OrbitMark size={24} /></Link>
        <div className="v-rail-div" />
        <Link href="/" className="v-railbtn" title="Play" aria-label="Play">{ICONS.play}</Link>
        <Link href="/verse" className="v-railbtn" title="Fandoms" aria-label="Fandoms">{ICONS.fandoms}</Link>
        <Link href="/verse/community" className="v-railbtn" title="Community" aria-label="Community">{ICONS.community}</Link>
        <Link href="/verse?search=1" className="v-railbtn" title="Search" aria-label="Search the Verse">{ICONS.search}</Link>
        <ThemeToggle className="v-railbtn v-rail-themebtn" />
        <Link href="/profile" className="v-railbtn" title="Profile" aria-label="Your profile">{ICONS.person}</Link>
        <div className="v-rail-div" />
        <Link href={`/verse/${spaceSlug}`} className="v-railbtn" title={`${spaceLabel} home`} aria-label={`${spaceLabel} home`}>{ICONS.home}</Link>
        <Link href="/verse" className="v-railbtn" title="Browse everything" aria-label="Browse everything">{ICONS.browse}</Link>
        {tree.map((n, i) => {
          const href = sectionHref(spaceSlug, n);
          return href
            ? <Link key={i} href={href} className="v-railbtn" title={n.label} aria-label={n.label}><SectionIcon label={n.label} /></Link>
            : <span key={i} className="v-railbtn" title={n.label} aria-label={n.label}><SectionIcon label={n.label} /></span>;
        })}
      </div>

      {/* OPEN: the full expanded column. */}
      <div className="v-side-open">
        <div className="v-side-top">
          <div className="v-side-brandrow">
            <span className="v-side-logo-full"><VerseLogo height={21} /></span>
            <label htmlFor="v-nav-collapse" className="v-side-collapse" title="Collapse sidebar" aria-label="Collapse the sidebar">
              <span className="v-side-collapse-glyph" aria-hidden="true">&#9666;</span>
            </label>
          </div>
          <div className="v-side-primary">
            <WorldToggle />
            <TopNavLinks world="verse" />
          </div>
          <div className="v-side-actions">
            <Link href="/verse?search=1" className="v-side-action" aria-label="Search the Verse">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              <span className="v-side-action-lbl">Search</span>
            </Link>
            <span className="v-side-themewrap"><ThemeToggle className="v-side-themebtn" /></span>
            <span className="v-side-profilewrap"><TopNavProfile /></span>
          </div>
        </div>

        <Link href={`/verse/${spaceSlug}`} className="v-side-chip">
          <span className="v-side-chip-ic" aria-hidden="true">{spaceLabel.slice(0, 1)}</span>
          <span className="v-side-chip-tx">{spaceLabel}</span>
        </Link>
        <div className="v-side-quick">
          <Link href={`/verse/${spaceSlug}`} className="v-side-quicklink">
            <span className="v-side-ic" aria-hidden="true">{ICONS.home}</span>
            <span className="v-side-lbl">Space home</span>
          </Link>
          <Link href="/verse" className="v-side-quicklink">
            <span className="v-side-ic" aria-hidden="true">{ICONS.browse}</span>
            <span className="v-side-lbl">Browse everything</span>
          </Link>
        </div>

        <nav className="v-side-nav" aria-label="Space sections">
          <p className="v-side-eyebrow">Navigate</p>
          <ul className="v-side-list">
            {tree.map((n, i) => {
              const kids = n.children ?? [];
              const href = hrefFor(spaceSlug, n.ref);
              if (kids.length) {
                return (
                  <li key={i} className="v-side-item">
                    <details className="v-side-sect" open>
                      <summary className="v-side-row">
                        <span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span>
                        <span className="v-side-lbl">{n.label}</span>
                        <span className="v-side-chev" aria-hidden="true">&#9662;</span>
                      </summary>
                      <ul className="v-side-sub">
                        {kids.map((c, j) => {
                          const ch = hrefFor(spaceSlug, c.ref);
                          return (
                            <li key={j}>
                              {ch ? <Link href={ch} className="v-side-link">{c.label}</Link>
                                  : <span className="v-side-link disabled">{c.label}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </li>
                );
              }
              return (
                <li key={i} className="v-side-item">
                  {href
                    ? <Link href={href} className="v-side-row v-side-leaf"><span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span><span className="v-side-lbl">{n.label}</span></Link>
                    : <span className="v-side-row v-side-leaf"><span className="v-side-ic" aria-hidden="true"><SectionIcon label={n.label} /></span><span className="v-side-lbl">{n.label}</span></span>}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="v-side-divider" />
        <VerseTocSpy />
      </div>
    </aside>
  );
}
