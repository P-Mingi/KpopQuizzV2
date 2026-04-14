import { createServiceRoleClient } from '@/lib/supabase/server';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { GamesHub } from '@/components/game/games-hub';

import type { Metadata } from 'next';
import type { GroupOption } from '@/components/quiz/quiz-filters';
import type { GameCardData } from '@/lib/db/types';

export const metadata: Metadata = {
  title: 'K-pop Games - Name All Members & More | KpopQuiz',
  description: 'Play free K-pop games: name all members of BTS, BLACKPINK, SEVENTEEN and 20+ groups. Blind mode and photo clue mode.',
  alternates: { canonical: '/games' },
};

async function getGamesDirectly(): Promise<GameCardData[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('games')
    .select(`
      id, creator_id, title, slug, game_type, content, matchup_count,
      status, play_count, like_count, report_count, created_at, updated_at,
      groups (name, slug, display_color, text_color, logo_url, fandom_name),
      profiles!games_creator_id_fkey (username, avatar_url, avatar_bg, avatar_text)
    `)
    .eq('game_type', 'name_all_members')
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[games] direct query error:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const groups = row.groups as { name: string; slug: string; display_color: string; text_color: string; logo_url: string | null; fandom_name: string } | null;
    const profiles = row.profiles as { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string } | null;
    return {
      id: row.id as string,
      title: row.title as string,
      slug: row.slug as string,
      game_type: row.game_type as string,
      content: row.content,
      matchup_count: row.matchup_count as number,
      play_count: row.play_count as number,
      like_count: row.like_count as number,
      created_at: row.created_at as string,
      group_name: groups?.name ?? null,
      group_slug: groups?.slug ?? null,
      display_color: groups?.display_color ?? null,
      text_color: groups?.text_color ?? null,
      logo_url: groups?.logo_url ?? null,
      creator_username: profiles?.username ?? 'unknown',
      creator_avatar_url: profiles?.avatar_url ?? null,
      creator_avatar_bg: profiles?.avatar_bg ?? '#EEEDFE',
      creator_avatar_text: profiles?.avatar_text ?? '#3C3489',
    } as GameCardData;
  });
}

export default async function GamesPage(): Promise<React.ReactElement> {
  const [games, groups] = await Promise.all([
    getGamesDirectly(),
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
