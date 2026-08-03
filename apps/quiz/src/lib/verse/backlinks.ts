// W3K.9 - "what links here". Real backlinks: other groups whose authored content
// @-mentions this group (mention nodes store the Verse URL as their id). Bounded scan
// of verse_content (small); min-gated by the caller so it hides when empty.
import { createPublicReadClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db/fetch-all';

export interface Backlink { name: string; slug: string; }

/** Groups whose content mentions /verse/{targetSlug}, self excluded. */
export async function getGroupBacklinks(targetSlug: string): Promise<Backlink[]> {
  try {
    const db = createPublicReadClient();
    // Paginated: this scans every group's overview content (one row per group,
    // cross-space) - it exceeds 1000 as the catalog grows (V-REPAIR sweep B).
    const data = await fetchAllRows<{ entity_id: string; content: unknown }>(() => db.from('verse_content').select('entity_id, content').eq('entity_type', 'group'));
    const needle = `"/verse/${targetSlug}"`; // mention id is the canonical URL string
    const sourceIds = new Set<number>();
    for (const row of data) {
      if (String(row.entity_id) === '' ) continue;
      if (JSON.stringify(row.content ?? '').includes(needle)) sourceIds.add(Number(row.entity_id));
    }
    if (sourceIds.size === 0) return [];
    const { data: groups } = await db.from('groups').select('name, slug').in('id', [...sourceIds]);
    return ((groups ?? []) as Backlink[]).filter((g) => g.slug !== targetSlug);
  } catch {
    return [];
  }
}
