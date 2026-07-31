import { notFound } from 'next/navigation';

import { getSpace } from '@/lib/verse/space';
import { computeQuests } from '@/lib/verse/quests';
import { QuestBoard } from '@/components/verse/quest-board';
import { QuestGate } from '@/components/verse/quest-gate';

import type { Metadata } from 'next';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) return { title: 'Quests' };
  return {
    title: `Help build the ${space.group.name} space`,
    description: `Open ways to help write ${space.group.name}'s story on Verse: era stories, member lore and more, with contributor XP.`,
    // V4 SEO invariant: builder surfaces were never SEO content.
    robots: { index: false, follow: true },
    alternates: { canonical: `https://kpopquiz.org/verse/${slug}/quests` },
  };
}

export default async function QuestsPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactElement> {
  const { slug } = await params;
  const space = await getSpace(slug);
  if (!space) notFound();
  const board = await computeQuests(space.group.id, slug, space.group.name);

  // Members-only board (locked Q1): the join pitch bakes; the board is the
  // client-side member upgrade inside QuestGate.
  return (
    <QuestGate groupId={space.group.id} groupSlug={slug} groupName={space.group.name} fandomName={space.group.fandom_name}
      board={<QuestBoard quests={board.quests} coveragePct={board.coveragePct} groupId={space.group.id} groupName={space.group.name} />} />
  );
}
