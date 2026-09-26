// Server reads of the v11 leaderboard (P9). Every read is PUBLIC and cookie-free
// (the anon client of the live queries), cached, so /leaderboard stays static/ISR
// (verse-laws 6). The boards and the community blocks use the SAME queries, sizes
// and gates as the live page (components/community/community-content.tsx), so the
// flag-on page serves every link of the flag-off one (COMMON done-when 5) and
// nothing here is a sample: every number is a real aggregate.
//
// Callers wrap each read in safeFetch: a DB blip empties a section, it never 500s
// the page. A read that fails inside unstable_cache THROWS (must), so a transient
// error is never cached for the TTL (P1's lesson).

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import {
  getCommunityComments, getFandomWarMap, getHappeningNow, getLatestBadgeEarns, getRisingCreators, getTodayStats,
} from '@/lib/db/queries/community';
import { getTopCreatorsAllTime, getTopCreatorsThisWeek } from '@/lib/db/queries/profiles';
import { getNewQuizzes } from '@/lib/db/queries/quizzes';
import { createPublicReadClient } from '@/lib/supabase/server';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { getHomeQotd } from '@/lib/ux-v1/p1/home-data';
import { groupInitials, pickedOnLabel } from '@/lib/ux-v1/p1/format';

import {
  CREATORS_BOARD, MIN_BOARD, PLAYERS_BOARD, WAR_BOARD, avatarOf, fandomLabel, levelLine, quizzesLabel, realFandomName,
} from './format';

import type { PersonCardData } from '@/components/profile/person-card';
import type { TodayStats } from '@/lib/db/queries/community';
import type { AvatarView } from './format';

/** The live page's data TTL (community-content.tsx: unstable_cache revalidate 300). */
const TTL = 300;
/** getGroupWarRank's board size: the pinned fandom row and the page read the same cache entry. */
export const WAR_READ = 90;

function must<T extends { error: { message: string } | null }>(res: T, what: string): T {
  if (res.error) throw new Error(`[ux-leaderboard] ${what}: ${res.error.message}`);
  return res;
}

/* ------------------------------------------------------------- groups --- */

export interface GroupFacts {
  slug: string;
  name: string;
  fandom_name: string | null;
  generation: string | null;
}

async function readGroupFacts(): Promise<GroupFacts[]> {
  const db = createPublicReadClient();
  const res = must(await db.from('groups').select('slug, name, fandom_name, generation'), 'groups');
  return (res.data ?? []) as GroupFacts[];
}

/** slug, name, fandom name and generation of every group (tens of rows). */
export const getGroupFacts = unstable_cache(readGroupFacts, ['ux-v1:p9:group-facts:v1'], { revalidate: CACHE_TTL.stats, tags: ['groups'] });

/** Main fandom label of a fan (ult_groups[0]): "STAY", or null (no main group, or a fandom without a name). */
export function mainFandomName(ultGroups: unknown, facts: ReadonlyMap<string, GroupFacts>): string | null {
  const slug = Array.isArray(ultGroups) && typeof ultGroups[0] === 'string' ? ultGroups[0] : null;
  if (!slug) return null;
  const g = facts.get(slug);
  return g ? realFandomName(g.fandom_name) : null;
}

/* --------------------------------------------------------- fandom war --- */

export interface WarRow {
  rank: number;
  slug: string;
  href: string;
  /** Fandom name (ARMY), or the group when the fandom has no name. */
  name: string;
  /** Group name (BTS), or the generation, else empty. */
  sub: string;
  group: string;
  /** Points = quiz plays on the group's quizzes in the last 7 days (1 play, 1 point). */
  points: number;
  /** Distinct signed-in players in the last 7 days. */
  fans: number;
  /** Percent change of points against the 7 days before (null = none the week before). */
  delta: number | null;
  photo: string | null;
  initials: string;
}

/** The fandom war board: the live war map (last 7 days of quiz plays per group, the
 *  general K-pop bucket excluded), top WAR_BOARD, with fandom names and group photos. */
