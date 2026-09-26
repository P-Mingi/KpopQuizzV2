import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { photoFocal } from '@/lib/ux-v1/a0/group-photos';
import { plainTextExcerpt, renderTipTapJSON, splitTipTapForFold } from '@/lib/verse/render-content';

import { blogCover, dailyClosesAt, getP8Groups, readDailyDebates } from './feed';
import { DATE_RE, paragraphs, readingMinutes, timeAgo, utcDate } from './format';
import { readPeople } from './people';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedPost, P8Features, P8Group, P8Person, PostKind } from './types';

// One community post with its replies (the post view, DESIGN-SPEC 13.4 + 16.7 Post).
// Same sources as the feed. Uncached on purpose: the post view is dynamic (the root
// layout reads headers) and replies must show right after they are posted.

/** community_likes target types, plus 'essay' = a blog heart (verse_essay_reactions, the existing toggle). */
export type LikeTarget = 'thread' | 'daily_debate' | 'debate' | 'challenge' | 'comment' | 'debate_vote' | 'reply' | 'essay';

export interface P8Comment {
  id: string;
  /** community_likes target type of this reply (hearts, once the store is live). */
  likeType: LikeTarget;
  person: P8Person | null;
  name: string;
  body: string;
  /** Meta after the name: "author", "voted Agree", "8/10". */
  meta: string | null;
  at: string;
  ago: string;
  likes: number | null;
  /** One level of nesting. */
  replies: P8Comment[];
  /** Reply to this one (thread and blog comments; the daily debate is one vote, one reply). */
  canReply: boolean;
}

export interface P8Post extends FeedPost {
  /** Body paragraphs (thread, fan debate, challenge message). */
  paragraphs: string[];
  /** Sanitised HTML of a blog (lib/verse/render-content: allowlist + escaping). */
  html: string | null;
  likeType: LikeTarget;
  /** The verse_discussions id of a thread's opening post (Report files a flag on it). */
  openingCommentId: number | null;
  comments: P8Comment[];
  commentCount: number;
  /** Where a reply is posted (null = replies are closed or have no store yet). */
  replyTo:
    | { store: 'verse'; thread_id?: number; entity_type?: 'essay'; entity_id?: string }
    | { store: 'daily_debate'; date: string }
    | { store: 'community'; target_type: 'debate' | 'challenge'; target_id: number }
    | null;
}

type Db = SupabaseClient;

function must<T extends { error: { message: string } | null }>(r: T, what: string): T {
  if (r.error) throw new Error(`p8 post ${what}: ${r.error.message}`);
  return r;
}

async function likeMap(type: LikeTarget, ids: string[], live: boolean): Promise<Map<string, number> | null> {
  if (!live) return null;
  const out = new Map<string, number>();
  if (!ids.length) return out;
  const svc = createServiceRoleClient();
  const rows = await fetchAllRows<{ target_id: string }>(() => svc.from('community_likes').select('target_id').eq('target_type', type).in('target_id', ids));
  for (const r of rows) out.set(r.target_id, (out.get(r.target_id) ?? 0) + 1);
  return out;
}

/* -------------------------------------------------- verse_discussions tree --- */

interface DiscRow { id: number; author: string; body: string; parent_id: number | null; created_at: string }

/** Comments (verse_discussions) as a one-level tree, oldest first, with people + flair. */
async function discussionTree(db: Db, rows: DiscRow[], postAuthor: string | null, live: boolean, now: number): Promise<P8Comment[]> {
  if (!rows.length) return [];
  const [people, likes] = await Promise.all([
    readPeople(db, rows.map((r) => r.author)),
    likeMap('comment', rows.map((r) => String(r.id)), live),
  ]);
  const mk = (r: DiscRow): P8Comment => {
    const person = people.get(r.author) ?? null;
    return {
      id: String(r.id), likeType: 'comment', person, name: person?.name ?? 'a fan', body: r.body,
      meta: postAuthor && r.author === postAuthor ? 'author' : null,
      at: r.created_at, ago: timeAgo(r.created_at, now),
      likes: likes ? likes.get(String(r.id)) ?? 0 : null, replies: [], canReply: r.parent_id == null,
    };
  };
  const top = rows.filter((r) => r.parent_id == null).map(mk);
  const byParent = new Map<string, P8Comment[]>();
  for (const r of rows.filter((x) => x.parent_id != null)) {
    const list = byParent.get(String(r.parent_id)) ?? [];
    list.push(mk(r));
    byParent.set(String(r.parent_id), list);
  }
  for (const t of top) t.replies = byParent.get(t.id) ?? [];
  return top;
}

