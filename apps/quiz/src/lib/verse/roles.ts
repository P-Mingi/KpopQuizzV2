// W4.1/W4.2 - per-space role resolution. The ladder is
//   visitor (no membership) -> member -> contributor -> curator -> space_admin.
// Global ADMIN_USER_IDS admins resolve to space_admin in every space (super-users),
// so the owner's dev account can exercise all curator/reviewer flows.
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export type SpaceRole = 'visitor' | 'member' | 'contributor' | 'curator' | 'space_admin';

const RANK: Record<SpaceRole, number> = { visitor: 0, member: 1, contributor: 2, curator: 3, space_admin: 4 };

export function roleAtLeast(role: SpaceRole, min: SpaceRole): boolean {
  return RANK[role] >= RANK[min];
}

/** Effective role of a user in a space. Global admins are space_admin everywhere. */
export async function getSpaceRole(userId: string | null, groupId: number): Promise<SpaceRole> {
  if (!userId) return 'visitor';
  if (isAdmin(userId)) return 'space_admin';
  const db = createServiceRoleClient(); // read own row incl. status, bypassing the active-only policy
  const { data } = await db.from('space_members').select('role, status').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
  const row = data as { role: SpaceRole; status: string } | null;
  if (!row || row.status === 'blocked') return 'visitor';
  return row.role;
}

/** Current signed-in user's id + effective role for a space (dynamic; uses cookies). */
export async function currentSpaceRole(groupId: number): Promise<{ userId: string | null; role: SpaceRole }> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  const role = await getSpaceRole(user?.id ?? null, groupId);
  return { userId: user?.id ?? null, role };
}

/** True when the user may curate (edit/review/protect) a given space. */
export async function canCurateSpace(userId: string | null, groupId: number): Promise<boolean> {
  return roleAtLeast(await getSpaceRole(userId, groupId), 'curator');
}

/** PUSH-GATE-1 (VERSE_PUBLIC): may this signed-in user see the Verse while it is hidden?
 *  Global admins and anyone who curates AT LEAST ONE space keep full access (builder, spaces,
 *  admin queues); everyone else (anonymous or a plain member) gets the teaser. Server-only. */
export async function isVersePrivileged(): Promise<boolean> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return false;
  if (isAdmin(user.id)) return true;
  const db = createServiceRoleClient(); // bypass the active-only policy to read the caller's own roles
  const { data } = await db.from('space_members').select('role').eq('user_id', user.id).in('role', ['curator', 'space_admin']).neq('status', 'blocked').limit(1);
  return !!(data && data.length);
}
