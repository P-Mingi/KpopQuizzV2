import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getScene } from '@/lib/verse/entities';
import { SceneList } from '@/components/verse/scene-list';
import { SCENES } from '@/lib/verse/entity-types';

import type { Metadata } from 'next';

export const revalidate = 3600;
const SCENE = SCENES.ost;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: SCENE.label };
  return {
    title: `${space.group.name} OST and soundtrack credits`,
    description: `Soundtrack songs and OST credits by ${space.group.name}, with sources.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/ost` },
  };
}

export default async function OstPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const rows = await getScene(SCENE.kind, space.group.id);
  return (
    <div>
      <p className="mb-4 text-xs text-tertiary">Soundtrack and OST credits, fan-run and sourced.</p>
      <SceneList scene={SCENE} groupSlug={slug} rows={rows} />
    </div>
  );
}