function countTree(list: P8Comment[]): number {
  return list.reduce((s, c) => s + 1 + c.replies.length, 0);
}

/* ----------------------------------------------------------------- thread --- */

async function threadPost(id: number, f: P8Features, now: number): Promise<P8Post | null> {
  const db = createPublicReadClient();
  const { data } = must(await db.from('verse_threads').select('id, group_id, slug, title, created_by, created_at')
    .eq('id', id).eq('status', 'visible').maybeSingle(), 'thread');
  const t = data as { id: number; group_id: number; slug: string; title: string; created_by: string | null; created_at: string } | null;
  if (!t) return null;
  const rows = await fetchAllRows<DiscRow>(() => db.from('verse_discussions').select('id, author, body, parent_id, created_at')
    .eq('thread_id', t.id).eq('status', 'visible').order('created_at', { ascending: true }).order('id', { ascending: true }));
  const opening = rows.find((r) => r.parent_id == null) ?? null;
  const rest = rows.filter((r) => r !== opening && r.parent_id !== opening?.id);
  // Replies to the opening post are top-level answers to the thread. They cannot take
  // a nested reply (the discussions route only nests under a top-level comment).
  const promoted = rows.filter((r) => opening && r.parent_id === opening.id).map((r) => ({ ...r, parent_id: null }));
  const promotedIds = new Set(promoted.map((r) => String(r.id)));
  const tree = await discussionTree(db, [...promoted, ...rest].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id), t.created_by, f.likes, now);
  for (const c of tree) if (promotedIds.has(c.id)) c.canReply = false;
  const [groups, people, likes] = await Promise.all([
    getP8Groups(),
    readPeople(db, [t.created_by]),
    likeMap('thread', [String(t.id)], f.likes),
  ]);
  const body = opening?.body ?? '';
  const paras = body.trim() && body.trim() !== t.title.trim() ? paragraphs(body) : [];
  const n = countTree(tree);
  return {
    kind: 'thread', key: String(t.id), href: `/community/thread/${t.id}`, title: t.title,
    excerpt: null, group: groups.find((g) => g.id === t.group_id) ?? null,
    author: t.created_by ? people.get(t.created_by) ?? null : null,
    at: t.created_at, ago: timeAgo(t.created_at, now), replies: n,
    likes: likes ? likes.get(String(t.id)) ?? 0 : null,
    paragraphs: paras, html: null, likeType: 'thread', openingCommentId: opening?.id ?? null,
    comments: tree, commentCount: n, replyTo: { store: 'verse', thread_id: t.id },
  };
}

/* ------------------------------------------------------------------- blog --- */

