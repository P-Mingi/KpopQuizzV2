// Bunnyverse Cards, lane U: /cards/c/BV1-0042, one card: the front, the back with the credit, and under it (never behind a flip) the
// credit with links to the author, the source page and the licence. Always noindex. An unknown number is a 404. ?lock=SR on an
// edition that cannot exist yet shows its lock sentence.
import { notFound } from 'next/navigation';

import { CardDetail } from '@/components/cards/card-detail';
import { CreditBlock } from '@/components/cards/credit-block';
import { EDITIONS } from '@/lib/cards/rules';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { buildDetail } from '@/lib/cards/ui-detail';
import { cardsOn } from '@/lib/cards/ui-flag';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

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
  return <CardDetail {...d.props} credit={<CreditBlock photo={d.photo} num={d.card.num} kind={d.entity.kind} />} />;
}
