// The non-interactive mode of publish-card-files.mjs (integrator, 2026-11-17: the owner publishes from GitHub Actions). The real script runs
// in a child process, without a terminal, against a local server that plays Commons (the originals) and the Supabase project (rows, bucket);
// a preload (fixtures/publish-fetch-preload.mjs) sends every fetch of the child there. The pictures are plain coloured rectangles made here.
// Proved: nothing is typed and no terminal is needed; the host comes from --host and must be the project's; the key comes from the
// environment, goes to the project only and is never printed nor written; --keep-going skips a photo whose original fails (sha1 changed,
// download failed), lists it, goes on and ends with exit code 2; a busy answer is tried again; the cleanup lists and never deletes; the
// report has the counts; --cache-dir saves the originals and a second run does not download them again.
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
  ];
  return only ? all.filter((r) => only.includes(String(r.entity_id).split(':')[1]!)) : all;
}

interface Server { base: string; reqs: Req[]; close: () => Promise<void> }
async function server(opts: { rows: Record<string, unknown>[]; rowsError?: boolean }): Promise<Server> {
  const reqs: Req[] = [];
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
        const ph = photos.find((x) => x.file === file);
        if (!ph || ph.status === 404) { res.writeHead(404); res.end('not found'); return; }
        if (busy.delete(file)) { res.writeHead(503, { 'Retry-After': '0' }); res.end('busy'); return; }
        res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(ph.served ?? ph.img); return;
      }
      if (host !== HOST) { res.writeHead(500); res.end('unexpected host'); return; }
      if (req.method === 'GET' && p.startsWith('/rest/v1/cards_photos?')) {
        if (opts.rowsError) { json(401, { message: `Invalid API key ${String(req.headers.apikey)}` }); return; }
        json(200, opts.rows); return;
      }
      if (req.method === 'PATCH' && p.startsWith('/rest/v1/cards_photos?id=eq.')) { res.writeHead(204); res.end(); return; }
      if (req.method === 'POST' && p.startsWith('/storage/v1/object/cards/')) { json(200, { Key: p }); return; }
      if (req.method === 'POST' && p === '/storage/v1/object/list/cards') {
        json(200, [{ name: 'bea-50-50-1x.webp', id: 'a' }, { name: 'ada-40-40-1x.webp', id: 'b' }, { name: 'ada-40-40-2x.webp', id: 'c' }]); return;
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
