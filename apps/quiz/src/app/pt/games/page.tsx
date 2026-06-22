import { safeFetch } from '@/lib/error-handling';
import { getNameAllGames } from '@/lib/db/queries/games';
import { getRankingsIndex } from '@/lib/db/queries/duels';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { GamesHub } from '@/components/game/games-hub';

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

  const [nameAllGames, totResult, rankings] = await Promise.all([
    safeFetch(getNameAllGames(0, 24), [], '[pt/games] getNameAllGames'),
    safeFetch(
      Promise.resolve(
        supabase
          .from('tot_categories')
          .select('*, tot_items(id, name, color, image_url)')
          .eq('is_published', true)
          .order('play_count', { ascending: false })
          .limit(20),
      ),
      { data: null } as { data: unknown },
      '[pt/games] tot_categories',
    ),
    safeFetch(getRankingsIndex(), [], '[pt/games] getRankingsIndex'),
  ]);

  const totCategories = ((totResult as { data: unknown[] | null }).data ?? []) as Parameters<typeof GamesHub>[0]['totCategories'];

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Jogos de K-pop',
            description: 'Jogos gratis de K-pop: duelos This or That, Nomeie os Membros, blind test e mais.',
            url: 'https://kpopquiz.org/pt/games',
          }),
        }}
      />
      <GamesHub nameAllGames={nameAllGames} totCategories={totCategories} rankings={rankings} />
    </div>
  );
}
