// Run O1 (ADM back): the admin image routes. The gate (a visitor, a signed-in non-admin and a kpop build all get 404), validation,
// the upload and the import end to end on an in-memory database and bucket, focal point, delete, and the revalidation of every write.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GOOD_META, animeSeed, fakeDb, makeImage } from '@/lib/entity-images/test-support';

import type { FakeDb } from '@/lib/entity-images/test-support';

const state = vi.hoisted(() => ({ site: 'anime', user: null as { id: string } | null, db: null as unknown, userThrows: false, remote: null as null | ((url: string) => Promise<Buffer>), remoteCalls: [] as string[] }));
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
// ADMIN-1: the auth stand-in of lib/admin/test-support.ts (getSession, getUser, the assurance level: aal2 by default).
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user, userThrows: state.userThrows })) }),
  createServiceRoleClient: () => state.db,
}));
vi.mock('@/lib/entity-images/fetch-remote', async (orig) => ({
  ...(await orig<typeof import('@/lib/entity-images/fetch-remote')>()),
  fetchRemoteImage: async (url: string) => { state.remoteCalls.push(url); if (!state.remote) throw new Error('unexpected network'); return state.remote(url); },
}));

import * as rootModule from './route';
import * as deleteModule from './delete/route';
import * as focalModule from './focal/route';
import * as importModule from './import/route';
import * as listModule from './list/route';
import * as uploadModule from './upload/route';
import { DELETE as deleteRoot } from './route';
import { DELETE as deleteSub } from './delete/route';
import { PATCH as focal } from './focal/route';
import { POST as importUrl } from './import/route';
import { GET as list } from './list/route';
import { POST as upload } from './upload/route';

const BASE = 'http://localhost:3021';
const json = (path: string, method: string, body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(`${BASE}${path}`, { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin: BASE, ...headers } });

async function form(over: Record<string, unknown> = {}, file: Buffer | null = null): Promise<NextRequest> {
  const f = new FormData();
  f.set('kind', String(over.kind ?? 'series'));
  f.set('slug', String(over.slug ?? 'death-note'));
  f.set('meta', typeof over.meta === 'string' ? over.meta : JSON.stringify(over.meta ?? GOOD_META));
  if (over.file !== null) f.set('file', new File([new Uint8Array(file ?? await makeImage(1000, 1400, 'png'))], 'whatever.txt', { type: 'text/plain' }));
  return new NextRequest(`${BASE}/api/admin/images/upload`, { method: 'POST', body: f, headers: { origin: BASE } });
}

const dbOf = (): FakeDb => state.db as FakeDb;
const meta = GOOD_META;

beforeEach(() => {
  state.site = 'anime';
  state.user = { id: 'admin-1' };
  state.userThrows = false;
  state.db = fakeDb(animeSeed());
  state.remote = null;
  state.remoteCalls = [];
  revalidateTag.mockClear();
  process.env.ADMIN_USER_IDS = 'admin-1, admin-2';
});

const ALL: Array<[string, () => Promise<Response>]> = [
  ['GET list', async () => list(new NextRequest(`${BASE}/api/admin/images/list?site=anime`))],
  ['POST upload', async () => upload(await form())],
  ['POST import', async () => importUrl(json('/api/admin/images/import', 'POST', { kind: 'series', slug: 'death-note', url: 'https://x.test/a.png', meta }))],
  ['PATCH focal', async () => focal(json('/api/admin/images/focal', 'PATCH', { kind: 'series', slug: 'death-note', x: 1, y: 2 }))],
  ['DELETE', async () => deleteRoot(json('/api/admin/images', 'DELETE', { kind: 'series', slug: 'death-note' }))],
  ['DELETE /delete', async () => deleteSub(json('/api/admin/images/delete', 'DELETE', { kind: 'series', slug: 'death-note' }))],
];

