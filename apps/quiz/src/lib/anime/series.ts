// Run O1, lot (b), lane LB: the loader of the series hub (bunnyverse.org/anime, /{series}-quiz and /{series}-trivia).
//
// A series is a `groups` row of site anime (series.group_id, 1:1). getSeriesHub(slug) reads the group, `series`,
// `arcs`, `characters`, `series_themes`, `trivia` (entity_kind 'series'), `entity_sources`, the favourite counts and
// the series' published quizzes, through the cookie-free server client (the page stays ISR) and forSite. Any error
// (a missing table before SQL 011 is applied, a network failure) or a missing or unpublished row returns null; the
// page then calls notFound(). Nothing here writes, and nothing here is spoiler-aware: the page decides what a
// reader may see (the HTML carries only what is safe for the spoiler-free view).

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { Group } from '@/lib/db/types';
import type { ArcRow, CharacterRow, SeriesRow, SeriesThemeRow, SeriesType } from './types';

/** A published quiz of the series with its spoiler level (quizzes.spoiler_arc_ord, spoiler_scope; computed on the server). */
export interface SeriesQuizRow {
  readonly slug: string;
  readonly title: string;
  readonly quiz_type: string;
  readonly difficulty: string;
  readonly play_count: number;
  readonly like_count: number;
  readonly total_score_sum: number;
  readonly total_completions: number;
  readonly question_count: number;
  readonly created_at: string;
  readonly spoiler_arc_ord: number | null;
  readonly spoiler_scope: 'anime' | 'manga' | 'both' | null;
}

/** One `entity_sources` row of the series (entity_type 'series', entity_id the group slug: formats.md 3). */
export interface SeriesSourceRow {
  readonly field: string;
  readonly source: 'wikidata' | 'musicbrainz' | 'wikipedia' | 'official';
  readonly source_ref: string | null;
  readonly source_url: string | null;
  readonly fetched_at: string;
}

/** One published `trivia` row of the series (entity_kind 'series'). */
export interface SeriesFactRow {
  readonly fact: string;
  readonly category: 'members' | 'music' | 'achievements' | 'history' | 'fun';
  readonly source: string;
  readonly source_url: string | null;
}

/** The series next to another one on the hub ("Related series"). */
export interface RelatedSeries {
  readonly slug: string;
  readonly name: string;
  readonly quizzes: number;
  /** `series.type` of the series (a webtoon is a manhwa: lib/anime/manhwa.ts). */
  readonly type?: SeriesType | undefined;
}

export interface SeriesHub {
  /** The anime `groups` row; quiz_count is the published count. */
  readonly group: Group;
  readonly series: SeriesRow;
  readonly arcs: readonly ArcRow[];
  readonly characters: readonly CharacterRow[];
  /** op, then ed, then insert; by number. */
  readonly themes: readonly SeriesThemeRow[];
  readonly trivia: readonly SeriesFactRow[];
  readonly sources: readonly SeriesSourceRow[];
  readonly quizzes: readonly SeriesQuizRow[];
  /** Picks per character id, only the characters at 30 picks or more (the favourite_character_counts view). */
  readonly oshiCounts: Readonly<Record<number, number>>;
}

