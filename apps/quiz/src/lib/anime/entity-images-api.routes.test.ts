// Run O1 (ADM join): the typed client of the admin UI (lib/anime/entity-images-api.ts) against the REAL route handlers of part 1
// (app/api/admin/images/**), on the in-memory database and bucket of part 1's tests. Nothing here is a mock of the contract: the fetch the
// client is given builds a NextRequest and calls the route's own GET / POST / PATCH / DELETE, so a path, a method, a content type, a field
// or an answer that does not match fails here. Then: the UI's local update equals the server's list, what the display reads is what the
// admin wrote (url and 2x file), and every cache the display reads is expired by a write.
import { readFileSync } from 'node:fs';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GOOD_META, animeSeed, fakeDb, makeImage } from '@/lib/entity-images/test-support';

import type { FakeDb } from '@/lib/entity-images/test-support';
import type { FetchLike, XhrLike } from './entity-images-api';
import type { AdminSeries, ImageMeta } from './entity-images-rules';

const BASE = 'http://localhost:3021';
const SUPABASE = 'https://proj.supabase.co';
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE);

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  db: null as unknown,
  remote: null as null | ((url: string) => Promise<Buffer>),
  caches: [] as Array<{ keys: string[]; tags: string[] }>,
}));
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({
  revalidateTag,
  unstable_cache: (fn: unknown, keys: string[], opts?: { tags?: string[] }) => { state.caches.push({ keys, tags: opts?.tags ?? [] }); return fn; },
}));
// ADMIN-1: the auth stand-in of lib/admin/test-support.ts (getSession, getUser, the assurance level: aal2 by default).
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user })) }),
  createServiceRoleClient: () => state.db,
  createPublicReadClient: () => state.db,
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), SITE_ID: 'anime' }));
vi.mock('@/lib/entity-images/fetch-remote', async (orig) => ({
  ...(await orig<typeof import('@/lib/entity-images/fetch-remote')>()),
  fetchRemoteImage: async (url: string) => { if (!state.remote) throw new Error('unexpected network'); return state.remote(url); },
}));

import { DELETE as deleteRoot } from '@/app/api/admin/images/route';
import { PATCH as focalRoute } from '@/app/api/admin/images/focal/route';
import { POST as importRoute } from '@/app/api/admin/images/import/route';
import { GET as listRoute } from '@/app/api/admin/images/list/route';
import { POST as uploadRoute } from '@/app/api/admin/images/upload/route';
import { IMAGES_API, importImage, listImages, removeImage, saveFocal, uploadImage } from './entity-images-api';
import { loadEntityImageRows } from './entity-images-read';
import { ownerPictureOf, withImage } from './entity-images-rules';

const dbOf = (): FakeDb => state.db as FakeDb;
const META: ImageMeta = { source_url: GOOD_META.source_url, author: GOOD_META.author, license: 'cc_by', license_note: '' };

type Handler = (req: NextRequest) => Promise<Response>;
const ROUTES: Record<string, Handler> = {
  'GET /api/admin/images/list': listRoute as Handler,
  'POST /api/admin/images/import': importRoute as Handler,
  'PATCH /api/admin/images/focal': focalRoute as Handler,
  'DELETE /api/admin/images': deleteRoot as Handler,
};

/** The browser's fetch, answered by the route of the same path and method (a path or method no route has is the 404 a server would give). */
function routedFetch(opts: { origin?: string | null; sent?: Array<{ method: string; path: string; headers: Record<string, string> }> } = {}): FetchLike {
  return async (input, init) => {
    const method = init?.method ?? 'GET';
    const url = new URL(input, BASE);
    const headers: Record<string, string> = { ...(init?.headers ?? {}) };
    if (method !== 'GET' && opts.origin !== null) headers.origin = opts.origin ?? BASE; // a browser sends Origin on a same-origin write
    opts.sent?.push({ method, path: url.pathname, headers });
    const handler = ROUTES[`${method} ${url.pathname}`];
    const res = handler ? await handler(new NextRequest(url, { method, headers, body: init?.body ?? null })) : new Response('{}', { status: 404 });
    return { ok: res.ok, status: res.status, json: () => res.json() };
  };
}

/** The browser's XMLHttpRequest, answered by the upload route. */
class RoutedXhr implements XhrLike {
  status = 0;
  responseText = '';
  upload: XhrLike['upload'] = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private method = '';
  private url = '';
  open(method: string, url: string): void { this.method = method; this.url = url; }
  send(body: unknown): void {
    void (async () => {
      const handler = ROUTES[`${this.method} ${this.url}`] ?? (this.method === 'POST' && this.url === IMAGES_API.upload ? (uploadRoute as Handler) : null);
      const res = handler ? await handler(new NextRequest(`${BASE}${this.url}`, { method: this.method, body: body as FormData, headers: { origin: BASE } })) : new Response('{}', { status: 404 });
      this.status = res.status;
      this.responseText = await res.text();
      this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 1 });
      this.onload?.();
    })();
  }
  abort(): void { this.onabort?.(); }
}
const upload = (args: { kind: 'series' | 'character'; slug: string; file: File; meta?: ImageMeta }, seen: number[] = []) =>
  uploadImage({ kind: args.kind, slug: args.slug, file: args.file, meta: args.meta ?? META }, (p) => seen.push(p), { makeXhr: () => new RoutedXhr() }).result;
