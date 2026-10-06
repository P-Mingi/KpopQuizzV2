import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getEditorialLive } from '@/lib/editorial/live';
import { groupPhotoUrl, photoFocal } from '@/lib/ux-v1/a0/group-photos';
import { plainTextExcerpt, renderTipTapJSON, splitTipTapForFold } from '@/lib/verse/render-content';
import { verseHidden } from '@/lib/verse/visibility';

import { blogCover, communityPhoto, dailyClosesAt, getP8Groups, readDailyDebates } from './feed';
import { isUxV12 } from '@/lib/ux-v12';

import { DATE_RE, paragraphs, readingMinutes, timeAgo, utcDate } from './format';
import { countVisible, dailyKey, MAX_REPLY_DEPTH, nest } from './nesting';
import { readPeople } from './people';
import { communityPostsOn, isVerseKind, retiredVerseRow, verseRowShown } from './verse-gate';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedPost, P8Features, P8Group, P8Person, PostKind } from './types';

// One community post with its replies (the post view, DESIGN-SPEC 13.4 + 16.7 Post).
// Same sources as the feed. Uncached on purpose: the post view is dynamic (the root
// layout reads headers) and replies must show right after they are posted.

/** community_likes target types, plus 'essay' = a blog heart (verse_essay_reactions, the existing toggle). */
export type LikeTarget = 'thread' | 'daily_debate' | 'debate' | 'challenge' | 'comment' | 'debate_vote' | 'reply' | 'essay' | 'editorial';

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
  /** The replies under this one, at any level (lib/ux-v1/p8/nesting.ts). */
  replies: P8Comment[];
  /** A reply can go under this one (a reply store exists and the 10-level cap is not reached). */
  canReply: boolean;
  /** Level: 1 = a comment on the post, up to 10. */
  depth: number;
  /** v12: a reply hidden by its reports (or deleted) kept for the replies under it. It
   *  shows "[removed]": no name, no text, no actions (nothing of it reaches the client). */
  removed?: true;
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
    | { store: 'community'; target_type: 'debate' | 'challenge' | 'editorial'; target_id: number }
    /** v12: the daily debate's own comments (community_replies, target_id = its day). */
    | { store: 'community'; target_type: 'daily_debate'; target_id: string }
    | null;
  /** v12 editorial post: the sources its facts cite (SYSTEM.md 5.6), listed under the body. */
  sources?: { label: string; url: string | null }[];
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

interface DiscRow { id: number; author: string; body: string; parent_id: number | null; created_at: string; status?: string }

/** A hidden or deleted reply kept for the replies under it ("[removed]"). */
function removedNode(id: string, likeType: LikeTarget, depth: number, replies: P8Comment[]): P8Comment {
  return { id, likeType, person: null, name: '[removed]', body: '', meta: null, at: '', ago: '', likes: null, replies, canReply: false, depth, removed: true };
}

/** Comments (verse_discussions, every status: read with the service role) as a tree at
 *  every level, oldest first, with people + flair. A hidden or deleted row stays only as a
 *  "[removed]" place over visible replies; its author and text never leave the server. */
async function discussionTree(db: Db, rows: DiscRow[], postAuthor: string | null, live: boolean, now: number): Promise<P8Comment[]> {
  if (!rows.length) return [];
  const shown = rows.filter((r) => r.status === 'visible');
  const [people, likes] = await Promise.all([
    readPeople(db, shown.map((r) => r.author)),
    likeMap('comment', shown.map((r) => String(r.id)), live),
  ]);
  const tree = rows.map((r) => ({ row: r, id: String(r.id), parent: r.parent_id == null ? null : String(r.parent_id), visible: r.status === 'visible' }));
  return nest(tree, (t, depth, replies): P8Comment => {
    if (!t.visible) return removedNode(t.id, 'comment', depth, replies);
    const r = t.row;
    const person = people.get(r.author) ?? null;
    return {
      id: t.id, likeType: 'comment', person, name: person?.name ?? 'a fan', body: r.body,
      meta: postAuthor && r.author === postAuthor ? 'author' : null,
      at: r.created_at, ago: timeAgo(r.created_at, now),
      likes: likes ? likes.get(t.id) ?? 0 : null, replies, canReply: depth < MAX_REPLY_DEPTH, depth,
    };
  });
}