export async function readWarBoard(): Promise<WarRow[]> {
  const [board, facts] = await Promise.all([getFandomWarMap(WAR_READ), getGroupFacts()]);
  const bySlug = new Map(facts.map((g) => [g.slug, g]));
  return board.slice(0, WAR_BOARD).map((g, i) => {
    const f = bySlug.get(g.slug);
    const label = fandomLabel({ name: g.name, fandom_name: f?.fandom_name ?? null, generation: g.generation ?? f?.generation ?? null });
    return {
      rank: i + 1,
      slug: g.slug,
      href: `/${g.slug}-quiz`,
      name: label.name,
      sub: label.sub,
      group: g.name,
      points: g.plays,
      fans: g.fans,
      delta: g.delta,
      photo: groupPhotoUrl(g.slug),
      initials: groupInitials(g.name),
    };
  });
}

/* ------------------------------------------------------------ people --- */

export interface PersonRow {
  rank: number;
  username: string;
  href: string;
  avatar: AvatarView;
  accent: string | null;
  font: string | null;
  bias: string | null;
  /** The board's number: XP, plays or new followers. */
  value: number;
  /** "Lv 17 · Ride-or-Die", "46 quizzes". */
  sub: string;
}

const PLAYER_COLS = 'username, avatar_url, avatar_kind, avatar_ref, xp, ult_groups, name_accent, name_font, bias';

interface PlayerDbRow {
  username: string;
  avatar_url: string | null;
  avatar_kind: string | null;
  avatar_ref: string | null;
  xp: number;
  ult_groups: string[] | null;
  name_accent: string | null;
  name_font: string | null;
  bias: string | null;
}

async function readTopPlayersRows(limit: number): Promise<PlayerDbRow[]> {
  const db = createPublicReadClient();
  // Same filter and order as the live Legends board (getTopPlayersByXp), plus the
  // fan's main group for the "Lv 9 · STAY" line.
  const res = must(await db.from('profiles').select(PLAYER_COLS).gt('xp', 0).order('xp', { ascending: false }).limit(limit), 'players');
  return (res.data ?? []) as PlayerDbRow[];
}

const getTopPlayersRows = unstable_cache(readTopPlayersRows, ['ux-v1:p9:players:v1'], { revalidate: TTL, tags: ['profiles'] });

/** Players: all-time XP (the XP that sets the passport level), top PLAYERS_BOARD. */
export async function readPlayers(): Promise<PersonRow[]> {
  const [rows, facts] = await Promise.all([getTopPlayersRows(PLAYERS_BOARD), getGroupFacts()]);
  const bySlug = new Map(facts.map((g) => [g.slug, g]));
  return rows.map((p, i) => ({
    rank: i + 1,
    username: p.username,
    href: `/u/${encodeURIComponent(p.username)}`,
    avatar: avatarOf(p),
    accent: p.name_accent,
    font: p.name_font,
    bias: p.bias,
    value: p.xp ?? 0,
    sub: levelLine(p.xp ?? 0, mainFandomName(p.ult_groups, bySlug)),
  }));
}

export type CreatorsView = 'all' | 'week' | 'rising';

export interface CreatorsBoards {
  /** Plays received by every published quiz of the creator, all time. */
  all: PersonRow[];
  /** Plays of the quizzes the creator published in the last 7 days (live "This week"). */
  week: PersonRow[];
  /** New followers in the last 7 days (live "Rising"). */
  rising: PersonRow[];
}

interface ProfileLike {
  username: string;
  avatar_url: string | null;
  avatar_kind: string | null;
  avatar_ref: string | null;
  name_accent: string | null;
  name_font: string | null;
  bias: string | null;
}

function creatorRow(p: ProfileLike, i: number, value: number, sub: string): PersonRow {
  return {
    rank: i + 1,
    username: p.username,
    href: `/u/${encodeURIComponent(p.username)}`,
    avatar: avatarOf(p),
    accent: p.name_accent,
    font: p.name_font,
    bias: p.bias,
    value,
    sub,
  };
}

