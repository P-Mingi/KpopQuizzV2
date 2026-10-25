// The reads behind /kpop-games (SEO Mission 2, part A). Server only. The page turns them
// into games, a grid and a difficulty table with the pure functions of ./registry.ts.
//
// Every read is real and documented here, with its denominator:
//   counts              lib/stats/site-stats.ts (the one source of public counts)
//   quiz formats        published `quizzes` rows (anon, RLS: status = 'published'):
//                       group_id, quiz_type, question_count, total_score_sum,
//                       total_completions. total_score_sum is the sum of plays.score (right
//                       answers) and total_completions the number of plays: checked
//                       2026-10-15, sum over published quizzes = 380,169 and 73,740, equal to
//                       the `plays` rows of those quizzes. Right answers / (completions x
//                       questions) is the pooled share of right answers.
//   first quiz play     `plays` (anon), the oldest created_at
//   blind test runs     `bt_runs` (service role: RLS has no policy), is_test = false,
//                       completed = true, finished_at not null, playlist not daily or live
//                       (those are their own games): sum(correct) / sum(rounds)
//   Blindtest of the day `daily_blindtest_scores` (anon, public read): sum(score) / (10 x rows)
//   Name them all       `name_all_member_results` (service role: no anon policy), one row
//                       per member per round: count(found) / count(rows), rounds =
//                       distinct round_id
//   ranked              `ranked_runs` (service role), status = 'finished':
//                       sum(correct_count) / (10 x runs)
//   live                `live_players` (service role), is_test = false, answered > 0:
//                       sum(correct) / sum(answered)
// A game is ranked by difficulty only from DIFFICULTY_MIN_ATTEMPTS (registry.ts).
//
// Caching: each aggregate is computed inside unstable_cache (6 hours, the stats window) and
// only small totals are cached. A failed read THROWS inside the cache (never cached) and is
// caught outside, where it hides one block, never the page.

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import { getAdvertisablePlaylists } from '@/lib/blind-test-playlists';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { getAllGroups } from '@/lib/db/queries/groups';
import { isLiveOpen } from '@/lib/live/server';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { getWmaGroupSlugs } from '@/lib/personality/data';
import { ROUND_COUNT as RANKED_ROUNDS } from '@/lib/ranked/constants';
import { STATS_REVALIDATE, getPublicStatsOrNull } from '@/lib/stats/site-stats';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { isUxV12 } from '@/lib/ux-v12';
import { isMissingTable } from '@/lib/ux-v1/p8/features';

import { DAILY_SONGS } from './registry';

import type { DifficultyFacts, GamesFacts, GridGroupInput, GroupRef, QuizFormatFacts, ScoreSample } from './registry';
import type { PublicStats } from '@/lib/stats/site-stats';

const hasDbEnv = (): boolean => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const hasServiceEnv = (): boolean => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---- quiz formats and groups -------------------------------------------------------------

type Format = 'choice' | 'trueFalse' | 'clues';
/** multiple_choice, image and intruder all score right answers out of questions. */
const FORMAT_OF: Record<string, Format> = { multiple_choice: 'choice', image: 'choice', intruder: 'choice', true_false: 'trueFalse', guess_from_clues: 'clues' };

interface FormatTotals extends QuizFormatFacts { plays: number; right: number; asked: number }

export interface QuizAggregates {
  formats: Record<Format, FormatTotals>;
  byGroup: Array<{ groupId: number; quizzes: number; plays: number }>;
  /** Oldest play (ISO), null when there is none. */
  firstPlay: string | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : Math.round((v[mid - 1]! + v[mid]!) / 2);
}

interface QuizRow { group_id: number | null; quiz_type: string; question_count: number | null; total_score_sum: number | null; total_completions: number | null }

const readQuizAggregates = unstable_cache(async (): Promise<QuizAggregates> => {
  const db = createPublicReadClient();
  const [rows, first] = await Promise.all([
    fetchAllRows<QuizRow>(() => db.from('quizzes').select('group_id, quiz_type, question_count, total_score_sum, total_completions').eq('status', 'published').order('id')),
    db.from('plays').select('created_at').order('created_at', { ascending: true }).limit(1),
  ]);
  if (first.error) throw new Error(`[kpop-games] first play: ${first.error.message}`);
  const acc: Record<Format, { quizzes: number; groups: Set<number>; questions: number[]; plays: number; right: number; asked: number }> = {
    choice: { quizzes: 0, groups: new Set(), questions: [], plays: 0, right: 0, asked: 0 },
    trueFalse: { quizzes: 0, groups: new Set(), questions: [], plays: 0, right: 0, asked: 0 },
    clues: { quizzes: 0, groups: new Set(), questions: [], plays: 0, right: 0, asked: 0 },
  };
  const byGroup = new Map<number, { quizzes: number; plays: number }>();
  for (const r of rows) {
    const plays = r.total_completions ?? 0;
    if (r.group_id != null) {
      const g = byGroup.get(r.group_id) ?? { quizzes: 0, plays: 0 };
      g.quizzes += 1;
      g.plays += plays;
      byGroup.set(r.group_id, g);
    }
    const f = FORMAT_OF[r.quiz_type];
    if (!f) continue;
    const a = acc[f];
    a.quizzes += 1;
    if (r.group_id != null) a.groups.add(r.group_id);
    const q = r.question_count ?? 0;
    if (q > 0) {
      a.questions.push(q);
      if (plays > 0) {
        a.plays += plays;
        a.right += r.total_score_sum ?? 0;
        a.asked += plays * q;
      }
    }
  }
  const out = {} as Record<Format, FormatTotals>;
  for (const f of Object.keys(acc) as Format[]) {
    const a = acc[f];
    out[f] = { quizzes: a.quizzes, groups: a.groups.size, medianQuestions: median(a.questions), plays: a.plays, right: a.right, asked: a.asked };
  }
  const firstRow = ((first.data ?? []) as Array<{ created_at: string }>)[0];
  return {
    formats: out,
    byGroup: [...byGroup.entries()].map(([groupId, v]) => ({ groupId, ...v })),
    firstPlay: firstRow?.created_at ?? null,
  };
}, ['games:quiz-aggregates:v1'], { revalidate: STATS_REVALIDATE, tags: ['quizzes', 'stats'] });

