import type { SupabaseClient } from '@supabase/supabase-js';

// K-pop Passport - typed accessor for the spine (Workstream M, step M0.1).
//
// Pure data layer: read + update helpers over the existing profiles spine and
// the existing player_group_mastery per group store. There are NO write-hooks
// into the play / vote / battle RPCs here (that is M0.2) and NO UI.
//
// The passport extends what already exists; it is not a parallel record:
//   - account totals + identity live on profiles
//   - per group stats live on player_group_mastery (player_id == profiles.id,
//     both reference auth.users(id) one to one)

// ---- spine shapes ----

// Counters added in migration 086 plus the reused totals already on profiles.
export interface PassportSpine {
  // reused (pre-086)
  xp: number;
  total_quizzes_created: number;
  total_plays_received: number;
  total_likes_received: number;
  // added in 086
  quizzes_played: number;
  blindtests_played: number;
  duels_voted: number;
  battles_played: number;
  battles_won: number;
  // identity (added in 086)
  ult_groups: string[];
  bias: string | null;
  profile_theme: string;
  // canonical streak = the daily-ritual streak (profiles.daily_streak, mig 076).
  // The blindtest streak (players.current_streak/longest_streak, mig 020) is a
  // blindtest-internal stat and is deliberately NOT surfaced here.
  streak_current: number;       // effective: 0 if the last active day is stale
  streak_longest: number;       // all-time best (mig 088)
  streak_last_active: string | null; // last_daily_date (UTC yyyy-mm-dd)
}

export interface PassportGroupStat {
  group_id: number;
  songs_played: number;
  songs_correct: number;
  best_score: number;
  mastery_level: number;
  mastered: boolean;
  accuracy: number; // derived: songs_correct / songs_played (0 when no plays)
}

// Numeric counters that an M0.2 write-hook may bump. Identity fields are set via
// updatePassportIdentity, not here.
export type PassportCounter =
  | 'quizzes_played'
  | 'blindtests_played'
  | 'duels_voted'
  | 'battles_played'
  | 'battles_won';

const SPINE_COLUMNS =
  'xp, total_quizzes_created, total_plays_received, total_likes_received, ' +
  'quizzes_played, blindtests_played, duels_voted, battles_played, battles_won, ' +
  'ult_groups, bias, profile_theme, ' +
  'daily_streak, daily_streak_longest, last_daily_date';

// A daily streak is "live" only while the last active day is today or yesterday
// (UTC). The engine resets lazily on the next play, so a stored streak can be
// stale; the passport surfaces the honest current value.
function effectiveStreak(stored: number, lastActive: string | null): number {
  if (!lastActive) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(today + 'T00:00:00Z');
  y.setUTCDate(y.getUTCDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);
  return lastActive === today || lastActive === yesterday ? stored : 0;
}

// ---- reads ----

/** Read the full passport spine for a user. Returns null if no profile row. */
export async function readPassportSpine(
  supabase: SupabaseClient,
  userId: string,
): Promise<PassportSpine | null> {
  const { data } = await supabase
    .from('profiles')
    .select(SPINE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as Record<string, unknown>;
  return {
    xp: (r.xp as number) ?? 0,
    total_quizzes_created: (r.total_quizzes_created as number) ?? 0,
    total_plays_received: (r.total_plays_received as number) ?? 0,
    total_likes_received: (r.total_likes_received as number) ?? 0,
    quizzes_played: (r.quizzes_played as number) ?? 0,
    blindtests_played: (r.blindtests_played as number) ?? 0,
    duels_voted: (r.duels_voted as number) ?? 0,
    battles_played: (r.battles_played as number) ?? 0,
    battles_won: (r.battles_won as number) ?? 0,
    ult_groups: (r.ult_groups as string[]) ?? [],
    bias: (r.bias as string | null) ?? null,
    profile_theme: (r.profile_theme as string) ?? 'default',
    streak_current: effectiveStreak((r.daily_streak as number) ?? 0, (r.last_daily_date as string | null) ?? null),
    streak_longest: (r.daily_streak_longest as number) ?? 0,
    streak_last_active: (r.last_daily_date as string | null) ?? null,
  };
}

/** Read per group stats for a user from the existing player_group_mastery store. */
export async function readPassportGroupStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<PassportGroupStat[]> {
  const { data } = await supabase
    .from('player_group_mastery')
    .select('group_id, songs_played, songs_correct, best_score, mastery_level, mastered')
    .eq('player_id', userId);
  if (!data) return [];
  return (data as Array<Record<string, unknown>>).map((r) => {
    const played = (r.songs_played as number) ?? 0;
    const correct = (r.songs_correct as number) ?? 0;
    return {
      group_id: r.group_id as number,
      songs_played: played,
      songs_correct: correct,
      best_score: (r.best_score as number) ?? 0,
      mastery_level: (r.mastery_level as number) ?? 1,
      mastered: (r.mastered as boolean) ?? false,
      accuracy: played > 0 ? correct / played : 0,
    };
  });
}

// ---- updates (no triggers, no RPC hooks; callers pass a write capable client) ----

/**
 * Atomically increment one passport counter by a delta (default 1).
 * Uses the increment_passport_counter RPC (added in M0.2) when present, else a
 * read then write fallback so the accessor is usable from M0.1 onward.
 */
export async function bumpPassportCounter(
  supabase: SupabaseClient,
  userId: string,
  counter: PassportCounter,
  delta = 1,
): Promise<void> {
  const { error } = await supabase.rpc('increment_passport_counter', {
    p_user_id: userId,
    p_counter: counter,
    p_delta: delta,
  });
  if (!error) return;
  // Fallback until the M0.2 RPC exists.
  const { data } = await supabase.from('profiles').select(counter).eq('id', userId).maybeSingle();
  const current = ((data as Record<string, number> | null)?.[counter]) ?? 0;
  await supabase.from('profiles').update({ [counter]: current + delta }).eq('id', userId);
}

/** Set identity fields (ult_groups / bias / profile_theme). Phase 1 writer. */
export async function updatePassportIdentity(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<Pick<PassportSpine, 'ult_groups' | 'bias' | 'profile_theme'>>,
): Promise<void> {
  await supabase.from('profiles').update(patch).eq('id', userId);
}
