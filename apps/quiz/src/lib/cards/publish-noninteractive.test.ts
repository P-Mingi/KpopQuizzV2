// The non-interactive mode of publish-card-files.mjs (integrator, 2026-11-17: the owner publishes from GitHub Actions). The real script runs
// in a child process, without a terminal, against a local server that plays Commons (the originals) and the Supabase project (rows, bucket);
// a preload (fixtures/publish-fetch-preload.mjs) sends every fetch of the child there. The pictures are plain coloured rectangles made here.
// Proved: nothing is typed and no terminal is needed; the host comes from --host and must be the project's; the key comes from the
// environment, goes to the project only and is never printed nor written; --keep-going skips a photo whose original fails (sha1 changed,
// download failed), lists it, goes on and ends with exit code 2; a busy answer is tried again; the cleanup lists and never deletes; the
// report has the counts; --cache-dir saves the originals and a second run does not download them again. Lot CPUB-RETRY (run Cards publish
// #2): the server answers like PostgREST, at most 1,000 rows a read and the total in Content-Range; the 1,101 live photos are all read, page
// by page, a total that differs stops the run before any write, and the cleanup proposes no file of a photo beyond the first 1,000 rows.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Each run waits a second between two Commons downloads (the script's own pace): about 8 s for the longest run here.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const SCRIPT = path.resolve(__dirname, '../../../scripts/cards/publish-card-files.mjs');
const PRELOAD = path.resolve(__dirname, 'fixtures/publish-fetch-preload.mjs');
const KEY = 'test-only-service-value-4b1d7c2e9a';
const HOST = 'proj.test';

const sha1 = (b: Buffer): string => createHash('sha1').update(b).digest('hex');
const rect = (width: number, height: number, r: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: { r, g: 90, b: 160 } } }).jpeg().toBuffer();

interface Photo { slug: string; kind: 'idol' | 'group'; file: string; img: Buffer; served?: Buffer; status?: number }
interface Req { method: string; host: string; path: string; headers: IncomingMessage['headers']; body: string }

let photos: Photo[] = [];
let dataDir = '';

beforeAll(async () => {
  const other = await rect(1000, 1500, 7);
  photos = [
    { slug: 'ada', kind: 'idol', file: 'ada.jpg', img: await rect(1200, 1800, 10) },
    { slug: 'trio', kind: 'group', file: 'trio.jpg', img: await rect(3300, 1700, 20) },
    { slug: 'duo', kind: 'group', file: 'duo.jpg', img: await rect(2200, 1700, 30) },
    { slug: 'bea', kind: 'idol', file: 'bea.jpg', img: await rect(1000, 1500, 40) },
    { slug: 'cid', kind: 'idol', file: 'cid.jpg', img: await rect(1000, 1500, 50), served: other },
    { slug: 'dee', kind: 'idol', file: 'dee.jpg', img: await rect(1000, 1500, 60), status: 404 },
    { slug: 'eve', kind: 'idol', file: 'eve.jpg', img: await rect(1000, 1500, 70) },
    { slug: 'fay', kind: 'idol', file: 'fay.jpg', img: await rect(1000, 1500, 80) },
  ];
  dataDir = mkdtempSync(path.join(tmpdir(), 'cards-pub-data-'));
  const subjects = photos.map((p) => ({
    slug: p.slug, name: p.slug.toUpperCase(), kind: p.kind,
    photos: [{ slot: 1, page: `https://commons.test/wiki/File:${p.file}`, url: `https://commons.test/orig/${p.file}`, sha1: sha1(p.img), status: 'approved', focal: { x: 50, y: 50 } }],
  }));
  writeFileSync(path.join(dataDir, 'photos.json'), JSON.stringify({ subjects, left_out: [] }));
  writeFileSync(path.join(dataDir, 'subjects.json'), JSON.stringify(photos.map((p) => ({ slug: p.slug }))));
});

