import { describe, expect, it } from 'vitest';

import {
  CENTER_FOCAL, EMPTY_META, LICENSE_CODES, LICENSE_LABEL, MAX_UPLOAD_BYTES, characterImageSlug, checkImport, checkUpload, countImages, countsLine, creditOf, entityImageUrl, errorWords,
  fileProblem, filterSeries, focalFromPoint, metaPayload, nudgeFocal, objectPositionOf, ownerCreditRows, ownerPictureOf, pickImage, requiresCredit, validateMeta, withImage,
} from './entity-images-rules';

import type { AdminSeries, EntityImage, ImageMeta } from './entity-images-rules';

// Run O1 (ADM front): the rules of the admin images and of their display.

const BASE = 'https://proj.supabase.co';
const img = (over: Partial<EntityImage> = {}): EntityImage => ({
  kind: 'series', slug: 'death-note', path: 'series/death-note.webp', width: 736, height: 981, focal_x: 40, focal_y: 25,
  source_url: 'https://commons.wikimedia.org/wiki/File:X.jpg', author: 'A. Author', license: 'cc_by', license_note: null, updated_at: '2026-10-26T10:00:00.000Z', ...over,
});
const META: ImageMeta = { source_url: 'https://example.org/x', author: 'Ana', license: 'cc0', license_note: '' };

describe('the form: source, author and licence are required', () => {
  it('accepts a complete form', () => {
    expect(validateMeta(META)).toEqual({});
  });
  it('asks for each missing field in plain words', () => {
    const e = validateMeta(EMPTY_META);
    expect(Object.keys(e).sort()).toEqual(['author', 'license', 'source_url']);
    expect(e.source_url).toMatch(/where the image comes from/i);
    expect(e.author).toMatch(/who made/i);
    expect(e.license).toMatch(/choose the licence/i);
  });
  it('refuses a source that is not an https address', () => {
    expect(validateMeta({ ...META, source_url: 'http://example.org/x' }).source_url).toMatch(/https/);
    expect(validateMeta({ ...META, source_url: 'example.org' }).source_url).toMatch(/https/);
    expect(validateMeta({ ...META, source_url: 'https://localhost' }).source_url).toMatch(/https/);
    expect(validateMeta({ ...META, source_url: ' ' }).source_url).toMatch(/where/);
  });
  it('refuses a licence that is not in the list', () => {
    expect(validateMeta({ ...META, license: 'gpl' as never }).license).toMatch(/list/);
  });
  it('wants a note for "other" and only then', () => {
    expect(validateMeta({ ...META, license: 'other' }).license_note).toMatch(/explain/i);
    expect(validateMeta({ ...META, license: 'other', license_note: 'Permission by email' })).toEqual({});
    expect(validateMeta({ ...META, license: 'cc_by', license_note: '' })).toEqual({});
    expect(validateMeta({ ...META, license_note: 'x'.repeat(301) }).license_note).toMatch(/too long/);
  });
  it('offers the seven licences of the owner, in order', () => {
    expect(LICENSE_CODES.map((c) => LICENSE_LABEL[c])).toEqual(['CC0', 'Public domain', 'CC BY', 'CC BY-SA', 'My photo', 'Licensed by the rights holder', 'Other']);
  });
  it('sends the trimmed form', () => {
    expect(metaPayload({ source_url: ' https://a.org/x ', author: ' Ana ', license: 'other', license_note: ' ok ' })).toEqual({ source_url: 'https://a.org/x', author: 'Ana', license: 'other', license_note: 'ok' });
  });
});

