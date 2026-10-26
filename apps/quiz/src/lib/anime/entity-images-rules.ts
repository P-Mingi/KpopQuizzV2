// Run O1 (ADM front, joined to ADM back): the owner's own images of the series and the characters of otakuquiz.org. Pure rules, no React and
// no I/O: the form rules, the focal point, the order in which an image is picked for display (the owner's, else the bundled photo, else the
// neutral placeholder), the credit rule and the rows of /credits. The shapes of the admin API are those of part 1 itself (type-only imports
// of lib/entity-images: the answers of the routes are EntityImageDto and ListedSeries, nothing is restated here). The admin UI, the display
// components, the credits page and their tests all read this file.

import { path2x } from '@/lib/entity-images/constants';

import { creditLine } from './series-images-rules';

import type { ImageErrorCode } from '@/lib/entity-images/errors';
import type { ListedCharacter, ListedSeries } from '@/lib/entity-images/list';
import type { EntityImageDto } from '@/lib/entity-images/types';
import type { SeriesImageAttribution } from './series-images-rules';

export { creditLine };

export type EntityKind = 'series' | 'character';

/** The licences the form offers, as the database stores them (entity_images.license). */
export const LICENSE_CODES = ['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'own_photo', 'licensed', 'other'] as const;
export type LicenseCode = (typeof LICENSE_CODES)[number];

export const LICENSE_LABEL: Readonly<Record<LicenseCode, string>> = {
  cc0: 'CC0',
  public_domain: 'Public domain',
  cc_by: 'CC BY',
  cc_by_sa: 'CC BY-SA',
  own_photo: 'My photo',
  licensed: 'Licensed by the rights holder',
  other: 'Other',
};

/** Where to read the licence, for the codes that have one page (CC BY and CC BY-SA point to the explanation of the licences: the version is not stored). */
export const LICENSE_URL: Readonly<Partial<Record<LicenseCode, string>>> = {
  cc0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  public_domain: 'https://creativecommons.org/publicdomain/mark/1.0/',
  cc_by: 'https://creativecommons.org/share-your-work/cclicenses/',
  cc_by_sa: 'https://creativecommons.org/share-your-work/cclicenses/',
};

/** CC BY and CC BY-SA ask for a credit line next to the image; every other licence is listed on /credits only. */
export function requiresCredit(license: string): boolean {
  return license === 'cc_by' || license === 'cc_by_sa';
}

export function isLicenseCode(v: unknown): v is LicenseCode {
  return typeof v === 'string' && (LICENSE_CODES as readonly string[]).includes(v);
}

/** An image as the admin routes answer it (camelCase, with the public url and url2x): the shape of part 1, not a copy of it. */
export type AdminImage = EntityImageDto;

/** One row of the display columns of public.entity_images (the columns anon and authenticated may select). */
export interface EntityImage {
  readonly kind: EntityKind;
  /** A series: its group slug. A character: `characterImageSlug(series, character)`. */
  readonly slug: string;
  /** The path inside the public bucket `entity-images`. A full https URL is taken as it is. */
  readonly path: string;
  readonly width: number;
  readonly height: number;
  /** 0 to 100, the point of the picture to keep in view when it is cropped (object-position). */
  readonly focal_x: number;
  readonly focal_y: number;
  readonly source_url: string;
  readonly author: string;
  readonly license: LicenseCode;
  readonly license_note: string | null;
  readonly updated_at: string;
}

/** What the owner types before an image is saved. */
export interface ImageMeta {
  readonly source_url: string;
  readonly author: string;
  readonly license: LicenseCode | '';
  readonly license_note: string;
}

export const EMPTY_META: ImageMeta = { source_url: '', author: '', license: '', license_note: '' };

export type MetaField = 'source_url' | 'author' | 'license' | 'license_note';
export type MetaErrors = Partial<Record<MetaField, string>>;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const isHttpsUrl = (v: string): boolean => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.hostname.includes('.');
  } catch {
    return false;
  }
};

