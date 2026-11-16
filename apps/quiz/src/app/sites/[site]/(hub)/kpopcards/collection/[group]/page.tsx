// KpopCards: /kpopcards/collection/<group>, the binder of one group (its pages, its % and its Complete mark). An unknown group is a 404.
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { readAdsContext } from '@/lib/cards/ads-server';
import { BinderView } from '@/components/cards/binder-view';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { buildSlim } from '@/lib/cards/ui-model';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// The [site] layout allows no param that was not generated at build (dynamicParams = false, O1 guard). An empty list of static params is not
// enough: a production server then answers every value with NoFallbackError (a 404; seen with next start on 2026-11-13). The rule of the
// hub's open-ended pages (as u/[username]): rendered per request, dynamicParams = true.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface Props { params: Promise<{ group: string }> }

async function groupName(slug: string): Promise<string | null> {
  const cat = await loadCatalog();
  return cat ? buildSlim(cat).sections.find((s) => s.id === slug)?.name ?? null : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = await groupName((await params).group);
  if (!name) notFound();
  return { title: `${name} collection`, robots: robotsFor(false) };
}

export default async function KpopCardsGroupPage({ params }: Props): Promise<React.ReactElement> {
  const { group } = await params;
  if (!(await groupName(group))) notFound();
  const ads = await readAdsContext();
  return <Suspense fallback={<div className="wrap page" aria-busy="true"><p className="lede">Loading your collection.</p></div>}><BinderView ads={ads} only={group} /></Suspense>;
}
