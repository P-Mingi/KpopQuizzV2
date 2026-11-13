// Bunnyverse Cards lot 3 (DLE, owner decisions of 2026-11-13): the pictures of the characters that are not free, found by ONE selection that
// the preview of the Otakudle games and the admin's button "Supprimer les images non libres" both use. Nobody can read the database today, so
// the selection is narrow and computed on the server, at preview time and again at the click. Server only (service role client).
//
// A row of public.entity_images is selected when ALL of these hold:
//   site_id = 'anime', kind = 'character', never license_verified (the "licence verifiee" flag of 019), and either
//     A. license = 'other' AND license_note starts with "Official artwork" AND created_at is on 2026-11-11 (UTC day), the 1,012 images
//        of the import of that day ("Official artwork, rights belong to the original creators and studio"), or
//     B. license = 'cc0' AND source_url is on Fandom: its HOST is fandom.com, a subdomain of it, wikia.nocookie.net or a subdomain of it
//        (the host is parsed, never searched for as a substring of the address).
// An orphan file is an object of the bucket entity-images under anime/character/, created on 2026-11-11 from 21:00:00 to 21:30:00 UTC, that
// no entity_images row points to (neither as its main file, its 2x file nor its 96 px file).
//
// NON_FREE_SQL is the same selection as text, for the owner's SQL editor and the runbook (expect 0 once the button has run). A test runs it
// on PGlite against the predicate below and holds them equal.
import { BUCKET, IMAGE_SITE, path2x, tagsOfImage } from './constants';
import { ImageError } from './errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the app's clients are untyped
export type Db = any;

/** The UTC day of the import the owner wants gone, and the half-open range of its timestamps. */
export const NON_FREE_DAY = '2026-11-11';
export const NON_FREE_FROM_MS = Date.UTC(2026, 10, 11, 0, 0, 0, 0);
export const NON_FREE_TO_MS = Date.UTC(2026, 10, 12, 0, 0, 0, 0);
/** The note every one of those rows starts with. */
export const NON_FREE_NOTE_PREFIX = 'Official artwork';
/** The hosts of branch B: the domain and every subdomain of each. */
export const NON_FREE_HOSTS: readonly string[] = ['fandom.com', 'wikia.nocookie.net'];
/** More selected rows than this and the button refuses (about 1,068 are expected). */
export const NON_FREE_MAX_ROWS = 1100;
/** The word the owner types to confirm. */
export const NON_FREE_CONFIRM = 'SUPPRIMER';
/** The orphan files: under this folder of the bucket, created in this window (both ends included), with no row. */
export const ORPHAN_PREFIX = 'anime/character';
export const ORPHAN_FROM_MS = Date.UTC(2026, 10, 11, 21, 0, 0, 0);
export const ORPHAN_TO_MS = Date.UTC(2026, 10, 11, 21, 30, 0, 0);
/** A sanity cap on the orphans of one run (a window this narrow should hold a few thousand files at most). */
export const ORPHAN_MAX = 6000;

/** The columns the selection reads (019's license_verified and thumb_path included: without them the read fails and nothing is selected). */
export const NON_FREE_COLUMNS = 'id, site_id, kind, slug, path, thumb_path, license, license_note, source_url, created_at, license_verified';

export interface CandidateRow {
  readonly id: number;
  readonly site_id: string;
  readonly kind: string;
  readonly slug: string;
  readonly path: string;
  readonly thumb_path: string | null;
  readonly license: string;
  readonly license_note: string | null;
  readonly source_url: string | null;
  readonly created_at: string;
  readonly license_verified: boolean;
}

// ---- the host of an address -----------------------------------------------------------------------------------------------------------