/** The form rules, in plain words (the server checks the same again). `meta` has no errors when the result is empty. */
export function validateMeta(meta: ImageMeta): MetaErrors {
  const e: MetaErrors = {};
  const url = meta.source_url.trim();
  if (!url) e.source_url = 'Enter the page where the image comes from.';
  else if (!isHttpsUrl(url)) e.source_url = 'The source must be a full web address that starts with https://.';
  else if (url.length > 500) e.source_url = 'The source address is too long (500 characters at most).';
  const author = meta.author.trim();
  if (!author) e.author = 'Enter who made the image.';
  else if (author.length > 200) e.author = 'The author name is too long (200 characters at most).';
  if (!meta.license) e.license = 'Choose the licence.';
  else if (!isLicenseCode(meta.license)) e.license = 'Choose one of the licences in the list.';
  const note = meta.license_note.trim();
  if (meta.license === 'other' && !note) e.license_note = 'Explain the licence in a few words.';
  else if (note.length > 300) e.license_note = 'The note is too long (300 characters at most).';
  return e;
}

/** The meta the API receives: trimmed, and the note only where it counts. Call it after validateMeta found nothing. */
export function metaPayload(meta: ImageMeta): { source_url: string; author: string; license: string; license_note: string } {
  return {
    source_url: meta.source_url.trim(),
    author: meta.author.trim(),
    license: meta.license,
    license_note: meta.license === 'other' || meta.license_note.trim() ? meta.license_note.trim() : '',
  };
}

export interface FileFacts { readonly name: string; readonly size: number; readonly type: string }

/** The checks the browser can make before it sends a file (the server sniffs the bytes and decides). Null when the file may go. */
export function fileProblem(f: FileFacts): string | null {
  if (f.size <= 0) return 'This file is empty.';
  if (f.size > MAX_UPLOAD_BYTES) return `This file is ${(f.size / (1024 * 1024)).toFixed(1)} MB. The limit is 8 MB.`;
  if (!ACCEPTED_TYPES.includes(f.type)) return 'This is not a picture we can use. Send a JPEG, PNG, WebP, GIF or AVIF file.';
  return null;
}

export type UploadCheck = { readonly ok: true } | { readonly ok: false; readonly problem?: string; readonly errors: MetaErrors };
export type ImportCheck = { readonly ok: true; readonly url: string } | { readonly ok: false; readonly urlError?: string; readonly errors: MetaErrors };

/** What stops the Save of a chosen file: no file, a file we cannot use, or a form that is not complete. */
export function checkUpload(file: FileFacts | null, meta: ImageMeta): UploadCheck {
  if (!file) return { ok: false, problem: 'Choose a file first.', errors: validateMeta(meta) };
  const problem = fileProblem(file);
  const errors = validateMeta(meta);
  if (problem) return { ok: false, problem, errors };
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}

/** What stops the Import of an address: an empty or non-https address, or a form that is not complete. */
export function checkImport(address: string, meta: ImageMeta): ImportCheck {
  const url = address.trim();
  const errors = validateMeta(meta);
  if (!url) return { ok: false, urlError: 'Paste the address of an image.', errors };
  if (!/^https:\/\//i.test(url)) return { ok: false, urlError: 'The address must start with https://.', errors };
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, url };
}

