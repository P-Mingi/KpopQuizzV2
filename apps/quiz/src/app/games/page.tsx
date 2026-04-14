import { createServiceRoleClient } from '@/lib/supabase/server';
import { getNameAllGames } from '@/lib/db/queries/games';
import { safeFetch } from '@/lib/error-handling';
import { GamesHub } from '@/components/game/games-hub';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'K-pop Games - This or That, Name All Members & More | KpopQuiz',
  description: 'Play free K-pop games: pick your bias in idol tournaments, name all group members before time runs out. BTS, BLACKPINK, SEVENTEEN + 20 groups.',
  alternates: { canonical: '/games' },
};

export default async function GamesPage() {
  const supabase = createServiceRoleClient();

  const [nameAllGames, totResult] = await Promise.all([
    safeFetch(getNameAllGames(0, 24), [], '[games] getNameAllGames'),
    supabase
      .from('tot_categories')
      .select('*, tot_items(id, name, color, image_url)')
      .eq('is_published', true)
      .order('play_count', { ascending: false })
      .limit(20),
  ]);

  const totCategories = totResult.data ?? [];

  return (
    <div className="pb-24">
      <GamesHub nameAllGames={nameAllGames} totCategories={totCategories} />
    </div>
  );
}
