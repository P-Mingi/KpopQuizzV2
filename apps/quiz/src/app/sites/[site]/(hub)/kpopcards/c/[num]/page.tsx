// KpopCards: /kpopcards/c/BV1-0042, one card: the front, the back with the credit, and under it (never behind a flip) the
// credit with links to the author, the source page and the licence. Always noindex. An unknown number is a 404. ?lock=SR on an
// edition that cannot exist yet shows its lock sentence.
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { BinderView } from '@/components/cards/binder-view';
import { readAdsContext } from '@/lib/cards/ads-server';

import { CardDetail } from '@/components/cards/card-detail';
import { CreditBlock } from '@/components/cards/credit-block';
import { EDITIONS } from '@/lib/cards/rules';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { buildDetail } from '@/lib/cards/ui-detail';
import { cardsOn } from '@/lib/cards/ui-flag';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// The [site] layout sets dynamicParams = false (O1 guard); a dynamic segment without generateStaticParams needs true or it never matches (the catch-all answers 404).
export const dynamicParams = true;

interface Props { params: Promise<{ num: string }>; searchParams: Promise<{ lock?: string | string[] }> }

const lockOf = (v: string | string[] | undefined): string | null => (typeof v === 'string' ? v : null);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  if (!cardsOn()) notFound();
  const [{ num }, q] = await Promise.all([params, searchParams]);
  const cat = await loadCatalog();
  const d = cat ? buildDetail(cat, num, lockOf(q.lock)) : null;
  if (!d) notFound();
  // A card page is never indexed (the credit lives on /credits): robotsFor(false) is noindex, nofollow on every build.
  return { title: `${d.card.name}, ${EDITIONS[d.card.rarity].name} (${d.card.num})`, robots: robotsFor(false) };
}

export default async function CardPage({ params, searchParams }: Props): Promise<React.ReactElement> {
  if (!cardsOn()) notFound();
  const [{ num }, q] = await Promise.all([params, searchParams]);
  const cat = await loadCatalog();
  const d = cat ? buildDetail(cat, num, lockOf(q.lock)) : null;
  if (!d) notFound();
  const ads = await readAdsContext();
  // The prototype's card view is a sheet over the collection: the binder is drawn behind it (from the query of the address) and the sheet closes back to it.
  return (
    <>
      <Suspense fallback={<div className="wrap page" aria-busy="true"><p className="lede">Loading your collection.</p></div>}><BinderView ads={ads} /></Suspense>
      <Suspense fallback={null}><CardDetail {...d.props} inSheet credit={<CreditBlock photo={d.photo} num={d.card.num} kind={d.entity.kind} />} /></Suspense>
    </>
  );
}
