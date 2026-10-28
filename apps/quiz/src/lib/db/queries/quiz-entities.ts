import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';
import { SITE_ID } from '@/lib/site/registry';

import type { GroupEntities } from '@/lib/quiz/quiz-about';

// The names a quiz page's About sentence may cite (SEO phase 1, lib/quiz/quiz-about.ts): the group's active
// members (stage names, as the Name them all roster reads them), its active songs and their albums. Catalog
// data, cached 6 h. A failed read throws (not cached); the page falls back to the plain sentence.
async function readGroupEntities(groupId: number): Promise<GroupEntities> {
  const db = createPublicReadClient();
  const [idols, songs] = await Promise.all([
    db.from('idols').select('name').eq('group_id', groupId).eq('active', true).is('detached_at', null),
    fetchAllRows<{ title: string | null; album_name: string | null }>(
      () => forSite(db.from('songs').select('title, album_name')).eq('group_id', groupId).eq('status', 'active').order('id', { ascending: true }),
    ),
  ]);
  if (idols.error) throw new Error(`quiz entities: idols: ${idols.error.message}`);
  const clean = (v: unknown): string | null => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);
  const uniq = (xs: Array<string | null>): string[] => [...new Set(xs.filter((x): x is string => x !== null))];
  return {
    members: uniq((idols.data ?? []).map((r: { name: unknown }) => clean(r.name))),
    songs: uniq(songs.map((s) => clean(s.title))),
    albums: uniq(songs.map((s) => clean(s.album_name))),
  };
}

export const getGroupEntities = unstable_cache(
  readGroupEntities,
  ['db:quiz-entities:v1', SITE_ID],
  { revalidate: CACHE_TTL.catalog, tags: ['groups', 'songs'] },
);