async function blogPost(id: number, f: P8Features, now: number): Promise<P8Post | null> {
  const db = createPublicReadClient();
  const { data } = must(await db.from('verse_essays').select('id, group_id, title, author, content, cover, featured_at, created_at')
    .eq('id', id).eq('status', 'featured').maybeSingle(), 'essay');
  const e = data as { id: number; group_id: number; title: string; author: string; content: unknown; cover: unknown; featured_at: string | null; created_at: string } | null;
  if (!e) return null;
  const [groups, people, reactions, rows] = await Promise.all([
    getP8Groups(),
    readPeople(db, [e.author]),
    fetchAllRows<{ essay_id: number }>(() => db.from('verse_essay_reactions').select('essay_id').eq('essay_id', e.id)),
    fetchAllRows<DiscRow>(() => db.from('verse_discussions').select('id, author, body, parent_id, created_at')
      .eq('entity_type', 'essay').eq('entity_id', String(e.id)).eq('status', 'visible').is('thread_id', null)
      .order('created_at', { ascending: true }).order('id', { ascending: true })),
  ]);
  const g = groups.find((x) => x.id === e.group_id) ?? null;
  const tree = await discussionTree(db, rows, e.author, f.likes, now);
  const n = countTree(tree);
  const at = e.featured_at ?? e.created_at;
  return {
    kind: 'blog', key: String(e.id), href: `/community/blog/${e.id}`, title: e.title,
    excerpt: plainTextExcerpt(e.content, 160) || null, group: g, author: people.get(e.author) ?? null,
    at, ago: timeAgo(at, now), replies: n, likes: reactions.length,
    blog: { coverUrl: blogCover(e.cover, g?.slug ?? null), coverFocal: photoFocal(e.title), readingMin: readingMinutes(splitTipTapForFold(e.content).totalWords) },
    paragraphs: [], html: renderTipTapJSON(e.content), likeType: 'essay', openingCommentId: null,
    comments: tree, commentCount: n, replyTo: { store: 'verse', entity_type: 'essay', entity_id: String(e.id) },
  };
}

/* ------------------------------------------------------------ daily debate --- */

async function dailyDebatePost(date: string, f: P8Features, now: number): Promise<P8Post | null> {
  const db = createPublicReadClient();
  const today = utcDate(now);
  if (date > today) return null;
  const debates = await readDailyDebates(db, date, 1);
  const d = debates[0];
  if (!d || d.date !== date) return null;
  const [groups, votes] = await Promise.all([
    getP8Groups(),
    fetchAllRows<{ id: string; user_id: string; side: string; comment: string | null; created_at: string }>(() => db.from('debate_votes')
      .select('id, user_id, side, comment, created_at').eq('date', date).order('created_at', { ascending: true })),
  ]);
  const commented = votes.filter((v) => v.comment && v.comment.trim());
  const [people, likes, postLikes] = await Promise.all([
    readPeople(db, commented.map((v) => v.user_id)),
    likeMap('debate_vote', commented.map((v) => v.id), f.likes),
    likeMap('daily_debate', [date], f.likes),
  ]);
  const comments: P8Comment[] = commented.map((v) => {
    const person = people.get(v.user_id) ?? null;
    return {
      id: v.id, likeType: 'debate_vote', person, name: person?.name ?? 'a fan', body: v.comment!.trim(),
      meta: `voted ${v.side === 'a' ? d.sideA : d.sideB}`, at: v.created_at, ago: timeAgo(v.created_at, now),
      likes: likes ? likes.get(v.id) ?? 0 : null, replies: [], canReply: false,
    };
  });
  const open = date === today;
  return {
    kind: 'debate', key: date, href: `/community/debate/${date}`, title: d.question, excerpt: null,
    group: groups.find((g) => g.slug === 'general-kpop') ?? null, author: null,
    at: `${date}T00:00:00.000Z`, ago: timeAgo(`${date}T00:00:00.000Z`, now), replies: comments.length,
    likes: postLikes ? postLikes.get(date) ?? 0 : null,
    debate: {
      daily: true, open, closesAt: dailyClosesAt(date), comments: comments.length,
      options: [{ label: d.sideA, votes: d.votesA }, { label: d.sideB, votes: d.votesB }], total: d.votesA + d.votesB,
    },
    paragraphs: [], html: null, likeType: 'daily_debate', openingCommentId: null,
    comments, commentCount: comments.length, replyTo: open ? { store: 'daily_debate', date } : null,
  };
}

/* ------------------------------------------------- fan debate (pending) --- */

interface ReplyRow { id: number; author: string | null; body: string; parent_id: number | null; created_at: string }

