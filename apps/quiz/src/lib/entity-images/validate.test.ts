import { describe, expect, it } from 'vitest';

import { ImageError } from './errors';
import { parseFocal, parseKind, parseMeta, parseSlug } from './validate';

const code = (fn: () => unknown): string => {
  try { fn(); } catch (e) { return e instanceof ImageError ? e.code : 'other'; }
  return 'none';
};
const meta = { source_url: 'https://commons.wikimedia.org/wiki/File:X.jpg', author: 'Jane Doe', license: 'cc_by_sa' };

describe('parseKind and parseSlug', () => {
  it('accepts the two kinds only', () => {
    expect(parseKind('series')).toBe('series');
    expect(parseKind('character')).toBe('character');
    for (const bad of ['', 'Series', 'group', undefined, null, 3, ['series']]) expect(code(() => parseKind(bad))).toBe('bad_kind');
  });

  it('a series slug is one lowercase token, a character slug is series/character', () => {
    expect(parseSlug('series', 'death-note')).toBe('death-note');
    expect(parseSlug('character', 'death-note/light-yagami')).toBe('death-note/light-yagami');
    for (const bad of ['Death-Note', 'a/b', '', '-x', 'x_y', '../x', 'a b', 'x'.repeat(61), undefined, 4]) expect(code(() => parseSlug('series', bad))).toBe('bad_slug');
    for (const bad of ['light', 'a/b/c', '/b', 'a/', 'a//b', '../b', 'a/../b', 'A/b', undefined]) expect(code(() => parseSlug('character', bad))).toBe('bad_slug');
  });
});

describe('parseMeta', () => {
  it('requires the source, the author and a known licence', () => {
    expect(parseMeta(meta)).toMatchObject({ author: 'Jane Doe', license: 'cc_by_sa', license_note: null });
    expect(code(() => parseMeta(undefined))).toBe('bad_meta');
    expect(code(() => parseMeta([]))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, source_url: '' }))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, author: '   ' }))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, license: 'gpl' }))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, license: undefined }))).toBe('bad_meta');
  });

  it('knows the seven licences', () => {
    for (const license of ['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'own_photo', 'licensed']) expect(parseMeta({ ...meta, license }).license).toBe(license);
    expect(parseMeta({ ...meta, license: 'other', license_note: 'Used with written permission' }).license_note).toBe('Used with written permission');
  });

  it('requires a note for "other"', () => {
    expect(code(() => parseMeta({ ...meta, license: 'other' }))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, license: 'other', license_note: '  ' }))).toBe('bad_meta');
  });

  it('the source is an https address: no http, script, file or relative link', () => {
    for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,x', 'ftp://x.test/a', '/relative', 'unsplash.com/x']) expect(code(() => parseMeta({ ...meta, source_url: bad }))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, source_url: 'http://example.org/page' }))).toBe('bad_meta');
    expect(parseMeta({ ...meta, source_url: 'https://example.org/page' }).source_url).toBe('https://example.org/page');
  });

  it('caps the lengths and refuses control characters', () => {
    expect(code(() => parseMeta({ ...meta, author: 'x'.repeat(201) }))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, author: 'a\u0000b' }))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, license_note: 'n'.repeat(501) }))).toBe('bad_meta');
    expect(code(() => parseMeta({ ...meta, source_url: `https://x.test/${'a'.repeat(2000)}` }))).toBe('bad_meta');
  });
});

describe('parseFocal', () => {
  it('keeps two numbers from 0 to 100 to two decimals', () => {
    expect(parseFocal(0, 100)).toEqual({ x: 0, y: 100 });
    expect(parseFocal(33.3333, 66.666)).toEqual({ x: 33.33, y: 66.67 });
  });
  it('refuses anything else', () => {
    for (const [x, y] of [[-1, 50], [50, 101], [NaN, 5], [Infinity, 5], ['50', 50], [null, 1], [undefined, undefined]] as const) expect(code(() => parseFocal(x, y))).toBe('bad_focal');
  });
});
