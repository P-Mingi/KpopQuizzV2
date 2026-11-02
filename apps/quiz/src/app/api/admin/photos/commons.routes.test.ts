// CR-021 (owner decision of 2026-11-02): the Commons check in the admin routes of the Photos tab. The Commons API is a stub (no network in tests):
// a free file fills the licence and the author and wins over what was typed, a file that is not free is refused with nothing stored, any other
// link keeps the licence the owner declared, and the author is required for CC BY and CC BY-SA only.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { commonsResponse, photoFiles, photosFakeDb, webpOf } from '@/lib/photos/test-support';

import type { PhotosFakeDb } from '@/lib/photos/test-support';

const state = vi.hoisted(() => ({ site: 'anime', user: null as { id: string } | null, db: null as unknown, remote: [] as string[] }));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user })) }),
  createServiceRoleClient: () => state.db,
}));
vi.mock('@/lib/entity-images/fetch-remote', async (orig) => ({
  ...(await orig<typeof import('@/lib/entity-images/fetch-remote')>()),
  fetchRemoteImage: async (url: string) => { state.remote.push(url); return Buffer.from(await webpOf(500, 600)); },
}));

import * as saveModule from './route';
import * as fetchModule from './fetch/route';

const BASE = 'http://localhost:3064';
const dbOf = (): PhotosFakeDb => state.db as PhotosFakeDb;
const PAGE = 'https://commons.wikimedia.org/wiki/File:A.jpg';

function multipart(fields: Record<string, string | Uint8Array>): NextRequest {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, typeof v === 'string' ? v : new File([new Uint8Array(v)], `${k}.webp`, { type: 'image/webp' }));
  return new NextRequest(`${BASE}/api/admin/photos`, { method: 'POST', body: f, headers: { origin: BASE } });
}

