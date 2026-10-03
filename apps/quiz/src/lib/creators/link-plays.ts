// G8 (V12): "plays from your link" of the share kit (SYSTEM.md 5.4). Server only.
//
// A creator's link is the EXISTING tracked share link (/s/<code>, dev_share_links).
// A play that came through it is one row of share_link_plays (pending SQL
// docs/pending-migrations/v12-g8-share-link-plays.sql): one per link, player and
// UTC day, never the creator's own play.
//
// Fail soft: while the table does not exist, or on any read error, the count is
// null and the share kit shows no number at all (real data or nothing).

import { createHash } from 'node:crypto';

import { isMissingTable } from '@/lib/ux-v1/p8/features';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Cookie the click redirect sets so the next play can be matched to the link. */
export const LINK_COOKIE = 'kq_sl';
/** How long after the click a play still counts for the link (seconds). */
export const LINK_COOKIE_MAX_AGE = 86_400;

const CODE = /^[A-Za-z0-9_-]{4,32}$/;

export function isShareCode(v: unknown): v is string {
  return typeof v === 'string' && CODE.test(v);
}

/** The stored player key: a hash, never the account or browser id itself. */
export function linkPlayerKey(playerId: string | null | undefined, anonId: string | null | undefined): string | null {
  const raw = playerId ? `u:${playerId}` : anonId ? `a:${anonId}` : null;
  return raw ? createHash('sha256').update(raw).digest('hex').slice(0, 32) : null;
}

export interface LinkPlayInput {
  /** The share code from the LINK_COOKIE cookie. */
  code: string | null | undefined;
  quizId: string;
  playerId: string | null;
  anonId: string | null;
  /** True outside production: the row is stored but never counted. */
  isTest: boolean;
}

export type LinkPlayResult = 'recorded' | 'skipped' | 'not_live' | 'failed';

/**
 * Record one play that came through a creator's link. Called by the play route
 * after the play is stored (request R2 in run/requests/G8.md). `db` is a service
 * role client. Skips silently when: no code, the code is unknown, it belongs to
 * another quiz, the player is the link's owner, or the player has no identity.
 * A second play of the same player on the same day is a conflict and changes
 * nothing. Never throws.
 */
export async function recordLinkPlay(db: SupabaseClient, i: LinkPlayInput): Promise<LinkPlayResult> {
  try {
    if (!isShareCode(i.code)) return 'skipped';
    const key = linkPlayerKey(i.playerId, i.anonId);
    if (!key) return 'skipped';
    const { data: link, error: linkErr } = await db.from('dev_share_links').select('share_code, quiz_id, user_id').eq('share_code', i.code).maybeSingle();
    if (linkErr) return 'failed';
    const l = link as { share_code: string; quiz_id: string; user_id: string } | null;
    if (!l || l.quiz_id !== i.quizId || (i.playerId && l.user_id === i.playerId)) return 'skipped';
    const { error, status } = await db
      .from('share_link_plays')
      .upsert({ share_code: l.share_code, quiz_id: l.quiz_id, player_key: key, is_test: i.isTest }, { onConflict: 'share_code,player_key,played_on', ignoreDuplicates: true });
    if (error) return isMissingTable(error, status) ? 'not_live' : 'failed';
    return 'recorded';
  } catch {
    return 'failed';
  }
}

/**
 * Counted plays that came through the links `userId` made for `quizId`, or null
 * (table not applied yet, read failed). 0 is a real zero: the table exists and no
 * play came through yet. `db` is a service role client; the caller has already
 * checked that `userId` is the signed-in viewer.
 */
export async function readLinkPlays(db: SupabaseClient, userId: string, quizId: string): Promise<number | null> {
  try {
    const { data: links, error: linkErr } = await db.from('dev_share_links').select('share_code').eq('user_id', userId).eq('quiz_id', quizId).limit(200);
    if (linkErr) return null;
    const codes = ((links ?? []) as Array<{ share_code: string }>).map((l) => l.share_code).filter(isShareCode);
    // Probe the table even without a link, so "no link yet" and "not applied" differ.
    const q = db.from('share_link_plays').select('id', { count: 'exact', head: true }).eq('is_test', false);
    const { count, error, status } = await (codes.length ? q.in('share_code', codes) : q.eq('share_code', '-'));
    if (error || isMissingTable(error, status) || count === null) return null;
    return count;
  } catch {
    return null;
  }
}
