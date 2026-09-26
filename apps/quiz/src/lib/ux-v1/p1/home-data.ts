// Server reads for the v11 home (P1). Every read here is PUBLIC and cookie-free
// (anon client, or the service role for server-only admin data), wrapped in
// unstable_cache, so the home stays static/ISR (verse-laws 6). Callers wrap each
// read in safeFetch: a DB blip hides a section, it never 500s the page. Real data
// only (worker rule 7): nothing here is a sample; every count is a real count.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { getBrowseQuizzes, getMostLikedQuizzes, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { createPublicReadClient } from '@/lib/supabase/server';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { getEssayPage } from '@/lib/verse/essays';
import { getVerseDirectory } from '@/lib/verse/space-data';
import { listThreads } from '@/lib/verse/threads';
import { verseHidden } from '@/lib/verse/visibility';

import { aboutMinutes, averagePct, comma, groupInitials, isVisibleGroupSlug, meanRunSeconds, spreadBy, utcDay } from './format';
import { LIVE_HUB_ORDER } from './hubs';

import type { QuizCardData } from '@/lib/db/types';

/** A read that failed must THROW inside unstable_cache: a thrown read is not
 *  cached (the caller's safeFetch hides the section for this render only and the
 *  next render retries), while a returned empty value would be cached for the
 *  whole TTL and hide real data after a transient DB error. */
function must<T extends { error: { message: string } | null }>(res: T, what: string): T {
  if (res.error) throw new Error(`[ux-home] ${what}: ${res.error.message}`);
  return res;
}

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
  /** The day this quiz was picked as the quiz of the day (quizzes.quiz_of_the_day_date). */
  featuredDate: string | null;
  /** UTC day of this read. A pick first made on an older day is a replay (see getHomeQotd). */
  servedDate: string;
}

async function readQotdExtras(id: string): Promise<{ featuredDate: string | null; seconds: number | null }> {
  const db = createPublicReadClient();
  const [dateRes, statsRes] = await Promise.all([
    db.from('quizzes').select('quiz_of_the_day_date').eq('id', id).maybeSingle(),
    db.from('quiz_time_stats').select('attempt_count, avg_time_seconds, total_questions').eq('quiz_id', id).limit(200),
  ]);
  const featuredDate = (must(dateRes, 'qotd date').data as { quiz_of_the_day_date: string | null } | null)?.quiz_of_the_day_date ?? null;
  const stats = must(statsRes, 'quiz_time_stats').data as { attempt_count: number; avg_time_seconds: number; total_questions: number }[] | null;
  return { featuredDate, seconds: meanRunSeconds(stats ?? []) };
}

const readQotdExtrasCached = unstable_cache(readQotdExtras, ['ux-v1:p1:qotd-extras:v2'], { revalidate: CACHE_TTL.stats, tags: ['quizzes'] });

/**
 * The quiz of the day the whole site serves today: the SAME read as the live home
 * and /daily (getQuizOfTheDay), so both homes, the daily ritual and the streak agree.
 * It is today's pick when one was published for today; while the rotation is
 * stopped it is that read's replay of a past pick (a different one each UTC day),
 * and featuredDate says on which day it was first picked, so the UI labels it a
 * replay instead of presenting it as a new pick.
 */
export async function getHomeQotd(now: Date = new Date()): Promise<HomeQotd | null> {
  const q = await getQuizOfTheDay();
  if (!q) return null;
  const { featuredDate, seconds } = await readQotdExtrasCached(q.id);
  const questions = q.question_count ?? 0;
  return {
    id: q.id,
    slug: q.slug,
    title: q.title,
    quizType: q.quiz_type,
    difficulty: q.difficulty,
    questionCount: questions,
    averagePct: averagePct(q.total_score_sum ?? 0, q.total_completions ?? 0, questions),
    time: aboutMinutes(seconds),
    featuredDate,
    servedDate: utcDay(now),
  };
}

/* ---------------------------------------------------------- groups rail --- */

export interface RailGroup {
  slug: string;
  name: string;
  photo: string | null;
  initials: string;
  /** Published quizzes of the group (not groups.quiz_count, which is stale). */
  quizzes: number;
  /** Shown with "New quiz" (a quiz published in the last 7 days). */
  isNew: boolean;
}

export interface HomeGroups { groups: RailGroup[]; visibleGroups: number }

const NEW_DAYS = 7;
const MAX_EXTRA = 3;

type GroupRow = { id: number; slug: string; name: string };

