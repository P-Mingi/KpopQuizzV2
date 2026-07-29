// W4.3 - resolve the space a piece of content belongs to, and gate curator actions by
// per-space role. Global admins pass everywhere; per-space curators pass on their space.
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { canCurateSpace } from '@/lib/verse/roles';

const ENTITY_TABLE: Record<string, string> = { idol: 'idols', era: 'eras', album: 'albums', tour: 'tours', show: 'shows', ost: 'osts', award: 'awards' };

/** The group id that owns an entity, for role gating. null if it can't be resolved. */
export async function resolveEntityGroupId(entityType: string, entityId: string): Promise<number | null> {
  if (entityType === 'group') { const n = Number(entityId); return Number.isFinite(n) ? n : null; }
  const table = ENTITY_TABLE[entityType];
  if (!table) return null;
  const db = createServiceRoleClient();
  const { data } = await db.from(table).select('group_id, idol_id').eq('id', Number(entityId)).maybeSingle();
  const row = data as { group_id: number | null; idol_id: number | null } | null;
  if (!row) return null;
  if (row.group_id) return row.group_id;
  if (row.idol_id) { // idol-level rows (some shows/ost): resolve group through the idol
    const { data: idol } = await db.from('idols').select('group_id').eq('id', row.idol_id).maybeSingle();
    return (idol as { group_id: number } | null)?.group_id ?? null;
  }
  return null;
}

export async function canCurateEntity(userId: string | null, entityType: string, entityId: string): Promise<boolean> {
  if (!userId) return false;
  if (isAdmin(userId)) return true;
  const gid = await resolveEntityGroupId(entityType, entityId);
  return gid == null ? false : canCurateSpace(userId, gid);
}

/** Route helper: the signed-in user if they may curate this entity, else null (-> 403). */
export async function curatorForEntity(entityType: string, entityId: string): Promise<{ id: string } | null> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  return (await canCurateEntity(user.id, entityType, entityId)) ? { id: user.id } : null;
}
