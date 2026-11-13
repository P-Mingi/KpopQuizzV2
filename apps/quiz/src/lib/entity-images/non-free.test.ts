// Lot 3 DLE: the one selection of the pictures that are not free. Rows close to it that must never be taken, the hosts, the orphan files, the
// button's plan and deletion (refusals included), and NON_FREE_SQL on PGlite held equal to the predicate.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { freshDb, one, rows as sqlRows } from '@/lib/dle/pglite-harness';

import {
  NON_FREE_CONFIRM, NON_FREE_MAX_ROWS, NON_FREE_SQL, deleteNonFree, hostOf, inOrphanWindow, isFandomHost, isNonFreeRow, listBucketObjects, orphansOf,
  ORPHAN_FILES_SQL, planNonFree, selectNonFreeRow, selectNonFreeRows,
} from './non-free';
import { nonFreeFake } from './non-free-fake';

import type { PGlite } from '@electric-sql/pglite';
import type { CandidateRow } from './non-free';
import type { FakeObject } from './non-free-fake';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const OFFICIAL = 'Official artwork, rights belong to the original creators and studio';
let n = 0;
/** An official-artwork row of the import day; `over` moves it away from the selection. */
const official = (over: Partial<CandidateRow> = {}): CandidateRow => {
  n++;
  return {
    id: n, site_id: 'anime', kind: 'character', slug: `one-piece/c${n}`, path: `anime/character/one-piece/c${n}/aaaa${n}.webp`, thumb_path: null,
    license: 'other', license_note: OFFICIAL, source_url: null, created_at: '2026-11-11T21:10:00+00:00', license_verified: false, ...over,
  };
};
/** A cc0 row whose source is the given address. */
const cc0 = (source_url: string | null, over: Partial<CandidateRow> = {}): CandidateRow => official({ license: 'cc0', license_note: null, source_url, created_at: '2026-10-02T08:00:00+00:00', ...over });

describe('the host of an address', () => {
  it('takes the parsed host, lowercase, and only that', () => {
    expect(hostOf('https://naruto.fandom.com/wiki/Naruto')).toBe('naruto.fandom.com');
    expect(hostOf('HTTPS://Static.Wikia.NoCookie.net/x/y.png?cb=1')).toBe('static.wikia.nocookie.net');
    expect(hostOf('https://fandom.com')).toBe('fandom.com');
    expect(hostOf('https://fandom.com:8443/a')).toBe('fandom.com');
    expect(hostOf('https://user:pw@fandom.com/a')).toBe('fandom.com');
    expect(hostOf('https://fandom.com@evil.example.org/a')).toBe('evil.example.org');
  });

  it('refuses what the pattern and the parser do not agree on', () => {
    for (const bad of [null, undefined, '', ' https://fandom.com/', 'ftp://fandom.com/', 'fandom.com', 'https://fandom.com\\@evil.org/', 'https://fan dom.com/', 'https://fandom.com:evil/', 'https://a@b@fandom.com/', 'https:///fandom.com']) {
      expect(hostOf(bad as string | null), String(bad)).toBeNull();
    }
  });

  it('knows fandom.com, wikia.nocookie.net and their subdomains, nothing that only looks like them', () => {
    for (const ok of ['fandom.com', 'one-piece.fandom.com', 'a.b.fandom.com', 'wikia.nocookie.net', 'static.wikia.nocookie.net', 'vignette.wikia.nocookie.net']) expect(isFandomHost(ok), ok).toBe(true);
    for (const no of ['notfandom.com', 'fandom.com.example.org', 'fandom.co', 'xfandom.com', 'fandom.com.', '.fandom.com', 'wikia.nocookie.net.evil.org', 'nocookie.net', 'wikia.com', 'my-fandom.com', 'fandom-com.example.org', null, '']) {
      expect(isFandomHost(no as string | null), String(no)).toBe(false);
    }
  });
});

