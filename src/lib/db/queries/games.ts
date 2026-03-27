import { createServerClient } from '@/lib/supabase/server';

import type { GameCardData } from '@/lib/db/types';

const GAME_CARD_SELECT = `
  id, title, slug, game_type, play_count, like_count, matchup_count, content, created_at,
  groups (name, slug, display_color, text_color, logo_url),
  profiles!games_creator_id_fkey (username, avatar_url, avatar_bg, avatar_text)
`;

interface RawGameRow {
  id: string;
  title: string;
  slug: string;
  game_type: string;
  play_count: number;
  like_count: number;
  matchup_count: number;
  content: import('@/lib/db/types').GameContent;
  created_at: string;
  groups: { name: string; slug: string; display_color: string; text_color: string; logo_url: string | null } | null;
  profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };
}

function toGameCardData(row: RawGameRow): GameCardData {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    game_type: row.game_type as GameCardData['game_type'],
    play_count: row.play_count,
    like_count: row.like_count,
    matchup_count: row.matchup_count,
    content: row.content,
    created_at: row.created_at,
    group_name: row.groups?.name ?? null,
    group_slug: row.groups?.slug ?? null,
    display_color: row.groups?.display_color ?? null,
    text_color: row.groups?.text_color ?? null,
    logo_url: row.groups?.logo_url ?? null,
    creator_username: row.profiles.username,
    creator_avatar_url: row.profiles.avatar_url,
    creator_avatar_bg: row.profiles.avatar_bg,
    creator_avatar_text: row.profiles.avatar_text,
  };
}

export async function getGameBySlug(slug: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      groups (name, slug, display_color, text_color, logo_url, fandom_name),
      profiles!games_creator_id_fkey (username, avatar_url, avatar_bg, avatar_text)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch game: ${error.message}`);
  }

  return data;
}

export async function getRecentGames(offset: number, limit: number): Promise<GameCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('games')
    .select(GAME_CARD_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return (data as unknown as RawGameRow[]).map(toGameCardData);
}

export async function getPopularGames(offset: number, limit: number): Promise<GameCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('games')
    .select(GAME_CARD_SELECT)
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return (data as unknown as RawGameRow[]).map(toGameCardData);
}

export async function getGamesByCreator(creatorId: string, offset: number, limit: number): Promise<GameCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('games')
    .select(GAME_CARD_SELECT)
    .eq('status', 'published')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch creator games: ${error.message}`);
  return (data as unknown as RawGameRow[]).map(toGameCardData);
}
