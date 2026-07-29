import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getEras } from '@/lib/verse/eras';
import { jsonLdScript } from '@/lib/verse/jsonld';
import { EraSpine } from '@/components/verse/era-spine';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Timeline' };
  return {
    title: `${space.group.name} eras and timeline - ${space.group.fandom_name}`,
    description: `Every ${space.group.name} era, comeback and release in order, grouped from entity data with fan-written era stories.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/timeline` },
  };
}

export default async function TimelinePage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const { group } = space;

  const eras = await getEras(group.id);
  const debut = group.inception_date ? { date: group.inception_date.slice(0, 10), label: `${group.name} debuts` } : null;

  if (eras.length === 0 && !debut) {
    return <p className="rounded-xl border border-dashed border-default px-5 py-10 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>Timeline for {group.name} is being prepared.</p>;
  }

  // ItemList JSON-LD: the era sequence as an ordered list (crawlable structure).
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${group.name} eras`,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: eras.length,
    itemListElement: eras.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.name,
      ...(e.periodStart ? { startDate: e.periodStart } : {}),
    })),
  };

  return (
    <div>
      {eras.length > 0 ? jsonLdScript(itemList) : null}
      <EraSpine eras={eras} groupSlug={slug} debut={debut} />
    </div>
  );
}