async function communityReplies(db: Db, type: 'debate' | 'challenge', id: number, postAuthor: string | null, f: P8Features, now: number, scoreOf?: (uid: string) => string | null): Promise<P8Comment[]> {
  const rows = await fetchAllRows<ReplyRow>(() => db.from('community_replies').select('id, author, body, parent_id, created_at')
    .eq('target_type', type).eq('target_id', id).eq('status', 'visible').order('created_at', { ascending: true }).order('id', { ascending: true }));
  if (!rows.length) return [];
  const [people, likes] = await Promise.all([
    readPeople(db, rows.map((r) => r.author)),
    likeMap('reply', rows.map((r) => String(r.id)), f.likes),
  ]);
  const mk = (r: ReplyRow): P8Comment => {
    const person = r.author ? people.get(r.author) ?? null : null;
    const meta = r.author && postAuthor && r.author === postAuthor ? 'author' : (r.author && scoreOf ? scoreOf(r.author) : null);
    return {
      id: String(r.id), likeType: 'reply', person, name: person?.name ?? 'a fan', body: r.body, meta,
      at: r.created_at, ago: timeAgo(r.created_at, now), likes: likes ? likes.get(String(r.id)) ?? 0 : null,
      replies: [], canReply: r.parent_id == null,
    };
  };
  const top = rows.filter((r) => r.parent_id == null).map(mk);
  for (const t of top) t.replies = rows.filter((r) => String(r.parent_id) === t.id).map(mk);
  return top;
}

async function fanDebatePost(id: number, f: P8Features, now: number): Promise<P8Post | null> {
  if (!f.fanDebates) return null;
  const db = createPublicReadClient();
  const svc = createServiceRoleClient();
  const { data } = must(await db.from('community_debates').select('id, group_id, author, question, body, options, closes_at, created_at')
    .eq('id', id).eq('status', 'visible').maybeSingle(), 'community_debate');
  const r = data as { id: number; group_id: number | null; author: string | null; question: string; body: string | null; options: unknown; closes_at: string; created_at: string } | null;
  if (!r) return null;
  const labels = (Array.isArray(r.options) ? r.options : []).map((o) => String(o)).slice(0, 4);
  const [groups, people, votes, likes, comments] = await Promise.all([
    getP8Groups(),
    readPeople(db, [r.author]),
    fetchAllRows<{ option_index: number }>(() => svc.from('community_debate_votes').select('option_index').eq('debate_id', r.id)),
    likeMap('debate', [String(r.id)], f.likes),
    communityReplies(db, 'debate', r.id, r.author, f, now),
  ]);
  const counts = labels.map((_l, i) => votes.filter((v) => v.option_index === i).length);
  const n = countTree(comments);
  return {
    kind: 'debate', key: String(r.id), href: `/community/debate/${r.id}`, title: r.question, excerpt: null,
    group: r.group_id ? groups.find((g) => g.id === r.group_id) ?? null : null,
    author: r.author ? people.get(r.author) ?? null : null,
    at: r.created_at, ago: timeAgo(r.created_at, now), replies: n,
    likes: likes ? likes.get(String(r.id)) ?? 0 : null,
    debate: {
      daily: false, open: Date.parse(r.closes_at) > now, closesAt: r.closes_at, comments: n,
      options: labels.map((label, i) => ({ label, votes: counts[i] ?? 0 })), total: counts.reduce((s, c) => s + c, 0),
    },
    paragraphs: paragraphs(r.body), html: null, likeType: 'debate', openingCommentId: null,
    comments, commentCount: n, replyTo: { store: 'community', target_type: 'debate', target_id: r.id },
  };
}

/* -------------------------------------------------- challenge (pending) --- */

