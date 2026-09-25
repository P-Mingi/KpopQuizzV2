// Server reads for the v11 home (P1). Every read here is PUBLIC and cookie-free
// (anon client, or the service role for server-only admin data), wrapped in
// unstable_cache, so the home stays static/ISR (verse-laws 6). Callers wrap each
// read in safeFetch: a DB blip hides a section, it never 500s the page. Real data
// only (worker rule 7): nothing here is a sample; every count is a real count.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { getBrowseQuizzes } from '@/lib/db/queries/quizzes';
import { getPopularQuizzes } from '@/lib/db/queries/popular';
import { addDays, qotdRotationFixEnabled } from '@/lib/quiz-bank-scheduling';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { getEssayPage } from '@/lib/verse/essays';
import { listThreads } from '@/lib/verse/threads';

import { aboutMinutes, averagePct, comma, groupInitials, isVisibleGroupSlug, meanRunSeconds, utcDay } from './format';

import type { QuizCardData } from '@/lib/db/types';

/* ---------------------------------------------------------------- QOTD --- */

export interface HomeQotd {
  id: string;
  slug: string;
  title: string;
  quizType: string;
  difficulty: string;
  questionCount: number;
  /** Real average score in % (null under 3 completions). */
  averagePct: number | null;
  /** "about 3 min" from quiz_time_stats (null when there is no timing yet). */
  time: string | null;
  /** The day it was the quiz of the day (qotd_log / quiz_of_the_day_date). */
  featuredDate: string;
  /** UTC day of this read. fresh = featuredDate === servedDate. */
  servedDate: string;
  /** A new pick is expected at the next UTC midnight (rotation fix on, or a bank row dated tomorrow). */
  rotates: boolean;
}

