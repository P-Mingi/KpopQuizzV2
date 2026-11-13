// Lot 3 DLE: the owner's private preview routes. 404 for a visitor, another account, an admin below aal2, every build but the hub, and every
// value of PRIVATE_LAUNCH but 1 (the hard cut); the bytes only for a selected row; every header private and no-store.
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { nonFreeFake } from '@/lib/entity-images/non-free-fake';

import type { NonFreeFake } from '@/lib/entity-images/non-free-fake';

const state = vi.hoisted(() => ({ site: 'hub', user: null as { id: string } | null, aal: 'aal2' as 'aal1' | 'aal2', db: null as unknown }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user, aal: state.aal })) }),
  createServiceRoleClient: () => state.db,
}));

import { GET as index, POST as indexPost } from './route';
import { GET as image, POST as imagePost } from './img/route';

const BASE = 'http://localhost:3000';
const OFFICIAL = 'Official artwork, rights belong to the original creators and studio';
const row = (id: number, slug: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id, site_id: 'anime', kind: 'character', slug, path: `anime/character/${slug}/h${id}.webp`, thumb_path: null, license: 'other', license_note: OFFICIAL, source_url: null,
  created_at: '2026-11-11T21:10:00+00:00', license_verified: false, ...over,
});

let png: Uint8Array;
let db: NonFreeFake;
const dbOf = (): NonFreeFake => state.db as NonFreeFake;
const img = (id: string | null, s?: string): Promise<Response> => image(new NextRequest(`${BASE}/api/admin/dle-preview/img${id === null ? '' : `?id=${encodeURIComponent(id)}`}${s ? `&s=${s}` : ''}`));

beforeEach(async () => {
  png = new Uint8Array(await sharp({ create: { width: 360, height: 480, channels: 3, background: { r: 200, g: 40, b: 40 } } }).webp().toBuffer());
  const rows = [
    row(1, 'one-piece/luffy'),
    row(2, 'one-piece/zoro', { license: 'cc0', license_note: null, source_url: 'https://onepiece.fandom.com/wiki/Zoro', created_at: '2026-10-01T00:00:00+00:00' }),
    row(3, 'one-piece/sanji', { license_verified: true }),
    row(4, 'one-piece/nami', { license: 'cc0', license_note: null, source_url: 'https://commons.wikimedia.org/wiki/File:Nami.png' }),
    row(5, 'one-piece/usopp', { created_at: '2026-11-12T10:00:00+00:00' }),
  ];
  db = nonFreeFake(rows, rows.map((r) => ({ name: r.path as string, createdAt: '2026-11-11T21:10:00+00:00', bytes: png })), {
    groups: [{ id: 1, slug: 'one-piece', site_id: 'anime' }, { id: 2, slug: 'bts', site_id: 'kpop' }],
    characters: [{ id: 11, group_id: 1, slug: 'luffy' }, { id: 12, group_id: 1, slug: 'zoro' }, { id: 13, group_id: 1, slug: 'sanji' }, { id: 14, group_id: 1, slug: 'nami' }, { id: 15, group_id: 1, slug: 'usopp' }, { id: 99, group_id: 2, slug: 'luffy' }],
  });
  state.db = db;
  state.site = 'hub';
  state.user = { id: 'admin-1' };
  state.aal = 'aal2';
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  vi.stubEnv('PRIVATE_LAUNCH', '1');
  vi.stubEnv('PRIVATE_LAUNCH_ALLOW', '');
  vi.stubEnv('PRIVATE_LAUNCH_KEY', '');
});

const ALL: Array<[string, () => Promise<Response>]> = [
  ['GET index', () => index()],
  ['GET image', () => img('11')],
];

