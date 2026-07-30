// W-CUSTOM step 5 - space-scoped poll reads. The active poll is the newest open,
// non-expired space_polls row for the group. Tallies aggregate space_poll_votes
// (one real vote per user, enforced by the UNIQUE constraint). Real votes only.
import { createPublicReadClient } from '@/lib/supabase/server';

export interface SpacePoll { id: number; question: string; options: string[]; status: string; expires_at: string | null }
export interface PollTally { poll: SpacePoll; counts: number[]; total: number }

export async function getActiveSpacePoll(groupId: number): Promise<PollTally | null> {
  const db = createPublicReadClient();
  const { data: poll } = await db.from('space_polls')
    .select('id, question, options, status, expires_at')
    .eq('group_id', groupId).eq('status', 'open')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!poll) return null;
  const p = poll as SpacePoll;
  if (p.expires_at && new Date(p.expires_at).getTime() < Date.now()) return null; // auto-expired
  const options = Array.isArray(p.options) ? p.options : [];
  const { data: votes } = await db.from('space_poll_votes').select('option_index').eq('poll_id', p.id);
  const rows = (votes ?? []) as { option_index: number }[];
  const counts = options.map((_o, i) => rows.filter((v) => v.option_index === i).length);
  return { poll: { ...p, options }, counts, total: rows.length };
}