describe('the admin gate: 404 for everyone but an admin on the anime build', () => {
  for (const [name, call] of ALL) {
    it(`${name}: a visitor gets 404 and nothing is touched`, async () => {
      state.user = null;
      const res = await call();
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Not found.', code: 'not_found' });
      expect(dbOf().files.size).toBe(0);
      expect(state.remoteCalls).toEqual([]);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it(`${name}: a signed-in user who is not in ADMIN_USER_IDS gets 404`, async () => {
      state.user = { id: 'someone-else' };
      expect((await call()).status).toBe(404);
      expect(dbOf().files.size).toBe(0);
      expect(dbOf().tables.entity_images).toHaveLength(0);
    });

    it(`${name}: an admin on the kpop build gets 404`, async () => {
      state.site = 'kpop';
      expect((await call()).status).toBe(404);
      expect(dbOf().tables.entity_images).toHaveLength(0);
    });

    it(`${name}: a session lookup that throws is a 404, not a 500`, async () => {
      state.userThrows = true;
      expect((await call()).status).toBe(404);
    });
  }

  it('an empty ADMIN_USER_IDS admits nobody', async () => {
    process.env.ADMIN_USER_IDS = '';
    state.user = { id: '' };
    expect((await list(new NextRequest(`${BASE}/api/admin/images/list`))).status).toBe(404);
    delete process.env.ADMIN_USER_IDS;
    state.user = { id: 'admin-1' };
    expect((await list(new NextRequest(`${BASE}/api/admin/images/list`))).status).toBe(404);
  });

  it('a write whose Origin is another site is refused even for an admin', async () => {
    const res = await focal(json('/api/admin/images/focal', 'PATCH', { kind: 'series', slug: 'death-note', x: 1, y: 2 }, { origin: 'https://evil.example', host: 'localhost:3021' }));
    expect(res.status).toBe(403);
  });
});

describe('GET list', () => {
  it('answers { ok, site, counts, series } to an admin', async () => {
    const res = await list(new NextRequest(`${BASE}/api/admin/images/list?site=anime`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.site).toBe('anime');
    expect(body.counts).toMatchObject({ series: 2, characters: 2 });
    expect(body.series[0].slug).toBe('death-note');
  });

  it('another site is a 400', async () => {
    const res = await list(new NextRequest(`${BASE}/api/admin/images/list?site=kpop`));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('bad_request');
  });
});

describe('POST upload', () => {
  it('stores a picture and answers { ok, image }, then the list shows it, and the tag is revalidated', async () => {
    const res = await upload(await form());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.image).toMatchObject({ kind: 'series', slug: 'death-note', width: 736, height: 981, focalX: 50, focalY: 50, license: 'cc_by', author: 'Jane Doe' });
    expect(body.image.url).toMatch(/\/entity-images\/anime\/series\/death-note\/[0-9a-f]{16}\.webp$/);
    expect(body.image.url2x).toMatch(/-2x\.webp$/);
    expect(dbOf().files.size).toBe(2);
    expect(revalidateTag).toHaveBeenCalledWith('entity-image:anime:series:death-note', { expire: 0 });
    const l = await (await list(new NextRequest(`${BASE}/api/admin/images/list`))).json();
    expect(l.series[0].source).toBe('upload');
  });

  it('a character upload uses the portrait size and the composite slug', async () => {
    const res = await upload(await form({ kind: 'character', slug: 'death-note/light-yagami' }));
    expect((await res.json()).image).toMatchObject({ kind: 'character', slug: 'death-note/light-yagami', width: 360, height: 480 });
    expect(revalidateTag).toHaveBeenCalledWith('entity-image:anime:character:death-note/light-yagami', { expire: 0 });
  });

  it('judges the file by its bytes: a picture called .txt is accepted, a script called .jpg is not', async () => {
    expect((await upload(await form())).status).toBe(200);
    const fake = await upload(await form({}, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')));
    expect(fake.status).toBe(415);
    expect((await fake.json()).code).toBe('unsupported_type');
  });

  it('refuses a file over 8 MB with 413 before decoding, even when no Content-Length is sent', async () => {
    const big = Buffer.alloc(8 * 1024 * 1024 + 10, 1);
    big.set([0xff, 0xd8, 0xff, 0xe0]);
    const res = await upload(await form({}, big));
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe('too_large');
    expect(dbOf().files.size).toBe(0);
  });

  it('refuses a body far over the cap without reading it all', async () => {
    const f = new FormData();
    f.set('file', new File([new Uint8Array(12 * 1024 * 1024)], 'a.jpg'));
    const res = await upload(new NextRequest(`${BASE}/api/admin/images/upload`, { method: 'POST', body: f, headers: { origin: BASE } }));
    expect(res.status).toBe(413);
  });

  it.each([
    ['no file', { file: null }, 400, 'bad_request'],
    ['a bad kind', { kind: 'group' }, 400, 'bad_kind'],
    ['a bad slug', { slug: '../etc' }, 400, 'bad_slug'],
    ['a character slug without its series', { kind: 'character', slug: 'light-yagami' }, 400, 'bad_slug'],
    ['no meta', { meta: '' }, 400, 'bad_meta'],
    ['meta that is not JSON', { meta: '{nope' }, 400, 'bad_meta'],
    ['no author', { meta: { ...GOOD_META, author: '' } }, 400, 'bad_meta'],
    ['no licence', { meta: { ...GOOD_META, license: '' } }, 400, 'bad_meta'],
    ['licence other without a note', { meta: { ...GOOD_META, license: 'other' } }, 400, 'bad_meta'],
    ['an unknown series', { slug: 'no-such-series' }, 404, 'unknown_entity'],
    ['a kpop group', { slug: 'bts' }, 404, 'unknown_entity'],
    ['an unknown character', { kind: 'character', slug: 'death-note/nobody' }, 404, 'unknown_entity'],
  ])('refuses %s', async (_n, over, status, code) => {
    const res = await upload(await form(over));
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(code);
    expect(dbOf().files.size).toBe(0);
    expect(dbOf().tables.entity_images).toHaveLength(0);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('licence other with a note is accepted', async () => {
    const res = await upload(await form({ meta: { ...GOOD_META, license: 'other', license_note: 'Permission by email, 2026-10-01' } }));
    expect(res.status).toBe(200);
    expect((await res.json()).image).toMatchObject({ license: 'other', licenseNote: 'Permission by email, 2026-10-01' });
  });

  it('refuses a body that is not multipart', async () => {
    const res = await upload(json('/api/admin/images/upload', 'POST', { kind: 'series' }));
    expect(res.status).toBe(400);
  });

  it('a storage failure is a 502 with no row', async () => {
    dbOf().fail.upload = true;
    const res = await upload(await form());
    expect(res.status).toBe(502);
    expect(dbOf().tables.entity_images).toHaveLength(0);
  });
});

describe('POST import', () => {
  it('downloads, re-encodes and stores a copy; the answer carries our own URL, never the remote one', async () => {
    const source = await makeImage(1200, 1600, 'jpeg');
    state.remote = async () => source;
    const res = await importUrl(json('/api/admin/images/import', 'POST', { kind: 'series', slug: 'one-piece', url: 'https://images.example.org/p.jpg', meta }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image.slug).toBe('one-piece');
    expect(body.image.url).not.toContain('images.example.org');
    expect(JSON.stringify(body)).not.toContain('images.example.org/p.jpg');
    expect(dbOf().files.size).toBe(2);
    expect(state.remoteCalls).toEqual(['https://images.example.org/p.jpg']);
    expect(revalidateTag).toHaveBeenCalledWith('entity-image:anime:series:one-piece', { expire: 0 });
  });

  it('a download that is not a picture is refused and nothing is stored', async () => {
    state.remote = async () => Buffer.from('<html>login page</html>');
    const res = await importUrl(json('/api/admin/images/import', 'POST', { kind: 'series', slug: 'one-piece', url: 'https://images.example.org/p.jpg', meta }));
    expect(res.status).toBe(415);
    expect(dbOf().files.size).toBe(0);
  });

  it('an unknown entity or bad meta is refused before the network is touched', async () => {
    state.remote = async () => makeImage(1000, 1400);
    for (const body of [{ kind: 'series', slug: 'nope', url: 'https://x.example/a.png', meta }, { kind: 'series', slug: 'one-piece', url: 'https://x.example/a.png', meta: { ...meta, author: '' } }, { kind: 'series', slug: 'one-piece', url: '', meta }, { kind: 'series', slug: 'one-piece', meta }]) {
      const res = await importUrl(json('/api/admin/images/import', 'POST', body));
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
    expect(state.remoteCalls).toEqual([]);
  });

  it('a bad body is a 400', async () => {
    const res = await importUrl(new NextRequest(`${BASE}/api/admin/images/import`, { method: 'POST', body: 'nope', headers: { 'content-type': 'application/json', origin: BASE } }));
    expect(res.status).toBe(400);
  });
});

describe('PATCH focal', () => {
  it('saves the focal point of an uploaded image and revalidates it', async () => {
    await upload(await form());
    revalidateTag.mockClear();
    const res = await focal(json('/api/admin/images/focal', 'PATCH', { kind: 'series', slug: 'death-note', x: 25.5, y: 70 }));
    expect(res.status).toBe(200);
    expect((await res.json()).image).toMatchObject({ focalX: 25.5, focalY: 70 });
    expect(revalidateTag).toHaveBeenCalledWith('entity-image:anime:series:death-note', { expire: 0 });
  });

  it.each([[{ x: -1, y: 5 }], [{ x: 50, y: 101 }], [{ x: '50', y: 5 }], [{ x: 5 }], [{}]])('refuses the focal point %j', async (pt) => {
    await upload(await form());
    const res = await focal(json('/api/admin/images/focal', 'PATCH', { kind: 'series', slug: 'death-note', ...pt }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('bad_focal');
  });

  it('there is nothing to set on a series that only has the bundled photo', async () => {
    const res = await focal(json('/api/admin/images/focal', 'PATCH', { kind: 'series', slug: 'one-piece', x: 5, y: 5 }));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('no_image');
  });
});

describe('DELETE', () => {
  it('removes the image and its files, on both paths, and revalidates', async () => {
    await upload(await form());
    revalidateTag.mockClear();
    const res = await deleteRoot(json('/api/admin/images', 'DELETE', { kind: 'series', slug: 'death-note' }));
    expect(res.status).toBe(200);
    expect(dbOf().tables.entity_images).toHaveLength(0);
    expect(dbOf().files.size).toBe(0);
    expect(revalidateTag).toHaveBeenCalledWith('entity-image:anime:series:death-note', { expire: 0 });
    await upload(await form());
    const again = await deleteSub(new NextRequest(`${BASE}/api/admin/images/delete?kind=series&slug=death-note`, { method: 'DELETE', headers: { origin: BASE } }));
    expect(again.status).toBe(200);
    expect(dbOf().tables.entity_images).toHaveLength(0);
  });

  it('nothing to remove is a 404; bad input is a 400', async () => {
    const none = await deleteRoot(json('/api/admin/images', 'DELETE', { kind: 'series', slug: 'death-note' }));
    expect(none.status).toBe(404);
    expect((await none.json()).code).toBe('no_image');
    expect((await deleteRoot(json('/api/admin/images', 'DELETE', { kind: 'series' }))).status).toBe(400);
    expect((await deleteRoot(new NextRequest(`${BASE}/api/admin/images`, { method: 'DELETE', headers: { origin: BASE } }))).status).toBe(400);
  });
});

describe('every method a route does not implement answers 404, not 405', () => {
  const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
  const MODULES: Array<[string, Record<string, unknown>, string[]]> = [
    ['/api/admin/images', rootModule, ['DELETE']],
    ['/api/admin/images/delete', deleteModule, ['DELETE']],
    ['/api/admin/images/focal', focalModule, ['PATCH']],
    ['/api/admin/images/import', importModule, ['POST']],
    ['/api/admin/images/list', listModule, ['GET']],
    ['/api/admin/images/upload', uploadModule, ['POST']],
  ];
  for (const [path, mod, implemented] of MODULES) {
    for (const method of METHODS) {
      if (implemented.includes(method)) continue;
      // Next derives HEAD from GET when GET exists, so a GET route does not export HEAD itself.
      if (method === 'HEAD' && implemented.includes('GET')) continue;
      it(`${method} ${path} is 404 for an admin, a visitor and the kpop build`, async () => {
        const handler = mod[method] as (req: NextRequest) => Response | Promise<Response>;
        expect(typeof handler, `${path} exports ${method}`).toBe('function');
        for (const setup of [() => undefined, () => { state.user = null; }, () => { state.site = 'kpop'; }]) {
          state.site = 'anime'; state.user = { id: 'admin-1' }; setup();
          const res = await handler(new NextRequest(`${BASE}${path}`, { method, headers: { origin: BASE } }));
          expect(res.status).toBe(404);
        }
        expect(dbOf().files.size).toBe(0);
      });
    }
  }
});

describe('writes need a same-site signal', () => {
  const body = { kind: 'series', slug: 'death-note', x: 10, y: 20 };
  const bare = (headers: Record<string, string>): NextRequest =>
    new NextRequest(`${BASE}/api/admin/images/focal`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });

  beforeEach(async () => { await upload(await form()); });

  it('no Origin and no Sec-Fetch-Site: refused with 403', async () => {
    const res = await focal(bare({}));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('forbidden');
  });

  it('no Origin but Sec-Fetch-Site same-origin: accepted', async () => {
    expect((await focal(bare({ 'sec-fetch-site': 'same-origin' }))).status).toBe(200);
  });

  it.each(['cross-site', 'same-site', 'none', ''])('no Origin and Sec-Fetch-Site "%s": refused', async (v) => {
    expect((await focal(bare({ 'sec-fetch-site': v }))).status).toBe(403);
  });

  it('every state-changing route refuses a request with neither header', async () => {
    const json = { 'content-type': 'application/json' };
    const f = new FormData();
    f.set('kind', 'series');
    const calls = [
      importUrl(new NextRequest(`${BASE}/api/admin/images/import`, { method: 'POST', body: JSON.stringify({}), headers: json })),
      upload(new NextRequest(`${BASE}/api/admin/images/upload`, { method: 'POST', body: f })),
      deleteRoot(new NextRequest(`${BASE}/api/admin/images`, { method: 'DELETE', body: JSON.stringify(body), headers: json })),
      deleteSub(new NextRequest(`${BASE}/api/admin/images/delete`, { method: 'DELETE', body: JSON.stringify(body), headers: json })),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(403);
    expect(dbOf().tables.entity_images).toHaveLength(1);
  });

  it('a foreign Origin is refused', async () => {
    expect((await focal(bare({ origin: 'https://evil.example', host: 'localhost:3021' }))).status).toBe(403);
  });
});

describe('the JSON routes take application/json only', () => {
  const post = (path: string, method: string, type: string | null, body = '{}'): NextRequest =>
    new NextRequest(`${BASE}${path}`, { method, body, headers: { origin: BASE, ...(type ? { 'content-type': type } : {}) } });

  it.each([['text/plain'], ['application/x-www-form-urlencoded'], ['multipart/form-data; boundary=x'], [null]])('content type %s is a 415 on import, focal and delete', async (type) => {
    const payload = JSON.stringify({ kind: 'series', slug: 'death-note', x: 1, y: 1, url: 'https://x.test/a.png', meta });
    for (const res of [
      await importUrl(post('/api/admin/images/import', 'POST', type, payload)),
      await focal(post('/api/admin/images/focal', 'PATCH', type, payload)),
      await deleteRoot(post('/api/admin/images', 'DELETE', type, payload)),
    ]) {
      expect(res.status).toBe(415);
      expect((await res.json()).code).toBe('unsupported_type');
    }
    expect(state.remoteCalls).toEqual([]);
  });

  it('application/json with a charset is accepted', async () => {
    await upload(await form());
    const res = await focal(post('/api/admin/images/focal', 'PATCH', 'application/json; charset=utf-8', JSON.stringify({ kind: 'series', slug: 'death-note', x: 1, y: 1 })));
    expect(res.status).toBe(200);
  });
});
