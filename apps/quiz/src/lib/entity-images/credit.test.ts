// CR-021: the credit the admin stores. The Commons lookup is a stand-in; no network.
import { describe, expect, it, vi } from 'vitest';

import { commonsFileFor, commonsTitleFor, linkIsCommons, needsCredit, parseOwnerCredit, resolveCredit } from './credit';
import { ImageError } from './errors';

import type { CommonsFile } from './commons';

const FILE: CommonsFile = {
  title: 'File:Jane Doe 2020.jpg', pageUrl: 'https://commons.wikimedia.org/wiki/File:Jane_Doe_2020.jpg',
  imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Jane_Doe_2020.jpg', license: 'cc_by_sa', licenseLabel: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', author: 'Jane', note: null,
};

const say = async (p: Promise<unknown> | (() => unknown)): Promise<string> => {
  try { await (typeof p === 'function' ? p() : p); } catch (e) { return e instanceof ImageError ? `${e.code}:${e.status}` : 'other'; }
  return 'none';
};

describe('parseOwnerCredit', () => {
  it('takes the five free licences, with the author and the source page optional', async () => {
    for (const license of ['cc0', 'public_domain']) {
      expect(parseOwnerCredit({ license }), license).toEqual({ source_url: null, author: null, license, license_note: null, license_url: null, commons_file: null });
    }
    expect(parseOwnerCredit({ license: 'cc_by', author: ' Jane ', source_url: 'https://example.org/a' })).toMatchObject({ author: 'Jane', source_url: 'https://example.org/a', license: 'cc_by' });
    expect(parseOwnerCredit({ license: 'other', license_note: 'GFDL' })).toMatchObject({ license: 'other', license_note: 'GFDL' });
  });

  it('requires an author for CC BY and CC BY-SA, a note for other, and refuses every licence outside the list', async () => {
    expect(await say(() => parseOwnerCredit({ license: 'cc_by' }))).toBe('bad_meta:400');
    expect(await say(() => parseOwnerCredit({ license: 'cc_by_sa', author: '  ' }))).toBe('bad_meta:400');
    expect(await say(() => parseOwnerCredit({ license: 'other' }))).toBe('bad_meta:400');
    for (const license of ['own_photo', 'licensed', 'all_rights', '', undefined]) {
      expect(await say(() => parseOwnerCredit({ license, author: 'A' })), String(license)).toBe('bad_meta:400');
    }
    expect(await say(() => parseOwnerCredit(null))).toBe('bad_meta:400');
  });

  it('refuses a source page that is not https, a long author and control characters', async () => {
    expect(await say(() => parseOwnerCredit({ license: 'cc0', source_url: 'http://example.org' }))).toBe('bad_meta:400');
    expect(await say(() => parseOwnerCredit({ license: 'cc0', source_url: 'javascript:alert(1)' }))).toBe('bad_meta:400');
    expect(await say(() => parseOwnerCredit({ license: 'cc0', author: 'a'.repeat(201) }))).toBe('bad_meta:400');
    expect(await say(() => parseOwnerCredit({ license: 'cc0', author: 'a\u0000b' }))).toBe('bad_meta:400');
  });

  it('needsCredit is CC BY and CC BY-SA only', async () => {
    expect(['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'other', 'own_photo'].map(needsCredit)).toEqual([false, false, true, true, false, false]);
  });
});

describe('commonsTitleFor', () => {
  it('reads the pasted link first, then the source page', async () => {
    expect(commonsTitleFor('https://commons.wikimedia.org/wiki/File:A.jpg', 'https://commons.wikimedia.org/wiki/File:B.jpg')).toBe('File:A.jpg');
    expect(commonsTitleFor(null, 'https://commons.wikimedia.org/wiki/File:B.jpg')).toBe('File:B.jpg');
    expect(commonsTitleFor('https://example.org/a.jpg', 'https://example.org/page')).toBeNull();
    expect(commonsTitleFor('https://upload.wikimedia.org/wikipedia/commons/a/ab/C.png', null)).toBe('File:C.png');
  });

  it('refuses a file of another Wikimedia wiki', async () => {
    expect(await say(() => commonsTitleFor('https://upload.wikimedia.org/wikipedia/en/a/ab/Poster.jpg', null))).toBe('not_free:422');
    expect(linkIsCommons('https://upload.wikimedia.org/wikipedia/commons/a/ab/C.png')).toBe(true);
    expect(linkIsCommons('https://example.org/C.png')).toBe(false);
  });
});

describe('resolveCredit', () => {
  it('stores the owner\'s licence as he declares it for a link that is not Commons, and never calls Commons', async () => {
    const lookup = vi.fn();
    const r = await resolveCredit({ license: 'cc_by', author: 'Mina', source_url: 'https://example.org/p' }, 'https://example.org/a.jpg', { lookup });
    expect(r).toEqual({ credit: { source_url: 'https://example.org/p', author: 'Mina', license: 'cc_by', license_note: null, license_url: null, commons_file: null }, checked: false, file: null });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('takes the licence, the author and the page from Commons, over what was typed', async () => {
    const lookup = vi.fn(async () => FILE);
    const r = await resolveCredit({ license: 'cc0', author: 'Someone else', source_url: 'https://example.org/p' }, 'https://commons.wikimedia.org/wiki/File:Jane_Doe_2020.jpg', { lookup });
    expect(lookup).toHaveBeenCalledWith('File:Jane Doe 2020.jpg');
    expect(r.checked).toBe(true);
    expect(r.credit).toEqual({
      source_url: FILE.pageUrl, author: 'Jane', license: 'cc_by_sa', license_note: null, license_url: 'https://creativecommons.org/licenses/by-sa/4.0', commons_file: 'File:Jane Doe 2020.jpg',
    });
  });

  it('reads a Commons source page when the file was uploaded from a computer (no link)', async () => {
    const lookup = vi.fn(async () => FILE);
    const r = await resolveCredit({ license: 'cc0', source_url: 'https://commons.wikimedia.org/wiki/File:Jane_Doe_2020.jpg' }, null, { lookup });
    expect(r.checked).toBe(true);
    expect(r.credit.license).toBe('cc_by_sa');
  });

  it('refuses a file that is not free and stores nothing', async () => {
    const lookup = vi.fn(async () => { throw new ImageError('not_free', 422, 'Commons marks this file as non-free.'); });
    expect(await say(resolveCredit({ license: 'cc0' }, 'https://commons.wikimedia.org/wiki/File:Poster.jpg', { lookup }))).toBe('not_free:422');
  });

  it('uses the typed author when Commons names none, and needs one for CC BY', async () => {
    const noArtist = vi.fn(async () => ({ ...FILE, author: null }));
    const typed = await resolveCredit({ license: 'cc0', author: 'Mina' }, 'https://commons.wikimedia.org/wiki/File:A.jpg', { lookup: noArtist });
    expect(typed.credit.author).toBe('Mina');
    expect(await say(resolveCredit({ license: 'cc0' }, 'https://commons.wikimedia.org/wiki/File:A.jpg', { lookup: noArtist }))).toBe('bad_meta:400');
    const pd = vi.fn(async () => ({ ...FILE, license: 'public_domain' as const, author: null, licenseUrl: null }));
    expect((await resolveCredit({ license: 'cc0' }, 'https://commons.wikimedia.org/wiki/File:A.jpg', { lookup: pd })).credit).toMatchObject({ license: 'public_domain', author: null });
  });

  it('writes the licence name as the note for an other free licence', async () => {
    const gfdl = vi.fn(async () => ({ ...FILE, license: 'other' as const, licenseLabel: 'GFDL', note: 'GFDL' }));
    expect((await resolveCredit({ license: 'cc0' }, 'https://commons.wikimedia.org/wiki/File:A.jpg', { lookup: gfdl })).credit).toMatchObject({ license: 'other', license_note: 'GFDL' });
  });
});

describe('commonsFileFor', () => {
  it('is null for an address that is not a Commons file, and the file otherwise', async () => {
    const lookup = vi.fn(async () => FILE);
    expect(await commonsFileFor('https://example.org/a.jpg', { lookup })).toBeNull();
    expect(await commonsFileFor('https://commons.wikimedia.org/wiki/File:A.jpg', { lookup })).toBe(FILE);
  });
});