describe('the selection, one row at a time', () => {
  it('takes the official artwork of the import day and the cc0 rows of Fandom', () => {
    expect(isNonFreeRow(official())).toBe(true);
    expect(isNonFreeRow(official({ license_note: 'Official artwork' }))).toBe(true);
    expect(isNonFreeRow(official({ created_at: '2026-11-11T00:00:00+00:00' }))).toBe(true);
    expect(isNonFreeRow(official({ created_at: '2026-11-11T23:59:59.999+00:00' }))).toBe(true);
    expect(isNonFreeRow(cc0('https://onepiece.fandom.com/wiki/Luffy'))).toBe(true);
    expect(isNonFreeRow(cc0('https://static.wikia.nocookie.net/onepiece/images/a/a1/Luffy.png/revision/latest'))).toBe(true);
    expect(isNonFreeRow(cc0('https://fandom.com/x'))).toBe(true);
    // the cc0 branch has no date
    expect(isNonFreeRow(cc0('https://fandom.com/x', { created_at: '2025-01-01T00:00:00+00:00' }))).toBe(true);
  });

  it('never takes a verified row', () => {
    expect(isNonFreeRow(official({ license_verified: true }))).toBe(false);
    expect(isNonFreeRow(cc0('https://onepiece.fandom.com/wiki/Luffy', { license_verified: true }))).toBe(false);
  });

  it('never takes another date (the UTC day, to the second)', () => {
    for (const at of ['2026-11-10T12:00:00+00:00', '2026-11-12T12:00:00+00:00', '2026-11-10T23:59:59.999+00:00', '2026-11-12T00:00:00+00:00', '2025-11-11T12:00:00+00:00', 'not a date', '']) {
      expect(isNonFreeRow(official({ created_at: at })), at).toBe(false);
    }
    // 2026-11-11 in Paris (UTC+1) at 00:30 is 2026-11-10 23:30 UTC: outside the UTC day; 2026-11-12 00:30 in Paris is 2026-11-11 23:30 UTC: inside.
    expect(isNonFreeRow(official({ created_at: '2026-11-11T00:30:00+01:00' }))).toBe(false);
    expect(isNonFreeRow(official({ created_at: '2026-11-12T00:30:00+01:00' }))).toBe(true);
    expect(isNonFreeRow(official({ created_at: '2026-11-11T23:59:59-02:00' }))).toBe(false);
  });

  it('never takes another source: the word only in a path or query, a lookalike host, a different free licence', () => {
    for (const url of [
      'https://commons.wikimedia.org/wiki/File:Luffy.png', 'https://example.org/fandom.com/Luffy.png', 'https://example.org/a?from=fandom.com', 'https://example.org/#fandom.com',
      'https://notfandom.com/Luffy.png', 'https://fandom.com.example.org/Luffy.png', 'https://xwikia.nocookie.net/a.png', 'https://wikia.nocookie.net.evil.org/a.png',
      'https://fandom.com@evil.example.org/Luffy.png', 'https://evil.example.org\\@fandom.com/', 'https://fandom.com./a', 'http://fandom.co/a', 'https://fandom.community/a', null,
    ]) {
      expect(isNonFreeRow(cc0(url)), String(url)).toBe(false);
    }
    expect(isNonFreeRow(official({ license: 'cc_by', license_note: null, source_url: 'https://onepiece.fandom.com/wiki/Luffy', author: 'x' } as Partial<CandidateRow>))).toBe(false);
    expect(isNonFreeRow(official({ license: 'public_domain', license_note: null, source_url: 'https://onepiece.fandom.com/wiki/Luffy' }))).toBe(false);
  });

  it('never takes another site or another kind', () => {
    expect(isNonFreeRow(official({ site_id: 'kpop' }))).toBe(false);
    expect(isNonFreeRow(official({ site_id: 'hub' }))).toBe(false);
    expect(isNonFreeRow(official({ kind: 'series', slug: 'one-piece' }))).toBe(false);
    expect(isNonFreeRow(official({ kind: 'idol', slug: '12' }))).toBe(false);
    expect(isNonFreeRow(cc0('https://fandom.com/x', { site_id: 'kpop' }))).toBe(false);
    expect(isNonFreeRow(cc0('https://fandom.com/x', { kind: 'series', slug: 'one-piece' }))).toBe(false);
  });

  it('never takes a licence "other" with another note, or a cc0 from Commons', () => {
    for (const note of ['Photo supplied by the owner', 'official artwork, rights belong to the studio', ' Official artwork', 'Fan art of Official artwork', 'Not Official artwork', '', null]) {
      expect(isNonFreeRow(official({ license_note: note })), String(note)).toBe(false);
    }
    expect(isNonFreeRow(cc0('https://commons.wikimedia.org/wiki/File:Luffy.png'))).toBe(false);
    expect(isNonFreeRow(official({ license: 'cc0', license_note: OFFICIAL, source_url: null }))).toBe(false);
    expect(isNonFreeRow(cc0('https://upload.wikimedia.org/wikipedia/commons/a/a1/Luffy.png'))).toBe(false);
  });
});

