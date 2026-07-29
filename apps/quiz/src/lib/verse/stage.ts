// W4.11 - per-space collaboration stage, built but OFF by default.
//   Stage A (default): curator-authored; everyone else suggests. (current behaviour)
//   Stage B: members edit through pre-moderation (their saves still queue as suggestions).
//   Stage C: reputation unlocks LIVE editing - trusted contributors edit directly.
// The mechanism reads verse_spaces.stage; since every space defaults to 'A', canEditDirect
// resolves to exactly the curator check (no behaviour change) until an owner flips a space.
import { createPublicReadClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { getSpaceXp } from '@/lib/verse/reputation';

export type Stage = 'A' | 'B' | 'C';
export const STAGES: Stage[] = ['A', 'B', 'C'];
export const STAGE_C_TRUST_XP = 300; // Veteran contributors gain direct editing at Stage C

export async function stageOf(groupId: number): Promise<Stage> {
  const db = createPublicReadClient();
  const { data } = await db.from('verse_spaces').select('stage').eq('group_id', groupId).maybeSingle();
  return ((data as { stage?: Stage } | null)?.stage ?? 'A');
}

/** Direct-edit rights for a space. Curators always; at Stage C, trusted contributors too.
 * At Stage A/B this equals the curator check exactly, so members do not edit directly. */
export async function canEditDirect(userId: string | null, groupId: number): Promise<boolean> {
  if (!userId) return false;
  if (await canCurateSpace(userId, groupId)) return true;
  if (await stageOf(groupId) !== 'C') return false;
  const { xp, role } = await getSpaceXp(userId, groupId);
  return role !== 'visitor' && xp >= STAGE_C_TRUST_XP;
}
