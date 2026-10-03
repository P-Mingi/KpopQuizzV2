import type { SupabaseClient } from '@supabase/supabase-js';

// The one insert of a fan debate (community_debates). The fan route
// (app/api/ux-v1/p8/debates) and the editorial publisher (lib/editorial/store.ts)
// both go through it, so an editorial debate is written exactly like a fan's.
// It grants nothing: no XP, badge, streak, activity event or notification.

export interface CommunityDebateRow {
  group_id: number | null;
  author: string;
  question: string;
  body: string | null;
  options: string[];
  closes_at: string;
}

export async function insertCommunityDebate(svc: SupabaseClient, row: CommunityDebateRow): Promise<{ id: number } | { error: string }> {
  const { data, error } = await svc.from('community_debates')
    .insert({ group_id: row.group_id, author: row.author, question: row.question, body: row.body, options: row.options, closes_at: row.closes_at, status: 'visible' })
    .select('id').single();
  if (error) return { error: error.message };
  return { id: (data as { id: number }).id };
}
