import { unstable_cache } from 'next/cache';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { groupPhotoUrl, photoFocal } from '@/lib/ux-v1/a0/group-photos';
import { spaceAssetUrl } from '@/lib/verse/presentation/asset-url';
import { plainTextExcerpt, splitTipTapForFold } from '@/lib/verse/render-content';

import { excerpt, readingMinutes, timeAgo, utcDate } from './format';
import { readPeople } from './people';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedPost, P8Features, P8Group } from './types';

// The /community feed (DESIGN-SPEC 16.7 community, 13.1, 17.7): every post is a real
// row of an existing table, newest first.
//   thread    verse_threads (visible) + its opening post (verse_discussions)
//   blog      verse_essays (featured = public) + verse_essay_reactions + comments
//   debate    past daily debates (daily_debates + debate_votes) that got votes;
//             today's debate lives in the rail (it is votable there)
//   debate    fan debates / challenge posts: pending migration (v11-p8-community.sql),
//             read only once the tables exist (features probe)
// Reads are cookie-free (public client, RLS) except the aggregates over private
// tables (likes and fan votes: service role, counts only). Each source is cached on
// its own and THROWS on a read error, so a DB blip is never baked into the cache;
// the page wraps each one in safeFetch (fail closed to "no posts from that source").

export const FEED_CAP = 60;
const SRC_CAP = 50;
const DEBATE_DAYS = 60;
/** Closed daily debates shown as posts: the last 3 that got votes (one debate a day
 *  would otherwise bury every thread and blog; today's debate is in the rail). */
export const PAST_DEBATES_IN_FEED = 3;

type Db = SupabaseClient;

function must<T extends { error: { message: string } | null }>(r: T, what: string): T {
  if (r.error) throw new Error(`p8 feed ${what}: ${r.error.message}`);
  return r;
}

/* ------------------------------------------------------------------ groups --- */

async function readGroups(): Promise<P8Group[]> {
  const db = createPublicReadClient();
  const { data } = must(await db.from('groups').select('id, name, slug, fandom_name').order('name'), 'groups');
  return ((data ?? []) as { id: number; name: string; slug: string; fandom_name: string | null }[])
    .map((g) => ({ id: g.id, name: g.name, slug: g.slug, fandom: g.fandom_name }));
}

/** Every group (id, name, slug, fandom), 6h cache: the editor's group picker and the post chips. */
export const getP8Groups = unstable_cache(readGroups, ['ux-v1:p8:groups:v1'], { revalidate: 21600, tags: ['community'] });

function groupMap(groups: P8Group[]): Map<number, P8Group> {
  return new Map(groups.map((g) => [g.id, g] as const));
}

/* ------------------------------------------------------------------ likes --- */

/** Heart counts from community_likes (service role, private table), or null per id
 *  when the store is not live. */
async function likeCounts(targetType: string, ids: string[], live: boolean): Promise<Map<string, number> | null> {
  if (!live) return null;
  const out = new Map<string, number>();
  if (!ids.length) return out;
  const svc = createServiceRoleClient();
  const rows = await fetchAllRows<{ target_id: string }>(() => svc.from('community_likes').select('target_id').eq('target_type', targetType).in('target_id', ids));
  for (const r of rows) out.set(r.target_id, (out.get(r.target_id) ?? 0) + 1);
  return out;
}

/* ---------------------------------------------------------------- threads --- */

