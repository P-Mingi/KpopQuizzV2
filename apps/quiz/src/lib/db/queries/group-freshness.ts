import { createPublicReadClient } from '@/lib/supabase/server';

// W9b - group content freshness.
//
// SOURCE CHOICE, and why it is not the obvious one: `quizzes.updated_at` looks like the
// freshness column, but record_play() bumps it on every PLAY. Using it would print
// today's date on any group anyone is currently playing, which is precisely the "never
// today's date, never a build timestamp" the mission forbids. It would be a lie wearing
// a DB column as a costume.
//
// `created_at` of the newest PUBLISHED quiz is when content was actually added to that
// group, so it moves when the page really changes and stays put when it does not. A
// group whose newest quiz is from April says April.
export async function getGroupContentDate(groupId: number): Promise<string | null> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('quizzes')
    .select('created_at')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>();
  return data?.created_at ?? null;
}

/** "August 2026". Null in, null out: no date is better than a made-up one. */
export function formatContentMonth(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
