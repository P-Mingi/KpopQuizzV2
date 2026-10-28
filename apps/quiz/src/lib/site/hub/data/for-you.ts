// Run O1, lot H2b: For you, for a signed-in fan (Plan.dc.html, section 3.B): Continue, the next quiz of your fandom, the bridge to the
// other site. At most three cards, and the bridge is always from the other site.
//
// Continue is NOT available: the run in progress lives in the browser (localStorage "ux:continue:v1", lib/ux-v1/p4/continue.ts) and
// kpopquiz.org is another origin than fandomverse.org, so the hub cannot read it there, and no server table holds it. The card is never invented; the block
// returns the other cards (data report: what is missing).
// Next in your fandom: the group or series played the most (plays rows, newest 1000), then its unplayed quizzes by quality. The
// difficulty adapts: an average of 80% or more on that group goes one step harder than the last quiz played there, under 50% one step
// easier, else the same.
// Bridge: the passport players who play both the fandom and a group of the other site (at least MIN_COMMON of them), else a hand-picked
// pair (bridge-pairs.ts), else the best rated easy quiz of the other site. Played quizzes are never offered.
// A fan with no play gets null (the page then shows Start easy). Cached 5 minutes per fan (the rest of the page: one hour).

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';

import { BRIDGE_PAIRS, MIN_COMMON } from './bridge-pairs';
import { bestEasy } from './start-easy';
import { loadCatalog, loadTiers, rankByQuality } from './catalog';
import { hubCached } from './cache';
import { chunk, difficultyLabel, groupOf, resolveOrigins, siteName, toCard } from './util';

import type { QuizRow } from './util';
import type { HubForYou, HubForYouCard, HubOpts, HubOrigins, HubSite } from './types';

// plays, quizzes, groups and series are public reads (plays_select_all): the anon client is enough.
type Db = ReturnType<typeof createPublicReadClient>;

export const FOR_YOU_TTL = 300;
/** Plays of a fandom read to find its players. */
export const COPLAY_MAX_PLAYS = 3000;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export interface PlayInfo {
  readonly quiz_id: string;
  readonly score: number;
  readonly total_questions: number;
  readonly created_at: string;
  readonly site: HubSite;
  readonly group_id: number;
  readonly difficulty: string;
}

/** The group or series played the most (ties go to the most recent play). `plays` is newest first. */
export function topFandom(plays: readonly PlayInfo[]): { site: HubSite; groupId: number } | null {
  const counts = new Map<string, { site: HubSite; groupId: number; n: number; first: number }>();
  plays.forEach((p, i) => {
    const k = `${p.site}:${p.group_id}`;
    const c = counts.get(k);
    if (c) c.n += 1;
    else counts.set(k, { site: p.site, groupId: p.group_id, n: 1, first: i });
  });
  const best = [...counts.values()].sort((a, b) => b.n - a.n || a.first - b.first)[0];
  return best ? { site: best.site, groupId: best.groupId } : null;
}

/** Target difficulty: one step harder from 80% on average, one easier under 50%, else the last quiz's own. */
export function targetDifficulty(plays: readonly PlayInfo[]): { target: string; avgPct: number } | null {
  const recent = plays.slice(0, 10);
  const last = recent[0];
  if (!last) return null;
  const avg = recent.reduce((sum, p) => sum + (p.total_questions > 0 ? p.score / p.total_questions : 0), 0) / recent.length;
  const at = Math.max(0, DIFFICULTIES.indexOf(last.difficulty as (typeof DIFFICULTIES)[number]));
  const step = avg >= 0.8 ? 1 : avg < 0.5 ? -1 : 0;
  return { target: DIFFICULTIES[Math.min(2, Math.max(0, at + step))]!, avgPct: Math.round(avg * 100) };
}

/** The unplayed quiz closest to the target difficulty, best quality first among equals. */
export function pickNext(unplayed: readonly QuizRow[], target: string, tiers: ReadonlyMap<number, string>): QuizRow | null {
  const want = DIFFICULTIES.indexOf(target as (typeof DIFFICULTIES)[number]);
  const ranked = rankByQuality(unplayed, tiers);
  const dist = (q: QuizRow): number => Math.abs(DIFFICULTIES.indexOf(q.difficulty as (typeof DIFFICULTIES)[number]) - want);
  // stable: ranked order is kept among equal distances
  return ranked.map((q, i) => ({ q, i })).sort((a, b) => dist(a.q) - dist(b.q) || a.i - b.i)[0]?.q ?? null;
}

