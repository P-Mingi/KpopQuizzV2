// Server-only helpers for hearts and replies on the results comments (X1-002, see
// ./comments.ts). The store is docs/pending-migrations/v11-p4-comment-likes.sql; until
// the owner applies it the probe says "not live": the read answers { live: false } and
// the write routes 503 not_live BEFORE any write.

import { unstable_cache } from 'next/cache';

import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';
import { createPublicReadClient } from '@/lib/supabase/server';

import { likeKey, MAX_REPLIES } from './comments';

import type { LikeTarget, P4Reply } from './comments';
import type { SupabaseClient } from '@supabase/supabase-js';

// PGRST205 missing table, PGRST202 missing function (schema cache); 42P01 / 42883 the
// Postgres codes for the same. A GET select is the probe: a HEAD request on a missing
// table answers 204 with no error through supabase-js (P8 measured it, 2026-09-26).
const MISSING = new Set(['PGRST205', 'PGRST202', '42P01', '42883']);

export function isMissingObject(err: { code?: string | null; message?: string | null } | null | undefined, status?: number): boolean {
  if (!err) return false;
  if (err.code && MISSING.has(err.code)) return true;
  if (status === 404) return true;
  return /could not find the (table|function)|does not exist/i.test(err.message ?? '');
}

async function probe(): Promise<boolean> {
  if (!COMMUNITY_FEATURES_ENABLED) return false;
  const db = createPublicReadClient();
  const [replies, counts] = await Promise.all([
    db.from('quiz_comment_replies').select('id').limit(1),
    db.rpc('quiz_comment_like_counts', { p_comment_ids: [], p_reply_ids: [] }),
  ]);
  for (const r of [replies, counts]) {
    if (!r.error) continue;
    if (isMissingObject(r.error, r.status)) return false;
    // anything else (network, timeout): throw, so the cache never stores a wrong answer
    throw new Error(`p4 comment store probe: ${r.error.message}`);
  }
  return true;
}

/** Cached 5 minutes: applying the migration turns hearts and Reply on within minutes. */
export const commentStoreLive = unstable_cache(probe, ['ux-v1:p4:comment-store:v1'], { revalidate: 300 });

/** Uncached, for the write routes (they must never write to a missing table). */
export const commentStoreLiveNow = probe;

interface CountRow { kind: string; target_id: string; likes: number | string }

/** Heart counts by likeKey(), through the aggregate function (who liked is not public). */
export async function likeCounts(db: SupabaseClient, commentIds: string[], replyIds: string[]): Promise<Record<string, number>> {
  if (commentIds.length === 0 && replyIds.length === 0) return {};
  const { data, error } = await db.rpc('quiz_comment_like_counts', { p_comment_ids: commentIds, p_reply_ids: replyIds });
  if (error) throw new Error(`p4 like counts: ${error.message}`);
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as CountRow[]) {
    const n = Number(row.likes);
    if ((row.kind === 'comment' || row.kind === 'reply') && typeof row.target_id === 'string' && Number.isFinite(n)) out[likeKey(row.kind, row.target_id)] = n;
  }
  return out;
}

/** One target's count (after a heart write). */
export async function likeCount(db: SupabaseClient, target: LikeTarget, id: string): Promise<number> {
  const counts = await likeCounts(db, target === 'comment' ? [id] : [], target === 'reply' ? [id] : []);
  return counts[likeKey(target, id)] ?? 0;
}

export interface ReplyDbRow { id: string; comment_id: string; user_id: string; content: string; created_at: string; score: number | null; total: number | null }
interface ProfileRow { id: string; username: string | null; avatar_url: string | null; name_accent: string | null; name_font: string | null; bias: string | null }

export const REPLY_COLUMNS = 'id, comment_id, user_id, content, created_at, score, total';

/** Names and flair from profiles (public read), the same fields the comment list carries.
 *  The user id stays on the server. */
export async function hydrateReplies(db: SupabaseClient, rows: ReplyDbRow[]): Promise<P4Reply[]> {
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const byId = new Map<string, ProfileRow>();
  if (ids.length > 0) {
    const { data } = await db.from('profiles').select('id, username, avatar_url, name_accent, name_font, bias').in('id', ids);
    for (const p of (data ?? []) as ProfileRow[]) byId.set(p.id, p);
  }
  return rows.map((r) => {
    const p = byId.get(r.user_id);
    return {
      id: r.id, comment_id: r.comment_id, username: p?.username ?? 'someone', content: r.content, created_at: r.created_at,
      score: r.score ?? null, total: r.total ?? null,
      avatar_url: p?.avatar_url ?? null, name_accent: p?.name_accent ?? null, name_font: p?.name_font ?? null, bias: p?.bias ?? null,
    };
  });
}

/** Replies of these comments on this quiz, oldest first, grouped by parent. */
export async function readReplies(db: SupabaseClient, quizId: string, commentIds: string[]): Promise<Record<string, P4Reply[]>> {
  if (commentIds.length === 0) return {};
  const { data, error } = await db
    .from('quiz_comment_replies')
    .select(REPLY_COLUMNS)
    .eq('quiz_id', quizId)
    .in('comment_id', commentIds)
    .order('created_at', { ascending: true })
    .limit(MAX_REPLIES);
  if (error) throw new Error(`p4 replies: ${error.message}`);
  const out: Record<string, P4Reply[]> = {};
  for (const r of await hydrateReplies(db, (data ?? []) as ReplyDbRow[])) (out[r.comment_id] ??= []).push(r);
  return out;
}
