// Daily games step 2: the writes of the Photos tab of the admin, through the SERVICE ROLE client (entity_images, site_assets and agencies
// have no write policy for the browser roles, 022). Server only; the caller (an admin route) has already checked the admin and the origin.
// The files were made in the admin's browser (resize.ts); here they are checked from their bytes (WebP, size, exact pixel sizes) and
// stored in the bucket entity-images of 018, under a name that carries their hash (a replaced picture is a new address).
import { createHash } from 'node:crypto';

import { BUCKET, MAX_OUTPUT_BYTES } from '@/lib/entity-images/constants';
import { ImageError } from '@/lib/entity-images/errors';
import { assertEntity as assertAnimeEntity } from '@/lib/entity-images/store';

import { ASSET_WIDTHS, KIND_SITE, PHOTO_BOX, SMALL_ASSET_LICENSES, SMALL_ASSET_WIDTHS, THUMB_BOX, photoFolder } from './slots';
import { webpInfo } from './webp';

import type { ImageMeta } from '@/lib/entity-images/types';
import type { AssetType, Focal, PhotoKind } from './slots';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
export type Db = any;

const DB_FAILED = (): ImageError => new ImageError('db_failed', 500, 'La base n\'a pas pu être lue ou écrite. Réessaie.');

/** One file the browser made: its bytes and what its header says. */
interface Checked { readonly bytes: Uint8Array; readonly width: number; readonly height: number }

function checkWebp(bytes: Uint8Array | null | undefined, label: string): Checked {
  if (!bytes || bytes.length === 0) throw new ImageError('bad_request', 400, `Le fichier ${label} manque.`);
  if (bytes.length > MAX_OUTPUT_BYTES) throw new ImageError('too_large', 413, `Le fichier ${label} dépasse 4 Mo.`);
  const info = webpInfo(bytes);
  if (!info) throw new ImageError('unsupported_type', 415, `Le fichier ${label} n'est pas une image WebP.`);
  if (info.animated) throw new ImageError('invalid_image', 422, `Le fichier ${label} est animé : une image fixe seulement.`);
  return { bytes, width: info.width, height: info.height };
}

const hashOf = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex').slice(0, 16);

async function upload(db: Db, path: string, bytes: Uint8Array): Promise<void> {
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
  if (error) throw new ImageError('storage_failed', 502, 'L\'image n\'a pas pu être enregistrée dans le stockage.');
}

async function removeFiles(db: Db, paths: readonly (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => typeof p === 'string' && p !== '');
  if (list.length === 0) return;
  try {
    await db.storage.from(BUCKET).remove(list);
  } catch {
    // A file left behind is harmless (its name carries a hash and no row points at it); the row is what counts.
  }
}

// ---- pictures of entities ---------------------------------------------------------------------------------------------------------

export interface PhotoFiles { readonly x1: Uint8Array; readonly x2: Uint8Array; readonly thumb: Uint8Array }

/** The three files of a picture must have the exact sizes of its kind: the 1x box, twice that, and the 96 px square. */
export function checkPhotoFiles(kind: PhotoKind, files: PhotoFiles): { x1: Checked; x2: Checked; thumb: Checked } {
  const box = PHOTO_BOX[kind];
  const x1 = checkWebp(files.x1, '1x');
  const x2 = checkWebp(files.x2, '2x');
  const thumb = checkWebp(files.thumb, '96 px');
  if (x1.width !== box.w || x1.height !== box.h) throw new ImageError('invalid_image', 422, `Le fichier 1x doit faire ${box.w} par ${box.h}.`);
  if (x2.width !== box.w * 2 || x2.height !== box.h * 2) throw new ImageError('invalid_image', 422, `Le fichier 2x doit faire ${box.w * 2} par ${box.h * 2}.`);
  if (thumb.width !== THUMB_BOX.w || thumb.height !== THUMB_BOX.h) throw new ImageError('invalid_image', 422, 'La vignette doit faire 96 par 96.');
  return { x1, x2, thumb };
}

/** Throws unknown_entity (404) unless the idol, group, agency, series or character exists. */
export async function assertPhotoEntity(db: Db, kind: PhotoKind, slug: string): Promise<void> {
  if (kind === 'series' || kind === 'character') return assertAnimeEntity(db, kind, slug);
  const id = Number(slug);
  const q = kind === 'idol' ? db.from('idols').select('id').eq('id', id)
    : kind === 'group' ? db.from('groups').select('id').eq('id', id).eq('site_id', 'kpop')
    : db.from('agencies').select('id').eq('id', id);
  const { data, error } = await q.maybeSingle();
  if (error) throw DB_FAILED();
  if (!data) throw new ImageError('unknown_entity', 404, 'Cette fiche n\'existe pas.');
}

interface PhotoRow { path: string; thumb_path: string | null }

