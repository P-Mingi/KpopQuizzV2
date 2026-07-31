'use client';

import { useSelectedLayoutSegment } from 'next/navigation';

// V-POLISH step 4 (audit item 6) - THE HERO TAX. The full space masthead is the
// space home's opening statement; on every sub-page it pushed the content a
// visitor came for one to two screens down. This shell reads the active child
// segment (server-rendered by the router, so no flash) and flags sub-pages;
// globals.css renders the compact variant: one name row with the join action,
// no welcome line, no NOW block, no stickers.
export function HeroShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const segment = useSelectedLayoutSegment();
  return <div className={segment ? 'v-hero-compact' : undefined}>{children}</div>;
}
