import { getAllGamesForHub } from '@/lib/db/queries/games';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { GamesHub } from '@/components/game/games-hub';

import type { Metadata } from 'next';
import type { GroupOption } from '@/components/quiz/quiz-filters';

export const metadata: Metadata = {
  title: 'K-pop Games - Name All Members & More | KpopQuiz',
  description: 'Play free K-pop games: name all members, blind tests, and more. Challenge your knowledge of BTS, BLACKPINK, Stray Kids, aespa and 30+ groups.',
  alternates: { canonical: '/games' },
};

export const revalidate = 60;

export default async function GamesPage(): Promise<React.ReactElement> {
  const [games, groups] = await Promise.all([
    safeFetch(getAllGamesForHub(0, 50), [], '[games] getAllGamesForHub'),
    safeFetch(getAllGroups(), [], '[games] getAllGroups'),
  ]);

  const groupsForFilter: GroupOption[] = groups
    .filter((g) => g.quiz_count > 0)
    .slice(0, 30)
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      quiz_count: g.quiz_count,
    }));

  return (
    <div className="py-6">
      <GamesHub initialGames={games} groups={groupsForFilter} />
    </div>
  );
}
