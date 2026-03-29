import { createServerClient } from '@/lib/supabase/server';

import type { Profile, TopCreator } from '@/lib/db/types';

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data as Profile;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data as Profile;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error) throw new Error(`Failed to check username: ${error.message}`);
  return data === null;
}

export async function getTopCreatorsThisWeek(limit: number): Promise<TopCreator[]> {
  const supabase = await createServerClient();

  // Use RPC or raw query for complex aggregation
  // Since Supabase JS client doesn't support FILTER (WHERE ...) in aggregates,
  // we use a simpler approach: get creators with recent quizzes
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('quizzes')
    .select('creator_id, play_count, profiles!inner (username, avatar_url, avatar_bg, avatar_text, total_quizzes_created)')
    .eq('status', 'published')
    .gte('created_at', sevenDaysAgo);

  if (error) throw new Error(`Failed to fetch top creators: ${error.message}`);

  // Aggregate in JS
  const creatorMap = new Map<string, TopCreator>();

  for (const row of data as unknown as Array<{
    creator_id: string;
    play_count: number;
    profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string; total_quizzes_created: number };
  }>) {
    const existing = creatorMap.get(row.creator_id);
    if (existing) {
      existing.weekly_plays += row.play_count;
    } else {
      creatorMap.set(row.creator_id, {
        username: row.profiles.username,
        avatar_url: row.profiles.avatar_url,
        avatar_bg: row.profiles.avatar_bg,
        avatar_text: row.profiles.avatar_text,
        total_quizzes_created: row.profiles.total_quizzes_created,
        weekly_plays: row.play_count,
      });
    }
  }

  return Array.from(creatorMap.values())
    .sort((a, b) => b.weekly_plays - a.weekly_plays)
    .slice(0, limit);
}