/** The rows of cards_photos the project answers (lot 7 columns present, as after 118). */
function rows(only?: string[]): Record<string, unknown>[] {
  const row = (id: number, slug: string, kind: string, extra: Record<string, unknown> = {}) => ({
    id, entity_id: `${kind}:${slug}`, slot: 1, source_page: `https://commons.test/wiki/File:${slug}.jpg`, status: 'approved', focal_x: 50, focal_y: 50,
    storage_path: null, file_focal_x: null, file_focal_y: null, parts: kind === 'group' ? 2 : null, file_parts: null, file_pano: false, ...extra,
  });
  const all = [
    row(1, 'ada', 'idol'),
    row(2, 'trio', 'group', { parts: 3 }),
    // a pair cut before lot 7 at its focal point: it only gains its panorama
    row(3, 'duo', 'group', { storage_path: 'duo-50-50', file_focal_x: 50, file_focal_y: 50, file_parts: 2 }),
    // already published: no download
    row(4, 'bea', 'idol', { storage_path: 'bea-50-50', file_focal_x: 50, file_focal_y: 50 }),
    row(5, 'cid', 'idol'),
    row(6, 'dee', 'idol'),
    row(7, 'eve', 'idol'),
    { ...row(8, 'zed', 'idol'), source_page: 'https://commons.test/wiki/File:not-in-the-data.jpg' },
    // only when asked for (lot CPUB-RETRY: five photos that reach the project)
    row(9, 'fay', 'idol'),
  ];
  return only ? all.filter((r) => only.includes(String(r.entity_id).split(':')[1]!)) : all.filter((r) => r.entity_id !== 'idol:fay');
}

interface Server { base: string; reqs: Req[]; close: () => Promise<void> }
/** `project(method, path, n)`: a status the project answers instead (with Retry-After: 0) to the n-th request of that method and path. */
type ProjectFault = (method: string, path: string, n: number) => number | null;
/** `maxRows`: the most rows the project answers a read (Supabase: 1,000); `announce`: the total its Content-Range gives instead of the rows'
 *  number; `bucket`: the objects of the bucket 'cards'; `originals`: more Commons files, by file name. */
interface ServerOpts {
  rows: Record<string, unknown>[]; rowsError?: boolean; project?: ProjectFault;
  maxRows?: number; announce?: number; bucket?: { name: string; id: string }[]; originals?: Map<string, Buffer>;
}
async function server(opts: ServerOpts): Promise<Server> {
  const reqs: Req[] = [];
  const seen = new Map<string, number>();
  const busy = new Set(['eve.jpg']); // answers 503 once, then the file
  const srv = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url ?? '/', 'http://x');
      const [, host, ...rest] = url.pathname.split('/');
      const p = `/${rest.join('/')}${url.search}`;
      const body = Buffer.concat(chunks);
      reqs.push({ method: req.method ?? '', host: host ?? '', path: p, headers: req.headers, body: req.method === 'POST' && p.includes('/object/cards/') ? `<${body.length} bytes>` : body.toString('utf8') });
      const json = (code: number, v: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(v)); };
      if (host === 'commons.test') {
        const file = decodeURIComponent(p.replace(/^\/orig\//, ''));
        const more = opts.originals?.get(file);
        if (more) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(more); return; }
        const ph = photos.find((x) => x.file === file);
        if (!ph || ph.status === 404) { res.writeHead(404); res.end('not found'); return; }
        if (busy.delete(file)) { res.writeHead(503, { 'Retry-After': '0' }); res.end('busy'); return; }
        res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(ph.served ?? ph.img); return;
      }
      if (host !== HOST) { res.writeHead(500); res.end('unexpected host'); return; }
      const n = (seen.get(`${req.method} ${p}`) ?? 0) + 1;
      seen.set(`${req.method} ${p}`, n);
      const fault = opts.project?.(req.method ?? '', p, n) ?? null;
      if (fault !== null) { res.writeHead(fault, { 'Retry-After': '0', 'Content-Type': 'text/plain' }); res.end(`error ${fault}`); return; }
      if (req.method === 'GET' && p.startsWith('/rest/v1/cards_photos?')) {
        if (opts.rowsError) { json(401, { message: `Invalid API key ${String(req.headers.apikey)}` }); return; }
        // like PostgREST: limit and offset, at most maxRows rows a read whatever the limit, the total in Content-Range when asked for
        const limit = Math.min(Number(url.searchParams.get('limit') ?? Infinity), opts.maxRows ?? 1000);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const page = opts.rows.slice(offset, offset + limit);
        const total = String(req.headers.prefer ?? '').includes('count=exact') ? String(opts.announce ?? opts.rows.length) : '*';
        res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Range': `${page.length ? `${offset}-${offset + page.length - 1}` : '*'}/${total}` });
        res.end(JSON.stringify(page)); return;
      }
      if (req.method === 'PATCH' && p.startsWith('/rest/v1/cards_photos?id=eq.')) { res.writeHead(204); res.end(); return; }
      if (req.method === 'POST' && p.startsWith('/storage/v1/object/cards/')) { json(200, { Key: p }); return; }
      if (req.method === 'POST' && p === '/storage/v1/object/list/cards') {
        const { limit = 100, offset = 0 } = JSON.parse(body.toString('utf8') || '{}') as { limit?: number; offset?: number };
        const all = opts.bucket ?? [{ name: 'bea-50-50-1x.webp', id: 'a' }, { name: 'ada-40-40-1x.webp', id: 'b' }, { name: 'ada-40-40-2x.webp', id: 'c' }];
        json(200, all.slice(offset, offset + limit)); return;
      }
      res.writeHead(500); res.end('unexpected request');
    });
  });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  const { port } = srv.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, reqs, close: () => new Promise((ok) => srv.close(() => ok())) };
}

