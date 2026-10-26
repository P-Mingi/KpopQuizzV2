// Run O1, lane ADM back: the admin image routes on o1-dev with the dual fixture signed in (no browser: the routes are called with the
// session cookies a browser would send). Needs an anime server on o1-dev whose ADMIN_USER_IDS holds the dual fixture's id:
//
//   scripts/o1/env.sh dev -- env NEXT_PUBLIC_SITE_ID=anime SITE_SCOPE=1 ADMIN_USER_IDS=<id of the dual fixture> npx next dev -p <port> -H 127.0.0.1   (in apps/quiz)
//   scripts/o1/env.sh dev -- env O1_ADM_URL=http://127.0.0.1:<port> npx playwright test -c playwright.o1.config.ts e2e/o1/ADM/images-api.o1.ts --project=lanes
//
// Without O1_ADM_URL the suite skips itself. What it covers: a visitor and a non-admin get 404; upload (series and character), the
// stored WebP at the fixed sizes with no EXIF, the public URL, focal point, import by URL (our own bucket address as the source; a
// private address, localhost and http refused), the list, delete (row and files gone), and the grants of the table for the browser roles.
// Writes o1-dev through the routes (service role inside the app); everything it creates is removed again, also when a step fails.
// Prints outcomes only: never a key, a link, a token or a cookie.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test';
import sharp from 'sharp';

const BASE = (process.env.O1_ADM_URL ?? '').replace(/\/+$/, '');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PROD_REF = 'rdkgouofytwfdpbxbzio';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

const missing = [!BASE && 'O1_ADM_URL', !SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL', !ANON && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !SERVICE && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean) as string[];
test.skip(missing.length > 0, `needs ${missing.join(', ')}`);
test.describe.configure({ mode: 'serial' });

const META = { source_url: 'https://unsplash.com/photos/e2e-test', author: 'E2E Tester', license: 'cc_by', license_note: null };
const SERIES_A = 'death-note';
const SERIES_B = 'one-piece';
const CHARACTER = 'death-note/light-yagami';

async function picture(w: number, h: number): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 120, b: 200 } } })
    .jpeg().withExif({ IFD0: { Copyright: 'e2e-secret-owner' } }).toBuffer();
}

async function adminCookie(): Promise<string> {
  expect(SUPABASE_URL.includes(PROD_REF), 'the run must never point at production').toBe(false);
  const list = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/o1/fixtures-dev.json'), 'utf8')).users as Array<{ key: string; email: string }>;
  const dual = list.find((u) => u.key === 'dual');
  expect(dual, 'fixture dual').toBeTruthy();
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: dual!.email });
  expect(link.error, 'sign-in link for the fixture').toBeNull();
  const jar = new Map<string, string>();
  const ssr = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (l) => { for (const c of l) { if (c.value) jar.set(c.name, c.value); else jar.delete(c.name); } },
    },
  });
  const signed = await ssr.auth.verifyOtp({ type: 'email', token_hash: link.data.properties!.hashed_token });
  expect(signed.error, 'session of the fixture').toBeNull();
  return [...jar].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ');
}

let api: APIRequestContext;
let visitor: APIRequestContext;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- an untyped client, as the app's
let db: ReturnType<typeof createClient<any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the routes' JSON
const jsonOf = async (r: { json(): Promise<unknown> }): Promise<any> => r.json();

const upload = (kind: string, slug: string, file: Buffer, meta: unknown = META): ReturnType<APIRequestContext['post']> =>
  api.post('/api/admin/images/upload', { multipart: { kind, slug, meta: JSON.stringify(meta), file: { name: 'e2e.jpg', mimeType: 'image/jpeg', buffer: file } } });

test.beforeAll(async () => {
  const cookie = await adminCookie();
  api = await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { cookie, origin: BASE } });
  visitor = await pwRequest.newContext({ baseURL: BASE });
  db = createClient<any>(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } }); // eslint-disable-line @typescript-eslint/no-explicit-any
});

test.afterAll(async () => {
  // Whatever happened, the rows this suite may have made are removed through the app (it removes the files too).
  for (const [kind, slug] of [['series', SERIES_A], ['series', SERIES_B], ['character', CHARACTER]] as const) {
    await api?.delete('/api/admin/images', { data: { kind, slug } }).catch(() => undefined);
  }
  await api?.dispose();
  await visitor?.dispose();
});