describe('what stops a Save or an Import', () => {
  const f = { name: 'a.png', size: 1000, type: 'image/png' };
  it('Save: needs a file, a usable file and a complete form', () => {
    expect(checkUpload(null, META)).toMatchObject({ ok: false, problem: 'Choose a file first.' });
    expect(checkUpload(f, META)).toEqual({ ok: true });
    const bad = checkUpload(f, EMPTY_META);
    expect(bad.ok).toBe(false);
    expect(bad.ok === false && Object.keys(bad.errors).length).toBe(3);
    expect(checkUpload({ ...f, size: MAX_UPLOAD_BYTES + 1 }, META)).toMatchObject({ ok: false, problem: expect.stringMatching(/limit is 8 MB/) });
  });
  it('Import: needs an https address and a complete form', () => {
    expect(checkImport('', META)).toMatchObject({ ok: false, urlError: expect.stringMatching(/Paste/) });
    expect(checkImport('http://a.org/x.png', META)).toMatchObject({ ok: false, urlError: expect.stringMatching(/https/) });
    expect(checkImport('  https://a.org/x.png ', META)).toEqual({ ok: true, url: 'https://a.org/x.png' });
    expect(checkImport('https://a.org/x.png', EMPTY_META).ok).toBe(false);
  });
  it('checks the file before it is sent', () => {
    expect(fileProblem({ name: 'a', size: 0, type: 'image/png' })).toMatch(/empty/);
    expect(fileProblem({ name: 'a', size: 9 * 1024 * 1024, type: 'image/png' })).toMatch(/9\.0 MB.*8 MB/);
    expect(fileProblem({ name: 'a.pdf', size: 10, type: 'application/pdf' })).toMatch(/not a picture/);
    expect(fileProblem({ name: 'a', size: 10, type: 'image/svg+xml' })).toMatch(/not a picture/);
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) expect(fileProblem({ name: 'a', size: 10, type: t })).toBeNull();
  });
  it('says a server failure in plain words', () => {
    expect(errorWords('too_large')).toMatch(/8 MB/);
    expect(errorWords('url_blocked')).toMatch(/public https/);
    expect(errorWords('The image could not be decoded')).toBe('The image could not be decoded.');
    expect(errorWords(undefined, 413)).toMatch(/too big/);
    expect(errorWords(undefined, 403)).toMatch(/not allowed/);
    expect(errorWords(undefined, 500)).toMatch(/server had a problem/);
    expect(errorWords('zzz')).toBe('Something went wrong. Try again.');
  });
});