const json = (path: string, body: unknown): NextRequest => new NextRequest(`${BASE}${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin: BASE } });

let commons: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  state.site = 'anime';
  state.user = { id: 'admin-1' };
  state.remote = [];
  state.db = photosFakeDb({ idols: [{ id: 5, name: 'Idol' }], groups: [], series: [], characters: [], entity_images: [], site_assets: [], agencies: [] });
  commons = vi.fn(async () => commonsResponse());
  vi.stubGlobal('fetch', commons);
});

afterEach(() => { vi.unstubAllGlobals(); });

const save = async (meta: unknown, extra: Record<string, string> = {}) => saveModule.POST(multipart({
  kind: 'idol', slug: '5', meta: JSON.stringify(meta), verified: '1', focal_x: '50', focal_y: '50', ...(await photoFiles(400, 500)), ...extra,
}));

describe('save, with a Commons link', () => {
  it('reads the licence and the author on Commons and keeps them over what was typed', async () => {
    const res = await save({ source_url: '', author: 'Someone else', license: 'cc0' }, { link: PAGE });
    expect(res.status).toBe(200);
    expect(commons).toHaveBeenCalledTimes(1);
    const url = new URL((commons.mock.calls[0] as unknown as [string])[0]);
    expect(url.searchParams.get('titles')).toBe('File:A.jpg');
    expect(dbOf().tables.entity_images![0]).toMatchObject({
      kind: 'idol', slug: '5', license: 'cc_by_sa', author: 'Jane Doe', source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg',
      license_url: 'https://creativecommons.org/licenses/by-sa/4.0', commons_file: 'File:A.jpg', license_verified: true,
    });
  });

  it('also reads an upload.wikimedia.org address, and a Commons source page when the file came from a computer', async () => {
    expect((await save({ license: 'cc0' }, { link: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/A.jpg/800px-A.jpg' })).status).toBe(200);
    expect(new URL((commons.mock.calls[0] as unknown as [string])[0]).searchParams.get('titles')).toBe('File:A.jpg');
    expect((await save({ license: 'cc0', source_url: PAGE })).status).toBe(200);
    expect(commons).toHaveBeenCalledTimes(2);
  });

  it('refuses a file that is not free and stores nothing', async () => {
    for (const bad of [{ nonFree: true }, { license: 'cc-by-nc-4.0', short: 'CC BY-NC 4.0' }, { license: 'fairuse', short: 'Fair use' }]) {
      commons.mockImplementation(async () => commonsResponse(bad));
      const res = await save({ license: 'cc0', author: 'A' }, { link: PAGE });
      expect(res.status, JSON.stringify(bad)).toBe(422);
      expect(((await res.json()) as { code: string }).code).toBe('not_free');
    }
    expect(dbOf().tables.entity_images).toEqual([]);
    expect(dbOf().files.size).toBe(0);
  });

  it('refuses a missing file, a file of another wiki and a Commons that does not answer', async () => {
    commons.mockImplementation(async () => commonsResponse({ missing: true }));
    const missing = await save({ license: 'cc0' }, { link: PAGE });
    expect([missing.status, ((await missing.json()) as { code: string }).code]).toEqual([404, 'commons_missing']);
    commons.mockImplementation(async () => { throw new Error('offline'); });
    const down = await save({ license: 'cc0' }, { link: PAGE });
    expect([down.status, ((await down.json()) as { code: string }).code]).toEqual([502, 'commons_failed']);
    commons.mockClear();
    const foreign = await save({ license: 'cc0' }, { link: 'https://upload.wikimedia.org/wikipedia/en/a/ab/Poster.jpg' });
    expect([foreign.status, ((await foreign.json()) as { code: string }).code]).toEqual([422, 'not_free']);
    expect(commons).not.toHaveBeenCalled();
    expect(dbOf().tables.entity_images).toEqual([]);
    expect(dbOf().files.size).toBe(0);
  });
});

describe('save, with any other link', () => {
  it('stores the licence the owner declares and never calls Commons', async () => {
    const res = await save({ source_url: 'https://example.org/page', author: 'Mina', license: 'cc_by' }, { link: 'https://example.org/a.jpg' });
    expect(res.status).toBe(200);
    expect(commons).not.toHaveBeenCalled();
    expect(dbOf().tables.entity_images![0]).toMatchObject({ license: 'cc_by', author: 'Mina', source_url: 'https://example.org/page', license_url: null, commons_file: null });
  });

  it('needs an author for CC BY and CC BY-SA only, and the five licences of the list only', async () => {
    const code = async (meta: unknown): Promise<number> => (await save(meta)).status;
    expect(await code({ license: 'cc_by' })).toBe(400);
    expect(await code({ license: 'cc_by_sa', author: ' ' })).toBe(400);
    expect(await code({ license: 'other' })).toBe(400);
    expect(await code({ license: 'own_photo', author: 'A' })).toBe(400);
    expect(await code({ license: 'licensed', author: 'A' })).toBe(400);
    expect(dbOf().tables.entity_images).toEqual([]);
    expect(await code({ license: 'cc0' })).toBe(200);
    expect(dbOf().tables.entity_images![0]).toMatchObject({ license: 'cc0', author: null, source_url: null });
    expect(await code({ license: 'public_domain' })).toBe(200);
    expect(await code({ license: 'other', license_note: 'GFDL' })).toBe(200);
    expect(commons).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/photos/fetch with info: the Commons read that pre-fills the form', () => {
  it('pre-fills the form from a Commons address, and says nothing for another address', async () => {
    const res = await fetchModule.POST(json('/api/admin/photos/fetch', { url: PAGE, info: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      commons: { file: 'File:A.jpg', pageUrl: PAGE, license: 'cc_by_sa', licenseLabel: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', author: 'Jane Doe', note: null },
    });
    const other = await fetchModule.POST(json('/api/admin/photos/fetch', { url: 'https://example.org/a.jpg', info: true }));
    expect(await other.json()).toEqual({ ok: true, commons: null });
    expect(commons).toHaveBeenCalledTimes(1);
    expect(state.remote).toEqual([]);
  });

  it('refuses a file that is not free and is a 404 off the admin', async () => {
    commons.mockImplementation(async () => commonsResponse({ nonFree: true }));
    expect((await fetchModule.POST(json('/api/admin/photos/fetch', { url: PAGE, info: true }))).status).toBe(422);
    state.user = null;
    expect((await fetchModule.POST(json('/api/admin/photos/fetch', { url: PAGE, info: true }))).status).toBe(404);
    state.user = { id: 'admin-1' };
    state.site = 'kpop';
    expect((await fetchModule.POST(json('/api/admin/photos/fetch', { url: PAGE, info: true }))).status).toBe(404);
  });
});

describe('POST /api/admin/photos/fetch, with a Commons address', () => {
  it('looks the file up first, then downloads the picture Commons names', async () => {
    const res = await fetchModule.POST(json('/api/admin/photos/fetch', { url: PAGE }));
    expect(res.status).toBe(200);
    expect(state.remote).toEqual(['https://upload.wikimedia.org/wikipedia/commons/a/ab/A.jpg']);
  });

  it('never downloads a file that is not free', async () => {
    commons.mockImplementation(async () => commonsResponse({ nonFree: true }));
    expect((await fetchModule.POST(json('/api/admin/photos/fetch', { url: PAGE }))).status).toBe(422);
    expect(state.remote).toEqual([]);
  });

  it('downloads any other address as it was', async () => {
    expect((await fetchModule.POST(json('/api/admin/photos/fetch', { url: 'https://example.org/a.jpg' }))).status).toBe(200);
    expect(state.remote).toEqual(['https://example.org/a.jpg']);
    expect(commons).not.toHaveBeenCalled();
  });
});
