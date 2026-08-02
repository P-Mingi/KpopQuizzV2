// V-COMM-3 step 2 - the thread model reads. A thread (migration 144) is an
// addressable, titled discussion in a space; its comments are verse_discussions
// rows carrying thread_id. Bylines resolve through the shared V-PROFILE-ONE
// identity resolver (do not rebuild). Public reads use the anon client (RLS
// returns visible only).

import { createPublicReadClient } from '@/lib/supabase/server';
import { resolveSpaceIdentities } from '@/lib/verse/identity';

import type { SpaceIdentity } from '@/lib/verse/identity';

export interface ThreadRow {
  id: number; groupId: number; slug: string; title: string;
  createdBy: string | null; createdAt: string; updatedAt: string;
}
export interface ThreadSummary extends ThreadRow {
  author: SpaceIdentity | null;
  replyCount: number;       // comments in the thread (excludes nothing; the opening post counts)
  lastActivityAt: string;   // newest comment, or createdAt
}

function toRow(t: Record<string, unknown>): ThreadRow {
  return { id: t.id as number, groupId: t.group_id as number, slug: t.slug as string, title: t.title as string, createdBy: (t.created_by as string | null) ?? null, createdAt: t.created_at as string, updatedAt: t.updated_at as string };
}

/** All visible threads in a space, richest activity first, with byline + counts. */
export async function listThreads(groupId: number): Promise<ThreadSummary[]> {
  const db = createPublicReadClient();
  const { data: threads } = await db.from('verse_threads')
    .select('id, group_id, slug, title, created_by, created_at, updated_at')
    .eq('group_id', groupId).eq('status', 'visible').order('updated_at', { ascending: false }).limit(200);
  const rows = (threads ?? []).map(toRow);
  if (rows.length === 0) return [];

  // Comment counts + last activity per thread. .order gives a deterministic,
  // most-recent slice under the 1000-row read cap so last-activity stays accurate;
  // an RPC aggregate is the fix once a space exceeds ~1000 thread comments.
  const { data: comments } = await db.from('verse_discussions')
    .select('thread_id, created_at').in('thread_id', rows.map((r) => r.id)).eq('status', 'visible')
    .order('created_at', { ascending: false }).limit(1000);
  const count = new Map<number, number>();
  const last = new Map<number, string>();
  for (const c of (comments ?? []) as Array<{ thread_id: number; created_at: string }>) {
    count.set(c.thread_id, (count.get(c.thread_id) ?? 0) + 1);
    if (!last.has(c.thread_id) || c.created_at > last.get(c.thread_id)!) last.set(c.thread_id, c.created_at);
  }

  const authors = await resolveSpaceIdentities(rows.map((r) => r.createdBy), groupId);
  return rows.map((r) => ({
    ...r,
    author: r.createdBy ? authors.get(r.createdBy) ?? null : null,
    replyCount: Math.max(0, (count.get(r.id) ?? 0) - 1), // exclude the opening post
    lastActivityAt: last.get(r.id) ?? r.createdAt,
  }));
}

/** One thread by its slug within a space (the permalink target). */
export async function getThreadBySlug(groupId: number, slug: string): Promise<ThreadSummary | null> {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_threads')
    .select('id, group_id, slug, title, created_by, created_at, updated_at')
    .eq('group_id', groupId).eq('slug', slug).eq('status', 'visible').maybeSingle();
  if (!data) return null;
  const row = toRow(data as Record<string, unknown>);
  const authors = await resolveSpaceIdentities([row.createdBy], groupId);
  const { count } = await db.from('verse_discussions').select('id', { count: 'exact', head: true }).eq('thread_id', row.id).eq('status', 'visible');
  return { ...row, author: row.createdBy ? authors.get(row.createdBy) ?? null : null, replyCount: Math.max(0, (count ?? 0) - 1), lastActivityAt: row.updatedAt };
}