function personToLike(p: PersonCardData): ProfileLike {
  return {
    username: p.username,
    avatar_url: p.avatarUrl,
    avatar_kind: p.avatarKind ?? null,
    avatar_ref: p.avatarRef ?? null,
    name_accent: p.nameAccent ?? null,
    name_font: p.nameFont ?? null,
    bias: p.bias ?? null,
  };
}

async function readCreatorsUncached(): Promise<CreatorsBoards> {
  // The live Hall of Fame's three creator reads (it asks for 8; the flag-on board
  // shows 10, a superset in the same order).
  const [all, week, rising] = await Promise.all([
    getTopCreatorsAllTime(CREATORS_BOARD),
    getTopCreatorsThisWeek(CREATORS_BOARD),
    getRisingCreators(CREATORS_BOARD),
  ]);
  return {
    all: all.map((c, i) => creatorRow(c, i, c.total_plays_received ?? 0, quizzesLabel(c.total_quizzes_created ?? 0))),
    week: week.map((c, i) => creatorRow(c, i, c.weekly_plays ?? 0, quizzesLabel(c.total_quizzes_created ?? 0))),
    rising: rising.map((r, i) => creatorRow(personToLike(r.person), i, r.newFollowers, levelLine(r.person.xp ?? 0, null))),
  };
}

export const readCreators = unstable_cache(readCreatorsUncached, ['ux-v1:p9:creators:v1'], { revalidate: TTL, tags: ['profiles'] });

/** The creator views that clear the board floor, in the order the page offers them. */
export function creatorViews(b: CreatorsBoards): CreatorsView[] {
  return (['all', 'week', 'rising'] as const).filter((k) => b[k].length >= MIN_BOARD);
}

/* ------------------------------------------------ around the community --- */

export interface AroundPerson {
  username: string;
  href: string;
  avatar: AvatarView;
  accent: string | null;
  font: string | null;
  bias: string | null;
}

function aroundPerson(p: PersonCardData): AroundPerson {
  const like = personToLike(p);
  return { username: p.username, href: `/u/${encodeURIComponent(p.username)}`, avatar: avatarOf(like), accent: like.name_accent, font: like.name_font, bias: like.bias };
}

export interface AroundData {
  /** Today in numbers (UTC day); null when everything is zero (live TodayStrip rule). */
  today: null | { plays: number; quizzes: number; masters: number; hot: null | { name: string; href: string; photo: string | null; initials: string } };
  /** Quiz of the day (the live daily ritual's pick and link). */
  qotd: null | { title: string; href: string; note: string };
  /** Happening now: shown only when live (4+ events in 48 hours, live MIN_LIVE). */
  happening: Array<{ id: number; person: AroundPerson | null; name: string; phrase: string; href: string | null; ago: string }>;
  /** Newest quizzes: shown only with 3+ published in the last 30 days (live MIN_FRESH). */
  fresh: Array<{ id: string; title: string; href: string; by: string; plays: number; group: string }>;
  /** Latest quiz comments: shown only from 4 (live MIN_COMMENTS). */
  comments: Array<{ id: string; person: AroundPerson; quizTitle: string; quizHref: string; content: string; score: string | null; ago: string }>;
  /** Latest badge earns (30 days, one per badge): shown only from 3 (live MIN_EARNS). */
  badges: Array<{ id: string; badgeId: string; badgeName: string; person: AroundPerson; ago: string }>;
}

const MIN_LIVE = 4;
const MIN_FRESH = 3;
const FRESH_DAYS_MS = 30 * 86_400_000;
const MIN_COMMENTS = 4;
const MIN_EARNS = 3;

