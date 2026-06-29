import { createPublicReadClient } from '@/lib/supabase/server';

import type { PersonCardData } from '@/components/profile/person-card';

// Community hub data (Workstream M, M1.21). All public reads via the cookie-free
// client so /leaderboard stays static/ISR. NANO-cheap: the rising signal is one
// index-backed aggregate + one profiles IN read; the rest are small reads.

const PROFILE_COLS = 'id, username, display_name, avatar_url, avatar_bg, avatar_text, xp, follower_count';

interface ProfileRow {
  id: string; username: string; display_name: string | null;
  avatar_url: string | null; avatar_bg: string; avatar_text: string;
  xp: number; follower_count: number;
}

function toPerson(p: ProfileRow): PersonCardData {
  return {
    username: p.username, displayName: p.display_name,
    avatarUrl: p.avatar_url, avatarBg: p.avatar_bg, avatarText: p.avatar_text,
    xp: p.xp ?? 0, followerCount: p.follower_count ?? 0,
  };
}

// Rising creators: most new followers in the last 7 days (mig 097 aggregate over
// the follows(followed_id, created_at) index), hydrated with one IN read.
export async function getRisingCreators(limit = 8): Promise<Array<{ person: PersonCardData; newFollowers: number }>> {
  const db = createPublicReadClient();
  const { data: agg } = await db.rpc('get_rising_creators', { p_days: 7, p_limit: limit });
  const rows = (agg ?? []) as Array<{ followed_id: string; new_followers: number }>;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.followed_id);
  const { data: profs } = await db.from('profiles').select(PROFILE_COLS).in('id', ids);
  const byId = new Map(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  return rows
    .map((r) => { const p = byId.get(r.followed_id); return p ? { person: toPerson(p), newFollowers: Number(r.new_followers) } : null; })
    .filter((x): x is { person: PersonCardData; newFollowers: number } => x !== null);
}

// Active fans of a group: by per-group plays in player_group_mastery (cheap,
// group-filtered), hydrated with one IN read. Accuracy is shown, not a rank.
export async function getActiveFansByGroup(groupSlug: string, limit = 8): Promise<Array<{ person: PersonCardData; accuracy: number }>> {
  const db = createPublicReadClient();
  const { data: g } = await db.from('groups').select('id').eq('slug', groupSlug).maybeSingle();
  if (!g) return [];

  const { data: mastery } = await db
    .from('player_group_mastery')
    .select('player_id, songs_played, songs_correct')
    .eq('group_id', (g as { id: number }).id)
    .gt('songs_played', 0)
    .order('songs_played', { ascending: false })
    .limit(limit);
  const rows = (mastery ?? []) as Array<{ player_id: string; songs_played: number; songs_correct: number }>;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.player_id);
  const { data: profs } = await db.from('profiles').select(PROFILE_COLS).in('id', ids);
  const byId = new Map(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  return rows
    .map((r) => {
      const p = byId.get(r.player_id);
      if (!p) return null;
      const acc = r.songs_played > 0 ? r.songs_correct / r.songs_played : 0;
      return { person: toPerson(p), accuracy: acc };
    })
    .filter((x): x is { person: PersonCardData; accuracy: number } => x !== null);
}

// Per-quiz hall of fame (M1.19): top scorers for ONE quiz, best per player,
// highest score then fastest time. Index-backed by idx_plays_quiz_score (mig 098).
// Anonymous scorers (no player_id) surface as person=null ("someone", no link).
export interface HallOfFameEntry { person: PersonCardData | null; score: number; total: number; timeSeconds: number | null }

interface PlayRow {
  score: number; total_questions: number; time_taken_seconds: number | null; player_id: string | null;
  profiles: { username: string; display_name: string | null; avatar_url: string | null; avatar_bg: string; avatar_text: string; xp: number; follower_count: number } | null;
}

export async function getQuizHallOfFame(quizId: string, limit = 10): Promise<HallOfFameEntry[]> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('plays')
    .select('score, total_questions, time_taken_seconds, player_id, profiles(username, display_name, avatar_url, avatar_bg, avatar_text, xp, follower_count)')
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .order('time_taken_seconds', { ascending: true, nullsFirst: false })
    .limit(40);

  const rows = (data ?? []) as unknown as PlayRow[];
  const seenPlayers = new Set<string>();
  const out: HallOfFameEntry[] = [];
  for (const r of rows) {
    if (r.player_id) {
      if (seenPlayers.has(r.player_id)) continue; // best per player (rows are score-desc)
      seenPlayers.add(r.player_id);
    }
    const p = r.profiles;
    out.push({
      person: p ? { username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url, avatarBg: p.avatar_bg, avatarText: p.avatar_text, xp: p.xp ?? 0, followerCount: p.follower_count ?? 0 } : null,
      score: r.score,
      total: r.total_questions,
      timeSeconds: r.time_taken_seconds,
    });
    if (out.length >= limit) break;
  }
  return out;
}

// Collective stats from the small groups table (one read, ~tens of rows). Cheap.
export async function getCommunityStats(): Promise<{ totalPlays: number; totalQuizzes: number; groups: number }> {
  const db = createPublicReadClient();
  const { data } = await db.from('groups').select('total_plays, quiz_count');
  const rows = (data ?? []) as Array<{ total_plays: number; quiz_count: number }>;
  return {
    totalPlays: rows.reduce((s, r) => s + (r.total_plays ?? 0), 0),
    totalQuizzes: rows.reduce((s, r) => s + (r.quiz_count ?? 0), 0),
    groups: rows.length,
  };
}
