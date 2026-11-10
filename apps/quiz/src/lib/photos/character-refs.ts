// Owner, 2026-11-10 (lane charrefs, L32): the admin screen of the character references (AniList since the owner's decision of the same day,
// Fandom before; the source is named from the host of the reference page, nothing says Fandom by itself). This file is PURE (no I/O, no server code):
// the names of the private store, the licence list the owner picks from, the rules that refuse a publication, the pre-fill of the form and
// the paths of the private files. The server side is character-refs-store.ts, the screen is components/admin/photos/character-refs-panel.tsx.
//
// A reference (a picture of the series' rights holder, found on AniList) is PRIVATE and never published: it is shown to the owner only, through short signed URLs. The owner replaces
// it with a free picture (the candidate, private too until the owner validates it); "Valider et publier" sends the CANDIDATE through the
// pipeline of the Images tab (lib/photos/store.ts savePhoto) and deletes the reference.
import { ImageError } from '@/lib/entity-images/errors';
import { MAX_AUTHOR, MAX_NOTE, MAX_SOURCE_URL } from '@/lib/entity-images/constants';

import type { ImageLicense } from '@/lib/entity-images/constants';
import type { ImageMeta } from '@/lib/entity-images/types';

/** The private bucket and the admin-only table of L32 (docs/pending-migrations/multisite/launch/L32-l1-character-refs.sql). */
export const REFS_BUCKET = 'character-refs';
export const REFS_TABLE = 'character_reference_images';
export const REFS_SITE = 'anime';

export const REF_STATUSES = ['reference', 'candidate', 'published'] as const;
export type RefStatus = (typeof REF_STATUSES)[number];

export const STATUS_LABEL: Readonly<Record<RefStatus, string>> = { reference: 'Référence', candidate: 'Candidat', published: 'Publié' };

/** The words under the credits of a reference that states no licence. */
export const NO_LICENSE_WORDS = 'non indiquée : à considérer comme non libre';

/** Signed preview URLs live this long (seconds): short, the owner's browser asks again. */
export const SIGNED_URL_SECONDS = 300;
/** The most characters a sign request names. */
export const SIGN_BATCH = 60;

/**
 * The original file of a candidate is sent to the server only to be hashed (sha256, compared with the reference). It travels in the same
 * request as the three WebP files, and a Vercel function takes 4.5 MB at most, so it is capped well below the 8 MB of the Images tab.
 */
export const CANDIDATE_ORIGINAL_MAX = 3 * 1024 * 1024;

export type OriginalPlan = 'send' | 'compress' | 'refuse';

/**
 * What the browser does with the picture the owner drops (pure, so it is tested): at most 3 MB it is sent as it is; a bigger one is first
 * shrunk to WebP like the Images tab does (resize.ts makeAssetFiles), and `compressedSize` (null until that is done) decides again: still
 * over 3 MB after the compression, it is refused. The server still hashes the bytes it receives and still refuses a picture identical to the
 * reference: the AniList references are about 40 KB, never compressed, so their bytes are sent untouched and that check still catches them.
 * The server keeps its own 3 MB check (character-refs-store.ts).
 */
export function planOriginal(size: number, compressedSize: number | null = null): OriginalPlan {
  if (compressedSize === null) return size <= CANDIDATE_ORIGINAL_MAX ? 'send' : 'compress';
  return compressedSize <= CANDIDATE_ORIGINAL_MAX ? 'send' : 'refuse';
}

/** The French refusal of a picture still over the limit after the compression. */
export const STILL_TOO_BIG = `Même réduite, l'image dépasse ${Math.round(CANDIDATE_ORIGINAL_MAX / 1048576)} Mo : choisis-en une plus simple ou plus petite.`;

// ---- the licence list of the owner --------------------------------------------------------------------------------------------------