/* ----------------------------------------------------------------- thread --- */

async function threadPost(id: number, f: P8Features, now: number): Promise<P8Post | null> {
  const db = createPublicReadClient();
  const { data } = must(await db.from('verse_threads').select('id, group_id, slug, title, created_by, created_at, origin, cover')
    .eq('id', id).eq('status', 'visible').maybeSingle(), 'thread');
  const t = data as { id: number; group_id: number; slug: string; title: string; created_by: string | null; created_at: string; origin: string | null; cover: unknown } | null;
  if (!t) return null;
  // Gates before any other read: a community post shows for any group (v12); a Verse post
  // of a parked space (or an unknown group) is a 404.
  const group = (await getP8Groups()).find((g) => g.id === t.group_id) ?? null;
  if (!verseRowShown(group?.slug, t.origin)) return null;
  if (retiredVerseRow('verse_threads', t.id, t.created_by)) return null; // owner, 2026-10-06
  const photo = t.origin === 'community' ? communityPhoto(t.cover) : null;
  // Every row of the thread, whatever its status, for the "[removed]" places (redacted in
  // discussionTree). The first top row is the opening post: the thread's own text.
  const svc = createServiceRoleClient();
  const all = await fetchAllRows<DiscRow>(() => svc.from('verse_discussions').select('id, author, body, parent_id, created_at, status')
    .eq('thread_id', t.id).order('created_at', { ascending: true }).order('id', { ascending: true }));
  const first = all.find((r) => r.parent_id == null) ?? null;
  const opening = first?.status === 'visible' ? first : null;
  // Replies to the opening post are comments on the thread (level 1); every other row keeps its parent.
  const rows = all.filter((r) => r !== first).map((r) => (first && r.parent_id === first.id ? { ...r, parent_id: null } : r));
  const tree = await discussionTree(db, rows, t.created_by, f.likes, now);
  const [people, likes] = await Promise.all([
    readPeople(db, [t.created_by]),
    likeMap('thread', [String(t.id)], f.likes),
  ]);
  const body = opening?.body ?? '';
  const paras = body.trim() && body.trim() !== t.title.trim() ? paragraphs(body) : [];
  const n = countVisible(tree);
  return {
    kind: 'thread', key: String(t.id), href: `/community/thread/${t.id}`, title: t.title,
    excerpt: null, group,
    author: t.created_by ? people.get(t.created_by) ?? null : null,
    at: t.created_at, ago: timeAgo(t.created_at, now), replies: n,
    likes: likes ? likes.get(String(t.id)) ?? 0 : null,
    paragraphs: paras, html: null, likeType: 'thread', openingCommentId: opening?.id ?? null,
    comments: tree, commentCount: n, replyTo: { store: 'verse', thread_id: t.id },
    ...(t.origin === 'community' ? { community: true as const } : {}),
    ...(photo ? { photo } : {}),
  };
}

/* ------------------------------------------------------------------- blog --- */

async function blogPost(id: number, f: P8Features, now: number): Promise<P8Post | null> {
  const db = createPublicReadClient();
  const { data } = must(await db.from('verse_essays').select('id, group_id, title, author, content, cover, featured_at, created_at, origin')
    .eq('id', id).eq('status', 'featured').maybeSingle(), 'essay');
  const e = data as { id: number; group_id: number; title: string; author: string; content: unknown; cover: unknown; featured_at: string | null; created_at: string; origin: string | null } | null;
  if (!e) return null;
  // Gates before any other read: a community post shows for any group (v12); a Verse post
  // of a parked space (or an unknown group) is a 404.
  const g = (await getP8Groups()).find((x) => x.id === e.group_id) ?? null;
  if (!verseRowShown(g?.slug, e.origin)) return null;
  if (retiredVerseRow('verse_essays', e.id, e.author)) return null; // owner, 2026-10-06
  const svc = createServiceRoleClient();
  const [people, reactions, rows] = await Promise.all([
    readPeople(db, [e.author]),
    fetchAllRows<{ essay_id: number }>(() => db.from('verse_essay_reactions').select('essay_id').eq('essay_id', e.id)),
    // every status, for the "[removed]" places (redacted in discussionTree)
    fetchAllRows<DiscRow>(() => svc.from('verse_discussions').select('id, author, body, parent_id, created_at, status')
      .eq('entity_type', 'essay').eq('entity_id', String(e.id)).is('thread_id', null)
      .order('created_at', { ascending: true }).order('id', { ascending: true })),
  ]);
  const tree = await discussionTree(db, rows, e.author, f.likes, now);
  const n = countVisible(tree);
  const at = e.featured_at ?? e.created_at;
  return {
    kind: 'blog', key: String(e.id), href: `/community/blog/${e.id}`, title: e.title,
    excerpt: plainTextExcerpt(e.content, 160) || null, group: g, author: people.get(e.author) ?? null,
    at, ago: timeAgo(at, now), replies: n, likes: reactions.length,
    blog: { coverUrl: blogCover(e.cover, g?.slug ?? null), coverFocal: photoFocal(e.title), readingMin: readingMinutes(splitTipTapForFold(e.content).totalWords) },
    paragraphs: [], html: renderTipTapJSON(e.content), likeType: 'essay', openingCommentId: null,
    comments: tree, commentCount: n, replyTo: { store: 'verse', entity_type: 'essay', entity_id: String(e.id) },
    ...(e.origin === 'community' ? { community: true as const } : {}),
  };
}