/** Groups of the other site played by at least `min` of the players, most shared first. */
export function topCoPlay(rows: readonly { player_id: string; group_id: number }[], min: number = MIN_COMMON): Array<{ groupId: number; players: number }> {
  const sets = new Map<number, Set<string>>();
  for (const r of rows) {
    const s = sets.get(r.group_id) ?? new Set<string>();
    s.add(r.player_id);
    sets.set(r.group_id, s);
  }
  return [...sets.entries()].map(([groupId, s]) => ({ groupId, players: s.size })).filter((g) => g.players >= min).sort((a, b) => b.players - a.players || a.groupId - b.groupId);
}

/** The easiest, best rated unplayed quiz of a group (a first step into a new fandom). */
export function pickFirstStep(group: readonly QuizRow[], tiers: ReadonlyMap<number, string>): QuizRow | null {
  const order = (q: QuizRow): number => Math.max(0, DIFFICULTIES.indexOf(q.difficulty as (typeof DIFFICULTIES)[number]));
  return rankByQuality(group, tiers).map((q, i) => ({ q, i })).sort((a, b) => order(a.q) - order(b.q) || a.i - b.i)[0]?.q ?? null;
}

interface PlayRow {
  readonly quiz_id: string;
  readonly score: number;
  readonly total_questions: number;
  readonly created_at: string;
  readonly quizzes: { site_id: string; group_id: number; difficulty: string } | Array<{ site_id: string; group_id: number; difficulty: string }> | null;
}

export async function loadPlays(db: Db, userId: string): Promise<PlayInfo[]> {
  const res = await db.from('plays').select('quiz_id, score, total_questions, created_at, quizzes!inner(site_id, group_id, difficulty)')
    .eq('player_id', userId).order('created_at', { ascending: false }).range(0, 999);
  if (res.error) throw new Error(`plays: ${res.error.message}`);
  const out: PlayInfo[] = [];
  for (const r of (res.data ?? []) as unknown as PlayRow[]) {
    const q = Array.isArray(r.quizzes) ? r.quizzes[0] : r.quizzes;
    if (!q || (q.site_id !== 'kpop' && q.site_id !== 'anime')) continue;
    out.push({ quiz_id: r.quiz_id, score: r.score, total_questions: r.total_questions, created_at: r.created_at, site: q.site_id, group_id: q.group_id, difficulty: q.difficulty });
  }
  return out;
}

/** How many passport players play a group of the other site, among the players of this fandom (capped at 3000 players). */
export async function coPlayRows(db: Db, groupId: number, other: HubSite): Promise<Array<{ player_id: string; group_id: number }>> {
  // One query, newest plays first, never more than 3000 rows (not the whole history of the group).
  const mineRes = await db.from('plays').select('player_id, quizzes!inner(group_id)').eq('quizzes.group_id', groupId).not('player_id', 'is', null)
    .order('created_at', { ascending: false }).limit(COPLAY_MAX_PLAYS);
  if (mineRes.error) throw new Error(`plays: ${mineRes.error.message}`);
  const players = [...new Set(((mineRes.data ?? []) as Array<{ player_id: string }>).map((r) => r.player_id))];
  const out: Array<{ player_id: string; group_id: number }> = [];
  for (const part of chunk(players, 100)) {
    const rows = await fetchAllRows<{ player_id: string; quizzes: { group_id: number } | Array<{ group_id: number }> | null }>(() =>
      db.from('plays').select('player_id, quizzes!inner(group_id, site_id)').in('player_id', part).eq('quizzes.site_id', other).order('id'));
    for (const r of rows) {
      const q = Array.isArray(r.quizzes) ? r.quizzes[0] : r.quizzes;
      if (q) out.push({ player_id: r.player_id, group_id: q.group_id });
    }
  }
  return out;
}

export interface ForYouDeps {
  readonly db: Db;
  /** Passport players who play both: groups of the other site with their player counts (cached per fandom). */
  readonly coPlay: (groupId: number, other: HubSite) => Promise<Array<{ groupId: number; players: number }>>;
}

