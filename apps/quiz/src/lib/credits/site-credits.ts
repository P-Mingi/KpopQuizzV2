// CR-021 (owner decision of 2026-11-02): /credits exists on a site only if at least one image in use on that site needs a credit (CC BY or
// CC BY-SA). This is the one question, "does this site have a credit to show?", asked by GET /api/site-credits (the footer's Credits link, drawn
// by the browser after the page has loaded, so no served page depends on it) and by the footer of the hub's games. Server only. Fail closed: with no database, a view that is not there yet (022 not
// applied) or any error, the answer is no, and the page and its link are simply absent.
//
// Cost: one cached read of six hours per build (CACHE_TTL.catalog), tagged 'site-credits'. The admin lives on another build, so its writes cannot
// expire this cache: the link appears or goes within six hours. The read is cookie-free. No page layout calls it (a layout that awaited it would
// change the Flight data of every kpopquiz.org page), and this module imports nothing of the anime or hub code at the top (the bundled photos and
// the owner's rows are loaded in the anime branch only).
import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { createPublicReadClient } from '@/lib/supabase/server';
import { SITE_ID } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

/** The kinds of picture each site shows (null: every kind). kpopquiz.org shows idols and groups; OtakuQuiz series and characters; the hub every kind. */
export const CREDIT_KINDS: Readonly<Record<SiteId, readonly string[] | null>> = {
  kpop: ['idol', 'group'],
  anime: ['series', 'character'],
  hub: null,
};

/** True for the answer of a view or a column that is not there yet (022 not applied): PostgREST's schema cache or Postgres itself says so. */
function isMissing(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error) && (['42P01', '42703', 'PGRST205', 'PGRST204'].includes(error?.code ?? '') || /does not exist|could not find/i.test(error?.message ?? ''));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
type Db = any;

/** Is there a row of the view with needs_credit true (for the kinds, when given)? Throws on a real error so the cache never keeps it. */
async function anyCreditRow(db: Db, view: string, column: string, kinds: readonly string[] | null, extra?: (q: Db) => Db): Promise<boolean> {
  let q = db.from(view).select(column).eq('needs_credit', true);
  if (kinds) q = q.in('kind', kinds as string[]);
  if (extra) q = extra(q);
  const { data, error } = await q.limit(1);
  if (error) {
    if (isMissing(error)) return false;
    throw new Error(`site credits: ${view} could not be read`);
  }
  return Array.isArray(data) && data.length > 0;
}

async function animeHasCredits(): Promise<boolean> {
  const [{ getEntityImageRows }, { requiresCredit }, { SERIES_IMAGE_CREDITS }] = await Promise.all([
    import('@/lib/anime/entity-images-read'), import('@/lib/anime/entity-images-rules'), import('@/lib/anime/series-images.generated'),
  ]);
  const rows = await getEntityImageRows();
  if (rows.some((r) => requiresCredit(r.license))) return true;
  // A bundled photo that the owner replaced is no longer shown, so it needs no credit.
  const replaced = new Set(rows.filter((r) => r.kind === 'series').map((r) => r.slug));
  return Object.entries(SERIES_IMAGE_CREDITS).some(([slug, c]) => c.attributionRequired && !replaced.has(slug));
}

async function readHasCredits(site: SiteId): Promise<boolean> {
  const db = createPublicReadClient();
  if (await anyCreditRow(db, 'entity_images_public', 'kind', CREDIT_KINDS[site] ?? null)) return true;
  if (site !== 'hub') return false;
  return anyCreditRow(db, 'site_assets_public', 'key', null, (q) => q.in('type', ['banner', 'card_image']));
}

const cached = unstable_cache(
  async (site: SiteId): Promise<boolean> => readHasCredits(site),
  ['db:site-credits:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['site-credits'] },
);

/** Does the site of this build have at least one image in use that needs a credit? False on any failure. */
export async function siteHasCredits(site: SiteId = SITE_ID): Promise<boolean> {
  try {
    // OtakuQuiz already reads its rows through a cache of its own (an hour); the hub and kpopquiz.org read the views through the cache above.
    return site === 'anime' ? await animeHasCredits() : await cached(site);
  } catch {
    return false;
  }
}
