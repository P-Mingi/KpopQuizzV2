// Run O1: the pages of this group exist only on the anime build (twins.json rows of site 'anime'); on any other build they are
// a 404, so the hub never serves an anime page and the anime site never serves a hub page.
import { notFound } from 'next/navigation';

import { SITE_ID } from '@/lib/site/registry';

export default function OnlySiteLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  if (SITE_ID !== 'anime') notFound();
  return children as React.ReactElement;
}