test('a visitor gets 404 from every route', async () => {
  expect((await visitor.get('/api/admin/images/list?site=anime')).status()).toBe(404);
  expect((await visitor.post('/api/admin/images/import', { data: { kind: 'series', slug: SERIES_A, url: 'https://example.org/a.jpg', meta: META } })).status()).toBe(404);
  expect((await visitor.patch('/api/admin/images/focal', { data: { kind: 'series', slug: SERIES_A, x: 1, y: 1 } })).status()).toBe(404);
  expect((await visitor.delete('/api/admin/images', { data: { kind: 'series', slug: SERIES_A } })).status()).toBe(404);
});

test('the browser roles cannot write the table and read only the display columns', async () => {
  const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const ins = await anon.from('entity_images').insert({ site_id: 'anime', kind: 'series', slug: 'x', path: 'a/b.webp', width: 1, height: 1, source_url: 'https://x.test', author: 'a', license: 'cc0' });
  expect(ins.error, 'anon insert is refused').not.toBeNull();
  const star = await anon.from('entity_images').select('*');
  expect(star.error, 'select * is refused (column grants)').not.toBeNull();
  const cols = await anon.from('entity_images').select('slug, path, focal_x, focal_y, license, author, source_url, updated_at');
  expect(cols.error, 'the display columns are readable').toBeNull();
  const hidden = await anon.from('entity_images').select('created_by');
  expect(hidden.error, 'created_by is not readable').not.toBeNull();
});

test('list: the series of the anime site with counts', async () => {
  const res = await api.get('/api/admin/images/list?site=anime');
  expect(res.status()).toBe(200);
  const body = await jsonOf(res);
  expect(body.ok).toBe(true);
  expect(body.counts.series).toBeGreaterThanOrEqual(50);
  expect(body.counts.characters).toBeGreaterThanOrEqual(900);
  const dn = body.series.find((s: { slug: string }) => s.slug === SERIES_A);
  expect(dn.characters.some((c: { slug: string }) => c.slug === CHARACTER)).toBe(true);
  expect((await api.get('/api/admin/images/list?site=kpop')).status()).toBe(400);
});

test('upload: a series cover is stored as WebP at 736x981 and 1472x1962 with no EXIF', async () => {
  const res = await upload('series', SERIES_A, await picture(1400, 1800));
  expect(res.status()).toBe(200);
  const { image } = await jsonOf(res);
  expect(image).toMatchObject({ kind: 'series', slug: SERIES_A, width: 736, height: 981, focalX: 50, focalY: 50, license: 'cc_by', author: 'E2E Tester' });
  const one = await (await visitor.get(image.url)).body();
  const two = await (await visitor.get(image.url2x)).body();
  const m1 = await sharp(one).metadata();
  const m2 = await sharp(two).metadata();
  expect([m1.format, m1.width, m1.height, m1.exif]).toEqual(['webp', 736, 981, undefined]);
  expect([m2.format, m2.width, m2.height, m2.exif]).toEqual(['webp', 1472, 1962, undefined]);
  expect(one.includes(Buffer.from('e2e-secret-owner'))).toBe(false);
  const row = await db.from('entity_images').select('slug, path, created_by').eq('site_id', 'anime').eq('kind', 'series').eq('slug', SERIES_A).single();
  expect(row.data?.created_by, 'the uploader is recorded').toBeTruthy();
});

test('upload: a character portrait uses series/character and 360x480', async () => {
  const res = await upload('character', CHARACTER, await picture(900, 1200));
  expect(res.status()).toBe(200);
  expect((await jsonOf(res)).image).toMatchObject({ kind: 'character', slug: CHARACTER, width: 360, height: 480 });
});

