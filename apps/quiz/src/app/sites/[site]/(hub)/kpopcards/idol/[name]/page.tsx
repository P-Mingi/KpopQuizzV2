// KpopCards (lot 5): /kpopcards/idol/<name>, the page of an idol, unlocked by owning one of their cards, linked to the idol's quizzes on kpopquiz.org. Closed to search
// engines while the hub is private (an idol page depends on what the visitor owns). An unknown idol is a 404.
import { notFound } from 'next/navigation';

import { IdolView } from '@/components/cards/idol-view';
import { findIdol } from '@/lib/cards/kc-idol';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { buildSlim } from '@/lib/cards/ui-model';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// The [site] layout has generateStaticParams and dynamicParams = false (O1 guard), and a dynamic segment of its own with no generateStaticParams still answers 404 under it.
// The rule for every dynamic page of the hub: dynamicParams = true AND a generateStaticParams (the finite values when they are finite, else an empty list: rendered on first request).
export const dynamicParams = true;
export function generateStaticParams(): { name: string }[] { return []; }

interface Props { params: Promise<{ name: string }> }

async function idolName(name: string): Promise<string | null> {
  const cat = await loadCatalog();
  return cat ? findIdol(buildSlim(cat), decodeURIComponent(name))?.name ?? null : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = await idolName((await params).name);
  if (!n) notFound();
  return { title: n, robots: robotsFor(false) };
}

export default async function KpopCardsIdolPage({ params }: Props): Promise<React.ReactElement> {
  const { name } = await params;
  if (!(await idolName(name))) notFound();
  return <IdolView slug={decodeURIComponent(name)} />;
}
