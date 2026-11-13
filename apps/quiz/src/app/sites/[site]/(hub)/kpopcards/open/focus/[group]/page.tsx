// KpopCards: /kpopcards/open/focus/<group>, a focus pack for one group (once a Paris day; its 2nd and 4th cards come from the group). Not indexed.
import { notFound } from 'next/navigation';

import { OpeningMount } from '@/components/cards/opening-mount';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { buildSlim } from '@/lib/cards/ui-model';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// The [site] layout has generateStaticParams and dynamicParams = false (O1 guard), and a dynamic segment of its own with no generateStaticParams still answers 404 under it.
// The rule for every dynamic page of the hub: dynamicParams = true AND a generateStaticParams (the finite values when they are finite, else an empty list: rendered on first request).
export const dynamicParams = true;
export function generateStaticParams(): { group: string }[] { return []; }

export const metadata: Metadata = { title: 'Opening a focus pack', robots: robotsFor(false) };

export default async function OpenFocusPage({ params }: { params: Promise<{ group: string }> }): Promise<React.ReactElement> {
  const { group } = await params;
  const cat = await loadCatalog();
  if (!cat || !buildSlim(cat).sections.some((s) => s.id === group && s.id !== 'events')) notFound();
  return <OpeningMount spec={{ kind: 'focus', group }} />;
}