interface Run { code: number | null; out: string; err: string }
function run(args: string[], env: Record<string, string>): Promise<Run> {
  return new Promise((ok) => {
    const child = spawn(process.execPath, ['--import', pathToFileURL(PRELOAD).href, SCRIPT, ...args], {
      env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '', CARDS_DATA_DIR: dataDir, ...env },
    });
    child.stdin.end(); // a pipe, closed at once: no terminal, nothing typed
    let out = '', err = '';
    child.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    child.on('close', (code: number | null) => ok({ code, out, err }));
  });
}
const ciArgs = (dir: string, extra: string[] = []): string[] => ['--publish', '--non-interactive', '--host', HOST, '--cache-dir', path.join(dir, 'originals'), '--report', path.join(dir, 'report.json'), ...extra];
const ciEnv = (base: string): Record<string, string> => ({ CARDS_SUPABASE_URL: `https://${HOST}`, CARDS_SERVICE_KEY: KEY, CARDS_TEST_SERVER: base });

describe('publish-card-files.mjs --non-interactive', () => {
  let s: Server;
  let r: Run;
  const dir = mkdtempSync(path.join(tmpdir(), 'cards-pub-run-'));
  beforeAll(async () => {
    s = await server({ rows: rows() });
    r = await run(ciArgs(dir, ['--keep-going']), ciEnv(s.base));
  });
  afterAll(async () => { await s.close(); });

  it('runs without a terminal and nothing typed; --keep-going ends with code 2 when photos failed', () => {
    expect(r.err).toBe('');
    expect(r.code).toBe(2);
    expect(r.out).toContain('Project host: proj.test');
    expect(r.out).toContain('Host given by --host (non-interactive: nothing is typed, the cleanup only lists).');
    expect(r.out).not.toContain('Type ');
  });

  it('cuts and uploads the parts and the panoramas, one PATCH per published photo, and skips the photo already up to date', () => {
    const up = s.reqs.filter((q) => q.method === 'POST' && q.path.startsWith('/storage/v1/object/cards/')).map((q) => q.path.replace('/storage/v1/object/cards/', '')).sort();
    expect(up).toEqual([
      'ada-50-50-1x.webp', 'ada-50-50-2x.webp',
      'duo-50-50-p2-1x.webp', 'duo-50-50-p2-2x.webp',
      'eve-50-50-1x.webp', 'eve-50-50-2x.webp',
      'trio-50-50-p3-1x.webp', 'trio-50-50-p3-2x.webp',
      'trio-50-50-t1-1x.webp', 'trio-50-50-t1-2x.webp', 'trio-50-50-t2-1x.webp', 'trio-50-50-t2-2x.webp', 'trio-50-50-t3-1x.webp', 'trio-50-50-t3-2x.webp',
    ]);
    const patches = s.reqs.filter((q) => q.method === 'PATCH').map((q) => [q.path.replace(/^.*id=eq\./, ''), JSON.parse(q.body)]);
    expect(patches).toEqual([
      ['1', { storage_path: 'ada-50-50', file_focal_x: 50, file_focal_y: 50, file_parts: 2, file_pano: false }],
      ['2', { storage_path: 'trio-50-50', file_focal_x: 50, file_focal_y: 50, file_parts: 3, file_pano: true }],
      ['3', { storage_path: 'duo-50-50', file_focal_x: 50, file_focal_y: 50, file_parts: 2, file_pano: true }],
      ['7', { storage_path: 'eve-50-50', file_focal_x: 50, file_focal_y: 50, file_parts: 2, file_pano: false }],
    ]);
    // bea (up to date) is never downloaded; eve is asked twice (503, then the file); the others once
    const gets = s.reqs.filter((q) => q.host === 'commons.test').map((q) => q.path.replace('/orig/', ''));
    expect(gets).toEqual(['ada.jpg', 'trio.jpg', 'duo.jpg', 'cid.jpg', 'dee.jpg', 'eve.jpg', 'eve.jpg']);
  });

  it('lists the failed photos with their reason, leaves their rows alone, and the report has the counts', () => {
    expect(r.out).toContain('cid photo 1: FAILED, skipped (--keep-going): cid photo 1: the Commons file changed');
    expect(r.out).toContain('dee photo 1: FAILED, skipped (--keep-going): GET https://commons.test/orig/dee.jpg: 404');
    expect(r.out).toContain('uploaded 4, skipped 2, failed 2');
    const rep = JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'));
    expect(rep).toMatchObject({
      mode: 'non-interactive', host: HOST, keepGoing: true,
      photos: { uploaded: 4, upToDate: 1, notInData: 1, failed: 2 }, cards: 1 + 3 + 1, panoramas: 2,
      cleanup: { objects: 3, kept: 1, proposed: 2, deleted: 0 }, stopped: null,
    });
    expect(rep.failed.map((f: { slug: string }) => f.slug)).toEqual(['cid', 'dee']);
    expect(rep.failed[0].page).toBe('https://commons.test/wiki/File:cid.jpg');
  });

  it('the cleanup lists and never deletes', () => {
    expect(r.out).toContain('2 proposed for deletion');
    expect(r.out).toContain('non-interactive: nothing deleted (this mode only lists');
    expect(s.reqs.some((q) => q.method === 'DELETE')).toBe(false);
  });

  it('the key goes to the project only, in its headers, and is never printed nor written', () => {
    for (const q of s.reqs) {
      if (q.host === HOST) { expect(q.headers.apikey).toBe(KEY); expect(q.headers.authorization).toBe(`Bearer ${KEY}`); }
      else { expect(q.headers.apikey).toBeUndefined(); expect(q.headers.authorization).toBeUndefined(); }
      expect(q.path).not.toContain(KEY);
      expect(q.body).not.toContain(KEY);
    }
    expect(r.out + r.err).not.toContain(KEY);
    expect(readFileSync(path.join(dir, 'report.json'), 'utf8')).not.toContain(KEY);
  });

  it('--cache-dir keeps one original per sha1, and a second run downloads only what is missing', async () => {
    const cached = readdirSync(path.join(dir, 'originals')).sort();
    expect(cached).toEqual(['ada', 'trio', 'duo', 'eve'].map((slug) => sha1(photos.find((p) => p.slug === slug)!.img)).sort());
    const again = await server({ rows: rows() });
    try {
      const r2 = await run(ciArgs(dir, ['--keep-going']), ciEnv(again.base));
      expect(r2.code).toBe(2);
      expect(again.reqs.filter((q) => q.host === 'commons.test').map((q) => q.path)).toEqual(['/orig/cid.jpg', '/orig/dee.jpg']);
    } finally { await again.close(); }
  });
});

