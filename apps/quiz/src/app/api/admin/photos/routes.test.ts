// Daily games step 2: the admin routes of the Photos tab. The gate of the anime admin (a visitor, a signed-in non-admin and any other build
// get 404), same-origin writes only, a series refused without its licence verified, a picture stored end to end on an in-memory database and
// bucket, the versions of a banner, and the guarded fetch that never stores anything.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { META, photoFiles, photosFakeDb, webpOf } from '@/lib/photos/test-support';

import type { PhotosFakeDb } from '@/lib/photos/test-support';

const state = vi.hoisted(() => ({ site: 'anime', user: null as { id: string } | null, db: null as unknown, remote: [] as string[] }));
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
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
});

describe('the gate', () => {
  const calls = (): Array<() => Promise<Response>> => [
    () => saveModule.POST(multipart('/api/admin/photos', { kind: 'idol', slug: '5', meta: JSON.stringify(META), verified: '0', focal_x: '50', focal_y: '50' })),
    () => saveModule.POST(multipart('/api/admin/photos', { action: 'remove', kind: 'idol', slug: '5' })),
    () => assetsModule.POST(multipart('/api/admin/photos/assets', { action: 'retire', key: 'icon:k-idol' })),
    () => fetchModule.POST(new NextRequest(`${BASE}/api/admin/photos/fetch`, { method: 'POST', body: JSON.stringify({ url: 'https://x.org/a.jpg' }), headers: { 'content-type': 'application/json', origin: BASE } })),
  ];

  it('is a 404 for a visitor, a non-admin, and on any build but the anime one', async () => {
    for (const set of [() => { state.user = null; }, () => { state.user = { id: 'user-9' }; }, () => { state.site = 'hub'; }, () => { state.site = 'kpop'; }]) {
      set();
      for (const call of calls()) expect((await call()).status).toBe(404);
      state.site = 'anime';
      state.user = { id: 'admin-1' };
    }
    expect(dbOf().tables.entity_images).toEqual([]);
    expect(state.remote).toEqual([]);
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
