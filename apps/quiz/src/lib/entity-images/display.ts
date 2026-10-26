// Run O1 (ADM back): what a page shows for a series or a character on the anime build. One server function per kind, in this order:
// the owner's image (public.entity_images), else the bundled series photo (series only), else null (the neutral placeholder).
// The row read is cached with one tag per image (imageTag); every admin write of that image revalidates the tag (cache.ts).
// The read uses the cookie-free anon client: the browser roles can select the display columns only (018), so this also proves the grants.
import { unstable_cache } from 'next/cache';

import { seriesImageOf } from '@/lib/anime/series-images';
import { createPublicReadClient } from '@/lib/supabase/server';

import { DISPLAY_COLUMNS, IMAGE_SITE, LICENSE_LABEL, ATTRIBUTION_LICENSES, SIZES, imageTag, path2x } from './constants';
import { publicUrl } from './store';

import type { ImageKind } from './constants';
import type { DisplayImage, EntityImageRow } from './types';

/** The focal point of the bundled photos: horizontally centred, 35 percent down (the object-position of the photo box today). */
const BUNDLED_FOCAL = { x: 50, y: 35 } as const;

/** The image of an uploaded row, ready to show. */
export function displayFromRow(row: EntityImageRow): DisplayImage {
  const asks = (ATTRIBUTION_LICENSES as readonly string[]).includes(row.license);
  return {
    source: 'upload',
    url: publicUrl(row.path),
    url2x: publicUrl(path2x(row.path)),
    width: row.width,
    height: row.height,
    focalX: Number(row.focal_x),
    focalY: Number(row.focal_y),
    alt: null,
    attribution: asks ? { author: row.author, license: LICENSE_LABEL[row.license], sourceUrl: row.source_url } : null,
    license: row.license,
    author: row.author,
    sourceUrl: row.source_url,
  };
}

/** The bundled photo of a series (public/series, the free photos of run O1 IMG), or null. */
export function bundledSeriesImage(slug: string): DisplayImage | null {
  const p = seriesImageOf(slug);
  if (!p) return null;
  return {
    source: 'bundled',
    url: p.file,
    url2x: null,
    width: SIZES.series.x1.w,
    height: SIZES.series.x1.h,
    focalX: BUNDLED_FOCAL.x,
    focalY: BUNDLED_FOCAL.y,
    alt: p.alt,
    attribution: p.attribution ? { author: p.attribution.author, license: p.attribution.license, sourceUrl: p.attribution.sourceUrl } : null,
    license: null,
    author: p.attribution?.author ?? null,
    sourceUrl: p.attribution?.sourceUrl ?? null,
  };
}

async function readRow(kind: ImageKind, slug: string): Promise<EntityImageRow | null> {
  const { data, error } = await createPublicReadClient().from('entity_images').select(DISPLAY_COLUMNS)
    .eq('site_id', IMAGE_SITE).eq('kind', kind).eq('slug', slug).maybeSingle();
  if (error) throw new Error(`entity_images read: ${error.message}`);
  return (data as EntityImageRow | null) ?? null;
}

/**
 * The row of one image, cached under its tag. A failed read throws inside the cache (so it is not cached) and is turned into
 * "no row" here: a database blip never fails a page (verse law 6), the page shows the bundled photo or the placeholder.
 */
export async function cachedRow(kind: ImageKind, slug: string): Promise<EntityImageRow | null> {
  try {
    const read = unstable_cache(() => readRow(kind, slug), ['entity-image', IMAGE_SITE, kind, slug], { tags: [imageTag(kind, slug)], revalidate: 3600 });
    return await read();
  } catch {
    return null;
  }
}

/** The image of a series: the owner's, else the bundled photo, else null. */
export async function getSeriesImage(slug: string): Promise<DisplayImage | null> {
  const row = await cachedRow('series', slug);
  return row ? displayFromRow(row) : bundledSeriesImage(slug);
}

/** The portrait of a character ('<series slug>/<character slug>'): the owner's, else null (no bundled portrait exists). */
export async function getCharacterImage(slug: string): Promise<DisplayImage | null> {
  const row = await cachedRow('character', slug);
  return row ? displayFromRow(row) : null;
}