// ---- the rows and the bucket ------------------------------------------------------------------------------------------------------------

const obj = (name: string, createdAt: string): FakeObject => ({ name, createdAt });
const IN = '2026-11-11T21:15:00+00:00';

describe('the orphan files', () => {
  const referenced = new Set(['anime/character/one-piece/luffy/a.webp']);
  it('the window is 21:00:00 to 21:30:00 UTC on 2026-11-11', () => {
    expect(inOrphanWindow('2026-11-11T21:00:00+00:00')).toBe(true);
    expect(inOrphanWindow('2026-11-11T21:30:00+00:00')).toBe(true);
    expect(inOrphanWindow('2026-11-11T20:59:00+00:00')).toBe(false);
    expect(inOrphanWindow('2026-11-11T20:59:59.999+00:00')).toBe(false);
    expect(inOrphanWindow('2026-11-11T21:31:00+00:00')).toBe(false);
    expect(inOrphanWindow('2026-11-11T22:15:00+01:00')).toBe(true);
    expect(inOrphanWindow('2026-11-10T21:15:00+00:00')).toBe(false);
    expect(inOrphanWindow('')).toBe(false);
  });

  it('takes a file in the window under anime/character/ that no row points to, and only that', () => {
    const objects = [
      obj('anime/character/one-piece/zoro/o1.webp', IN),
      obj('anime/character/one-piece/zoro/o1-2x.webp', IN),
      obj('anime/character/one-piece/luffy/a.webp', IN), // has a row
      obj('anime/character/one-piece/zoro/early.webp', '2026-11-11T20:59:00+00:00'),
      obj('anime/character/one-piece/zoro/late.webp', '2026-11-11T21:31:00+00:00'),
      obj('anime/series/one-piece/s.webp', IN), // outside the folder
      obj('anime/characters/one-piece/x.webp', IN), // another folder with a similar name
      obj('kpop/idol/12/x.webp', IN),
    ];
    expect(orphansOf(objects, referenced)).toEqual(['anime/character/one-piece/zoro/o1-2x.webp', 'anime/character/one-piece/zoro/o1.webp']);
  });

  it('lists every level of the folder and nothing outside it', async () => {
    const db = nonFreeFake([], [
      obj('anime/character/one-piece/zoro/o1.webp', IN), obj('anime/character/naruto/sasuke/o2.webp', IN), obj('anime/series/one-piece/s.webp', IN), obj('kpop/idol/1/a.webp', IN),
    ]);
    const list = await listBucketObjects(db);
    expect(list.map((o) => o.name).sort()).toEqual(['anime/character/naruto/sasuke/o2.webp', 'anime/character/one-piece/zoro/o1.webp']);
    expect(list.every((o) => o.createdAt === IN)).toBe(true);
  });
});

