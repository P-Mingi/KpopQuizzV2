// V3 nav (iteration 4) - the ONE Verse nav, two clean IN-FLOW states (no overlay):
//  - .v-side-open : the ~250px expanded column. The relocated global controls are now ONE tidy
//    sidebar system: real logo + collapse, the Play CTA pill (kept), Fandoms/Community as nav ROWS
//    (GlobalNavRows), a search row + theme icon, the profile row, then the space chip / quick links
//    / the NAVIGATE accordion (NavAccordion - collapsible, auto-opens the current section) / TOC.
//  - .v-side-rail : the ~60px uniform icon column (unchanged from iteration 3).
// Nav links are SSR/crawlable; the collapse is a deliberate chevron click (no hover-peek).
import Link from 'next/link';

import { VerseLogo } from '@/components/verse/brand/verse-logo';
import { OrbitMark } from '@/components/verse/brand/verse-wordmarks';
import { WorldToggle } from '@/components/layout/world-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { TopNavProfile } from '@/components/layout/top-nav-profile';
import { VerseTocSpy } from './toc-spy';
import { GlobalNavRows, NavAccordion } from './side-nav-rows';
import { SectionIcon, ICONS, sectionHref } from './side-nav-icons';

import type { NavNode } from '@/lib/verse/tree/nav';

export function VerseSideNav({ spaceSlug, tree, spaceName, spaceLabel }: {
  spaceSlug: string; tree: NavNode[]; spaceName: string; spaceLabel: string;
}): React.ReactElement {
  return (
    <aside className="v-sidenav" aria-label={`${spaceName} navigation`}>
      {/* COLLAPSED: a uniform 40px icon column (iteration 3). */}
      <div className="v-side-rail">
        <label htmlFor="v-nav-collapse" className="v-railbtn v-rail-toggle" title="Expand sidebar" aria-label="Expand the sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 6l6 6-6 6" /><path d="M5 6l6 6-6 6" /></svg>
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

      {/* OPEN: the full expanded column - one consistent sidebar system. */}
      <div className="v-side-open">
        <div className="v-side-top">
          <div className="v-side-brandrow">
            <span className="v-side-logo-full"><VerseLogo height={21} /></span>
            <label htmlFor="v-nav-collapse" className="v-side-collapse" title="Collapse sidebar" aria-label="Collapse the sidebar">
              <span className="v-side-collapse-glyph" aria-hidden="true">&#9666;</span>
            </label>
          </div>
          {/* the Play CTA keeps its pink pill - it is the jump to the game and should stand out. */}
          <div className="v-side-cta"><WorldToggle /></div>
          {/* Fandoms / Community as normal sidebar nav rows (not top-nav tabs). */}
          <GlobalNavRows />
          {/* search row + theme icon, then the profile row - all in the sidebar style. */}
          <div className="v-side-searchrow">
            <Link href="/verse?search=1" className="v-side-searchbtn" aria-label="Search the Verse">
              <span className="v-side-ic" aria-hidden="true">{ICONS.search}</span>
              <span className="v-side-lbl">Search</span>
            </Link>
            <span className="v-side-themewrap"><ThemeToggle className="v-side-themebtn" /></span>
          </div>
          <div className="v-side-profilewrap"><TopNavProfile /></div>
        </div>

        <div className="v-side-divider" />

        <Link href={`/verse/${spaceSlug}`} className="v-side-chip">
          <span className="v-side-chip-ic" aria-hidden="true">{spaceLabel.slice(0, 1)}</span>
          <span className="v-side-chip-tx">{spaceLabel}</span>
        </Link>
        <div className="v-side-quick">
          <Link href={`/verse/${spaceSlug}`} className="v-side-row v-side-leaf">
            <span className="v-side-ic" aria-hidden="true">{ICONS.home}</span>
            <span className="v-side-lbl">Space home</span>
          </Link>
          <Link href="/verse" className="v-side-row v-side-leaf">
            <span className="v-side-ic" aria-hidden="true">{ICONS.browse}</span>
            <span className="v-side-lbl">Browse everything</span>
          </Link>
        </div>

        <nav className="v-side-nav" aria-label="Space sections">
          <p className="v-side-eyebrow">Navigate</p>
          <NavAccordion spaceSlug={spaceSlug} tree={tree} />
        </nav>

        <div className="v-side-divider" />
        <VerseTocSpy />
      </div>
    </aside>
  );
}
