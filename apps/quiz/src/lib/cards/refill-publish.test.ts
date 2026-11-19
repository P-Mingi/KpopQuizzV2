// Bunnyverse Cards, lot LAUNCH-PREP lane REFILL: the publish workflow cuts the new photos of 123-refill.sql. Their rows are approved with no
// file, and publish-card-files.mjs finds a row's Commons original through the data files by source page: lot 3's photos.json, lot6/photos.json
// and now lot8/photos.json (the new photos of 123), read the same way. The real script runs in a child process, without a terminal, against
// a local server that plays Commons and the Supabase project (the preload of publish-noninteractive.test.ts); the pictures are coloured
// rectangles made here. Proved: a row whose page is only in lot8/photos.json is cut and uploaded in its parts (a person, a group in 3), its
// row closed in one PATCH, never "not in photos.json"; without lot8/photos.json the same row is skipped as before.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const SCRIPT = path.resolve(__dirname, '../../../scripts/cards/publish-card-files.mjs');
const PRELOAD = path.resolve(__dirname, 'fixtures/publish-fetch-preload.mjs');
const KEY = 'test-only-service-value-8c3e1a0f5b';
const HOST = 'proj.test';
const sha1 = (b: Buffer): string => createHash('sha1').update(b).digest('hex');

interface Req { method: string; host: string; path: string; body: string }
let ada: Buffer, trio: Buffer, old: Buffer;
const page = (f: string) => `https://commons.wikimedia.org/wiki/File:${f}`;

beforeAll(async () => {
  const rect = (w: number, h: number, r: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r, g: 80, b: 150 } } }).jpeg().toBuffer();
  ada = await rect(1200, 1800, 10);
  trio = await rect(3300, 1700, 20);
  old = await rect(1000, 1500, 30);
});

/** A data folder: lot 3's photos.json with an older photo of the person, and (when `lot8`) lot8/photos.json with the two new photos of 123. */
function dataDir(lot8: boolean): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'cards-refill-data-'));
  const photo = (slot: number, file: string, img: Buffer, o: Record<string, unknown> = {}) => ({ slot, status: 'approved', page: page(file), url: `https://upload.wikimedia.org/o/${file}`, sha1: sha1(img), focal: { x: 50, y: 30 }, ...o });
  writeFileSync(path.join(dir, 'photos.json'), JSON.stringify({ subjects: [{ slug: 'ada', name: 'Ada', kind: 'idol', photos: [photo(1, 'ada-old.jpg', old)] }], left_out: [] }));
  writeFileSync(path.join(dir, 'subjects.json'), JSON.stringify([{ slug: 'ada' }]));
  if (lot8) {
    mkdirSync(path.join(dir, 'lot8'));
    writeFileSync(path.join(dir, 'lot8', 'photos.json'), JSON.stringify({
      checked_on: '2026-11-18',
      subjects: [
        { slug: 'ada', name: 'Ada', kind: 'idol', end_year: null, photos: [photo(4, 'ada-new.jpg', ada, { parts: null })] },
        { slug: 'trio', name: 'Trio', kind: 'group', end_year: null, photos: [photo(2, 'trio-new.jpg', trio, { parts: 3, focal: { x: 50, y: 50 } })] },
      ],
      left_out: [],
    }));
  }
  return dir;
}

/** The rows of cards_photos after 123: the older photo already cut, and the two new photos approved with no file. */
const ROWS = [
  { id: 1, entity_id: 'idol:ada', slot: 1, source_page: page('ada-old.jpg'), status: 'approved', focal_x: 50, focal_y: 30, storage_path: 'ada-50-30', file_focal_x: 50, file_focal_y: 30, parts: null, file_parts: 2, file_pano: false },
  { id: 2, entity_id: 'idol:ada', slot: 4, source_page: page('ada-new.jpg'), status: 'approved', focal_x: 50, focal_y: 30, storage_path: null, file_focal_x: null, file_focal_y: null, parts: null, file_parts: null, file_pano: false },
  { id: 3, entity_id: 'group:trio', slot: 2, source_page: page('trio-new.jpg'), status: 'approved', focal_x: 50, focal_y: 50, storage_path: null, file_focal_x: null, file_focal_y: null, parts: 3, file_parts: null, file_pano: false },
];

