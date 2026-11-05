// Daily games step 2: the admin routes of the Photos tab. The gate of the anime admin (a visitor, a signed-in non-admin and any other build
// get 404), same-origin writes only, a series refused without its licence verified, a picture stored end to end on an in-memory database and
// bucket, the versions of a banner, and the guarded fetch that never stores anything.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { META, commonsResponse, photoFiles, photosFakeDb, webpOf } from '@/lib/photos/test-support';

import type { PhotosFakeDb } from '@/lib/photos/test-support';

const state = vi.hoisted(() => ({ site: 'anime', user: null as { id: string } | null, db: null as unknown, remote: [] as string[] }));
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
// ADMIN-1: the auth stand-in of lib/admin/test-support.ts (getSession, getUser, the assurance level: aal2 by default).
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user })) }),
  createServiceRoleClient: () => state.db,
}));
vi.mock('@/lib/entity-images/fetch-remote', async (orig) => ({
  ...(await orig<typeof import('@/lib/entity-images/fetch-remote')>()),
  fetchRemoteImage: async (url: string) => { state.remote.push(url); return Buffer.from(await webpOf(500, 600)); },
}));

import * as saveModule from './route';
import * as assetsModule from './assets/route';
import * as fetchModule from './fetch/route';

const BASE = 'http://localhost:3064';
const dbOf = (): PhotosFakeDb => state.db as PhotosFakeDb;

function multipart(path: string, fields: Record<string, string | Uint8Array>, headers: Record<string, string> = { origin: BASE }): NextRequest {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, typeof v === 'string' ? v : new File([new Uint8Array(v)], `${k}.webp`, { type: 'image/webp' }));
  return new NextRequest(`${BASE}${path}`, { method: 'POST', body: f, headers });
}

