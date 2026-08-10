// V7 - the SPACE-ONLY left sidebar (Notion-style). Every global control moved to the top bar
// (verse-topbar.tsx). What remains: the space header (chip + name + meta + HIDE button), the
// Space home / Browse everything rows, and the NAVIGATE accordion. It fully hides to width 0
// (no icon rail); a floating reopen tab (in the layout) brings it back. Both the open markup and
// the links stay server-rendered; CSS alone hides the panel, so every nav link is crawlable.
import Link from 'next/link';

import { VerseTocSpy } from './toc-spy';
import { VerseNavToggle } from './nav-toggle';
import { NavAccordion } from './side-nav-rows';
import { ICONS } from './side-nav-icons';

import type { NavNode } from '@/lib/verse/tree/nav';

export function VerseSideNav({ spaceSlug, tree, spaceName, spaceLabel, spaceMeta }: {
  spaceSlug: string; tree: NavNode[]; spaceName: string; spaceLabel: string; spaceMeta: string;
}): React.ReactElement {
  return (
    <aside className="v-sidenav" aria-label={`${spaceName} navigation`}>
      <div className="v-sidenav-inner">
        <div className="v-side-open">
          <div className="v-side-shhead">
            <Link href={`/verse/${spaceSlug}`} className="v-side-shchip" aria-label={`${spaceLabel} home`}>{spaceLabel.slice(0, 1)}</Link>
            <span className="v-side-shmeta">
              <span className="v-side-shname">{spaceLabel}</span>
              <span className="v-side-shsub">{spaceMeta}</span>
            </span>
            <VerseNavToggle to="hidden" className="v-side-hide" title="Hide the sidebar">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /><path d="M20 4v16" /></svg>
            </VerseNavToggle>
          </div>

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
      </div>
    </aside>
  );
}