/** The part of the supabase-js client the loader uses (a test passes a fake). */
export interface SeriesDb {
  from(table: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any -- the builder is untyped on this app's clients
}

interface Result<T> { data: T | null; error: { message: string } | null }

const QUIZ_COLS = 'slug, title, quiz_type, difficulty, play_count, like_count, total_score_sum, total_completions, question_count, created_at, spoiler_arc_ord, spoiler_scope';
const THEME_ORDER: Record<string, number> = { op: 0, ed: 1, insert: 2 };

function must<T>(res: Result<T>, what: string): T | null {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

/** The loader with its client given: the whole read, or null on any error or missing row. */
export async function loadSeriesHub(db: SeriesDb, slug: string): Promise<SeriesHub | null> {
  try {
    const group = must(
      (await forSite(db.from('groups').select('*'), 'anime').eq('slug', slug).maybeSingle()) as Result<Group>,
      'groups',
    );
    if (!group) return null;
    const gid = group.id;

    const [series, arcs, characters, themes, trivia, sources, counts, quizzes] = await Promise.all([
      db.from('series').select('*').eq('group_id', gid).eq('published', true).maybeSingle() as PromiseLike<Result<SeriesRow>>,
      db.from('arcs').select('*').eq('group_id', gid).eq('status', 'published').order('ord', { ascending: true }) as PromiseLike<Result<ArcRow[]>>,
      db.from('characters').select('*').eq('group_id', gid).eq('status', 'published').order('ord', { ascending: true }).order('name', { ascending: true }) as PromiseLike<Result<CharacterRow[]>>,
      db.from('series_themes').select('*').eq('group_id', gid).eq('status', 'published') as PromiseLike<Result<SeriesThemeRow[]>>,
      forSite(db.from('trivia').select('fact, category, source, source_url'), 'anime')
        .eq('group_id', gid).eq('entity_kind', 'series').eq('status', 'published')
        .order('weight', { ascending: false }) as PromiseLike<Result<SeriesFactRow[]>>,
      db.from('entity_sources').select('field, source, source_ref, source_url, fetched_at')
        .eq('entity_type', 'series').eq('entity_id', group.slug) as PromiseLike<Result<SeriesSourceRow[]>>,
      db.from('favourite_character_counts').select('character_id, picks').eq('group_id', gid) as PromiseLike<Result<{ character_id: number | null; picks: number | null }[]>>,
      fetchAllRows<SeriesQuizRow>(() => forSite(db.from('quizzes').select(QUIZ_COLS), 'anime')
        .eq('group_id', gid).eq('status', 'published')
        .order('play_count', { ascending: false }).order('created_at', { ascending: false })),
    ]);

    const seriesRow = must(series, 'series');
    if (!seriesRow || seriesRow.published !== true) return null;
    const oshiCounts: Record<number, number> = {};
    for (const c of must(counts, 'favourite_character_counts') ?? []) {
      if (typeof c.character_id === 'number' && typeof c.picks === 'number') oshiCounts[c.character_id] = c.picks;
    }
    const themeRows = [...(must(themes, 'series_themes') ?? [])]
      .sort((a, b) => (THEME_ORDER[a.kind] ?? 9) - (THEME_ORDER[b.kind] ?? 9) || a.number - b.number);

    return {
      group: { ...group, quiz_count: quizzes.length },
      series: seriesRow,
      arcs: must(arcs, 'arcs') ?? [],
      characters: must(characters, 'characters') ?? [],
      themes: themeRows,
      trivia: must(trivia, 'trivia') ?? [],
      sources: must(sources, 'entity_sources') ?? [],
      quizzes: quizzes.map((q) => ({
        ...q,
        play_count: q.play_count ?? 0,
        like_count: q.like_count ?? 0,
        total_score_sum: q.total_score_sum ?? 0,
        total_completions: q.total_completions ?? 0,
        question_count: q.question_count ?? 0,
      })),
      oshiCounts,
    };
  } catch (err) {
    console.error('[getSeriesHub] read failed:', (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * The hub of one series by its group slug (cookie-free, cached for the stats TTL like the other hub reads), or null
 * when the series is missing, unpublished or any read fails.
 */
export const getSeriesHub = unstable_cache(
  async (slug: string): Promise<SeriesHub | null> => {
    let db: SeriesDb;
    try {
      db = createPublicReadClient();
    } catch (err) {
      console.error('[getSeriesHub] no client:', (err as Error)?.message ?? err);
      return null;
    }
    return loadSeriesHub(db, slug);
  },
  ['db:anime:getSeriesHub:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['groups', 'quizzes', 'series'] },
);

/** Other published series for "Related series": most quizzes first, the current one left out. [] on any error. */
export async function loadRelatedSeries(db: SeriesDb, groupId: number, limit = 4): Promise<RelatedSeries[]> {
  try {
    const list = must((await db.from('series').select('group_id, type').eq('published', true).limit(60)) as Result<{ group_id: number; type?: SeriesType }[]>, 'series') ?? [];
    const typeOf = new Map(list.map((r) => [r.group_id, r.type] as const));
    const ids = list.map((r) => r.group_id).filter((id) => id !== groupId);
    if (ids.length === 0) return [];
    const groups = must(
      (await forSite(db.from('groups').select('id, slug, name, quiz_count'), 'anime').in('id', ids)) as Result<{ id: number; slug: string; name: string; quiz_count: number | null }[]>,
      'groups',
    ) ?? [];
    return groups
      .map((g) => ({ slug: g.slug, name: g.name, quizzes: g.quiz_count ?? 0, type: typeOf.get(g.id) }))
      .sort((a, b) => b.quizzes - a.quizzes || a.name.localeCompare(b.name))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export const getRelatedSeries = unstable_cache(
  async (groupId: number): Promise<RelatedSeries[]> => {
    try {
      return await loadRelatedSeries(createPublicReadClient(), groupId);
    } catch {
      return [];
    }
  },
  ['db:anime:getRelatedSeries:v2'],
  { revalidate: CACHE_TTL.catalog, tags: ['groups', 'series'] },
);