export interface SavePhotoInput {
  readonly kind: PhotoKind;
  readonly slug: string;
  /** null: keep the stored files, change the credit, the box or the focal point only. */
  readonly files: PhotoFiles | null;
  readonly meta: ImageMeta;
  readonly verified: boolean;
  readonly focal: Focal;
  readonly userId: string;
}

export interface SavedPhoto { readonly kind: PhotoKind; readonly slug: string; readonly path: string; readonly thumbPath: string | null; readonly verified: boolean }

/**
 * Stores a picture of an entity. With files: the three files first, then the row (insert or update), then the old files go. Without:
 * the row must exist; its credit, its box and its focal point change. A verified row always has its 96 px file (022's check), so a row
 * made by the 018 route (no 96 px file) is verified only once a file is sent again.
 */
export async function savePhoto(db: Db, a: SavePhotoInput): Promise<SavedPhoto> {
  const site = KIND_SITE[a.kind];
  const { data: old, error: readError } = await db.from('entity_images').select('path, thumb_path')
    .eq('site_id', site).eq('kind', a.kind).eq('slug', a.slug).maybeSingle();
  if (readError) throw DB_FAILED();
  const current = (old as PhotoRow | null) ?? null;
  const fields: Record<string, unknown> = {
    source_url: a.meta.source_url, author: a.meta.author, license: a.meta.license, license_note: a.meta.license_note ?? null,
    focal_x: a.focal.x, focal_y: a.focal.y, license_verified: a.verified,
  };
  if (!a.files) {
    if (!current) throw new ImageError('no_image', 404, 'Choisis une image d\'abord.');
    if (a.verified && !current.thumb_path) throw new ImageError('no_image', 422, 'Cette image n\'a pas encore sa vignette de 96 px : renvoie le fichier pour la vérifier.');
    const { data, error } = await db.from('entity_images').update(fields).eq('site_id', site).eq('kind', a.kind).eq('slug', a.slug)
      .select('path, thumb_path, license_verified').single();
    if (error || !data) throw DB_FAILED();
    return { kind: a.kind, slug: a.slug, path: data.path, thumbPath: data.thumb_path, verified: data.license_verified };
  }
  const { x1, x2, thumb } = checkPhotoFiles(a.kind, a.files);
  const base = `${photoFolder(a.kind, a.slug)}/${hashOf(x1.bytes)}`;
  const path = `${base}.webp`;
  const path2 = `${base}-2x.webp`;
  const thumbPath = `${base}-96.webp`;
  await upload(db, path, x1.bytes);
  try {
    await upload(db, path2, x2.bytes);
    await upload(db, thumbPath, thumb.bytes);
    Object.assign(fields, { path, width: x1.width, height: x1.height, thumb_path: thumbPath });
    const res = current
      ? await db.from('entity_images').update(fields).eq('site_id', site).eq('kind', a.kind).eq('slug', a.slug).select('path, thumb_path, license_verified').single()
      : await db.from('entity_images').insert({ site_id: site, kind: a.kind, slug: a.slug, created_by: a.userId, ...fields }).select('path, thumb_path, license_verified').single();
    if (res.error || !res.data) throw new ImageError('db_failed', 500, 'L\'image est stockée mais la base l\'a refusée.');
    if (current && current.path !== path) await removeFiles(db, [current.path, current.path.replace(/\.webp$/, '-2x.webp'), current.thumb_path]);
    return { kind: a.kind, slug: a.slug, path: res.data.path, thumbPath: res.data.thumb_path, verified: res.data.license_verified };
  } catch (e) {
    if (!current || current.path !== path) await removeFiles(db, [path, path2, thumbPath]);
    throw e;
  }
}

/**
 * Removes the picture of an entity (the Photos tab's "Retirer la photo"): its row, then its three files (1x, 2x, 96 px), so no address of it
 * stays public in the bucket. A series or a character goes back to its bundled photo or the placeholder on OtakuQuiz.
 */
export async function removePhoto(db: Db, kind: PhotoKind, slug: string): Promise<{ readonly kind: PhotoKind; readonly slug: string; readonly files: number }> {
  const site = KIND_SITE[kind];
  const { data, error } = await db.from('entity_images').select('path, thumb_path').eq('site_id', site).eq('kind', kind).eq('slug', slug).maybeSingle();
  if (error) throw DB_FAILED();
  const row = (data as PhotoRow | null) ?? null;
  if (!row) throw new ImageError('no_image', 404, 'Cette fiche n\'a pas de photo à retirer.');
  const { error: deleteError } = await db.from('entity_images').delete().eq('site_id', site).eq('kind', kind).eq('slug', slug);
  if (deleteError) throw DB_FAILED();
  const files = [row.path, row.path.replace(/\.webp$/, '-2x.webp'), row.thumb_path];
  await removeFiles(db, files);
  return { kind, slug, files: files.filter(Boolean).length };
}

