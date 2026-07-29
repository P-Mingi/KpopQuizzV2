// W4.6 - per-page discussion threads (talk pages) with one level of replies. Public read
// of visible comments (RLS); author profiles merged separately (no FK to profiles).
import { createPublicReadClient } from '@/lib/supabase/server';

export interface DiscAuthor { username: string | null; displayName: string | null; avatarUrl: string | null; avatarBg: string | null; avatarText: string | null }
export interface DiscComment { id: number; author: DiscAuthor | null; authorId: string; body: string; createdAt: string; replies: DiscComment[] }

export async function getDiscussions(entityType: string, entityId: string): Promise<DiscComment[]> {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_discussions')
    .select('id, author, body, parent_id, created_at')
    .eq('entity_type', entityType).eq('entity_id', entityId).eq('status', 'visible')
    .order('created_at', { ascending: true }).limit(300);
  const rows = (data ?? []) as Array<{ id: number; author: string; body: string; parent_id: number | null; created_at: string }>;
  if (rows.length === 0) return [];

  const { data: profs } = await db.from('profiles').select('id, username, display_name, avatar_url, avatar_bg, avatar_text').in('id', [...new Set(rows.map((r) => r.author))]);
  type P = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; avatar_bg: string | null; avatar_text: string | null };
  const byId = new Map((profs ?? []).map((p: P) => [p.id, p]));
  const authorOf = (uid: string): DiscAuthor | null => {
    const p = byId.get(uid); return p ? { username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url, avatarBg: p.avatar_bg, avatarText: p.avatar_text } : null;
  };

  const mk = (r: typeof rows[number]): DiscComment => ({ id: r.id, author: authorOf(r.author), authorId: r.author, body: r.body, createdAt: r.created_at, replies: [] });
  const top = rows.filter((r) => r.parent_id == null).map(mk);
  const byParent = new Map<number, DiscComment[]>();
  for (const r of rows.filter((r) => r.parent_id != null)) { const l = byParent.get(r.parent_id!) ?? []; l.push(mk(r)); byParent.set(r.parent_id!, l); }
  for (const t of top) t.replies = byParent.get(t.id) ?? [];
  return top;
}