/** Every code the routes of part 1 answer (ImageErrorCode, plus the 404 of the gate), in plain words. A new code there fails tsc here. */
const CODE_WORDS: Readonly<Record<ImageErrorCode | 'not_found', string>> = {
  not_found: 'This page or item was not found. Reload and try again.',
  forbidden: 'This request did not come from the admin page. Reload the page and try again.',
  bad_request: 'The request could not be read. Reload the page and try again.',
  bad_kind: 'This picture slot is not valid. Reload the page and try again.',
  bad_slug: 'This picture slot is not valid. Reload the page and try again.',
  bad_meta: 'Fill in the source (an https address), the author and the licence. The licence "Other" needs a note.',
  bad_focal: 'The focal point must be inside the picture.',
  unknown_entity: 'That series or character no longer exists. Reload the page.',
  no_image: 'There is no image of yours here yet. Upload or import one first.',
  too_large: 'The image is too big. The limit is 8 MB.',
  unsupported_type: 'This is not a picture we can use. Send a JPEG, PNG, WebP, GIF or AVIF file.',
  invalid_image: 'This file could not be read as a picture. Try another file.',
  image_too_small: 'This picture is too small and would look blurry. Use a larger one.',
  bad_url: 'Paste the full address of a picture, starting with https://.',
  blocked_address: 'This address cannot be imported. Use a public https address.',
  dns_failed: 'The address could not be found. Check it and try again.',
  too_many_redirects: 'The address sent us around too many times.',
  timeout: 'The address took too long to answer.',
  fetch_failed: 'The image could not be downloaded from that address.',
  storage_failed: 'The picture could not be stored. Try again in a moment.',
  db_failed: 'The server had a problem. Try again in a moment.',
  server_error: 'The server had a problem. Try again in a moment.',
};

const KNOWN_CODES = CODE_WORDS as Readonly<Record<string, string>>;

/**
 * An API failure in plain words. `code` is the `code` of the answer ({ error, code }), `status` the HTTP status, `sentence` the `error` of the
 * answer (the server's own plain words, used only for a code this client does not know).
 */
export function errorWords(code: string | null | undefined, status?: number, sentence?: string | null): string {
  const c = (code ?? '').trim();
  if (Object.prototype.hasOwnProperty.call(KNOWN_CODES, c)) return KNOWN_CODES[c]!;
  const s = (sentence ?? '').trim();
  if (s && /\s/.test(s) && s.length < 200) return s.charAt(0).toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? '' : '.');
  if (status === 413) return CODE_WORDS.too_large;
  if (status === 415) return CODE_WORDS.unsupported_type;
  if (status === 401) return 'Your session has ended. Sign in again.';
  if (status === 403) return 'This account is not allowed to change images.';
  if (status === 404) return CODE_WORDS.not_found;
  if (status !== undefined && status >= 500) return CODE_WORDS.server_error;
  return 'Something went wrong. Try again.';
}

// ---- the focal point ------------------------------------------------------------------------------------------------------------

export interface Focal { readonly x: number; readonly y: number }
export const CENTER_FOCAL: Focal = { x: 50, y: 50 };

export const clampPercent = (n: number): number => (Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 50);

/** The focal point of a click on the image: the click's place inside the box of the image, in whole percent. */
export function focalFromPoint(box: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number): Focal {
  if (box.width <= 0 || box.height <= 0) return CENTER_FOCAL;
  return { x: clampPercent(((clientX - box.left) / box.width) * 100), y: clampPercent(((clientY - box.top) / box.height) * 100) };
}

/** The point moved by a key press (arrows), `step` percent at a time. Other keys leave it where it is. */
export function nudgeFocal(f: Focal, key: string, step = 2): Focal {
  switch (key) {
    case 'ArrowLeft': return { x: clampPercent(f.x - step), y: f.y };
    case 'ArrowRight': return { x: clampPercent(f.x + step), y: f.y };
    case 'ArrowUp': return { x: f.x, y: clampPercent(f.y - step) };
    case 'ArrowDown': return { x: f.x, y: clampPercent(f.y + step) };
    default: return f;
  }
}

/** The CSS object-position of a focal point. */
export const objectPositionOf = (f: Focal | { focal_x: number; focal_y: number }): string => {
  const x = 'x' in f ? f.x : f.focal_x;
  const y = 'y' in f ? f.y : f.focal_y;
  return `${clampPercent(x)}% ${clampPercent(y)}%`;
};

// ---- where the files are --------------------------------------------------------------------------------------------------------

export const ENTITY_IMAGES_BUCKET = 'entity-images';

