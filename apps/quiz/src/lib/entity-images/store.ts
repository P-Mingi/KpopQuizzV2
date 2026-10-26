// Run O1 (ADM back): reads and writes of public.entity_images and of the bucket 'entity-images', through the SERVICE ROLE client
// (the table has no write policy). Server only. The caller has already checked that the user is an admin.
import { BUCKET, DEFAULT_FOCAL, DISPLAY_COLUMNS, IMAGE_SITE, folderOf, path2x } from './constants';
import { ImageError } from './errors';

import type { ImageKind } from './constants';
import type { ProcessedImage } from './process';
import type { EntityImageDto, EntityImageRow, ImageMeta } from './types';

/** The part of the supabase-js client used here; an untyped client, as the other admin routes use. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
export type Db = any;

export type Revalidate = (kind: ImageKind, slug: string) => void;

/** The public URL of a file of the bucket. */
export function publicUrl(path: string, base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  return `${(base ?? '').replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function toDto(row: EntityImageRow): EntityImageDto {
  return {
    kind: row.kind,
    slug: row.slug,
    url: publicUrl(row.path),
    url2x: publicUrl(path2x(row.path)),
    width: row.width,
    height: row.height,
    focalX: Number(row.focal_x),
    focalY: Number(row.focal_y),
    license: row.license,
    author: row.author,
    sourceUrl: row.source_url,
    licenseNote: row.license_note,
    updatedAt: row.updated_at,
  };
}

/** Throws unknown_entity (404) unless the series, or the character of that series, exists on the anime site. */
export async function assertEntity(db: Db, kind: ImageKind, slug: string): Promise<void> {
  const [seriesSlug, characterSlug] = slug.split('/') as [string, string | undefined];
  const { data: g, error } = await db.from('groups').select('id').eq('site_id', IMAGE_SITE).eq('slug', seriesSlug).maybeSingle();
  if (error) throw new ImageError('db_failed', 500, 'The database could not be read.');
  if (!g) throw new ImageError('unknown_entity', 404, kind === 'series' ? 'That series does not exist.' : 'That character does not exist.');
  const { data: s, error: se } = await db.from('series').select('group_id').eq('group_id', g.id).maybeSingle();
  if (se) throw new ImageError('db_failed', 500, 'The database could not be read.');
  if (!s) throw new ImageError('unknown_entity', 404, 'That series does not exist.');
  if (kind === 'character') {
    const { data: c, error: ce } = await db.from('characters').select('id').eq('group_id', g.id).eq('slug', characterSlug ?? '').maybeSingle();
    if (ce) throw new ImageError('db_failed', 500, 'The database could not be read.');
    if (!c) throw new ImageError('unknown_entity', 404, 'That character does not exist.');
  }
}

async function removeFiles(db: Db, paths: string[]): Promise<void> {
  try {
    await db.storage.from(BUCKET).remove(paths);
  } catch {
    // A file left behind is harmless (the bucket is public and the name carries a hash); the row is what counts.
  }
}

async function rowOf(db: Db, kind: ImageKind, slug: string): Promise<EntityImageRow | null> {
  const { data, error } = await db.from('entity_images').select(DISPLAY_COLUMNS).eq('site_id', IMAGE_SITE).eq('kind', kind).eq('slug', slug).maybeSingle();
  if (error) throw new ImageError('db_failed', 500, 'The database could not be read.');
  return (data as EntityImageRow | null) ?? null;
}

/** Stores both files, then upserts the row (a replaced image goes back to the middle focal point), then drops the old files. */
export async function saveImage(
  db: Db,
  a: { kind: ImageKind; slug: string; image: ProcessedImage; meta: ImageMeta; userId: string },
  revalidate: Revalidate,
): Promise<EntityImageDto> {
  const { kind, slug, image, meta } = a;
  const path = `${folderOf(kind, slug)}/${image.hash}.webp`;
  const bucket = db.storage.from(BUCKET);
  const opts = { contentType: 'image/webp', cacheControl: '31536000', upsert: true };
  const up1 = await bucket.upload(path, image.x1, opts);
  if (up1.error) throw new ImageError('storage_failed', 502, 'The picture could not be stored.');
  const up2 = await bucket.upload(path2x(path), image.x2, opts);
  if (up2.error) {
    await removeFiles(db, [path]);
    throw new ImageError('storage_failed', 502, 'The picture could not be stored.');
  }
  let oldPath: string | null = null;
  try {
    oldPath = (await rowOf(db, kind, slug))?.path ?? null;
    const fields = {
      path, width: image.width, height: image.height, focal_x: DEFAULT_FOCAL, focal_y: DEFAULT_FOCAL,
      source_url: meta.source_url, author: meta.author, license: meta.license, license_note: meta.license_note ?? null,
    };
    const res = oldPath !== null
      ? await db.from('entity_images').update(fields).eq('site_id', IMAGE_SITE).eq('kind', kind).eq('slug', slug).select(DISPLAY_COLUMNS).single()
      : await db.from('entity_images').insert({ site_id: IMAGE_SITE, kind, slug, created_by: a.userId, ...fields }).select(DISPLAY_COLUMNS).single();
    if (res.error || !res.data) throw new ImageError('db_failed', 500, 'The picture was stored but the database refused it.');
    if (oldPath !== null && oldPath !== path) await removeFiles(db, [oldPath, path2x(oldPath)]);
    revalidate(kind, slug);
    return toDto(res.data as EntityImageRow);
  } catch (e) {
    if (oldPath !== path) await removeFiles(db, [path, path2x(path)]);
    throw e;
  }
}

export async function setFocal(db: Db, kind: ImageKind, slug: string, x: number, y: number, revalidate: Revalidate): Promise<EntityImageDto> {
  const { data, error } = await db.from('entity_images').update({ focal_x: x, focal_y: y })
    .eq('site_id', IMAGE_SITE).eq('kind', kind).eq('slug', slug).select(DISPLAY_COLUMNS).maybeSingle();
  if (error) throw new ImageError('db_failed', 500, 'The focal point could not be saved.');
  if (!data) throw new ImageError('no_image', 404, 'Upload or import a picture first: the bundled photo has no focal point to set.');
  revalidate(kind, slug);
  return toDto(data as EntityImageRow);
}

/** Removes the row and its files: the page goes back to the bundled photo or the placeholder. */
export async function deleteImage(db: Db, kind: ImageKind, slug: string, revalidate: Revalidate): Promise<EntityImageDto> {
  const row = await rowOf(db, kind, slug);
  if (!row) throw new ImageError('no_image', 404, 'There is no uploaded picture to remove.');
  const { error } = await db.from('entity_images').delete().eq('site_id', IMAGE_SITE).eq('kind', kind).eq('slug', slug);
  if (error) throw new ImageError('db_failed', 500, 'The picture could not be removed.');
  await removeFiles(db, [row.path, path2x(row.path)]);
  revalidate(kind, slug);
  return toDto(row);
}

/** Every image row of the anime site, paged past the 1000-row cap. */
export async function allRows(db: Db): Promise<EntityImageRow[]> {
  const out: EntityImageRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('entity_images').select(DISPLAY_COLUMNS).eq('site_id', IMAGE_SITE).order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new ImageError('db_failed', 500, 'The pictures could not be listed.');
    const rows = (data ?? []) as EntityImageRow[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}
