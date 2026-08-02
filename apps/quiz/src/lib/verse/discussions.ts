// W4.6 - per-page discussion threads (talk pages) with one level of replies. Public read
// of visible comments (RLS); bylines resolved through the shared V-PROFILE-ONE resolver.
import { createPublicReadClient } from '@/lib/supabase/server';
import { resolveIdentities, resolveSpaceIdentities } from '@/lib/verse/identity';

export interface DiscAuthor { username: string | null; displayName: string; avatarUrl: string | null; avatarBg: string | null; avatarText: string | null; role?: string | null; href: string | null; isSystem: boolean }
export interface DiscComment { id: number; author: DiscAuthor | null; authorId: string; body: string; createdAt: string; replies: DiscComment[] }

/** Comments anchored to an entity (talk page). */
export async function getDiscussions(entityType: string, entityId: string, groupId?: number): Promise<DiscComment[]> {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_discussions')
    .select('id, author, body, parent_id, created_at')
    .eq('entity_type', entityType).eq('entity_id', entityId).eq('status', 'visible')
    .order('created_at', { ascending: true }).limit(300);
  return buildTree((data ?? []) as CommentRow[], groupId);
}

/** V-COMM-3 - comments belonging to a THREAD (the same machinery, scoped by
 * thread_id instead of the entity anchor). */
export async function getThreadComments(threadId: number, groupId?: number): Promise<DiscComment[]> {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_discussions')
    .select('id, author, body, parent_id, created_at')
    .eq('thread_id', threadId).eq('status', 'visible')
    .order('created_at', { ascending: true }).limit(300);
  return buildTree((data ?? []) as CommentRow[], groupId);
}

type CommentRow = { id: number; author: string; body: string; parent_id: number | null; created_at: string };

async function buildTree(rows: CommentRow[], groupId?: number): Promise<DiscComment[]> {
  if (rows.length === 0) return [];
  const authorIds = [...new Set(rows.map((r) => r.author))];
  // Bylines carry the author's per-space role (subtle badge), block-aware, plus the
  // profile href for the cross-link and the system display, all from one resolver.
  const spaceIds = groupId ? await resolveSpaceIdentities(authorIds, groupId) : null;
  const flatIds = groupId ? null : await resolveIdentities(authorIds);
  const authorOf = (uid: string): DiscAuthor | null => {
    const id = spaceIds?.get(uid) ?? flatIds?.get(uid);
    if (!id) return null;
    const role = spaceIds?.get(uid) ? (spaceIds.get(uid)!.role !== 'visitor' ? spaceIds.get(uid)!.role : null) : null;
    return { username: id.username, displayName: id.displayName, avatarUrl: id.avatarUrl, avatarBg: id.avatarBg, avatarText: id.avatarText, role, href: id.href, isSystem: id.isSystem };
  };

  const mk = (r: typeof rows[number]): DiscComment => ({ id: r.id, author: authorOf(r.author), authorId: r.author, body: r.body, createdAt: r.created_at, replies: [] });
  const top = rows.filter((r) => r.parent_id == null).map(mk);
  const byParent = new Map<number, DiscComment[]>();
  for (const r of rows.filter((r) => r.parent_id != null)) { const l = byParent.get(r.parent_id!) ?? []; l.push(mk(r)); byParent.set(r.parent_id!, l); }
  for (const t of top) t.replies = byParent.get(t.id) ?? [];
  return top;
}