/** The public address of a stored image. `version` (updated_at) is appended so a replaced image is fetched again. */
export function entityImageUrl(path: string, version?: string | null, base: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string {
  const v = version ? `?v=${encodeURIComponent(String(Date.parse(version) || version))}` : '';
  if (/^https?:\/\//.test(path)) return `${path}${v}`;
  const origin = (base ?? '').replace(/\/+$/, '');
  return `${origin}/storage/v1/object/public/${ENTITY_IMAGES_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}${v}`;
}

/** The key of a character in the table: the slug of a character is unique inside its series only, so the series comes first. */
export const characterImageSlug = (seriesSlug: string, characterSlug: string): string => `${seriesSlug}/${characterSlug}`;

// ---- display --------------------------------------------------------------------------------------------------------------------

/** What a component needs to draw an image of the owner's. */
export interface OwnerPicture {
  readonly src: string;
  /** The 2x file (twice the pixels, the name part 1 gives it), or null when there is none to name. */
  readonly src2x: string | null;
  readonly width: number;
  readonly height: number;
  /** CSS object-position, from the focal point. */
  readonly position: string;
  /** The credit line parts, only for the licences that ask for one. */
  readonly credit: SeriesImageAttribution | null;
}

/** The credit of an image, or null when its licence asks for none (those images are credited on /credits). */
export function creditOf(i: Pick<EntityImage, 'license' | 'author' | 'source_url'>): SeriesImageAttribution | null {
  if (!requiresCredit(i.license) || !isLicenseCode(i.license)) return null;
  return { author: i.author, license: LICENSE_LABEL[i.license], licenseUrl: LICENSE_URL[i.license] ?? i.source_url, sourceUrl: i.source_url };
}

export function ownerPictureOf(i: EntityImage, base?: string): OwnerPicture {
  const src = entityImageUrl(i.path, i.updated_at, base);
  const src2x = entityImageUrl(path2x(i.path), i.updated_at, base);
  return { src, src2x: src2x === src ? null : src2x, width: i.width, height: i.height, position: objectPositionOf(i), credit: creditOf(i) };
}

/** The srcset of an owner picture: the 1x and the 2x file, by their widths (the browser picks by the box and the screen), or null with no 2x. */
export function ownerSrcSet(p: Pick<OwnerPicture, 'src' | 'src2x' | 'width'>): string | null {
  return p.src2x && p.width > 0 ? `${p.src} ${p.width}w, ${p.src2x} ${p.width * 2}w` : null;
}

export interface BundledPicture { readonly file: string; readonly alt: string }

export type Picked =
  | { readonly source: 'owner'; readonly owner: OwnerPicture }
  | { readonly source: 'bundled'; readonly bundled: BundledPicture }
  | { readonly source: 'placeholder' };

/**
 * The picture of a series or a character, in the order the owner set: the owner's image first, else the bundled photo (a series
 * only: a character has none), else the neutral placeholder.
 */
export function pickImage(owner: OwnerPicture | EntityImage | null | undefined, bundled: BundledPicture | null | undefined): Picked {
  if (owner) return { source: 'owner', owner: 'src' in owner ? owner : ownerPictureOf(owner) };
  if (bundled) return { source: 'bundled', bundled };
  return { source: 'placeholder' };
}

// ---- the admin list -------------------------------------------------------------------------------------------------------------

/** A character of the admin list: the slug is `<series>/<character>`, the key the other routes take. */
export type AdminCharacter = ListedCharacter;

/** A series of the admin list, exactly as GET /api/admin/images/list answers it (image, bundled { url, alt }, source, counts, characters). */
export type AdminSeries = ListedSeries;

export type ImageFilter = 'all' | 'with' | 'without';

const norm = (s: string): string => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** The series that match the search (its name, its slug or the name of one of its characters) and the filter (the cover image). */
export function filterSeries(list: readonly AdminSeries[], query: string, filter: ImageFilter): AdminSeries[] {
  const q = norm(query);
  return list.filter((s) => {
    if (filter === 'with' && !s.image) return false;
    if (filter === 'without' && s.image) return false;
    if (!q) return true;
    return norm(s.name).includes(q) || norm(s.slug).includes(q) || s.characters.some((c) => norm(c.name).includes(q));
  });
}

export interface ImageCounts { readonly seriesWith: number; readonly seriesTotal: number; readonly charactersWith: number; readonly charactersTotal: number }

export function countImages(list: readonly AdminSeries[]): ImageCounts {
  let charactersWith = 0;
  let charactersTotal = 0;
  for (const s of list) for (const c of s.characters) { charactersTotal += 1; if (c.image) charactersWith += 1; }
  return { seriesWith: list.filter((s) => s.image).length, seriesTotal: list.length, charactersWith, charactersTotal };
}

/** "34/50 series, 120/412 characters". */
export function countsLine(c: ImageCounts): string {
  return `${c.seriesWith}/${c.seriesTotal} series, ${c.charactersWith}/${c.charactersTotal} characters`;
}

/**
 * A copy of the list with one image set (or removed, with null). The list is never changed in place. `source` (what the page shows) and
 * the character count follow the image, as the server would have answered them.
 */
export function withImage(list: readonly AdminSeries[], kind: EntityKind, slug: string, image: AdminImage | null): AdminSeries[] {
  return list.map((s) => {
    if (kind === 'series') {
      return s.slug === slug ? { ...s, image, source: image ? 'upload' : s.bundled ? 'bundled' : 'none' } : s;
    }
    if (!s.characters.some((c) => c.slug === slug)) return s;
    const characters = s.characters.map((c) => (c.slug === slug ? { ...c, image } : c));
    return { ...s, characters, characterImageCount: characters.filter((c) => c.image).length };
  });
}

// ---- /credits -------------------------------------------------------------------------------------------------------------------

export interface OwnerCreditRow {
  readonly kind: EntityKind;
  readonly slug: string;
  /** The series name, or "<character> (<series>)" for a character. */
  readonly name: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly position: string;
  readonly sourceUrl: string;
  readonly author: string;
  readonly license: string;
  readonly licenseUrl: string | null;
  readonly note: string | null;
  readonly retrieved: string;
  readonly credited: boolean;
  /** Where the name links to. */
  readonly href: string;
  /** A character above the spoiler floor: listed without its name or its picture. */
  readonly locked: boolean;
}

/** The credit rows of every image of the owner's, sorted by name; `names` gives the display name of a series (by slug) and of a character (by its key). */
export function ownerCreditRows(
  images: readonly EntityImage[],
  names: { readonly series: Readonly<Record<string, string>>; readonly character: Readonly<Record<string, string>> },
  base?: string,
): OwnerCreditRow[] {
  const words = (slug: string): string => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return images
    .filter((i) => isLicenseCode(i.license))
    .map((i): OwnerCreditRow => {
      const seriesSlug = i.kind === 'series' ? i.slug : i.slug.split('/')[0]!;
      const seriesName = names.series[seriesSlug] ?? words(seriesSlug);
      const characterName = i.kind === 'character' ? names.character[i.slug] : undefined;
      const locked = i.kind === 'character' && !characterName;
      const name = i.kind === 'series' ? seriesName : locked ? `A character of ${seriesName}` : `${characterName} (${seriesName})`;
      return {
        kind: i.kind,
        slug: locked ? seriesSlug : i.slug,
        name,
        locked,
        src: locked ? '' : entityImageUrl(i.path, i.updated_at, base),
        width: i.width,
        height: i.height,
        position: objectPositionOf(i),
        sourceUrl: i.source_url,
        author: i.author,
        license: LICENSE_LABEL[i.license],
        licenseUrl: LICENSE_URL[i.license] ?? null,
        note: i.license_note && i.license_note.trim() ? i.license_note.trim() : null,
        retrieved: i.updated_at.slice(0, 10),
        credited: requiresCredit(i.license),
        href: `/${seriesSlug}-quiz`,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
