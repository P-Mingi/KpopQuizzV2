// KpopCards launch prep (Part C): the Kpopdle faces from the Commons photos of the cards. The selection (commons-faces.mjs) on a fixture: only a live
// photo of an adult subject with the verdict OK, the best rank first, a missing rank column an error; the crop (the 4:5 box at the focal point); the
// row (licence mapped onto entity_images.license, the Commons credit); and the whole run of kpopdle-commons.mjs with every network call mocked: the
// preview reads only, --publish writes the files and the rows, removes the old photo of an idol with no Commons face, is idempotent, never prints the key.
// The fixture is invented (no real person, no birth date).
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

interface Photo { id: number; entity_id: string; slot: number; status: string; author: string | null; licence: string; licence_url: string | null; source_page: string; file_url: string; sha1: string; focal_x: number; focal_y: number; source_width: number; source_height: number; news_only: boolean; event_name: string | null; modified: string | null }
interface Verdict { verdict: string; rank: number | null }
interface Idol { idol_id: number; name: string; group: string; qid: string | null }
interface Entity { id: string; kind: string; qid: string | null; active: boolean; age_lock: boolean | null }
interface Mod {
  parseCsv: (t: string) => string[][];
  parseVerdicts: (t: string) => Map<number, Verdict>;
  selectFaces: (i: { idols: Idol[]; entities: Entity[]; photos: Photo[]; verdicts: Map<number, Verdict> }) => { chosen: Array<{ idol: Idol; photo: Photo; rank: number }>; keep: Array<{ idol: Idol; why: string; detail?: string }> };
  cardLicence: (l: string) => string | null;
  commonsFileOf: (p: string) => string | null;
  isKdh: (p: Partial<Photo>) => boolean;
  photoProblem: (p: Photo) => string | null;
  faceFields: (p: Photo, paths: { p1: string; pt: string }) => Record<string, unknown>;
  isOldRow: (r: { license?: string; license_note?: string }) => boolean;
}
interface Box { faceBox: (w: number, h: number, fx: number, fy: number) => { left: number; top: number; width: number; height: number }; thumbBox: (b: { width: number; height: number }) => { left: number; top: number; width: number; height: number } }
interface Run { main: (argv?: string[], deps?: Record<string, unknown>) => Promise<{ idols: number; commons: number; drawn: number; removed: number; published: number; errors: number }> }

let mod: Mod;
let box: Box;
let run: Run;
let tmp: string;
let jpg: Buffer;
let sha: string;
const SECRET = 'svc-secret-never-print';
const logs: string[] = [];
const calls: Array<{ url: string; m: string; body: string | null; raw: unknown }> = [];

