// character-thumbs.mjs (owner, 2026-11-23): the 96 px file of every anime character picture that has none, so L38 can check them. A simulated
// project (reads paged with their count, the bucket, entity_images); no network, no real key, no wait.
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

interface Ct {
  main: (argv?: string[], deps?: Record<string, unknown>) => Promise<{ missing: number; ready: number; made: number; errors: number }>;
  thumbPathOf: (p: unknown) => string | null;
  squareAround: (w: number, h: number, fx?: number, fy?: number) => { sw: number; sh: number; left: number; top: number };
  renderThumb: (s: typeof sharp, bytes: Buffer, fx: number, fy: number) => Promise<Buffer>;
}

const SECRET = 'test-only-character-thumbs-value-5d2e';
const ROWS = [
  { id: 11, slug: 'one-piece/luffy', path: 'anime/character/one-piece-luffy/aaaa.webp', focal_x: 50, focal_y: 20 },
  { id: 12, slug: 'one-piece/zoro', path: 'anime/character/one-piece-zoro/bbbb.webp', focal_x: 30, focal_y: 50 },
  { id: 13, slug: 'naruto/naruto', path: 'anime/character/naruto-naruto/cccc.webp', focal_x: 50, focal_y: 50 },
  { id: 14, slug: 'naruto/bad', path: '../escape.webp', focal_x: 50, focal_y: 50 },
];

let ct: Ct;
let tmp = '';
let picture: Buffer;

beforeAll(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'character-thumbs-'));
  picture = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#c33' } }).webp().toBuffer();
  ct = (await import(/* @vite-ignore */ '../../../scripts/cards/character-thumbs/character-thumbs.mjs')) as unknown as Ct;
});
afterAll(async () => { await rm(tmp, { recursive: true, force: true }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

interface Call { url: string; m: string; body?: unknown }
function project(opts: { failDownload?: string } = {}) {
  const calls: Call[] = [];
  const page = (url: string, rows: unknown[]): Response => {
    const got = url.includes('offset=0') ? rows : [];
    return new Response(JSON.stringify(got), { status: 200, headers: { 'content-type': 'application/json', 'content-range': `${got.length ? `0-${got.length - 1}` : '*'}/${rows.length}` } });
  };
  vi.stubGlobal('fetch', async (url: string, o: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
    const m = o.method ?? 'GET';
    calls.push({ url, m, body: typeof o.body === 'string' ? JSON.parse(o.body) : undefined });
    expect(o.headers?.Authorization).toBe(`Bearer ${SECRET}`);
    if (url.includes('/rest/v1/entity_images') && m === 'GET') return page(url, ROWS);
    if (url.includes('/storage/v1/object/entity-images/') && m === 'GET') {
      if (opts.failDownload && url.endsWith(opts.failDownload)) return new Response('not found', { status: 404 });
      return new Response(new Uint8Array(picture), { status: 200 });
    }
    if (url.includes('/storage/v1/object/entity-images/') && m === 'POST') return new Response('{}', { status: 200 });
    if (url.includes('/rest/v1/entity_images') && m === 'PATCH') return new Response(null, { status: 204 });
    throw new Error(`unexpected ${m} ${url}`);
  });
  vi.stubEnv('OTAKU_SUPABASE_URL', 'https://project.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  return calls;
}

describe('the pieces', () => {
  it('names the 96 px file as the admin does, and trusts no odd file name', () => {
    expect(ct.thumbPathOf('anime/character/one-piece-luffy/aaaa.webp')).toBe('anime/character/one-piece-luffy/aaaa-96.webp');
    for (const p of ['../escape.webp', 'anime/x.png', '', null, 'Anime/x.webp', 'anime/../x.webp']) expect(ct.thumbPathOf(p), String(p)).toBeNull();
  });
  it('cuts the square around the focal point, kept inside the picture', () => {
    expect(ct.squareAround(400, 500, 50, 50)).toEqual({ sw: 96, sh: 120, left: 0, top: 12 });
    expect(ct.squareAround(400, 500, 50, 0)).toEqual({ sw: 96, sh: 120, left: 0, top: 0 });
    expect(ct.squareAround(400, 500, 50, 100)).toEqual({ sw: 96, sh: 120, left: 0, top: 24 });
    expect(ct.squareAround(800, 400, 100, 50)).toEqual({ sw: 192, sh: 96, left: 96, top: 0 });
  });
  it('makes a 96 by 96 WebP', async () => {
    const meta = await sharp(await ct.renderThumb(sharp, picture, 50, 20)).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 96, 96]);
  });
});

describe('the run', () => {
  it('refuses without the service key', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    await expect(ct.main([])).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY is not set/);
  });
  it('preview: reads only, writes nothing', async () => {
    const calls = project();
    expect(await ct.main([])).toEqual({ missing: 4, ready: 3, made: 0, errors: 0 });
    expect(calls.every((c) => c.m === 'GET' && c.url.includes('/rest/v1/'))).toBe(true);
    expect(calls[0]!.url).toContain('site_id=eq.anime&kind=eq.character&thumb_path=is.null&order=id');
  });
  it('--publish: one 96 px file per picture, written only where thumb_path is still empty; a failure is reported, the others go on', async () => {
    const calls = project({ failDownload: 'cccc.webp' });
    const reportFile = path.join(tmp, 'report.csv');
    expect(await ct.main(['--publish'], { sleep: async () => undefined, reportFile, workers: 2 })).toEqual({ missing: 4, ready: 3, made: 2, errors: 1 });
    const uploads = calls.filter((c) => c.m === 'POST').map((c) => c.url.replace('https://project.example.test/storage/v1/object/entity-images/', '')).sort();
    expect(uploads).toEqual(['anime/character/one-piece-luffy/aaaa-96.webp', 'anime/character/one-piece-zoro/bbbb-96.webp']);
    const patches = calls.filter((c) => c.m === 'PATCH');
    expect(patches.map((c) => c.url.split('?')[1]).sort()).toEqual([
      'id=eq.11&site_id=eq.anime&kind=eq.character&thumb_path=is.null',
      'id=eq.12&site_id=eq.anime&kind=eq.character&thumb_path=is.null',
    ]);
    // Only the 96 px file: never the licence, the check, the file or the credit.
    for (const p of patches) expect(Object.keys(p.body as object)).toEqual(['thumb_path']);
    expect(calls.some((c) => c.url.includes('escape'))).toBe(false);
    const report = await readFile(reportFile, 'utf8');
    expect(report).toContain('11,one-piece/luffy,anime/character/one-piece-luffy/aaaa-96.webp,made');
    expect(report).toContain('13,naruto/naruto,anime/character/naruto-naruto/cccc-96.webp,error: download HTTP 404');
    expect(report).toContain('14,naruto/bad,,skipped: file name not trusted');
    expect(report).not.toContain(SECRET);
  });
});