// ---- site assets (banners, card images, icons, stickers) ---------------------------------------------------------------------------

export interface AssetFiles { readonly large: Uint8Array; readonly mid: Uint8Array | null; readonly thumb: Uint8Array }

/** The files of a banner or card image (large up to 1920, 400, 96) or of an icon or sticker (up to 400, 96), each the large one scaled. */
export function checkAssetFiles(type: AssetType, files: AssetFiles): { large: Checked; mid: Checked | null; thumb: Checked } {
  const big = type === 'banner' || type === 'card_image';
  const maxW = big ? ASSET_WIDTHS.large : SMALL_ASSET_WIDTHS.large;
  const large = checkWebp(files.large, 'grand');
  if (large.width > maxW) throw new ImageError('invalid_image', 422, `Le grand fichier dépasse ${maxW} px de large.`);
  const scaled = (f: Checked, w: number, label: string): void => {
    const wantW = Math.min(w, large.width);
    const wantH = Math.max(1, Math.round((large.height * wantW) / large.width));
    if (f.width !== wantW || Math.abs(f.height - wantH) > 1) throw new ImageError('invalid_image', 422, `Le fichier ${label} doit faire ${wantW} par ${wantH}.`);
  };
  let mid: Checked | null = null;
  if (big) {
    mid = checkWebp(files.mid, '400 px');
    scaled(mid, ASSET_WIDTHS.mid, '400 px');
  }
  const thumb = checkWebp(files.thumb, '96 px');
  scaled(thumb, ASSET_WIDTHS.thumb, '96 px');
  return { large, mid, thumb };
}

export interface AssetSlotRef { readonly key: string; readonly type: AssetType; readonly page: string }

export interface SaveAssetInput {
  readonly slot: AssetSlotRef;
  /** null: keep the files of the latest version of the key (a new credit, focal point or setting); none for a library icon. */
  readonly files: AssetFiles | null;
  /** The icon of the library has no file: when true, the version carries none even if an older one did. */
  readonly noFile: boolean;
  readonly settings: Record<string, unknown>;
  readonly meta: ImageMeta | null;
  readonly verified: boolean;
  /** 'now', a date, or null for a draft. */
  readonly publishAt: 'now' | Date | null;
  readonly userId: string;
}

interface AssetFileRow { path: string | null; mid_path: string | null; thumb_path: string | null; width: number | null; height: number | null; source_url: string | null; author: string | null; license: string | null; license_note: string | null; license_verified: boolean }

/** The folder of a key in the bucket: hub/<key with ':' as '/'> ('banner:kpopdle' is hub/banner/kpopdle). */
export const assetFolder = (key: string): string => `hub/${key.replace(/:/g, '/')}`;

/**
 * Adds a version of a slot. The live version of a key is the latest one published at or before now (site_assets_public), so publishing
 * now or at a date is the published_at of the new row, and the older rows stay as the history. A version with a picture is published
 * only with its licence verified (022's check, said here first in plain words).
 */