const photo = (o: Partial<Photo> & { id: number; entity_id: string }): Photo => ({
  slot: 1, status: 'auto', author: 'A Photographer', licence: 'CC BY 4.0', licence_url: 'https://creativecommons.org/licenses/by/4.0', source_page: `https://commons.wikimedia.org/wiki/File:Fixture_${o.id}.jpg`,
  file_url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/Fixture_${o.id}.jpg`, sha1: sha ?? 'x', focal_x: 50, focal_y: 30, source_width: 1200, source_height: 1800, news_only: false, event_name: 'A concert', modified: null, ...o,
});
const CSV = 'photo id,verdict,rank,note\n1,OK,2,fine\n2,OK,1,best\n3,RECROP,,move the focal point\n4,REPLACE,,blurred\n5,OK,1,"quoted, note"\n6,OK,2,second\n7,OK,1,x\n8,OK,1,x\n9,OK,1,x\n10,OK,1,x\n11,OK,1,x\n12,OK,1,x\n13,OK,1,x\n15,OK,1,x\n';

const ENTITIES: Entity[] = [
  { id: 'idol:a', kind: 'idol', qid: 'Q1', active: true, age_lock: false }, { id: 'idol:b', kind: 'idol', qid: 'Q2', active: true, age_lock: false },
  { id: 'idol:c', kind: 'idol', qid: 'Q3', active: true, age_lock: true }, { id: 'idol:e', kind: 'idol', qid: 'Q5', active: true, age_lock: false },
  { id: 'idol:f', kind: 'idol', qid: 'Q6', active: true, age_lock: false }, { id: 'idol:g', kind: 'idol', qid: 'Q7', active: true, age_lock: false },
  { id: 'group:h', kind: 'group', qid: 'Q8', active: true, age_lock: false }, { id: 'idol:i', kind: 'idol', qid: 'Q9', active: false, age_lock: false },
  { id: 'idol:j', kind: 'idol', qid: 'Q10', active: true, age_lock: null }, { id: 'idol:k1', kind: 'idol', qid: 'Q11', active: true, age_lock: false },
  { id: 'idol:k2', kind: 'idol', qid: 'Q11', active: true, age_lock: false }, { id: 'idol:l', kind: 'idol', qid: 'Q12', active: true, age_lock: false },
  { id: 'idol:m', kind: 'idol', qid: 'Q13', active: true, age_lock: false },
];
const IDOLS: Idol[] = [
  { idol_id: 1, name: 'Ada', group: 'G', qid: 'Q1' }, { idol_id: 2, name: 'Bo', group: 'G', qid: 'Q2' }, { idol_id: 3, name: 'Cy', group: 'G', qid: 'Q3' },
  { idol_id: 4, name: 'Di', group: 'G', qid: null }, { idol_id: 5, name: 'Ed', group: 'G', qid: 'Q5' }, { idol_id: 6, name: 'Flo', group: 'G', qid: 'Q6' },
  { idol_id: 7, name: 'Gus', group: 'G', qid: 'Q7' }, { idol_id: 8, name: 'Hal', group: 'G', qid: 'Q8' }, { idol_id: 9, name: 'Ivy', group: 'G', qid: 'Q9' },
  { idol_id: 10, name: 'Jo', group: 'G', qid: 'Q10' }, { idol_id: 11, name: 'Kit', group: 'G', qid: 'Q11' }, { idol_id: 12, name: 'Lu', group: 'G', qid: 'Q12' },
  { idol_id: 13, name: 'Mo', group: 'G', qid: 'Q13' }, { idol_id: 14, name: 'Ned', group: 'G', qid: 'Q99' },
];
const photos = (): Photo[] => [
  // idol a: two OK photos; the best rank (2 of slot 3) wins over the first slot (photo 1, rank 2)
  photo({ id: 1, entity_id: 'idol:a', slot: 1 }), photo({ id: 2, entity_id: 'idol:a', slot: 3 }),
  // idol b: RECROP and REPLACE only
  photo({ id: 3, entity_id: 'idol:b' }), photo({ id: 4, entity_id: 'idol:b', slot: 2 }),
  // idol c: age locked, the photo is OK
  photo({ id: 7, entity_id: 'idol:c' }),
  // idol e: rank 1 has a non free licence and no author is not the case, rank 2 is fine
  photo({ id: 5, entity_id: 'idol:e', licence: 'CC BY-NC 4.0' }), photo({ id: 6, entity_id: 'idol:e', slot: 2 }),
  // idol f: the OK photo is about the film
  photo({ id: 8, entity_id: 'idol:f', source_page: 'https://commons.wikimedia.org/wiki/File:KPop_Demon_Hunters_poster.jpg' }),
  // idol g: OK verdict but the photo is pending (not live)
  photo({ id: 9, entity_id: 'idol:g', status: 'pending' }),
  // group h, inactive i, age null j: OK photos that must not serve
  photo({ id: 10, entity_id: 'group:h' }), photo({ id: 11, entity_id: 'idol:i' }), photo({ id: 12, entity_id: 'idol:j' }),
  // two subjects with the same qid
  photo({ id: 13, entity_id: 'idol:k1' }),
  // idol l: no verdict row at all
  photo({ id: 14, entity_id: 'idol:l' }),
  // idol m: too small an original
  photo({ id: 15, entity_id: 'idol:m', source_width: 300, source_height: 450 }),
];

const json = (b: unknown, s = 200): Response => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
const page = (url: string, rows: unknown[]): Response => {
  const got = url.includes('offset=0') ? rows : [];
  return new Response(JSON.stringify(got), { status: 200, headers: { 'content-type': 'application/json', 'content-range': `${got.length ? `0-${got.length - 1}` : '*'}/${rows.length}` } });
};
let originalsDownloaded = 0;
function mockFetch(db: { entityImages: unknown[]; photos: Photo[] }): void {
  vi.stubGlobal('fetch', async (url: string, o: { method?: string; body?: unknown } = {}) => {
    const m = o.method ?? 'GET';
    calls.push({ url, m, body: typeof o.body === 'string' ? o.body : null, raw: o.body });
    if (url.startsWith('https://upload.wikimedia.org/')) { originalsDownloaded++; return new Response(new Uint8Array(jpg), { status: 200 }); }
    if (url.includes('/rest/v1/dle_entities')) return page(url, IDOLS.map((i) => ({ entity_id: String(i.idol_id) })));
    if (url.includes('/rest/v1/idols')) return page(url, IDOLS.map((i) => ({ id: i.idol_id, name: i.name, wikidata_qid: i.qid, group_id: 1 })));
    if (url.includes('/rest/v1/groups')) return page(url, [{ id: 1, name: 'G' }]);
    if (url.includes('/rest/v1/cards_entities')) return page(url, ENTITIES);
    if (url.includes('/rest/v1/cards_photos')) return page(url, db.photos);
    if (url.includes('/rest/v1/entity_images') && m === 'GET') return page(url, db.entityImages);
    if (url.includes('/rest/v1/entity_images') && (m === 'POST' || m === 'DELETE')) return new Response(null, { status: m === 'POST' ? 201 : 204 });
    if (url.includes('/storage/v1/object/entity-images/') && m === 'POST') return json({ Key: 'ok' });
    if (url.endsWith('/storage/v1/object/entity-images') && m === 'DELETE') return json([]);
    throw new Error(`unexpected ${m} ${url}`);
  });
}
const OLD = (slug: number): Record<string, unknown> => ({ slug: String(slug), path: `kpop/idol/${slug}/old.webp`, thumb_path: `kpop/idol/${slug}/old-96.webp`, license: 'other', license_note: 'Photo already used on kpopquiz.org (/idols/x.jpg); supplied by the owner, source not recorded.' });
const HAND = { slug: '12', path: 'kpop/idol/12/hand.webp', thumb_path: 'kpop/idol/12/hand-96.webp', license: 'own_photo', license_note: null };

beforeAll(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'kpopdle-commons-'));
  jpg = await sharp({ create: { width: 1200, height: 1800, channels: 3, background: '#39c' } }).jpeg().toBuffer();
  sha = createHash('sha1').update(jpg).digest('hex');
  const dir = '../../../scripts/cards/kpopdle-photos';
  mod = (await import(/* @vite-ignore */ `${dir}/commons-faces.mjs`)) as unknown as Mod;
  box = (await import(/* @vite-ignore */ `${dir}/face-box.mjs`)) as unknown as Box;
  run = (await import(/* @vite-ignore */ `${dir}/kpopdle-commons.mjs`)) as unknown as Run;
});
afterAll(async () => { await rm(tmp, { recursive: true, force: true }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function arrange(): void {
  logs.length = 0;
  calls.length = 0;
  originalsDownloaded = 0;
  vi.stubEnv('OTAKU_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET);
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
}
const withSha = (): Photo[] => photos().map((p) => ({ ...p, sha1: sha }));

describe('the verdict file', () => {
  it('reads photo id, verdict and rank (header names read loosely, quotes, CRLF)', () => {
    const v = mod.parseVerdicts(CSV.replace(/\n/g, '\r\n'));
    expect(v.get(1)).toEqual({ verdict: 'OK', rank: 2 });
    expect(v.get(2)).toEqual({ verdict: 'OK', rank: 1 });
    expect(v.get(3)).toEqual({ verdict: 'RECROP', rank: null });
    expect(v.get(5)).toEqual({ verdict: 'OK', rank: 1 });
    expect(mod.parseVerdicts('Photo_ID,Verdict,Rank\n9,ok,3\n').get(9)).toEqual({ verdict: 'OK', rank: 3 });
  });
  it('a missing rank column is an error that stops the selection, not a fallback', () => {
    expect(() => mod.parseVerdicts('photo id,verdict\n1,OK\n2,RECROP\n')).toThrow(/no rank column/);
    expect(() => mod.parseVerdicts('photo id,rank\n1,1\n')).toThrow(/no verdict column/);
    expect(() => mod.parseVerdicts('verdict,rank\nOK,1\n')).toThrow(/no photo id column/);
    expect(() => mod.parseVerdicts('')).toThrow(/empty/);
  });
  it('refuses an OK row with no usable rank, a repeated photo, an unknown verdict, a bad id', () => {
    expect(() => mod.parseVerdicts('photo id,verdict,rank\n1,OK,\n')).toThrow(/its rank is ""/);
    expect(() => mod.parseVerdicts('photo id,verdict,rank\n1,OK,0\n')).toThrow(/rank/);
    expect(() => mod.parseVerdicts('photo id,verdict,rank\n1,OK,first\n')).toThrow(/rank/);
    expect(() => mod.parseVerdicts('photo id,verdict,rank\n1,OK,1\n1,RECROP,\n')).toThrow(/appears twice/);
    expect(() => mod.parseVerdicts('photo id,verdict,rank\n1,MAYBE,1\n')).toThrow(/MAYBE/);
    expect(() => mod.parseVerdicts('photo id,verdict,rank\nx,OK,1\n')).toThrow(/photo id/);
  });
});

describe('the selection', () => {
  const sel = (): ReturnType<Mod['selectFaces']> => mod.selectFaces({ idols: IDOLS, entities: ENTITIES, photos: withSha(), verdicts: mod.parseVerdicts(CSV) });
  const why = (id: number): string | undefined => sel().keep.find((k) => k.idol.idol_id === id)?.why;

  it('takes the OK photo with the best rank, not the first slot', () => {
    const a = sel().chosen.find((c) => c.idol.idol_id === 1)!;
    expect(a.photo.id).toBe(2);
    expect(a.rank).toBe(1);
  });
  it('an OK photo whose licence is not free is passed over for the next OK rank; a RECROP or REPLACE photo never serves', () => {
    expect(sel().chosen.find((c) => c.idol.idol_id === 5)!.photo.id).toBe(6);
    expect(why(2)).toBe('no_ok_verdict');
  });
  it('an age locked, inactive, non person, ambiguous or unknown subject keeps the drawn card, and so does an age lock that is not a plain false', () => {
    expect(why(3)).toBe('age_locked');
    expect(why(10)).toBe('age_locked');
    expect(why(9)).toBe('inactive');
    expect(why(8)).toBe('not_a_person');
    expect(why(11)).toBe('ambiguous_subject');
    expect(why(4)).toBe('no_subject');
    expect(why(14)).toBe('no_subject');
  });
  it('a photo that is not live, has no verdict, shows the film, or is too small never serves', () => {
    expect(why(7)).toBe('no_live_photo');
    expect(why(12)).toBe('no_ok_verdict'); // a live photo with no verdict row never serves
    expect(why(13)).toBe('no_usable_photo');
    expect(sel().keep.find((k) => k.idol.idol_id === 6)).toMatchObject({ why: 'no_usable_photo', detail: 'KPop Demon Hunters' });
    expect(sel().keep.find((k) => k.idol.idol_id === 13)).toMatchObject({ why: 'no_usable_photo', detail: 'original too small' });
  });
  it('every idol is either chosen or kept, once; a verdict file passed without verdicts is refused', () => {
    const s = sel();
    expect(s.chosen.length + s.keep.length).toBe(IDOLS.length);
    expect(s.chosen.map((c) => c.idol.idol_id)).toEqual([1, 5]);
    expect(() => mod.selectFaces({ idols: IDOLS, entities: ENTITIES, photos: [], verdicts: undefined as unknown as Map<number, Verdict> })).toThrow(/verdicts/);
  });
  it('the photo problems are named', () => {
    const p = withSha()[0]!;
    expect(mod.photoProblem(p)).toBeNull();
    expect(mod.photoProblem({ ...p, news_only: true })).toBe('news only');
    expect(mod.photoProblem({ ...p, author: ' ' })).toBe('no author');
    expect(mod.photoProblem({ ...p, licence: 'CC BY-SA 4.0 ND' })).toBe('licence not free');
    expect(mod.photoProblem({ ...p, source_page: 'https://example.org/File:x.jpg' })).toBe('no Commons page');
    expect(mod.photoProblem({ ...p, file_url: 'https://example.org/x.jpg' })).toBe('no Commons original');
    expect(mod.photoProblem({ ...p, status: 'rejected' })).toBe('not live');
  });
  it('the film is recognised in the page, the event and the file address', () => {
    expect(mod.isKdh({ source_page: 'https://commons.wikimedia.org/wiki/File:Kpop%20Demon%20Hunters.png' })).toBe(true);
    expect(mod.isKdh({ event_name: 'KPop Demon Hunters screening' })).toBe(true);
    expect(mod.isKdh({ file_url: 'https://upload.wikimedia.org/x/Demon_Hunters_still.jpg' })).toBe(true);
    expect(mod.isKdh({ source_page: 'https://commons.wikimedia.org/wiki/File:Fixture_1.jpg', event_name: 'A concert' })).toBe(false);
  });
});

describe('the crop and the row', () => {
  it('the box is the widest 4:5 window placed by the focal point, the thumbnail a square high in it', () => {
    expect(box.faceBox(1200, 1800, 50, 30)).toEqual({ left: 0, top: 90, width: 1200, height: 1500 });
    expect(box.faceBox(1200, 1800, 50, 0).top).toBe(0);
    expect(box.faceBox(1200, 1800, 50, 100).top).toBe(300);
    expect(box.faceBox(2000, 1000, 50, 50)).toEqual({ left: 600, top: 0, width: 800, height: 1000 });
    expect(box.faceBox(1200, 1800, Number.NaN, Number.NaN)).toEqual(box.faceBox(1200, 1800, 50, 50));
    const b = box.faceBox(1200, 1800, 50, 30);
    expect(box.thumbBox(b)).toEqual({ left: 0, top: Math.round((1500 - 1200) * 0.25), width: 1200, height: 1200 });
  });
  it('maps the Commons licences onto entity_images.license and fills the credit', () => {
    const allowed = ['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'own_photo', 'licensed', 'other'];
    const map: Array<[string, string | null]> = [['CC BY 3.0', 'cc_by'], ['CC BY 2.0 kr', 'cc_by'], ['CC BY-SA 4.0', 'cc_by_sa'], ['CC0', 'cc0'], ['Public domain', 'public_domain'], ['CC BY-NC 2.0', null], ['CC BY-ND 2.0', null], ['All rights reserved', null]];
    for (const [l, e] of map) { expect(mod.cardLicence(l), l).toBe(e); if (e) expect(allowed).toContain(e); }
    const p = photo({ id: 77, entity_id: 'idol:a', licence: 'CC BY-SA 4.0', source_page: 'https://commons.wikimedia.org/wiki/File:BIBI_in_June_2025_(cropped).jpg', modified: 'cropped' });
    const f = mod.faceFields(p, { p1: 'kpop/idol/1/h.webp', pt: 'kpop/idol/1/h-96.webp' });
    expect(f).toMatchObject({
      license: 'cc_by_sa', author: 'A Photographer', source_url: p.source_page, commons_file: 'File:BIBI_in_June_2025_(cropped).jpg',
      license_url: 'https://creativecommons.org/licenses/by/4.0', width: 400, height: 500, path: 'kpop/idol/1/h.webp', thumb_path: 'kpop/idol/1/h-96.webp', license_verified: true,
    });
    expect(String(f.license_note).length).toBeLessThanOrEqual(500);
    expect(mod.faceFields({ ...p, licence_url: 'http://insecure.example' }, { p1: 'a.webp', pt: 'b.webp' }).license_url).toBeNull();
    expect(mod.commonsFileOf('https://example.org/wiki/File:x.jpg')).toBeNull();
    expect(mod.commonsFileOf('https://commons.wikimedia.org/wiki/Category:x')).toBeNull();
  });
  it('knows the rows the old script wrote and no other', () => {
    expect(mod.isOldRow(OLD(1) as { license: string; license_note: string })).toBe(true);
    expect(mod.isOldRow(HAND as unknown as { license: string })).toBe(false);
    expect(mod.isOldRow({ license: 'other', license_note: 'A picture set by the owner in the admin.' })).toBe(false);
  });
});

describe('the run', () => {
  async function verdictFile(text = CSV): Promise<string> {
    const f = path.join(tmp, `v-${Math.random().toString(16).slice(2)}.csv`);
    await writeFile(f, text);
    return f;
  }
  const deps = (reportFile: string) => ({ reportFile, sharp, pauseMs: 0, gapMs: 0, sleep: async () => undefined, stepSummary: path.join(tmp, 'summary.md') });

  it('a missing rank column stops the run before anything is read or written; so does a missing file or flag', async () => {
    arrange();
    mockFetch({ entityImages: [], photos: withSha() });
    await expect(run.main(['--verdicts', await verdictFile('photo id,verdict\n1,OK\n'), '--publish'], deps(path.join(tmp, 'r0.csv')))).rejects.toThrow(/no rank column/);
    await expect(run.main(['--verdicts', path.join(tmp, 'nope.csv'), '--publish'], deps(path.join(tmp, 'r0.csv')))).rejects.toThrow(/does not exist/);
    await expect(run.main(['--publish'], deps(path.join(tmp, 'r0.csv')))).rejects.toThrow(/--verdicts/);
    expect(calls).toEqual([]);
  });
  it('the preview reads only, says who gets a face and who keeps the drawn card, and downloads nothing', async () => {
    arrange();
    mockFetch({ entityImages: [OLD(1), OLD(4), OLD(2), HAND], photos: withSha() });
    const s = await run.main(['--verdicts', await verdictFile()], deps(path.join(tmp, 'r1.csv')));
    expect(calls.every((c) => c.m === 'GET' && !c.url.startsWith('https://upload.wikimedia.org/'))).toBe(true);
    expect(s).toMatchObject({ idols: 14, commons: 2, drawn: 12, removed: 2, published: 0 });
    const out = logs.join('\n');
    expect(out).toContain('would publish  Ada (G)  <- photo 2, rank 1');
    expect(out).toContain('would publish  Ed (G)  <- photo 6, rank 2');
    expect(out).toContain('would remove  the old photo of Bo (G)');
    expect(out).toContain('Preview only');
    expect(out).not.toContain(SECRET);
  });
  it('--publish: three files and one upsert per Commons face, the old photo of the others removed, a hand set picture kept, the key never printed', async () => {
    arrange();
    mockFetch({ entityImages: [OLD(1), OLD(2), OLD(4), HAND], photos: withSha() });
    const s = await run.main(['--verdicts', await verdictFile(), '--publish', '--cache-dir', path.join(tmp, 'cache')], deps(path.join(tmp, 'r2.csv')));
    expect(s).toMatchObject({ commons: 2, published: 2, errors: 0, removed: 2 });
    const ups = calls.filter((c) => c.m === 'POST' && c.url.includes('/storage/v1/object/entity-images/kpop/idol/'));
    expect(ups).toHaveLength(6);
    const sizes = await Promise.all(ups.filter((c) => c.url.startsWith('https://example.supabase.co/storage/v1/object/entity-images/kpop/idol/1/')).map(async (c) => {
      const m = await sharp(c.raw as Buffer).metadata();
      return `${m.format} ${m.width}x${m.height}`;
    }));
    expect(sizes.sort()).toEqual(['webp 400x500', 'webp 800x1000', 'webp 96x96']);
    const rows = calls.filter((c) => c.m === 'POST' && c.url.includes('/rest/v1/entity_images'));
    expect(rows).toHaveLength(2);
    expect(rows.every((c) => c.url.endsWith('?on_conflict=site_id,kind,slug'))).toBe(true);
    const r1 = (JSON.parse(rows[0]!.body!) as Array<Record<string, unknown>>)[0]!;
    expect(r1).toMatchObject({ site_id: 'kpop', kind: 'idol', slug: '1', license: 'cc_by', author: 'A Photographer', commons_file: 'File:Fixture_2.jpg', source_url: 'https://commons.wikimedia.org/wiki/File:Fixture_2.jpg', license_verified: true });
    // the old rows of Bo (2) and Di (4, no subject) are deleted by their key; the hand set picture of Lu (12) is never touched
    const dels = calls.filter((c) => c.m === 'DELETE' && c.url.includes('/rest/v1/entity_images'));
    expect(dels.map((c) => c.url.split('?')[1])).toEqual(['site_id=eq.kpop&kind=eq.idol&slug=eq.2', 'site_id=eq.kpop&kind=eq.idol&slug=eq.4']);
    expect(calls.some((c) => c.url.includes('slug=eq.12'))).toBe(false);
    // the files of the replaced old photo of Ada go too
    const fileDels = calls.filter((c) => c.m === 'DELETE' && c.url.endsWith('/storage/v1/object/entity-images')).map((c) => JSON.parse(c.body!).prefixes as string[]);
    expect(fileDels.some((p) => p.includes('kpop/idol/1/old.webp'))).toBe(true);
    expect(fileDels.some((p) => p.includes('kpop/idol/12/hand.webp'))).toBe(false);
    expect(logs.join('\n')).not.toContain(SECRET);
    expect(calls.every((c) => !c.url.includes(SECRET) && !(c.body ?? '').includes(SECRET))).toBe(true);
    const report = await readFile(path.join(tmp, 'r2.csv'), 'utf8');
    expect(report).toContain('Ada,G,published,2,1');
    expect(report).toContain('Bo,G,old photo removed');
    expect(report).toContain('Lu,G,drawn card');
    expect(await readFile(path.join(tmp, 'summary.md'), 'utf8')).toContain('2 idols got a Commons face');
  });
  it('a second run gives the same files and rows (idempotent) and downloads the originals once thanks to the cache', async () => {
    arrange();
    const cache = path.join(tmp, 'cache2');
    mockFetch({ entityImages: [], photos: withSha() });
    const f = await verdictFile();
    await run.main(['--verdicts', f, '--publish', '--cache-dir', cache], deps(path.join(tmp, 'r3.csv')));
    const first = calls.filter((c) => c.m === 'POST').map((c) => `${c.url} ${c.body ?? ''}`);
    expect(originalsDownloaded).toBe(1); // both fixture photos are the same file (one sha1): one download
    calls.length = 0;
    await run.main(['--verdicts', f, '--publish', '--cache-dir', cache], deps(path.join(tmp, 'r3.csv')));
    expect(originalsDownloaded).toBe(1); // both fixture photos are the same file (one sha1): one download
    expect(calls.filter((c) => c.m === 'POST').map((c) => `${c.url} ${c.body ?? ''}`)).toEqual(first);
  });
  it('an original that is not the recorded file is refused and reported, the others go on', async () => {
    arrange();
    mockFetch({ entityImages: [], photos: withSha().map((p) => (p.id === 2 ? { ...p, sha1: 'f'.repeat(40) } : p)) });
    const s = await run.main(['--verdicts', await verdictFile(), '--publish'], deps(path.join(tmp, 'r4.csv')));
    expect(s).toMatchObject({ published: 1, errors: 1 });
    expect(calls.filter((c) => c.m === 'POST' && c.url.includes('/rest/v1/entity_images'))).toHaveLength(1);
    expect(await readFile(path.join(tmp, 'r4.csv'), 'utf8')).toContain('the Commons file changed');
  });
});
