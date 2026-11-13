// Lot 3 DLE: POST /api/admin/images/non-free. The admin gate (404 for everyone else), the same-origin rule, the preview, and the deletion with
// its refusals: wrong word, counts that differ from the preview, and more than 1,100 rows.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NON_FREE_CONFIRM } from '@/lib/entity-images/non-free';
import { nonFreeFake } from '@/lib/entity-images/non-free-fake';

import type { NonFreeFake } from '@/lib/entity-images/non-free-fake';

const state = vi.hoisted(() => ({ site: 'anime', user: null as { id: string } | null, db: null as unknown }));
const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user })) }),
  createServiceRoleClient: () => state.db,
}));

import { GET, POST } from './route';

const BASE = 'http://localhost:3021';
const OFFICIAL = 'Official artwork, rights belong to the original creators and studio';
const row = (id: number, slug: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id, site_id: 'anime', kind: 'character', slug, path: `anime/character/${slug}/h${id}.webp`, thumb_path: null, license: 'other', license_note: OFFICIAL, source_url: null,
  created_at: '2026-11-11T21:10:00+00:00', license_verified: false, ...over,
});
const post = (body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(`${BASE}/api/admin/images/non-free`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin: BASE, ...headers } });
const dbOf = (): NonFreeFake => state.db as NonFreeFake;

beforeEach(() => {
  const rows = [row(1, 'one-piece/luffy'), row(2, 'naruto/sasuke'), row(3, 'naruto/kakashi', { license_verified: true }), row(4, 'bleach/rukia', { created_at: '2026-11-10T21:10:00+00:00' })];
  state.db = nonFreeFake(rows, [
    ...rows.flatMap((r) => [{ name: r.path as string, createdAt: '2026-11-11T21:10:00+00:00' }, { name: (r.path as string).replace('.webp', '-2x.webp'), createdAt: '2026-11-11T21:10:00+00:00' }]),
    { name: 'anime/character/bleach/orphan/o.webp', createdAt: '2026-11-11T21:20:00+00:00' },
  ]);
  state.site = 'anime';
  state.user = { id: 'admin-1' };
  revalidateTag.mockClear();
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
});

describe('the gate', () => {
  const calls: Array<[string, () => Promise<Response>]> = [
    ['preview', () => POST(post({ action: 'preview' }))],
    ['delete', () => POST(post({ action: 'delete', confirm: NON_FREE_CONFIRM, expect: { rows: 2, files: 4, orphans: 1 } }))],
  ];
  for (const [name, call] of calls) {
    it(`${name}: a visitor gets 404 and nothing is read or removed`, async () => {
      state.user = null;
      expect((await call()).status).toBe(404);
      expect(dbOf().calls).toEqual([]);
    });
    it(`${name}: another account gets 404`, async () => {
      state.user = { id: 'someone-else' };
      expect((await call()).status).toBe(404);
      expect(dbOf().calls).toEqual([]);
    });
    for (const site of ['kpop', 'hub']) {
      it(`${name}: the ${site} build gets 404`, async () => {
        state.site = site;
        expect((await call()).status).toBe(404);
        expect(dbOf().calls).toEqual([]);
      });
    }
  }
  it('another method is a 404, and a write from another site is a 403', async () => {
    expect((await GET()).status).toBe(404);
    expect((await POST(post({ action: 'preview' }, { origin: 'https://evil.example', host: 'localhost:3021' }))).status).toBe(403);
    expect(dbOf().calls).toEqual([]);
  });
});

describe('preview', () => {
  it('answers the counts and the examples, writes nothing, and is never cached', async () => {
    const res = await POST(post({ action: 'preview' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, counts: { rows: 2, files: 4, orphans: 1 }, tooMany: false, max: 1100 });
    expect(body.examples).toEqual([{ slug: 'one-piece/luffy', license: 'other', why: 'Official artwork' }, { slug: 'naruto/sasuke', license: 'other', why: 'Official artwork' }]);
    expect(dbOf().rows).toHaveLength(4);
    expect(dbOf().removed).toEqual([]);
  });

  it('an unknown action is a 400', async () => {
    expect((await POST(post({ action: 'purge' }))).status).toBe(400);
  });
});

describe('delete', () => {
  it('needs the word SUPPRIMER and refuses anything else', async () => {
    for (const confirm of [undefined, '', 'supprimer', 'SUPPRIMER ', 'oui']) {
      const res = await POST(post({ action: 'delete', confirm, expect: { rows: 2, files: 4, orphans: 1 } }));
      expect(res.status, String(confirm)).toBe(400);
      expect((await res.json()).code).toBe('bad_confirm');
    }
    expect(dbOf().rows).toHaveLength(4);
  });

  it('refuses counts that differ from the preview with a 409, and deletes nothing', async () => {
    const res = await POST(post({ action: 'delete', confirm: NON_FREE_CONFIRM, expect: { rows: 3, files: 4, orphans: 1 } }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('count_changed');
    expect(dbOf().rows).toHaveLength(4);
    expect(dbOf().removed).toEqual([]);
  });

  it('refuses a body with no counts (a list sent by the browser is never trusted: only counts are read)', async () => {
    const res = await POST(post({ action: 'delete', confirm: NON_FREE_CONFIRM, rows: [3, 4], paths: ['anime/character/naruto/kakashi/h3.webp'] }));
    expect(res.status).toBe(400);
    expect(dbOf().rows).toHaveLength(4);
    expect(dbOf().removed).toEqual([]);
  });

  it('deletes the two rows, their four files and the orphan, and says what went', async () => {
    const res = await POST(post({ action: 'delete', confirm: NON_FREE_CONFIRM, expect: { rows: 2, files: 4, orphans: 1 } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, report: { rows: 2, files: 4, orphans: 1, failedChunks: 0 } });
    expect(dbOf().rows.map((r) => r.slug).sort()).toEqual(['bleach/rukia', 'naruto/kakashi']);
    expect(dbOf().removed.sort()).toEqual([
      'anime/character/bleach/orphan/o.webp', 'anime/character/naruto/sasuke/h2-2x.webp', 'anime/character/naruto/sasuke/h2.webp',
      'anime/character/one-piece/luffy/h1-2x.webp', 'anime/character/one-piece/luffy/h1.webp',
    ]);
    expect(revalidateTag).toHaveBeenCalled();
  });
});