/**
 * The owner's list (2026-11-10): CC0, domaine public, CC BY, CC BY-SA, oeuvre du propriétaire, commande avec droits écrits, autre licence
 * libre avec lien. Each value is one of lib/entity-images/constants.ts LICENSES (entity_images_license_check, 018), so nothing is added there:
 *   CC0 -> cc0, domaine public -> public_domain, CC BY -> cc_by, CC BY-SA -> cc_by_sa,
 *   oeuvre du propriétaire -> own_photo, commande avec droits écrits -> licensed, autre licence libre -> other (with its link).
 * FREE_LICENSES (the five of CR-021) leaves own_photo and licensed out, which stay valid in the database; this screen offers them too.
 */
export const REF_LICENSE_OPTIONS: readonly { readonly value: ImageLicense; readonly label: string }[] = [
  { value: 'cc0', label: 'CC0' },
  { value: 'public_domain', label: 'Domaine public' },
  { value: 'cc_by', label: 'CC BY' },
  { value: 'cc_by_sa', label: 'CC BY-SA' },
  { value: 'own_photo', label: 'Oeuvre du propriétaire' },
  { value: 'licensed', label: 'Commande avec droits écrits' },
  { value: 'other', label: 'Autre licence libre (lien obligatoire)' },
];

export const isRefLicense = (v: unknown): v is ImageLicense => typeof v === 'string' && REF_LICENSE_OPTIONS.some((o) => o.value === v);

/** The licence code a free text names (the licence a reference page states), or null when the text names none of the list. */
export function licenseOfText(text: string | null | undefined): ImageLicense | null {
  const t = (text ?? '').toLowerCase();
  if (!t.trim()) return null;
  if (/\bcc[\s-]?0\b|cc[\s-]?zero|\bcc0/.test(t)) return 'cc0';
  if (/public[\s-]?domain|domaine[\s-]?public/.test(t)) return 'public_domain';
  if (/\bby[\s-]?sa\b|share[\s-]?alike|partage/.test(t)) return 'cc_by_sa';
  if (/\bcc[\s-]?by\b|attribution/.test(t)) return 'cc_by';
  return null;
}

const squash = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * True when the licence chosen for the candidate is the licence the reference states. A reference text that names a licence of the list
 * (CC BY-SA 3.0, CC BY-SA, "Creative Commons Attribution-ShareAlike") is that licence whatever its version; for "autre" the licence note
 * is compared with the text. A reference that states nothing (or "fair use") equals no choice of the list.
 */
export function sameLicense(chosen: string, chosenNote: string | null | undefined, referenceText: string | null | undefined): boolean {
  const ref = (referenceText ?? '').trim();
  if (!ref || !chosen) return false;
  const named = licenseOfText(ref);
  if (named && named === chosen) return true;
  const label = REF_LICENSE_OPTIONS.find((o) => o.value === chosen)?.label ?? '';
  if (squash(ref) === squash(chosen) || (label && squash(ref) === squash(label))) return true;
  const note = (chosenNote ?? '').trim();
  return chosen === 'other' && note !== '' && squash(ref) === squash(note);
}

// ---- the addresses a free picture cannot come from ---------------------------------------------------------------------------------

/**
 * Hosts that can never be the source or the licence address of the free picture, with any subdomain (cdn.myanimelist.net is under
 * myanimelist.net, s4.anilist.co under anilist.co, static.wikia.nocookie.net under nocookie.net): the sources of the references. The hosts of
 * the row's own reference_page_url and reference_image_url are refused too (see isReferenceSourceUrl).
 */
export const REFUSED_SOURCE_HOSTS: readonly string[] = ['anilist.co', 'myanimelist.net', 'fandom.com', 'wikia.com', 'wikia.org', 'nocookie.net'];

const hostIs = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

/** The lower-case host of an address (no trailing dot), or null when the text is not an address. */
export function hostOfUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  try { return new URL(v).hostname.toLowerCase().replace(/\.$/, '') || null; } catch { return null; }
}

/**
 * True when an address is on a refused source: its host is one of REFUSED_SOURCE_HOSTS or of `ownHosts` (the hosts of the reference row) or a
 * subdomain of one (any case, a trailing dot, a port, a user name in front are all read by the URL parser), or when it is a copy of such a page
 * (a web archive address that carries the refused address in its path or query). A text that is not an address is checked as text.
 */