export async function readForYou(origins: HubOrigins, now: Date, userId: string, deps: ForYouDeps): Promise<HubForYou | null> {
  const { db } = deps;
  const plays = await loadPlays(db, userId);
  const fandom = topFandom(plays);
  if (!fandom) return null;
  const other: HubSite = fandom.site === 'kpop' ? 'anime' : 'kpop';
  const [mine, theirs, tiers] = await Promise.all([loadCatalog(db, fandom.site), loadCatalog(db, other), loadTiers(db)]);
  const playedIds = new Set(plays.map((p) => p.quiz_id));
  const groupRows = mine.filter((q) => q.group_id === fandom.groupId);
  const sample = groupRows[0];
  if (!sample) return null;
  const { name: groupName, slug: groupSlug } = groupOf(sample);

  const cards: HubForYouCard[] = [];

  // Next in your fandom
  const there = plays.filter((p) => p.group_id === fandom.groupId && p.site === fandom.site);
  const adapt = targetDifficulty(there);
  const next = adapt ? pickNext(groupRows.filter((q) => !playedIds.has(q.id)), adapt.target, tiers) : null;
  if (next && adapt) {
    cards.push({
      kind: 'next',
      card: toCard(next, origins, now),
      eyebrow: `Next for a ${groupName} fan`,
      meta: `${difficultyLabel(next.difficulty)} · you averaged ${adapt.avgPct}% on ${groupName}`,
    });
  }

  // The bridge to the other site: passport count, else hand-picked pair, else the best easy quiz.
  const unplayedOther = theirs.filter((q) => !playedIds.has(q.id));
  let bridge: { row: QuizRow; via: 'passport' | 'editorial' | 'start-easy' } | null = null;
  const common = await deps.coPlay(fandom.groupId, other).catch(() => []);
  for (const c of common) {
    const row = pickFirstStep(unplayedOther.filter((q) => q.group_id === c.groupId), tiers);
    if (row) { bridge = { row, via: 'passport' }; break; }
  }
  if (!bridge) {
    const pairs = BRIDGE_PAIRS.filter((p) => (fandom.site === 'kpop' ? p.kpop === groupSlug : p.anime === groupSlug));
    for (const p of pairs) {
      const target = fandom.site === 'kpop' ? p.anime : p.kpop;
      const row = pickFirstStep(unplayedOther.filter((q) => groupOf(q).slug === target), tiers);
      if (row) { bridge = { row, via: 'editorial' }; break; }
    }
  }
  if (!bridge) {
    const row = bestEasy(unplayedOther, tiers);
    if (row) bridge = { row, via: 'start-easy' };
  }
  if (bridge) {
    const c = toCard(bridge.row, origins, now);
    cards.push({
      kind: 'bridge',
      card: c,
      eyebrow: bridge.via === 'start-easy' ? `Try ${siteName(other)}` : `${groupName} fans also play`,
      meta: `${difficultyLabel(bridge.row.difficulty)} · same account, nothing to sign up for`,
      via: bridge.via,
    });
  }
  if (cards.length === 0) return null;
  return { cards, fandom: { site: fandom.site, name: groupName, slug: groupSlug } };
}

const coPlayCached = hubCached('co-play', async (groupId: number, other: HubSite) =>
  topCoPlay(await coPlayRows(createPublicReadClient(), groupId, other)));

const cached = hubCached(
  'for-you',
  (origins: HubOrigins, userId: string) =>
    readForYou(origins, new Date(), userId, { db: createPublicReadClient(), coPlay: async (g, o) => (await coPlayCached(g, o)) ?? [] }),
  FOR_YOU_TTL,
);

export interface ForYouOpts extends HubOpts {
  /** The signed-in fan, checked by the caller (a cookie session). */
  readonly userId: string | null | undefined;
}

/** For you, for a signed-in fan; null for a guest, a fan with no play, or any failure. Cached 5 minutes per fan (tag hub:for-you). */
export async function getForYou(opts: ForYouOpts): Promise<HubForYou | null> {
  if (!opts.userId) return null;
  return cached(resolveOrigins(opts), opts.userId);
}
