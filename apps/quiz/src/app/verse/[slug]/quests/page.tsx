import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { computeQuests } from '@/lib/verse/quests';
import { QuestBoard } from '@/components/verse/quest-board';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return {
    robots: { index: false, follow: true }, title: 'Quests' };
  return {
    title: `Help build the ${space.group.name} space`,
    description: `Open ways to help write ${space.group.name}'s story on Verse: era stories, member lore and more, with contributor XP.`,
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/quests` },
  };
}

export default async function QuestsPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const board = await computeQuests(space.group.id, slug, space.group.name);

  return <QuestBoard quests={board.quests} coveragePct={board.coveragePct} groupId={space.group.id} groupName={space.group.name} />;
}