async function server(): Promise<{ base: string; reqs: Req[]; close: () => Promise<void> }> {
  const reqs: Req[] = [];
  const srv = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url ?? '/', 'http://x');
      const [, host, ...rest] = url.pathname.split('/');
      const p = `/${rest.join('/')}${url.search}`;
      const body = Buffer.concat(chunks);
      reqs.push({ method: req.method ?? '', host: host ?? '', path: p, body: p.includes('/object/cards/') ? '' : body.toString('utf8') });
      if (host === 'upload.wikimedia.org') {
        const img = { '/o/ada-new.jpg': ada, '/o/trio-new.jpg': trio, '/o/ada-old.jpg': old }[p];
        if (!img) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(img); return;
      }
      if (host !== HOST) { res.writeHead(500); res.end('unexpected host'); return; }
      if (req.method === 'GET' && p.startsWith('/rest/v1/cards_photos?')) {
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const pageRows = ROWS.slice(offset, offset + 1000);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Range': `${pageRows.length ? `${offset}-${offset + pageRows.length - 1}` : '*'}/${ROWS.length}` });
        res.end(JSON.stringify(pageRows)); return;
      }
      if (req.method === 'PATCH') { res.writeHead(204); res.end(); return; }
      if (req.method === 'POST' && p.startsWith('/storage/v1/object/cards/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); return; }
      if (req.method === 'POST' && p === '/storage/v1/object/list/cards') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('[]'); return; }
      res.writeHead(500); res.end('unexpected request');
    });
  });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  const { port } = srv.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, reqs, close: () => new Promise((ok) => srv.close(() => ok())) };
}

function runScript(data: string, base: string): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((ok) => {
    const child = spawn(process.execPath, ['--import', pathToFileURL(PRELOAD).href, SCRIPT, '--publish', '--non-interactive', '--host', HOST, '--keep-going'], {
      env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '', CARDS_DATA_DIR: data, CARDS_SUPABASE_URL: `https://${HOST}`, CARDS_SERVICE_KEY: KEY, CARDS_TEST_SERVER: base },
    });
    child.stdin.end();
    let out = '', err = '';
    child.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    child.on('close', (code: number | null) => ok({ code, out, err }));
  });
}

describe('publish-card-files.mjs reads lot8/photos.json (the new photos of 123)', () => {
  let s: Awaited<ReturnType<typeof server>>;
  afterAll(async () => { await s?.close(); });

  it('cuts and uploads a row found only in lot8/photos.json, a person and a group in 3 parts, one PATCH each; the older photo is skipped', async () => {
    s = await server();
    const r = await runScript(dataDir(true), s.base);
    expect(r.err).toBe('');
    expect(r.code).toBe(0);
    expect(r.out).not.toContain('not in photos.json');
    const up = s.reqs.filter((q) => q.method === 'POST' && q.path.startsWith('/storage/v1/object/cards/')).map((q) => q.path.replace('/storage/v1/object/cards/', '')).sort();
    expect(up).toEqual([
      'ada-s4-50-30-1x.webp', 'ada-s4-50-30-2x.webp',
      'trio-s2-50-50-p3-1x.webp', 'trio-s2-50-50-p3-2x.webp',
      'trio-s2-50-50-t1-1x.webp', 'trio-s2-50-50-t1-2x.webp', 'trio-s2-50-50-t2-1x.webp', 'trio-s2-50-50-t2-2x.webp', 'trio-s2-50-50-t3-1x.webp', 'trio-s2-50-50-t3-2x.webp',
    ]);
    const patches = s.reqs.filter((q) => q.method === 'PATCH').map((q) => [q.path.replace(/^.*id=eq\./, ''), JSON.parse(q.body)]);
    expect(patches).toEqual([
      ['2', { storage_path: 'ada-s4-50-30', file_focal_x: 50, file_focal_y: 30, file_parts: 2, file_pano: false }],
      ['3', { storage_path: 'trio-s2-50-50', file_focal_x: 50, file_focal_y: 50, file_parts: 3, file_pano: true }],
    ]);
    expect(r.out).toContain('ada photo 1: already cut at 50/30');
    expect(r.out).toContain('uploaded 2, skipped 1');
    // the originals come from their recorded Commons address, the older one is not downloaded
    expect(s.reqs.filter((q) => q.host === 'upload.wikimedia.org').map((q) => q.path)).toEqual(['/o/ada-new.jpg', '/o/trio-new.jpg']);
    await s.close();
  });

  it('without lot8/photos.json the same rows are skipped as "not in photos.json" (what 123 would meet without the data file)', async () => {
    s = await server();
    const r = await runScript(dataDir(false), s.base);
    expect(r.code).toBe(0);
    expect(r.out).toContain('ada photo 4: not in photos.json, skipped');
    expect(r.out).toContain('trio photo 2: not in photos.json, skipped');
    expect(s.reqs.some((q) => q.method === 'PATCH')).toBe(false);
  });
});
