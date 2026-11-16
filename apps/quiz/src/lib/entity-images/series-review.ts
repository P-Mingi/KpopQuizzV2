// Bunnyverse Cards lot 3 (DLE, owner request of 2026-11-14): the series pictures that REMAIN after the non-free deletion, for the owner to check in
// the same private preview as the non-free selection (lib/dle/preview.ts). Read only: nothing here writes, updates or deletes a row or a file, and
// the owner's button (non-free.ts) never touches a series (its selection is kind = 'character'). Server only (service role client).
//
// The bucket is public and the policy entity_images_select_display lets anon read every series and character row, so these pictures are reachable
// by address today; this list lets the owner look at each one (picture, slug, licence, verified or not, source host) and decide, by hand, later.
import { IMAGE_SITE } from './constants';
import { ImageError } from './errors';
import { hostOf } from './non-free';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
type Db = any;

/** The columns this list reads (no created_at, no note: only what the owner checks). */
export const SERIES_COLUMNS = 'id, slug, path, license, license_verified, source_url';

export interface SeriesRow {
  readonly id: number;
  readonly slug: string;
  readonly path: string;
  readonly license: string;
  readonly license_verified: boolean;
  readonly source_url: string | null;
}

/** 'host': the source address was read and its host is given; 'unreadable': an address the host parser refuses; 'none': no address stored. */
export type SeriesSource = 'host' | 'unreadable' | 'none';

/** What the browser of the owner gets for one series: never a path and never an address, only the host. */
export interface SeriesReviewItem {
  readonly slug: string;
  readonly license: string;
  readonly verified: boolean;
  readonly source: SeriesSource;
  readonly host: string | null;
}

export function reviewItemOf(r: SeriesRow): SeriesReviewItem {
  const hasUrl = typeof r.source_url === 'string' && r.source_url.trim() !== '';
  const host = hasUrl ? hostOf(r.source_url) : null;
  return { slug: r.slug, license: r.license, verified: r.license_verified === true, source: host ? 'host' : hasUrl ? 'unreadable' : 'none', host };
}

const failedRead = (): ImageError => new ImageError('db_failed', 500, 'La base n\'a pas pu être lue. Réessaie.');

/** Every series row of the anime site, paged past the 1000-row cap, in slug order. */
export async function selectSeriesRows(db: Db): Promise<SeriesRow[]> {
  const out: SeriesRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('entity_images').select(SERIES_COLUMNS)
      .eq('site_id', IMAGE_SITE).eq('kind', 'series').order('id', { ascending: true }).range(from, from + 999);
    if (error) throw failedRead();
    const page = (data ?? []) as SeriesRow[];
    out.push(...page);
    if (page.length < 1000) return out.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  }
}

/** The row of one series, or null. */
export async function selectSeriesRow(db: Db, slug: string): Promise<SeriesRow | null> {
  const { data, error } = await db.from('entity_images').select(SERIES_COLUMNS)
    .eq('site_id', IMAGE_SITE).eq('kind', 'series').eq('slug', slug).maybeSingle();
  if (error) throw failedRead();
  return (data as SeriesRow | null) ?? null;
}
