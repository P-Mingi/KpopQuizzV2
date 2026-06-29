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

// ---- mastery (M0.4) ----
//
// TUNING DECISION (flagged for owner confirmation): a group is "mastered" when
// the user has enough KNOWLEDGE plays at high enough accuracy. plays = songs_played
// on player_group_mastery, a GRANULAR count: quiz questions (M0.2 deposit) plus
// blindtest songs for that group, combined. It is NOT a count of games, so
// minPlays = 10 is roughly one full quiz. Raise it (e.g. 30) for a stricter bar.
// Duels are deliberately excluded (M0.2 decision: per-group substrate is KNOWLEDGE
// only). mastered is derived read-time here; the player_group_mastery.mastered
// column stays reserved (no per-action writes).
export const MASTERY = { minPlays: 30, minAccuracy: 0.8 } as const;

export function isMastered(stat: { songs_played: number; songs_correct: number }): boolean {
  if (stat.songs_played < MASTERY.minPlays) return false;
  return stat.songs_correct / stat.songs_played >= MASTERY.minAccuracy;
}

// Near-mastery (M1.2). A group not yet mastered but ONE clear step away:
//  - kind 'plays':    accuracy already at the bar, just needs more reps.
//  - kind 'accuracy': enough reps, accuracy a little short.
// Pure in-memory computation over readPassportGroupStats (NANO-cheap). Personal
// view only; never surfaced publicly. Groups far from the bar are "in progress"
// (not a near-gap); groups with no plays are "untouched" (handled by the caller).
const NEAR_PLAYS_FLOOR = 10;     // enough reps to trust the accuracy signal
const NEAR_ACCURACY_FLOOR = 0.65; // close enough that 80% is a believable next step

export interface MasteryGap {
  group_id: number;
  kind: 'plays' | 'accuracy';
  playsNeeded: number; // 0 for the accuracy kind
  accuracyNow: number; // 0..1
  songsPlayed: number;
}

export function computeNearMastery(stats: PassportGroupStat[]): MasteryGap[] {
  const gaps: MasteryGap[] = [];
  for (const s of stats) {
    if (s.songs_played === 0 || isMastered(s)) continue;
    if (s.accuracy >= MASTERY.minAccuracy && s.songs_played >= NEAR_PLAYS_FLOOR && s.songs_played < MASTERY.minPlays) {
      gaps.push({ group_id: s.group_id, kind: 'plays', playsNeeded: MASTERY.minPlays - s.songs_played, accuracyNow: s.accuracy, songsPlayed: s.songs_played });
    } else if (s.songs_played >= MASTERY.minPlays && s.accuracy >= NEAR_ACCURACY_FLOOR && s.accuracy < MASTERY.minAccuracy) {
      gaps.push({ group_id: s.group_id, kind: 'accuracy', playsNeeded: 0, accuracyNow: s.accuracy, songsPlayed: s.songs_played });
    }
  }
  // Closest win first: fewest plays needed, else smallest accuracy gap.
  gaps.sort((a, b) => {
    const aScore = a.kind === 'plays' ? a.playsNeeded : (MASTERY.minAccuracy - a.accuracyNow) * 100;
    const bScore = b.kind === 'plays' ? b.playsNeeded : (MASTERY.minAccuracy - b.accuracyNow) * 100;
    return aScore - bScore;
  });
  return gaps;
}

// Display order for generations; unknown/extra eras are appended after these.
const ERA_ORDER = ['1st Gen', '2nd Gen', '3rd Gen', '4th Gen', '5th Gen'] as const;

export interface EraProgress {
  era: string;
  mastered: number; // groups the user has mastered in this era
  total: number;    // platform groups in this era
}

// Shape the Phase 1 collection bars (M1.2) will consume. Company progress is
// omitted: groups has no company/agency field (flagged for owner decision).
export interface CollectionProgress {
  groups_mastered: number;
  groups_total: number;
  eras: EraProgress[];
}

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
    .select('group_id, songs_played, songs_correct, best_score, mastery_level')
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
      mastered: isMastered({ songs_played: played, songs_correct: correct }), // read-time
      accuracy: played > 0 ? correct / played : 0,
    };
  });
}

/**
 * Derive the collection/mastery progress for a user (M0.4). Pure computation over
 * two small queries (all groups + this user's mastery rows), bucketed in memory.
 * No scans, no N+1. Company progress is omitted (no company field on groups).
 */
export async function readCollectionProgress(
  supabase: SupabaseClient,
  userId: string,
): Promise<CollectionProgress> {
  const [groupsRes, masteryRes] = await Promise.all([
    supabase.from('groups').select('id, generation'),
    supabase.from('player_group_mastery').select('group_id, songs_played, songs_correct').eq('player_id', userId),
  ]);

  const groups = (groupsRes.data ?? []) as Array<{ id: number; generation: string | null }>;
  const mastery = (masteryRes.data ?? []) as Array<{ group_id: number; songs_played: number; songs_correct: number }>;

  const masteredIds = new Set<number>();
  for (const m of mastery) {
    if (isMastered({ songs_played: m.songs_played ?? 0, songs_correct: m.songs_correct ?? 0 })) {
      masteredIds.add(m.group_id);
    }
  }

  const totalByEra = new Map<string, number>();
  const masteredByEra = new Map<string, number>();
  for (const g of groups) {
    if (!g.generation) continue; // unknown era: counted in groups_total, not bucketed
    totalByEra.set(g.generation, (totalByEra.get(g.generation) ?? 0) + 1);
    if (masteredIds.has(g.id)) {
      masteredByEra.set(g.generation, (masteredByEra.get(g.generation) ?? 0) + 1);
    }
  }

  const orderedEras = [...ERA_ORDER.filter((e) => totalByEra.has(e)), ...[...totalByEra.keys()].filter((e) => !ERA_ORDER.includes(e as typeof ERA_ORDER[number]))];
  const eras: EraProgress[] = orderedEras.map((era) => ({
    era,
    mastered: masteredByEra.get(era) ?? 0,
    total: totalByEra.get(era) ?? 0,
  }));

  return {
    groups_mastered: masteredIds.size,
    groups_total: groups.length,
    eras,
  };
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
