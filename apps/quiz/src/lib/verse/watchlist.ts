// W4.6 - watchlists. A user follows a Verse page; when it changes, watchers are notified
// through the EXISTING creator_notifications spine (type 'verse_watch'). Private (RLS on).
import { createServiceRoleClient } from '@/lib/supabase/server';
import { idolSlug } from '@/lib/verse/slug';

export async function isWatching(userId: string, entityType: string, entityId: string): Promise<boolean> {
  const db = createServiceRoleClient();
  const { data } = await db.from('verse_watchlists').select('id').eq('user_id', userId).eq('entity_type', entityType).eq('entity_id', entityId).maybeSingle();
  return !!data;
}

/** The public URL + human label for a Verse entity (for notifications + links). */
export async function resolveEntityLink(entityType: string, entityId: string): Promise<{ url: string; label: string } | null> {
  const db = createServiceRoleClient();
  if (entityType === 'group') {
    const { data } = await db.from('groups').select('slug, name').eq('id', Number(entityId)).maybeSingle();
    const g = data as { slug: string; name: string } | null;
    return g ? { url: `/verse/${g.slug}`, label: g.name } : null;
  }
  if (entityType === 'idol') {
    const { data } = await db.from('idols').select('name, groups(slug)').eq('id', Number(entityId)).maybeSingle();
    const i = data as { name: string; groups: { slug: string } | { slug: string }[] | null } | null;
    const g = i && (Array.isArray(i.groups) ? i.groups[0] : i.groups);
    return i && g ? { url: `/verse/${g.slug}/members/${idolSlug(i.name)}`, label: i.name } : null;
  }
  if (entityType === 'era') {
    const { data } = await db.from('eras').select('name, groups(slug)').eq('id', Number(entityId)).maybeSingle();
    const e = data as { name: string; groups: { slug: string } | { slug: string }[] | null } | null;
    const g = e && (Array.isArray(e.groups) ? e.groups[0] : e.groups);
    return e && g ? { url: `/verse/${g.slug}/timeline`, label: `${e.name} era` } : null;
  }
  return null;
}

/** Notify every watcher of a page (except the editor) that it changed, via the spine. */
export async function notifyWatchers(entityType: string, entityId: string, exceptUserId: string, summary: string): Promise<void> {
  const db = createServiceRoleClient();
  const { data: watchers } = await db.from('verse_watchlists').select('user_id').eq('entity_type', entityType).eq('entity_id', entityId);
  const ids = [...new Set(((watchers ?? []) as Array<{ user_id: string }>).map((w) => w.user_id))].filter((id) => id !== exceptUserId);
  if (ids.length === 0) return;
  const link = await resolveEntityLink(entityType, entityId);
  const rows = ids.map((user_id) => ({
    user_id, type: 'verse_watch', sender_id: exceptUserId,
    title: link ? `${link.label} was updated` : 'A page you watch was updated',
    body: summary.slice(0, 200), link_url: link?.url ?? null, is_read: false,
  }));
  await db.from('creator_notifications').insert(rows);
}