describe('publish-card-files.mjs --non-interactive refuses, and stops without --keep-going', () => {
  it('refuses without --host, with another host, or without the key in the environment: nothing is sent', async () => {
    const s = await server({ rows: rows() });
    try {
      const dir = mkdtempSync(path.join(tmpdir(), 'cards-pub-no-'));
      const noHost = await run(['--publish', '--non-interactive', '--report', path.join(dir, 'a.json')], ciEnv(s.base));
      expect(noHost.code).toBe(1);
      expect(noHost.err).toContain('refused: --non-interactive needs --host <project host>; nothing was sent');
      const other = await run(['--publish', '--non-interactive', '--host', 'rdkgouofytwfdpbxbzio.supabase.co'], ciEnv(s.base));
      expect(other.code).toBe(1);
      expect(other.err).toContain('refused: --host does not match the host of CARDS_SUPABASE_URL; nothing was sent');
      const noKey = await run(['--publish', '--non-interactive', '--host', HOST], { ...ciEnv(s.base), CARDS_SERVICE_KEY: '' });
      expect(noKey.code).toBe(1);
      expect(noKey.err).toContain('refused: --non-interactive needs CARDS_SERVICE_KEY in the environment; nothing was sent');
      expect(s.reqs).toEqual([]);
      expect(JSON.parse(readFileSync(path.join(dir, 'a.json'), 'utf8')).stopped).toContain('refused');
    } finally { await s.close(); }
  });

  it('without --non-interactive the script still needs a terminal (the owner\'s mode is unchanged)', async () => {
    const s = await server({ rows: rows() });
    try {
      const r = await run(['--publish'], ciEnv(s.base));
      expect(r.code).toBe(1);
      expect(r.err).toContain('--publish needs a terminal (the host and the key are typed)');
      expect(s.reqs).toEqual([]);
    } finally { await s.close(); }
  });

  it('without --keep-going the first failed photo stops the run (exit 1), with its message in the report', async () => {
    const s = await server({ rows: rows(['cid', 'eve']) });
    try {
      const dir = mkdtempSync(path.join(tmpdir(), 'cards-pub-stop-'));
      const r = await run(ciArgs(dir), ciEnv(s.base));
      expect(r.code).toBe(1);
      expect(r.err).toContain('cid photo 1: the Commons file changed');
      expect(s.reqs.some((q) => q.method === 'PATCH' || (q.method === 'POST' && q.path.includes('/object/cards/')))).toBe(false);
      expect(s.reqs.filter((q) => q.host === 'commons.test').map((q) => q.path)).toEqual(['/orig/cid.jpg']);
      const rep = JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'));
      expect(rep.stopped).toContain('the Commons file changed');
      expect(rep.photos.uploaded).toBe(0);
    } finally { await s.close(); }
  });

  it('an answer of the project that echoes the key is printed and reported with [redacted]', async () => {
    const s = await server({ rows: [], rowsError: true });
    try {
      const dir = mkdtempSync(path.join(tmpdir(), 'cards-pub-echo-'));
      const r = await run(ciArgs(dir, ['--keep-going']), ciEnv(s.base));
      expect(r.code).toBe(1);
      expect(r.err).toContain('GET cards_photos: 401');
      expect(r.err).toContain('[redacted]');
      expect(r.out + r.err).not.toContain(KEY);
      const text = readFileSync(path.join(dir, 'report.json'), 'utf8');
      expect(text).not.toContain(KEY);
      expect(existsSync(path.join(dir, 'originals'))).toBe(false);
    } finally { await s.close(); }
  });
});