async function readThreads(live: boolean): Promise<FeedPost[]> {
  const db = createPublicReadClient();
  const groups = groupMap(await getP8Groups());
  const { data } = must(await db.from('verse_threads')
    .select('id, group_id, slug, title, created_by, created_at')
    .eq('status', 'visible').order('created_at', { ascending: false }).limit(SRC_CAP), 'threads');
  const threads = (data ?? []) as { id: number; group_id: number; slug: string; title: string; created_by: string | null; created_at: string }[];
  if (!threads.length) return [];
  const ids = threads.map((t) => t.id);

  // Every visible comment of these threads (paginated past the 1000-row cap): the
  // first one is the opening post, the rest are the replies.
  const comments = await fetchAllRows<{ id: number; thread_id: number; created_at: string }>(() => db.from('verse_discussions')
    .select('id, thread_id, created_at').in('thread_id', ids).eq('status', 'visible').order('created_at', { ascending: true }).order('id', { ascending: true }));
  const first = new Map<number, number>();
  const count = new Map<number, number>();
  for (const c of comments) {
    if (!first.has(c.thread_id)) first.set(c.thread_id, c.id);
    count.set(c.thread_id, (count.get(c.thread_id) ?? 0) + 1);
  }
  const openIds = [...first.values()];
  const bodies = new Map<number, string>();
  if (openIds.length) {
    const { data: ob } = must(await db.from('verse_discussions').select('id, body').in('id', openIds), 'thread bodies');
    for (const r of (ob ?? []) as { id: number; body: string }[]) bodies.set(r.id, r.body);
  }
  const [people, likes] = await Promise.all([
    readPeople(db, threads.map((t) => t.created_by)),
    likeCounts('thread', ids.map(String), live),
  ]);

  return threads.map((t): FeedPost => {
    const g = groups.get(t.group_id) ?? null;
    const openId = first.get(t.id);
    const body = openId !== undefined ? bodies.get(openId) ?? '' : '';
    // A thread's opening post repeats the title when it had no text of its own.
    const ex = body.trim() && body.trim() !== t.title.trim() ? excerpt(body, 220) : null;
    return {
      kind: 'thread', key: String(t.id), href: `/community/thread/${t.id}`,
      title: t.title, excerpt: ex, group: g,
      author: t.created_by ? people.get(t.created_by) ?? null : null,
      at: t.created_at, ago: '',
      replies: Math.max(0, (count.get(t.id) ?? 0) - 1),
      likes: likes ? likes.get(String(t.id)) ?? 0 : null,
    };
  });
}

/* ------------------------------------------------------------------ blogs --- */

/** A blog's cover: the essay's own (a space asset or an album cover), else its
 *  group's photo from public/idols (16.8 fallback), else none (typographic). */
export function blogCover(cover: unknown, groupSlug: string | null): string | null {
  const c = (cover && typeof cover === 'object' ? cover : {}) as { assetPath?: unknown; mbid?: unknown };
  if (typeof c.assetPath === 'string') { const u = spaceAssetUrl(c.assetPath); if (u) return u; }
  if (typeof c.mbid === 'string' && /^[0-9a-f-]{36}$/i.test(c.mbid)) return `https://coverartarchive.org/release-group/${c.mbid}/front-500`;
  return groupPhotoUrl(groupSlug);
}

async function readBlogs(): Promise<FeedPost[]> {
  const db = createPublicReadClient();
  const groups = groupMap(await getP8Groups());
  const { data } = must(await db.from('verse_essays')
    .select('id, group_id, title, author, content, cover, featured_at, created_at')
    .eq('status', 'featured').order('featured_at', { ascending: false, nullsFirst: false }).limit(SRC_CAP), 'essays');
  const essays = (data ?? []) as { id: number; group_id: number; title: string; author: string; content: unknown; cover: unknown; featured_at: string | null; created_at: string }[];
  if (!essays.length) return [];
  const ids = essays.map((e) => e.id);
  const [reactions, comments, people] = await Promise.all([
    fetchAllRows<{ essay_id: number }>(() => db.from('verse_essay_reactions').select('essay_id').in('essay_id', ids)),
    fetchAllRows<{ entity_id: string }>(() => db.from('verse_discussions').select('entity_id').eq('entity_type', 'essay').in('entity_id', ids.map(String)).eq('status', 'visible')),
    readPeople(db, essays.map((e) => e.author)),
  ]);
  const hearts = new Map<number, number>();
  for (const r of reactions) hearts.set(r.essay_id, (hearts.get(r.essay_id) ?? 0) + 1);
  const replies = new Map<string, number>();
  for (const r of comments) replies.set(r.entity_id, (replies.get(r.entity_id) ?? 0) + 1);

  return essays.map((e): FeedPost => {
    const g = groups.get(e.group_id) ?? null;
    return {
      kind: 'blog', key: String(e.id), href: `/community/blog/${e.id}`,
      title: e.title, excerpt: plainTextExcerpt(e.content, 160) || null, group: g,
      author: people.get(e.author) ?? null,
      at: e.featured_at ?? e.created_at, ago: '',
      replies: replies.get(String(e.id)) ?? 0,
      likes: hearts.get(e.id) ?? 0,
      blog: { coverUrl: blogCover(e.cover, g?.slug ?? null), coverFocal: photoFocal(e.title), readingMin: readingMinutes(splitTipTapForFold(e.content).totalWords) },
    };
  });
}

