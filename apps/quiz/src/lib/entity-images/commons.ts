// Owner decision of 2026-11-02 (LEDGER CR-021): for a Wikimedia Commons link the admin reads the licence and the author itself, server side,
// through the Commons API, and refuses any file that is not free. Server only, called from the admin routes at save time (and by the
// "paste a link" step of the Photos tab). One GET, 5 seconds, a User-Agent that names the project. Pure parsing apart from `lookupCommons`.
import { ImageError } from './errors';

import type { FreeLicense } from './constants';

export const COMMONS_TIMEOUT_MS = 5_000;
export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
/** Wikimedia asks for a User-Agent that names the project and says how to reach it. */
export const COMMONS_USER_AGENT = 'KpopQuizBunnyverseAdmin/1.0 (https://bunnyverse.org; admin image licence check; contact via the site)';

/** What a pasted address is: a file of Commons (its title), a file of another Wikimedia wiki (refused: often not free), or something else. */
export type WikimediaTarget = { readonly kind: 'commons'; readonly title: string } | { readonly kind: 'foreign' };

const COMMONS_HOSTS = new Set(['commons.wikimedia.org', 'commons.m.wikimedia.org']);
const MAX_TITLE = 300;

const clean = (name: string): string => name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

function decode(v: string): string | null {
  try { return decodeURIComponent(v); } catch { return null; }
}