// scheme, optional user info, the host, an optional numeric port, then the end or the start of a path, query or fragment. Whitespace and
// backslashes are refused anywhere (a browser reads a backslash as a slash, which would move the host). NON_FREE_SQL uses the same pattern.
const HOST_RE = /^https?:\/\/(?:[^/?#@\\\s]*@)?([^/?#:@\\\s]+)(?::[0-9]*)?(?:[/?#]|$)/;
const NO_BAD_CHARS = /[\s\\]/;
const FANDOM_HOST_RE = /^(?:[a-z0-9-]+\.)*(?:fandom\.com|wikia\.nocookie\.net)$/;

/** The lowercase host of an http(s) address, parsed; null when the address is not one the parser and the pattern agree on. */
export function hostOf(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const u = url.trim() === url ? url.toLowerCase() : '';
  if (u === '' || NO_BAD_CHARS.test(u)) return null;
  const m = HOST_RE.exec(u);
  if (!m || !m[1]) return null;
  let parsed: URL;
  try { parsed = new URL(u); } catch { return null; }
  // Two readings of the same address must agree: the pattern's and the standard parser's. A trailing dot or any oddity ends in null.
  return parsed.hostname === m[1] ? m[1] : null;
}

/** True for fandom.com, a subdomain of it, wikia.nocookie.net or a subdomain of it. */
export function isFandomHost(host: string | null): boolean {
  return host !== null && FANDOM_HOST_RE.test(host);
}

// ---- the predicate --------------------------------------------------------------------------------------------------------------------

function onTheDay(createdAt: string): boolean {
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && t >= NON_FREE_FROM_MS && t < NON_FREE_TO_MS;
}

/** The selection, one row at a time. Pure. */
export function isNonFreeRow(r: CandidateRow): boolean {
  if (r.site_id !== IMAGE_SITE || r.kind !== 'character' || r.license_verified !== false) return false;
  if (r.license === 'other') {
    return typeof r.license_note === 'string' && r.license_note.startsWith(NON_FREE_NOTE_PREFIX) && typeof r.created_at === 'string' && onTheDay(r.created_at);
  }
  if (r.license === 'cc0') return isFandomHost(hostOf(r.source_url));
  return false;
}

/** The same selection as SQL text (one query, the count). A test runs it on PGlite and holds it equal to isNonFreeRow. */
export const NON_FREE_SQL = `select count(*) as non_free_images
from public.entity_images
where site_id = 'anime' and kind = 'character' and not license_verified
  and (
    (license = 'other' and starts_with(license_note, 'Official artwork')
      and created_at >= timestamptz '2026-11-11 00:00:00+00' and created_at < timestamptz '2026-11-12 00:00:00+00')
    or
    (license = 'cc0' and source_url !~ '[\\s\\\\]'
      and substring(lower(source_url) from '^https?://(?:[^/?#@\\\\\\s]*@)?([^/?#:@\\\\\\s]+)(?::[0-9]*)?(?:[/?#]|$)') ~ '^([a-z0-9-]+[.])*(fandom[.]com|wikia[.]nocookie[.]net)$')
  );`;

/** The orphan files as SQL text (same window, same folder, no row pointing to them): for the owner's SQL editor and the runbook, expect 0 after the button. */
export const ORPHAN_FILES_SQL = `select count(*) as orphan_files
from storage.objects o
where o.bucket_id = 'entity-images' and starts_with(o.name, 'anime/character/')
  and o.created_at >= timestamptz '2026-11-11 21:00:00+00' and o.created_at <= timestamptz '2026-11-11 21:30:00+00'
  and not exists (
    select 1 from public.entity_images e
    where o.name = e.path or o.name = regexp_replace(e.path, '[.]webp$', '-2x.webp') or o.name = e.thumb_path
  );`;

// ---- the rows and their files ---------------------------------------------------------------------------------------------------------

export interface SelectedRow {
  readonly id: number;
  readonly slug: string;
  readonly license: string;
  /** Why it is selected, short: "Official artwork" or the host. */
  readonly why: string;
  /** Its main file, its 2x file and its 96 px file when it has one. */
  readonly files: readonly string[];
}

const filesOfRow = (r: Pick<CandidateRow, 'path' | 'thumb_path'>): string[] => [r.path, path2x(r.path), ...(r.thumb_path ? [r.thumb_path] : [])];

function selectedOf(r: CandidateRow): SelectedRow {
  return { id: r.id, slug: r.slug, license: r.license, why: r.license === 'cc0' ? hostOf(r.source_url) ?? '' : NON_FREE_NOTE_PREFIX, files: filesOfRow(r) };
}

const failedRead = (): ImageError => new ImageError('db_failed', 500, 'La base n\'a pas pu être lue. Réessaie.');

/** Every candidate row, paged past the 1000-row cap, then the predicate. The coarse filter is only there to read less; the predicate decides. */
export async function selectNonFreeRows(db: Db): Promise<SelectedRow[]> {
  const out: SelectedRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('entity_images').select(NON_FREE_COLUMNS)
      .eq('site_id', IMAGE_SITE).eq('kind', 'character').eq('license_verified', false).in('license', ['other', 'cc0'])
      .order('id', { ascending: true }).range(from, from + 999);
    if (error) throw failedRead();
    const page = (data ?? []) as CandidateRow[];
    for (const r of page) if (isNonFreeRow(r)) out.push(selectedOf(r));
    if (page.length < 1000) return out;
  }
}

/** The row of one character if (and only if) it is selected; null otherwise. The preview route uses it per picture. */
export async function selectNonFreeRow(db: Db, slug: string): Promise<(SelectedRow & { readonly path: string }) | null> {
  const { data, error } = await db.from('entity_images').select(NON_FREE_COLUMNS)
    .eq('site_id', IMAGE_SITE).eq('kind', 'character').eq('slug', slug).maybeSingle();
  if (error) throw failedRead();
  const r = data as CandidateRow | null;
  return r && isNonFreeRow(r) ? { ...selectedOf(r), path: r.path } : null;
}

/** Every row's id and files, whatever its site, kind or state, paged past the 1000-row cap. */
async function allRowFiles(db: Db): Promise<{ id: number; files: string[] }[]> {
  const out: { id: number; files: string[] }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('entity_images').select('id, path, thumb_path').order('id', { ascending: true }).range(from, from + 999);
    if (error) throw failedRead();
    const page = (data ?? []) as { id: number; path: string; thumb_path: string | null }[];
    for (const r of page) out.push({ id: r.id, files: filesOfRow(r) });
    if (page.length < 1000) return out;
  }
}