const world = (): { rows: CandidateRow[]; objects: FakeObject[] } => {
  n = 100;
  const luffy = official({ slug: 'one-piece/luffy', path: 'anime/character/one-piece/luffy/aaaa.webp' });
  const zoro = cc0('https://onepiece.fandom.com/wiki/Zoro', { slug: 'one-piece/zoro', path: 'anime/character/one-piece/zoro/bbbb.webp', thumb_path: 'anime/character/one-piece/zoro/bbbb-96.webp' });
  const sanji = official({ slug: 'one-piece/sanji', path: 'anime/character/one-piece/sanji/cccc.webp', license_verified: true, thumb_path: 'anime/character/one-piece/sanji/cccc-96.webp' });
  const nami = cc0('https://commons.wikimedia.org/wiki/File:Nami.png', { slug: 'one-piece/nami', path: 'anime/character/one-piece/nami/dddd.webp' });
  const usopp = official({ slug: 'one-piece/usopp', path: 'anime/character/one-piece/usopp/eeee.webp', created_at: '2026-11-12T10:00:00+00:00' });
  const series = official({ kind: 'series', slug: 'one-piece', path: 'anime/series/one-piece/ffff.webp' });
  const rows = [luffy, zoro, sanji, nami, usopp, series];
  const objects: FakeObject[] = [
    ...rows.flatMap((r) => [obj(r.path, IN), obj(r.path.replace(/\.webp$/, '-2x.webp'), IN), ...(r.thumb_path ? [obj(r.thumb_path, IN)] : [])]),
    obj('anime/character/one-piece/chopper/orphan1.webp', '2026-11-11T21:05:00+00:00'),
    obj('anime/character/one-piece/chopper/orphan1-2x.webp', '2026-11-11T21:05:00+00:00'),
    obj('anime/character/one-piece/chopper/early.webp', '2026-11-11T20:59:00+00:00'),
    obj('anime/character/one-piece/chopper/late.webp', '2026-11-11T21:31:00+00:00'),
    obj('anime/series/one-piece/orphan-series.webp', '2026-11-11T21:05:00+00:00'),
  ];
  return { rows, objects };
};

