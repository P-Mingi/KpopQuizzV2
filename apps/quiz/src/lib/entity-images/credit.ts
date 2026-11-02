// Owner decision of 2026-11-02 (LEDGER CR-021): what the admin stores as the credit of an image. The owner picks the licence from a short
// list of free ones and may type an author and a source page (the author is required for CC BY and CC BY-SA); for a Wikimedia Commons link
// the licence and the author are read from Commons itself (commons.ts) and win over what was typed. Server only.
import { FREE_LICENSES, MAX_AUTHOR, MAX_NOTE, MAX_SOURCE_URL, ATTRIBUTION_LICENSES } from './constants';
import { lookupCommons, wikimediaTarget } from './commons';
import { ImageError } from './errors';

import type { FreeLicense, ImageLicense } from './constants';
import type { CommonsDeps, CommonsFile } from './commons';

// eslint-disable-next-line no-control-regex -- the point is to refuse control characters
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/** The credit as it is stored in entity_images (018). */
export interface ResolvedCredit {
  readonly source_url: string | null;
  readonly author: string | null;
  readonly license: ImageLicense;
  readonly license_note: string | null;
  readonly license_url: string | null;
  /** 'File:Name.jpg' when Commons checked the file, else null. */
  readonly commons_file: string | null;
}

/** True for a licence that needs a credit on /credits (the database's needs_credit says the same). */
export const needsCredit = (license: string): boolean => (ATTRIBUTION_LICENSES as readonly string[]).includes(license);

const isFree = (v: string): v is FreeLicense => (FREE_LICENSES as readonly string[]).includes(v);

function httpsUrl(raw: string, what: string): string {
  let u: URL | null = null;
  try { u = new URL(raw); } catch { u = null; }
  if (!u || u.protocol !== 'https:' || raw.length > MAX_SOURCE_URL) {
    throw new ImageError('bad_meta', 400, `${what} must be a web address starting with https://.`);
  }
  return u.toString();
}

/**
 * The credit the owner typed, checked: the licence is one of the free ones, the author is required for CC BY and CC BY-SA, "other" needs
 * the licence's name in the note, the source page is optional and https. Pure.
 */
export function parseOwnerCredit(v: unknown): ResolvedCredit {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ImageError('bad_meta', 400, 'Choose a licence.');
  const o = v as Record<string, unknown>;
  const str = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');
  const license = str(o.license);
  if (!isFree(license)) throw new ImageError('bad_meta', 400, 'Choose a licence from the list: CC0, public domain, CC BY, CC BY-SA or another free licence.');
  const author = str(o.author);
  if (author.length > MAX_AUTHOR || CONTROL.test(author)) throw new ImageError('bad_meta', 400, 'The author is not valid (200 characters at most, no control characters).');
  if (!author && needsCredit(license)) throw new ImageError('bad_meta', 400, 'The author is required for CC BY and CC BY-SA.');
  const note = str(o.license_note);
  if (license === 'other' && !note) throw new ImageError('bad_meta', 400, 'Say which free licence it is in the note (required for "other").');
  if (note.length > MAX_NOTE || CONTROL.test(note)) throw new ImageError('bad_meta', 400, 'The licence note is not valid (500 characters at most, no control characters).');
  const source = str(o.source_url);
  return {
    source_url: source ? httpsUrl(source, 'The source page') : null,
    author: author || null,
    license,
    license_note: license === 'other' || note ? note || null : null,
    license_url: null,
    commons_file: null,
  };
}

/** Which Commons file the owner's link or source page names; a file of another Wikimedia wiki is refused (it is often not free). */
export function commonsTitleFor(link: unknown, source: unknown): string | null {
  const fromLink = wikimediaTarget(link);
  if (fromLink?.kind === 'foreign') {
    throw new ImageError('not_free', 422, 'That file is on a Wikipedia, not on Wikimedia Commons, and such files are often not free. Paste the Commons page of the file (commons.wikimedia.org/wiki/File:...).');
  }
  if (fromLink?.kind === 'commons') return fromLink.title;
  const fromSource = wikimediaTarget(source);
  return fromSource?.kind === 'commons' ? fromSource.title : null;
}

/** What a Commons file gives the form: the licence, the author and the page, to pre-fill it. */
export function creditOfCommons(file: CommonsFile, typedAuthor: string | null): ResolvedCredit {
  const author = file.author ?? typedAuthor;
  if (!author && needsCredit(file.license)) {
    throw new ImageError('bad_meta', 400, 'Commons does not name the author of this file and its licence needs one: type the author.');
  }
  return {
    source_url: file.pageUrl,
    author,
    license: file.license,
    license_note: file.license === 'other' ? (file.note ?? file.licenseLabel) : null,
    license_url: file.licenseUrl,
    commons_file: file.title,
  };
}

export interface ResolveDeps extends CommonsDeps {
  /** Tests: the lookup itself. */
  readonly lookup?: (title: string) => Promise<CommonsFile>;
}

/**
 * The credit to store. A Commons link (the pasted address of the image, or the source page) is looked up on Commons: the licence and the
 * author come from there, a file that is not free is refused, and nothing the owner typed overrides it. Any other link: the owner's
 * licence, as he declares it. `checked` says whether Commons confirmed the licence.
 */
export async function resolveCredit(raw: unknown, link: unknown, deps: ResolveDeps = {}): Promise<{ credit: ResolvedCredit; checked: boolean; file: CommonsFile | null }> {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const title = commonsTitleFor(link, o.source_url);
  if (!title) return { credit: parseOwnerCredit(raw), checked: false, file: null };
  const file = await (deps.lookup ?? ((t: string) => lookupCommons(t, deps)))(title);
  const typed = typeof o.author === 'string' && o.author.trim() ? o.author.trim().slice(0, MAX_AUTHOR) : null;
  return { credit: creditOfCommons(file, typed), checked: true, file };
}

/** The Commons file behind a pasted address, for the form's pre-fill (null when the address is not a Commons one). */
export async function commonsFileFor(link: unknown, deps: ResolveDeps = {}): Promise<CommonsFile | null> {
  const title = commonsTitleFor(link, null);
  if (!title) return null;
  return (deps.lookup ?? ((t: string) => lookupCommons(t, deps)))(title);
}

/** True when the pasted address of the image is itself a Commons file (so the download is the rendition Commons names, not the address). */
export const linkIsCommons = (link: unknown): boolean => wikimediaTarget(link)?.kind === 'commons';
