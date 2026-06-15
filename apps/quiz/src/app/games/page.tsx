import { createServiceRoleClient } from '@/lib/supabase/server';
import { getNameAllGames } from '@/lib/db/queries/games';
import { getRankingsIndex } from '@/lib/db/queries/duels';
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
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'K-pop Games - This or That, Name All Members & More | KpopQuiz',
  description: 'Play free K-pop games: pick your bias in idol tournaments, name all group members before time runs out. BTS, BLACKPINK, SEVENTEEN + 20 groups.',
  alternates: { canonical: '/games' },
};

export default async function GamesPage() {
  const supabase = createServiceRoleClient();

  const [nameAllGames, totResult, rankings] = await Promise.all([
    safeFetch(getNameAllGames(0, 24), [], '[games] getNameAllGames'),
    supabase
      .from('tot_categories')
      .select('*, tot_items(id, name, color, image_url)')
      .eq('is_published', true)
      .order('play_count', { ascending: false })
      .limit(20),
    safeFetch(getRankingsIndex(), [], '[games] getRankingsIndex'),
  ]);

  const totCategories = totResult.data ?? [];

  return (
    <div className="pb-24">
      <GamesHub nameAllGames={nameAllGames} totCategories={totCategories} rankings={rankings} />
    </div>
  );
}