export function isReferenceSourceUrl(raw: string | null | undefined, ownHosts: readonly string[] = []): boolean {
  const v = (raw ?? '').trim();
  if (!v) return false;
  const domains = [...REFUSED_SOURCE_HOSTS, ...ownHosts.map((h) => h.toLowerCase().replace(/\.$/, '')).filter(Boolean)];
  let parsed: URL | null = null;
  try { parsed = new URL(v); } catch { parsed = null; }
  const inside = (text: string): boolean => {
    const lower = text.toLowerCase();
    return domains.some((d) => new RegExp(`(^|[^a-z0-9-])([a-z0-9-]+\\.)*${d.replace(/\./g, '\\.')}([^a-z0-9-]|$)`).test(lower));
  };
  if (!parsed) return inside(v);
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (domains.some((d) => hostIs(host, d))) return true;
  let rest = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  try { rest = decodeURIComponent(rest); } catch { /* keep the raw text */ }
  return inside(rest);
}

/** The words that name where a reference comes from, read from the host of its page: AniList, Fandom, or "la source" for anything else. */
export function sourceNameOf(pageUrl: string | null | undefined): string {
  const host = hostOfUrl(pageUrl);
  if (host && hostIs(host, 'anilist.co')) return 'AniList';
  if (host && ['fandom.com', 'wikia.com', 'wikia.org', 'nocookie.net'].some((d) => hostIs(host, d))) return 'Fandom';
  return 'la source';
}

/** "la référence AniList", "la référence Fandom", "la référence" when the source is unknown. */
export const referenceWords = (pageUrl: string | null | undefined): string => {
  const n = sourceNameOf(pageUrl);
  return n === 'la source' ? 'la référence' : `la référence ${n}`;
};

/** "Référence AniList" (title of box 1), "Référence" when the source is unknown. */
export const referenceTitle = (pageUrl: string | null | undefined): string => {
  const n = sourceNameOf(pageUrl);
  return n === 'la source' ? 'Référence' : `Référence ${n}`;
};

/** How the reference was found (reference_found_by), in French; the stored words for anything unknown. */
export const FOUND_BY_LABEL: Readonly<Record<string, string>> = {
  'anilist: media list': 'liste de la série',
  'anilist: alternative name': 'nom alternatif',
  'anilist: character search': 'recherche par nom',
  'anilist: checked by hand': 'vérifié à la main',
};
export const foundByLabel = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t ? (FOUND_BY_LABEL[t.toLowerCase()] ?? t) : null;
};

// ---- the credit of the candidate ----------------------------------------------------------------------------------------------------

/** What the form of box 2 holds, as strings. */
export interface RefCreditFields {
  readonly source_url: string;
  readonly author: string;
  readonly license: string;
  readonly license_url: string;
}

// eslint-disable-next-line no-control-regex -- the point is to refuse control characters
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The credit fields as sent (form fields), trimmed; never fails, whatever is wrong is said at publication. */
export function readCreditFields(get: (name: string) => unknown): RefCreditFields {
  return { source_url: text(get('source_url')), author: text(get('author')), license: text(get('license')), license_url: text(get('license_url')) };
}

/** What a candidate may hold before it is published: bounded text only (the pre-filled form may carry the reference's address on purpose). */
export function checkDraftCredit(c: RefCreditFields): void {
  if (c.source_url.length > MAX_SOURCE_URL || c.license_url.length > MAX_SOURCE_URL) throw new ImageError('bad_meta', 400, 'Une adresse est trop longue.');
  if (c.author.length > MAX_AUTHOR || CONTROL.test(c.author)) throw new ImageError('bad_meta', 400, 'L\'auteur n\'est pas valide (200 caractères au plus, pas de caractère de contrôle).');
  if (c.license !== '' && !isRefLicense(c.license)) throw new ImageError('bad_meta', 400, 'Choisis une licence de la liste.');
}