/* ---------------------------------------------------------- daily debates --- */

export interface DailyDebateRow { date: string; question: string; sideA: string; sideB: string; votesA: number; votesB: number; comments: number }

/** Daily debates up to `today` (read only: never ensure_daily_debate, which writes),
 *  with their vote split and reply count. */
export async function readDailyDebates(db: Db, today: string, days = DEBATE_DAYS): Promise<DailyDebateRow[]> {
  const { data } = must(await db.from('daily_debates').select('date, question_id').lte('date', today)
    .order('date', { ascending: false }).limit(days), 'daily_debates');
  const rows = (data ?? []) as { date: string; question_id: string }[];
  if (!rows.length) return [];
  const { data: qs } = must(await db.from('debate_questions').select('id, question, side_a, side_b').in('id', rows.map((r) => r.question_id)), 'debate_questions');
  const qById = new Map(((qs ?? []) as { id: string; question: string; side_a: string; side_b: string }[]).map((q) => [q.id, q] as const));
  const votes = await fetchAllRows<{ date: string; side: string; comment: string | null }>(() => db.from('debate_votes')
    .select('date, side, comment').in('date', rows.map((r) => r.date)));
  const split = new Map<string, { a: number; b: number; c: number }>();
  for (const v of votes) {
    const s = split.get(v.date) ?? { a: 0, b: 0, c: 0 };
    if (v.side === 'a') s.a++; else s.b++;
    if (v.comment && v.comment.trim()) s.c++;
    split.set(v.date, s);
  }
  return rows.map((r) => {
    const q = qById.get(r.question_id);
    if (!q) return null;
    const s = split.get(r.date) ?? { a: 0, b: 0, c: 0 };
    return { date: r.date, question: q.question, sideA: q.side_a, sideB: q.side_b, votesA: s.a, votesB: s.b, comments: s.c };
  }).filter((x): x is DailyDebateRow => x !== null);
}

/** The next UTC midnight after a debate day: when its votes close. */
export function dailyClosesAt(date: string): string {
  const t = Date.parse(`${date}T00:00:00Z`) + 24 * 3600_000;
  return new Date(t).toISOString();
}

async function readDebatePosts(live: boolean, today: string): Promise<FeedPost[]> {
  const db = createPublicReadClient();
  const groups = await getP8Groups();
  const general = groups.find((g) => g.slug === 'general-kpop') ?? null;
  const past = (await readDailyDebates(db, today)).filter((d) => d.date < today && d.votesA + d.votesB > 0).slice(0, PAST_DEBATES_IN_FEED);
  const likes = await likeCounts('daily_debate', past.map((d) => d.date), live);
  return past.map((d): FeedPost => ({
    kind: 'debate', key: d.date, href: `/community/debate/${d.date}`,
    title: d.question, excerpt: null, group: general, author: null,
    at: `${d.date}T00:00:00.000Z`, ago: '',
    replies: d.comments,
    likes: likes ? likes.get(d.date) ?? 0 : null,
    debate: {
      daily: true, open: false, closesAt: dailyClosesAt(d.date), comments: d.comments,
      options: [{ label: d.sideA, votes: d.votesA }, { label: d.sideB, votes: d.votesB }],
      total: d.votesA + d.votesB,
    },
  }));
}

/* ------------------------------------------- fan debates + challenges (pending) --- */