describe('lot CPUB-RETRY: passing errors of the project are tried again; --keep-going skips a photo the project still refuses', () => {
  const tries = (s: Server, method: string, prefix: string): number => s.reqs.filter((q) => q.host === HOST && q.method === method && q.path.startsWith(prefix)).length;

  it('a 520 on the rows, an upload and the PATCH, then OK: the photo is published, exit 0', async () => {
    const s = await server({
      rows: rows(['ada']),
      project: (m, p, n) => (n === 1 && ((m === 'GET' && p.startsWith('/rest/v1/cards_photos?')) || p === '/storage/v1/object/cards/ada-50-50-1x.webp' || m === 'PATCH') ? 520 : null),
    });
    try {
      const dir = mkdtempSync(path.join(tmpdir(), 'cards-retry-ok-'));
      const r = await run(ciArgs(dir, ['--keep-going']), ciEnv(s.base));
      expect(r.err).toBe('');
      expect(r.code).toBe(0);
      expect(tries(s, 'GET', '/rest/v1/cards_photos?')).toBe(2);
      expect(tries(s, 'POST', '/storage/v1/object/cards/ada-50-50-1x.webp')).toBe(2);
      expect(tries(s, 'POST', '/storage/v1/object/cards/ada-50-50-2x.webp')).toBe(1);
      expect(tries(s, 'PATCH', '/rest/v1/cards_photos?id=eq.1')).toBe(2);
      expect(JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'))).toMatchObject({ photos: { uploaded: 1, failed: 0 }, failed: [], stopped: null });
    } finally { await s.close(); }
  });

  it('--keep-going: an upload still failing after 4 tries skips its photo (row unchanged, listed), the next photo is published, exit 2', async () => {
    const s = await server({ rows: rows(['trio', 'duo']), project: (_m, p) => (p === '/storage/v1/object/cards/trio-50-50-t2-1x.webp' ? 520 : null) });
    try {
      const dir = mkdtempSync(path.join(tmpdir(), 'cards-retry-skip-'));
      const r = await run(ciArgs(dir, ['--keep-going']), ciEnv(s.base));
      expect(r.code).toBe(2);
      expect(tries(s, 'POST', '/storage/v1/object/cards/trio-50-50-t2-1x.webp')).toBe(4);
      expect(r.out).toContain('trio photo 1: FAILED on the project, skipped (--keep-going): upload trio-50-50-t2-1x.webp: 520 error 520');
      expect(tries(s, 'PATCH', '/rest/v1/cards_photos?id=eq.2')).toBe(0);
      expect(tries(s, 'PATCH', '/rest/v1/cards_photos?id=eq.3')).toBe(1);
      const rep = JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'));
      expect(rep).toMatchObject({ photos: { uploaded: 1, failed: 1 }, panoramas: 1, stopped: null });
      expect(rep.failed).toEqual([{ slug: 'trio', slot: 1, page: 'https://commons.test/wiki/File:trio.jpg', reason: 'upload trio-50-50-t2-1x.webp: 520 error 520' }]);
      expect(r.out + r.err + JSON.stringify(rep)).not.toContain(KEY);
    } finally { await s.close(); }
  });

  it('--keep-going: 5 photos in a row failing on the project stop the run, exit 1', async () => {
    const s = await server({ rows: rows(['ada', 'trio', 'duo', 'eve', 'fay']), project: (m, p) => (m === 'POST' && p.startsWith('/storage/v1/object/cards/') ? 503 : null) });
    try {
      const dir = mkdtempSync(path.join(tmpdir(), 'cards-retry-five-'));
      const r = await run(ciArgs(dir, ['--keep-going']), ciEnv(s.base));
      expect(r.code).toBe(1);
      expect(r.err).toContain('stopped: 5 photos in a row failed on the project (the last: upload fay-50-50-1x.webp: 503 error 503)');
      const rep = JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'));
      expect(rep.failed.map((f: { slug: string }) => f.slug)).toEqual(['ada', 'trio', 'duo', 'eve', 'fay']);
      expect(rep.stopped).toContain('stopped: 5 photos in a row');
      expect(s.reqs.some((q) => q.method === 'PATCH')).toBe(false);
      expect(s.reqs.some((q) => q.path === '/storage/v1/object/list/cards')).toBe(false);
    } finally { await s.close(); }
  });

  it('--keep-going: a 401 of the project stops at once, without a second try and before the next photo', async () => {
    const s = await server({ rows: rows(['ada', 'eve']), project: (_m, p) => (p === '/storage/v1/object/cards/ada-50-50-1x.webp' ? 401 : null) });
    try {
      const dir = mkdtempSync(path.join(tmpdir(), 'cards-retry-401-'));
      const r = await run(ciArgs(dir, ['--keep-going']), ciEnv(s.base));
      expect(r.code).toBe(1);
      expect(r.err).toContain('upload ada-50-50-1x.webp: 401');
      expect(tries(s, 'POST', '/storage/v1/object/cards/')).toBe(1);
      expect(s.reqs.filter((q) => q.host === 'commons.test').map((q) => q.path)).toEqual(['/orig/ada.jpg']);
    } finally { await s.close(); }
  });

  it('without --keep-going an upload still failing after its tries stops the run, exit 1, the row unchanged', async () => {
    const s = await server({ rows: rows(['ada']), project: (_m, p) => (p === '/storage/v1/object/cards/ada-50-50-2x.webp' ? 524 : null) });
    try {
      const dir = mkdtempSync(path.join(tmpdir(), 'cards-retry-stop-'));
      const r = await run(ciArgs(dir), ciEnv(s.base));
      expect(r.code).toBe(1);
      expect(tries(s, 'POST', '/storage/v1/object/cards/ada-50-50-2x.webp')).toBe(4);
      expect(r.err).toContain('upload ada-50-50-2x.webp: 524');
      expect(s.reqs.some((q) => q.method === 'PATCH')).toBe(false);
    } finally { await s.close(); }
  });
});

describe('lot CPUB-RETRY: the live photos are read page by page (Cards publish #2: the API answers at most 1,000 rows a read)', () => {
  const N = 1101;
  const slug = (i: number): string => `m${String(i).padStart(4, '0')}`;
  const bigDir = mkdtempSync(path.join(tmpdir(), 'cards-pub-1101-data-'));
  const dir = mkdtempSync(path.join(tmpdir(), 'cards-pub-1101-run-'));
  const STALE = ['m0500-40-40-1x.webp', 'm1050-40-40-1x.webp']; // an old focal point, one row in the first 1,000 and one beyond
  let img: Buffer;
  let bigRows: Record<string, unknown>[] = [];
  let s: Server;
  let r: Run;
  const bigRun = (srv: Server, out: string): Promise<Run> => run(ciArgs(out, ['--keep-going']), { ...ciEnv(srv.base), CARDS_DATA_DIR: bigDir });

  beforeAll(async () => {
    img = await rect(1000, 1500, 90);
    const subjects = Array.from({ length: N }, (_, k) => {
      const sl = slug(k + 1);
      return { slug: sl, name: sl.toUpperCase(), kind: 'idol', photos: [{ slot: 1, page: `https://commons.test/wiki/File:${sl}.jpg`, url: `https://commons.test/orig/${sl}.jpg`, sha1: sha1(img), status: 'approved', focal: { x: 50, y: 50 } }] };
    });
    writeFileSync(path.join(bigDir, 'photos.json'), JSON.stringify({ subjects, left_out: [] }));
    writeFileSync(path.join(bigDir, 'subjects.json'), JSON.stringify(subjects.map((x) => ({ slug: x.slug }))));
    // 1,100 photos already published at their focal point; the last one (id 1101, beyond the first 1,000 rows) is still to publish
    bigRows = Array.from({ length: N }, (_, k) => {
      const sl = slug(k + 1);
      const done = k + 1 < N;
      return {
        id: k + 1, entity_id: `idol:${sl}`, slot: 1, source_page: `https://commons.test/wiki/File:${sl}.jpg`, status: 'approved', focal_x: 50, focal_y: 50,
        storage_path: done ? `${sl}-50-50` : null, file_focal_x: done ? 50 : null, file_focal_y: done ? 50 : null, parts: null, file_parts: done ? 2 : null, file_pano: false,
      };
    });
    const bucket = [...bigRows.flatMap((row) => (row.storage_path ? ['1x', '2x'].map((k) => `${String(row.storage_path)}-${k}.webp`) : [])), ...STALE]
      .sort().map((name, i) => ({ name, id: `o${i}` }));
    s = await server({ rows: bigRows, bucket, originals: new Map([[`${slug(N)}.jpg`, img]]) });
    r = await bigRun(s, dir);
  });
  afterAll(async () => { await s.close(); });

  it('reads the 1,101 live photos in two pages (order=id, limit=1000, offset; Prefer: count=exact on the first) and handles every one', () => {
    expect(r.err).toBe('');
    expect(r.code).toBe(0);
    const reads = s.reqs.filter((q) => q.method === 'GET' && q.path.startsWith('/rest/v1/cards_photos?')).map((q) => {
      const u = new URL(q.path, 'http://x');
      return [u.searchParams.get('order'), u.searchParams.get('limit'), u.searchParams.get('offset'), q.headers.prefer ?? null];
    });
    expect(reads).toEqual([['id', '1000', '0', 'count=exact'], ['id', '1000', '1000', null]]);
    expect(r.out).toContain('live photos read: 1101');
    const rep = JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'));
    expect(rep.photos).toEqual({ live: 1101, uploaded: 1, upToDate: 1100, notInData: 0, failed: 0 });
    // the photo beyond the first 1,000 rows is published: its files and its PATCH
    expect(s.reqs.filter((q) => q.method === 'POST' && q.path.startsWith('/storage/v1/object/cards/')).map((q) => q.path.replace('/storage/v1/object/cards/', ''))).toEqual(['m1101-50-50-1x.webp', 'm1101-50-50-2x.webp']);
    expect(s.reqs.filter((q) => q.method === 'PATCH').map((q) => q.path)).toEqual(['/rest/v1/cards_photos?id=eq.1101']);
  });

  it('the cleanup starts from the 1,101 rows: no file of a photo beyond the first 1,000 rows is proposed, only the old focal points', () => {
    const rep = JSON.parse(readFileSync(path.join(dir, 'report.json'), 'utf8'));
    expect(rep.cleanup).toEqual({ objects: 2 * 1100 + 2, kept: 2 * 1100, proposed: 2, deleted: 0 });
    const proposed = r.out.split('\n').map((l) => /^ {2}(\S+\.webp) {2}\(/.exec(l)?.[1]).filter(Boolean);
    expect(proposed).toEqual(STALE);
    expect(s.reqs.filter((q) => q.path === '/storage/v1/object/list/cards')).toHaveLength(3);
    expect(s.reqs.some((q) => q.method === 'DELETE')).toBe(false);
  });

  it('a total in Content-Range that is not the rows read stops the run, exit 1, before any write', async () => {
    const stops = async (opts: { announce?: number; maxRows?: number }, words: string): Promise<void> => {
      const srv = await server({ rows: bigRows, ...opts });
      try {
        const out = mkdtempSync(path.join(tmpdir(), 'cards-pub-count-'));
        const res = await bigRun(srv, out);
        expect(res.code).toBe(1);
        expect(res.err).toContain(`GET cards_photos: ${words}; stopped before any write`);
        expect(srv.reqs.some((q) => q.method !== 'GET' || q.host !== HOST)).toBe(false);
        const rep = JSON.parse(readFileSync(path.join(out, 'report.json'), 'utf8'));
        expect(rep.stopped).toContain(words);
        expect(rep.photos).toMatchObject({ live: null, uploaded: 0 });
        expect(rep.cleanup).toBeNull();
      } finally { await srv.close(); }
    };
    await stops({ announce: 1102 }, '1101 rows read, the project counts 1102'); // a row added between the count and the last page
    await stops({ maxRows: 500 }, '500 rows read, the project counts 1101'); // a project that answers fewer rows a read than asked
  });
});
