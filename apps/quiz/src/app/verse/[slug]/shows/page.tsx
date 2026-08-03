import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSpace } from '@/lib/verse/space';
import { getScene } from '@/lib/verse/entities';
import { SceneList } from '@/components/verse/scene-list';
import { SCENES } from '@/lib/verse/entity-types';

import type { Metadata } from 'next';

export const revalidate = 3600;
const SCENE = SCENES.shows;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: SCENE.label };
  return {
    title: `${space.group.name} TV and variety shows`,
    description: `Variety, reality and TV appearances by ${space.group.name}, with sources.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/shows` },
  };
}

export default async function ShowsPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const rows = await getScene(SCENE.kind, space.group.id);
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Verse', href: '/verse' }, { label: space.group.fandom_name, href: `/verse/${slug}` }, { label: SCENE.label }]} />
      <p className="mb-4 text-xs text-tertiary">TV, variety and reality appearances, fan-run and sourced.</p>
      <SceneList scene={SCENE} groupSlug={slug} rows={rows} />
    </div>
  );
}
