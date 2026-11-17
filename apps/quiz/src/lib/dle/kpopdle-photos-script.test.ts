// Lot 3 DLE (E1): the owner's script apps/quiz/scripts/cards/kpopdle-photos/kpopdle-photos.mjs (moved from out/otaku-refs-tool, same behaviour). Every
// network call is mocked: nothing leaves this machine, and the service key must never be printed. The pure parts (norm, matchPhotos) and the whole
// run on a temporary photo folder: the preview reads only; --publish writes three WebP files per idol and one entity_images row.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

interface Idol { id: number; name: string; group: string; photo_url: string | null }
interface Match { idol: Idol; file?: string; how?: string; problem?: string | null }
interface Kp {
  norm: (s: unknown) => string;
  matchPhotos: (idols: Idol[], files: string[]) => Match[];
  main: (argv?: string[], deps?: Record<string, unknown>) => Promise<{ ready: number; skipped: number; none: number; published: number }>;
}
interface Common { REPO: string; PRODUCTION_URL: string; loadConfig: () => Promise<{ url: string; serviceKey: string | null }>; serviceHeaders: (key: string, extra?: Record<string, string>) => Record<string, string> }

const SECRET = 'svc-secret-never-print';
let kp: Kp;
let common: Common;
let tmp: string;
let idolsDir: string;
let reportFile: string;
const logs: string[] = [];
const calls: { url: string; m: string; body: string | null; raw: unknown; auth: string | undefined }[] = [];

const IDOLS = [
  { id: 77, name: 'Doyoung', group_id: 1, photo_url: '/idols/Doyoung NCT 127.jpg' },
  { id: 263, name: 'Doyoung', group_id: 2, photo_url: null },
  { id: 80, name: 'Mark', group_id: 1, photo_url: '/idols/Mark NCT 127.jpg' },
  { id: 219, name: 'Mark', group_id: 3, photo_url: null },
  { id: 220, name: 'Jay B', group_id: 3, photo_url: null },
  { id: 223, name: 'Youngjae', group_id: 3, photo_url: null },
  { id: 276, name: 'Youngjae', group_id: 6, photo_url: null },
  { id: 298, name: 'Eunwoo', group_id: 4, photo_url: null },
  { id: 296, name: 'MJ', group_id: 4, photo_url: null },
  { id: 260, name: 'Choi Hyun-suk', group_id: 2, photo_url: null },
  { id: 12, name: 'Bang Chan', group_id: 5, photo_url: '/idols/Bang Chan STRYKIDS.jpg' },
  { id: 239, name: 'Seohyun', group_id: 7, photo_url: null },
  { id: 249, name: 'G-Dragon', group_id: 8, photo_url: null },
  { id: 248, name: 'Taeyang', group_id: 8, photo_url: null },
  { id: 300, name: 'Twin', group_id: 9, photo_url: null },
  { id: 302, name: 'Kim Jun', group_id: 12, photo_url: null },
  { id: 303, name: 'Lee Jun', group_id: 12, photo_url: null },
  { id: 301, name: 'Han', group_id: 10, photo_url: null },
  { id: 9, name: 'Jennie', group_id: 11, photo_url: '/idols/Jennie BLACKPINK.jpg' },
];
const GROUPS = [
  { id: 1, name: 'NCT' }, { id: 2, name: 'TREASURE' }, { id: 3, name: 'GOT7' }, { id: 4, name: 'ASTRO' }, { id: 5, name: 'Stray Kids' },
  { id: 6, name: 'TWS' }, { id: 7, name: "Girls' Generation" }, { id: 8, name: 'BIGBANG' }, { id: 9, name: 'Alpha' }, { id: 10, name: 'Solo X' },
  { id: 11, name: 'BLACKPINK' }, { id: 12, name: 'Beta' },
];
const FILES = ['Doyoung NCT 127.jpg', 'Doyoung Treasure.jpg', 'Mark NCT 127.jpg', 'Mark GOT7.jpg', 'JB GOT7.jpg', 'Cha Eun-woo ASTRO.jpg',
  'Hyunsuk Treasure.jpg', 'Asahi Treasure.jpg', 'Youngjae GOT7.jpg', 'GOT7.jpg', 'Bang Chan STRYKIDS.jpg', 'Seohyun Girls Generation.jpg',
  'G-Dragon BIGBANG.jpg', 'Twin Alpha.jpg', 'Twin Alpha 2.jpg', 'Han Solo X.jpg', 'Jun Beta.jpg'];

