import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getPhotocards } from '@/lib/verse/photocards';
import { PhotocardCatalog } from '@/components/verse/photocard-catalog';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Photocards' };
  return {
    title: `${space.group.name} photocards`,
    description: `Photocard catalogue for ${space.group.name}: album, POB and event cards by era, with a personal owned and wanted checklist.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/photocards` },
  };
}

export default async function PhotocardsPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const cards = await getPhotocards(space.group.id);
  return (
    <div>
      <p className="mb-4 text-xs text-tertiary">Fan-catalogued photocards, sourced. Track what you own and want; your checklist is private.</p>
      <PhotocardCatalog cards={cards} groupId={space.group.id} groupSlug={slug} />
    </div>
  );
}