// ---- the bucket -----------------------------------------------------------------------------------------------------------------------

export interface StoredObject { readonly name: string; readonly createdAt: string }

/** Lists the files under a folder of the bucket, every level (the Storage API lists one level at a time), six folders at once. */
export async function listBucketObjects(db: Db, root: string = ORPHAN_PREFIX): Promise<StoredObject[]> {
  const out: StoredObject[] = [];
  const queue: string[] = [root];
  let active = 0;
  const listFolder = async (folder: string): Promise<void> => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.storage.from(BUCKET).list(folder, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw new ImageError('storage_failed', 502, 'Le stockage n\'a pas pu être lu. Réessaie.');
      const items = (data ?? []) as { name: string; id: string | null; created_at?: string | null }[];
      for (const it of items) {
        if (it.id === null || it.id === undefined) queue.push(`${folder}/${it.name}`);
        else out.push({ name: `${folder}/${it.name}`, createdAt: it.created_at ?? '' });
      }
      if (items.length < 1000) return;
    }
  };
  // A worker leaves only when the queue is empty AND no other worker is still listing a folder (it may add more).
  const worker = async (): Promise<void> => {
    for (;;) {
      const folder = queue.pop();
      if (folder === undefined) {
        if (active === 0) return;
        await new Promise((r) => setTimeout(r, 5));
        continue;
      }
      active++;
      try { await listFolder(folder); } finally { active--; }
    }
  };
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  return out;
}

/** True for an object created in the orphan window. */
export function inOrphanWindow(createdAt: string): boolean {
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && t >= ORPHAN_FROM_MS && t <= ORPHAN_TO_MS;
}

export function orphansOf(objects: readonly StoredObject[], referenced: ReadonlySet<string>): string[] {
  return objects.filter((o) => o.name.startsWith(`${ORPHAN_PREFIX}/`) && inOrphanWindow(o.createdAt) && !referenced.has(o.name)).map((o) => o.name).sort();
}

// ---- the plan -------------------------------------------------------------------------------------------------------------------------

export interface NonFreeCounts { readonly rows: number; readonly files: number; readonly orphans: number }

export interface NonFreeExample { readonly slug: string; readonly license: string; readonly why: string }

export interface NonFreePlan {
  readonly counts: NonFreeCounts;
  readonly tooMany: boolean;
  readonly examples: readonly NonFreeExample[];
  /** The rows, the files to remove with them and the orphans: server side only, never sent to the browser. */
  readonly rows: readonly SelectedRow[];
  readonly files: readonly string[];
  readonly orphans: readonly string[];
}

/** Ten examples spread over the list (every n-th row), so they do not all come from the first series. */
export function examplesOf(rows: readonly SelectedRow[], n = 10): NonFreeExample[] {
  if (rows.length === 0) return [];
  const step = Math.max(1, Math.floor(rows.length / n));
  const out: NonFreeExample[] = [];
  for (let i = 0; i < rows.length && out.length < n; i += step) {
    const r = rows[i]!;
    out.push({ slug: r.slug, license: r.license, why: r.why });
  }
  return out;
}