/** Slugs of the groups with a blind test playlist of their own (the sitemap's set). */
const readPlaylistSlugs = unstable_cache(async (): Promise<string[]> => {
  const { groups } = await getAdvertisablePlaylists();
  // That read answers an empty list on a failed request: never cache "no playlist".
  if (groups.length === 0) throw new Error('[kpop-games] no playlist group read');
  return groups.map((g) => g.slug);
}, ['games:playlist-slugs:v1'], { revalidate: STATS_REVALIDATE, tags: ['songs'] });

// ---- difficulty --------------------------------------------------------------------------

/** One aggregate over a service-role table: null when the server has no service key or the
 *  table does not exist (a pending migration), a throw on any other error. */
async function serviceSample(run: (db: ReturnType<typeof createServiceRoleClient>) => Promise<ScoreSample>): Promise<ScoreSample | null> {
  if (!hasServiceEnv()) return null;
  try {
    return await run(createServiceRoleClient());
  } catch (err) {
    const e = err as { code?: string; message?: string; status?: number };
    if (isMissingTable(e, e.status)) return null;
    throw err;
  }
}

/** Rows paged past the 1000-row cap; a PostgREST error keeps its code for isMissingTable. */
async function pageAll<T>(make: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown[] | null; error: { code?: string; message: string } | null; status?: number }> }): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error, status } = await make().range(from, from + 999);
    if (error) throw Object.assign(new Error(error.message), { code: error.code, status });
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const readDifficulty = unstable_cache(async (): Promise<DifficultyFacts> => {
  const anon = createPublicReadClient();
  const [blind, daily, nameAll, ranked, live] = await Promise.all([
    serviceSample(async (db) => {
      const rows = await pageAll<{ correct: number | null; rounds: number | null; created_at: string }>(() => db.from('bt_runs')
        .select('correct, rounds, created_at')
        .eq('is_test', false).eq('completed', true).not('finished_at', 'is', null)
        .not('playlist', 'like', 'daily%').not('playlist', 'like', 'live%')
        .order('created_at', { ascending: true }).order('id', { ascending: true }));
      let right = 0;
      let asked = 0;
      for (const r of rows) { right += r.correct ?? 0; asked += r.rounds ?? 0; }
      return { right, asked, attempts: rows.length, since: rows[0]?.created_at ?? null };
    }),
    (async (): Promise<ScoreSample> => {
      const rows = await pageAll<{ score: number; created_at: string }>(() => anon.from('daily_blindtest_scores')
        .select('score, created_at').order('created_at', { ascending: true }).order('id', { ascending: true }));
      let right = 0;
      for (const r of rows) right += r.score ?? 0;
      return { right, asked: rows.length * DAILY_SONGS, attempts: rows.length, since: rows[0]?.created_at ?? null };
    })(),
    serviceSample(async (db) => {
      const rows = await pageAll<{ round_id: string; found: boolean; created_at: string }>(() => db.from('name_all_member_results')
        .select('round_id, found, created_at').order('id', { ascending: true }));
      const rounds = new Set<string>();
      let found = 0;
      let since: string | null = null;
      for (const r of rows) {
        rounds.add(r.round_id);
        if (r.found) found += 1;
        if (!since || r.created_at < since) since = r.created_at;
      }
      return { right: found, asked: rows.length, attempts: rounds.size, since };
    }),
    serviceSample(async (db) => {
      const rows = await pageAll<{ correct_count: number | null; finished_at: string | null }>(() => db.from('ranked_runs')
        .select('correct_count, finished_at').eq('status', 'finished')
        .order('finished_at', { ascending: true }).order('token', { ascending: true }));
      let right = 0;
      for (const r of rows) right += r.correct_count ?? 0;
      return { right, asked: rows.length * RANKED_ROUNDS, attempts: rows.length, since: rows[0]?.finished_at ?? null };
    }),
    serviceSample(async (db) => {
      const rows = await pageAll<{ correct: number | null; answered: number | null; joined_at: string }>(() => db.from('live_players')
        .select('correct, answered, joined_at').eq('is_test', false).gt('answered', 0)
        .order('joined_at', { ascending: true }).order('id', { ascending: true }));
      let right = 0;
      let asked = 0;
      for (const r of rows) { right += r.correct ?? 0; asked += r.answered ?? 0; }
      return { right, asked, attempts: rows.length, since: rows[0]?.joined_at ?? null };
    }),
  ]);
  return { 'blind-test': blind, 'daily-blind-test': daily, 'name-them-all': nameAll, 'ranked-blind-test': ranked, 'live-blind-test': live };
}, ['games:difficulty:v1'], { revalidate: STATS_REVALIDATE, tags: ['stats'] });

