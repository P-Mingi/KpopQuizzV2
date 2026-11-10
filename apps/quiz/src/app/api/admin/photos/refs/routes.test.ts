// Lane charrefs (L32): POST /api/admin/photos/refs. The gate of the anime admin (404 for a visitor, a non-admin, an admin at aal1 is the
// guard's own test; any other build), same-origin writes only, and the four actions end to end on an in-memory database and private bucket.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { characterFiles, pictureBytes, putReference, refsFakeDb } from '@/lib/photos/character-refs-test-support';

import type { RefsFakeDb } from '@/lib/photos/character-refs-test-support';

const state = vi.hoisted(() => ({ site: 'anime', user: null as { id: string } | null, db: null as unknown }));
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user })) }),
  createServiceRoleClient: () => state.db,
}));

import * as refs from './route';

const BASE = 'http://localhost:3121';
const dbOf = (): RefsFakeDb => state.db as RefsFakeDb;
const CREDIT = { source_url: 'https://commons.wikimedia.org/wiki/File:Kohaku.png', author: 'Jane Doe', license: 'cc_by', license_url: '' };

function multipart(fields: Record<string, string | Uint8Array>, headers: Record<string, string> = { origin: BASE }): NextRequest {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, typeof v === 'string' ? v : new File([new Uint8Array(v)], `${k}.bin`));
  return new NextRequest(`${BASE}/api/admin/photos/refs`, { method: 'POST', body: f, headers });
}

async function candidateFields(color = { r: 10, g: 10, b: 200 }): Promise<Record<string, string | Uint8Array>> {
  const files = await characterFiles();
  return { action: 'candidate', series: 'inuyasha', character: 'kohaku', ...CREDIT, original: await pictureBytes(color), x1: files.x1, x2: files.x2, thumb: files.thumb };
}

beforeEach(() => {
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  state.site = 'anime';
  state.user = { id: 'admin-1' };
  state.db = refsFakeDb();
  revalidateTag.mockClear();
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('the gate', () => {
  const calls = async (): Promise<Array<() => Promise<Response>>> => {
    const cand = await candidateFields();
    return [
      () => refs.POST(multipart(cand)),
      () => refs.POST(multipart({ action: 'publish', series: 'inuyasha', character: 'kohaku', ...CREDIT })),
      () => refs.POST(multipart({ action: 'discard', series: 'inuyasha', character: 'kohaku' })),
      () => refs.POST(multipart({ action: 'sign', slugs: '["inuyasha/kohaku"]' })),
    ];
  };

  it('is a 404 for a visitor, a non-admin, and on any build but the anime one, and touches nothing', async () => {
    putReference(dbOf(), 'inuyasha', 'kohaku', await pictureBytes({ r: 200, g: 10, b: 10 }, 'jpeg'));
    const before = JSON.stringify(dbOf().tables.character_reference_images);
    for (const set of [() => { state.user = null; }, () => { state.user = { id: 'user-9' }; }, () => { state.site = 'hub'; }, () => { state.site = 'kpop'; }]) {
      set();
      for (const call of await calls()) expect((await call()).status).toBe(404);
      state.site = 'anime';
      state.user = { id: 'admin-1' };
    }
    expect(JSON.stringify(dbOf().tables.character_reference_images)).toBe(before);
    expect(dbOf().signed).toEqual([]);
    expect(dbOf().tables.entity_images).toEqual([]);
  });

  it('refuses a write from another site, and answers 404 to the other methods', async () => {
    const res = await refs.POST(multipart({ action: 'discard', series: 'inuyasha', character: 'kohaku' }, { origin: 'https://evil.example', host: 'localhost:3121' }));
    expect(res.status).toBe(403);
    for (const m of [refs.GET, refs.PUT, refs.DELETE, refs.PATCH]) expect((await (m as unknown as () => Promise<Response>)()).status).toBe(404);
  });
});

describe('the actions', () => {
  it('candidate, then publish: the picture is on the site, the reference is gone, the cache tag is expired', async () => {
    putReference(dbOf(), 'inuyasha', 'kohaku', await pictureBytes({ r: 200, g: 10, b: 10 }, 'jpeg'), { reference_license: 'fair use' });
    const saved = await refs.POST(multipart(await candidateFields()));
    expect(saved.status).toBe(200);
    expect(dbOf().tables.entity_images).toEqual([]);
    const published = await refs.POST(multipart({ action: 'publish', series: 'inuyasha', character: 'kohaku', ...CREDIT }));
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ ok: true, published: { slug: 'inuyasha/kohaku', referenceDeleted: true } });
    expect(dbOf().tables.entity_images).toHaveLength(1);
    expect(dbOf().tables.entity_images![0]).toMatchObject({ slug: 'inuyasha/kohaku', license: 'cc_by', license_verified: true });
    expect([...dbOf().blobs.keys()].filter((k) => k.startsWith('character-refs/'))).toEqual([]);
    expect(revalidateTag).toHaveBeenCalled();
  });

  it('answers 422 with the code when the publication is refused, and changes nothing', async () => {
    putReference(dbOf(), 'inuyasha', 'kohaku', await pictureBytes({ r: 200, g: 10, b: 10 }, 'jpeg'));
    await refs.POST(multipart(await candidateFields()));
    const fandom = await refs.POST(multipart({ action: 'publish', series: 'inuyasha', character: 'kohaku', ...CREDIT, source_url: 'https://static.wikia.nocookie.net/a/b.png' }));
    expect(fandom.status).toBe(422);
    expect(await fandom.json()).toMatchObject({ code: 'ref_source' });
    const none = await refs.POST(multipart({ action: 'publish', series: 'inuyasha', character: 'kohaku', ...CREDIT, license: '' }));
    expect(await none.json()).toMatchObject({ code: 'bad_license' });
    expect(dbOf().tables.entity_images).toEqual([]);
    expect([...dbOf().blobs.keys()].filter((k) => k.startsWith('character-refs/')).length).toBe(4);
  });

  it('refuses a candidate whose files do not come together, a bad slug and an unknown action', async () => {
    const cand = await candidateFields();
    delete cand.thumb;
    expect((await refs.POST(multipart(cand))).status).toBe(400);
    expect((await refs.POST(multipart({ action: 'discard', series: 'Inuyasha', character: '../x' }))).status).toBe(400);
    expect((await refs.POST(multipart({ action: 'wipe', series: 'inuyasha', character: 'kohaku' }))).status).toBe(400);
    expect((await refs.POST(multipart({ action: 'sign', slugs: '["x"]' }))).status).toBe(400);
  });

  it('signs previews for the rows named, 300 s at most', async () => {
    putReference(dbOf(), 'inuyasha', 'kohaku', await pictureBytes({ r: 200, g: 10, b: 10 }, 'jpeg'));
    const res = await refs.POST(multipart({ action: 'sign', slugs: '["inuyasha/kohaku"]' }));
    const body = await res.json() as { previews: Record<string, { reference: string | null }> };
    expect(body.previews['inuyasha/kohaku']?.reference).toContain('https://signed.example/character-refs/');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(dbOf().signed.every((s) => s.seconds <= 300)).toBe(true);
  });

  it('discards a candidate', async () => {
    await refs.POST(multipart(await candidateFields()));
    const res = await refs.POST(multipart({ action: 'discard', series: 'inuyasha', character: 'kohaku' }));
    expect(res.status).toBe(200);
    expect([...dbOf().blobs.keys()]).toEqual([]);
  });
});
