// W4.9 - the role-decay job (server-only). A space should not be run by ghosts: a curator
// inactive past the decay window is demoted to contributor so the role frees up.
// space_admins (owners) never decay, and the global admin can always re-appoint
// (owner-as-arbiter). Contributor rank is XP-derived and is not decayed. Pure policy
// helpers live in decay-policy.ts (client-safe).
import { createServiceRoleClient } from '@/lib/supabase/server';
import { CURATOR_DECAY_DAYS, inactiveDays } from '@/lib/verse/decay-policy';

const DAY = 86400000;

/** Demote curators inactive >= CURATOR_DECAY_DAYS to contributor. Idempotent. */
export async function runRoleDecay(): Promise<{ demoted: number; details: Array<{ group_id: number; user_id: string; days: number }> }> {
  const db = createServiceRoleClient();
  const cutoff = new Date(Date.now() - CURATOR_DECAY_DAYS * DAY).toISOString().slice(0, 10);
  const { data } = await db.from('space_members')
    .select('id, group_id, user_id, role, last_contrib_date, joined_at')
    .eq('role', 'curator').eq('status', 'active');
  const rows = (data ?? []) as Array<{ id: number; group_id: number; user_id: string; role: string; last_contrib_date: string | null; joined_at: string }>;

  const stale = rows.filter((r) => (r.last_contrib_date ?? r.joined_at.slice(0, 10)) < cutoff);
  for (const r of stale) {
    await db.from('space_members').update({ role: 'contributor', updated_at: new Date().toISOString() }).eq('id', r.id);
  }
  return { demoted: stale.length, details: stale.map((r) => ({ group_id: r.group_id, user_id: r.user_id, days: inactiveDays(r) })) };
}
