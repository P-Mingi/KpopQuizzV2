// kpopdle-photos.mjs --publish and its tries (lot CPUB-RETRY, integrator 2026-11-17). The writes go through fetchRetry; the new row of an idol
// is an upsert on UNIQUE (site_id, kind, slug), so a POST whose answer was lost after the insert (a 520 of Cloudflare) is tried again
// without a second row. A simulated project: the table entity_images keeps its unique key like Postgres (a second insert without the upsert
// is a 409). No network, no real key, no wait.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

interface Kp {
  main: (argv?: string[], deps?: Record<string, unknown>) => Promise<{ ready: number; skipped: number; none: number; published: number }>;
  UPSERT_QUERY: string;
  UPSERT_PREFER: string;
}

const SECRET = 'test-only-kpopdle-value-61c0';
const IDOLS = [{ id: 298, name: 'Cha Eun-woo', group_id: 4, photo_url: null }, { id: 260, name: 'Choi Hyun-suk', group_id: 2, photo_url: null }];
const GROUPS = [{ id: 2, name: 'TREASURE' }, { id: 4, name: 'ASTRO' }];
const FILES = ['Cha Eun-woo ASTRO.jpg', 'Hyunsuk Treasure.jpg'];

let kp: Kp;
let tmp = '';
let idolsDir = '';
let reportFile = '';

beforeAll(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'kpopdle-retry-'));
  idolsDir = path.join(tmp, 'idols');
  reportFile = path.join(tmp, 'report.csv');
  await mkdir(idolsDir, { recursive: true });
  const jpg = await sharp({ create: { width: 736, height: 1100, channels: 3, background: '#39c' } }).jpeg().toBuffer();
  for (const f of FILES) await writeFile(path.join(idolsDir, f), jpg);
  kp = (await import(/* @vite-ignore */ '../../../scripts/cards/kpopdle-photos/kpopdle-photos.mjs')) as unknown as Kp;
});
afterAll(async () => { await rm(tmp, { recursive: true, force: true }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

interface Call { url: string; m: string; prefer: string | undefined }
/** The project: reads, the bucket, and entity_images with its unique key. `lostAnswer`: the first POST of a row is written, then answered 520. */
function project(opts: { lostAnswer?: boolean; flakyUpload?: boolean } = {}) {
  const calls: Call[] = [];
  const table = new Map<string, Record<string, unknown>>();
  let posts = 0, uploads = 0;
  const json = (b: unknown, s = 200): Response => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  const page = (url: string, rows: unknown[]): Response => json(url.includes('offset=0') ? rows : []);
  vi.stubGlobal('fetch', async (url: string, o: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
    const m = o.method ?? 'GET';
    calls.push({ url, m, prefer: o.headers?.Prefer });
    if (url.includes('/rest/v1/dle_entities')) return page(url, IDOLS.map((i) => ({ entity_id: String(i.id) })));
    if (url.includes('/rest/v1/idols')) return page(url, IDOLS);
    if (url.includes('/rest/v1/groups')) return page(url, GROUPS);
    if (url.includes('/rest/v1/entity_images') && m === 'GET') return page(url, []);
    if (url.includes('/storage/v1/object/entity-images/') && m === 'POST') {
      uploads++;
      if (opts.flakyUpload && uploads === 1) return new Response('origin error', { status: 520 });
      return json({ Key: 'ok' });
    }
    if (url.includes('/rest/v1/entity_images?') && m === 'POST') {
      posts++;
      const rows = JSON.parse(String(o.body)) as Record<string, unknown>[];
      const upsert = url.includes('on_conflict=site_id,kind,slug') && String(o.headers?.Prefer ?? '').includes('resolution=merge-duplicates');
      for (const r of rows) {
        const k = `${r.site_id}|${r.kind}|${r.slug}`;
        if (table.has(k) && !upsert) return json({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409);
        table.set(k, { ...table.get(k), ...r });
      }
      if (opts.lostAnswer && posts === 1) return new Response('<html>520</html>', { status: 520 }); // written, the answer lost
      return new Response(null, { status: 201 });
    }
    throw new Error(`unexpected ${m} ${url}`);
  });
  return { calls, table, posts: () => posts };
}

function arrange(): void {
  vi.stubEnv('OTAKU_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET);
  vi.spyOn(console, 'log').mockImplementation(() => {});
}
const deps = (waits: number[]): Record<string, unknown> => ({ siteDir: idolsDir, reportFile, sharp, pauseMs: 0, sleep: async (ms: number) => { waits.push(ms); } });

describe('kpopdle-photos.mjs --publish tries again without a second row', () => {
  it('the new row is an upsert on (site_id, kind, slug)', async () => {
    arrange();
    const p = project();
    const res = await kp.main(['--publish'], deps([]));
    expect(res.published).toBe(2);
    const posts = p.calls.filter((c) => c.m === 'POST' && c.url.includes('/rest/v1/entity_images'));
    expect(posts).toHaveLength(2);
    for (const c of posts) {
      expect(c.url).toContain(`/rest/v1/entity_images?${kp.UPSERT_QUERY}`);
      expect(c.prefer).toBe('resolution=merge-duplicates,return=minimal');
    }
    expect(kp.UPSERT_QUERY).toBe('on_conflict=site_id,kind,slug');
    expect(kp.UPSERT_PREFER).toBe('resolution=merge-duplicates,return=minimal');
  });

  it('a POST written then answered 520 is tried again: published once, one row', async () => {
    arrange();
    const p = project({ lostAnswer: true });
    const waits: number[] = [];
    const res = await kp.main(['--publish'], deps(waits));
    expect(res.published).toBe(2);
    expect(p.posts()).toBe(3); // the first idol's POST twice, the second's once
    expect([...p.table.keys()].sort()).toEqual(['kpop|idol|260', 'kpop|idol|298']);
    expect(waits).toEqual([5000]);
  });

  it('an upload answered 520 then OK is tried again: the idol is published', async () => {
    arrange();
    const p = project({ flakyUpload: true });
    const waits: number[] = [];
    const res = await kp.main(['--publish'], deps(waits));
    expect(res.published).toBe(2);
    expect(p.calls.filter((c) => c.m === 'POST' && c.url.includes('/storage/v1/object/entity-images/')).length).toBe(2 * 3 + 1);
    expect(waits).toEqual([5000]);
  });
});
