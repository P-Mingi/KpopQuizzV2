import { fetchAllRows } from '@/lib/db/fetch-all';
import { playersByBattle, isOpenRun } from '@/lib/db/queries/open-runs';

import type { SupabaseClient } from '@supabase/supabase-js';

// W2b C3 - the weekly challenge.
//
// One real, already-played run per week, offered to a signed-in player. Everything
// here reads the SAME open-run definition as the count and the draw
// (lib/db/queries/open-runs.ts). A second definition is what produced the 455-run
// blind spot, so this file owns none of its own.
//
// COVENANT: every candidate is a battles row a human created and finished. Nothing
// is generated, nothing is padded, and an empty result means nobody is messaged.

/** Marks a notification as coming from the weekly job, so it can dedupe on itself. */
export const WEEKLY_CAMPAIGN = 'weekly_challenge';

export type WeeklyPick = {
  battleId: string;
  challengerScore: number;
  questionCount: number;
  quizTitle: string | null;
  playedAt: string;
  challengerHandle: string;
};

type BattleRow = {
  id: string;
  quiz_id: string | null;
  group_slug: string | null;
  challenger_hash: string;
  challenger_score: number | null;
  created_at: string;
  questions: unknown;
};

const BATTLE_COLS = 'id, quiz_id, group_slug, challenger_hash, challenger_score, created_at, questions';

/** "in March", "in December 2025" - the time shift, stated. */
export function monthLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const month = d.toLocaleString('en-US', { month: 'long' });
  return d.getUTCFullYear() === now.getUTCFullYear() ? `in ${month}` : `in ${month} ${d.getUTCFullYear()}`;
}

/**
 * Pick this week's challenge for one user, or null.
 *
 * Fairness, all four enforced here rather than hoped for:
 *  1. never the reader's own run (their own battle_results rows as challenger)
 *  2. never a run they already played (any battle they have a result row on)
 *  3. never two in a row from the same challenger (reads the previous week's pick)
 *  4. at most one per user per week (the caller checks; see hasHadWeekly)
 */
export async function pickWeeklyChallenge(
  db: SupabaseClient,
  userId: string,
): Promise<WeeklyPick | null> {
  // Everything this user has ever run, and the runs they authored.
  const mine = await fetchAllRows<{ battle_id: string; player_hash: string }>(() =>
    db.from('battle_results').select('battle_id, player_hash').eq('user_id', userId),
  );
  const playedBattleIds = new Set(mine.map((r) => r.battle_id)); // rule 2 (and covers rule 1)
  const myHashes = new Set(mine.map((r) => r.player_hash)); // rule 1, belt and braces

  // Rule 3: whoever we sent last time is excluded this time.
  const lastPick = await previousChallengerHash(db, userId);

  // Candidate pool: recent finished battles, newest first. Bounded on purpose, and
  // said so in the report: this is a draw, not a published count.
  const { data } = await db
    .from('battles')
    .select(BATTLE_COLS)
    .not('challenger_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(300);
  const candidates = (data ?? []) as BattleRow[];
  if (candidates.length === 0) return null;

  const played = await playersByBattle(db, candidates.map((b) => b.id));
  const open = candidates.filter(
    (b) =>
      isOpenRun(b, played) &&
      !playedBattleIds.has(b.id) &&
      !myHashes.has(b.challenger_hash) &&
      (lastPick === null || b.challenger_hash !== lastPick),
  );
  if (open.length === 0) return null;

  // Targeting: bias group first, then closest score, then most recent.
  const biasGroups = await biasGroupSlugs(db, userId);
  const myAverage = await averageBattleScore(db, userId);

  open.sort((a, b) => {
    const ga = biasGroups.has(a.group_slug ?? '') ? 0 : 1;
    const gb = biasGroups.has(b.group_slug ?? '') ? 0 : 1;
    if (ga !== gb) return ga - gb;
    if (myAverage !== null) {
      const da = Math.abs((a.challenger_score ?? 0) - myAverage);
      const dbs = Math.abs((b.challenger_score ?? 0) - myAverage);
      if (da !== dbs) return da - dbs;
    }
    return b.created_at.localeCompare(a.created_at);
  });

  const pick = open[0]!;
  let quizTitle: string | null = null;
  if (pick.quiz_id) {
    const { data: quiz } = await db
      .from('quizzes')
      .select('title')
      .eq('id', pick.quiz_id)
      .maybeSingle<{ title: string }>();
    quizTitle = quiz?.title ?? null;
  }

  return {
    battleId: pick.id,
    challengerScore: pick.challenger_score ?? 0,
    questionCount: Array.isArray(pick.questions) ? pick.questions.length : 0,
    quizTitle,
    playedAt: pick.created_at,
    challengerHandle: `@fan_${pick.challenger_hash.slice(-4)}`,
  };
}

/** The user's ult groups, used as the bias signal. Empty set when they have none. */
async function biasGroupSlugs(db: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await db
    .from('profiles')
    .select('ult_groups')
    .eq('id', userId)
    .maybeSingle<{ ult_groups: unknown }>();
  const raw = data?.ult_groups;
  return new Set(Array.isArray(raw) ? (raw as unknown[]).filter((x): x is string => typeof x === 'string') : []);
}

/** Their own typical battle score, so the pick is a fair fight. Null when unknown. */
async function averageBattleScore(db: SupabaseClient, userId: string): Promise<number | null> {
  const rows = await fetchAllRows<{ score: number }>(() =>
    db.from('battle_results').select('score').eq('user_id', userId),
  );
  if (rows.length === 0) return null;
  return rows.reduce((a, r) => a + r.score, 0) / rows.length;
}

/** The challenger we sent this user last time, so rule 3 can exclude them. */
async function previousChallengerHash(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data: last } = await db
    .from('creator_notifications')
    .select('link_url')
    .eq('user_id', userId)
    .like('link_url', `%${WEEKLY_CAMPAIGN}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ link_url: string | null }>();
  const prevId = last?.link_url?.match(/[?&]b=([0-9a-f-]{36})/i)?.[1];
  if (!prevId) return null;
  const { data: battle } = await db
    .from('battles')
    .select('challenger_hash')
    .eq('id', prevId)
    .maybeSingle<{ challenger_hash: string }>();
  return battle?.challenger_hash ?? null;
}

/** Rule 4: has this user already had one in the last 7 days? */
export async function hasHadWeekly(db: SupabaseClient, userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count } = await db
    .from('creator_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .like('link_url', `%${WEEKLY_CAMPAIGN}%`)
    .gte('created_at', since);
  return (count ?? 0) > 0;
}

/**
 * The copy. The time shift is stated, always.
 *
 * Nothing here may imply the challenger is online, waiting, or has just challenged
 * the reader. They played earlier and left a score; that is the whole truth and it
 * is enough. (Nor does it mention how few accounts exist: that is an internal fact
 * for the report, not a discouraging non-sequitur for a player.)
 */
export function weeklyCopy(pick: WeeklyPick): { title: string; body: string } {
  const when = monthLabel(pick.playedAt);
  const on = pick.quizTitle ? ` on ${pick.quizTitle}` : '';
  return {
    title: 'A run worth beating',
    body: `${pick.challengerHandle} left ${pick.challengerScore}/${pick.questionCount}${on} ${when}. Beat it?`,
  };
}
