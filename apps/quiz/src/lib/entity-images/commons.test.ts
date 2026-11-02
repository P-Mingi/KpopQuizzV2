// CR-021: the Commons lookup. Every fetch is mocked; no network.
import { describe, expect, it, vi } from 'vitest';

import { COMMONS_USER_AGENT, commonsApiUrl, commonsVerdict, lookupCommons, stripHtml, wikimediaTarget } from './commons';
import { ImageError } from './errors';

const block = (rec: Record<string, string>): Record<string, { value: string }> => Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, { value: v }]));

function answer(info: Record<string, unknown> | null, page: Record<string, unknown> = {}): Response {
  const body = info
    ? { query: { pages: { '123': { pageid: 123, title: 'File:Jane Doe 2020.jpg', imageinfo: [info], ...page } } } }
    : { query: { pages: { '-1': { title: 'File:Nope.jpg', missing: '', ...page } } } };
  return new Response(JSON.stringify(body), { status: 200 });
}

const FILE = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Jane_Doe_2020.jpg',
  thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Jane_Doe_2020.jpg/2000px-Jane_Doe_2020.jpg',
  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Jane_Doe_2020.jpg',
  extmetadata: block({
    LicenseShortName: 'CC BY-SA 4.0', License: 'cc-by-sa-4.0', LicenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    Artist: '<a href="//commons.wikimedia.org/wiki/User:Jane" title="User:Jane">Jane &amp; Co</a>', UsageTerms: 'Creative Commons Attribution-Share Alike 4.0',
  }),
};

const code = async (p: Promise<unknown>): Promise<string> => { try { await p; } catch (e) { return e instanceof ImageError ? e.code : 'other'; } return 'none'; };

describe('wikimediaTarget', () => {
  it('reads the title of a Commons file page, in every form it takes', () => {
    const want = { kind: 'commons', title: 'File:Jane Doe 2020.jpg' };
    expect(wikimediaTarget('https://commons.wikimedia.org/wiki/File:Jane_Doe_2020.jpg')).toEqual(want);
    expect(wikimediaTarget('https://commons.wikimedia.org/wiki/File:Jane%20Doe%202020.jpg#filelinks')).toEqual(want);
    expect(wikimediaTarget('https://commons.m.wikimedia.org/wiki/File:Jane_Doe_2020.jpg')).toEqual(want);
    expect(wikimediaTarget('https://commons.wikimedia.org/w/index.php?title=File:Jane_Doe_2020.jpg&action=edit')).toEqual(want);
    expect(wikimediaTarget('https://commons.wikimedia.org/wiki/Special:FilePath/Jane_Doe_2020.jpg')).toEqual(want);
  });

  it('reads the file behind an upload.wikimedia.org address, thumbnails included', () => {
    const want = { kind: 'commons', title: 'File:Jane Doe 2020.jpg' };
    expect(wikimediaTarget('https://upload.wikimedia.org/wikipedia/commons/a/ab/Jane_Doe_2020.jpg')).toEqual(want);
    expect(wikimediaTarget('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Jane_Doe_2020.jpg/800px-Jane_Doe_2020.jpg')).toEqual(want);
  });

  it('calls a file of another wiki foreign, and anything else nothing', () => {
    expect(wikimediaTarget('https://upload.wikimedia.org/wikipedia/en/a/ab/Poster.jpg')).toEqual({ kind: 'foreign' });
    expect(wikimediaTarget('https://en.wikipedia.org/wiki/File:Poster.jpg')).toEqual({ kind: 'foreign' });
    for (const v of ['https://example.org/wiki/File:A.jpg', 'https://commons.wikimedia.org/wiki/Category:Cats', 'https://commons.wikimedia.org/wiki/Main_Page', 'not a url', 42, null, 'ftp://commons.wikimedia.org/wiki/File:A.jpg']) {
      expect(wikimediaTarget(v), String(v)).toBeNull();
    }
  });
});

describe('commonsVerdict', () => {
  const v = (rec: Record<string, string>) => commonsVerdict(block(rec));

  it('accepts CC0, public domain, CC BY and CC BY-SA, any version', () => {
    expect(v({ License: 'cc0', LicenseShortName: 'CC0' })).toMatchObject({ free: true, license: 'cc0' });
    expect(v({ License: 'cc-zero', LicenseShortName: 'CC0 1.0' })).toMatchObject({ free: true, license: 'cc0' });
    for (const [code, name] of [['pd', 'Public domain'], ['pd-old-100', 'Public domain'], ['pd-self', 'Public domain'], ['cc-pd-mark', 'Public domain']]) {
      expect(v({ License: code!, LicenseShortName: name! }), code).toMatchObject({ free: true, license: 'public_domain' });
    }
    for (const ver of ['1.0', '2.0', '2.5', '3.0', '4.0']) {
      expect(v({ License: `cc-by-${ver}`, LicenseShortName: `CC BY ${ver}` }), ver).toMatchObject({ free: true, license: 'cc_by' });
      expect(v({ License: `cc-by-sa-${ver}`, LicenseShortName: `CC BY-SA ${ver}` }), ver).toMatchObject({ free: true, license: 'cc_by_sa' });
    }
    expect(v({ License: 'cc-by-sa-3.0-de', LicenseShortName: 'CC BY-SA 3.0 de' })).toMatchObject({ free: true, license: 'cc_by_sa' });
  });

  it('accepts the recognised other free licences, with their name as the note', () => {
    expect(v({ License: 'gfdl', LicenseShortName: 'GFDL' })).toEqual({ free: true, license: 'other', label: 'GFDL', note: 'GFDL' });
    expect(v({ License: 'ogl', LicenseShortName: 'OGL 3.0' })).toMatchObject({ free: true, license: 'other', note: 'OGL 3.0' });
    expect(v({ License: 'attribution', LicenseShortName: 'Attribution' })).toMatchObject({ free: true, license: 'other' });
  });

  it('refuses NonFree, fair use, NonCommercial, NoDerivatives, an unknown licence and a missing one', () => {
    expect(v({ License: 'cc-by-4.0', LicenseShortName: 'CC BY 4.0', NonFree: 'true' })).toMatchObject({ free: false });
    expect(v({ License: 'fairuse', LicenseShortName: 'Fair use' })).toMatchObject({ free: false, reason: expect.stringMatching(/Fair use/) });
    expect(v({ License: 'cc-by-nc-4.0', LicenseShortName: 'CC BY-NC 4.0' })).toMatchObject({ free: false });
    expect(v({ License: 'cc-by-nc-sa-3.0', LicenseShortName: 'CC BY-NC-SA 3.0' })).toMatchObject({ free: false });
    expect(v({ License: 'cc-by-nd-2.0', LicenseShortName: 'CC BY-ND 2.0' })).toMatchObject({ free: false });
    expect(v({ License: 'all-rights-reserved', LicenseShortName: 'All rights reserved' })).toMatchObject({ free: false });
    expect(v({ UsageTerms: 'Creative Commons Attribution 4.0' })).toMatchObject({ free: false });
    expect(commonsVerdict(undefined)).toMatchObject({ free: false });
  });
});

