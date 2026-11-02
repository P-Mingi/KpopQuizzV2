// CR-021 (owner decision of 2026-11-02): the Images tab of the anime admin (upload and import) obeys the same Commons rule as the Photos tab: a
// Commons address is read on Commons (the licence and the author win over what was typed, a file that is not free is refused with nothing stored),
// the licence is one of the five free ones, and a Commons file page is downloaded as the picture Commons names. The Commons API is a stub.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GOOD_META, animeSeed, fakeDb, makeImage } from '@/lib/entity-images/test-support';
import { commonsResponse } from '@/lib/photos/test-support';

import type { FakeDb } from '@/lib/entity-images/test-support';

const state = vi.hoisted(() => ({ db: null as unknown, remoteCalls: [] as string[] }));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), SITE_ID: 'anime' }));
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: { id: 'admin-1' } })) }),
  createServiceRoleClient: () => state.db,
}));
vi.mock('@/lib/entity-images/fetch-remote', async (orig) => ({
  ...(await orig<typeof import('@/lib/entity-images/fetch-remote')>()),
  fetchRemoteImage: async (url: string) => { state.remoteCalls.push(url); return makeImage(1000, 1400, 'png'); },
}));

import { POST as importUrl } from './import/route';
import { POST as upload } from './upload/route';

const BASE = 'http://localhost:3021';
const PAGE = 'https://commons.wikimedia.org/wiki/File:A.jpg';
const dbOf = (): FakeDb => state.db as FakeDb;
let commons: ReturnType<typeof vi.fn>;

const json = (body: unknown): NextRequest => new NextRequest(`${BASE}/api/admin/images/import`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin: BASE } });
async function form(meta: unknown): Promise<NextRequest> {
  const f = new FormData();
  f.set('kind', 'series');
  f.set('slug', 'death-note');
  f.set('meta', JSON.stringify(meta));
  f.set('file', new File([new Uint8Array(await makeImage(1000, 1400, 'png'))], 'a.png', { type: 'image/png' }));
  return new NextRequest(`${BASE}/api/admin/images/upload`, { method: 'POST', body: f, headers: { origin: BASE } });
}

beforeEach(() => {
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  state.db = fakeDb(animeSeed());
  state.remoteCalls = [];
  commons = vi.fn(async () => commonsResponse());
  vi.stubGlobal('fetch', commons);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('import with a Commons address', () => {
  it('downloads the picture Commons names and stores the licence and the author Commons gives', async () => {
    const res = await importUrl(json({ kind: 'series', slug: 'death-note', url: PAGE, meta: { ...GOOD_META, license: 'cc0', author: 'Typed' } }));
    expect(res.status).toBe(200);
    expect(state.remoteCalls).toEqual(['https://upload.wikimedia.org/wikipedia/commons/a/ab/A.jpg']);
    expect(dbOf().tables.entity_images![0]).toMatchObject({ license: 'cc_by_sa', author: 'Jane Doe', source_url: PAGE, commons_file: 'File:A.jpg', license_url: 'https://creativecommons.org/licenses/by-sa/4.0' });
  });

  it('refuses a file that is not free before downloading anything', async () => {
    commons.mockImplementation(async () => commonsResponse({ nonFree: true }));
    const res = await importUrl(json({ kind: 'series', slug: 'death-note', url: PAGE, meta: GOOD_META }));
    expect([res.status, ((await res.json()) as { code: string }).code]).toEqual([422, 'not_free']);
    expect(state.remoteCalls).toEqual([]);
    expect(dbOf().tables.entity_images).toEqual([]);
  });

  it('another address is downloaded as it is and keeps the owner\'s licence, with no call to Commons', async () => {
    expect((await importUrl(json({ kind: 'series', slug: 'death-note', url: 'https://x.test/a.png', meta: GOOD_META }))).status).toBe(200);
    expect(state.remoteCalls).toEqual(['https://x.test/a.png']);
    expect(commons).not.toHaveBeenCalled();
    expect(dbOf().tables.entity_images![0]).toMatchObject({ license: 'cc_by', author: 'Jane Doe', commons_file: null });
  });

  it('refuses the two licences that are not on the list', async () => {
    for (const license of ['own_photo', 'licensed']) {
      const res = await importUrl(json({ kind: 'series', slug: 'death-note', url: 'https://x.test/a.png', meta: { ...GOOD_META, license } }));
      expect(res.status, license).toBe(400);
    }
    expect(state.remoteCalls).toEqual([]);
  });
});

describe('upload with a Commons source page', () => {
  it('reads Commons for the source page, whatever licence was typed', async () => {
    const res = await upload(await form({ ...GOOD_META, source_url: PAGE, license: 'cc0', author: 'Typed' }));
    expect(res.status).toBe(200);
    expect(dbOf().tables.entity_images![0]).toMatchObject({ license: 'cc_by_sa', author: 'Jane Doe', commons_file: 'File:A.jpg' });
  });

  it('refuses a source page that is not free and stores nothing', async () => {
    commons.mockImplementation(async () => commonsResponse({ license: 'cc-by-nc-4.0', short: 'CC BY-NC 4.0' }));
    expect((await upload(await form({ ...GOOD_META, source_url: PAGE }))).status).toBe(422);
    expect(dbOf().tables.entity_images).toEqual([]);
    expect(dbOf().files.size).toBe(0);
  });
});
