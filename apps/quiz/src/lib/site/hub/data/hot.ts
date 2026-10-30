// Run O1, lot H2b: Hot right now (Plan.dc.html, section 3.A), six ranked quizzes for each filter of the home.
//
// Score  = the plays of the last 7 UTC days, each day weighing 0.85 to the power of its age in days (today is 0), times the quality;
//          a quiz published less than 72 hours ago counts 1.5 times.
// Quality = completion rate (finished over started) times (1 + likes / plays), clamped to 0.5 .. 1.5. A reported quiz (status not
//          published, or 5 reports) is out; so is a quiz finished by less than 40% of the players.
//          NOTHING STORES "STARTED" today (plays has one row per finished run), so the completion rate is unknown: the neutral value 1
//          is used and the 40% exclusion cannot fire until quiz_daily_plays.started is filled (HubHot.basis.completionMeasured).
// Mix    = at most 2 quizzes per group or series, never the quiz of the day of either site. In All, K-pop and anime alternate (K, A, K, A,
//          K, A), so the younger site keeps its places; a site that runs out gives its places to the other.
// Start  = while OtakuQuiz has less than 7 days of data (days since its first play), its places go to its New quizzes (published in
//          the last 14 days) in editorial order: the series tier A, B, C (the only stored editorial grade; no per-quiz "verified" flag
//          exists), then likes, then the newest.
// Plays per day: the daily table docs/pending-migrations/hub/001-quiz-daily-plays.sql when it is applied and fresh (days before today),
//          today from the plays rows; without the table every day comes from the plays rows (fetchAllRows, paged past the 1000 row cap).
// A site with fewer than 6 scored quizzes is completed in its own order (K-pop: lifetime plays; anime: editorial order), never
// with an invented number.
// Start easy (home v3, 2026-10-29: the filter that replaces the old "New here? Start easy" block): the easy quizzes of each site in that
// same order (anime: its places first, then the rest of its editorial order), two per group or series at most, the sites alternating.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';

import { loadTiers } from './catalog';
import { getDailyQuizzes } from './daily';
import { hubCached } from './cache';
import {
  ageInDays, capPerKey, chunk, DAY_MS, HUB_SITES, isListable, must, NEW_DAYS, QUIZ_SELECT, resolveOrigins, toCard, utcDate,
} from './util';

import type { QuizRow } from './util';
import type { HubHot, HubHotCard, HubOpts, HubOrigins, HubSite } from './types';

export const HOT_SIZE = 6;
export const HOT_WINDOW_DAYS = 7;
export const HOT_DECAY = 0.85;
export const HOT_NEW_HOURS = 72;
export const HOT_NEW_BOOST = 1.5;
export const HOT_QUALITY_MIN = 0.5;
export const HOT_QUALITY_MAX = 1.5;
export const HOT_MIN_COMPLETION = 0.4;
/** Started runs needed before a completion rate means anything. */
export const HOT_MIN_STARTED = 20;
export const HOT_PER_GROUP = 2;
export const ANIME_STARTUP_DAYS = 7;

export interface DayCount { plays: number; started: number | null }
/** quiz id to UTC day to counts. */
export type PlaysByQuiz = ReadonlyMap<string, ReadonlyMap<string, DayCount>>;