test('upload refuses what it must', async () => {
  const bad = async (res: Awaited<ReturnType<typeof upload>>, status: number, code: string): Promise<void> => { expect(res.status()).toBe(status); expect((await jsonOf(res)).code).toBe(code); };
  await bad(await upload('series', SERIES_A, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')), 415, 'unsupported_type');
  await bad(await upload('series', SERIES_A, await picture(1400, 1800), { ...META, author: '' }), 400, 'bad_meta');
  await bad(await upload('series', SERIES_A, await picture(1400, 1800), { ...META, license: 'other' }), 400, 'bad_meta');
  await bad(await upload('series', 'no-such-series', await picture(1400, 1800)), 404, 'unknown_entity');
  await bad(await upload('series', SERIES_A, Buffer.alloc(8 * 1024 * 1024 + 100, 1)), 413, 'too_large');
});

test('focal point: saved, and the list shows it', async () => {
  const res = await api.patch('/api/admin/images/focal', { data: { kind: 'series', slug: SERIES_A, x: 30.5, y: 70 } });
  expect(res.status()).toBe(200);
  expect((await jsonOf(res)).image).toMatchObject({ focalX: 30.5, focalY: 70 });
  expect((await api.patch('/api/admin/images/focal', { data: { kind: 'series', slug: SERIES_A, x: 101, y: 0 } })).status()).toBe(400);
  expect((await api.patch('/api/admin/images/focal', { data: { kind: 'series', slug: SERIES_B, x: 1, y: 1 } })).status(), 'no upload on that series').toBe(404);
  const list = await jsonOf(await api.get('/api/admin/images/list'));
  expect(list.series.find((s: { slug: string }) => s.slug === SERIES_A).image).toMatchObject({ focalX: 30.5, focalY: 70 });
});

test('import by URL: our own bucket address is fetched and copied; unsafe addresses are refused', async () => {
  const list = await jsonOf(await api.get('/api/admin/images/list'));
  const source: string = list.series.find((s: { slug: string }) => s.slug === SERIES_A).image.url;
  const res = await api.post('/api/admin/images/import', { data: { kind: 'series', slug: SERIES_B, url: source, meta: META } });
  expect(res.status()).toBe(200);
  const { image } = await jsonOf(res);
  expect(image).toMatchObject({ slug: SERIES_B, width: 736, height: 981 });
  expect(image.url).toContain('/anime/series/one-piece/');
  expect((await visitor.get(image.url)).status()).toBe(200);
  for (const [url, code] of [
    ['http://example.org/a.jpg', 'bad_url'], ['https://localhost/a.jpg', 'blocked_address'], ['https://127.0.0.1/a.jpg', 'blocked_address'],
    ['https://169.254.169.254/latest/meta-data/', 'blocked_address'], ['https://[::1]/a.jpg', 'blocked_address'], ['https://10.0.0.1/a.jpg', 'blocked_address'],
    ['file:///etc/passwd', 'bad_url'],
  ] as const) {
    const r = await api.post('/api/admin/images/import', { data: { kind: 'series', slug: SERIES_B, url, meta: META } });
    expect([r.status(), (await jsonOf(r)).code], url).toEqual([400, code]);
  }
  const html = await api.post('/api/admin/images/import', { data: { kind: 'series', slug: SERIES_B, url: 'https://example.com/', meta: META } });
  expect([415, 502], 'a page that is not a picture').toContain(html.status());
});

test('delete: the row and the files are gone, and the list falls back', async () => {
  const before = await jsonOf(await api.get('/api/admin/images/list'));
  const urls: string[] = [before.series.find((s: { slug: string }) => s.slug === SERIES_A).image.url, before.series.find((s: { slug: string }) => s.slug === SERIES_B).image.url];
  for (const [kind, slug] of [['series', SERIES_A], ['series', SERIES_B], ['character', CHARACTER]] as const) {
    const res = await api.delete('/api/admin/images', { data: { kind, slug } });
    expect([res.status(), (await jsonOf(res)).ok], `${kind} ${slug}`).toEqual([200, true]);
  }
  for (const u of urls) expect((await visitor.get(u)).status(), 'the file is gone from the bucket').toBeGreaterThanOrEqual(400);
  const rows = await db.from('entity_images').select('slug').eq('site_id', 'anime').in('slug', [SERIES_A, SERIES_B, CHARACTER]);
  expect(rows.data).toEqual([]);
  expect((await api.delete('/api/admin/images/delete', { data: { kind: 'series', slug: SERIES_A } })).status()).toBe(404);
  const after = await jsonOf(await api.get('/api/admin/images/list'));
  expect(after.series.find((s: { slug: string }) => s.slug === SERIES_A).image).toBeNull();
});
