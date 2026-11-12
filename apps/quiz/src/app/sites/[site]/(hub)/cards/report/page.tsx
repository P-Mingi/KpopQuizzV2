// Bunnyverse Cards, lane U: /cards/report, the form to report a photo (the person shown, the photographer, an agency, anyone). Noindex.
// ?card=BV1-0042 and ?photo=17 (the links of the card pages and of /credits) say which photo; the page checks them against the catalog
// and ignores what it does not know.
import { notFound } from 'next/navigation';

import { ReportForm, REMOVAL_PROMISE } from '@/components/cards/report-form';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { cardsOn } from '@/lib/cards/ui-flag';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Report a photo',
  description: 'Tell us about a photo on a Bunnyverse card: it is removed within 48 hours.',
  robots: robotsFor(false),
};

interface Props { searchParams: Promise<{ card?: string | string[]; photo?: string | string[] }> }

export default async function CardsReportPage({ searchParams }: Props): Promise<React.ReactElement> {
  if (!cardsOn()) notFound();
  const q = await searchParams;
  const num = typeof q.card === 'string' ? q.card : null;
  const photo = typeof q.photo === 'string' && /^\d{1,12}$/.test(q.photo) ? Number(q.photo) : null;
  const cat = await loadCatalog();
  const card = cat && num ? cat.cards.find((c) => c.num === num) : undefined;
  const photoId = card?.photo?.id ?? (cat && photo !== null && cat.cards.some((c) => c.photo?.id === photo) ? photo : null);
  return (
    <div className="wrap page">
      <h1 className="h1">Report a photo</h1>
      <p className="lede">Every photo on a Bunnyverse card is free to reuse and credited. If one should not be there, or the credit is wrong, tell us. {REMOVAL_PROMISE}</p>
      <ReportForm photoId={photoId} cardNo={card ? card.n : null} cardLabel={card ? `${card.name}, ${card.num}` : null} />
    </div>
  );
}