function fileTitle(name: string | null): string | null {
  if (!name) return null;
  const n = clean(name.replace(/^File:/i, '').replace(/^Image:/i, ''));
  if (!n || n.length > MAX_TITLE - 5 || /[\u0000-\u001f\u007f|<>[\]{}#]/.test(n)) return null;
  return `File:${n}`;
}

/**
 * Reads a pasted address. A Commons file page (commons.wikimedia.org/wiki/File:..., index.php?title=File:..., Special:FilePath/...) or a
 * file address (upload.wikimedia.org/wikipedia/commons/..., thumbnails included) gives the title of the file. A file of another Wikimedia
 * wiki (upload.wikimedia.org/wikipedia/en/..., en.wikipedia.org/wiki/File:...) is 'foreign'. Anything else is null.
 */
export function wikimediaTarget(raw: unknown): WikimediaTarget | null {
  if (typeof raw !== 'string') return null;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.toLowerCase();
  if (COMMONS_HOSTS.has(host)) {
    const path = u.pathname;
    if (path.startsWith('/wiki/')) {
      const rest = decode(path.slice('/wiki/'.length));
      if (rest === null) return null;
      const special = /^Special:(?:FilePath|Redirect\/file)\/(.+)$/i.exec(rest);
      const title = fileTitle(special ? special[1]! : /^(?:File|Image):/i.test(rest) ? rest : null);
      return title ? { kind: 'commons', title } : null;
    }
    if (path === '/w/index.php') {
      const t = u.searchParams.get('title');
      const title = fileTitle(t && /^(?:File|Image):/i.test(t) ? t : null);
      return title ? { kind: 'commons', title } : null;
    }
    return null;
  }
  if (host === 'upload.wikimedia.org') {
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'wikipedia' || parts.length < 4) return null;
    if (parts[1] !== 'commons') return { kind: 'foreign' };
    // /wikipedia/commons/a/ab/Name.jpg  or  /wikipedia/commons/thumb/a/ab/Name.jpg/800px-Name.jpg
    const body = parts.slice(2);
    const rest = body[0] === 'thumb' ? body.slice(1, 4) : body.slice(0, 3);
    if (rest.length < 3) return null;
    const title = fileTitle(decode(rest[2]!));
    return title ? { kind: 'commons', title } : null;
  }
  if (host.endsWith('.wikipedia.org') || host.endsWith('.wikimedia.org') || host.endsWith('.wikibooks.org') || host.endsWith('.wikiversity.org')) return { kind: 'foreign' };
  return null;
}

// ---- the licence --------------------------------------------------------------------------------------------------------------------

export type CommonsVerdict =
  | { readonly free: true; readonly license: FreeLicense; readonly label: string; readonly note: string | null }
  | { readonly free: false; readonly reason: string };

/** One value of the extmetadata block ({ value }), as a plain string. */
function meta(block: unknown, key: string): string {
  if (!block || typeof block !== 'object') return '';
  const entry = (block as Record<string, unknown>)[key];
  if (!entry || typeof entry !== 'object') return '';
  const v = (entry as Record<string, unknown>).value;
  return typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
}

const slug = (v: string): string => v.toLowerCase().trim().replace(/[\s_]+/g, '-');

/** Other free licences Commons hosts and we accept as "Other free licence" (the short name goes in the note). */
const OTHER_FREE = /^(?:gfdl|ogl|ogdl|fal|free-art|gpl|lgpl|cc-sa|attribution|dl-de|bsd|mit|apache|copyrighted-free-use|license-by|licence-by)(?:\b|-|$)/;

/**
 * Reads the licence of a file from its extmetadata (License, LicenseShortName, UsageTerms, NonFree). Fail closed: a file is free only when
 * Commons says so and the licence is CC0, public domain, CC BY, CC BY-SA or one of the recognised free licences (GFDL, OGL, ...).
 * NonFree, fair use, NonCommercial, NoDerivatives and anything unrecognised are refused.
 */
export function commonsVerdict(extmetadata: unknown): CommonsVerdict {
  const nonFree = slug(meta(extmetadata, 'NonFree'));
  if (nonFree === 'true' || nonFree === '1' || nonFree === 'yes') return { free: false, reason: 'Commons marks this file as non-free.' };
  const code = slug(meta(extmetadata, 'License'));
  const short = meta(extmetadata, 'LicenseShortName').replace(/\s+/g, ' ').trim();
  const shortSlug = slug(short);
  const terms = meta(extmetadata, 'UsageTerms');
  if (/fair[\s-]*use/i.test(`${code} ${short} ${terms}`)) return { free: false, reason: 'Fair use files are not accepted.' };
  if (!code && !short) return { free: false, reason: 'The licence of this file could not be read on Commons.' };
  const both = [code, shortSlug].filter(Boolean);
  const label = short || code;
  // NonCommercial and NoDerivatives licences are not free licences.
  if (both.some((c) => /^cc-.*-n[cd](?:-|$)/.test(c) || /^cc-n[cd](?:-|$)/.test(c))) {
    return { free: false, reason: `${label} is not a free licence (NonCommercial or NoDerivatives).` };
  }
  if (both.some((c) => /^cc0|^cc-zero|^cc-0/.test(c))) return { free: true, license: 'cc0', label, note: null };
  if (both.some((c) => /^cc-by-sa(?:-|$)/.test(c) || c === 'cc-by-sa')) return { free: true, license: 'cc_by_sa', label, note: null };
  if (both.some((c) => /^cc-by(?:-|$)/.test(c) || c === 'cc-by')) return { free: true, license: 'cc_by', label, note: null };
  if (code.startsWith('pd') || code.startsWith('cc-pd') || /^public-domain/.test(shortSlug)) return { free: true, license: 'public_domain', label, note: null };
  if (both.some((c) => OTHER_FREE.test(c))) return { free: true, license: 'other', label, note: label.slice(0, 500) };
  return { free: false, reason: `The licence "${label.slice(0, 80)}" is not one we accept.` };
}

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' };

/** The text of an HTML snippet (Commons gives the artist as a link): tags dropped, entities decoded, spaces collapsed. */
export function stripHtml(html: string): string {
  return html
    .replace(/<(?:br|\/p|\/div|\/li)\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    // eslint-disable-next-line no-control-regex -- the point is to drop control characters
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---- the lookup ---------------------------------------------------------------------------------------------------------------------

/** What the admin keeps of a Commons file. */
export interface CommonsFile {
  /** 'File:Name.jpg' (spaces, not underscores). */
  readonly title: string;
  /** The page of the file on Commons: stored as the source page. */
  readonly pageUrl: string;
  /** The address of the picture itself (a 2000 px rendition when the original is larger), on upload.wikimedia.org. */
  readonly imageUrl: string;
  readonly license: FreeLicense;
  /** LicenseShortName as Commons writes it ("CC BY-SA 4.0"). */
  readonly licenseLabel: string;
  readonly licenseUrl: string | null;
  /** The artist, as plain text (at most 200 characters); null when Commons gives none. */
  readonly author: string | null;
  /** For "other": the licence's name, to print as the note. */
  readonly note: string | null;
}

export interface CommonsDeps { readonly fetch?: typeof fetch; readonly timeoutMs?: number }

const httpsOrNull = (v: unknown, hostSuffix?: string): string | null => {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v.startsWith('//') ? `https:${v}` : v);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    if (hostSuffix && !(u.hostname === hostSuffix || u.hostname.endsWith(`.${hostSuffix}`))) return null;
    return u.toString().length <= 2000 ? u.toString() : null;
  } catch { return null; }
};

export function commonsApiUrl(title: string): string {
  const q = new URLSearchParams({
    action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '2000', titles: title, format: 'json', redirects: '1',
  });
  return `${COMMONS_API}?${q.toString()}`;
}

/** The first page of the answer, whatever the shape (format version 1 keys the pages by id, version 2 lists them). */
function firstPage(body: unknown): Record<string, unknown> | null {
  const pages = (body as { query?: { pages?: unknown } } | null)?.query?.pages;
  if (Array.isArray(pages)) return (pages[0] as Record<string, unknown>) ?? null;
  if (pages && typeof pages === 'object') return (Object.values(pages as Record<string, unknown>)[0] as Record<string, unknown>) ?? null;
  return null;
}

const FAILED = (): ImageError => new ImageError('commons_failed', 502, 'Wikimedia Commons did not answer. Try again in a moment, or choose the licence yourself with another link.');

/**
 * Asks Commons about one file and returns its licence and author, or throws an ImageError: commons_missing (404, no such file), not_free
 * (422, the file is not free: the reason is in the words), commons_failed (502, no answer within 5 s or an unreadable one).
 */
export async function lookupCommons(title: string, deps: CommonsDeps = {}): Promise<CommonsFile> {
  const doFetch = deps.fetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? COMMONS_TIMEOUT_MS);
  let body: unknown;
  try {
    const res = await doFetch(commonsApiUrl(title), {
      method: 'GET',
      headers: { 'User-Agent': COMMONS_USER_AGENT, 'Api-User-Agent': COMMONS_USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
      cache: 'no-store',
    });
    if (!res.ok) throw FAILED();
    const text = await res.text();
    if (text.length > 2_000_000) throw FAILED();
    body = JSON.parse(text);
  } catch (e) {
    if (e instanceof ImageError) throw e;
    throw FAILED();
  } finally {
    clearTimeout(timer);
  }
  const page = firstPage(body);
  const info = (page && Array.isArray(page.imageinfo) ? (page.imageinfo[0] as Record<string, unknown> | undefined) : undefined) ?? null;
  if (!page || 'missing' in page || 'invalid' in page || !info) {
    throw new ImageError('commons_missing', 404, 'That file does not exist on Wikimedia Commons. Check the address.');
  }
  const ext = info.extmetadata;
  const verdict = commonsVerdict(ext);
  if (!verdict.free) throw new ImageError('not_free', 422, `${verdict.reason} Choose a file under a free licence.`);
  const realTitle = typeof page.title === 'string' && /^File:/.test(page.title) ? clean(page.title).replace(/^File: ?/, 'File:') : title;
  const pageUrl = httpsOrNull(info.descriptionurl, 'wikimedia.org') ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(realTitle.replace(/ /g, '_')).replace(/%3A/g, ':')}`;
  const imageUrl = httpsOrNull(info.thumburl, 'wikimedia.org') ?? httpsOrNull(info.url, 'wikimedia.org');
  if (!imageUrl) throw FAILED();
  const artist = stripHtml(meta(ext, 'Artist')).slice(0, 200).trim();
  return {
    title: realTitle,
    pageUrl,
    imageUrl,
    license: verdict.license,
    licenseLabel: verdict.label.slice(0, 120),
    licenseUrl: httpsOrNull(meta(ext, 'LicenseUrl')),
    author: artist || null,
    note: verdict.note,
  };
}