describe('stripHtml', () => {
  it('drops tags and decodes entities', () => {
    expect(stripHtml('<a href="x">Jane &amp; Co</a> <br/>(&quot;JD&quot;) &#169; &#x41;')).toBe('Jane & Co ("JD") © A');
    expect(stripHtml('plain')).toBe('plain');
    expect(stripHtml('<div>  a \n\n b </div>')).toBe('a b');
  });
});

describe('lookupCommons', () => {
  it('asks the API with the documented query and a User-Agent that names the project, and returns the licence and the author', async () => {
    const fetchMock = vi.fn(async () => answer(FILE));
    const file = await lookupCommons('File:Jane Doe 2020.jpg', { fetch: fetchMock as unknown as typeof fetch });
    expect(file).toEqual({
      title: 'File:Jane Doe 2020.jpg',
      pageUrl: 'https://commons.wikimedia.org/wiki/File:Jane_Doe_2020.jpg',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Jane_Doe_2020.jpg/2000px-Jane_Doe_2020.jpg',
      license: 'cc_by_sa', licenseLabel: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      author: 'Jane & Co', note: null,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const q = new URL(url).searchParams;
    expect(new URL(url).origin + new URL(url).pathname).toBe('https://commons.wikimedia.org/w/api.php');
    expect([q.get('action'), q.get('prop'), q.get('iiprop'), q.get('titles'), q.get('format')]).toEqual(['query', 'imageinfo', 'url|extmetadata', 'File:Jane Doe 2020.jpg', 'json']);
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(COMMONS_USER_AGENT);
    expect(COMMONS_USER_AGENT).toMatch(/bunnyverse/i);
    expect(commonsApiUrl('File:A b.jpg')).toContain('titles=File%3AA+b.jpg');
  });

  it('answers with no author when Commons gives none, and with the original when there is no rendition', async () => {
    const file = await lookupCommons('File:X.jpg', { fetch: (async () => answer({ ...FILE, thumburl: undefined, extmetadata: block({ License: 'cc0', LicenseShortName: 'CC0' }) })) as unknown as typeof fetch });
    expect(file).toMatchObject({ license: 'cc0', author: null, imageUrl: FILE.url, licenseUrl: null });
  });

  it('refuses a missing file, a non-free file and an answer it cannot read', async () => {
    const run = (r: () => Promise<Response>): Promise<string> => code(lookupCommons('File:X.jpg', { fetch: (async () => r()) as unknown as typeof fetch }));
    expect(await run(async () => answer(null))).toBe('commons_missing');
    expect(await run(async () => answer({ ...FILE, extmetadata: block({ License: 'cc-by-4.0', LicenseShortName: 'CC BY 4.0', NonFree: 'true' }) }))).toBe('not_free');
    expect(await run(async () => answer({ ...FILE, extmetadata: block({ License: 'cc-by-nc-4.0', LicenseShortName: 'CC BY-NC 4.0' }) }))).toBe('not_free');
    expect(await run(async () => new Response('not json', { status: 200 }))).toBe('commons_failed');
    expect(await run(async () => new Response('{}', { status: 500 }))).toBe('commons_failed');
    expect(await run(async () => { throw new Error('offline'); })).toBe('commons_failed');
    expect(await run(async () => answer({ ...FILE, url: 'https://evil.example/a.jpg', thumburl: undefined }))).toBe('commons_failed');
  });

  it('gives up after the timeout', async () => {
    const hang = ((_u: string, init: RequestInit) => new Promise((_ok, bad) => { init.signal?.addEventListener('abort', () => bad(new Error('aborted'))); })) as unknown as typeof fetch;
    expect(await code(lookupCommons('File:X.jpg', { fetch: hang, timeoutMs: 20 }))).toBe('commons_failed');
  });

  it('reads the format version 2 shape too', async () => {
    const body = { query: { pages: [{ pageid: 1, title: 'File:Jane Doe 2020.jpg', imageinfo: [FILE] }] } };
    const file = await lookupCommons('File:Jane Doe 2020.jpg', { fetch: (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch });
    expect(file.license).toBe('cc_by_sa');
  });
});