describe('the plan and the deletion of the button', () => {
  let w: ReturnType<typeof world>;
  beforeEach(() => { w = world(); });

  it('selects exactly the two rows, their five files and the two orphans, and shows examples', async () => {
    const db = nonFreeFake(w.rows as never[], w.objects);
    const rowsSelected = await selectNonFreeRows(db);
    expect(rowsSelected.map((r) => r.slug)).toEqual(['one-piece/luffy', 'one-piece/zoro']);
    const plan = await planNonFree(db);
    expect(plan.counts).toEqual({ rows: 2, files: 5, orphans: 2 });
    expect(plan.tooMany).toBe(false);
    expect(plan.examples.map((e) => e.slug)).toEqual(['one-piece/luffy', 'one-piece/zoro']);
    expect(plan.examples[0]).toEqual({ slug: 'one-piece/luffy', license: 'other', why: 'Official artwork' });
    expect(plan.examples[1]).toEqual({ slug: 'one-piece/zoro', license: 'cc0', why: 'onepiece.fandom.com' });
    expect(plan.orphans).toEqual(['anime/character/one-piece/chopper/orphan1-2x.webp', 'anime/character/one-piece/chopper/orphan1.webp']);
  });

  it('reads one row for the preview route, and only when it is selected', async () => {
    const db = nonFreeFake(w.rows as never[], w.objects);
    expect((await selectNonFreeRow(db, 'one-piece/luffy'))?.path).toBe('anime/character/one-piece/luffy/aaaa.webp');
    expect(await selectNonFreeRow(db, 'one-piece/sanji')).toBeNull(); // verified
    expect(await selectNonFreeRow(db, 'one-piece/nami')).toBeNull(); // Commons
    expect(await selectNonFreeRow(db, 'one-piece/usopp')).toBeNull(); // another date
    expect(await selectNonFreeRow(db, 'one-piece/unknown')).toBeNull();
  });

  it('refuses a wrong word and a changed count, and deletes nothing', async () => {
    const db = nonFreeFake(w.rows as never[], w.objects);
    const before = db.rows.length;
    await expect(deleteNonFree(db, { confirm: 'supprimer', expect: { rows: 2, files: 5, orphans: 2 } })).rejects.toMatchObject({ code: 'bad_confirm' });
    await expect(deleteNonFree(db, { confirm: undefined, expect: { rows: 2, files: 5, orphans: 2 } })).rejects.toMatchObject({ code: 'bad_confirm' });
    for (const expect_ of [{ rows: 3, files: 5, orphans: 2 }, { rows: 2, files: 4, orphans: 2 }, { rows: 2, files: 5, orphans: 1 }]) {
      await expect(deleteNonFree(db, { confirm: NON_FREE_CONFIRM, expect: expect_ })).rejects.toMatchObject({ code: 'count_changed', status: 409 });
    }
    expect(db.rows.length).toBe(before);
    expect(db.removed).toEqual([]);
  });

  it('refuses more than 1,100 rows even when the counts match', async () => {
    const many = Array.from({ length: NON_FREE_MAX_ROWS + 1 }, (_, i) => official({ id: 1000 + i, slug: `naruto/c${i}`, path: `anime/character/naruto/c${i}/h.webp` }));
    const db = nonFreeFake(many as never[], []);
    const plan = await planNonFree(db);
    expect(plan.counts.rows).toBe(1101);
    expect(plan.tooMany).toBe(true);
    await expect(deleteNonFree(db, { confirm: NON_FREE_CONFIRM, expect: plan.counts })).rejects.toMatchObject({ code: 'too_many' });
    expect(db.rows.length).toBe(1101);
    // 1,100 exactly is allowed
    const ok = nonFreeFake(many.slice(0, NON_FREE_MAX_ROWS) as never[], []);
    expect((await planNonFree(ok)).tooMany).toBe(false);
  });

  it('deletes the selected rows, their files and the orphans, and nothing else', async () => {
    const db = nonFreeFake(w.rows as never[], w.objects);
    const tags: string[][] = [];
    const report = await deleteNonFree(db, { confirm: NON_FREE_CONFIRM, expect: { rows: 2, files: 5, orphans: 2 } }, undefined, (t) => tags.push(t));
    expect(report).toEqual({ rows: 2, files: 5, orphans: 2, failedChunks: 0 });
    expect(db.rows.map((r) => r.slug).sort()).toEqual(['one-piece', 'one-piece/nami', 'one-piece/sanji', 'one-piece/usopp']);
    expect(db.removed.sort()).toEqual([
      'anime/character/one-piece/chopper/orphan1-2x.webp', 'anime/character/one-piece/chopper/orphan1.webp',
      'anime/character/one-piece/luffy/aaaa-2x.webp', 'anime/character/one-piece/luffy/aaaa.webp',
      'anime/character/one-piece/zoro/bbbb-2x.webp', 'anime/character/one-piece/zoro/bbbb-96.webp', 'anime/character/one-piece/zoro/bbbb.webp',
    ]);
    // untouched: the verified row's files, the Commons row's, the other date's, the series row's, the files outside the window and the folder
    for (const keep of ['anime/character/one-piece/sanji/cccc.webp', 'anime/character/one-piece/sanji/cccc-96.webp', 'anime/character/one-piece/nami/dddd.webp', 'anime/character/one-piece/usopp/eeee.webp',
      'anime/series/one-piece/ffff.webp', 'anime/series/one-piece/orphan-series.webp', 'anime/character/one-piece/chopper/early.webp', 'anime/character/one-piece/chopper/late.webp']) {
      expect(db.objects.some((o) => o.name === keep), keep).toBe(true);
    }
    expect(tags).toHaveLength(1);
    expect(tags[0]).toContain('entity-images:anime');
    expect(tags[0]).toContain('entity-image:anime:character:one-piece/luffy');
    // a second click finds nothing to delete and the counts of the first preview no longer match
    await expect(deleteNonFree(db, { confirm: NON_FREE_CONFIRM, expect: { rows: 2, files: 5, orphans: 2 } })).rejects.toMatchObject({ code: 'count_changed' });
  });

  it('never removes a file that a row outside the selection still points to', async () => {
    const shared = cc0('https://commons.wikimedia.org/wiki/File:Robin.png', { id: 900, slug: 'one-piece/robin', path: 'anime/character/one-piece/luffy/aaaa.webp' });
    const db = nonFreeFake([...w.rows, shared] as never[], w.objects);
    const plan = await planNonFree(db);
    expect(plan.files).not.toContain('anime/character/one-piece/luffy/aaaa.webp');
    expect(plan.files).not.toContain('anime/character/one-piece/luffy/aaaa-2x.webp');
  });

  it('does not touch the files of a row that was verified between the preview and the click', async () => {
    const db = nonFreeFake(w.rows as never[], w.objects);
    const plan = await planNonFree(db);
    // the owner verifies Luffy after the preview; the fake keeps the row, and the delete query only names unverified rows
    (db.rows.find((r) => r.slug === 'one-piece/luffy') as Record<string, unknown>).license_verified = true;
    await expect(deleteNonFree(db, { confirm: NON_FREE_CONFIRM, expect: plan.counts })).rejects.toMatchObject({ code: 'count_changed' });
    expect(db.removed).toEqual([]);
  });
});

// ---- the SQL text, on PGlite ------------------------------------------------------------------------------------------------------------

