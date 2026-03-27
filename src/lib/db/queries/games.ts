import { createServerClient } from '@/lib/supabase/server';

import type { GameCardData, GameWithGroup } from '@/lib/db/types';

const GAME_SELECT = `
  id, creator_id, title, slug, game_type, content, matchup_count,
  status, play_count, like_count, report_count, created_at, updated_at,
  groups (name, slug, display_color, text_color, logo_url, fandom_name),
  profiles!games_creator_id_fkey (username, avatar_url, avatar_bg, avatar_text)
`;

interface GameRow {
  id: string;
  creator_id: string;
  group_id: number | null;
  title: string;
  slug: string;
  game_type: string;
  content: unknown;
  matchup_count: number;
  status: string;
  play_count: number;
  like_count: number;
  report_count: number;
  created_at: string;
  updated_at: string;
  groups: { name: string; slug: string; display_color: string; text_color: string; logo_url: string | null; fandom_name: string } | null;
  profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string } | null;
}

function toGameWithGroup(row: GameRow): GameWithGroup {
  return {
    id: row.id,
    creator_id: row.creator_id,
    group_id: row.group_id,
    title: row.title,
    slug: row.slug,
    game_type: row.game_type as GameWithGroup['game_type'],
    content: row.content as GameWithGroup['content'],
    matchup_count: row.matchup_count,
    status: row.status as GameWithGroup['status'],
    play_count: row.play_count,
    like_count: row.like_count,
    report_count: row.report_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    group_name: row.groups?.name ?? null,
    group_slug: row.groups?.slug ?? null,
    display_color: row.groups?.display_color ?? null,
    text_color: row.groups?.text_color ?? null,
    logo_url: row.groups?.logo_url ?? null,
    fandom_name: row.groups?.fandom_name ?? null,
    creator_username: row.profiles?.username ?? '',
    creator_avatar_url: row.profiles?.avatar_url ?? null,
    creator_avatar_bg: row.profiles?.avatar_bg ?? '#F1EFE8',
    creator_avatar_text: row.profiles?.avatar_text ?? '#5F5E5A',
  };
}

function toGameCardData(row: GameRow): GameCardData {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    game_type: row.game_type as GameCardData['game_type'],
    content: row.content as GameCardData['content'],
    matchup_count: row.matchup_count,
    play_count: row.play_count,
    like_count: row.like_count,
    created_at: row.created_at,
    group_name: row.groups?.name ?? null,
    group_slug: row.groups?.slug ?? null,
    display_color: row.groups?.display_color ?? null,
    text_color: row.groups?.text_color ?? null,
    logo_url: row.groups?.logo_url ?? null,
    creator_username: row.profiles?.username ?? '',
    creator_avatar_url: row.profiles?.avatar_url ?? null,
    creator_avatar_bg: row.profiles?.avatar_bg ?? '#F1EFE8',
    creator_avatar_text: row.profiles?.avatar_text ?? '#5F5E5A',
  };
}

export async function getGameBySlug(slug: string): Promise<GameWithGroup | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('games')
    .select(GAME_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch game: ${error.message}`);
  }

  return toGameWithGroup(data as unknown as GameRow);
}

export async function getPopularGames(offset: number, limit: number, gameType?: string): Promise<GameCardData[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from('games')
    .select(GAME_SELECT)
    .eq('status', 'published');
  if (gameType) query = query.eq('game_type', gameType);
  const { data, error } = await query
    .order('play_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return (data as unknown as GameRow[]).map(toGameCardData);
}

export async function getRecentGames(offset: number, limit: number): Promise<GameCardData[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('games')
    .select(GAME_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return (data as unknown as GameRow[]).map(toGameCardData);
}

export async function getGamesByCreator(creatorId: string, offset: number, limit: number): Promise<GameCardData[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('games')
    .select(GAME_SELECT)
    .eq('creator_id', creatorId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch games: ${error.message}`);
  return (data as unknown as GameRow[]).map(toGameCardData);
}

export async function getAdminBlindTests(): Promise<GameCardData[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('games')
    .select(GAME_SELECT)
    .eq('game_type', 'blind_test')
    .in('status', ['published', 'draft'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch blind tests: ${error.message}`);
  return (data as unknown as GameRow[]).map(toGameCardData);
}