export interface ScoreInput {
  readonly created_at: string;
  readonly play_count: number;
  readonly like_count: number | null;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Completion rate of the window, or null when started runs are unknown or too few. */
export function completionRate(days: ReadonlyMap<string, DayCount> | undefined, now: Date): number | null {
  if (!days) return null;
  let plays = 0;
  let started = 0;
  for (const [day, c] of days) {
    const age = ageInDays(day, now);
    if (age < 0 || age >= HOT_WINDOW_DAYS) continue;
    if (c.started === null) return null;
    plays += c.plays;
    started += c.started;
  }
  return started >= HOT_MIN_STARTED ? Math.min(1, plays / started) : null;
}

/** completion times (1 + likes / plays), clamped; an unknown completion counts as 1. */
export function quality(q: ScoreInput, completion: number | null): number {
  const likes = q.like_count ?? 0;
  const raw = (completion ?? 1) * (1 + likes / Math.max(q.play_count ?? 0, 1));
  return clamp(raw, HOT_QUALITY_MIN, HOT_QUALITY_MAX);
}

export interface Scored<T> { readonly quiz: T; readonly score: number; readonly completion: number | null }

/** The Hot score of one quiz at `now`. */
export function hotScore(q: ScoreInput, days: ReadonlyMap<string, DayCount> | undefined, now: Date): { score: number; completion: number | null } {
  const completion = completionRate(days, now);
  let weighted = 0;
  if (days) {
    for (const [day, c] of days) {
      const age = ageInDays(day, now);
      if (age < 0 || age >= HOT_WINDOW_DAYS) continue;
      weighted += c.plays * Math.pow(HOT_DECAY, age);
    }
  }
  const young = now.getTime() - Date.parse(q.created_at) < HOT_NEW_HOURS * 3_600_000;
  return { score: weighted * quality(q, completion) * (young ? HOT_NEW_BOOST : 1), completion };
}

/** Scored candidates, best first: score, then lifetime plays, then the newest, then the id (a total order). Excluded quizzes are dropped. */
export function rankQuizzes<T extends QuizRow>(rows: readonly T[], plays: PlaysByQuiz, now: Date, excludeIds: ReadonlySet<string>): Scored<T>[] {
  const out: Scored<T>[] = [];
  for (const quiz of rows) {
    if (excludeIds.has(quiz.id) || !isListable(quiz)) continue;
    const { score, completion } = hotScore(quiz, plays.get(quiz.id), now);
    if (completion !== null && completion < HOT_MIN_COMPLETION) continue;
    out.push({ quiz, score, completion });
  }
  return out.sort((a, b) =>
    b.score - a.score
    || (b.quiz.play_count ?? 0) - (a.quiz.play_count ?? 0)
    || Date.parse(b.quiz.created_at) - Date.parse(a.quiz.created_at)
    || (a.quiz.id < b.quiz.id ? -1 : 1));
}

const TIER_RANK: Readonly<Record<string, number>> = { A: 0, B: 1, C: 2 };

/** The editorial order of OtakuQuiz's start-up places: series tier, then likes, then the newest, then the id. */
export function editorialOrder<T extends QuizRow>(rows: readonly T[], tiers: ReadonlyMap<number, string>): T[] {
  const tier = (q: T): number => TIER_RANK[tiers.get(q.group_id) ?? ''] ?? 3;
  return [...rows].sort((a, b) =>
    tier(a) - tier(b)
    || (b.like_count ?? 0) - (a.like_count ?? 0)
    || Date.parse(b.created_at) - Date.parse(a.created_at)
    || (a.id < b.id ? -1 : 1));
}

/** True while the site has less than 7 days of data: `firstPlayAt` is the time of its first play (null: no play yet). */
export function isStartup(firstPlayAt: string | null, now: Date): boolean {
  if (!firstPlayAt) return true;
  return now.getTime() - Date.parse(firstPlayAt) < ANIME_STARTUP_DAYS * DAY_MS;
}

/** K, A, K, A, K, A: the sites alternate from the first; a site that runs out gives its places to the other. */
export function alternate<T>(kpop: readonly T[], anime: readonly T[], size: number = HOT_SIZE): T[] {
  const out: T[] = [];
  let k = 0;
  let a = 0;
  let turn: HubSite = 'kpop';
  while (out.length < size && (k < kpop.length || a < anime.length)) {
    if (turn === 'kpop' && k < kpop.length) out.push(kpop[k++]!);
    else if (turn === 'anime' && a < anime.length) out.push(anime[a++]!);
    else if (k < kpop.length) out.push(kpop[k++]!);
    else out.push(anime[a++]!);
    turn = turn === 'kpop' ? 'anime' : 'kpop';
  }
  return out;
}

export interface HotInput {
  readonly kpop: readonly QuizRow[];
  readonly anime: readonly QuizRow[];
  readonly plays: PlaysByQuiz;
  readonly tiers: ReadonlyMap<number, string>;
  readonly qotdIds: ReadonlySet<string>;
  readonly animeFirstPlayAt: string | null;
  readonly now: Date;
}

export interface HotPicks {
  readonly kpop: QuizRow[];
  readonly anime: QuizRow[];
  /** The Start easy picks of each site (six at most). */
  readonly easy: { readonly kpop: QuizRow[]; readonly anime: QuizRow[] };
  readonly animeStartup: boolean;
  readonly completionMeasured: boolean;
}

/** The pure core: six quizzes per site (the list of each filter is cut from them). */
export function pickHot(input: HotInput): HotPicks {
  const { now, plays, tiers, qotdIds } = input;
  const group = (q: QuizRow): string => String(q.group_id);

  const kScored = rankQuizzes(input.kpop, plays, now, qotdIds);
  const kTop = kScored.filter((s) => s.score > 0).map((s) => s.quiz);
  const kRest = kScored.filter((s) => s.score <= 0).map((s) => s.quiz).sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
  const kpop = capPerKey([...kTop, ...kRest], group, HOT_PER_GROUP).slice(0, HOT_SIZE);

  const startup = isStartup(input.animeFirstPlayAt, now);
  const aListable = input.anime.filter((q) => !qotdIds.has(q.id) && isListable(q));
  const aNew = editorialOrder(aListable.filter((q) => now.getTime() - Date.parse(q.created_at) < NEW_DAYS * DAY_MS), tiers);
  let anime: QuizRow[];
  let aOrder: QuizRow[];
  if (startup) {
    anime = capPerKey(aNew, group, HOT_PER_GROUP).slice(0, HOT_SIZE);
    const taken = new Set(aNew.map((q) => q.id));
    aOrder = [...aNew, ...editorialOrder(aListable.filter((q) => !taken.has(q.id)), tiers)];
  } else {
    const aScored = rankQuizzes(aListable as QuizRow[], plays, now, qotdIds);
    const aTop = aScored.filter((s) => s.score > 0).map((s) => s.quiz);
    const taken = new Set(aTop.map((q) => q.id));
    const aRest = editorialOrder(aListable.filter((q) => !taken.has(q.id)), tiers);
    anime = capPerKey([...aTop, ...aRest], group, HOT_PER_GROUP).slice(0, HOT_SIZE);
    aOrder = [...aTop, ...aRest];
  }
  const isEasy = (q: QuizRow): boolean => q.difficulty === 'easy';
  const easy = {
    kpop: capPerKey([...kTop, ...kRest].filter(isEasy), group, HOT_PER_GROUP).slice(0, HOT_SIZE),
    anime: capPerKey(aOrder.filter(isEasy), group, HOT_PER_GROUP).slice(0, HOT_SIZE),
  };
  const measured = [...kScored, ...rankQuizzes(input.anime, plays, now, qotdIds)].some((s) => s.completion !== null);
  return { kpop, anime, easy, animeStartup: startup, completionMeasured: measured };
}

/** The three lists of the home from the picks. */
export function composeHot(picks: HotPicks, origins: HubOrigins, now: Date, plays: HubHot['basis']['plays']): HubHot {
  const card = (q: QuizRow, i: number): HubHotCard => ({ ...toCard(q, origins, now), rank: i + 1 });
  const ranked = (rows: readonly QuizRow[]): HubHotCard[] => rows.map(card);
  const all = alternate(picks.kpop, picks.anime).map(card);
  return {
    all,
    kpop: ranked(picks.kpop),
    anime: ranked(picks.anime),
    easy: alternate(picks.easy.kpop, picks.easy.anime).map(card),
    basis: { plays, completionMeasured: picks.completionMeasured, animeStartup: picks.animeStartup },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Reads

type Db = ReturnType<typeof createPublicReadClient>;

export const DAILY_TABLE = 'quiz_daily_plays';

interface PlayRow { readonly quiz_id: string; readonly created_at: string }
interface DailyRow { readonly quiz_id: string; readonly day: string; readonly plays: number; readonly started: number | null }

function add(map: Map<string, Map<string, DayCount>>, quizId: string, day: string, plays: number, started: number | null): void {
  let days = map.get(quizId);
  if (!days) { days = new Map(); map.set(quizId, days); }
  const cur = days.get(day);
  if (cur) { cur.plays += plays; cur.started = cur.started === null || started === null ? null : cur.started + started; }
  else days.set(day, { plays, started });
}

/** Counts plays rows per quiz and UTC day. */
export function aggregatePlays(rows: readonly PlayRow[], into: Map<string, Map<string, DayCount>> = new Map()): Map<string, Map<string, DayCount>> {
  for (const r of rows) add(into, r.quiz_id, r.created_at.slice(0, 10), 1, null);
  return into;
}

/** Window start: 00:00 UTC of the oldest day that counts. */
function windowStart(now: Date): string {
  return `${utcDate(new Date(now.getTime() - (HOT_WINDOW_DAYS - 1) * DAY_MS))}T00:00:00Z`;
}

/** Plays per quiz per day over the window, and where they came from. */
export async function loadPlays(db: Db, now: Date): Promise<{ plays: Map<string, Map<string, DayCount>>; source: HubHot['basis']['plays'] }> {
  const start = windowStart(now);
  const today = utcDate(now);
  const yesterday = utcDate(new Date(now.getTime() - DAY_MS));
  const out = new Map<string, Map<string, DayCount>>();

  // 1. The daily table, when it exists and reaches yesterday. Any error (table not applied yet) means: no table.
  let fromTable = false;
  try {
    const rows = await fetchAllRows<DailyRow>(() =>
      db.from(DAILY_TABLE).select('quiz_id, day, plays, started').gte('day', start.slice(0, 10)).lt('day', today).order('day').order('quiz_id'));
    if (rows.some((r) => r.day >= yesterday)) {
      fromTable = true;
      for (const r of rows) add(out, r.quiz_id, r.day, r.plays, r.started);
    }
  } catch {
    fromTable = false;
  }

  // 2. The plays rows: today only when the table covers the earlier days, else the whole window.
  const from = fromTable ? `${today}T00:00:00Z` : start;
  const rows = await fetchAllRows<PlayRow>(() =>
    db.from('plays').select('quiz_id, created_at').gte('created_at', from).order('created_at').order('id'));
  aggregatePlays(rows, out);
  return { plays: out, source: fromTable ? 'daily-table' : 'plays-rows' };
}

/** Time of the first play of an anime quiz, or null. */
export async function firstAnimePlay(db: Db): Promise<string | null> {
  const res = await db.from('plays').select('created_at, quizzes!inner(site_id)').eq('quizzes.site_id', 'anime').order('created_at').limit(1);
  const rows = must<Array<{ created_at: string }>>(res as never, 'first anime play');
  return rows[0]?.created_at ?? null;
}

/** Published quizzes by id (the ones with plays in the window), in short `in` lists. */
async function quizzesById(db: Db, ids: readonly string[]): Promise<QuizRow[]> {
  const out: QuizRow[] = [];
  for (const part of chunk(ids, 80)) {
    const rows = must<QuizRow[]>(await db.from('quizzes').select(QUIZ_SELECT).in('id', part).in('site_id', HUB_SITES).eq('status', 'published'), 'quizzes by id');
    out.push(...rows);
  }
  return out;
}

/** The most played published quizzes of a site (completes a short list). */
async function topOfSite(db: Db, site: HubSite, limit: number): Promise<QuizRow[]> {
  return must<QuizRow[]>(
    await forSite(db.from('quizzes').select(QUIZ_SELECT), site).eq('status', 'published').order('play_count', { ascending: false }).limit(limit),
    `top ${site}`,
  );
}

/** The published quizzes of a site from the last 14 days (OtakuQuiz's New quizzes), newest first. */
async function newestOfSite(db: Db, site: HubSite, now: Date, limit: number): Promise<QuizRow[]> {
  const since = new Date(now.getTime() - NEW_DAYS * DAY_MS).toISOString();
  return must<QuizRow[]>(
    await forSite(db.from('quizzes').select(QUIZ_SELECT), site).eq('status', 'published').gte('created_at', since).order('created_at', { ascending: false }).limit(limit),
    `newest ${site}`,
  );
}

export interface HotDeps {
  readonly db: Db;
  /** Ids of the quizzes of the day of both sites. */
  readonly qotdIds: () => Promise<ReadonlySet<string>>;
}

export async function readHot(origins: HubOrigins, now: Date, deps: HotDeps): Promise<HubHot | null> {
  const { db } = deps;
  const [{ plays, source }, tiers, firstAnime, qotdIds] = await Promise.all([loadPlays(db, now), loadTiers(db), firstAnimePlay(db), deps.qotdIds()]);
  const withPlays = await quizzesById(db, [...plays.keys()]);
  const [kTop, aTop, aNew] = await Promise.all([topOfSite(db, 'kpop', 60), topOfSite(db, 'anime', 60), newestOfSite(db, 'anime', now, 400)]);
  const byId = new Map<string, QuizRow>();
  for (const q of [...withPlays, ...kTop, ...aTop, ...aNew]) byId.set(q.id, q);
  const rows = [...byId.values()];
  const picks = pickHot({
    kpop: rows.filter((q) => q.site_id === 'kpop'),
    anime: rows.filter((q) => q.site_id === 'anime'),
    plays,
    tiers,
    qotdIds,
    animeFirstPlayAt: firstAnime,
    now,
  });
  if (picks.kpop.length === 0 && picks.anime.length === 0) return null;
  return composeHot(picks, origins, now, source);
}

/** The ids of today's quizzes of the day, from the daily block. No quiz of the day (or a failed read) gives no exclusion. */
export async function qotdIdsOf(origins: HubOrigins): Promise<ReadonlySet<string>> {
  const daily = await getDailyQuizzes({ origins });
  const ids = new Set<string>();
  for (const s of HUB_SITES) {
    const id = daily?.[s]?.id;
    if (id) ids.add(id);
  }
  return ids;
}

const cached = hubCached('hot', (origins: HubOrigins) =>
  readHot(origins, new Date(), { db: createPublicReadClient(), qotdIds: () => qotdIdsOf(origins) }));

/** Hot right now, cached one hour (tag hub:hot). */
export async function getHot(opts?: HubOpts): Promise<HubHot | null> {
  return cached(resolveOrigins(opts));
}