async function readFanDebates(live: P8Features): Promise<FeedPost[]> {
  if (!live.fanDebates) return [];
  const db = createPublicReadClient();
  const svc = createServiceRoleClient();
  const groups = groupMap(await getP8Groups());
  const { data } = must(await db.from('community_debates').select('id, group_id, author, question, body, options, closes_at, created_at')
    .eq('status', 'visible').order('created_at', { ascending: false }).limit(SRC_CAP), 'community_debates');
  const rows = (data ?? []) as { id: number; group_id: number | null; author: string | null; question: string; body: string | null; options: unknown; closes_at: string; created_at: string }[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [votes, replies, people, likes] = await Promise.all([
    fetchAllRows<{ debate_id: number; option_index: number }>(() => svc.from('community_debate_votes').select('debate_id, option_index').in('debate_id', ids)),
    fetchAllRows<{ target_id: number }>(() => db.from('community_replies').select('target_id').eq('target_type', 'debate').in('target_id', ids).eq('status', 'visible')),
    readPeople(db, rows.map((r) => r.author)),
    likeCounts('debate', ids.map(String), live.likes),
  ]);
  const now = Date.now();
  return rows.map((r): FeedPost => {
    const labels = (Array.isArray(r.options) ? r.options : []).map((o) => String(o)).slice(0, 4);
    const counts = labels.map((_l, i) => votes.filter((v) => v.debate_id === r.id && v.option_index === i).length);
    const nReplies = replies.filter((x) => x.target_id === r.id).length;
    return {
      kind: 'debate', key: String(r.id), href: `/community/debate/${r.id}`,
      title: r.question, excerpt: r.body ? excerpt(r.body, 220) : null,
      group: r.group_id ? groups.get(r.group_id) ?? null : null,
      author: r.author ? people.get(r.author) ?? null : null,
      at: r.created_at, ago: '', replies: nReplies,
      likes: likes ? likes.get(String(r.id)) ?? 0 : null,
      debate: {
        daily: false, open: Date.parse(r.closes_at) > now, closesAt: r.closes_at, comments: nReplies,
        options: labels.map((label, i) => ({ label, votes: counts[i] ?? 0 })),
        total: counts.reduce((s, c) => s + c, 0),
      },
    };
  });
}

async function readChallengePosts(live: P8Features): Promise<FeedPost[]> {
  if (!live.challenges) return [];
  const db = createPublicReadClient();
  const groups = groupMap(await getP8Groups());
  const { data } = must(await db.from('community_challenges').select('id, author, quiz_id, group_id, score, total, message, created_at')
    .eq('status', 'visible').order('created_at', { ascending: false }).limit(SRC_CAP), 'community_challenges');
  const rows = (data ?? []) as { id: number; author: string | null; quiz_id: string; group_id: number | null; score: number; total: number; message: string | null; created_at: string }[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [quizzesRes, replies, people, likes] = await Promise.all([
    db.from('quizzes').select('id, slug, title, quiz_type, difficulty, play_count, cover_image_url').in('id', [...new Set(rows.map((r) => r.quiz_id))]).eq('status', 'published'),
    fetchAllRows<{ target_id: number; author: string | null }>(() => db.from('community_replies').select('target_id, author').eq('target_type', 'challenge').in('target_id', ids).eq('status', 'visible').order('created_at', { ascending: true })),
    readPeople(db, rows.map((r) => r.author)),
    likeCounts('challenge', ids.map(String), live.likes),
  ]);
  const quizById = new Map(((must(quizzesRes, 'challenge quizzes').data ?? []) as { id: string; slug: string; title: string; quiz_type: string | null; difficulty: string | null; play_count: number | null; cover_image_url: string | null }[]).map((q) => [q.id, q] as const));
  const scores = await replyScores(db, rows, replies);
  return rows.map((r): FeedPost | null => {
    const q = quizById.get(r.quiz_id);
    if (!q) return null; // the quiz is gone or unpublished: no dead challenge
    const mine = replies.filter((x) => x.target_id === r.id);
    const sc = scores.get(r.id) ?? [];
    return {
      kind: 'challenge', key: String(r.id), href: `/community/challenge/${r.id}`,
      title: `Beat my ${r.score}/${r.total} on ${q.title}`, excerpt: r.message ? excerpt(r.message, 220) : null,
      group: r.group_id ? groups.get(r.group_id) ?? null : null,
      author: r.author ? people.get(r.author) ?? null : null,
      at: r.created_at, ago: '', replies: mine.length,
      likes: likes ? likes.get(String(r.id)) ?? 0 : null,
      challenge: {
        score: r.score, total: r.total,
        quiz: { slug: q.slug, title: q.title, type: q.quiz_type, difficulty: q.difficulty, plays: q.play_count ?? 0, coverUrl: q.cover_image_url },
        replyScores: sc.slice(0, 3), moreReplies: Math.max(0, sc.length - 3),
      },
    };
  }).filter((p): p is FeedPost => p !== null);
}

/** "8/8 hanjisung_fan" chips: each replier's best score on the challenged quiz
 *  (plays), best first. Only repliers who actually played it get a chip. */
async function replyScores(db: Db, rows: { id: number; quiz_id: string }[], replies: { target_id: number; author: string | null }[]): Promise<Map<number, { score: string; name: string }[]>> {
  const out = new Map<number, { score: string; name: string }[]>();
  const authors = [...new Set(replies.map((r) => r.author).filter((a): a is string => !!a))];
  if (!authors.length) return out;
  const quizIds = [...new Set(rows.map((r) => r.quiz_id))];
  const plays = await fetchAllRows<{ quiz_id: string; player_id: string; score: number; total_questions: number }>(() => db.from('plays')
    .select('quiz_id, player_id, score, total_questions').in('quiz_id', quizIds).in('player_id', authors));
  const people = await readPeople(db, authors);
  for (const r of rows) {
    const seen = new Set<string>();
    const list: { pct: number; score: string; name: string }[] = [];
    for (const rep of replies.filter((x) => x.target_id === r.id)) {
      if (!rep.author || seen.has(rep.author)) continue;
      seen.add(rep.author);
      const best = plays.filter((p) => p.quiz_id === r.quiz_id && p.player_id === rep.author && p.total_questions > 0)
        .sort((a, b) => b.score / b.total_questions - a.score / a.total_questions)[0];
      if (!best) continue;
      const person = people.get(rep.author);
      list.push({ pct: best.score / best.total_questions, score: `${best.score}/${best.total_questions}`, name: person?.username ?? person?.name ?? 'a fan' });
    }
    out.set(r.id, list.sort((a, b) => b.pct - a.pct).map(({ score, name }) => ({ score, name })));
  }
  return out;
}

/* ------------------------------------------------------------------- feed --- */

const cachedThreads = unstable_cache((live: boolean) => readThreads(live), ['ux-v1:p8:threads:v1'], { revalidate: 120, tags: ['community'] });
const cachedBlogs = unstable_cache(() => readBlogs(), ['ux-v1:p8:blogs:v1'], { revalidate: 120, tags: ['community'] });
const cachedDebates = unstable_cache((live: boolean, today: string) => readDebatePosts(live, today), ['ux-v1:p8:debates:v2'], { revalidate: 120, tags: ['community'] });
const cachedFanDebates = unstable_cache((f: P8Features) => readFanDebates(f), ['ux-v1:p8:fan-debates:v1'], { revalidate: 120, tags: ['community'] });
const cachedChallenges = unstable_cache((f: P8Features) => readChallengePosts(f), ['ux-v1:p8:challenges:v1'], { revalidate: 120, tags: ['community'] });

export interface FeedSources {
  threads: Promise<FeedPost[]>;
  blogs: Promise<FeedPost[]>;
  debates: Promise<FeedPost[]>;
  fanDebates: Promise<FeedPost[]>;
  challenges: Promise<FeedPost[]>;
}

/** The five sources (each cached, each throws on a read error: wrap in safeFetch). */
export function feedSources(f: P8Features, now: number = Date.now()): FeedSources {
  const today = utcDate(now);
  return {
    threads: cachedThreads(f.likes),
    blogs: cachedBlogs(),
    debates: cachedDebates(f.likes, today),
    fanDebates: cachedFanDebates(f),
    challenges: cachedChallenges(f),
  };
}

/** Merge, newest first, cap, and stamp the server-time "ago" (never recomputed on
 *  the client, so hydration matches). */
export function mergeFeed(lists: FeedPost[][], now: number = Date.now(), cap = FEED_CAP): FeedPost[] {
  const t = (p: FeedPost): number => { const v = Date.parse(p.at); return Number.isFinite(v) ? v : 0; };
  return lists.flat()
    .sort((a, b) => t(b) - t(a) || a.kind.localeCompare(b.kind) || b.key.localeCompare(a.key))
    .slice(0, cap)
    .map((p) => ({ ...p, ago: timeAgo(p.at, now) }));
}
