// Run O1 (ADM back): validation of what the admin image routes receive. Pure.
import { IMAGE_KINDS, LICENSES, MAX_AUTHOR, MAX_NOTE, MAX_SOURCE_URL } from './constants';
import { ImageError } from './errors';

import type { ImageKind, ImageLicense } from './constants';
import type { ImageMeta } from './types';

const SERIES_SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
const CHARACTER_SLUG = /^[a-z0-9][a-z0-9-]{0,59}\/[a-z0-9][a-z0-9-]{0,59}$/;
// eslint-disable-next-line no-control-regex -- the point is to refuse control characters
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function parseKind(v: unknown): ImageKind {
  if (typeof v === 'string' && (IMAGE_KINDS as readonly string[]).includes(v)) return v as ImageKind;
  throw new ImageError('bad_kind', 400, 'The kind must be "series" or "character".');
}

/** A series slug, or '<series slug>/<character slug>' for a character. */
export function parseSlug(kind: ImageKind, v: unknown): string {
  const ok = typeof v === 'string' && (kind === 'series' ? SERIES_SLUG.test(v) : CHARACTER_SLUG.test(v));
  if (ok) return v as string;
  throw new ImageError('bad_slug', 400, kind === 'series' ? 'The series slug is not valid.' : 'The character slug must look like "series-slug/character-slug".');
}

/** The credit typed with an image. The licence note is required for "other". The source link is stored, never fetched here. */
export function parseMeta(v: unknown): ImageMeta {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ImageError('bad_meta', 400, 'The source, author and licence are required.');
  const o = v as Record<string, unknown>;
  const str = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');
  const source = str(o.source_url);
  let parsed: URL | null = null;
  try { parsed = source ? new URL(source) : null; } catch { parsed = null; }
  if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || source.length > MAX_SOURCE_URL) {
    throw new ImageError('bad_meta', 400, 'The source must be a web address starting with https:// (the page of the picture).');
  }
  const author = str(o.author);
  if (!author) throw new ImageError('bad_meta', 400, 'The author is required.');
  if (author.length > MAX_AUTHOR || CONTROL.test(author)) throw new ImageError('bad_meta', 400, 'The author is not valid (200 characters at most, no control characters).');
  const license = str(o.license);
  if (!(LICENSES as readonly string[]).includes(license)) throw new ImageError('bad_meta', 400, 'Choose a licence.');
  const note = str(o.license_note);
  if (license === 'other' && !note) throw new ImageError('bad_meta', 400, 'Say which licence it is in the note (required for "other").');
  if (note.length > MAX_NOTE || CONTROL.test(note)) throw new ImageError('bad_meta', 400, 'The licence note is not valid (500 characters at most, no control characters).');
  return { source_url: parsed.toString(), author, license: license as ImageLicense, license_note: note || null };
}

/** A focal point: two finite numbers from 0 to 100, kept to two decimals. */
export function parseFocal(x: unknown, y: unknown): { x: number; y: number } {
  const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
  if (!ok(x) || !ok(y)) throw new ImageError('bad_focal', 400, 'The focal point must be two numbers from 0 to 100.');
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}