const json = (b: unknown, s = 200): Response => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
/** A page of a read, like PostgREST: the rows at offset 0 (every read here fits in one page), the total in Content-Range (lot CPUB-RETRY). */
const page = (url: string, rows: unknown[]): Response => {
  const got = url.includes('offset=0') ? rows : [];
  return new Response(JSON.stringify(got), { status: 200, headers: { 'content-type': 'application/json', 'content-range': `${got.length ? `0-${got.length - 1}` : '*'}/${rows.length}` } });
};

function mockFetch(over: { failUploads?: boolean } = {}): void {
  vi.stubGlobal('fetch', async (url: string, o: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
    const m = o.method ?? 'GET';
    calls.push({ url, m, body: typeof o.body === 'string' ? o.body : null, raw: o.body, auth: o.headers?.Authorization });
    if (url.includes('/rest/v1/dle_entities') && m === 'GET') return page(url, [...IDOLS.map((i) => ({ entity_id: String(i.id) })), { entity_id: 'x' }]);
    if (url.includes('/rest/v1/idols') && m === 'GET') return page(url, IDOLS);
    if (url.includes('/rest/v1/groups') && m === 'GET') return page(url, GROUPS);
    if (url.includes('/rest/v1/entity_images') && m === 'GET') return page(url, [{ slug: '9', path: 'kpop/idol/9/aaaa.webp', thumb_path: 'kpop/idol/9/aaaa-96.webp' }]);
    if (url.includes('/rest/v1/entity_images') && (m === 'POST' || m === 'PATCH')) return new Response(null, { status: 201 });
    if (url.includes('/storage/v1/object/entity-images/') && m === 'POST') return over.failUploads ? new Response('no', { status: 500 }) : json({ Key: 'ok' });
    if (url.endsWith('/storage/v1/object/entity-images') && m === 'DELETE') return json([]);
    throw new Error(`unexpected ${m} ${url}`);
  });
}

beforeAll(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'kpopdle-photos-'));
  idolsDir = path.join(tmp, 'idols');
  reportFile = path.join(tmp, 'report.csv');
  await mkdir(idolsDir, { recursive: true });
  const jpg = await sharp({ create: { width: 736, height: 1100, channels: 3, background: '#c39' } }).jpeg().toBuffer();
  for (const f of FILES) await writeFile(path.join(idolsDir, f), jpg);
  const dir = '../../../scripts/cards/kpopdle-photos';
  kp = (await import(/* @vite-ignore */ `${dir}/kpopdle-photos.mjs`)) as unknown as Kp;
  common = (await import(/* @vite-ignore */ `${dir}/common.mjs`)) as unknown as Common;
});
afterAll(async () => { await rm(tmp, { recursive: true, force: true }); });