// The live feed, comments and badge reads never throw (a failed read returns an
// empty list, exactly as on the live page), so they share one cache entry.
async function readFeedsUncached(): Promise<Pick<AroundData, 'happening' | 'comments' | 'badges'>> {
  const [feed, comments, badges] = await Promise.all([
    getHappeningNow(5),
    getCommunityComments(8),
    getLatestBadgeEarns(6),
  ]);
  const live = feed.recentCount >= MIN_LIVE && feed.events.length > 0;
  return {
    happening: live
      ? feed.events.map((e) => ({ id: e.id, person: e.person ? aroundPerson(e.person) : null, name: e.person?.username ?? e.displayName, phrase: e.phrase, href: e.href, ago: e.ago }))
      : [],
    comments: comments.length >= MIN_COMMENTS
      ? comments.map((c) => ({
        id: c.id,
        person: aroundPerson(c.person),
        quizTitle: c.quizTitle,
        quizHref: `/q/${c.quizSlug}`,
        content: c.content,
        score: c.score !== null && c.total !== null ? `after scoring ${c.score}/${c.total}` : null,
        ago: c.ago,
      }))
      : [],
    badges: badges.length >= MIN_EARNS
      ? badges.map((b) => ({ id: `${b.badgeId}:${b.person.username}`, badgeId: b.badgeId, badgeName: b.badgeName, person: aroundPerson(b.person), ago: b.ago }))
      : [],
  };
}

const readFeedsCached = unstable_cache(readFeedsUncached, ['ux-v1:p9:feeds:v1'], { revalidate: TTL, tags: ['community'] });

// getNewQuizzes throws on a failed read: its own entry, so a blip is never cached.
async function readFreshUncached(): Promise<Array<{ id: string; title: string; slug: string; by: string; plays: number; group: string; createdAt: string }>> {
  const rows = await getNewQuizzes(0, 6);
  return rows.map((q) => ({ id: q.id, title: q.title, slug: q.slug, by: q.creator_username, plays: q.play_count, group: q.group_name, createdAt: q.created_at }));
}

const readFreshCached = unstable_cache(readFreshUncached, ['ux-v1:p9:fresh:v1'], { revalidate: TTL, tags: ['quizzes'] });

/** Newest quizzes, shown only with 3+ published in the last 30 days (live MIN_FRESH). */
export async function readFresh(nowMs: number = Date.now()): Promise<AroundData['fresh']> {
  const rows = (await readFreshCached()).filter((q) => nowMs - new Date(q.createdAt).getTime() <= FRESH_DAYS_MS);
  if (rows.length < MIN_FRESH) return [];
  return rows.map((q) => ({ id: q.id, title: q.title, href: `/q/${q.slug}`, by: q.by, plays: q.plays, group: q.group }));
}

function todayView(t: TodayStats): AroundData['today'] {
  const hot = t.hotGroup ? { name: t.hotGroup.name, href: `/${t.hotGroup.slug}-quiz`, photo: groupPhotoUrl(t.hotGroup.slug), initials: groupInitials(t.hotGroup.name) } : null;
  if (t.playsToday === 0 && t.quizzesToday === 0 && t.mastersToday === 0 && !hot) return null;
  return { plays: t.playsToday, quizzes: t.quizzesToday, masters: t.mastersToday, hot };
}

/** "Quiz of the day", or the truthful replay note while the rotation is stopped (P1 2.5). */
export function qotdNote(featured: string | null, served: string): string {
  if (!featured || featured === served) return 'Quiz of the day';
  const on = pickedOnLabel(featured, served);
  return on === 'yesterday' ? "Quiz of the day · replay of yesterday's pick" : `Quiz of the day · replay of the ${on} pick`;
}

export async function readToday(): Promise<AroundData['today']> {
  return todayView(await getTodayStats());
}

export async function readQotd(): Promise<AroundData['qotd']> {
  const q = await getHomeQotd();
  if (!q) return null;
  return { title: q.title, href: `/q/${q.slug}?daily=quiz`, note: qotdNote(q.featuredDate, q.servedDate) };
}

export async function readFeeds(): Promise<Pick<AroundData, 'happening' | 'comments' | 'badges'>> {
  return readFeedsCached();
}