function httpsAddress(raw: string, what: string): string {
  let u: URL | null = null;
  try { u = new URL(raw); } catch { u = null; }
  if (!u || u.protocol !== 'https:' || raw.length > MAX_SOURCE_URL) throw new ImageError('bad_meta', 422, `${what} doit être une adresse web complète qui commence par https://.`);
  return u.toString();
}

/**
 * The credit that "Valider et publier" accepts, or the refusal in plain words. The checks, in this order: the source address is given, https and
 * NOT on a refused source (AniList, MyAnimeList, Fandom, and the hosts of the reference row: `referenceUrls`, its page and its image); the licence
 * address (when given) is https and NOT on a refused source; the licence is chosen and in the list; the author is given; "autre licence libre"
 * carries its link; the licence is not the one the reference states. Returns the credit as entity_images stores it.
 */
export function parseRefCredit(
  c: RefCreditFields,
  referenceLicense: string | null | undefined,
  referenceUrls: readonly (string | null | undefined)[] = [],
): ImageMeta {
  const own = referenceUrls.map(hostOfUrl).filter((h): h is string => h !== null);
  const words = referenceWords(referenceUrls[0]);
  if (!c.source_url) throw new ImageError('bad_meta', 422, 'Indique l\'adresse de la page source de l\'image libre (https://).');
  if (isReferenceSourceUrl(c.source_url, own)) {
    throw new ImageError('ref_source', 422, 'La page source est celle d\'une référence (AniList, MyAnimeList, Fandom ou la page de la référence) : une image de référence ne se publie pas. Donne la page de l\'image libre.');
  }
  const source = httpsAddress(c.source_url, 'La page source');
  if (c.license_url && isReferenceSourceUrl(c.license_url, own)) {
    throw new ImageError('ref_license_url', 422, 'L\'adresse de la licence est celle d\'une référence : donne celle de la licence libre elle-même.');
  }
  const licenseUrl = c.license_url ? httpsAddress(c.license_url, 'L\'adresse de la licence') : null;
  if (!c.license) throw new ImageError('bad_license', 422, 'Choisis la licence de l\'image libre : sans licence, rien n\'est publié.');
  if (!isRefLicense(c.license)) throw new ImageError('bad_license', 422, 'Cette licence n\'est pas dans la liste.');
  if (!c.author) throw new ImageError('bad_meta', 422, 'Indique l\'auteur de l\'image libre.');
  if (c.author.length > MAX_AUTHOR || CONTROL.test(c.author)) throw new ImageError('bad_meta', 422, 'L\'auteur n\'est pas valide (200 caractères au plus).');
  if (c.license === 'other' && !licenseUrl) throw new ImageError('bad_meta', 422, 'Pour une autre licence libre, donne l\'adresse du texte de la licence.');
  const note = c.license === 'other' ? `Licence libre : ${licenseUrl}`.slice(0, MAX_NOTE) : null;
  if (sameLicense(c.license, note, referenceLicense)) {
    throw new ImageError('same_license', 422, `La licence est celle de ${words} : ce n'est pas une image libre. Remplace-la par la licence propre à ton image.`);
  }
  return { source_url: source, author: c.author, license: c.license, license_note: note, license_url: licenseUrl };
}

/** What the form holds before the owner touches it: the credits of the reference, so he sees what to replace. */
export function prefillOf(row: {
  readonly reference: { readonly filePageUrl: string | null; readonly pageUrl: string | null; readonly author: string | null; readonly license: string | null } | null;
  readonly candidate: { readonly sourceUrl: string | null; readonly author: string | null; readonly license: string | null; readonly licenseUrl: string | null } | null;
}): RefCreditFields {
  if (row.candidate) {
    return { source_url: row.candidate.sourceUrl ?? '', author: row.candidate.author ?? '', license: row.candidate.license ?? '', license_url: row.candidate.licenseUrl ?? '' };
  }
  const ref = row.reference;
  if (!ref) return { source_url: '', author: '', license: '', license_url: '' };
  return { source_url: ref.filePageUrl ?? ref.pageUrl ?? '', author: ref.author ?? '', license: licenseOfText(ref.license) ?? '', license_url: '' };
}