function arrange(): void {
  logs.length = 0;
  calls.length = 0;
  vi.stubEnv('OTAKU_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET);
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('the pure parts', () => {
  it('norm drops accents, case and punctuation', () => {
    expect(kp.norm('Cha Eun-woo')).toBe('chaeunwoo');
    expect(kp.norm('Séohyun')).toBe('seohyun');
    expect(kp.norm(null)).toBe('');
    expect(kp.norm("Girls' Generation")).toBe('girlsgeneration');
  });

  const idols: Idol[] = [
    { id: 1, name: 'Doyoung', group: 'NCT', photo_url: null }, { id: 2, name: 'Doyoung', group: 'TREASURE', photo_url: null },
    { id: 3, name: 'Jay B', group: 'GOT7', photo_url: null }, { id: 4, name: 'MJ', group: 'ASTRO', photo_url: null },
    { id: 5, name: 'Twin', group: 'Alpha', photo_url: null }, { id: 6, name: 'Bang Chan', group: 'Stray Kids', photo_url: '/idols/Bang%20Chan%20STRYKIDS.jpg' },
  ];
  const by = (m: Match[], id: number): Match => m.find((x) => x.idol.id === id)!;

  it('matches by the page file first, then by "<idol> <group>.jpg", and never twice', () => {
    const m = kp.matchPhotos(idols, ['Doyoung NCT 127.jpg', 'Doyoung Treasure.jpg', 'JB GOT7.jpg', 'Twin Alpha.jpg', 'Twin Alpha 2.jpg', 'Bang Chan STRYKIDS.jpg', 'GOT7.jpg', 'MJ ASTRO.jpg']);
    expect(by(m, 1).file).toBe('Doyoung NCT 127.jpg');
    expect(by(m, 2).file).toBe('Doyoung Treasure.jpg');
    expect(by(m, 3)).toMatchObject({ file: 'JB GOT7.jpg', how: 'file name' });
    expect(by(m, 4).file).toBe('MJ ASTRO.jpg');
    expect(by(m, 5).problem).toMatch(/several files fit/);
    expect(by(m, 6)).toMatchObject({ file: 'Bang Chan STRYKIDS.jpg', how: 'its kpopquiz.org page' });
    expect(m.map((x) => x.file).filter((f) => f === 'GOT7.jpg')).toEqual([]);
  });

  it('leaves an idol with no file without a problem, ready for the designed card', () => {
    const m = kp.matchPhotos([{ id: 9, name: 'Nobody', group: 'Nowhere', photo_url: null }], ['Doyoung NCT 127.jpg']);
    expect(m[0]).toMatchObject({ problem: null });
    expect(m[0]!.file).toBeUndefined();
  });

  it('keeps the project address handling: production unless OTAKU_SUPABASE_URL says otherwise, key from the environment only', async () => {
    arrange();
    vi.stubEnv('OTAKU_SUPABASE_URL', '');
    const prod = await common.loadConfig();
    expect(prod.url).toBe(common.PRODUCTION_URL);
    vi.stubEnv('OTAKU_SUPABASE_URL', 'https://example.supabase.co/');
    expect(await common.loadConfig()).toEqual({ url: 'https://example.supabase.co', serviceKey: SECRET });
    expect(logs).toEqual([`Project: ${new URL(common.PRODUCTION_URL).host}`, 'Project: example.supabase.co']);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await common.loadConfig()).serviceKey).toBeNull();
    expect(common.REPO.endsWith('KpopQuizzV2') || common.REPO.includes('worktrees')).toBe(true);
  });
});