export type ListObjects = (db: Db) => Promise<StoredObject[]>;

/**
 * The whole selection: the rows, their files (without any file a row outside the selection still points to), the orphans (files in the
 * window that NO row points to), the counts and 10 examples.
 */
export async function planNonFree(db: Db, list: ListObjects = listBucketObjects): Promise<NonFreePlan> {
  const rows = await selectNonFreeRows(db);
  const taken = new Set(rows.map((r) => r.id));
  const all = await allRowFiles(db);
  const referenced = new Set(all.flatMap((r) => r.files));
  const kept = new Set(all.filter((r) => !taken.has(r.id)).flatMap((r) => r.files));
  const files = [...new Set(rows.flatMap((r) => r.files))].filter((f) => !kept.has(f));
  const orphans = orphansOf(await list(db), referenced);
  if (orphans.length > ORPHAN_MAX) throw new ImageError('too_many', 422, `Trop de fichiers orphelins (${orphans.length}, au plus ${ORPHAN_MAX}) : rien n'est supprimé.`);
  return { counts: { rows: rows.length, files: files.length, orphans: orphans.length }, tooMany: rows.length > NON_FREE_MAX_ROWS, examples: examplesOf(rows), rows, files, orphans };
}

// ---- the deletion ---------------------------------------------------------------------------------------------------------------------

export interface NonFreeReport { readonly rows: number; readonly files: number; readonly orphans: number; readonly failedChunks: number }

const chunks = <T>(list: readonly T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

/**
 * Re-runs the selection, refuses when it is too big or differs from the counts the owner saw, then removes the rows, their files and the
 * orphans. The browser sends only the counts and the word, never a list. A row is deleted only if it is still unverified (a verified row
 * is never taken, even if it was verified between the preview and the click).
 */
export async function deleteNonFree(
  db: Db,
  a: { confirm: unknown; expect: NonFreeCounts },
  list: ListObjects = listBucketObjects,
  revalidate: (tags: string[]) => void = () => undefined,
): Promise<NonFreeReport> {
  if (a.confirm !== NON_FREE_CONFIRM) throw new ImageError('bad_confirm', 400, `Tape ${NON_FREE_CONFIRM} pour confirmer.`);
  const plan = await planNonFree(db, list);
  if (plan.tooMany) throw new ImageError('too_many', 422, `${plan.counts.rows} images sélectionnées, plus que ${NON_FREE_MAX_ROWS} : rien n'est supprimé.`);
  const same = plan.counts.rows === a.expect.rows && plan.counts.files === a.expect.files && plan.counts.orphans === a.expect.orphans;
  if (!same) throw new ImageError('count_changed', 409, 'La sélection a changé depuis l\'aperçu : rien n\'est supprimé. Ouvre l\'aperçu de nouveau.');

  let failedChunks = 0;
  const gone = new Set<number>();
  for (const ids of chunks(plan.rows.map((r) => r.id), 100)) {
    const { data, error } = await db.from('entity_images').delete().in('id', ids)
      .eq('site_id', IMAGE_SITE).eq('kind', 'character').eq('license_verified', false).select('id');
    if (error) failedChunks++;
    else for (const d of (data ?? []) as { id: number }[]) gone.add(d.id);
  }
  // The files go after the rows, and only the files of rows that are really gone: a file with no row is a harmless orphan, a row with no
  // file is a broken picture. The orphans have no row, so they all go.
  const allowed = new Set(plan.files);
  const rowFiles = [...new Set(plan.rows.filter((r) => gone.has(r.id)).flatMap((r) => r.files))].filter((f) => allowed.has(f));
  const removeAll = async (paths: readonly string[]): Promise<number> => {
    let n = 0;
    for (const part of chunks(paths, 100)) {
      const { data, error } = await db.storage.from(BUCKET).remove(part);
      if (error) failedChunks++;
      else n += Array.isArray(data) ? data.length : part.length;
    }
    return n;
  };
  const files = await removeAll(rowFiles);
  const orphans = await removeAll(plan.orphans);
  try {
    revalidate([...new Set(plan.rows.filter((r) => gone.has(r.id)).flatMap((r) => tagsOfImage('character', r.slug)))]);
  } catch {
    // Outside a request there is no cache to expire.
  }
  return { rows: gone.size, files, orphans, failedChunks };
}
