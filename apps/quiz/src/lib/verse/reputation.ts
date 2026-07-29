// W4.4/W4.5 - per-space contributor reputation. XP is scoped to a space (contrib_xp on
// space_members) - a Veteran of one space is not a Veteran elsewhere. Reaching the
// Contributor threshold auto-promotes member -> contributor (ladders toward edit rights).
import { createServiceRoleClient } from '@/lib/supabase/server';

export const XP_BY_KIND: Record<string, number> = {
  overview: 50, era_story: 30, idol_lore: 20, tour: 30, show: 30, ost: 30, source: 10,
};

/** XP earned for filling a section gap (a quest), by entity + section. 0 = not a quest. */
export function questXpForSection(entityType: string, sectionKey: string): number {
  if (entityType === 'group' && sectionKey === 'overview') return XP_BY_KIND.overview!;
  if (entityType === 'era' && sectionKey === 'era_story') return XP_BY_KIND.era_story!;
  if (entityType === 'idol' && sectionKey === 'lore') return XP_BY_KIND.idol_lore!;
  return 0;
}

// Per-space rank tiers by contrib_xp. Reaching Regular (100) also grants the
// 'contributor' role (edit rights under Stage B).
export const TIERS = [
  { name: 'Rookie', min: 0 },
  { name: 'Regular', min: 100 },
  { name: 'Veteran', min: 300 },
] as const;

const CONTRIBUTOR_XP = 100;

export interface SpaceXp { xp: number; role: string; tier: string; nextTier: string | null; xpToNext: number | null; }

function tierFor(xp: number): { tier: string; nextTier: string | null; xpToNext: number | null } {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i]!.min) idx = i;
  const next = TIERS[idx + 1] ?? null;
  return { tier: TIERS[idx]!.name, nextTier: next?.name ?? null, xpToNext: next ? next.min - xp : null };
}

/** A user's XP + rank in a space. Visitor (no row) reads as 0 / Rookie. */
export async function getSpaceXp(userId: string, groupId: number): Promise<SpaceXp> {
  const db = createServiceRoleClient();
  const { data } = await db.from('space_members').select('contrib_xp, role, status').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
  const row = data as { contrib_xp: number; role: string; status: string } | null;
  const xp = row && row.status === 'active' ? row.contrib_xp : 0;
  return { xp, role: row?.status === 'active' ? row.role : 'visitor', ...tierFor(xp) };
}

/** Award per-space XP to a contributor and auto-promote member -> contributor at 100.
 * Creates a membership row if the contributor was not yet a member. */
export async function awardSpaceXp(userId: string, groupId: number, xp: number): Promise<void> {
  if (xp <= 0) return;
  const db = createServiceRoleClient();
  const { data } = await db.from('space_members').select('id, contrib_xp, role, status').eq('group_id', groupId).eq('user_id', userId).maybeSingle();
  const row = data as { id: number; contrib_xp: number; role: string; status: string } | null;
  if (!row) {
    await db.from('space_members').insert({ group_id: groupId, user_id: userId, role: xp >= CONTRIBUTOR_XP ? 'contributor' : 'member', status: 'active', contrib_xp: xp, last_contrib_date: new Date().toISOString().slice(0, 10) });
    return;
  }
  if (row.status === 'blocked') return; // blocked members earn nothing
  const nextXp = row.contrib_xp + xp;
  const patch: Record<string, unknown> = { contrib_xp: nextXp, last_contrib_date: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() };
  if (row.role === 'member' && nextXp >= CONTRIBUTOR_XP) patch.role = 'contributor'; // never demote curators/admins
  await db.from('space_members').update(patch).eq('id', row.id);
}