/* ------------------------------------------------------------ daily debate --- */

interface VoteRow { id: string; user_id: string; side: string; comment: string | null; created_at: string; comment_hidden_at?: string | null }
interface ReplyRow { id: number; author: string | null; body: string; parent_id: number | null; parent_vote?: string | null; created_at: string; status?: string }

async function dailyDebatePost(date: string, f: P8Features, now: number): Promise<P8Post | null> {
  const db = createPublicReadClient();
  const today = utcDate(now);
  if (date > today) return null;
  const debates = await readDailyDebates(db, date, 1);
  const d = debates[0];
  if (!d || d.date !== date) return null;
  // v12 (owner, 2026-10-06): the debate has its own comments (community_replies,
  // target_id = its day), open or closed, voted or not; any comment, vote comments
  // included, takes nested replies. v11 keeps the one reply that rides with the vote.
  const own = isUxV12() && f.fanDebates;
  const key = dailyKey(date);
  const svc = createServiceRoleClient();
  const [groups, votes, replyRows] = await Promise.all([
    getP8Groups(),
    fetchAllRows<VoteRow>(() => db.from('debate_votes')
      .select(own ? 'id, user_id, side, comment, created_at, comment_hidden_at' : 'id, user_id, side, comment, created_at').eq('date', date).order('created_at', { ascending: true })),
    own && key !== null
      ? fetchAllRows<ReplyRow>(() => svc.from('community_replies').select('id, author, body, parent_id, parent_vote, created_at, status')
        .eq('target_type', 'daily_debate').eq('target_id', key).order('created_at', { ascending: true }).order('id', { ascending: true }))
      : Promise.resolve([] as ReplyRow[]),
  ]);
  const sideOf = new Map(votes.map((v) => [v.user_id, v.side === 'a' ? d.sideA : d.sideB] as const));
  const commented = votes.filter((v) => v.comment && v.comment.trim());
  const shownVotes = commented.filter((v) => !v.comment_hidden_at);
  const shownReplies = replyRows.filter((r) => r.status === 'visible');
  const [people, likes, replyLikes, postLikes] = await Promise.all([
    readPeople(db, [...shownVotes.map((v) => v.user_id), ...shownReplies.map((r) => r.author)]),
    likeMap('debate_vote', shownVotes.map((v) => v.id), f.likes),
    likeMap('reply', shownReplies.map((r) => String(r.id)), f.likes),
    likeMap('daily_debate', [date], f.likes),
  ]);
  type Row = { id: string; parent: string | null; visible: boolean; at: string; vote?: VoteRow; reply?: ReplyRow };
  const rows: Row[] = [
    ...commented.map((v): Row => ({ id: v.id, parent: null, visible: !v.comment_hidden_at, at: v.created_at, vote: v })),
    ...replyRows.map((r): Row => ({ id: String(r.id), parent: r.parent_id != null ? String(r.parent_id) : r.parent_vote ?? null, visible: r.status === 'visible', at: r.created_at, reply: r })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
  const comments = nest(rows, (row, depth, replies): P8Comment => {
    const likeType: LikeTarget = row.vote ? 'debate_vote' : 'reply';
    if (!row.visible) return removedNode(row.id, likeType, depth, replies);
    const uid = row.vote ? row.vote.user_id : row.reply?.author ?? null;
    const person = uid ? people.get(uid) ?? null : null;
    const voted = uid ? sideOf.get(uid) : undefined;
    const body = row.vote ? row.vote.comment!.trim() : row.reply!.body;
    const count = row.vote ? (likes ? likes.get(row.id) ?? 0 : null) : (replyLikes ? replyLikes.get(row.id) ?? 0 : null);
    return {
      id: row.id, likeType, person, name: person?.name ?? 'a fan', body,
      meta: voted ? `voted ${voted}` : null, at: row.at, ago: timeAgo(row.at, now),
      likes: count, replies, canReply: own && depth < MAX_REPLY_DEPTH, depth,
    };
  });
  const n = countVisible(comments);
  const open = date === today;
  return {
    kind: 'debate', key: date, href: `/community/debate/${date}`, title: d.question, excerpt: null,
    group: groups.find((g) => g.slug === 'general-kpop') ?? null, author: null,
    at: `${date}T00:00:00.000Z`, ago: timeAgo(`${date}T00:00:00.000Z`, now), replies: n,
    likes: postLikes ? postLikes.get(date) ?? 0 : null,
    debate: {
      daily: true, open, closesAt: dailyClosesAt(date), comments: n,
      options: [{ label: d.sideA, votes: d.votesA }, { label: d.sideB, votes: d.votesB }], total: d.votesA + d.votesB,
    },
    paragraphs: [], html: null, likeType: 'daily_debate', openingCommentId: null,
    comments, commentCount: n,
    replyTo: own ? { store: 'community', target_type: 'daily_debate', target_id: date } : open ? { store: 'daily_debate', date } : null,
  };
}

/* ------------------------------------------------- fan debate (pending) --- */

/** Replies of a fan debate, challenge or editorial post (community_replies, every status:
 *  service role) as a tree at every level; a hidden or deleted reply stays only as a
 *  "[removed]" place over visible replies. */
async function communityReplies(db: Db, type: 'debate' | 'challenge' | 'editorial', id: number, postAuthor: string | null, f: P8Features, now: number, scoreOf?: (uid: string) => string | null): Promise<P8Comment[]> {
  const rows = await fetchAllRows<ReplyRow>(() => createServiceRoleClient().from('community_replies').select('id, author, body, parent_id, created_at, status')
    .eq('target_type', type).eq('target_id', id).order('created_at', { ascending: true }).order('id', { ascending: true }));
  if (!rows.length) return [];
  const shown = rows.filter((r) => r.status === 'visible');
  const [people, likes] = await Promise.all([
    readPeople(db, shown.map((r) => r.author)),
    likeMap('reply', shown.map((r) => String(r.id)), f.likes),
  ]);
  const tree = rows.map((r) => ({ row: r, id: String(r.id), parent: r.parent_id == null ? null : String(r.parent_id), visible: r.status === 'visible' }));
  return nest(tree, (t, depth, replies): P8Comment => {
    if (!t.visible) return removedNode(t.id, 'reply', depth, replies);
    const r = t.row;
    const person = r.author ? people.get(r.author) ?? null : null;
    const meta = r.author && postAuthor && r.author === postAuthor ? 'author' : (r.author && scoreOf ? scoreOf(r.author) : null);
    return {
      id: t.id, likeType: 'reply', person, name: person?.name ?? 'a fan', body: r.body, meta,
      at: r.created_at, ago: timeAgo(r.created_at, now), likes: likes ? likes.get(t.id) ?? 0 : null,
      replies, canReply: depth < MAX_REPLY_DEPTH, depth,
    };
  });
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
  const n = countVisible(comments);
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
  const n = countVisible(comments);
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

/* ------------------------------------------ editorial thread or blog (v12) --- */

function cleanSources(raw: unknown): { label: string; url: string | null }[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => {
    const o = (s ?? {}) as { label?: unknown; url?: unknown };
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    if (!label) return [];
    // XSS at the sink: only an absolute http(s) URL becomes a link.
    const url = typeof o.url === 'string' && /^https?:\/\/[^\s<>"']+$/i.test(o.url.trim()) ? o.url.trim() : null;
    return [{ label, url }];
  });
}

async function editorialPost(kind: 'thread' | 'blog', id: number, f: P8Features, now: number): Promise<P8Post | null> {
  if (!(await getEditorialLive())) return null;
  const db = createPublicReadClient();
  const { data } = must(await db.from('editorial_posts').select('id, kind, group_id, author, title, body, sources, created_at')
    .eq('id', id).eq('kind', kind).eq('status', 'visible').maybeSingle(), 'editorial_post');
  const r = data as { id: number; kind: 'thread' | 'blog'; group_id: number | null; author: string | null; title: string; body: string; sources: unknown; created_at: string } | null;
  if (!r) return null;
  const [groups, people, likes, comments] = await Promise.all([
    getP8Groups(),
    readPeople(db, [r.author], { retiredTeam: true }),
    likeMap('editorial', [String(r.id)], f.likes),
    f.fanDebates ? communityReplies(db, 'editorial', r.id, r.author, f, now) : Promise.resolve([] as P8Comment[]),
  ]);
  const g = r.group_id ? groups.find((x) => x.id === r.group_id) ?? null : null;
  const n = countVisible(comments);
  const words = r.body.split(/\s+/).filter(Boolean).length;
  return {
    kind: r.kind, key: `e${r.id}`, href: `/community/${r.kind}/e${r.id}`, title: r.title,
    excerpt: null, group: g, author: r.author ? people.get(r.author) ?? null : null,
    at: r.created_at, ago: timeAgo(r.created_at, now), replies: n,
    likes: likes ? likes.get(String(r.id)) ?? 0 : null,
    ...(r.kind === 'blog' ? { blog: { coverUrl: groupPhotoUrl(g?.slug ?? null), coverFocal: photoFocal(r.title), readingMin: readingMinutes(words) } } : {}),
    editorialId: r.id,
    paragraphs: paragraphs(r.body), html: null, likeType: 'editorial', openingCommentId: null,
    comments, commentCount: n,
    // Replies need community_replies (v11-p8-community.sql) widened by v12-g9-editorial.sql.
    replyTo: f.fanDebates ? { store: 'community', target_type: 'editorial', target_id: r.id } : null,
    sources: cleanSources(r.sources),
  };
}

/* ------------------------------------------------------------------ entry --- */

/** Parse a post URL key for its kind; null = not a valid key (404). */
export function parsePostKey(kind: PostKind, key: string): { daily: string } | { id: number } | { editorial: number } | null {
  if (kind === 'debate' && DATE_RE.test(key)) return { daily: key };
  // v12: "e<id>" = a thread or blog of an editorial account (editorial_posts.id).
  if ((kind === 'thread' || kind === 'blog') && /^e\d{1,12}$/.test(key)) {
    const eid = Number(key.slice(1));
    return Number.isSafeInteger(eid) && eid > 0 ? { editorial: eid } : null;
  }
  if (!/^\d{1,12}$/.test(key)) return null;
  const id = Number(key);
  return Number.isSafeInteger(id) && id > 0 ? { id } : null;
}

/** The post, or null (unknown, hidden, not public, its store is not live, or Verse
 *  content the Verse gates do not allow). Throws on a read error (the page shows its
 *  error boundary, never a fake 404). */
export async function getPost(kind: PostKind, key: string, f: P8Features, now: number = Date.now()): Promise<P8Post | null> {
  const k = parsePostKey(kind, key);
  if (!k) return null;
  if ('editorial' in k) return kind === 'thread' || kind === 'blog' ? editorialPost(kind, k.editorial, f, now) : null;
  // Hidden Verse: a thread or blog URL is a 404 without a single read (verse-gate.ts),
  // unless community posts exist (v12): the row's origin then decides.
  if (isVerseKind(kind) && verseHidden() && !communityPostsOn()) return null;
  if (kind === 'thread' && 'id' in k) return threadPost(k.id, f, now);
  if (kind === 'blog' && 'id' in k) return blogPost(k.id, f, now);
  if (kind === 'debate') return 'daily' in k ? dailyDebatePost(k.daily, f, now) : fanDebatePost(k.id, f, now);
  if (kind === 'challenge' && 'id' in k) return challengePost(k.id, f, now);
  return null;
}

export type { P8Group };