async function readGroups(): Promise<HomeGroups> {
  const db = createPublicReadClient();
  const [rows, groupsRes] = await Promise.all([
    fetchAllRows<{ group_id: number | null; created_at: string }>(
      () => db.from('quizzes').select('group_id, created_at').eq('status', 'published').order('id'),
    ),
    db.from('groups').select('id, slug, name'),
  ]);
  must(groupsRes, 'groups');
  const groups = ((groupsRes.data ?? []) as GroupRow[]).filter((g) => isVisibleGroupSlug(g.slug));
  const stats = new Map<number, { quizzes: number; newest: string }>();
  for (const r of rows) {
    if (r.group_id == null) continue;
    const st = stats.get(r.group_id) ?? { quizzes: 0, newest: '' };
    st.quizzes += 1;
    if (r.created_at > st.newest) st.newest = r.created_at;
    stats.set(r.group_id, st);
  }
  const since = new Date(Date.now() - NEW_DAYS * 86_400_000).toISOString();
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  const toRail = (g: GroupRow): RailGroup => {
    const st = stats.get(g.id) ?? { quizzes: 0, newest: '' };
    return {
      slug: g.slug, name: g.name, photo: groupPhotoUrl(g.slug), initials: groupInitials(g.name),
      quizzes: st.quizzes, isNew: st.newest !== '' && st.newest >= since,
    };
  };
  // Every live hub, in the live order (as on the live home), then up to 3 more
  // groups with a quiz published in the last 7 days.
  const live = LIVE_HUB_ORDER.map((slug) => bySlug.get(slug)).filter((g): g is GroupRow => !!g);
  const inLive = new Set(live.map((g) => g.slug));
  const extra = groups
    .filter((g) => !inLive.has(g.slug) && (stats.get(g.id)?.newest ?? '') >= since)
    .sort((a, b) => (stats.get(b.id)?.newest ?? '').localeCompare(stats.get(a.id)?.newest ?? ''))
    .slice(0, MAX_EXTRA);
  return { groups: [...live, ...extra].map(toRail), visibleGroups: groups.length };
}

export const getHomeGroups = unstable_cache(readGroups, ['ux-v1:p1:groups:v2'], { revalidate: CACHE_TTL.stats, tags: ['groups', 'quizzes'] });

/* ------------------------------------------------------------ quiz rows --- */

export interface HomeLists {
  trending: QuizCardData[];
  best: QuizCardData[];
  fresh: QuizCardData[];
}

/** Six of each, as the live home: it links 6 trending, 6 most liked and 6 new quizzes. */
export const LIST_SIZE = 6;

