// W4.5 - a user's Verse edit-contribution graph, from real revision history
// (verse_revisions.author). Powers the contribution heatmap on the passport. Min-gated
// by the caller: nothing renders until there is at least one contribution.
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface ContribDay { date: string; count: number }

const SPAN_DAYS = 91; // 13 weeks

/** Daily Verse-edit counts for the last 13 weeks, plus the total in that window. */
export async function getVerseContributions(userId: string): Promise<{ total: number; days: ContribDay[] }> {
  const db = createServiceRoleClient();
  const since = new Date(Date.now() - SPAN_DAYS * 86400000).toISOString();
  const { data } = await db.from('verse_revisions').select('created_at').eq('author', userId).gte('created_at', since);

  const counts = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ created_at: string }>) {
    const d = r.created_at.slice(0, 10);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const days: ContribDay[] = [];
  for (let i = SPAN_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, count: counts.get(d) ?? 0 });
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return { total, days };
}