describe('the run', () => {
  const fileOf = (name: string, group: string, verb: string): string | null => {
    const l = logs.find((x) => x.includes(`${verb}  ${name} (${group})`));
    return l ? l.split('<- ')[1]!.split('  [')[0]! : null;
  };

  it('the preview only reads, and says which idol gets which file and who has none', async () => {
    arrange();
    mockFetch();
    const prev = await kp.main([], { siteDir: idolsDir, reportFile });
    const out = logs.join('\n');
    expect(calls.every((c) => c.m === 'GET')).toBe(true);
    const f = (n: string, g: string): string | null => fileOf(n, g, 'would publish');
    expect(f('Doyoung', 'NCT')).toBe('Doyoung NCT 127.jpg');
    expect(f('Doyoung', 'TREASURE')).toBe('Doyoung Treasure.jpg');
    expect(f('Mark', 'GOT7')).toBe('Mark GOT7.jpg');
    expect(f('Jay B', 'GOT7')).toBe('JB GOT7.jpg');
    expect(f('Youngjae', 'GOT7')).toBe('Youngjae GOT7.jpg');
    expect(f('Youngjae', 'TWS')).toBeNull();
    expect(f('Eunwoo', 'ASTRO')).toBe('Cha Eun-woo ASTRO.jpg');
    expect(f('MJ', 'ASTRO')).toBeNull();
    expect(f('Choi Hyun-suk', 'TREASURE')).toBe('Hyunsuk Treasure.jpg');
    expect(f('Bang Chan', 'Stray Kids')).toBe('Bang Chan STRYKIDS.jpg');
    expect(f('Seohyun', "Girls' Generation")).toBe('Seohyun Girls Generation.jpg');
    expect(f('G-Dragon', 'BIGBANG')).toBe('G-Dragon BIGBANG.jpg');
    expect(f('Taeyang', 'BIGBANG')).toBeNull();
    expect(f('Han', 'Solo X')).toBe('Han Solo X.jpg');
    expect(out).toMatch(/none {5}Twin \(Alpha\): several files fit: (Twin Alpha\.jpg, Twin Alpha 2\.jpg|Twin Alpha 2\.jpg, Twin Alpha\.jpg)/);
    expect(out).toMatch(/none {5}Kim Jun \(Beta\): Jun Beta\.jpg fits 2 idols/);
    expect(out).toMatch(/none {5}Lee Jun \(Beta\): Jun Beta\.jpg fits 2 idols/);
    expect(out).toMatch(/kept {5}Jennie \(BLACKPINK\): already has a picture/);
    expect(out).not.toContain('<- GOT7.jpg');
    expect(out).toContain('Preview only: nothing was written.');
    expect(prev.published).toBe(0);
    expect(out).not.toContain(SECRET);
  });

  it('--publish writes three WebP files per idol at the admin sizes and one verified row, and keeps what exists', async () => {
    arrange();
    mockFetch();
    const prev = await kp.main([], { siteDir: idolsDir, reportFile });
    calls.length = 0;
    const res = await kp.main(['--publish'], { siteDir: idolsDir, reportFile, sharp, pauseMs: 0 });
    expect(res.published).toBe(prev.ready);
    const ups = calls.filter((c) => c.m === 'POST' && c.url.includes('/storage/v1/object/entity-images/kpop/idol/'));
    expect(ups).toHaveLength(prev.ready * 3);
    expect(ups.every((c) => c.auth === `Bearer ${SECRET}`)).toBe(true);
    const rows = calls.filter((c) => c.m === 'POST' && c.url.includes('/rest/v1/entity_images')).map((c) => (JSON.parse(c.body!) as Record<string, unknown>[])[0]!);
    const r = rows.find((x) => x.slug === '298')!;
    expect(r).toMatchObject({ site_id: 'kpop', kind: 'idol', license: 'other', license_verified: true, width: 400, height: 500 });
    expect(String(r.path)).toMatch(/^kpop\/idol\/298\/[0-9a-f]{16}\.webp$/);
    expect(String(r.thumb_path)).toMatch(/^kpop\/idol\/298\/[0-9a-f]{16}-96\.webp$/);
    expect(r.license_note).toBe('Photo already used on kpopquiz.org (/idols/Cha Eun-woo ASTRO.jpg); supplied by the owner, source not recorded.');
    expect(rows.some((x) => x.slug === '9')).toBe(false);
    const dims = await Promise.all(ups.filter((c) => c.url.includes('/kpop/idol/298/')).map(async (c) => { const md = await sharp(Buffer.from(c.raw as Uint8Array)).metadata(); return `${md.format} ${md.width}x${md.height}`; }));
    expect(dims.sort()).toEqual(['webp 400x500', 'webp 800x1000', 'webp 96x96']);
    expect(logs.join('\n')).not.toContain(SECRET);
    expect(JSON.stringify(calls.map((c) => c.url))).not.toContain(SECRET);
  });

  it('--idols-dir changes the note, an upload that fails is a line of the report and not a crash, and the key is still never printed', async () => {
    arrange();
    mockFetch({ failUploads: true });
    // the 500 is tried again (lot CPUB-RETRY, fetchRetry): no real wait between the tries in a test
    const res = await kp.main(['--publish', '--idols-dir', idolsDir], { siteDir: path.join(tmp, 'elsewhere'), reportFile, sharp, pauseMs: 0, sleep: async () => {} });
    expect(res.published).toBe(0);
    expect(logs.some((l) => l.includes('!! ') && l.includes('storage HTTP 500'))).toBe(true);
    expect(logs.join('\n')).not.toContain(SECRET);
    expect(calls.some((c) => c.url.includes('/rest/v1/entity_images') && c.m !== 'GET')).toBe(false);
  });

  it('stops without a key or without a folder, with words that name neither the key nor a path of the machine beyond the folder asked for', async () => {
    arrange();
    mockFetch();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    await expect(kp.main([], { siteDir: idolsDir, reportFile })).rejects.toThrow('SUPABASE_SERVICE_ROLE_KEY is not set in this terminal');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET);
    await expect(kp.main([], { siteDir: path.join(tmp, 'nope'), reportFile })).rejects.toThrow(/no photo folder at/);
    expect(common.serviceHeaders('k', { A: 'b' })).toEqual({ apikey: 'k', Authorization: 'Bearer k', A: 'b' });
  });
});
