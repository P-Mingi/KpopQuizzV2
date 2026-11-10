// Owner, 2026-11-10 (lane charrefs, L32): the server side of the admin screen of the character references, through the SERVICE ROLE client
// (the table character_reference_images and the bucket character-refs have no policy: only the service role reads or writes them). Server
// only; the caller (app/api/admin/photos/refs/route.ts, or the page of the admin) has already passed requireAdmin.
//
// Hash rule. The candidate's ORIGINAL file is hashed here, from the bytes the browser sent (sha256; the first 12 hex ride in the candidate
// file names). At publication that hash is compared with the reference's, two ways: the 12 hex fetch-refs.mjs put in the reference file name,
// AND the sha256 recomputed now from the bytes in the private bucket (the name could be renamed or the file replaced by hand). A match by
// either way refuses the publication. A re-encoded copy of the same picture has another hash: the screen tells the owner so.
import { createHash } from 'node:crypto';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { MAX_SOURCE_BYTES } from '@/lib/entity-images/constants';
import { ImageError } from '@/lib/entity-images/errors';
import { sniffImage } from '@/lib/entity-images/sniff';
import { publicUrl } from '@/lib/entity-images/store';

import {
  CANDIDATE_ORIGINAL_MAX, HASH_LEN, REFS_BUCKET, REFS_SITE, REFS_TABLE, SIGNED_URL_SECONDS, baseOfCandidatePath, candidateBase, candidatePaths,
  checkDraftCredit, hashOfCandidatePath, hashOfReferencePath, parseRefCredit, slugOf,
} from './character-refs';
import { assertPhotoEntity, checkPhotoFiles, savePhoto } from './store';

import type { CharacterRefsData, RefCreditFields, RefListRow, RefStatus } from './character-refs';
import type { Db, PhotoFiles } from './store';

const DB_FAILED = (): ImageError => new ImageError('db_failed', 500, 'La base n\'a pas pu être lue ou écrite. Réessaie.');

export const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** The columns of the table the screen reads. */
const REF_COLUMNS = 'series_slug, character_slug, status, reference_path, reference_page_url, reference_file_page_url, reference_author, reference_license, '
  + 'candidate_path, candidate_source_url, candidate_author, candidate_license, candidate_license_url, published_at';

interface RefDbRow {
  series_slug: string; character_slug: string; status: RefStatus; reference_path: string | null; reference_page_url: string | null;
  reference_file_page_url: string | null; reference_author: string | null; reference_license: string | null; candidate_path: string | null;
  candidate_source_url: string | null; candidate_author: string | null; candidate_license: string | null; candidate_license_url: string | null;
  published_at: string | null;
}

const isMissing = (e: { code?: string; message?: string } | null | undefined): boolean =>
  Boolean(e) && (['42P01', '42703', 'PGRST200', 'PGRST204', 'PGRST205'].includes(e!.code ?? '') || /does not exist|could not find/i.test(e!.message ?? ''));

const keyOf = (series: string, character: string): string => `${series}/${character}`;

// ---- the screen's data --------------------------------------------------------------------------------------------------------------

interface GroupRow { id: number; name: string; slug: string }
interface CharRow { group_id: number; slug: string; name: string }
interface ImageRow { slug: string; path: string; license: string; author: string | null; source_url: string | null; license_verified?: boolean }

/**
 * Every anime character of the database (the list and the total come from the characters table, never typed), each with its reference row
 * when there is one, the picture published today and its credits. No reference row at all is a normal state (the reference fetch is on hold):
 * the character is listed with an empty reference box. A missing table (L32 not applied) reads as schema 'missing', not as an error.
 * Previews are NOT signed here: the screen asks for them for the rows it shows (signPreviews).
 */
