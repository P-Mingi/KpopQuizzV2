// V7 - the discreet GLOBAL top bar (Notion-style), /verse only. It holds every global control that
// used to live in the sidebar: the real KpopVerse logo, the Fandoms/Community links, the Verse
// search field, the pink Play CTA, the theme toggle and the profile/avatar. On mobile it condenses
// to logo + search icon + Play + a hamburger that opens the space sidebar as a drawer.
// Server component; the interactive pieces (WorldToggle/ThemeToggle/TopNavProfile) are client islands.
import Link from 'next/link';

import { VerseLogo } from '@/components/verse/brand/verse-logo';
import { WorldToggle } from '@/components/layout/world-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { TopNavProfile } from '@/components/layout/top-nav-profile';
import { ICONS } from './side-nav-icons';

export function VerseTopBar(): React.ReactElement {
  return (
    <header className="v-topbar" aria-label="KpopVerse">
      {/* mobile: the hamburger opens the space sidebar drawer (checkbox lives in the layout). */}
      <label htmlFor="v-nav-drawer" className="v-topbar-burger" aria-label="Open the space menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </label>

      <span className="v-topbar-brand"><VerseLogo height={20} /></span>
      <span className="v-topbar-div" aria-hidden="true" />
      <nav className="v-topbar-links" aria-label="Verse sections">
        <Link href="/verse" className="v-topbar-link">Fandoms</Link>
        <Link href="/verse/community" className="v-topbar-link">Community</Link>
      </nav>

      <span className="v-topbar-spacer" />

      <Link href="/verse?search=1" className="v-topbar-search" aria-label="Search the Verse">
        <span className="ic" aria-hidden="true">{ICONS.search}</span>
        <span className="lbl">Search the Verse</span>
      </Link>
      <Link href="/verse?search=1" className="v-topbar-searchicon" aria-label="Search the Verse">
        <span aria-hidden="true">{ICONS.search}</span>
      </Link>

      <div className="v-topbar-right">
        <span className="v-topbar-play"><WorldToggle /></span>
        <ThemeToggle className="v-topbar-theme" />
        <span className="v-topbar-profile"><TopNavProfile /></span>
      </div>
    </header>
  );
}
