// Payload validation of the P8 write routes (app/api/ux-v1/p8/*). Pure, unit tested.
// Limits match the pending migration's CHECK constraints (v11-p8-community.sql) so a
// payload that passes here can never fail on a constraint.

export const LIKE_TARGETS = ['thread', 'daily_debate', 'debate', 'challenge', 'comment', 'debate_vote', 'reply'] as const;
export type LikeTargetType = (typeof LIKE_TARGETS)[number];

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INT = /^\d{1,12}$/;

/** A heart: target type from the list, a target id in the shape of that target. */
export function checkLike(body: unknown): Checked<{ type: LikeTargetType; id: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const type = String(b.target_type ?? '');
  const id = String(b.target_id ?? '').trim();
  if (!(LIKE_TARGETS as readonly string[]).includes(type)) return { ok: false, error: 'bad_target' };
  const t = type as LikeTargetType;
  const okShape = t === 'daily_debate' ? DATE.test(id) : t === 'debate_vote' ? UUID.test(id) : INT.test(id) && Number(id) > 0;
  if (!okShape) return { ok: false, error: 'bad_target' };
  return { ok: true, value: { type: t, id: t === 'debate_vote' ? id.toLowerCase() : id } };
}

export interface DebateInput { groupId: number | null; question: string; body: string | null; options: string[]; days: 1 | 3 | 7 }

export function checkDebate(body: unknown): Checked<DebateInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const question = String(b.question ?? '').trim();
  if (question.length < 5 || question.length > 160) return { ok: false, error: 'bad_question' };
  const text = b.body == null ? '' : String(b.body).trim();
  if (text.length > 2000) return { ok: false, error: 'too_long' };
  const raw = Array.isArray(b.options) ? b.options : [];
  const options = raw.map((o) => String(o ?? '').trim()).filter(Boolean);
  if (options.length < 2 || options.length > 4 || raw.length > 4) return { ok: false, error: 'bad_options' };
  if (options.some((o) => o.length > 80)) return { ok: false, error: 'bad_options' };
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return { ok: false, error: 'bad_options' };
  const days = Number(b.days);
  if (days !== 1 && days !== 3 && days !== 7) return { ok: false, error: 'bad_days' };
  const gid = b.group_id == null ? null : Number(b.group_id);
  if (gid !== null && (!Number.isInteger(gid) || gid <= 0)) return { ok: false, error: 'bad_group' };
  return { ok: true, value: { groupId: gid, question, body: text || null, options, days } };
}

/** The fan debate a vote is for (debate-vote route body). */
export function checkDebateId(body: unknown): Checked<number> {
  const id = Number((body as Record<string, unknown> | null)?.debate_id);
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: 'bad_params' };
  return { ok: true, value: id };
}

export function checkVote(body: unknown, optionCount: number): Checked<number> {
  const i = Number((body as Record<string, unknown> | null)?.option_index);
  if (!Number.isInteger(i) || i < 0 || i >= optionCount || i > 3) return { ok: false, error: 'bad_option' };
  return { ok: true, value: i };
}

export function checkChallenge(body: unknown): Checked<{ playId: string; message: string | null }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const playId = String(b.play_id ?? '').trim();
  if (!UUID.test(playId)) return { ok: false, error: 'bad_play' };
  const message = b.message == null ? '' : String(b.message).trim();
  if (message.length > 280) return { ok: false, error: 'too_long' };
  return { ok: true, value: { playId: playId.toLowerCase(), message: message || null } };
}

export function checkReply(body: unknown): Checked<{ type: 'debate' | 'challenge'; targetId: number; body: string; parentId: number | null }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const type = String(b.target_type ?? '');
  if (type !== 'debate' && type !== 'challenge') return { ok: false, error: 'bad_target' };
  const targetId = Number(b.target_id);
  if (!Number.isSafeInteger(targetId) || targetId <= 0) return { ok: false, error: 'bad_target' };
  const text = String(b.body ?? '').trim();
  if (!text) return { ok: false, error: 'empty' };
  if (text.length > 2000) return { ok: false, error: 'too_long' };
  const parentId = b.parent_id == null ? null : Number(b.parent_id);
  if (parentId !== null && (!Number.isSafeInteger(parentId) || parentId <= 0)) return { ok: false, error: 'bad_parent' };
  return { ok: true, value: { type, targetId, body: text, parentId } };
}

/** New accounts (< 1 day) cannot post links (the verse rule, lib/verse/moderation). */
export function hasLink(text: string): boolean {
  return /https?:\/\//i.test(text);
}
