import { getNameAllGames } from '@/lib/db/queries/games';
import { getTotCategories } from '@/lib/db/queries/this-or-that';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { GamesHub } from '@/components/game/games-hub';

import type { Metadata } from 'next';
import type { GroupOption } from '@/components/quiz/quiz-filters';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'K-pop Games - Name All Members, This or That & More | KpopQuiz',
  description: 'Play free K-pop games: name all members, this-or-that tournaments, and more. BTS, BLACKPINK, SEVENTEEN and 20+ groups.',
  alternates: { canonical: '/games' },
};

export default async function GamesPage(): Promise<React.ReactElement> {
  const [games, totCategories, groups] = await Promise.all([
    safeFetch(getNameAllGames(0, 50), [], '[games] getNameAllGames'),
    safeFetch(getTotCategories(), [], '[games] getTotCategories'),
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
      <GamesHub initialGames={games} totCategories={totCategories} groups={groupsForFilter} />
    </div>
  );
}