describe('NON_FREE_SQL', () => {
  let db: PGlite;
  beforeEach(async () => { db = await freshDb(); await db.exec(`insert into public.sites values ('anime', 'bunnyverse.org/anime', 'OtakuQuiz', 'world', 'building', 2)`); });

  const insert = async (r: CandidateRow, i: number): Promise<void> => {
    await db.query(
      `insert into public.entity_images (site_id, kind, slug, path, width, height, license, license_note, source_url, created_at, license_verified, thumb_path)
       values ($1, $2, $3, $4, 360, 480, $5, $6, $7, $8::timestamptz, $9, $10)`,
      [r.site_id, r.kind, r.kind === 'character' ? `s/c${i}` : r.kind === 'series' ? `s${i}` : String(i + 1), `anime/x/${i}.webp`, r.license, r.license_note, r.source_url, r.created_at, r.license_verified, r.thumb_path],
    );
  };

  it('counts the same rows as the predicate over a battery of close rows', async () => {
    n = 0;
    const urls = [
      'https://onepiece.fandom.com/wiki/Luffy', 'https://static.wikia.nocookie.net/a/b.png', 'https://fandom.com', 'https://fandom.com:8443/x', 'https://u:p@fandom.com/x', 'https://FANDOM.COM/x',
      'https://notfandom.com/x', 'https://fandom.com.example.org/x', 'https://example.org/fandom.com', 'https://example.org/?u=fandom.com', 'https://example.org/#fandom.com',
      'https://fandom.com@evil.example.org/x', 'https://evil.org\\@fandom.com/', 'https://fandom.com./x', 'https://fandom.com:evil/', 'https://a@b@fandom.com/', 'https://fand om.com/',
      'https://commons.wikimedia.org/wiki/File:X.png', 'http://x.fandom.com/a', 'https://wikia.nocookie.net.evil.org/a', 'https://xwikia.nocookie.net/a', 'https://x.fandom.com\t/a',
    ];
    const battery: CandidateRow[] = [
      official(), official({ license_note: 'Official artwork' }), official({ created_at: '2026-11-11T00:00:00+00:00' }), official({ created_at: '2026-11-11T23:59:59.999+00:00' }),
      official({ created_at: '2026-11-10T23:59:59.999+00:00' }), official({ created_at: '2026-11-12T00:00:00+00:00' }), official({ created_at: '2026-11-11T00:30:00+01:00' }), official({ created_at: '2026-11-12T00:30:00+01:00' }),
      official({ license_note: 'official artwork' }), official({ license_note: ' Official artwork' }), official({ license_note: 'Photo supplied by the owner' }),
      official({ license_verified: true, thumb_path: 'anime/x/t.webp' }), official({ site_id: 'kpop' }), official({ kind: 'series' }),
      ...urls.flatMap((u) => [cc0(u), cc0(u, { license_verified: true, thumb_path: 'anime/x/t.webp' })]),
      cc0(null), cc0('https://onepiece.fandom.com/wiki/Luffy', { site_id: 'kpop' }), cc0('https://onepiece.fandom.com/wiki/Luffy', { created_at: '2020-01-01T00:00:00+00:00' }),
    ];
    for (const [i, r] of battery.entries()) await insert(r, i);
    const expected = battery.filter(isNonFreeRow).length;
    expect(expected).toBeGreaterThan(8);
    expect(Number(await one(db, NON_FREE_SQL))).toBe(expected);
    // and row by row, so a compensating pair cannot hide
    const paths = (await sqlRows<{ path: string }>(db, NON_FREE_SQL.replace('select count(*) as non_free_images', 'select path'))).map((r) => r.path).sort();
    expect(paths).toEqual(battery.flatMap((r, i) => (isNonFreeRow(r) ? [`anime/x/${i}.webp`] : [])).sort());
  });

  it('runs as one statement that reads only', async () => {
    expect(NON_FREE_SQL.trim().split(';').filter(Boolean)).toHaveLength(1);
    expect(NON_FREE_SQL).not.toMatch(/\b(delete|update|insert|drop|alter)\b/i);
    expect(await sqlRows(db, NON_FREE_SQL)).toEqual([{ non_free_images: 0 }]);
  });

  it('ORPHAN_FILES_SQL counts the same files as orphansOf, window ends included, on a stand-in of storage.objects', async () => {
    await db.exec('create table storage.objects (id bigserial primary key, bucket_id text not null, name text not null, created_at timestamptz not null)');
    await db.query(`insert into public.entity_images (site_id, kind, slug, path, width, height, license, license_note, thumb_path) values ('anime', 'character', 's/withrow', 'anime/character/s/withrow/a.webp', 360, 480, 'other', 'Official artwork', 'anime/character/s/withrow/a-96.webp')`);
    const objs: Array<[string, string, string]> = [
      ['entity-images', 'anime/character/s/withrow/a.webp', '2026-11-11T21:10:00+00:00'], ['entity-images', 'anime/character/s/withrow/a-2x.webp', '2026-11-11T21:10:00+00:00'],
      ['entity-images', 'anime/character/s/withrow/a-96.webp', '2026-11-11T21:10:00+00:00'], ['entity-images', 'anime/character/s/gone/o1.webp', '2026-11-11T21:10:00+00:00'],
      ['entity-images', 'anime/character/s/gone/o2.webp', '2026-11-11T21:00:00+00:00'], ['entity-images', 'anime/character/s/gone/o3.webp', '2026-11-11T21:30:00+00:00'],
      ['entity-images', 'anime/character/s/gone/early.webp', '2026-11-11T20:59:00+00:00'], ['entity-images', 'anime/character/s/gone/late.webp', '2026-11-11T21:31:00+00:00'],
      ['entity-images', 'anime/series/s/o.webp', '2026-11-11T21:10:00+00:00'], ['entity-images', 'anime/characters/s/o.webp', '2026-11-11T21:10:00+00:00'],
      ['entity-images', 'kpop/idol/1/o.webp', '2026-11-11T21:10:00+00:00'], ['other-bucket', 'anime/character/s/gone/o4.webp', '2026-11-11T21:10:00+00:00'],
    ];
    for (const [bucket, name, at] of objs) await db.query('insert into storage.objects (bucket_id, name, created_at) values ($1, $2, $3::timestamptz)', [bucket, name, at]);
    const sqlNames = (await sqlRows<{ name: string }>(db, ORPHAN_FILES_SQL.replace('select count(*) as orphan_files', 'select o.name'))).map((r) => r.name).sort();
    const referenced = new Set(['anime/character/s/withrow/a.webp', 'anime/character/s/withrow/a-2x.webp', 'anime/character/s/withrow/a-96.webp']);
    const tsNames = orphansOf(objs.filter(([b]) => b === 'entity-images').map(([, name, at]) => ({ name, createdAt: at })), referenced);
    expect(sqlNames).toEqual(['anime/character/s/gone/o1.webp', 'anime/character/s/gone/o2.webp', 'anime/character/s/gone/o3.webp']);
    expect(tsNames).toEqual(sqlNames);
    expect(Number(await one(db, ORPHAN_FILES_SQL))).toBe(3);
  });
});

