// Run O1, lot (e) part 2, lane E1a: the loader of the series directory of fandomverse.org/anime (/series). It lists the
// published series of the anime site: the `groups` rows of site anime that have a published `series` row, with the real
// count of their published quizzes (never groups.quiz_count, which is denormalised: the same rule as the kpop directory).
// Every read of a scoped table goes through forSite. Any failed read throws, so unstable_cache never keeps a bad list;
// the page turns it into an empty list through safeFetch.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';

import { ANIME_MIX_SLUG } from './types';

import type { DirectoryGroup } from '@/lib/db/queries/group-directory';
import type { Group } from '@/lib/db/types';
import type { SeriesDb } from './series';
import type { SeriesType } from './types';

/** A row of the series directory: the shared directory row and the `series.type` of the series (a webtoon is a manhwa). */
export type SeriesDirectoryRow = DirectoryGroup & { readonly seriesType?: SeriesType | undefined };

interface Result<T> { data: T | null; error: { message: string } | null }

/** The directory rows, by name: a series earns a row by being published and having a published quiz. */
export async function loadSeriesDirectory(db: SeriesDb): Promise<SeriesDirectoryRow[]> {
  const [seriesRes, groupsRes, published] = await Promise.all([
    db.from('series').select('group_id, type').eq('published', true) as PromiseLike<Result<{ group_id: number; type?: SeriesType }[]>>,
    forSite(db.from('groups').select('*'), 'anime') as PromiseLike<Result<Group[]>>,
    fetchAllRows<{ group_id: number | null }>(() => forSite(db.from('quizzes').select('group_id'), 'anime').eq('status', 'published')),
  ]);
  if (seriesRes.error) throw new Error(`series directory: series: ${seriesRes.error.message}`);
  if (groupsRes.error) throw new Error(`series directory: groups: ${groupsRes.error.message}`);

  const listed = new Map((seriesRes.data ?? []).map((s) => [s.group_id, s.type] as const));
  const counts = new Map<number, number>();
  for (const q of published) {
    if (q.group_id == null) continue;
    counts.set(q.group_id, (counts.get(q.group_id) ?? 0) + 1);
  }
  return (groupsRes.data ?? [])
    .filter((g) => listed.has(g.id))
    .map((group) => ({ group, quizzes: counts.get(group.id) ?? 0, seriesType: listed.get(group.id) }))
    .filter((row) => row.quizzes > 0)
    .sort((a, b) => a.group.name.localeCompare(b.group.name, 'en'));
}

export const getSeriesDirectory = unstable_cache(
  async (): Promise<SeriesDirectoryRow[]> => loadSeriesDirectory(createPublicReadClient()),
  ['db:anime:series-directory:v2'],
  { revalidate: CACHE_TTL.stats, tags: ['groups', 'series', 'quizzes'] },
);

/**
 * The hub slugs the anime build can serve (build time: the [slug] route is generated from this list because its parent
 * layout has dynamicParams off): `{series}-quiz` and `{series}-trivia` for every published series of the site, and
 * `anime-mix-quiz` when the site has its Anime Mix group. The page itself still answers 404 for a series that is
 * missing at request time or a trivia page under the fact floor. Throws on a failed read.
 */
export async function loadSeriesHubSlugs(db: SeriesDb): Promise<string[]> {
  const [seriesRes, groupsRes] = await Promise.all([
    db.from('series').select('group_id').eq('published', true) as PromiseLike<Result<{ group_id: number }[]>>,
    forSite(db.from('groups').select('id, slug'), 'anime') as PromiseLike<Result<{ id: number; slug: string }[]>>,
  ]);
  if (seriesRes.error) throw new Error(`series hub slugs: series: ${seriesRes.error.message}`);
  if (groupsRes.error) throw new Error(`series hub slugs: groups: ${groupsRes.error.message}`);
  const listed = new Set((seriesRes.data ?? []).map((s) => s.group_id));
  const out: string[] = [];
  for (const g of groupsRes.data ?? []) {
    if (listed.has(g.id)) out.push(`${g.slug}-quiz`, `${g.slug}-trivia`);
    else if (g.slug === ANIME_MIX_SLUG) out.push(`${g.slug}-quiz`);
  }
  return out.sort();
}

/** Build-time wrapper: fail-soft like the other generateStaticParams of the app (a degraded build beats a failed one). */
export async function getSeriesHubSlugs(): Promise<string[]> {
  try {
    return await loadSeriesHubSlugs(createPublicReadClient());
  } catch (err) {
    console.warn('[slug] generateStaticParams failed - no series hub is prerendered:', (err as Error)?.message ?? err);
    return [];
  }
}
