import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db/fetch-all';

import type { SupabaseClient } from '@supabase/supabase-js';

// W2b PART C - the time-shifted supply, counted honestly.
//
// An OPEN run is a battle a real person created and finished, that nobody else has
// beaten or attempted yet. They are the answer to "we need more opponents": the
// opponents already exist, they were just invisible.
//
// COVENANT: this module only ever COUNTS real rows. It never invents a run, never
// rounds up, never applies a floor, and never returns a "minimum interesting"
// number. If a group has zero open runs the caller renders nothing.
//
// C1-FIX (the bug this file shipped with): a battle can be linked to a group TWO
// ways. `battles.group_slug` is set by the quick-match path, but the quiz-anchored
// path (/api/battle/start with a quizId, and every battle the W2 result-screen
// challenge creates) leaves group_slug NULL and carries `quiz_id` instead. Filtering
// on group_slug alone hid 455 of 870 open runs, 52% of the pool, and because the
// DRAW used the same filter those runs were not merely uncounted, they were
// unreachable. The definition below is now the single source of truth and BOTH the
// count and the draw use it.

export type GroupBattleRow = {
  id: string;
  quiz_id: string | null;
  group_slug: string | null;
  challenger_hash: string;
  challenger_score: number | null;
  created_at: string;
  questions: unknown;
};

const BATTLE_COLS = 'id, quiz_id, group_slug, challenger_hash, challenger_score, created_at, questions';

/** Every published-or-not quiz id belonging to a group. Paginated: some groups have 150+. */
async function quizIdsForGroup(db: SupabaseClient, groupSlug: string): Promise<string[]> {
  const { data: group } = await db
    .from('groups')
    .select('id')
    .eq('slug', groupSlug)
    .maybeSingle<{ id: number }>();
  if (!group) return [];
  const rows = await fetchAllRows<{ id: string }>(() =>
    db.from('quizzes').select('id').eq('group_id', group.id),
  );
  return rows.map((r) => r.id);
}

/**
 * THE definition: every FINISHED battle that belongs to this group, by either link.
 * Deduped by battle id, so a battle carrying both group_slug and quiz_id counts once.
 */
export async function fetchFinishedGroupBattles(
  db: SupabaseClient,
  groupSlug: string,
): Promise<GroupBattleRow[]> {
  const bySlug = await fetchAllRows<GroupBattleRow>(() =>
    db.from('battles').select(BATTLE_COLS).eq('group_slug', groupSlug).not('challenger_score', 'is', null),
  );

  const quizIds = await quizIdsForGroup(db, groupSlug);
  const byQuiz: GroupBattleRow[] = [];
  const CHUNK = 100; // keep the .in() list off the URL length limit
  for (let i = 0; i < quizIds.length; i += CHUNK) {
    const slice = quizIds.slice(i, i + CHUNK);
    const rows = await fetchAllRows<GroupBattleRow>(() =>
      db.from('battles').select(BATTLE_COLS).in('quiz_id', slice).not('challenger_score', 'is', null),
    );
    byQuiz.push(...rows);
  }

  const seen = new Set<string>();
  const out: GroupBattleRow[] = [];
  for (const b of [...bySlug, ...byQuiz]) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    out.push(b);
  }
  return out;
}

/** battle_id -> the distinct players who have recorded a run against it. */
export async function playersByBattle(
  db: SupabaseClient,
  battleIds: string[],
): Promise<Map<string, Set<string>>> {
  const played = new Map<string, Set<string>>();
  const CHUNK = 200;
  for (let i = 0; i < battleIds.length; i += CHUNK) {
    const slice = battleIds.slice(i, i + CHUNK);
    const rows = await fetchAllRows<{ battle_id: string; player_hash: string }>(() =>
      db.from('battle_results').select('battle_id, player_hash').in('battle_id', slice),
    );
    for (const r of rows) {
      const s = played.get(r.battle_id) ?? new Set<string>();
      s.add(r.player_hash);
      played.set(r.battle_id, s);
    }
  }
  return played;
}

/** Open = nobody but the challenger has recorded a run against it. */
export function isOpenRun(battle: { id: string; challenger_hash: string }, played: Map<string, Set<string>>): boolean {
  const players = played.get(battle.id);
  return !players || [...players].every((h) => h === battle.challenger_hash);
}

/**
 * Open runs for one group.
 *
 * Paginated on every read: a JS-side aggregate that stops at PostgREST's 1000-row
 * default would UNDER-count, and this number is shown to users. Bounded reads are
 * fine for a draw; a published count has to be exact.
 */
export async function countOpenRunsForGroup(groupSlug: string): Promise<number> {
  const db: SupabaseClient = createServiceRoleClient();
  const battles = await fetchFinishedGroupBattles(db, groupSlug);
  if (battles.length === 0) return 0;
  const played = await playersByBattle(db, battles.map((b) => b.id));
  return battles.filter((b) => isOpenRun(b, played)).length;
}

/**
 * How many open runs exist on ONE quiz.
 *
 * C2-REDESIGN: this used to also return a username -> battleId map so a leaderboard
 * ROW could carry a "beat this run" action. That premise was wrong: on the biggest
 * quiz on the site (2,107 plays, 711 signed in) the top 10 by score contains ZERO
 * named players, because anonymous players dominate the board. Matching a row to a
 * challenger by username cannot work while leaderboards are anonymous, and it fired
 * on 4 quizzes site-wide. The map is gone; one identity-free block replaces it.
 *
 * Same definition as everywhere else in this module. Paginated, so the published
 * count is exact.
 */
export async function countOpenRunsForQuiz(quizId: string): Promise<number> {
  const db: SupabaseClient = createServiceRoleClient();
  const battles = await fetchAllRows<GroupBattleRow>(() =>
    db.from('battles').select(BATTLE_COLS).eq('quiz_id', quizId).not('challenger_score', 'is', null),
  );
  if (battles.length === 0) return 0;
  const played = await playersByBattle(db, battles.map((b) => b.id));
  return battles.filter((b) => isOpenRun(b, played)).length;
}