describe('the owner steps', () => {
  const doc = readFileSync(fileURLToPath(new URL('../../../../../docs/o1/reports/CARDS/OWNER-STEPS-LOT3-DLE.md', import.meta.url)), 'utf8');
  const patch = readFileSync(fileURLToPath(new URL('../../../../../docs/o1/reports/CARDS/DOCS-LAUNCH-LOT3-DLE.patch', import.meta.url)), 'utf8');

  it('carry the two verification queries word for word, as the code runs them', () => {
    expect(doc).toContain(NON_FREE_SQL.replace(/;$/, ''));
    expect(doc).toContain(ORPHAN_FILES_SQL.replace(/;$/, ''));
    // the patch for the files of another lane holds them too (each line added with a "+")
    const added = patch.split('\n').filter((l) => l.startsWith('+')).map((l) => l.slice(1)).join('\n');
    expect(added).toContain(NON_FREE_SQL.replace(/;$/, ''));
    expect(added).toContain(ORPHAN_FILES_SQL.replace(/;$/, ''));
  });

  it('draw no en dash and no em dash, and name the typed word and the limit', () => {
    expect(doc + patch).not.toMatch(/[\u2013\u2014]/);
    expect(doc).toContain(NON_FREE_CONFIRM);
    expect(doc).toContain('1 100');
  });
});
