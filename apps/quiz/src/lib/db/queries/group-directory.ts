import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db/fetch-all';

import type { Group } from '@/lib/db/types';

export interface DirectoryGroup {
  group: Group;
  /** Real count of PUBLISHED quizzes. Not groups.quiz_count, see below. */
  quizzes: number;
}

const TTL_SECONDS = 3600;

// W7b - the A-Z directory's data.
//
// COUNT SOURCE: `groups.quiz_count` is denormalised and inflated: it counts rows that
// are not published. Measured 2026-08-16, it disagrees with reality on 4 of 37 groups
// (bts 30 vs 27, blackpink 27 vs 22, stray-kids 27 vs 26, artms 5 vs 4). A directory
// that prints "30 quizzes" and then shows 27 is publishing a number nobody can verify,
// so the count is computed from published rows at read time instead.
//
// The row read is paginated through fetchAllRows because PostgREST caps .select() at
// 1000 and there are already 400 published quizzes; counting client-side off a capped
// read is how the ranking dead-walls happened.
async function fetchDirectoryGroups(): Promise<DirectoryGroup[]> {
  const db = createPublicReadClient();

  const [published, groupsRes] = await Promise.all([
    // A built PostgREST query can only be awaited once, so this must be a factory
    // that returns a FRESH query per page.
    fetchAllRows<{ group_id: number }>(
      () => db.from('quizzes').select('group_id').eq('status', 'published'),
    ),
    db.from('groups').select('*'),
  ]);

  const counts = new Map<number, number>();
  for (const q of published) {
    if (q.group_id == null) continue;
    counts.set(q.group_id, (counts.get(q.group_id) ?? 0) + 1);
  }

  const groups = (groupsRes.data ?? []) as Group[];

  return groups
    .map(group => ({ group, quizzes: counts.get(group.id) ?? 0 }))
    // A group earns a row by having something to play, never by existing.
    .filter(row => row.quizzes > 0)
    .sort((a, b) => a.group.name.localeCompare(b.group.name, 'en'));
}

export const getDirectoryGroups = unstable_cache(
  fetchDirectoryGroups,
  ['db:groups:directory:v1'],
  { revalidate: TTL_SECONDS, tags: ['groups'] },
);

/** First character used for the A-Z index. Anything not A-Z lands in "#". */
export function alphaKey(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}