export async function saveAsset(db: Db, a: SaveAssetInput): Promise<{ id: number }> {
  const checked = a.files && !a.noFile ? checkAssetFiles(a.slot.type, a.files) : null;
  let previous: AssetFileRow | null = null;
  if (!checked && !a.noFile) {
    const { data, error } = await db.from('site_assets').select('path, mid_path, thumb_path, width, height, source_url, author, license, license_note, license_verified')
      .eq('key', a.slot.key).is('retired_at', null).not('path', 'is', null).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
    if (error) throw DB_FAILED();
    previous = (data as AssetFileRow | null) ?? null;
    if (!previous && a.slot.type !== 'icon') throw new ImageError('no_image', 422, 'Choisis une image d\'abord.');
  }
  // Every refusal comes before a file is stored, so a refused version leaves nothing in the bucket.
  const hasFile = Boolean(checked ?? previous?.path);
  if (hasFile && !a.meta) throw new ImageError('bad_meta', 400, 'Le crédit et la licence sont obligatoires pour une image.');
  if (hasFile && (a.slot.type === 'icon' || a.slot.type === 'sticker') && !SMALL_ASSET_LICENSES.includes(a.meta!.license)) {
    throw new ImageError('bad_meta', 422, 'Une icône ou un sticker est une illustration à nous ou sous accord écrit : pas de licence Creative Commons (la page Crédits ne les liste pas).');
  }
  if (hasFile && a.publishAt !== null && !a.verified) {
    throw new ImageError('bad_meta', 422, 'Coche « licence vérifiée » avant de publier : une image sans licence vérifiée ne s\'affiche jamais.');
  }
  let files: { path: string; mid_path: string | null; thumb_path: string; width: number; height: number } | null = null;
  const uploaded: string[] = [];
  if (checked) {
    const base = `${assetFolder(a.slot.key)}/${hashOf(checked.large.bytes)}`;
    const path = `${base}-${checked.large.width}.webp`;
    const mid = checked.mid ? `${base}-${checked.mid.width}m.webp` : null;
    const thumbPath = `${base}-${checked.thumb.width}t.webp`;
    try {
      await upload(db, path, checked.large.bytes); uploaded.push(path);
      if (checked.mid && mid) { await upload(db, mid, checked.mid.bytes); uploaded.push(mid); }
      await upload(db, thumbPath, checked.thumb.bytes); uploaded.push(thumbPath);
    } catch (e) {
      await removeFiles(db, uploaded);
      throw e;
    }
    files = { path, mid_path: mid, thumb_path: thumbPath, width: checked.large.width, height: checked.large.height };
  }
  const publishedAt = a.publishAt === null ? null : a.publishAt === 'now' ? new Date().toISOString() : a.publishAt.toISOString();
  const row = {
    key: a.slot.key, type: a.slot.type, page: a.slot.page, settings: a.settings,
    path: files?.path ?? previous?.path ?? null,
    mid_path: files ? files.mid_path : previous?.mid_path ?? null,
    thumb_path: files?.thumb_path ?? previous?.thumb_path ?? null,
    width: files?.width ?? previous?.width ?? null,
    height: files?.height ?? previous?.height ?? null,
    source_url: hasFile ? a.meta?.source_url || null : null,
    author: hasFile ? a.meta?.author ?? null : null,
    license: hasFile ? a.meta?.license ?? null : null,
    license_note: hasFile ? a.meta?.license_note ?? null : null,
    license_verified: hasFile ? a.verified : false,
    published_at: publishedAt,
    created_by: a.userId,
  };
  const { data, error } = await db.from('site_assets').insert(row).select('id').single();
  if (error || !data) {
    await removeFiles(db, uploaded);
    throw new ImageError('db_failed', 500, 'La version n\'a pas pu être enregistrée.');
  }
  return { id: Number(data.id) };
}

type AssetFilesRow = Pick<AssetFileRow, 'path' | 'mid_path' | 'thumb_path'>;
const filesOfRows = (rows: readonly AssetFilesRow[]): string[] => rows.flatMap((r) => [r.path, r.mid_path, r.thumb_path]).filter((p): p is string => typeof p === 'string' && p !== '');

/**
 * Takes every version of a key off the site (a sticker removed). The rows stay, retired, as the history; the files of the versions retired
 * now leave the bucket, so a removed picture has no public address left. Never a file a version still on the site names: a version saved
 * without new files reuses the files of the one before, so the files of the key's rows that are not retired (one saved meanwhile) stay,
 * and only files under the key's own folder are ever removed.
 */
export async function retireAsset(db: Db, key: string): Promise<{ readonly retired: number; readonly files: number }> {
  const { data, error } = await db.from('site_assets').update({ retired_at: new Date().toISOString() }).eq('key', key).is('retired_at', null)
    .select('path, mid_path, thumb_path');
  if (error) throw DB_FAILED();
  const retired = (data ?? []) as AssetFilesRow[];
  const folder = `${assetFolder(key)}/`;
  const candidates = new Set(filesOfRows(retired).filter((p) => p.startsWith(folder)));
  if (candidates.size === 0) return { retired: retired.length, files: 0 };
  const { data: live, error: liveError } = await db.from('site_assets').select('path, mid_path, thumb_path').eq('key', key).is('retired_at', null);
  // When the rows still on the site cannot be read, nothing is removed: a file left behind is harmless, a live file removed is not.
  if (liveError) return { retired: retired.length, files: 0 };
  for (const p of filesOfRows((live ?? []) as AssetFilesRow[])) candidates.delete(p);
  await removeFiles(db, [...candidates]);
  return { retired: retired.length, files: candidates.size };
}

/** Puts an older version back on the site: its published_at becomes now, so it is the latest one again (the history's "remettre"). */
export async function restoreAsset(db: Db, id: number): Promise<void> {
  const { data: row, error: readError } = await db.from('site_assets').select('id, path, license_verified, retired_at').eq('id', id).maybeSingle();
  if (readError) throw DB_FAILED();
  if (!row) throw new ImageError('no_image', 404, 'Cette version n\'existe plus.');
  if (row.retired_at) throw new ImageError('no_image', 422, 'Cette version a été retirée.');
  if (row.path && !row.license_verified) throw new ImageError('bad_meta', 422, 'Cette version n\'a pas de licence vérifiée : elle ne peut pas être remise.');
  const { error } = await db.from('site_assets').update({ published_at: new Date().toISOString() }).eq('id', id);
  if (error) throw DB_FAILED();
}
