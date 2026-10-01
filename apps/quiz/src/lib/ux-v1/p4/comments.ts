// Hearts and replies on the v11 results comments (X1-002; DESIGN-SPEC 17.7 "comment
// likes are a heart + count, pink when liked"; WIRING-MAP v11 "Comment like heart";
// prototype #end comment rows: heart + count, Reply).
//
// The comment list and the comment field keep the EXISTING GET / POST
// /api/quiz/[id]/comment (same payload { content }). Hearts and replies have no store
// today, so they live in NEW tables (docs/pending-migrations/v11-p4-comment-likes.sql)
// behind NEW routes:
//   GET  /api/ux-v1/p4/comments?quiz=<uuid>&ids=<uuid,...>   -> P4CommentExtras
//   POST /api/ux-v1/p4/comments/like  { target, id, action }  -> { liked, count }
//   POST /api/ux-v1/p4/comments/reply { commentId, content }  -> { reply }
// Until the owner applies the migration the read answers { live: false } and the
// writes 503 not_live: the page shows no heart and no Reply (no dead controls).
//
// Pure module (client and server): shapes, request checks and parsers that never
// trust a key.

export type LikeTarget = 'comment' | 'reply';
export type LikeAction = 'like' | 'unlike';

/** Same limit as a quiz comment (quiz_comments CHECK, /api/quiz/[id]/comment). */
export const REPLY_MAX = 200;
/** Ids per extras read (the list shows 20 comments; room for the ones posted since). */
export const MAX_IDS = 50;
/** Replies per extras read (well under the 1000-row cap). */
export const MAX_REPLIES = 400;
/** Rate cap on replies: this many per fan per minute. */
export const REPLY_RATE = 5;

export interface P4Reply {
  id: string;
  comment_id: string;
  username: string;
  content: string;
  created_at: string;
  score: number | null;
  total: number | null;
  avatar_url: string | null;
  name_accent: string | null;
  name_font: string | null;
  bias: string | null;
}

export interface P4CommentExtras {
  /** the hearts + replies store exists (the pending migration is applied) */
  live: boolean;
  /** heart counts by likeKey() */
  likes: Record<string, number>;
  /** the session fan's own hearts, as likeKey()s */
  liked: string[];
  /** replies by parent comment id, oldest first */
  replies: Record<string, P4Reply[]>;
}

export const NOT_LIVE: P4CommentExtras = { live: false, likes: {}, liked: [], replies: {} };

/** What the sign-in sheet keeps for the results comments (pending action 'p4-comment'). */
export type P4CommentResume =
  | { kind: 'comment'; text: string }
  | { kind: 'reply'; text: string; replyTo: string }
  | { kind: 'like'; target: LikeTarget; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID.test(v);
}

export function likeKey(target: LikeTarget, id: string): string {
  return `${target}:${id}`;
}

/** The `ids` query parameter: valid uuids only, no duplicates, at most MAX_IDS. */
export function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim().toLowerCase();
    if (isUuid(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_IDS) break;
  }
  return out;
}

type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/** POST /api/ux-v1/p4/comments/like body. */
export function checkLikeBody(body: unknown): Checked<{ target: LikeTarget; id: string; action: LikeAction }> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'invalid_input' };
  const b = body as Record<string, unknown>;
  if (b.target !== 'comment' && b.target !== 'reply') return { ok: false, error: 'bad_target' };
  if (!isUuid(b.id)) return { ok: false, error: 'bad_id' };
  if (b.action !== 'like' && b.action !== 'unlike') return { ok: false, error: 'bad_action' };
  return { ok: true, value: { target: b.target, id: b.id.toLowerCase(), action: b.action } };
}

/** POST /api/ux-v1/p4/comments/reply body: trimmed, 1..REPLY_MAX characters (the comment
 *  endpoint trims and cuts at 200; a reply over the limit is refused, never cut). */
