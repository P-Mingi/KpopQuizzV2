// W4.2 - membership read models. Directory reads (public, RLS gives active members only)
// stay ISR-safe; a user's own space list uses the service role for the passport.
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { SpaceRole } from '@/lib/verse/roles';

export interface SpaceMember {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarBg: string | null;
  avatarText: string | null;
  role: SpaceRole;
  joinedAt: string;
}

export interface UserSpace { groupId: number; slug: string; name: string; fandomName: string | null; role: SpaceRole; }

const ROLE_ORDER: Record<string, number> = { space_admin: 0, curator: 1, contributor: 2, member: 3 };

/** Active members of a space, curators first, for the member directory (public/ISR).
 * space_members.user_id has no FK to profiles, so profiles are merged separately. */
export async function getSpaceMembers(groupId: number): Promise<SpaceMember[]> {
  const db = createPublicReadClient();
  const { data } = await db.from('space_members').select('user_id, role, joined_at').eq('group_id', groupId);
  const rows = (data ?? []) as Array<{ user_id: string; role: SpaceRole; joined_at: string }>;
  if (rows.length === 0) return [];

  const { data: profs } = await db.from('profiles').select('id, username, display_name, avatar_url, avatar_bg, avatar_text').in('id', rows.map((r) => r.user_id));
  type Prof = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; avatar_bg: string | null; avatar_text: string | null };
  const byId = new Map((profs ?? []).map((p: Prof) => [p.id, p]));

  return rows.map((r) => {
    const p = byId.get(r.user_id);
    return { userId: r.user_id, username: p?.username ?? null, displayName: p?.display_name ?? null, avatarUrl: p?.avatar_url ?? null, avatarBg: p?.avatar_bg ?? null, avatarText: p?.avatar_text ?? null, role: r.role, joinedAt: r.joined_at };
  }).sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.joinedAt.localeCompare(b.joinedAt));
}

export async function countMembers(groupId: number): Promise<number> {
  const db = createPublicReadClient();
  const { count } = await db.from('space_members').select('user_id', { count: 'exact', head: true }).eq('group_id', groupId);
  return count ?? 0;
}

/** Spaces a user belongs to (for their passport). Service role: includes all own rows. */
export async function getUserSpaces(userId: string): Promise<UserSpace[]> {
  const db = createServiceRoleClient();
  const { data } = await db.from('space_members')
    .select('role, status, groups(id, slug, name, fandom_name)')
    .eq('user_id', userId).eq('status', 'active');
  const rows = (data ?? []) as Array<{ role: SpaceRole; groups: { id: number; slug: string; name: string; fandom_name: string | null } | { id: number; slug: string; name: string; fandom_name: string | null }[] | null }>;
  return rows.map((r) => {
    const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
    return g ? { groupId: g.id, slug: g.slug, name: g.name, fandomName: g.fandom_name, role: r.role } : null;
  }).filter((x): x is UserSpace => x !== null);
}
