// Run O1, lane PERS: the series that have a Which character are you quiz, read with a client the caller gives (the sitemap of the
// anime site). Strict like the rest of lib/site/root-files.ts: a failed read throws, it is never turned into a shorter list.
// The pure half (countSets) is unit tested without a client. Server only.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';

import { SERIES_MIN_PROFILES } from './series';

interface ProfileRow {
  groups: { slug?: unknown } | Array<{ slug?: unknown }> | null;
}

/** Slugs with at least `floor` active profiles, A to Z. A row whose group has no valid slug is ignored. */
export function countSets(rows: readonly ProfileRow[], floor: number = SERIES_MIN_PROFILES): string[] {
  const n = new Map<string, number>();
  for (const r of rows) {
    const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
    const slug = g?.slug;
    if (typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) n.set(slug, (n.get(slug) ?? 0) + 1);
  }
  return [...n.entries()].filter(([, c]) => c >= floor).map(([s]) => s).sort();
}

/** The series of the anime site with a published quiz (six active profiles at least). */
export async function listSeriesSets(db: { from(table: string): any }): Promise<string[]> { // eslint-disable-line @typescript-eslint/no-explicit-any -- the builder is untyped on this app's clients
  const rows = await fetchAllRows<ProfileRow>(
    () => forSite(db.from('personality_profiles').select('group_id, groups!inner(slug)'), 'anime').eq('active', true).order('id'),
  );
  return countSets(rows);
}
