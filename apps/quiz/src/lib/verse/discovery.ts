// W3K.9 - discovery signals for the Verse directory. Trending uses a real engagement
// signal (quiz plays); random picks any content group. All from existing data.
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';

export interface TrendingGroup { slug: string; name: string; fandom_name: string | null; total_plays: number; }

const contentGroupIds = cache(async (): Promise<number[]> => {
  const db = createPublicReadClient();
  const { data } = await db.from('albums').select('group_id');
  return [...new Set(((data ?? []) as Array<{ group_id: number }>).map((a) => a.group_id))];
});

/** Top groups by real quiz engagement (total_plays), among groups with content. */
export const getTrending = cache(async (limit = 6): Promise<TrendingGroup[]> => {
  const ids = await contentGroupIds();
  if (!ids.length) return [];
  const db = createPublicReadClient();
  const { data } = await db.from('groups')
    .select('slug, name, fandom_name, total_plays')
    .in('id', ids)
    .order('total_plays', { ascending: false, nullsFirst: false })
    .limit(limit);
  return ((data ?? []) as TrendingGroup[]).filter((g) => (g.total_plays ?? 0) > 0);
});

/** A random content-group slug, or null. Caller redirects to it. */
export async function randomGroupSlug(): Promise<string | null> {
  const ids = await contentGroupIds();
  if (!ids.length) return null;
  const pick = ids[Math.floor(Math.random() * ids.length)];
  const db = createPublicReadClient();
  const { data } = await db.from('groups').select('slug').eq('id', pick).maybeSingle();
  return (data as { slug: string } | null)?.slug ?? null;
}
