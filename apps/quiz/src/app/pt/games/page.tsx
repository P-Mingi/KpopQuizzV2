import { safeFetch } from '@/lib/error-handling';
import { getRankingsIndex } from '@/lib/db/queries/duels';
import { getPersonalityGroups } from '@/lib/personality/data';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { GamesHub } from '@/components/game/games-hub';
import { SORT_IT_PLAYLISTS } from '@/lib/games/sort-it';
import { MATCH_UP_PLAYLISTS } from '@/lib/games/match-up';
import { NAME_THEM_ALL_PLAYLISTS } from '@/lib/games/name-them-all';
import { pickDaily } from '@/lib/games/daily-rotation';

import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Jogos de K-pop Gratis - This or That, Membros e Mais | KpopQuiz',
  description:
    'Jogue jogos gratis de K-pop: escolha seu bias em duelos de idols, nomeie todos os membros antes do tempo acabar, jogue blind test. BTS, BLACKPINK, SEVENTEEN e mais.',
  alternates: {
    canonical: '/pt/games',
    languages: {
      en: '/games',
      'pt-BR': '/pt/games',
      'x-default': '/games',
    },
  },
  openGraph: {
    title: 'Jogos de K-pop | KpopQuiz',
    description: 'This or That, Nomeie os Membros, blind test e mais. Jogos gratis de K-pop.',
    url: '/pt/games',
    locale: 'pt_BR',
  },
};

export default async function PtGamesPage() {
  const supabase = createServiceRoleClient();

  const [rankings, personalityGroups, songCount, nameAllCount] = await Promise.all([
    safeFetch(getRankingsIndex(), [], '[pt/games] getRankingsIndex'),
    safeFetch(getPersonalityGroups(), [], '[pt/games] getPersonalityGroups'),
    safeFetch(Promise.resolve(supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'active')).then((r) => r.count ?? 0), 0, '[pt/games] songCount'),
    safeFetch(Promise.resolve(supabase.from('games').select('id', { count: 'exact', head: true }).eq('game_type', 'name_all_members')).then((r) => r.count ?? 0), 0, '[pt/games] nameAllCount'),
  ]);

  const counts = {
    personality: personalityGroups.length, songs: songCount, categories: rankings.length,
    nameAll: nameAllCount, nameThemAll: NAME_THEM_ALL_PLAYLISTS.length,
    sortIt: SORT_IT_PLAYLISTS.length, matchUp: MATCH_UP_PLAYLISTS.length,
  };
  const publicRankings = rankings
    .filter((r) => r.public)
    .sort((a, b) => b.total_votes - a.total_votes || `${a.group_slug}:${a.question_type}`.localeCompare(`${b.group_slug}:${b.question_type}`));
  const liveRanking = pickDaily(publicRankings);

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Jogos de K-pop',
            description: 'Jogos gratis de K-pop: quiz de personalidade, blind test, duelos This or That e Nomeie os Membros.',
            url: 'https://kpopquiz.org/pt/games',
          }),
        }}
      />
      <GamesHub counts={counts} liveRanking={liveRanking} />
    </div>
  );
}
