import { createServiceRoleClient } from '@/lib/supabase/server';
import { getNameAllGames } from '@/lib/db/queries/games';
import { getRankingsIndex } from '@/lib/db/queries/duels';
import { safeFetch } from '@/lib/error-handling';
import { GamesHub } from '@/components/game/games-hub';
import { PersonalityHubSection } from '@/components/personality/personality-entry';
import { getPersonalityGroupTiles } from '@/lib/personality/data';
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
  title: 'K-pop Games - This or That, Name All Members & More | KpopQuiz',
  description: 'Play free K-pop games: pick your bias in idol tournaments, name all group members before time runs out. BTS, BLACKPINK, SEVENTEEN + 20 groups.',
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
    description: 'This or That, Name All Members, blind tests and more. Free K-pop games for every fan.',
    url: '/games',
    images: [{ url: '/api/og/page?title=K-pop+Games&subtitle=This+or+That%2C+Name+All+Members%2C+blind+tests+and+more.&accent=%23f59e0b', width: 1200, height: 630, alt: 'K-pop Games on KpopQuiz' }],
  },
  twitter: { card: 'summary_large_image' },
};

export default async function GamesPage() {
  const supabase = createServiceRoleClient();

  const [nameAllGames, totResult, rankings, personalityTiles] = await Promise.all([
    safeFetch(getNameAllGames(0, 24), [], '[games] getNameAllGames'),
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
      '[games] tot_categories',
    ),
    safeFetch(getRankingsIndex(), [], '[games] getRankingsIndex'),
    safeFetch(getPersonalityGroupTiles(), [], '[games] getPersonalityGroupTiles'),
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
            name: 'K-pop Games',
            description: 'Free K-pop games: This or That matchups, Name All Members challenges, blind tests, and more.',
            url: 'https://kpopquiz.org/games',
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'K-pop Blind Test', url: 'https://kpopquiz.org/blindtest' },
                { '@type': 'ListItem', position: 2, name: 'This or That', url: 'https://kpopquiz.org/games/this-or-that' },
                { '@type': 'ListItem', position: 3, name: 'Name All Members', url: 'https://kpopquiz.org/games/name-all' },
              ],
            },
          }),
        }}
      />
      <GamesHub nameAllGames={nameAllGames} totCategories={totCategories} rankings={rankings} />
      <div className="games-hub"><PersonalityHubSection tiles={personalityTiles} /></div>
    </div>
  );
}