beforeEach(() => {
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  state.site = 'anime';
  state.user = { id: 'admin-1' };
  state.remote = [];
  state.db = photosFakeDb({
    idols: [{ id: 5, name: 'Idol' }], groups: [{ id: 1, slug: 'death-note', name: 'Death Note', site_id: 'anime' }], series: [{ group_id: 1, published: true }],
    characters: [], entity_images: [], site_assets: [], agencies: [],
  });
  revalidateTag.mockClear();
  // META names a Commons page as its source (CR-021: the server asks Commons for it): the answer is stubbed, no test reaches the network.
  vi.stubGlobal('fetch', vi.fn(async () => commonsResponse()));
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('the gate', () => {
  const calls = (): Array<() => Promise<Response>> => [
    () => saveModule.POST(multipart('/api/admin/photos', { kind: 'idol', slug: '5', meta: JSON.stringify(META), verified: '0', focal_x: '50', focal_y: '50' })),
    () => saveModule.POST(multipart('/api/admin/photos', { action: 'remove', kind: 'idol', slug: '5' })),
    () => assetsModule.POST(multipart('/api/admin/photos/assets', { action: 'retire', key: 'icon:k-idol' })),
    () => fetchModule.POST(new NextRequest(`${BASE}/api/admin/photos/fetch`, { method: 'POST', body: JSON.stringify({ url: 'https://x.org/a.jpg' }), headers: { 'content-type': 'application/json', origin: BASE } })),
  ];

  // ADMIN-2: the hub build serves these routes too (the one admin reaches the Photos board there), so it is no longer in this list; the kpop build still is.
  it('is a 404 for a visitor, a non-admin, and on the kpop build', async () => {
    for (const set of [() => { state.user = null; }, () => { state.user = { id: 'user-9' }; }, () => { state.site = 'kpop'; }, () => { state.site = 'hub'; state.user = null; }, () => { state.site = 'hub'; state.user = { id: 'user-9' }; }]) {
      set();
      for (const call of calls()) expect((await call()).status).toBe(404);
      state.site = 'anime';
      state.user = { id: 'admin-1' };
    }
    expect(dbOf().tables.entity_images).toEqual([]);
    expect(state.remote).toEqual([]);
  });

  it('on the hub build an admin gets through, and a call without a site is refused with 400 (the hub never guesses a site)', async () => {
    state.site = 'hub';
    for (const call of calls().slice(0, 3)) {
      const res = await call();
      expect(res.status).toBe(400);
      expect((await res.json() as { code: string }).code).toBe('site_required');
    }
    expect((await calls()[3]!()).status).toBe(200);
    expect(dbOf().tables.entity_images).toEqual([]);
    expect(dbOf().tables.admin_actions ?? []).toEqual([]);
  });

  it('refuses a write from another site, and answers 404 to the other methods', async () => {
    const res = await saveModule.POST(multipart('/api/admin/photos', { kind: 'idol', slug: '5', meta: JSON.stringify(META) }, { origin: 'https://evil.example', host: 'localhost:3064' }));
    expect(res.status).toBe(403);
    for (const m of [saveModule.GET, assetsModule.PUT, fetchModule.DELETE]) expect((await (m as unknown as () => Promise<Response>)()).status).toBe(404);
  });
});

describe('POST /api/admin/photos', () => {
  it('stores a picture of an idol, its three files and its row', async () => {
    const files = await photoFiles(400, 500);
    const res = await saveModule.POST(multipart('/api/admin/photos', { kind: 'idol', slug: '5', meta: JSON.stringify(META), verified: '1', focal_x: '40', focal_y: '30', ...files }));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; photo: { path: string; thumbPath: string; verified: boolean } };
    expect(body.ok).toBe(true);
    expect(body.photo.verified).toBe(true);
    expect(dbOf().files.size).toBe(3);
    expect(dbOf().tables.entity_images![0]).toMatchObject({ kind: 'idol', slug: '5', license_verified: true, thumb_path: body.photo.thumbPath });
  });

  it('refuses a series without its licence verified, files of the wrong size, a missing entity, half the files', async () => {
    const say = async (r: Response): Promise<[number, string]> => [r.status, ((await r.json()) as { error: string }).error];
    const big = await photoFiles(736, 981);
    expect((await say(await saveModule.POST(multipart('/api/admin/photos', { kind: 'series', slug: 'death-note', meta: JSON.stringify(META), verified: '0', focal_x: '50', focal_y: '50', ...big }))))[0]).toBe(422);
    const small = await photoFiles(400, 500);
    expect(await say(await saveModule.POST(multipart('/api/admin/photos', { kind: 'series', slug: 'death-note', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', ...small })))).toEqual([422, 'Le fichier 1x doit faire 736 par 981.']);
    expect((await saveModule.POST(multipart('/api/admin/photos', { kind: 'idol', slug: '6', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', ...small }))).status).toBe(404);
    expect((await saveModule.POST(multipart('/api/admin/photos', { kind: 'idol', slug: '5', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', x1: small.x1 }))).status).toBe(400);
    expect((await saveModule.POST(multipart('/api/admin/photos', { kind: 'idol', slug: '5', meta: JSON.stringify({ ...META, source_url: 'http://x.org' }), verified: '1', focal_x: '50', focal_y: '50' }))).status).toBe(400);
    expect(dbOf().tables.entity_images).toEqual([]);
  });

  it('stores a verified series and expires the anime display\'s cache', async () => {
    const big = await photoFiles(736, 981);
    const res = await saveModule.POST(multipart('/api/admin/photos', { kind: 'series', slug: 'death-note', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', ...big }));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalled();
  });
});

describe('POST /api/admin/photos, action remove', () => {
  it('removes the picture of an idol, its row and its three files; refuses another site; says so when there is none', async () => {
    const files = await photoFiles(400, 500);
    expect((await saveModule.POST(multipart('/api/admin/photos', { kind: 'idol', slug: '5', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', ...files }))).status).toBe(200);
    expect(dbOf().files.size).toBe(3);
    const evil = await saveModule.POST(multipart('/api/admin/photos', { action: 'remove', kind: 'idol', slug: '5' }, { origin: 'https://evil.example', host: 'localhost:3064' }));
    expect(evil.status).toBe(403);
    expect(dbOf().files.size).toBe(3);
    const res = await saveModule.POST(multipart('/api/admin/photos', { action: 'remove', kind: 'idol', slug: '5' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, removed: { kind: 'idol', slug: '5', files: 3 } });
    expect(dbOf().tables.entity_images).toEqual([]);
    expect(dbOf().files.size).toBe(0);
    expect((await saveModule.POST(multipart('/api/admin/photos', { action: 'remove', kind: 'idol', slug: '5' }))).status).toBe(404);
    expect((await saveModule.POST(multipart('/api/admin/photos', { action: 'zap', kind: 'idol', slug: '5' }))).status).toBe(400);
  });

  it('a series removed expires the anime display\'s cache', async () => {
    const big = await photoFiles(736, 981);
    await saveModule.POST(multipart('/api/admin/photos', { kind: 'series', slug: 'death-note', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', ...big }));
    revalidateTag.mockClear();
    expect((await saveModule.POST(multipart('/api/admin/photos', { action: 'remove', kind: 'series', slug: 'death-note' }))).status).toBe(200);
    expect(revalidateTag).toHaveBeenCalled();
  });
});

describe('POST /api/admin/photos/assets', () => {
  it('publishes a banner, keeps the history, retires a sticker', async () => {
    const files = { large: await webpOf(1920, 600), mid: await webpOf(400, 125), thumb: await webpOf(96, 30) };
    const save = (publish: string, extra: Record<string, string | Uint8Array> = {}): Promise<Response> => assetsModule.POST(multipart('/api/admin/photos/assets', {
      action: 'save', key: 'banner:kpopdle', settings: JSON.stringify({ focal: { x: 30, y: 50 } }), meta: JSON.stringify(META), verified: '1', publish, ...extra,
    }));
    expect((await save('now', files)).status).toBe(200);
    expect((await save(new Date(Date.now() + 86400000).toISOString())).status).toBe(200);
    expect(dbOf().tables.site_assets).toHaveLength(2);
    const unverified = await assetsModule.POST(multipart('/api/admin/photos/assets', { action: 'save', key: 'banner:daily', settings: '{}', meta: JSON.stringify(META), verified: '0', publish: 'now', ...files }));
    expect(unverified.status).toBe(422);
    const icon = await assetsModule.POST(multipart('/api/admin/photos/assets', { action: 'save', key: 'icon:hints', settings: JSON.stringify({ mode: 'icon', icon: 'bulb', circle: false, color: 'k' }), no_file: '1', publish: 'now' }));
    expect(icon.status).toBe(200);
    expect((await assetsModule.POST(multipart('/api/admin/photos/assets', { action: 'save', key: 'banner:elsewhere', settings: '{}', publish: 'now' }))).status).toBe(400);
    expect((await assetsModule.POST(multipart('/api/admin/photos/assets', { action: 'retire', key: 'sticker:home:abcdef12' }))).status).toBe(200);
  });

  it('refuses a sticker or an icon PNG under a Creative Commons licence, takes our own illustration', async () => {
    const small = { large: await webpOf(300, 300, 'alpha'), thumb: await webpOf(96, 96, 'alpha') };
    const settings = JSON.stringify({ side: 'left', x: 10, y: 200, w: 140, r: 0, o: 100, mirror: false, anim: true });
    const cc = await assetsModule.POST(multipart('/api/admin/photos/assets', { action: 'save', key: 'sticker:daily:ab12cd34', settings, meta: JSON.stringify(META), verified: '1', publish: 'now', ...small }));
    expect(cc.status).toBe(422);
    expect(dbOf().files.size).toBe(0);
    const own = await assetsModule.POST(multipart('/api/admin/photos/assets', {
      action: 'save', key: 'sticker:daily:ab12cd34', settings, meta: JSON.stringify({ source_url: '', author: 'Bunnyverse', license: 'own_photo', license_note: '' }), verified: '1', publish: 'now', ...small,
    }));
    expect(own.status).toBe(200);
  });
});

describe('POST /api/admin/photos/fetch', () => {
  it('hands the bytes back through the guarded fetch and stores nothing', async () => {
    const res = await fetchModule.POST(new NextRequest(`${BASE}/api/admin/photos/fetch`, { method: 'POST', body: JSON.stringify({ url: 'https://upload.wikimedia.org/a.jpg' }), headers: { 'content-type': 'application/json', origin: BASE } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(state.remote).toEqual(['https://upload.wikimedia.org/a.jpg']);
    expect(dbOf().files.size).toBe(0);
  });
});

// ADMIN-2: the explicit site, the journal line and the cache of that site, for the Photos routes, on the hub and on the anime build.
describe('the site the admin chose, the journal and the cache of that site', () => {
  const SECRET = 'test-shared-secret-not-a-real-one-0123456789';
  type Call = { url: string; auth: string | null; tags: string[] };
  let remote: Call[];
  let answer: (url: string) => Response | Promise<Response>;

  const journal = (): Array<Record<string, unknown>> => (dbOf().tables.admin_actions ?? []) as Array<Record<string, unknown>>;
  const lineOf = (i = 0): { site_id: unknown; action: unknown; target_type: unknown; target_id: unknown; admin_id: unknown; detail: Record<string, unknown> } =>
    journal()[i] as never;
  const asset = (fields: Record<string, string | Uint8Array>, path = '/api/admin/photos/assets'): Promise<Response> => assetsModule.POST(multipart(path, fields));
  const saveIdol = async (extra: Record<string, string> = {}, path = '/api/admin/photos'): Promise<Response> => saveModule.POST(multipart(path, {
    kind: 'idol', slug: '5', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', ...(await photoFiles(400, 500)), ...extra,
  }));
  const saveSeries = async (extra: Record<string, string> = {}, path = '/api/admin/photos'): Promise<Response> => saveModule.POST(multipart(path, {
    kind: 'series', slug: 'death-note', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', ...(await photoFiles(736, 981)), ...extra,
  }));

  beforeEach(() => {
    remote = [];
    answer = () => new Response('{"ok":true}', { status: 200 });
    vi.stubEnv('ADMIN_REVALIDATE_SECRET', SECRET);
    // Commons answers the credit lookups of META; the revalidation route of another site answers `answer`.
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit) => {
      if (!String(url).includes('/api/site-revalidate')) return commonsResponse();
      remote.push({ url: String(url), auth: (init?.headers as Record<string, string>).authorization ?? null, tags: (JSON.parse(String(init?.body)) as { tags: string[] }).tags });
      return answer(String(url));
    }));
  });
  afterEach(() => { vi.stubEnv('ADMIN_REVALIDATE_SECRET', ''); });

  describe('on the hub build', () => {
    beforeEach(() => { state.site = 'hub'; });

    it('a picture of an idol is kpop\'s: journaled under kpop, and the credits and games of kpopquiz.org are refreshed there', async () => {
      const res = await saveIdol({ site: 'kpop' });
      expect(res.status).toBe(200);
      expect(journal()).toHaveLength(1);
      expect(lineOf()).toMatchObject({ site_id: 'kpop', action: 'photo.save', target_type: 'idol', target_id: '5', admin_id: 'admin-1', detail: { verified: true, files: true, cache: 'ok' } });
      expect(remote).toEqual([{ url: 'https://kpopquiz.org/api/site-revalidate', auth: `Bearer ${SECRET}`, tags: ['entity-images-public'] }]);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('a picture of a series is anime\'s: journaled under anime, OtakuQuiz is refreshed over there, and the hub expires its own copy of the list', async () => {
      const res = await saveSeries({}, '/api/admin/photos?site=anime');
      expect(res.status).toBe(200);
      expect(lineOf()).toMatchObject({ site_id: 'anime', action: 'photo.save', target_type: 'series', target_id: 'death-note', detail: { cache: 'ok' } });
      expect(remote).toEqual([{ url: 'https://bunnyverse.org/anime/api/site-revalidate', auth: `Bearer ${SECRET}`, tags: ['entity-images:anime', 'entity-images-public'] }]);
      expect(revalidateTag).toHaveBeenCalledWith('entity-image:anime:series:death-note', { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith('entity-images:anime', { expire: 0 });
    });

    it('the query wins over the form, as everywhere in the admin; a good site in the query rescues a bad one in the form', async () => {
      expect((await saveIdol({ site: 'nope' }, '/api/admin/photos?site=kpop')).status).toBe(200);
      expect(lineOf().site_id).toBe('kpop');
    });

    it('removing a picture is journaled under the site and refreshes it', async () => {
      expect((await saveIdol({ site: 'kpop' })).status).toBe(200);
      remote.length = 0;
      const res = await saveModule.POST(multipart('/api/admin/photos', { action: 'remove', kind: 'idol', slug: '5', site: 'kpop' }));
      expect(res.status).toBe(200);
      expect(journal()).toHaveLength(2);
      expect(lineOf(1)).toMatchObject({ site_id: 'kpop', action: 'photo.remove', target_type: 'idol', target_id: '5', detail: { cache: 'ok' } });
      expect(remote.map((c) => c.tags)).toEqual([['entity-images-public']]);
    });

    it.each([
      ['no site', 'idol', {}, 'site_required'],
      ['an empty site', 'idol', { site: '' }, 'site_required'],
      ['a site that does not exist', 'idol', { site: 'tiktok' }, 'bad_site'],
      ['a site in the wrong case', 'idol', { site: 'Kpop' }, 'bad_site'],
      ['an idol of anime', 'idol', { site: 'anime' }, 'site_unsupported'],
      ['an idol of the hub', 'idol', { site: 'hub' }, 'site_unsupported'],
      ['a series of kpop', 'series', { site: 'kpop' }, 'site_unsupported'],
      ['a series of the hub', 'series', { site: 'hub' }, 'site_unsupported'],
    ])('refuses %s with 400 %s, before anything is read, stored, journaled or refreshed', async (_n, kind, extra, code) => {
      const res = await saveModule.POST(multipart('/api/admin/photos', { kind, slug: kind === 'idol' ? '5' : 'death-note', meta: JSON.stringify(META), verified: '1', focal_x: '50', focal_y: '50', ...(await photoFiles(400, 500)), ...extra }));
      expect(res.status).toBe(400);
      expect((await res.json() as { code: string }).code).toBe(code);
      expect(dbOf().tables.entity_images).toEqual([]);
      expect(dbOf().files.size).toBe(0);
      expect(journal()).toEqual([]);
      expect(remote).toEqual([]);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('a visitor is still a 404 whatever site it names', async () => {
      state.user = null;
      expect((await saveIdol({ site: 'kpop' })).status).toBe(404);
      expect((await saveIdol({ site: 'nope' })).status).toBe(404);
      expect(journal()).toEqual([]);
    });

    it('the assets are the hub\'s: site=hub is journaled under hub and the hub expires its own live assets in place, with no call', async () => {
      const files = { large: await webpOf(1920, 600), mid: await webpOf(400, 125), thumb: await webpOf(96, 30) };
      const res = await asset({ action: 'save', key: 'banner:kpopdle', settings: JSON.stringify({ focal: { x: 30, y: 50 } }), meta: JSON.stringify(META), verified: '1', publish: 'now', site: 'hub', ...files });
      expect(res.status).toBe(200);
      expect(lineOf()).toMatchObject({ site_id: 'hub', action: 'asset.save', target_type: 'site_asset', target_id: 'banner:kpopdle', detail: { cache: 'ok' } });
      expect(revalidateTag).toHaveBeenCalledWith('site-assets', { expire: 0 });
      expect(remote).toEqual([]);
      const id = (dbOf().tables.site_assets![0] as { id: number }).id;
      expect((await asset({ action: 'restore', id: String(id), site: 'hub' })).status).toBe(200);
      expect((await asset({ action: 'retire', key: 'banner:kpopdle', site: 'hub' })).status).toBe(200);
      expect(journal().map((l) => l.action)).toEqual(['asset.save', 'asset.restore', 'asset.retire']);
      expect(journal().every((l) => l.site_id === 'hub' && (l.detail as { cache: string }).cache === 'ok')).toBe(true);
      expect(revalidateTag).toHaveBeenCalledTimes(3);
    });

    it.each([
      ['no site', {}, 'site_required'],
      ['kpop', { site: 'kpop' }, 'site_unsupported'],
      ['anime', { site: 'anime' }, 'site_unsupported'],
      ['a site that does not exist', { site: 'x' }, 'bad_site'],
    ])('the assets refuse %s with 400 %s and change nothing', async (_n, extra, code) => {
      for (const action of ['retire', 'restore', 'save']) {
        const res = await asset({ action, key: 'icon:hints', id: '1', ...extra });
        expect(res.status, action).toBe(400);
        expect((await res.json() as { code: string }).code, action).toBe(code);
      }
      expect(dbOf().tables.site_assets).toEqual([]);
      expect(journal()).toEqual([]);
      expect(revalidateTag).not.toHaveBeenCalled();
    });

    it('the guarded fetch of the board needs no site and journals nothing (it stores nothing)', async () => {
      const res = await fetchModule.POST(new NextRequest(`${BASE}/api/admin/photos/fetch`, { method: 'POST', body: JSON.stringify({ url: 'https://upload.wikimedia.org/a.jpg' }), headers: { 'content-type': 'application/json', origin: BASE } }));
      expect(res.status).toBe(200);
      expect(journal()).toEqual([]);
    });
  });

  describe('a cache that cannot be reached never fails the write; the journal says why', () => {
    it.each([
      ['no secret on this project', () => { vi.stubEnv('ADMIN_REVALIDATE_SECRET', ''); }, 'no_secret'],
      ['the other site refuses', () => { answer = () => new Response('', { status: 404 }); }, 'refused'],
      ['the other site is down', () => { answer = () => { throw new Error('down'); }; }, 'unreachable'],
    ])('%s', async (_n, set, outcome) => {
      state.site = 'hub';
      set();
      const res = await saveIdol({ site: 'kpop' });
      expect(res.status).toBe(200);
      expect(dbOf().tables.entity_images).toHaveLength(1);
      expect(lineOf().detail.cache).toBe(outcome);
    });
  });

  describe('on the anime build, until its admin goes (step 6): nothing changes for the admin that sends no site', () => {
    it('a picture of an idol is kpop\'s, a series is anime\'s, an asset is the hub\'s', async () => {
      expect((await saveIdol()).status).toBe(200);
      expect((await saveSeries()).status).toBe(200);
      const files = { large: await webpOf(1920, 600), mid: await webpOf(400, 125), thumb: await webpOf(96, 30) };
      expect((await asset({ action: 'save', key: 'banner:kpopdle', settings: JSON.stringify({ focal: { x: 30, y: 50 } }), meta: JSON.stringify(META), verified: '1', publish: 'now', ...files })).status).toBe(200);
      expect(journal().map((l) => [l.site_id, l.action])).toEqual([['kpop', 'photo.save'], ['anime', 'photo.save'], ['hub', 'asset.save']]);
    });

    it('a site that is sent is checked here too: the site of the kind, or a 400', async () => {
      expect((await saveIdol({ site: 'kpop' })).status).toBe(200);
      for (const [res, code] of [[await saveIdol({ site: 'anime' }), 'site_unsupported'], [await saveIdol({ site: 'nope' }), 'bad_site'], [await saveSeries({ site: 'kpop' }), 'site_unsupported']] as const) {
        expect(res.status).toBe(400);
        expect((await res.json() as { code: string }).code).toBe(code);
      }
      expect((await asset({ action: 'retire', key: 'icon:hints', site: 'anime' })).status).toBe(400);
      expect(journal()).toHaveLength(1);
    });

    it('the series of OtakuQuiz is refreshed in place (this build is anime), the idol of kpop over there (no secret here: said in the journal)', async () => {
      vi.stubEnv('ADMIN_REVALIDATE_SECRET', '');
      expect((await saveSeries()).status).toBe(200);
      expect(revalidateTag).toHaveBeenCalledWith('entity-images:anime', { expire: 0 });
      expect(revalidateTag).toHaveBeenCalledWith('entity-images-public', { expire: 0 });
      expect((await saveIdol()).status).toBe(200);
      expect(journal().map((l) => (l.detail as { cache: string }).cache)).toEqual(['ok', 'no_secret']);
    });
  });

  it('a journal line holds ids, counts and short codes only', async () => {
    state.site = 'hub';
    await saveIdol({ site: 'kpop' });
    const text = JSON.stringify(journal());
    expect(text).not.toContain(META.author);
    expect(text).not.toContain('commons.wikimedia.org');
    expect(text).not.toContain(SECRET);
  });
});