describe('the gate: 404 for everyone but the verified admin, on the hub, with PRIVATE_LAUNCH=1', () => {
  for (const [name, call] of ALL) {
    it(`${name}: an admin gets 200`, async () => {
      expect((await call()).status).toBe(200);
    });

    it(`${name}: a visitor gets the plain 404 and the database is not touched`, async () => {
      state.user = null;
      const res = await call();
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Not found.', code: 'not_found' });
      expect(dbOf().calls).toEqual([]);
    });

    it(`${name}: another signed-in account gets 404`, async () => {
      state.user = { id: 'someone-else' };
      expect((await call()).status).toBe(404);
      expect(dbOf().calls).toEqual([]);
    });

    it(`${name}: an admin below aal2 gets 404`, async () => {
      state.aal = 'aal1';
      expect((await call()).status).toBe(404);
      expect(dbOf().calls).toEqual([]);
    });

    for (const site of ['kpop', 'anime']) {
      it(`${name}: the ${site} build gets 404, an admin included`, async () => {
        state.site = site;
        expect((await call()).status).toBe(404);
        expect(dbOf().calls).toEqual([]);
      });
    }

    for (const value of [undefined, '', '0', 'false', 'off', 'no', 'true', 'yes', '2', ' 10 ']) {
      it(`${name}: PRIVATE_LAUNCH=${JSON.stringify(value)} is the hard cut, an admin included`, async () => {
        if (value === undefined) vi.stubEnv('PRIVATE_LAUNCH', undefined as unknown as string); else vi.stubEnv('PRIVATE_LAUNCH', value);
        const res = await call();
        expect(res.status).toBe(404);
        expect(dbOf().calls).toEqual([]);
        expect(dbOf().removed).toEqual([]);
      });
    }

    it(`${name}: a 404 is also private and never stored`, async () => {
      state.user = null;
      const res = await call();
      expect(res.headers.get('cache-control')).toMatch(/no-store/);
      expect(res.headers.get('cache-control')).not.toMatch(/public|s-maxage/);
    });
  }

  it('PRIVATE_LAUNCH=1 with spaces still counts as 1', async () => {
    vi.stubEnv('PRIVATE_LAUNCH', ' 1 ');
    expect((await index()).status).toBe(200);
  });

  it('every other method answers 404', async () => {
    expect((await indexPost()).status).toBe(404);
    expect((await imagePost()).status).toBe(404);
  });
});

describe('GET /api/admin/dle-preview', () => {
  it('lists the selected entity ids and nothing else: no path, no address, no licence', async () => {
    const res = await index();
    const body = await res.json();
    expect(body).toEqual({ ok: true, ids: ['11', '12'] });
    expect(JSON.stringify(body)).not.toMatch(/anime|character|https?:|license|luffy/);
  });

  it('is private, never stored, never indexed', async () => {
    const h = (await index()).headers;
    expect(h.get('cache-control')).toBe('private, no-store, no-cache, max-age=0, must-revalidate');
    expect(h.get('vary')).toMatch(/cookie/i);
    expect(h.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(h.get('referrer-policy')).toBe('no-referrer');
  });
});

describe('GET /api/admin/dle-preview/img', () => {
  it('serves the bytes of a selected picture, the 1x file for full and a 96 px tile otherwise, with private headers', async () => {
    const full = await img('11', 'full');
    expect(full.status).toBe(200);
    expect(full.headers.get('content-type')).toBe('image/webp');
    expect(full.headers.get('cache-control')).toBe('private, no-store, no-cache, max-age=0, must-revalidate');
    expect(full.headers.get('x-content-type-options')).toBe('nosniff');
    expect(full.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(full.headers.get('etag')).toBeNull();
    const m = await sharp(Buffer.from(await full.arrayBuffer())).metadata();
    expect([m.width, m.height]).toEqual([360, 480]);
    const tile = await sharp(Buffer.from(await (await img('12')).arrayBuffer())).metadata();
    expect([tile.format, tile.width, tile.height]).toEqual(['webp', 96, 128]);
  });

  it('is the plain 404 for a picture that is not selected: verified, from Commons, another date, another site, unknown', async () => {
    for (const id of ['13', '14', '15', '99', '404']) {
      const res = await img(id);
      expect(res.status, id).toBe(404);
      expect(res.headers.get('content-type')).toMatch(/json/);
    }
    expect(dbOf().calls.filter((c) => c.startsWith('list') || c.startsWith('remove'))).toEqual([]);
  });

  it('is the plain 404 for an id that is not shaped like a character id, and reads nothing', async () => {
    for (const id of [null, '', '0', '011', '-1', '1.5', '1e3', '11/12', 'one-piece/luffy', '../etc/passwd', '11 ', '12345678901', 'NaN']) {
      expect((await img(id)).status, String(id)).toBe(404);
    }
    expect(dbOf().calls.filter((c) => c.startsWith('from'))).toEqual([]);
  });

  it('never redirects to, nor names, a public address of the bucket', async () => {
    const res = await img('11', 'full');
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    expect([...res.headers.values()].join(' ')).not.toMatch(/storage\/v1|supabase/);
  });
});
