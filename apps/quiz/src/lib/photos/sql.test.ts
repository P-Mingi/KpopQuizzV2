// Daily games step 2: 022-photos-admin.sql on PGlite (Postgres 18 in WebAssembly), on the stand-in of the dle tests (pglite-harness.ts) plus
// groups.site_id (002a). The full proof on a real Postgres 18, with the rollback, is docs/proofs/step2/local-pg-transcript.txt, and with the cases
// of the review (the reset of the check, the https filter, the closed sequences, the licences of icons and stickers) local-pg-transcript-review.txt.
import { beforeAll, describe, expect, it } from 'vitest';

import { failure, freshDb, one, readMigration, rows } from '@/lib/dle/pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

async function asRole(db: PGlite, role: string, sql: string): Promise<{ rows?: Record<string, unknown>[]; error?: string }> {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    const r = await db.query<Record<string, unknown>>(sql);
    await db.exec('rollback');
    return { rows: r.rows };
  } catch (e) {
    await db.exec('rollback');
    return { error: (e as Error).message };
  }
}

describe('022-photos-admin.sql', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await freshDb();
    await db.exec(`
      insert into public.sites values ('anime', 'bunnyverse.org/anime', 'OtakuQuiz', 'world', 'building', 2);
      alter table public.groups add column site_id text not null default 'kpop' references public.sites(id);
      insert into public.groups (name, slug, record_label) values ('G1', 'g1', 'JYP Entertainment'), ('G2', 'g2', ' JYP Entertainment '), ('G3', 'g3', 'SM Entertainment'), ('G4', 'g4', null);
      insert into public.groups (name, slug, site_id) values ('Series A', 'series-a', 'anime');
      insert into public.idols (group_id, name, birth_date) values (1, 'Idol One', '1995-01-01'), (1, 'Idol Two', '1996-01-01');
      -- Supabase's default privileges: every new table, function and sequence of public is granted to the browser roles.
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    `);
    await db.exec(readMigration('022-photos-admin.sql'));
  });

  it('applies twice without change, and adds the cited labels by name once', async () => {
    const fp = (): Promise<string> => one<string>(db, `select md5(concat_ws('|',
      (select string_agg(conname || pg_get_constraintdef(oid), ',' order by conname) from pg_constraint where conrelid = 'public.site_assets'::regclass),
      pg_get_viewdef('public.site_assets_public'::regclass), pg_get_viewdef('public.entity_images_public'::regclass),
      (select string_agg(id || name, ',' order by id) from public.agencies)))`);
    const before = await fp();
    await db.exec(readMigration('022-photos-admin.sql'));
    expect(await fp()).toBe(before);
    expect(await rows(db, 'select slug, name from public.agencies order by slug')).toEqual([
      { slug: 'jyp-entertainment', name: 'JYP Entertainment' }, { slug: 'sm-entertainment', name: 'SM Entertainment' },
    ]);
  });

  it('the browser roles read the two views and nothing else of step 2', async () => {
    for (const role of ['anon', 'authenticated']) {
      expect((await asRole(db, role, 'select count(*) from public.site_assets')).error).toMatch(/permission denied/);
      expect((await asRole(db, role, 'select count(*) from public.agencies')).error).toMatch(/permission denied/);
      expect((await asRole(db, role, "insert into public.site_assets (key, type, page) values ('icon:x', 'icon', 'kpopdle')")).error).toMatch(/permission denied/);
      expect((await asRole(db, role, 'select count(*) from public.site_assets_public')).rows).toEqual([{ count: 0 }]);
      expect((await asRole(db, role, 'select count(*) from public.entity_images_public')).rows).toEqual([{ count: 0 }]);
    }
  });

  it('a picture of an idol reaches the browser only verified, through the view; the anime kinds stay readable as 018 made them', async () => {
    await db.exec(`
      insert into public.entity_images (site_id, kind, slug, path, width, height, source_url, author, license, license_verified, thumb_path) values
        ('kpop', 'idol', '1', 'kpop/idol/1/a.webp', 400, 500, 'https://commons.wikimedia.org/a', 'A', 'cc_by', true, 'kpop/idol/1/a-96.webp'),
        ('kpop', 'group', '2', 'kpop/group/2/b.webp', 400, 500, 'https://commons.wikimedia.org/b', 'B', 'cc_by', false, 'kpop/group/2/b-96.webp'),
        ('anime', 'series', 'series-a', 'anime/series/series-a/c.webp', 736, 981, 'https://commons.wikimedia.org/c', 'C', 'cc0', false, null);
    `);
    expect((await asRole(db, 'anon', 'select kind, slug, name from public.entity_images_public')).rows).toEqual([{ kind: 'idol', slug: '1', name: 'Idol One' }]);
    expect((await asRole(db, 'anon', 'select kind, slug from public.entity_images order by kind')).rows).toEqual([{ kind: 'series', slug: 'series-a' }]);
    expect(await one(db, `select thumb_path from public.dle_src_kpop_idol where entity_id = '1'`)).toBe('kpop/idol/1/a-96.webp');
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, source_url, author, license) values ('anime', 'idol', '7', 'k/a.webp', 1, 1, 'https://x.org', 'A', 'cc0')`)).toMatch(/entity_images_kind_site_check/);
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, source_url, author, license, license_verified) values ('kpop', 'idol', '9', 'k/a.webp', 1, 1, 'https://x.org', 'A', 'cc0', true)`)).toMatch(/entity_images_verified_thumb_check/);
    // A new file without a new 96 px file (the 018 route) loses the check.
    await db.exec(`update public.entity_images set path = 'kpop/idol/1/z.webp' where kind = 'idol'`);
    expect(await rows(db, `select license_verified, thumb_path from public.entity_images where kind = 'idol'`)).toEqual([{ license_verified: false, thumb_path: null }]);
  });

  it('site_assets_public shows the latest published version per key, never a draft, a scheduled, a retired or an unverified picture', async () => {
    await db.exec(`
      insert into public.site_assets (key, type, page, path, width, height, source_url, author, license, license_verified, published_at) values
        ('banner:kpopdle', 'banner', 'kpopdle', 'hub/banner/kpopdle/a-1920.webp', 1920, 600, 'https://commons.wikimedia.org/a', 'Old', 'cc_by', true, now() - interval '2 days'),
        ('banner:kpopdle', 'banner', 'kpopdle', 'hub/banner/kpopdle/b-1920.webp', 1920, 600, 'https://commons.wikimedia.org/b', 'New', 'cc_by', true, now() - interval '1 hour'),
        ('banner:kpopdle', 'banner', 'kpopdle', 'hub/banner/kpopdle/c-1920.webp', 1920, 600, 'https://commons.wikimedia.org/c', 'Later', 'cc_by', true, now() + interval '1 day'),
        ('banner:daily', 'banner', 'daily', 'hub/banner/daily/d-1920.webp', 1920, 600, 'https://commons.wikimedia.org/d', 'Draft', 'cc_by', false, null);
      insert into public.site_assets (key, type, page, settings, published_at) values ('icon:k-idol', 'icon', 'kpopdle', '{"mode": "icon"}', now());
      insert into public.site_assets (key, type, page, path, width, height, author, license, license_verified, published_at, retired_at) values
        ('sticker:home:abcdef12', 'sticker', 'home', 'hub/sticker/home/abcdef12/a-400.webp', 400, 400, 'Bunnyverse', 'own_photo', true, now(), now());
    `);
    expect((await asRole(db, 'anon', 'select key, author from public.site_assets_public order by key')).rows).toEqual([
      { key: 'banner:kpopdle', author: 'New' }, { key: 'icon:k-idol', author: null },
    ]);
    expect(await failure(db, `insert into public.site_assets (key, type, page, path, width, height, source_url, author, license, published_at) values ('banner:daily', 'banner', 'daily', 'hub/x.webp', 1, 1, 'https://x.org', 'A', 'cc_by', now())`)).toMatch(/site_assets_published_check/);
    expect(await failure(db, `insert into public.site_assets (key, type, page) values ('Icon:X', 'icon', 'daily')`)).toMatch(/site_assets_key_check/);
  });

  it('a change of file, licence or credit leaves a picture unverified, unless the same statement checks the box again', async () => {
    await db.exec(`insert into public.entity_images (site_id, kind, slug, path, width, height, source_url, author, license, license_verified, thumb_path)
      values ('kpop', 'idol', '2', 'kpop/idol/2/a.webp', 400, 500, 'https://commons.wikimedia.org/a', 'A', 'cc_by', true, 'kpop/idol/2/a-96.webp')`);
    const state = (): Promise<unknown[]> => rows(db, `select license_verified as v, thumb_path as t from public.entity_images where kind = 'idol' and slug = '2'`);
    const verify = (): Promise<unknown> => db.exec(`update public.entity_images set license_verified = true where kind = 'idol' and slug = '2'`);
    const cases: Array<[string, string, boolean]> = [
      ['a new file with its new 96 px file', `path = 'kpop/idol/2/b.webp', thumb_path = 'kpop/idol/2/b-96.webp'`, false],
      ['a new author', `author = 'B'`, false],
      ['a new licence', `license = 'cc_by_sa'`, false],
      ['a new source page', `source_url = 'https://commons.wikimedia.org/b'`, false],
      ['a new licence note', `license_note = 'cropped'`, false],
      ['a new 96 px file alone', `thumb_path = 'kpop/idol/2/c-96.webp'`, false],
      ['a new credit with the box checked in the same statement', `author = 'C', license_verified = true`, true],
      ['a new file and 96 px file with the box checked (the Photos tab)', `path = 'kpop/idol/2/d.webp', thumb_path = 'kpop/idol/2/d-96.webp', license_verified = true`, true],
      ['the focal point only', `focal_x = 20`, true],
    ];
    for (const [what, set, verified] of cases) {
      await verify();
      expect(await state(), 'checked before').toEqual([expect.objectContaining({ v: true })]);
      await db.exec(`update public.entity_images set ${set} where kind = 'idol' and slug = '2'`);
      expect(await state(), what).toEqual([expect.objectContaining({ v: verified })]);
    }
    // A new file without a new 96 px file loses its check and its 96 px file, even with the box checked.
    await verify();
    await db.exec(`update public.entity_images set path = 'kpop/idol/2/e.webp', license_verified = true where kind = 'idol' and slug = '2'`);
    expect(await state()).toEqual([{ v: false, t: null }]);
    // The mark of a statement that checks the box never reaches the next statement of the same transaction.
    await db.exec(`update public.entity_images set thumb_path = 'kpop/idol/2/e-96.webp', license_verified = true where kind = 'idol' and slug = '2'`);
    await db.exec(`begin; update public.entity_images set license_verified = true where kind = 'idol' and slug = '2'; update public.entity_images set author = 'D' where kind = 'idol' and slug = '2'; commit;`);
    expect(await state()).toEqual([expect.objectContaining({ v: false })]);
  });

  it('passes on only https source pages, refuses an http page for a kpop picture, and closes the identity sequences', async () => {
    await db.exec(`insert into public.entity_images (site_id, kind, slug, path, width, height, source_url, author, license, license_verified, thumb_path) values
      ('anime', 'series', 'series-b', 'anime/series/series-b/a.webp', 736, 981, 'http://example.org/a', 'H', 'cc0', true, 'anime/series/series-b/a-96.webp')`);
    expect(await one(db, `select count(*)::int from public.entity_images where slug = 'series-b' and license_verified`)).toBe(1);
    expect((await asRole(db, 'anon', `select slug from public.entity_images_public where slug = 'series-b'`)).rows).toEqual([]);
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, source_url, author, license) values ('kpop', 'group', '3', 'k/a.webp', 1, 1, 'http://example.org', 'A', 'cc0')`)).toMatch(/entity_images_kpop_source_check/);
    for (const role of ['anon', 'authenticated']) {
      for (const seq of ['public.agencies_id_seq', 'public.site_assets_id_seq']) {
        expect(await one(db, `select has_sequence_privilege('${role}', '${seq}', 'usage') or has_sequence_privilege('${role}', '${seq}', 'select') or has_sequence_privilege('${role}', '${seq}', 'update')`), `${role} ${seq}`).toBe(false);
        expect((await asRole(db, role, `select nextval('${seq}')`)).error, `${role} ${seq}`).toMatch(/permission denied/);
      }
    }
    expect(await one(db, `select has_sequence_privilege('service_role', 'public.site_assets_id_seq', 'usage')`)).toBe(true);
  });

  it('an icon or a sticker takes our own illustration or a written permission only, a banner any licence of its form', async () => {
    const sticker = (license: string): string => `insert into public.site_assets (key, type, page, path, width, height, author, license, source_url)
      values ('sticker:home:ab12cd34', 'sticker', 'home', 'hub/sticker/home/ab12cd34/a-400.webp', 400, 400, 'Bunnyverse', '${license}', 'https://example.org/a')`;
    for (const license of ['cc_by', 'cc_by_sa', 'cc0', 'public_domain']) expect(await failure(db, sticker(license)), license).toMatch(/site_assets_small_license_check/);
    expect(await failure(db, `insert into public.site_assets (key, type, page, path, width, height, author, license, source_url) values ('icon:k-idol', 'icon', 'kpopdle', 'hub/icon/k-idol/a-400.webp', 400, 400, 'A', 'cc_by', 'https://example.org/a')`)).toMatch(/site_assets_small_license_check/);
    expect(await failure(db, sticker('own_photo'))).toBeNull();
    expect(await failure(db, sticker('licensed'))).toBeNull();
    expect(await failure(db, `insert into public.site_assets (key, type, page, path, width, height, author, license, source_url) values ('banner:daily', 'banner', 'daily', 'hub/banner/daily/z-1920.webp', 1920, 600, 'A', 'cc_by', 'https://example.org/a')`)).toBeNull();
  });
});