// ---- hashes and private paths -------------------------------------------------------------------------------------------------------

/** 12 hex characters of a sha256, the length fetch-refs.mjs puts in the name of a reference file. */
export const HASH_LEN = 12;

/** The first 12 hex of the sha256 a reference path carries: anime/<series>/<character>-<12 hex>.<ext>. Null when the name has none. */
export function hashOfReferencePath(path: string | null | undefined): string | null {
  const m = /-([0-9a-f]{12})\.[a-z0-9]+$/.exec(path ?? '');
  return m ? m[1]! : null;
}

/** The base path of a candidate: anime/<series>/<character>-cand-<12 hex of the ORIGINAL file>. The three files add .webp, -2x.webp, -96.webp. */
export const candidateBase = (series: string, character: string, hash12: string): string => `${REFS_SITE}/${series}/${character}-cand-${hash12}`;

export interface CandidatePaths { readonly x1: string; readonly x2: string; readonly thumb: string }

export function candidatePaths(base: string): CandidatePaths {
  return { x1: `${base}.webp`, x2: `${base}-2x.webp`, thumb: `${base}-96.webp` };
}

/** The 12 hex of the original candidate file, read back from candidate_path. */
export function hashOfCandidatePath(path: string | null | undefined): string | null {
  const m = /-cand-([0-9a-f]{12})\.webp$/.exec(path ?? '');
  return m ? m[1]! : null;
}

/** The base path (without .webp) of a stored candidate_path. */
export const baseOfCandidatePath = (path: string): string => path.replace(/\.webp$/, '');

/** The key of a character in entity_images and in the routes: <series>/<character>. */
export const slugOf = (series: string, character: string): string => `${series}/${character}`;

// ---- the list the screen draws ------------------------------------------------------------------------------------------------------

export interface RefListRow {
  readonly series: string;
  readonly seriesName: string;
  readonly character: string;
  readonly name: string;
  readonly status: RefStatus;
  /**
   * The reference with its credits as its source gives them, or null when there is nothing to show: no row, or a row whose reference_path is
   * empty (a check pass emptied it, or the reference was deleted at publication). The screen says "Pas de référence" then.
   */
  readonly reference: {
    readonly hasFile: boolean;
    readonly pageUrl: string | null;
    readonly imageUrl: string | null;
    readonly filePageUrl: string | null;
    readonly author: string | null;
    readonly license: string | null;
    readonly foundBy: string | null;
  } | null;
  readonly candidate: {
    readonly hasFiles: boolean;
    readonly sourceUrl: string | null;
    readonly author: string | null;
    readonly license: string | null;
    readonly licenseUrl: string | null;
  } | null;
  /** The picture the site shows today (entity_images), or null. */
  readonly published: {
    readonly url: string;
    readonly license: string;
    readonly author: string | null;
    readonly sourceUrl: string | null;
    readonly verified: boolean;
  } | null;
  readonly publishedAt: string | null;
}

export interface CharacterRefsData {
  /** 'missing': L32 is not applied (the table is not there): every character is listed with an empty reference box. */
  readonly schema: 'ok' | 'missing';
  /** The number of anime characters in the database (the total of the counter, never typed). */
  readonly total: number;
  /** The number of characters whose status is published. */
  readonly published: number;
  readonly series: readonly { readonly slug: string; readonly name: string; readonly count: number }[];
  readonly rows: readonly RefListRow[];
}

export interface RefFilter { readonly series: string; readonly status: RefStatus | 'all'; readonly query: string }

const norm = (v: string): string => v.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterRefs(rows: readonly RefListRow[], f: RefFilter): RefListRow[] {
  const q = norm(f.query.trim());
  return rows.filter((r) => (f.series === 'all' || r.series === f.series) && (f.status === 'all' || r.status === f.status)
    && (!q || norm(r.name).includes(q) || norm(r.seriesName).includes(q)));
}