export function checkReplyBody(body: unknown): Checked<{ commentId: string; content: string }> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'invalid_input' };
  const b = body as Record<string, unknown>;
  if (!isUuid(b.commentId)) return { ok: false, error: 'bad_comment' };
  if (typeof b.content !== 'string') return { ok: false, error: 'content_required' };
  const content = b.content.trim();
  if (!content) return { ok: false, error: 'empty' };
  if (content.length > REPLY_MAX) return { ok: false, error: 'too_long' };
  return { ok: true, value: { commentId: b.commentId.toLowerCase(), content } };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const int = (v: unknown, min: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= min ? v : null);

/** One reply row, or null when a required key is missing. */
export function parseReply(raw: unknown): P4Reply | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const commentId = str(r.comment_id);
  const username = str(r.username);
  const createdAt = str(r.created_at);
  if (!id || !commentId || !username || !createdAt || typeof r.content !== 'string') return null;
  return {
    id, comment_id: commentId, username, content: r.content, created_at: createdAt,
    score: int(r.score, 0), total: int(r.total, 1),
    avatar_url: str(r.avatar_url), name_accent: str(r.name_accent), name_font: str(r.name_font), bias: str(r.bias),
  };
}

/** GET /api/ux-v1/p4/comments answer; anything unexpected is "not live" (fail closed). */
export function parseExtras(raw: unknown): P4CommentExtras {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NOT_LIVE;
  const r = raw as Record<string, unknown>;
  if (r.live !== true) return NOT_LIVE;
  const likes: Record<string, number> = {};
  if (r.likes && typeof r.likes === 'object' && !Array.isArray(r.likes)) {
    for (const [k, v] of Object.entries(r.likes as Record<string, unknown>)) {
      const n = int(v, 0);
      if (n !== null && /^(comment|reply):/.test(k)) likes[k] = n;
    }
  }
  const liked = Array.isArray(r.liked) ? r.liked.filter((k): k is string => typeof k === 'string' && /^(comment|reply):/.test(k)) : [];
  const replies: Record<string, P4Reply[]> = {};
  if (r.replies && typeof r.replies === 'object' && !Array.isArray(r.replies)) {
    for (const [parent, list] of Object.entries(r.replies as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const rows = list.map(parseReply).filter((x): x is P4Reply => x !== null && x.comment_id === parent);
      if (rows.length) replies[parent] = rows;
    }
  }
  return { live: true, likes, liked, replies };
}

/** The pending-action payload kept across the sign-in sheet (legacy shape { text } too). */
export function parseResume(raw: unknown): P4CommentResume | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.like && typeof r.like === 'object') {
    const l = r.like as Record<string, unknown>;
    if ((l.target === 'comment' || l.target === 'reply') && isUuid(l.id)) return { kind: 'like', target: l.target, id: l.id };
    return null;
  }
  if (typeof r.text !== 'string') return null;
  if (r.replyTo !== undefined && r.replyTo !== null) return isUuid(r.replyTo) ? { kind: 'reply', text: r.text, replyTo: r.replyTo } : null;
  return { kind: 'comment', text: r.text };
}

/** The payload stored with the sign-in sheet for each resume kind. */
export function resumePayload(r: P4CommentResume): Record<string, unknown> {
  if (r.kind === 'like') return { like: { target: r.target, id: r.id } };
  if (r.kind === 'reply') return { text: r.text, replyTo: r.replyTo };
  return { text: r.text };
}

/** The toast for a failed write (status and error code of the route's answer). */
export function writeError(kind: 'like' | 'reply', status: number, code?: unknown): string {
  if (status === 503) return kind === 'like' ? 'Hearts open soon.' : 'Replies open soon.';
  if (status === 429) return 'You are replying fast. Try again in a minute.';
  if (status === 404) return 'That comment is gone.';
  if (code === 'too_long') return 'That reply is too long.';
  return kind === 'like' ? 'Could not update. Try again.' : 'Could not post. Try again.';
}
