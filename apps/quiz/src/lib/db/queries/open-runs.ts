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
 * The open runs on ONE quiz, and which signed-in players left them.
 *
 * C2 uses this for the leaderboard action. It is deliberately ONE call for the whole
 * page (three bounded reads, constant in the number of rows shown), not a per-row
 * lookup: a leaderboard is a list, and a per-row query would be N+1.
 *
 * Same definition as everywhere else in this module. The 455-run blind spot came from
 * a second definition living somewhere else, so there is still only one.
 */
export async function openRunsForQuiz(quizId: string): Promise<{
  count: number;
  /** username -> the battle id of THEIR open run on this quiz, so the action leads
   *  to that exact run rather than a generic battle. */
  openRunByUsername: Map<string, string>;
}> {
  const db: SupabaseClient = createServiceRoleClient();

  const battles = await fetchAllRows<GroupBattleRow>(() =>
    db.from('battles').select(BATTLE_COLS).eq('quiz_id', quizId).not('challenger_score', 'is', null),
  );
  if (battles.length === 0) return { count: 0, openRunByUsername: new Map() };

  const played = await playersByBattle(db, battles.map((b) => b.id));
  const open = battles.filter((b) => isOpenRun(b, played));
  if (open.length === 0) return { count: 0, openRunByUsername: new Map() };

  // Who left each open run, when they were signed in. Anonymous challengers simply
  // have no id to match a leaderboard row against, and that is fine: the action then
  // does not render on any row, which is the honest outcome.
  const rows = await fetchAllRows<{ battle_id: string; player_hash: string; user_id: string | null }>(() =>
    db.from('battle_results').select('battle_id, player_hash, user_id').in('battle_id', open.map((b) => b.id)),
  );
  const challengerOf = new Map(open.map((b) => [b.id, b.challenger_hash]));
  const battleByUser = new Map<string, string>();
  for (const r of rows) {
    if (r.user_id && challengerOf.get(r.battle_id) === r.player_hash && !battleByUser.has(r.user_id)) {
      battleByUser.set(r.user_id, r.battle_id);
    }
  }
  if (battleByUser.size === 0) return { count: open.length, openRunByUsername: new Map() };

  // Leaderboard rows carry a username, not a user id, so resolve once here rather
  // than leaking ids into the view layer.
  const profiles = await fetchAllRows<{ id: string; username: string }>(() =>
    db.from('profiles').select('id, username').in('id', [...battleByUser.keys()]),
  );
  const openRunByUsername = new Map<string, string>();
  for (const p of profiles) {
    const battleId = battleByUser.get(p.id);
    if (battleId) openRunByUsername.set(p.username, battleId);
  }
  return { count: open.length, openRunByUsername };
}