async function challengePost(id: number, f: P8Features, now: number): Promise<P8Post | null> {
  if (!f.challenges) return null;
  const db = createPublicReadClient();
  const { data } = must(await db.from('community_challenges').select('id, author, quiz_id, group_id, score, total, time_seconds, message, created_at')
    .eq('id', id).eq('status', 'visible').maybeSingle(), 'community_challenge');
  const r = data as { id: number; author: string | null; quiz_id: string; group_id: number | null; score: number; total: number; time_seconds: number | null; message: string | null; created_at: string } | null;
  if (!r) return null;
  const { data: q } = must(await db.from('quizzes').select('id, slug, title, quiz_type, difficulty, play_count, cover_image_url')
    .eq('id', r.quiz_id).eq('status', 'published').maybeSingle(), 'challenge quiz');
  const quiz = q as { id: string; slug: string; title: string; quiz_type: string | null; difficulty: string | null; play_count: number | null; cover_image_url: string | null } | null;
  if (!quiz) return null;
  // Each replier's best score on the challenged quiz (plays), shown next to their name.
  const repliers = await fetchAllRows<{ author: string | null }>(() => db.from('community_replies').select('author')
    .eq('target_type', 'challenge').eq('target_id', r.id).eq('status', 'visible'));
  const ids = [...new Set(repliers.map((x) => x.author).filter((a): a is string => !!a))];
  const plays = ids.length ? await fetchAllRows<{ player_id: string; score: number; total_questions: number }>(() => db.from('plays')
    .select('player_id, score, total_questions').eq('quiz_id', quiz.id).in('player_id', ids)) : [];
  const best = new Map<string, { s: number; t: number }>();
  for (const p of plays) {
    if (!p.total_questions) continue;
    const b = best.get(p.player_id);
    if (!b || p.score / p.total_questions > b.s / b.t) best.set(p.player_id, { s: p.score, t: p.total_questions });
  }
  const scoreOf = (uid: string): string | null => { const b = best.get(uid); return b ? `${b.s}/${b.t}` : null; };
  const [groups, people, likes, comments] = await Promise.all([
    getP8Groups(),
    readPeople(db, [r.author]),
    likeMap('challenge', [String(r.id)], f.likes),
    communityReplies(db, 'challenge', r.id, r.author, f, now, scoreOf),
  ]);
  const n = countTree(comments);
  const chips = [...best.entries()].sort((a, b) => b[1].s / b[1].t - a[1].s / a[1].t);
  const who = await readPeople(db, chips.map(([uid]) => uid));
  return {
    kind: 'challenge', key: String(r.id), href: `/community/challenge/${r.id}`,
    title: `Beat my ${r.score}/${r.total} on ${quiz.title}`, excerpt: null,
    group: r.group_id ? groups.find((g) => g.id === r.group_id) ?? null : null,
    author: r.author ? people.get(r.author) ?? null : null,
    at: r.created_at, ago: timeAgo(r.created_at, now), replies: n,
    likes: likes ? likes.get(String(r.id)) ?? 0 : null,
    challenge: {
      score: r.score, total: r.total,
      quiz: { slug: quiz.slug, title: quiz.title, type: quiz.quiz_type, difficulty: quiz.difficulty, plays: quiz.play_count ?? 0, coverUrl: quiz.cover_image_url },
      replyScores: chips.slice(0, 3).map(([uid, b]) => ({ score: `${b.s}/${b.t}`, name: who.get(uid)?.username ?? who.get(uid)?.name ?? 'a fan' })),
      moreReplies: Math.max(0, chips.length - 3),
    },
    paragraphs: paragraphs(r.message), html: null, likeType: 'challenge', openingCommentId: null,
    comments, commentCount: n, replyTo: { store: 'community', target_type: 'challenge', target_id: r.id },
  };
}

/* ------------------------------------------------------------------ entry --- */

/** Parse a post URL key for its kind; null = not a valid key (404). */
export function parsePostKey(kind: PostKind, key: string): { daily: string } | { id: number } | null {
  if (kind === 'debate' && DATE_RE.test(key)) return { daily: key };
  if (!/^\d{1,12}$/.test(key)) return null;
  const id = Number(key);
  return Number.isSafeInteger(id) && id > 0 ? { id } : null;
}

/** The post, or null (unknown, hidden, not public, or its store is not live). Throws
 *  on a read error (the page shows its error boundary, never a fake 404). */
export async function getPost(kind: PostKind, key: string, f: P8Features, now: number = Date.now()): Promise<P8Post | null> {
  const k = parsePostKey(kind, key);
  if (!k) return null;
  if (kind === 'thread' && 'id' in k) return threadPost(k.id, f, now);
  if (kind === 'blog' && 'id' in k) return blogPost(k.id, f, now);
  if (kind === 'debate') return 'daily' in k ? dailyDebatePost(k.daily, f, now) : fanDebatePost(k.id, f, now);
  if (kind === 'challenge' && 'id' in k) return challengePost(k.id, f, now);
  return null;
}

export type { P8Group };
