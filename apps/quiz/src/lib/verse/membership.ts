// W4.2 - membership read models. Directory reads (public, RLS gives active members only)
// stay ISR-safe; a user's own space list uses the service role for the passport.
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { tierName } from '@/lib/verse/reputation';
import { resolveSpaceIdentities } from '@/lib/verse/identity';

import type { SpaceRole } from '@/lib/verse/roles';

export interface SpaceMember {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarBg: string | null;
  avatarText: string | null;
  href: string | null;   // resolver href: /u/{username}, or null for a system/usernameless account
  isSystem: boolean;
  role: SpaceRole;
  xp: number;
  tier: string;
  joinedAt: string;
}

export interface UserSpace { groupId: number; slug: string; name: string; fandomName: string | null; role: SpaceRole; xp: number; tier: string; }

const ROLE_ORDER: Record<string, number> = { space_admin: 0, curator: 1, contributor: 2, member: 3 };

/** Active members of a space, curators first, for the member directory (public/ISR).
 * space_members.user_id has no FK to profiles, so profiles are merged separately. */
export async function getSpaceMembers(groupId: number): Promise<SpaceMember[]> {
  const db = createPublicReadClient();
  const { data } = await db.from('space_members').select('user_id, role, contrib_xp, joined_at').eq('group_id', groupId);
  const rows = (data ?? []) as Array<{ user_id: string; role: SpaceRole; contrib_xp: number; joined_at: string }>;
  if (rows.length === 0) return [];

  // Identity through the shared resolver: a system account (KpopVerse) gets href
  // null, so the directory never links it to a /u/ profile. RLS already returns
  // active members only, so the raw space role drives the pill/staff logic.
  const ids = await resolveSpaceIdentities(rows.map((r) => r.user_id), groupId);

  return rows.map((r) => {
    const id = ids.get(r.user_id);
    return { userId: r.user_id, username: id?.username ?? null, displayName: id?.displayName ?? null, avatarUrl: id?.avatarUrl ?? null, avatarBg: id?.avatarBg ?? null, avatarText: id?.avatarText ?? null, href: id?.href ?? null, isSystem: id?.isSystem ?? false, role: r.role, xp: r.contrib_xp ?? 0, tier: tierName(r.contrib_xp ?? 0), joinedAt: r.joined_at };
  }).sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || b.xp - a.xp || a.joinedAt.localeCompare(b.joinedAt));
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
    .select('role, status, contrib_xp, groups(id, slug, name, fandom_name)')
    .eq('user_id', userId).eq('status', 'active');
  const rows = (data ?? []) as Array<{ role: SpaceRole; contrib_xp: number; groups: { id: number; slug: string; name: string; fandom_name: string | null } | { id: number; slug: string; name: string; fandom_name: string | null }[] | null }>;
  return rows.map((r) => {
    const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
    return g ? { groupId: g.id, slug: g.slug, name: g.name, fandomName: g.fandom_name, role: r.role, xp: r.contrib_xp ?? 0, tier: tierName(r.contrib_xp ?? 0) } : null;
  }).filter((x): x is UserSpace => x !== null);
}