async function readQotd(today: string): Promise<HomeQotd | null> {
  const db = createPublicReadClient();
  const [logRes, flagRes] = await Promise.all([
    db.from('qotd_log').select('quiz_id, featured_date').lte('featured_date', today)
      .order('featured_date', { ascending: false }).limit(3),
    db.from('quizzes').select('id, quiz_of_the_day_date').eq('status', 'published').eq('is_quiz_of_the_day', true)
      .lte('quiz_of_the_day_date', today).order('quiz_of_the_day_date', { ascending: false }).limit(3),
  ]);
  const picks: { id: string; date: string }[] = [
    ...((logRes.data ?? []) as { quiz_id: string; featured_date: string }[]).map((r) => ({ id: r.quiz_id, date: r.featured_date })),
    ...((flagRes.data ?? []) as { id: string; quiz_of_the_day_date: string }[]).map((r) => ({ id: r.id, date: r.quiz_of_the_day_date })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  if (picks.length === 0) return null;

  for (const pick of picks) {
    const { data } = await db.from('quizzes')
      .select('id, slug, title, quiz_type, difficulty, question_count, total_score_sum, total_completions')
      .eq('id', pick.id).eq('status', 'published').maybeSingle();
    const q = data as {
      id: string; slug: string; title: string; quiz_type: string; difficulty: string;
      question_count: number; total_score_sum: number; total_completions: number;
    } | null;
    if (!q) continue; // unpublished since: try the previous pick

    const [{ data: stats }, rotates] = await Promise.all([
      db.from('quiz_time_stats').select('attempt_count, avg_time_seconds, total_questions').eq('quiz_id', q.id).limit(200),
      nextRotationExpected(today),
    ]);
    return {
      id: q.id,
      slug: q.slug,
      title: q.title,
      quizType: q.quiz_type,
      difficulty: q.difficulty,
      questionCount: q.question_count ?? 0,
      averagePct: averagePct(q.total_score_sum ?? 0, q.total_completions ?? 0, q.question_count ?? 0),
      time: aboutMinutes(meanRunSeconds((stats ?? []) as { attempt_count: number; avg_time_seconds: number; total_questions: number }[], q.question_count)),
      featuredDate: pick.date,
      servedDate: today,
      rotates,
    };
  }
  return null;
}

/** True when tomorrow will get a new quiz of the day: the rotation fix is on, or
 *  a verified/scheduled bank row is dated tomorrow (today's cron behaviour). */
async function nextRotationExpected(today: string): Promise<boolean> {
  if (qotdRotationFixEnabled()) return true;
  try {
    const db = createServiceRoleClient();
    const { count } = await db.from('quiz_bank').select('id', { count: 'exact', head: true })
      .eq('scheduled_date', addDays(today, 1)).in('status', ['verified', 'scheduled']);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

const readQotdCached = unstable_cache(readQotd, ['ux-v1:p1:qotd:v1'], { revalidate: CACHE_TTL.stats, tags: ['quizzes'] });

/** The current quiz of the day: the latest one stored (qotd_log or the quizzes
 *  flag) on or before today. When rotation is stopped this is an OLD pick, and the
 *  UI says so (featuredDate), it never pretends it is today's. */
export function getHomeQotd(now: Date = new Date()): Promise<HomeQotd | null> {
  return readQotdCached(utcDay(now));
}

/* ---------------------------------------------------------- groups rail --- */

export interface RailGroup {
  slug: string;
  name: string;
  photo: string | null;
  initials: string;
  /** Published quizzes of the group (not groups.quiz_count, which is stale). */
  quizzes: number;
  /** Shown with "New quiz" (a quiz published in the last 14 days). */
  isNew: boolean;
}

export interface HomeGroups { groups: RailGroup[]; visibleGroups: number }

/** Catch-all bucket, not a group (never in a group rail). */
const NOT_A_GROUP = new Set(['general-kpop']);
const RAIL_TOP = 8;
const RAIL_SIZE = 10;
const NEW_DAYS = 14;

async function readGroups(): Promise<HomeGroups> {
  const db = createPublicReadClient();
  const [rows, groupsRes] = await Promise.all([
    fetchAllRows<{ group_id: number | null; play_count: number; created_at: string }>(
      () => db.from('quizzes').select('group_id, play_count, created_at').eq('status', 'published').order('id'),
    ),
    db.from('groups').select('id, slug, name'),
  ]);
  const groups = ((groupsRes.data ?? []) as { id: number; slug: string; name: string }[]).filter((g) => isVisibleGroupSlug(g.slug));
  const stats = new Map<number, { quizzes: number; plays: number; newest: string }>();
  for (const r of rows) {
    if (r.group_id == null) continue;
    const s = stats.get(r.group_id) ?? { quizzes: 0, plays: 0, newest: '' };
    s.quizzes += 1;
    s.plays += r.play_count ?? 0;
    if (r.created_at > s.newest) s.newest = r.created_at;
    stats.set(r.group_id, s);
  }
  const playable = groups
    .filter((g) => !NOT_A_GROUP.has(g.slug) && (stats.get(g.id)?.quizzes ?? 0) > 0)
    .map((g) => ({ g, s: stats.get(g.id)! }));
  const byPlays = [...playable].sort((a, b) => b.s.plays - a.s.plays || a.g.name.localeCompare(b.g.name));
  const top = byPlays.slice(0, RAIL_TOP);
  const inTop = new Set(top.map((x) => x.g.id));
  const since = new Date(Date.now() - NEW_DAYS * 86_400_000).toISOString();
  const fresh = playable
    .filter((x) => !inTop.has(x.g.id) && x.s.newest >= since)
    .sort((a, b) => b.s.newest.localeCompare(a.s.newest))
    .slice(0, RAIL_SIZE - top.length);
  const fill = byPlays.filter((x) => !inTop.has(x.g.id) && !fresh.includes(x)).slice(0, RAIL_SIZE - top.length - fresh.length);
  const toRail = (x: { g: { slug: string; name: string }; s: { quizzes: number } }, isNew: boolean): RailGroup => ({
    slug: x.g.slug, name: x.g.name, photo: groupPhotoUrl(x.g.slug), initials: groupInitials(x.g.name), quizzes: x.s.quizzes, isNew,
  });
  return {
    groups: [...top.map((x) => toRail(x, false)), ...fill.map((x) => toRail(x, false)), ...fresh.map((x) => toRail(x, true))],
    visibleGroups: groups.length,
  };
}

export const getHomeGroups = unstable_cache(readGroups, ['ux-v1:p1:groups:v1'], { revalidate: CACHE_TTL.stats, tags: ['groups', 'quizzes'] });

/* ------------------------------------------------------------ quiz rows --- */

export interface HomeLists {
  trending: QuizCardData[];
  best: QuizCardData[];
  fresh: QuizCardData[];
}

/** Trending this week (real plays of the last 7 days, /quizzes/popular-this-week's
 *  query; the 30-day browse "trending" when the week is too quiet), All time best
 *  (play_count), New quizzes (created_at). No quiz appears twice (16.7), the quiz
 *  of the day included. */
export async function getHomeLists(exclude: string[] = [], now: number = Date.now()): Promise<HomeLists> {
  const [popular, browseTrending, mostPlayed, newest] = await Promise.all([
    getPopularQuizzes('week', now).catch(() => null),
    getBrowseQuizzes({ sort: 'trending', offset: 0, limit: 16 }).catch(() => [] as QuizCardData[]),
    getBrowseQuizzes({ sort: 'most_played', offset: 0, limit: 16 }),
    getBrowseQuizzes({ sort: 'new', offset: 0, limit: 16 }),
  ]);
  const seen = new Set(exclude);
  const take = (list: QuizCardData[], n: number): QuizCardData[] => {
    const out: QuizCardData[] = [];
    for (const q of list) {
      if (out.length >= n) break;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      out.push(q);
    }
    return out;
  };
  const week = popular && popular.state !== 'fallback' ? popular.rows.map((r) => r.card) : [];
  const trending = take(week.length >= 4 ? week : [...week, ...browseTrending], 4);
  const best = take(mostPlayed, 5);
  const fresh = take(newest, 5);
  return { trending, best, fresh };
}

/* -------------------------------------------------------- community rows --- */

export interface CommunityRow {
  kind: 'debate' | 'thread' | 'blog';
  title: string;
  href: string;
  sub: string;
  at: string;
  avatar: { name: string; photo: string | null; initials: string };
}

async function readCommunity(today: string): Promise<CommunityRow[]> {
  const db = createPublicReadClient();
  const rows: CommunityRow[] = [];

  // Daily debate (read only: never ensure_daily_debate, which writes).
  const { data: dd } = await db.from('daily_debates').select('date, question_id').lte('date', today)
    .order('date', { ascending: false }).limit(1).maybeSingle();
  const debate = dd as { date: string; question_id: string } | null;
  if (debate) {
    const [{ data: q }, { count }] = await Promise.all([
      db.from('debate_questions').select('question').eq('id', debate.question_id).maybeSingle(),
      db.from('debate_votes').select('id', { count: 'exact', head: true }).eq('date', debate.date),
    ]);
    const question = (q as { question: string } | null)?.question;
    if (question) {
      const votes = count ?? 0;
      rows.push({
        kind: 'debate', title: question, href: '/community', at: `${debate.date}T00:00:00Z`,
        sub: `Debate · ${comma(votes)} ${votes === 1 ? 'vote' : 'votes'}`,
        avatar: { name: 'General K-pop', photo: null, initials: 'K' },
      });
    }
  }

  // Verse threads and essays: only spaces that opted into the cross-space feed
  // (the same gate as lib/verse/feed.ts).
  const { data: opted } = await db.from('verse_spaces').select('group_id').eq('feed_opt_in', true).limit(500);
  const groupIds = [...new Set(((opted ?? []) as { group_id: number }[]).map((r) => r.group_id))];
  if (groupIds.length > 0) {
    const [{ data: groups }, { data: thread }, { data: essay }] = await Promise.all([
      db.from('groups').select('id, slug, name').in('id', groupIds),
      db.from('verse_threads').select('id, group_id, slug, title, created_at').in('group_id', groupIds).eq('status', 'visible')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('verse_essays').select('id, group_id, featured_at').in('group_id', groupIds).eq('status', 'featured')
        .order('featured_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    ]);
    const bySlug = new Map(((groups ?? []) as { id: number; slug: string; name: string }[]).map((g) => [g.id, g]));

    const t = thread as { id: number; group_id: number; slug: string; title: string; created_at: string } | null;
    const tg = t ? bySlug.get(t.group_id) : undefined;
    if (t && tg) {
      const summary = (await listThreads(t.group_id)).find((x) => x.id === t.id);
      const author = summary?.author?.displayName;
      const replies = summary?.replyCount ?? 0;
      rows.push({
        kind: 'thread', title: t.title, href: `/verse/${tg.slug}/community/${t.slug}`, at: t.created_at,
        sub: ['Thread', author, `${comma(replies)} ${replies === 1 ? 'reply' : 'replies'}`].filter(Boolean).join(' · '),
        avatar: { name: tg.name, photo: groupPhotoUrl(tg.slug), initials: groupInitials(tg.name) },
      });
    }

    const e = essay as { id: number; group_id: number; featured_at: string | null } | null;
    const eg = e ? bySlug.get(e.group_id) : undefined;
    if (e && eg) {
      const page = await getEssayPage(e.id);
      if (page && page.status === 'featured') {
        const author = page.author?.displayName || page.author?.username || null;
        rows.push({
          kind: 'blog', title: page.title, href: `/verse/${eg.slug}/essays/${e.id}`, at: e.featured_at ?? page.createdAt,
          sub: ['Blog', author, `${page.readingMin} min read`].filter(Boolean).join(' · '),
          avatar: { name: eg.name, photo: groupPhotoUrl(eg.slug), initials: groupInitials(eg.name) },
        });
      }
    }
  }

  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
}

const readCommunityCached = unstable_cache(readCommunity, ['ux-v1:p1:community:v1'], { revalidate: CACHE_TTL.stats, tags: ['community'] });

/** Up to 3 real community rows (daily debate, latest thread, latest featured
 *  essay), newest first. Empty = the section hides (min-gate). */
export function getHomeCommunity(now: Date = new Date()): Promise<CommunityRow[]> {
  return readCommunityCached(utcDay(now));
}

/* --------------------------------------------------------- blindtest band --- */

export interface BandInfo { date: string; fans: number }

async function readBand(today: string): Promise<BandInfo> {
  const db = createPublicReadClient();
  const { count } = await db.from('daily_blindtest_scores').select('user_id', { count: 'exact', head: true }).eq('date', today);
  return { date: today, fans: count ?? 0 };
}

const readBandCached = unstable_cache(readBand, ['ux-v1:p1:band:v1'], { revalidate: 600, tags: ['daily-blindtest'] });

/** Fans who played today's blindtest (daily_blindtest_scores). The date travels
 *  with the count so the client drops it after the UTC rollover. */
export function getHomeBand(now: Date = new Date()): Promise<BandInfo> {
  return readBandCached(utcDay(now));
}
