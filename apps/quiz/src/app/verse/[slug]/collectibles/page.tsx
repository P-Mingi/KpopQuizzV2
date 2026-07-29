import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getCollectibles } from '@/lib/verse/collectibles';
import { CollectibleGallery } from '@/components/verse/collectible-gallery';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Collectibles' };
  return {
    title: `${space.group.name} merch and lightsticks`,
    description: `Official merch and lightstick gallery for ${space.group.name}, sourced, with a personal owned and wanted checklist.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/collectibles` },
  };
}

export default async function CollectiblesPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const items = await getCollectibles(space.group.id);
  return (
    <div>
      <p className="mb-4 text-xs text-tertiary">Official merch and lightsticks, fan-catalogued and sourced. Track what you own and want; your checklist is private.</p>
      <CollectibleGallery items={items} groupId={space.group.id} groupSlug={slug} />
    </div>
  );
}