export async function loadCharacterRefs(db: Db): Promise<CharacterRefsData> {
  const [groups, chars] = await Promise.all([
    fetchAllRows<GroupRow>(() => db.from('groups').select('id, name, slug').eq('site_id', REFS_SITE).order('id', { ascending: true })),
    fetchAllRows<CharRow>(() => db.from('characters').select('group_id, slug, name, id').order('group_id', { ascending: true }).order('id', { ascending: true })),
  ]);
  let refRows: RefDbRow[] = [];
  let schema: CharacterRefsData['schema'] = 'ok';
  try {
    refRows = await fetchAllRows<RefDbRow>(() => db.from(REFS_TABLE).select(REF_COLUMNS).eq('site_id', REFS_SITE).order('series_slug', { ascending: true }).order('character_slug', { ascending: true }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (isMissing({ message: msg })) schema = 'missing'; else throw e;
  }
  let images: ImageRow[] = [];
  try {
    images = await fetchAllRows<ImageRow>(() => db.from('entity_images').select('slug, path, license, author, source_url, license_verified').eq('site_id', REFS_SITE).eq('kind', 'character').order('id', { ascending: true }));
  } catch {
    images = [];
  }
  const refOf = new Map(refRows.map((r) => [keyOf(r.series_slug, r.character_slug), r]));
  const imageOf = new Map(images.map((r) => [r.slug, r]));
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const counts = new Map<string, number>();
  const rows: RefListRow[] = [];
  for (const c of chars) {
    const g = groupById.get(c.group_id);
    if (!g) continue;
    counts.set(g.slug, (counts.get(g.slug) ?? 0) + 1);
    const slug = keyOf(g.slug, c.slug);
    const r = refOf.get(slug);
    const img = imageOf.get(slug);
    rows.push({
      series: g.slug, seriesName: g.name, character: c.slug, name: c.name,
      status: r?.status ?? 'reference',
      reference: r && (r.reference_path || r.reference_page_url || r.reference_file_page_url || r.reference_author || r.reference_license)
        ? { hasFile: Boolean(r.reference_path), pageUrl: r.reference_page_url, filePageUrl: r.reference_file_page_url, author: r.reference_author, license: r.reference_license }
        : null,
      candidate: r && (r.candidate_path || r.candidate_source_url || r.candidate_author || r.candidate_license)
        ? { hasFiles: Boolean(r.candidate_path), sourceUrl: r.candidate_source_url, author: r.candidate_author, license: r.candidate_license, licenseUrl: r.candidate_license_url }
        : null,
      published: img ? { url: publicUrl(img.path), license: img.license, author: img.author, sourceUrl: img.source_url, verified: img.license_verified === true } : null,
      publishedAt: r?.published_at ?? null,
    });
  }
  const series = groups.filter((g) => counts.has(g.slug)).map((g) => ({ slug: g.slug, name: g.name, count: counts.get(g.slug) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  rows.sort((a, b) => a.seriesName.localeCompare(b.seriesName, 'en', { sensitivity: 'base' }) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return { schema, total: rows.length, published: rows.filter((r) => r.status === 'published').length, series, rows };
}

// ---- previews (short signed URLs) ---------------------------------------------------------------------------------------------------

export interface SignedPreview { readonly reference: string | null; readonly candidate: string | null }

/**
 * Signed URLs of the reference and of the candidate (1x file) of the named characters, SIGNED_URL_SECONDS long, made with the service client.
 * The paths come from the table, never from the browser. The bucket stays private; there is no public URL.
 */
export async function signPreviews(db: Db, slugs: readonly string[]): Promise<Record<string, SignedPreview>> {
  const out: Record<string, SignedPreview> = {};
  for (const slug of slugs) {
    const [series, character] = slug.split('/');
    if (!series || !character) continue;
    const { data, error } = await db.from(REFS_TABLE).select('reference_path, candidate_path').eq('site_id', REFS_SITE).eq('series_slug', series).eq('character_slug', character).maybeSingle();
    if (error) {
      if (isMissing(error)) return out;
      throw DB_FAILED();
    }
    const row = data as { reference_path: string | null; candidate_path: string | null } | null;
    if (!row) continue;
    const sign = async (path: string | null): Promise<string | null> => {
      if (!path) return null;
      const res = await db.storage.from(REFS_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
      return res?.error || !res?.data?.signedUrl ? null : (res.data.signedUrl as string);
    };
    out[slug] = { reference: await sign(row.reference_path), candidate: await sign(row.candidate_path) };
  }
  return out;
}

// ---- the candidate (private) --------------------------------------------------------------------------------------------------------

async function readRow(db: Db, series: string, character: string): Promise<RefDbRow | null> {
  const { data, error } = await db.from(REFS_TABLE).select(REF_COLUMNS).eq('site_id', REFS_SITE).eq('series_slug', series).eq('character_slug', character).maybeSingle();
  if (error) {
    if (isMissing(error)) throw new ImageError('refs_missing', 503, 'La table des références n\'est pas là : la migration L32 attend son application.');
    throw DB_FAILED();
  }
  return (data as RefDbRow | null) ?? null;
}

async function putPrivate(db: Db, path: string, bytes: Uint8Array): Promise<void> {
  const { error } = await db.storage.from(REFS_BUCKET).upload(path, bytes, { contentType: 'image/webp', cacheControl: '60', upsert: true });
  if (error) throw new ImageError('storage_failed', 502, 'L\'image n\'a pas pu être enregistrée dans le stockage privé.');
}

async function dropPrivate(db: Db, paths: readonly (string | null | undefined)[]): Promise<boolean> {
  const list = paths.filter((p): p is string => typeof p === 'string' && p !== '');
  if (list.length === 0) return true;
  try {
    const res = await db.storage.from(REFS_BUCKET).remove(list);
    return !res?.error;
  } catch {
    return false;
  }
}

async function downloadPrivate(db: Db, path: string): Promise<Uint8Array | null> {
  try {
    const { data, error } = await db.storage.from(REFS_BUCKET).download(path);
    if (error || !data) return null;
    return new Uint8Array(await (data as Blob).arrayBuffer());
  } catch {
    return null;
  }
}

const draftColumns = (c: RefCreditFields): Record<string, unknown> => ({
  candidate_source_url: c.source_url || null, candidate_author: c.author || null, candidate_license: c.license || null, candidate_license_url: c.license_url || null,
});

export interface SaveCandidateInput {
  readonly series: string;
  readonly character: string;
  /** The picture as the owner chose it, hashed here and never stored. Absent: only the credit of the stored candidate changes. */
  readonly original: Uint8Array | null;
  /** The three WebP files the browser made from it (the 1x box of a character, twice that, the 96 px square). */
  readonly files: PhotoFiles | null;
  readonly credit: RefCreditFields;
}

/**
 * Keeps the owner's free picture as a PRIVATE candidate in the bucket character-refs (nothing is published). With files: they are checked from
 * their bytes (the rules of the Images tab), stored under a name that carries the hash of the original, and the row becomes a candidate. Without:
 * the credit of the stored candidate changes. The credit is stored as typed (it may still be the pre-filled one); publication is what judges it.
 */
export async function saveCandidate(db: Db, a: SaveCandidateInput): Promise<{ readonly hash: string | null }> {
  await assertPhotoEntity(db, 'character', slugOf(a.series, a.character));
  checkDraftCredit(a.credit);
  const row = await readRow(db, a.series, a.character);
  if (!a.files) {
    if (!row?.candidate_path) throw new ImageError('no_candidate', 422, 'Choisis d\'abord l\'image libre : glisse un fichier.');
    const { error } = await db.from(REFS_TABLE).update(draftColumns(a.credit)).eq('site_id', REFS_SITE).eq('series_slug', a.series).eq('character_slug', a.character);
    if (error) throw DB_FAILED();
    return { hash: hashOfCandidatePath(row.candidate_path) };
  }
  if (!a.original || a.original.length === 0) throw new ImageError('bad_request', 400, 'Le fichier d\'origine manque : il sert à vérifier que l\'image n\'est pas celle de Fandom.');
  if (a.original.length > CANDIDATE_ORIGINAL_MAX) throw new ImageError('too_large', 413, `Le fichier d'origine dépasse ${Math.round(CANDIDATE_ORIGINAL_MAX / 1048576)} Mo : réduis-le avant de le glisser.`);
  if (a.original.length > MAX_SOURCE_BYTES || !sniffImage(a.original)) throw new ImageError('unsupported_type', 415, 'Le fichier d\'origine n\'est pas une image (JPEG, PNG, WebP, GIF ou AVIF).');
  const checked = checkPhotoFiles('character', a.files);
  const hash = sha256Hex(a.original).slice(0, HASH_LEN);
  const paths = candidatePaths(candidateBase(a.series, a.character, hash));
  await putPrivate(db, paths.x1, checked.x1.bytes);
  try {
    await putPrivate(db, paths.x2, checked.x2.bytes);
    await putPrivate(db, paths.thumb, checked.thumb.bytes);
    const now = new Date().toISOString();
    const fields = { ...draftColumns(a.credit), candidate_path: paths.x1, candidate_uploaded_at: now, status: 'candidate' };
    const res = row
      ? await db.from(REFS_TABLE).update(fields).eq('site_id', REFS_SITE).eq('series_slug', a.series).eq('character_slug', a.character)
      : await db.from(REFS_TABLE).insert({ site_id: REFS_SITE, series_slug: a.series, character_slug: a.character, ...fields });
    if (res.error) throw DB_FAILED();
  } catch (e) {
    if (row?.candidate_path !== paths.x1) await dropPrivate(db, [paths.x1, paths.x2, paths.thumb]);
    throw e;
  }
  // The previous candidate (another picture) leaves the bucket.
  if (row?.candidate_path && row.candidate_path !== paths.x1) {
    const old = candidatePaths(baseOfCandidatePath(row.candidate_path));
    await dropPrivate(db, [old.x1, old.x2, old.thumb]);
  }
  return { hash };
}

/** Removes the candidate (its files and its credit). The row goes back to published if the character was published, else to reference. */
export async function discardCandidate(db: Db, series: string, character: string): Promise<void> {
  const row = await readRow(db, series, character);
  if (!row?.candidate_path) throw new ImageError('no_candidate', 404, 'Ce personnage n\'a pas de candidat à retirer.');
  const old = candidatePaths(baseOfCandidatePath(row.candidate_path));
  const { error } = await db.from(REFS_TABLE).update({
    candidate_path: null, candidate_source_url: null, candidate_author: null, candidate_license: null, candidate_license_url: null, candidate_uploaded_at: null,
    status: row.published_at ? 'published' : 'reference',
  }).eq('site_id', REFS_SITE).eq('series_slug', series).eq('character_slug', character);
  if (error) throw DB_FAILED();
  await dropPrivate(db, [old.x1, old.x2, old.thumb]);
}

// ---- publication --------------------------------------------------------------------------------------------------------------------

export interface PublishInput {
  readonly series: string;
  readonly character: string;
  readonly credit: RefCreditFields;
  readonly userId: string;
}

export interface Published {
  readonly slug: string;
  readonly path: string;
  /** False when the reference file could not be removed from the bucket (the picture is published; the row keeps the path to retry). */
  readonly referenceDeleted: boolean;
}

/**
 * "Valider et publier". REFUSES (nothing is stored, nothing is deleted) when: the character has no candidate; the candidate is the reference
 * (same hash); the source address or the licence address is on Fandom; the licence is empty, outside the list or the reference's own. Otherwise
 * the CANDIDATE (never the reference) goes through the pipeline of the Images tab (savePhoto: the WebP files and the 96 px square in entity-images,
 * the entity_images row under <series>/<character> with its licence and license_verified = true), the reference and the candidate files leave
 * the private bucket, and the row becomes published with its published_at.
 */
export async function publishCandidate(db: Db, a: PublishInput): Promise<Published> {
  const slug = slugOf(a.series, a.character);
  await assertPhotoEntity(db, 'character', slug);
  const row = await readRow(db, a.series, a.character);
  if (!row?.candidate_path) throw new ImageError('no_candidate', 422, 'Il n\'y a pas d\'image libre à publier : glisse d\'abord un fichier.');
  const candidateHash = hashOfCandidatePath(row.candidate_path);
  if (!candidateHash) throw new ImageError('no_candidate', 422, 'Le candidat n\'a pas de signature lisible : renvoie le fichier.');

  // 1. Is the candidate the reference? By the name of the reference file, then by its bytes.
  if (row.reference_path) {
    const hashes = new Set<string>();
    const named = hashOfReferencePath(row.reference_path);
    if (named) hashes.add(named);
    const bytes = await downloadPrivate(db, row.reference_path);
    if (bytes) hashes.add(sha256Hex(bytes).slice(0, HASH_LEN));
    if (hashes.has(candidateHash)) {
      throw new ImageError('same_picture', 422, 'Le candidat est exactement l\'image de la référence Fandom (même empreinte) : choisis une image libre.');
    }
  }

  // 2. The credit: Fandom addresses, the list, the reference's licence.
  const meta = parseRefCredit(a.credit, row.reference_license);

  // 3. The candidate's files, from the private bucket.
  const paths = candidatePaths(baseOfCandidatePath(row.candidate_path));
  const [x1, x2, thumb] = await Promise.all([downloadPrivate(db, paths.x1), downloadPrivate(db, paths.x2), downloadPrivate(db, paths.thumb)]);
  if (!x1 || !x2 || !thumb) throw new ImageError('no_candidate', 422, 'Les fichiers du candidat ont disparu du stockage privé : renvoie le fichier.');

  // 4. The pipeline of the Images tab. Focal point: the middle (the browser cropped around it).
  const saved = await savePhoto(db, { kind: 'character', slug, files: { x1, x2, thumb }, meta, verified: true, focal: { x: 50, y: 50 }, userId: a.userId });

  // 5. The reference and the candidate leave the private bucket; the row says published.
  const referenceDeleted = row.reference_path ? await dropPrivate(db, [row.reference_path]) : true;
  await dropPrivate(db, [paths.x1, paths.x2, paths.thumb]);
  const update: Record<string, unknown> = {
    status: 'published', published_at: new Date().toISOString(), candidate_path: null,
    candidate_source_url: meta.source_url, candidate_author: meta.author, candidate_license: meta.license, candidate_license_url: meta.license_url ?? null,
  };
  if (referenceDeleted) update.reference_path = null;
  const { error } = await db.from(REFS_TABLE).update(update).eq('site_id', REFS_SITE).eq('series_slug', a.series).eq('character_slug', a.character);
  if (error) throw new ImageError('db_failed', 500, 'L\'image est publiée mais la fiche de référence n\'a pas pu être mise à jour.');
  return { slug, path: saved.path, referenceDeleted };
}