// ---- the page's data ----------------------------------------------------------------------

async function soft<T>(what: string, run: () => Promise<T>): Promise<{ value: T | null; ok: boolean }> {
  try {
    return { value: await run(), ok: true };
  } catch (err) {
    console.error(`[kpop-games] ${what}:`, err instanceof Error ? err.message : 'unknown error');
    return { value: null, ok: false };
  }
}

export interface KpopGamesData {
  facts: GamesFacts;
  stats: PublicStats | null;
  /** Groups for the grid (published quizzes and plays), empty when unknown. */
  gridGroups: GridGroupInput[];
  playlistSlugs: ReadonlySet<string> | null;
  difficulty: DifficultyFacts | null;
  /** Reads that failed on this render (the page keeps its last good copy in production). */
  failed: string[];
}

/** Every read of the page, once per request (generateMetadata and the page share it). */
export const getKpopGamesData = cache(async (): Promise<KpopGamesData> => {
  const v12 = isUxV12();
  const db = hasDbEnv();
  const [stats, groups, quizzes, playlists, wmaSlugs, liveOpen, difficulty] = await Promise.all([
    getPublicStatsOrNull(),
    db ? soft('groups', () => getAllGroups()) : Promise.resolve({ value: null, ok: true }),
    db ? soft('quiz formats', () => readQuizAggregates()) : Promise.resolve({ value: null, ok: true }),
    db ? soft('playlists', () => readPlaylistSlugs()) : Promise.resolve({ value: null, ok: true }),
    v12 && db ? getWmaGroupSlugs() : Promise.resolve([] as string[]),
    v12 ? isLiveOpen() : Promise.resolve(false),
    db ? soft('difficulty', () => readDifficulty()) : Promise.resolve({ value: null, ok: true }),
  ]);

  const names = new Map((groups.value ?? []).map((g) => [g.slug, g.name] as const));
  const named = (slugs: readonly string[]): GroupRef[] =>
    slugs.filter((s) => names.has(s)).map((s) => ({ slug: s, name: names.get(s)! })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const q = quizzes.value;
  const playlistSlugs = playlists.value ? new Set(playlists.value) : null;

  // Difficulty: the quiz samples come from the formats read, with the oldest play as `since`.
  // Both reads must have worked: a comparison missing some games could name the wrong one.
  let diff: DifficultyFacts | null = null;
  if (q && difficulty.ok && difficulty.value) {
    const sample = (f: FormatTotals): ScoreSample => ({ right: f.right, asked: f.asked, attempts: f.plays, since: q.firstPlay });
    diff = { ...difficulty.value, quizzes: sample(q.formats.choice), 'true-or-false': sample(q.formats.trueFalse) };
  }

  const byId = new Map((groups.value ?? []).map((g) => [g.id, g] as const));
  const gridGroups: GridGroupInput[] = (q?.byGroup ?? [])
    .map((r) => {
      const g = byId.get(r.groupId);
      return g ? { slug: g.slug, name: g.name, quizzes: r.quizzes, plays: r.plays } : null;
    })
    .filter((x): x is GridGroupInput => x !== null);

  const facts: GamesFacts = {
    v1: UX_V1,
    v12,
    liveOpen,
    stats,
    playlistGroups: playlistSlugs ? playlistSlugs.size : null,
    nameAll: v12 ? named(NAME_ALL_GROUPS) : [],
    wma: named(wmaSlugs),
    formats: q ? { choice: q.formats.choice, trueFalse: q.formats.trueFalse, clues: q.formats.clues } : null,
  };

  const failed = [
    ...(groups.ok ? [] : ['groups']),
    ...(quizzes.ok ? [] : ['quiz formats']),
    ...(playlists.ok ? [] : ['playlists']),
  ];
  return { facts, stats, gridGroups, playlistSlugs, difficulty: diff, failed };
});

/**
 * In production, a render that lost a core read throws, so Next keeps serving the last good
 * ISR copy instead of caching a page with fewer games (same rule as the blindtest hub). At
 * build time and in development it renders what it has.
 */
export function keepLastGoodCopy(failed: readonly string[], env: { NODE_ENV?: string; NEXT_PHASE?: string } = process.env): void {
  if (failed.length === 0) return;
  if (env.NODE_ENV !== 'production' || env.NEXT_PHASE === 'phase-production-build') return;
  throw new Error(`[kpop-games] read failed (${failed.join(', ')}): keeping the last good ISR copy`);
}
