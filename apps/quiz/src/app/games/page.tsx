import { createServiceRoleClient } from '@/lib/supabase/server';
import { getRankingsIndex } from '@/lib/db/queries/duels';
import { getGameOfTheDay } from '@/lib/db/queries/game-of-the-day';
import { getPersonalityGroups } from '@/lib/personality/data';
import { safeFetch } from '@/lib/error-handling';
import { GamesHub } from '@/components/game/games-hub';
import type { Metadata } from 'next';

// ISR: revalidate hourly (SEO Fix 1). This page already server-renders all game
// cards as crawlable HTML; the shared cookie-reading <TopNav> keeps it dynamic
// (SSR) today, so the window stays dormant until the nav is made cookie-free.
export const revalidate = 3600;
// Force dynamic to skip build-time prerender: this page calls
// createServiceRoleClient() at request time, and Vercel's build environment
// doesn't expose NEXT_PUBLIC_SUPABASE_URL during static prerender. SSR keeps
// it crawlable + the revalidate window above still applies at runtime.

export const metadata: Metadata = {
  title: 'K-pop Games - Personality Quizzes, Blind Test & More | KpopQuiz',
  description: 'Play free K-pop games: find out which member you are, guess songs from a clip, pick sides in fan matchups, and name every member before the timer runs out.',
  alternates: {
    canonical: '/games',
    languages: {
      en: '/games',
      'pt-BR': '/pt/games',
      'x-default': '/games',
    },
  },
  openGraph: {
    title: 'K-pop Games | KpopQuiz',
    description: 'Personality quizzes, blind tests, fan matchups, and name-all challenges. Free K-pop games for every fan.',
    url: '/games',
    images: [{ url: '/api/og/page?title=K-pop+Games&subtitle=This+or+That%2C+Name+All+Members%2C+blind+tests+and+more.&accent=%23f59e0b', width: 1200, height: 630, alt: 'K-pop Games on KpopQuiz' }],
  },
  twitter: { card: 'summary_large_image' },
};

export default async function GamesPage() {
  const supabase = createServiceRoleClient();

  // Lean picker: only the counts + the daily + one live ranking. The exhaustive
  // catalogs (20+ categories, 24 rosters) now live on their own index pages.
  const [gotd, rankings, personalityGroups, songCount, nameAllCount] = await Promise.all([
    safeFetch(getGameOfTheDay(), null, '[games] getGameOfTheDay'),
    safeFetch(getRankingsIndex(), [], '[games] getRankingsIndex'),
    safeFetch(getPersonalityGroups(), [], '[games] getPersonalityGroups'),
    safeFetch(
      Promise.resolve(supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'active')).then((r) => r.count ?? 0),
      0, '[games] songCount',
    ),
    safeFetch(
      Promise.resolve(supabase.from('games').select('id', { count: 'exact', head: true }).eq('game_type', 'name_all_members')).then((r) => r.count ?? 0),
      0, '[games] nameAllCount',
    ),
  ]);

  const counts = {
    personality: personalityGroups.length,
    songs: songCount,
    categories: rankings.length,
    nameAll: nameAllCount,
  };
  // One teaser: the live (public) ranking with the most votes; none if nothing is live yet.
  const liveRanking = rankings.filter((r) => r.public).sort((a, b) => b.total_votes - a.total_votes)[0] ?? null;

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'K-pop Games',
            description: 'Free K-pop games: personality quizzes, blind tests, This or That matchups, and Name All Members challenges.',
            url: 'https://kpopquiz.org/games',
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Which K-pop Member Are You?', url: 'https://kpopquiz.org/personality' },
                { '@type': 'ListItem', position: 2, name: 'K-pop Blind Test', url: 'https://kpopquiz.org/blindtest' },
                { '@type': 'ListItem', position: 3, name: 'This or That', url: 'https://kpopquiz.org/games/this-or-that/all' },
                { '@type': 'ListItem', position: 4, name: 'Name All Members', url: 'https://kpopquiz.org/games/name-all' },
                ...(liveRanking ? [{ '@type': 'ListItem', position: 5, name: 'K-pop Fan Rankings', url: 'https://kpopquiz.org/rankings' }] : []),
              ],
            },
          }),
        }}
      />
      <GamesHub gotd={gotd} counts={counts} liveRanking={liveRanking} />
    </div>
  );
}
