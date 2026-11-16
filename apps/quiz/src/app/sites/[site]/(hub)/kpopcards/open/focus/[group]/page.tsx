// KpopCards: /kpopcards/open/focus/<group>, a focus pack for one group (once a Paris day; its 2nd and 4th cards come from the group). Not indexed.
import { notFound } from 'next/navigation';

import { OpeningMount } from '@/components/cards/opening-mount';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { buildSlim } from '@/lib/cards/ui-model';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// The [site] layout allows no param that was not generated at build (dynamicParams = false, O1 guard). An empty list of static params is not
// enough: a production server then answers every value with NoFallbackError (a 404; seen with next start on 2026-11-13). The rule of the
// hub's open-ended pages (as u/[username]): rendered per request, dynamicParams = true.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const metadata: Metadata = { title: 'Opening a focus pack', robots: robotsFor(false) };

export default async function OpenFocusPage({ params }: { params: Promise<{ group: string }> }): Promise<React.ReactElement> {
  const { group } = await params;
  const cat = await loadCatalog();
  if (!cat || !buildSlim(cat).sections.some((s) => s.id === group && s.id !== 'events')) notFound();
  return <OpeningMount spec={{ kind: 'focus', group }} />;
}