const picture = async (w = 1000, h = 1400): Promise<File> => new File([new Uint8Array(await makeImage(w, h, 'png'))], 'whatever.png', { type: 'image/png' });

beforeEach(() => {
  state.user = { id: 'admin-1' };
  state.db = fakeDb(animeSeed());
  state.remote = null;
  revalidateTag.mockClear();
  process.env.ADMIN_USER_IDS = 'admin-1';
});

describe('the client against the real routes', () => {
  it('lists the series of the anime site with their characters, in the shape the UI is typed with', async () => {
    const sent: Array<{ method: string; path: string; headers: Record<string, string> }> = [];
    const r = await listImages(routedFetch({ sent }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(sent[0]).toMatchObject({ method: 'GET', path: '/api/admin/images/list' });
    expect(r.value.map((s) => s.slug)).toEqual(['death-note', 'one-piece']);
    const dn = r.value[0]!;
    expect(dn).toMatchObject({ name: 'Death Note', published: true, image: null, source: 'bundled', characterCount: 2, characterImageCount: 0 });
    expect(dn.bundled).toMatchObject({ url: expect.stringMatching(/^\/series\//), alt: expect.any(String) });
    // The slug of a listed character is already the key every other route takes.
    expect(dn.characters.map((c) => c.slug)).toEqual(['death-note/light-yagami', 'death-note/l']);
    expect(dn.characters[0]).toMatchObject({ name: 'Light Yagami', role: 'main', status: 'published', image: null });
  });

  it('uploads a file through the multipart route: the answer is the image, with its own url and 2x file', async () => {
    const seen: number[] = [];
    const r = await upload({ kind: 'series', slug: 'death-note', file: await picture() }, seen);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ kind: 'series', slug: 'death-note', width: 736, height: 981, focalX: 50, focalY: 50, license: 'cc_by', author: 'Jane Doe', sourceUrl: 'https://unsplash.com/photos/abc', licenseNote: null });
    expect(r.value.url).toMatch(new RegExp(`^${SUPABASE}/storage/v1/object/public/entity-images/anime/series/death-note/[0-9a-f]{16}\\.webp$`));
    expect(r.value.url2x).toBe(r.value.url.replace(/\.webp$/, '-2x.webp'));
    expect(seen.at(-1)).toBe(100);
    expect(dbOf().files.size).toBe(2);
  });

  it('imports an address through the JSON route (the content type is the one the route demands)', async () => {
    state.remote = async () => makeImage(1200, 1600, 'jpeg');
    const sent: Array<{ method: string; path: string; headers: Record<string, string> }> = [];
    const r = await importImage(routedFetch({ sent }), { kind: 'series', slug: 'one-piece', url: ' https://images.example.org/p.jpg ', meta: META });
    expect(r).toMatchObject({ ok: true, value: { kind: 'series', slug: 'one-piece' } });
    expect(sent[0]).toMatchObject({ method: 'POST', path: '/api/admin/images/import' });
    expect(sent[0]!.headers['content-type']).toBe('application/json');
    if (r.ok) expect(JSON.stringify(r.value)).not.toContain('images.example.org');
  });

  it('sets the focal point of a character and removes the image, by the routes the client names', async () => {
    const f = routedFetch();
    const up = await upload({ kind: 'character', slug: 'death-note/light-yagami', file: await picture(700, 900) });
    expect(up).toMatchObject({ ok: true, value: { width: 360, height: 480 } });
    const moved = await saveFocal(f, { kind: 'character', slug: 'death-note/light-yagami', x: 30, y: 70 });
    expect(moved).toMatchObject({ ok: true, value: { focalX: 30, focalY: 70 } });
    const gone = await removeImage(f, { kind: 'character', slug: 'death-note/light-yagami' });
    expect(gone).toMatchObject({ ok: true, value: { slug: 'death-note/light-yagami', focalX: 30 } });
    expect(dbOf().tables.entity_images).toHaveLength(0);
    expect(dbOf().files.size).toBe(0);
  });

  it('the UI keeps its list as the server would answer it, after an upload, a focal point and a removal', async () => {
    const f = routedFetch();
    const first = await listImages(f);
    if (!first.ok) throw new Error(first.message);
    let local: AdminSeries[] = [...first.value];
    const same = async (): Promise<void> => {
      const server = await listImages(f);
      expect(server.ok && server.value).toEqual(local);
    };
    const cover = await upload({ kind: 'series', slug: 'death-note', file: await picture() });
    if (!cover.ok) throw new Error(cover.message);
    local = withImage(local, 'series', 'death-note', cover.value);
    await same();
    const portrait = await upload({ kind: 'character', slug: 'death-note/l', file: await picture(700, 900) });
    if (!portrait.ok) throw new Error(portrait.message);
    local = withImage(local, 'character', 'death-note/l', portrait.value);
    await same();
    const moved = await saveFocal(f, { kind: 'character', slug: 'death-note/l', x: 12, y: 88 });
    if (!moved.ok) throw new Error(moved.message);
    local = withImage(local, 'character', 'death-note/l', moved.value);
    await same();
    await removeImage(f, { kind: 'series', slug: 'death-note' });
    local = withImage(local, 'series', 'death-note', null);
    await same();
    await removeImage(f, { kind: 'character', slug: 'death-note/l' });
    local = withImage(local, 'character', 'death-note/l', null);
    await same();
  });
});

describe('every failure code of the routes reaches the UI in plain words', () => {
  const words = (m: { ok: boolean } & Partial<{ message: string }>): string => (m.ok ? 'ok' : m.message ?? '');

  it('unknown_entity (404), no_image (404), bad_focal (400) and the gate (404)', async () => {
    const f = routedFetch();
    expect(words(await saveFocal(f, { kind: 'series', slug: 'one-piece', x: 5, y: 5 }))).toMatch(/no image of yours/);
    expect(words(await saveFocal(f, { kind: 'series', slug: 'one-piece', x: 500, y: 5 }))).toMatch(/inside the picture/);
    expect(words(await removeImage(f, { kind: 'series', slug: 'one-piece' }))).toMatch(/no image of yours/);
    expect(words(await upload({ kind: 'series', slug: 'no-such-series', file: await picture() }))).toMatch(/no longer exists/);
    state.user = null;
    expect(words(await listImages(f))).toMatch(/not found/i);
    state.user = { id: 'someone-else' };
    expect(words(await saveFocal(f, { kind: 'series', slug: 'death-note', x: 5, y: 5 }))).toMatch(/not found/i);
  });

  it('bad_meta, unsupported_type, too_large and invalid_image on an upload', async () => {
    expect(words(await upload({ kind: 'series', slug: 'death-note', file: await picture(), meta: { ...META, license: 'other', license_note: '' } }))).toMatch(/licence/);
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], 'a.jpg', { type: 'image/jpeg' });
    expect(words(await upload({ kind: 'series', slug: 'death-note', file: svg }))).toMatch(/not a picture/);
    const big = new Uint8Array(8 * 1024 * 1024 + 10);
    big.set([0xff, 0xd8, 0xff, 0xe0]);
    expect(words(await upload({ kind: 'series', slug: 'death-note', file: new File([big], 'big.jpg', { type: 'image/jpeg' }) }))).toMatch(/8 MB/);
    const tiny = new File([new Uint8Array(await makeImage(60, 80, 'png'))], 'tiny.png', { type: 'image/png' });
    expect(words(await upload({ kind: 'series', slug: 'death-note', file: tiny }))).toMatch(/too small/);
    expect(dbOf().files.size).toBe(0);
  });

  it('the failures of an import: bad_url, blocked_address, timeout and a page that is not a picture', async () => {
    const f = routedFetch();
    const imp = (url: string) => importImage(f, { kind: 'series', slug: 'one-piece', url, meta: META });
    const { ImageError } = await import('@/lib/entity-images/errors');
    state.remote = async () => { throw new ImageError('blocked_address', 400, 'blocked'); };
    expect(words(await imp('https://10.0.0.1/a.png'))).toMatch(/public https/);
    state.remote = async () => { throw new ImageError('timeout', 504, 'slow'); };
    expect(words(await imp('https://slow.example/a.png'))).toMatch(/too long/);
    state.remote = async () => Buffer.from('<html>login</html>');
    expect(words(await imp('https://page.example/a.png'))).toMatch(/not a picture/);
    expect(words(await importImage(f, { kind: 'series', slug: 'one-piece', url: '   ', meta: META }))).toMatch(/Paste the full address/);
  });

  it('a write that does not come from the page (no Origin, no Sec-Fetch-Site) is the 403 of the routes', async () => {
    const r = await saveFocal(routedFetch({ origin: null }), { kind: 'series', slug: 'death-note', x: 1, y: 1 });
    expect(r).toMatchObject({ ok: false, message: expect.stringMatching(/did not come from the admin page/) });
  });

  it('every path the client names is a route file of part 1 that exports the method the client uses', () => {
    const wanted: Record<keyof typeof IMAGES_API, string> = { list: 'GET', upload: 'POST', import: 'POST', focal: 'PATCH', remove: 'DELETE' };
    for (const [name, path] of Object.entries(IMAGES_API) as Array<[keyof typeof IMAGES_API, string]>) {
      const file = new URL(`../../app${new URL(path, BASE).pathname}/route.ts`, import.meta.url);
      const source = readFileSync(file, 'utf8');
      expect(source, `${name}: ${path}`).toMatch(new RegExp(`export (async function ${wanted[name]}\\b|const ${wanted[name]} =)`));
      // ... and not as the 404 stand-in every other method gets.
      expect(source, `${name}: ${path}`).not.toMatch(new RegExp(`export const ${wanted[name]} = notFoundHandler`));
    }
  });
});

describe('what the display reads is what the admin wrote', () => {
  it('the url and the 2x file of the answer are the paths the display builds from the row', async () => {
    const r = await upload({ kind: 'series', slug: 'death-note', file: await picture() });
    if (!r.ok) throw new Error(r.message);
    const rows = await loadEntityImageRows(state.db as never);
    expect(rows).toHaveLength(1);
    const pic = ownerPictureOf(rows[0]!, SUPABASE);
    expect(new URL(pic.src).pathname).toBe(new URL(r.value.url).pathname);
    expect(pic.src2x && new URL(pic.src2x).pathname).toBe(new URL(r.value.url2x).pathname);
    expect(pic.position).toBe('50% 50%');
    expect(pic.width).toBe(r.value.width);
  });

  it('a focal point set in the admin is the object-position the display draws', async () => {
    await upload({ kind: 'character', slug: 'death-note/light-yagami', file: await picture(700, 900) });
    await saveFocal(routedFetch(), { kind: 'character', slug: 'death-note/light-yagami', x: 20, y: 35 });
    const rows = await loadEntityImageRows(state.db as never);
    expect(ownerPictureOf(rows[0]!, SUPABASE).position).toBe('20% 35%');
  });
});

describe('one cache scheme: a write expires every tag the display reads', () => {
  async function tagsOfDisplay(kind: 'series' | 'character', slug: string): Promise<string[]> {
    state.caches.length = 0;
    vi.resetModules();
    const read = await import('./entity-images-read');
    const display = await import('@/lib/entity-images/display');
    await display.cachedRow(kind, slug);
    // getEntityImageRows and getCreditNames are built when the module loads: their tags were recorded then.
    expect(typeof read.getEntityImageRows).toBe('function');
    return [...new Set(state.caches.flatMap((c) => c.tags))];
  }

  it.each([
    ['series', 'death-note'],
    ['character', 'death-note/light-yagami'],
  ] as const)('each write of a %s image (upload, import, focal, delete) expires every tag the display reads for it', async (kind, slug) => {
    const read = await tagsOfDisplay(kind, slug);
    expect(read).toContain('entity-images:anime');
    expect(read).toContain(`entity-image:anime:${kind}:${slug}`);

    const f = routedFetch();
    const expired = (): string[] => [...new Set(revalidateTag.mock.calls.map((c) => c[0] as string))];
    const covers = (): void => { for (const t of read.filter((t) => t.startsWith('entity-image'))) expect(expired(), t).toContain(t); };

    await upload({ kind, slug, file: await picture(kind === 'series' ? 1000 : 700, kind === 'series' ? 1400 : 900) });
    covers();
    revalidateTag.mockClear();
    state.remote = async () => makeImage(1200, 1600, 'jpeg');
    await importImage(f, { kind, slug, url: 'https://images.example.org/p.jpg', meta: META });
    covers();
    revalidateTag.mockClear();
    await saveFocal(f, { kind, slug, x: 10, y: 10 });
    covers();
    revalidateTag.mockClear();
    await removeImage(f, { kind, slug });
    covers();
  });

  it('the list tag of the display is the one constants.ts names, and "groups" (the names) is not an image tag', async () => {
    const read = await tagsOfDisplay('series', 'death-note');
    const { IMAGES_LIST_TAG, tagsOfImage } = await import('@/lib/entity-images/constants');
    expect(IMAGES_LIST_TAG).toBe('entity-images:anime');
    expect(tagsOfImage('series', 'death-note')).toEqual(['entity-image:anime:series:death-note', IMAGES_LIST_TAG]);
    expect(read.filter((t) => t.startsWith('entity-image'))).toEqual(expect.arrayContaining(tagsOfImage('series', 'death-note')));
    expect(read.filter((t) => !t.startsWith('entity-image'))).toEqual(['groups']);
  });

  it('a failed write expires nothing', async () => {
    await saveFocal(routedFetch(), { kind: 'series', slug: 'one-piece', x: 5, y: 5 });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
