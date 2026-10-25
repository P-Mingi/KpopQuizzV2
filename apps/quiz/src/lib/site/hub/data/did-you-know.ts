// Run O1, lot H2b: Did you know, one sourced K-pop fact and one sourced anime fact a day (Plan.dc.html, section 3.C).
//
// The facts are the published, sourced rows of `trivia` in the categories fun and history that pass the quality filter of the trivia pages
// (isUsableFact), deduplicated by their canonical key. Spoilers: an anime fact about a character, an arc or an episode can spoil, so only
// series and theme facts are used (trivia rows carry no spoiler mark). The fact of a day is the day number modulo the pool, on a
// stable shuffle, so a fact is never shown twice within `pool` days: with 60 facts or more nothing repeats inside 60 days. A pool below 60
// repeats earlier (the rotation is the longest one the pool allows) and `pool` says by how much. Nothing is invented: a site with
// no usable fact gives null. The link goes to the trivia page of the site.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';
import { normalizeFactKey } from '@/lib/trivia/fact-key';
import { isUsableFact } from '@/lib/trivia/fact-quality';

import { hubCached } from './cache';
import { dayNumber, HUB_SITES, resolveOrigins, siteName, stableHash } from './util';

import type { HubDidYouKnow, HubFact, HubOpts, HubOrigins, HubSite } from './types';

type Db = ReturnType<typeof createPublicReadClient>;

export const DYK_NO_REPEAT_DAYS = 60;
export const DYK_CATEGORIES = ['fun', 'history'] as const;
/** Entity kinds whose facts can spoil a story (anime only; the kpop kinds are group, idol, album). */
export const DYK_SPOILER_KINDS: ReadonlySet<string> = new Set(['character', 'arc', 'episode']);

export interface TriviaRow {
  readonly id: string;
  readonly fact: string | null;
  readonly category: string | null;
  readonly entity_kind: string | null;
  readonly source: string | null;
  readonly source_url: string | null;
}

const SOURCE_NAMES: Readonly<Record<string, string>> = {
  wikipedia: 'Wikipedia', wikidata: 'Wikidata', musicbrainz: 'MusicBrainz', official: 'Official site', press: 'Press',
};

/** "wikipedia" to "Wikipedia"; a name that is already written out stays as it is. */
export function sourceName(raw: string): string {
  const s = raw.trim();
  return SOURCE_NAMES[s.toLowerCase()] ?? s;
}

/** The usable pool of a site, in a stable shuffled order. */
export function usablePool(site: HubSite, rows: readonly TriviaRow[]): TriviaRow[] {
  const seen = new Set<string>();
  const out: TriviaRow[] = [];
  for (const r of rows) {
    const fact = (r.fact ?? '').trim();
    if (!fact || !(r.source ?? '').trim()) continue;
    if (!(DYK_CATEGORIES as readonly string[]).includes(r.category ?? '')) continue;
    if (site === 'anime' && DYK_SPOILER_KINDS.has(r.entity_kind ?? '')) continue;
    if (!isUsableFact(fact)) continue;
    const key = normalizeFactKey(fact);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, fact });
  }
  return out.sort((a, b) => stableHash(a.id) - stableHash(b.id) || (a.id < b.id ? -1 : 1));
}

/** The fact of a day: the pool is walked one fact per day. */
export function factOfDay(pool: readonly TriviaRow[], now: Date): TriviaRow | null {
  return pool.length === 0 ? null : (pool[dayNumber(now) % pool.length] ?? null);
}

export async function loadTrivia(db: Db, site: HubSite): Promise<TriviaRow[]> {
  return fetchAllRows<TriviaRow>(() =>
    forSite(db.from('trivia').select('id, fact, category, entity_kind, source, source_url'), site)
      .eq('status', 'published').in('category', [...DYK_CATEGORIES]).order('id'));
}

export async function readDidYouKnow(origins: HubOrigins, now: Date, db: Db): Promise<HubDidYouKnow | null> {
  const pools = { kpop: [] as TriviaRow[], anime: [] as TriviaRow[] };
  for (const site of HUB_SITES) pools[site] = usablePool(site, await loadTrivia(db, site));
  const make = (site: HubSite): HubFact | null => {
    const row = factOfDay(pools[site], now);
    if (!row) return null;
    return {
      site,
      siteName: siteName(site),
      fact: row.fact ?? '',
      source: sourceName(row.source ?? ''),
      sourceUrl: row.source_url && row.source_url.trim() ? row.source_url.trim() : null,
      moreHref: `${origins[site]}/trivia`,
    };
  };
  const kpop = make('kpop');
  const anime = make('anime');
  if (!kpop && !anime) return null;
  return { kpop, anime, pool: { kpop: pools.kpop.length, anime: pools.anime.length } };
}

const cached = hubCached('did-you-know', (origins: HubOrigins) => readDidYouKnow(origins, new Date(), createPublicReadClient()));

/** The two facts of the day, cached one hour (tag hub:did-you-know). */
export async function getDidYouKnow(opts?: HubOpts): Promise<HubDidYouKnow | null> {
  return cached(resolveOrigins(opts));
}
