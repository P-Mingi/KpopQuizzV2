import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { getSceneEntity } from '@/lib/verse/entities';
import { SceneDetail } from '@/components/verse/scene-detail';
import { SCENES } from '@/lib/verse/entity-types';

import type { Metadata } from 'next';

export const revalidate = 3600;
const SCENE = SCENES.ost;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const row = await getSceneEntity(SCENE.kind, Number(id));
  if (!row) return { title: SCENE.singular };
  const title = String(row[SCENE.titleField] ?? SCENE.singular);
  return { title: `${title} - OST`, alternates: { canonical: `https://kpopquiz.org/verse/${slug}/ost/${id}` } };
}

export default async function OstDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<React.ReactElement> {
  const { slug, id } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const row = await getSceneEntity(SCENE.kind, Number(id));
  if (!row || row.group_id !== space.group.id) notFound();
  return <SceneDetail scene={SCENE} groupSlug={slug} row={row} />;
}
