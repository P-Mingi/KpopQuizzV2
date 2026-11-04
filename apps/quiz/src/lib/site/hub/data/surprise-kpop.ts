// Surprise me on the kpopquiz.org home (owner, 2026-10-31, CR-015): the pool of its K-pop quizzes, on every state of the database. Its own read:
// kpopquiz.org ships before the launch SQL, so production has no quizzes.site_id and no series table yet, and loadCatalog and loadTiers, which the
// hub and OtakuQuiz read (and need unchanged), would both fail there.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { SITE_ID } from '@/lib/site/registry';
import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';

import { hubCached } from './cache';
import { sitePool } from './surprise';
import { groupOf, isListable, QUIZ_SELECT, resolveOrigins } from './util';

import type { Db } from './catalog';
import type { HubOpts, HubOrigins, HubSurpriseCard } from './types';
import type { QuizRow } from './util';

/** The select when the column is missing. */
export const QUIZ_SELECT_BEFORE_SITE_ID = QUIZ_SELECT.replace(' site_id,', '');

interface ReadError { readonly code?: string; readonly message: string }
interface Page { readonly data: unknown[] | null; readonly error: ReadError | null }

/** Only an undefined column, and only site_id: 42703 from Postgres on a select, PGRST204 is PostgREST's own form of it. */
export function isMissingSiteId(error: ReadError | null): boolean {
  return (error?.code === '42703' || error?.code === 'PGRST204') && /\bsite_id\b/.test(error.message);
}

/**
 * The published, listable K-pop quizzes, past the 1000 row cap:
 * - the column exists: each row's site_id is checked, because forSite(query, 'kpop') is a no-op on the kpop build while SITE_SCOPE is off, so
 *   an unscoped read also returns the anime rows of the shared table;
 * - the column does not exist yet: no quiz can be of another site, so the same read runs without it and each row is K-pop. Only that error
 *   opens this path, and only on the kpop build; any other error throws, as every other block of the home.
 */
async function loadKpopCatalog(db: Db): Promise<QuizRow[]> {
  let failure: ReadError | null = null; // fetchAllRows keeps the message of an error, not its code
  const keepingError = (query: { range(from: number, to: number): PromiseLike<Page> }) => ({
    range: async (from: number, to: number): Promise<Page> => {
      const page = await query.range(from, to);
      failure = page.error;
      return page;
    },
  });
  try {
    const rows = await fetchAllRows<QuizRow>(() => keepingError(forSite(db.from('quizzes').select(QUIZ_SELECT), 'kpop').eq('status', 'published').order('id')));
    return rows.filter((q) => q.site_id === 'kpop' && isListable(q));
  } catch (err) {
    if (SITE_ID !== 'kpop' || !isMissingSiteId(failure)) throw err;
  }
  const rows = await fetchAllRows<Omit<QuizRow, 'site_id'>>(() => db.from('quizzes').select(QUIZ_SELECT_BEFORE_SITE_ID).eq('status', 'published').order('id'));
  return rows.map((q) => ({ ...q, site_id: 'kpop' })).filter(isListable);
}

/**
 * The 100 best K-pop quizzes by quality. No tier read: a tier is an anime grade. Null when there is none. Each card also carries the slug of
 * its group (owner, 2026-11-04: the tile of the pick shows the group's picture, groupPhotoUrl(slug)), read from the rows already loaded:
 * the select, its retry and the number of reads are what they were, and the cards of the hub and of OtakuQuiz (sitePool) are unchanged.
 */
export async function readKpopSurprisePool(origins: HubOrigins, now: Date, db: Db): Promise<HubSurpriseCard[] | null> {
  const rows = await loadKpopCatalog(db);
  const pool = sitePool('kpop', rows, new Map(), origins, now);
  const slugOf = new Map(rows.map((q) => [q.id, groupOf(q).slug] as const));
  return pool.length > 0 ? pool.map((c) => ({ ...c, groupSlug: slugOf.get(c.id) ?? '' })) : null;
}

const cachedPool = hubCached('surprise-kpop', (origins: HubOrigins) => readKpopSurprisePool(origins, new Date(), createPublicReadClient()));

/** The pool (cached one hour, tag hub:surprise-kpop), null when there is no quiz or the read failed with nothing kept. */
export async function getKpopSurprisePool(opts?: HubOpts): Promise<HubSurpriseCard[] | null> {
  return cachedPool(resolveOrigins(opts));
}