describe('the focal point', () => {
  const box = { left: 100, top: 50, width: 200, height: 400 };
  it('is the place of the click inside the picture, in whole percent', () => {
    expect(focalFromPoint(box, 200, 250)).toEqual({ x: 50, y: 50 });
    expect(focalFromPoint(box, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(focalFromPoint(box, 300, 450)).toEqual({ x: 100, y: 100 });
    expect(focalFromPoint(box, 130, 150)).toEqual({ x: 15, y: 25 });
  });
  it('stays inside 0 to 100 and survives an empty box', () => {
    expect(focalFromPoint(box, -50, 9999)).toEqual({ x: 0, y: 100 });
    expect(focalFromPoint({ left: 0, top: 0, width: 0, height: 0 }, 5, 5)).toEqual(CENTER_FOCAL);
  });
  it('moves with the arrow keys and stops at the edges', () => {
    expect(nudgeFocal({ x: 50, y: 50 }, 'ArrowLeft')).toEqual({ x: 48, y: 50 });
    expect(nudgeFocal({ x: 50, y: 50 }, 'ArrowDown', 10)).toEqual({ x: 50, y: 60 });
    expect(nudgeFocal({ x: 1, y: 99 }, 'ArrowUp', 10)).toEqual({ x: 1, y: 89 });
    expect(nudgeFocal({ x: 99, y: 0 }, 'ArrowRight', 10)).toEqual({ x: 100, y: 0 });
    expect(nudgeFocal({ x: 5, y: 5 }, 'a')).toEqual({ x: 5, y: 5 });
  });
  it('becomes the object-position of the picture', () => {
    expect(objectPositionOf({ focal_x: 40, focal_y: 25 })).toBe('40% 25%');
    expect(objectPositionOf({ x: 7.6, y: 120 })).toBe('8% 100%');
  });
});

describe('where the file is', () => {
  it('is the public bucket, with the version of the row so a replaced picture is fetched again', () => {
    const u = entityImageUrl('series/death-note.webp', '2026-10-26T10:00:00.000Z', BASE);
    expect(u).toBe(`${BASE}/storage/v1/object/public/entity-images/series/death-note.webp?v=${Date.parse('2026-10-26T10:00:00.000Z')}`);
    expect(entityImageUrl('a/b c.webp', null, `${BASE}/`)).toBe(`${BASE}/storage/v1/object/public/entity-images/a/b%20c.webp`);
    expect(entityImageUrl('https://cdn.example/x.webp', null, BASE)).toBe('https://cdn.example/x.webp');
  });
  it('keys a character by its series first', () => {
    expect(characterImageSlug('death-note', 'light-yagami')).toBe('death-note/light-yagami');
  });
});

describe('the order of display: the owner, then the bundled photo, then the placeholder', () => {
  const bundled = { file: '/series/death-note.webp', alt: 'A notebook' };
  it('shows the owner image first', () => {
    const p = pickImage(img(), bundled);
    expect(p.source).toBe('owner');
    expect(p.source === 'owner' && p.owner.position).toBe('40% 25%');
  });
  it('falls back to the bundled photo, then to the placeholder', () => {
    expect(pickImage(null, bundled)).toEqual({ source: 'bundled', bundled });
    expect(pickImage(undefined, null)).toEqual({ source: 'placeholder' });
    expect(pickImage(null, undefined)).toEqual({ source: 'placeholder' });
  });
  it('treats a character like a series without a bundled photo', () => {
    expect(pickImage(img({ kind: 'character', slug: 'death-note/light' }), null).source).toBe('owner');
    expect(pickImage(null, null).source).toBe('placeholder');
  });
});

describe('the attribution rule', () => {
  it('asks for a credit line under CC BY and CC BY-SA only', () => {
    for (const c of LICENSE_CODES) expect(requiresCredit(c)).toBe(c === 'cc_by' || c === 'cc_by_sa');
  });
  it('builds the credit of an image that needs one', () => {
    expect(creditOf(img())).toEqual({ author: 'A. Author', license: 'CC BY', licenseUrl: expect.stringMatching(/^https:\/\/creativecommons\.org\//), sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg' });
    expect(creditOf(img({ license: 'cc_by_sa' }))?.license).toBe('CC BY-SA');
  });
  it('gives none for the other licences', () => {
    for (const l of ['cc0', 'public_domain', 'own_photo', 'licensed', 'other'] as const) expect(creditOf(img({ license: l }))).toBeNull();
    expect(ownerPictureOf(img({ license: 'cc0' }), BASE).credit).toBeNull();
    expect(ownerPictureOf(img(), BASE).credit?.author).toBe('A. Author');
  });
});

describe('the list: search, filter, counter', () => {
  const series = (slug: string, name: string, cover: boolean, chars: Array<[string, string, boolean]>): AdminSeries => ({
    slug, name, image: cover ? img({ slug }) : null, bundled: null,
    characters: chars.map(([s, n, has]) => ({ slug: s, name: n, image: has ? img({ kind: 'character', slug: characterImageSlug(slug, s) }) : null })),
  });
  const LIST: AdminSeries[] = [
    series('death-note', 'Death Note', true, [['light', 'Light Yagami', true], ['l', 'L', false]]),
    series('naruto', 'Naruto', false, [['naruto', 'Naruto Uzumaki', true]]),
    series('bleach', 'Bleach', true, []),
    series('one-piece', 'One Piece', false, [['luffy', 'Monkey D. Luffy', false]]),
  ];
  it('counts covers and portraits', () => {
    const c = countImages(LIST);
    expect(c).toEqual({ seriesWith: 2, seriesTotal: 4, charactersWith: 2, charactersTotal: 4 });
    expect(countsLine(c)).toBe('2/4 series, 2/4 characters');
    expect(countsLine({ seriesWith: 34, seriesTotal: 50, charactersWith: 120, charactersTotal: 412 })).toBe('34/50 series, 120/412 characters');
  });
  it('filters by the cover', () => {
    expect(filterSeries(LIST, '', 'with').map((s) => s.slug)).toEqual(['death-note', 'bleach']);
    expect(filterSeries(LIST, '', 'without').map((s) => s.slug)).toEqual(['naruto', 'one-piece']);
    expect(filterSeries(LIST, '', 'all')).toHaveLength(4);
  });
  it('searches the series name, its slug and the names of its characters, without case or accents', () => {
    expect(filterSeries(LIST, 'DEATH', 'all').map((s) => s.slug)).toEqual(['death-note']);
    expect(filterSeries(LIST, 'one-piece', 'all')).toHaveLength(1);
    expect(filterSeries(LIST, 'luffy', 'all').map((s) => s.slug)).toEqual(['one-piece']);
    expect(filterSeries(LIST, 'Uzumakí', 'all').map((s) => s.slug)).toEqual(['naruto']);
    expect(filterSeries(LIST, 'zzz', 'all')).toEqual([]);
  });
  it('combines the search and the filter', () => {
    expect(filterSeries(LIST, 'o', 'without').map((s) => s.slug)).toEqual(['naruto', 'one-piece']);
    expect(filterSeries(LIST, 'death', 'without')).toEqual([]);
  });
  it('sets and removes one image without touching the list it was given', () => {
    const before = JSON.stringify(LIST);
    const added = withImage(LIST, 'series', 'naruto', img({ slug: 'naruto' }));
    expect(countImages(added).seriesWith).toBe(3);
    const noChar = withImage(LIST, 'character', 'death-note/light', null);
    expect(countImages(noChar).charactersWith).toBe(1);
    const withChar = withImage(LIST, 'character', 'one-piece/luffy', img({ kind: 'character', slug: 'one-piece/luffy' }));
    expect(countImages(withChar).charactersWith).toBe(3);
    expect(JSON.stringify(LIST)).toBe(before);
  });
});

describe('/credits: every image of the owner', () => {
  const names = { series: { 'death-note': 'Death Note' }, character: { 'death-note/light': 'Light Yagami' } };
  const rows = ownerCreditRows([
    img({ slug: 'death-note' }),
    img({ kind: 'character', slug: 'death-note/light', license: 'cc0', author: 'Bo' }),
    img({ kind: 'character', slug: 'death-note/ryuk', license: 'other', license_note: 'By email' }),
    img({ slug: 'bleach', license: 'own_photo' }),
  ], names, BASE);
  it('lists the series and the characters, sorted by name, with source, author and licence', () => {
    expect(rows.map((r) => r.name)).toEqual(['A character of Death Note', 'Bleach', 'Death Note', 'Light Yagami (Death Note)']);
    const dn = rows.find((r) => r.name === 'Death Note')!;
    expect(dn).toMatchObject({ author: 'A. Author', license: 'CC BY', sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg', credited: true, href: '/death-note-quiz', kind: 'series' });
    expect(rows.find((r) => r.name === 'Light Yagami (Death Note)')).toMatchObject({ license: 'CC0', credited: false, licenseUrl: expect.stringMatching(/zero/) });
  });
  it('turns a slug without a name into words, and never names a locked character', () => {
    const locked = rows.find((r) => r.name === 'A character of Death Note')!;
    expect(locked).toMatchObject({ locked: true, src: '', license: 'Other', note: 'By email' });
    expect(JSON.stringify(locked)).not.toMatch(/ryuk/i);
    expect(rows.find((r) => r.name === 'Bleach')).toMatchObject({ license: 'My photo', licenseUrl: null });
  });
  it('prints no dash and no emoji', () => {
    expect(JSON.stringify(rows)).not.toMatch(/[\u2013\u2014]|\p{Extended_Pictographic}/u);
  });
});
