// W4.8 - abuse controls. Banned-term checks + patrol flags (private tables), plus code-only
// rate limiting (counts recent activity; no schema). Trust-tier gating lives in the callers.
import { cache } from 'react';

import { createServiceRoleClient } from '@/lib/supabase/server';

export interface TermHit { action: 'block' | 'flag'; term: string }

/** All banned terms (private list), loaded once per request. */
const getBannedTerms = cache(async (): Promise<Array<{ term: string; action: 'block' | 'flag' }>> => {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_banned_terms').select('term, action');
  return (data ?? []) as Array<{ term: string; action: 'block' | 'flag' }>;
});

/** The strongest banned-term hit in `text` (block beats flag), or null. Word-ish match. */
export async function checkText(text: string): Promise<TermHit | null> {
  const terms = await getBannedTerms();
  if (terms.length === 0) return null;
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  let flag: TermHit | null = null;
  for (const t of terms) {
    const needle = ` ${t.term.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
    if (needle.trim() && hay.includes(needle)) {
      if (t.action === 'block') return { action: 'block', term: t.term };
      flag = { action: 'flag', term: t.term };
    }
  }
  return flag;
}

/** File a patrol flag (user report or a banned-term auto-flag). */
export async function fileFlag(input: { target_type: 'comment' | 'revision' | 'suggestion'; target_id: number; group_id: number | null; reporter: string | null; reason: string }): Promise<void> {
  const db = createServiceRoleClient();
  await db.from('verse_flags').insert({ ...input, status: 'open' });
}

/** True if the user is under the rate cap for `table` in the window. Code-only limiter. */
export async function underRateCap(table: string, userCol: string, userId: string, windowSec: number, max: number): Promise<boolean> {
  const db = createServiceRoleClient();
  const since = new Date(Date.now() - windowSec * 1000).toISOString();
  const { count } = await db.from(table).select('id', { count: 'exact', head: true }).eq(userCol, userId).gte('created_at', since);
  return (count ?? 0) < max;
}

/** True if the user is BLOCKED in this space (space_members.status = 'blocked').
 * A blocked member may not post threads, comments or replies; a non-member (no
 * row) still may. Called on every write surface so block state is enforced, not
 * just reflected in the role badge. */
export async function isBlockedInSpace(userId: string, groupId: number): Promise<boolean> {
  const db = createServiceRoleClient();
  const { data } = await db.from('space_members').select('status').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
  return (data as { status: string } | null)?.status === 'blocked';
}

/** Trust tier from account age + XP-ish signals (code-only). New accounts are limited. */
export function isTrusted(accountCreatedAt: string | null): boolean {
  if (!accountCreatedAt) return false;
  return Date.now() - new Date(accountCreatedAt).getTime() >= 24 * 3600 * 1000; // >= 1 day old
}