const getMostLikedCached = unstable_cache(
  () => getMostLikedQuizzes(0, 12),
  ['ux-v1:p1:most-liked:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['quizzes'] },
);

/**
 * The three quiz lists, from the SAME queries as the live home's rails (WIRING-MAP
 * section 1: EXISTS, same query), so the v11 home links every quiz the live home
 * links: Trending this week (the live trending read: quizzes of the last 30 days by
 * plays), All time best (the live "All-time best": most liked), New quizzes
 * (newest). No quiz appears twice (16.7): a quiz already shown (the quiz of the day,
 * then an earlier list) is skipped and the list takes the next one.
 */
export async function getHomeLists(exclude: string[] = []): Promise<HomeLists> {
  const [trendingSrc, likedSrc, newestSrc] = await Promise.all([
    getBrowseQuizzes({ sort: 'trending', offset: 0, limit: 12 }),
    getMostLikedCached(),
    getBrowseQuizzes({ sort: 'new', offset: 0, limit: 12 }),
  ]);
  const seen = new Set(exclude);
  const take = (list: QuizCardData[]): QuizCardData[] => {
    const out: QuizCardData[] = [];
    for (const q of list) {
      if (out.length >= LIST_SIZE) break;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      out.push(q);
    }
    return out;
  };
  // 16.8: never the same photo twice side by side. A card without its own cover
  // shows its group's photo (or its typographic cover), so group = photo.
  const trending = spreadBy(take(trendingSrc), (q) => q.cover_image_url ?? `group:${q.group_slug}`);
  const best = take(likedSrc);
  const fresh = take(newestSrc);
  return { trending, best, fresh };
}

/* -------------------------------------------------------- community rows --- */

export interface VerseSpaceLink { slug: string; label: string; name: string }

export interface HomeCommunity {
  rows: CommunityRow[];
  /** The live home's "Fandom spaces on Verse" links (only while the Verse is public). */
  spaces: VerseSpaceLink[];
}

export interface CommunityRow {
  kind: 'debate' | 'thread' | 'blog';
  title: string;
  href: string;
  sub: string;
  at: string;
  avatar: { name: string; photo: string | null; initials: string };
}

async function readCommunity(today: string): Promise<HomeCommunity> {
  const db = createPublicReadClient();
  const rows: CommunityRow[] = [];
  const spaces: VerseSpaceLink[] = [];

  // Daily debate (read only: never ensure_daily_debate, which writes).
  const { data: dd } = must(await db.from('daily_debates').select('date, question_id').lte('date', today)
    .order('date', { ascending: false }).limit(1).maybeSingle(), 'daily_debates');
  const debate = dd as { date: string; question_id: string } | null;
  if (debate) {
    const [qRes, votesRes] = await Promise.all([
      db.from('debate_questions').select('question').eq('id', debate.question_id).maybeSingle(),
      db.from('debate_votes').select('id', { count: 'exact', head: true }).eq('date', debate.date),
    ]);
    const q = must(qRes, 'debate_questions').data;
    const count = must(votesRes, 'debate_votes').count;
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

  // Verse content only while the Verse is public (VERSE_PUBLIC, the same switch as
  // the live home's Verse strip: no Verse entry point on the Play home before that).
  if (verseHidden()) return { rows, spaces };

  // The live home's "Fandom spaces on Verse" strip: the first 4 directory tiles,
  // shown when there are at least 3 (components/verse/verse-home-strip.tsx).
  const tiles = await getVerseDirectory();
  if (tiles.length >= 3) {
    for (const t of tiles.slice(0, 4)) spaces.push({ slug: t.slug, label: t.fandom_name || t.name, name: t.name });
  }

  // Verse threads and essays: only spaces that opted into the cross-space feed
  // (the same gate as lib/verse/feed.ts).
  const { data: opted } = must(await db.from('verse_spaces').select('group_id').eq('feed_opt_in', true).limit(500), 'verse_spaces');
  const groupIds = [...new Set(((opted ?? []) as { group_id: number }[]).map((r) => r.group_id))];
  if (groupIds.length > 0) {
    const [groupsRes, threadRes, essayRes] = await Promise.all([
      db.from('groups').select('id, slug, name').in('id', groupIds),
      db.from('verse_threads').select('id, group_id, slug, title, created_at').in('group_id', groupIds).eq('status', 'visible')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('verse_essays').select('id, group_id, featured_at').in('group_id', groupIds).eq('status', 'featured')
        .order('featured_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
    ]);
    const groups = must(groupsRes, 'groups').data;
    const thread = must(threadRes, 'verse_threads').data;
    const essay = must(essayRes, 'verse_essays').data;
    const bySlug = new Map(((groups ?? []) as { id: number; slug: string; name: string }[]).map((g) => [g.id, g]));

    const t = thread as { id: number; group_id: number; slug: string; title: string; created_at: string } | null;
    const tg = t ? bySlug.get(t.group_id) : undefined;
    if (t && tg) {
      // listThreads swallows read errors (returns []): a thread that is visible
      // but missing from its own list means that read failed, so do not cache it.
      const summary = (await listThreads(t.group_id)).find((x) => x.id === t.id);
      if (!summary) throw new Error('[ux-home] verse thread list unavailable');
      const author = summary.author?.displayName;
      const replies = summary.replyCount;
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

  return { rows: rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3), spaces };
}

const readCommunityCached = unstable_cache(readCommunity, ['ux-v1:p1:community:v2'], { revalidate: CACHE_TTL.stats, tags: ['community'] });

/** Up to 3 real community rows (daily debate; while the Verse is public, the latest
 *  thread and featured essay too), newest first, plus the Verse space links. Empty =
 *  the section hides (min-gate). */
export function getHomeCommunity(now: Date = new Date()): Promise<HomeCommunity> {
  return readCommunityCached(utcDay(now));
}

/* --------------------------------------------------------- blindtest band --- */

export interface BandInfo { date: string; fans: number }

async function readBand(today: string): Promise<BandInfo> {
  const db = createPublicReadClient();
  const { count } = must(await db.from('daily_blindtest_scores').select('user_id', { count: 'exact', head: true }).eq('date', today), 'daily_blindtest_scores');
  return { date: today, fans: count ?? 0 };
}

const readBandCached = unstable_cache(readBand, ['ux-v1:p1:band:v1'], { revalidate: 600, tags: ['daily-blindtest'] });

/** Fans who played today's blindtest (daily_blindtest_scores). The date travels
 *  with the count so the client drops it after the UTC rollover. */
export function getHomeBand(now: Date = new Date()): Promise<BandInfo> {
  return readBandCached(utcDay(now));
}
