// CR-021 (owner decision of 2026-11-02): the credit columns of 018 and the public views of 022, on PGlite (the stand-in of the dle tests plus
// groups.site_id, as photos/sql.test.ts). The full proof on a real Postgres 18 is docs/launch/o1/session-rehearsal.sh (V-018, V-022).
// What is proved: the licence needs an author only for CC BY and CC BY-SA, the author and the source page are optional otherwise,
// needs_credit follows the licence by itself, the views fill author, licence, source and note for a row that needs a credit and null for
// every other row, the licence reset also watches the licence link and the Commons file, and the browser roles still read nothing new.
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

describe('the credit of an image (018, 022)', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await freshDb();
    await db.exec(`
      insert into public.sites values ('anime', 'bunnyverse.org/anime', 'OtakuQuiz', 'world', 'building', 2);
      alter table public.groups add column site_id text not null default 'kpop' references public.sites(id);
      insert into public.groups (name, slug) values ('G1', 'g1');
      insert into public.idols (group_id, name, birth_date) values (1, 'Idol One', '1995-01-01'), (1, 'Idol Two', '1996-01-01'), (1, 'Idol Three', '1997-01-01');
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    `);
    await db.exec(readMigration('022-photos-admin.sql'));
  });

  it('needs an author for CC BY and CC BY-SA only; the author and the source page are optional for the other licences', async () => {
    const noAuthor = (license: string): string => `insert into public.entity_images (site_id, kind, slug, path, width, height, license) values ('anime', 'series', 'x-${license.replace('_', '-')}', 'a/x.webp', 1, 1, '${license}')`;
    expect(await failure(db, noAuthor('cc_by'))).toMatch(/entity_images_credit_author_check/);
    expect(await failure(db, noAuthor('cc_by_sa'))).toMatch(/entity_images_credit_author_check/);
    for (const license of ['cc0', 'public_domain']) expect(await failure(db, noAuthor(license)), license).toBeNull();
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, license, license_note) values ('anime', 'series', 'x-other', 'a/x.webp', 1, 1, 'other', 'GFDL')`)).toBeNull();
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, license) values ('anime', 'series', 'x-other-bare', 'a/x.webp', 1, 1, 'other')`)).toMatch(/entity_images_other_note_check/);
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, license, author, source_url) values ('anime', 'series', 'x-blank', 'a/x.webp', 1, 1, 'cc0', '  ', 'https://x.org')`)).toMatch(/entity_images_author_check/);
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, license, license_url) values ('anime', 'series', 'x-lic', 'a/x.webp', 1, 1, 'cc0', 'http://creativecommons.org/x')`)).toMatch(/entity_images_license_url_check/);
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, license, commons_file) values ('anime', 'series', 'x-file', 'a/x.webp', 1, 1, 'cc0', 'A.jpg')`)).toMatch(/entity_images_commons_file_check/);
    // The kpop kinds still name an https page when they name one (022), and may name none.
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, license, source_url) values ('kpop', 'group', '1', 'k/a.webp', 1, 1, 'cc0', 'http://example.org')`)).toMatch(/entity_images_kpop_source_check/);
    expect(await failure(db, `insert into public.entity_images (site_id, kind, slug, path, width, height, license) values ('kpop', 'group', '1', 'k/a.webp', 1, 1, 'cc0')`)).toBeNull();
    await db.exec(`delete from public.entity_images`);
  });

  it('needs_credit is generated from the licence and cannot be written', async () => {
    await db.exec(`insert into public.entity_images (site_id, kind, slug, path, width, height, license, author) values
      ('anime', 'series', 'n-by', 'a/1.webp', 1, 1, 'cc_by', 'A'), ('anime', 'series', 'n-sa', 'a/2.webp', 1, 1, 'cc_by_sa', 'A'), ('anime', 'series', 'n-0', 'a/3.webp', 1, 1, 'cc0', null),
      ('anime', 'series', 'n-pd', 'a/4.webp', 1, 1, 'public_domain', null), ('anime', 'series', 'n-own', 'a/5.webp', 1, 1, 'own_photo', 'A')`);
    expect(await rows(db, `select slug, needs_credit from public.entity_images order by slug`)).toEqual([
      { slug: 'n-0', needs_credit: false }, { slug: 'n-by', needs_credit: true }, { slug: 'n-own', needs_credit: false }, { slug: 'n-pd', needs_credit: false }, { slug: 'n-sa', needs_credit: true },
    ]);
    expect(await failure(db, `update public.entity_images set needs_credit = true where slug = 'n-0'`)).toMatch(/can only be updated to DEFAULT/);
    await db.exec(`update public.entity_images set license = 'cc_by', author = 'B' where slug = 'n-0'`);
    expect(await one(db, `select needs_credit from public.entity_images where slug = 'n-0'`)).toBe(true);
    await db.exec(`delete from public.entity_images`);
  });

  it('entity_images_public gives the credit of a row that needs one and nothing of any other row', async () => {
    await db.exec(`
      insert into public.entity_images (site_id, kind, slug, path, width, height, license, author, source_url, license_note, license_url, commons_file, license_verified, thumb_path) values
        ('kpop', 'idol', '1', 'k/1.webp', 400, 500, 'cc_by_sa', 'Jane', 'https://commons.wikimedia.org/wiki/File:A.jpg', null, 'https://creativecommons.org/licenses/by-sa/4.0', 'File:A.jpg', true, 'k/1-96.webp'),
        ('kpop', 'idol', '2', 'k/2.webp', 400, 500, 'cc0', 'Joe', 'https://example.org/p', 'cropped', 'https://creativecommons.org/publicdomain/zero/1.0', 'File:B.jpg', true, 'k/2-96.webp'),
        ('kpop', 'idol', '3', 'k/3.webp', 400, 500, 'other', null, null, 'GFDL', null, null, true, 'k/3-96.webp');
    `);
    for (const role of ['anon', 'authenticated']) {
      const res = await asRole(db, role, `select slug, needs_credit, name, author, license, source_url, license_note, license_url, commons_file from public.entity_images_public order by slug`);
      expect(res.rows, role).toEqual([
        { slug: '1', needs_credit: true, name: 'Idol One', author: 'Jane', license: 'cc_by_sa', source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg', license_note: null, license_url: 'https://creativecommons.org/licenses/by-sa/4.0', commons_file: 'File:A.jpg' },
        { slug: '2', needs_credit: false, name: 'Idol Two', author: null, license: null, source_url: null, license_note: null, license_url: null, commons_file: null },
        { slug: '3', needs_credit: false, name: 'Idol Three', author: null, license: null, source_url: null, license_note: null, license_url: null, commons_file: null },
      ]);
    }
    // Only the rows that need a credit are listed by /credits.
    expect((await asRole(db, 'anon', `select slug from public.entity_images_public where needs_credit order by slug`)).rows).toEqual([{ slug: '1' }]);
  });

  it('site_assets_public fills the credit of a CC BY or CC BY-SA banner and nothing of the others', async () => {
    await db.exec(`
      insert into public.site_assets (key, type, page, path, width, height, source_url, author, license, license_note, license_verified, published_at) values
        ('banner:kpopdle', 'banner', 'kpopdle', 'hub/b/a-1920.webp', 1920, 600, 'https://commons.wikimedia.org/wiki/File:A.jpg', 'Jane', 'cc_by', null, true, now() - interval '1 hour'),
        ('banner:daily', 'banner', 'daily', 'hub/b/b-1920.webp', 1920, 600, 'https://example.org/p', 'Joe', 'cc0', 'note', true, now() - interval '1 hour'),
        ('banner:otakudle', 'banner', 'otakudle', 'hub/b/c-1920.webp', 1920, 600, null, 'Mina', 'own_photo', null, true, now() - interval '1 hour');
    `);
    expect((await asRole(db, 'anon', `select key, needs_credit, author, license, source_url, license_note from public.site_assets_public order by key`)).rows).toEqual([
      { key: 'banner:daily', needs_credit: false, author: null, license: null, source_url: null, license_note: null },
      { key: 'banner:kpopdle', needs_credit: true, author: 'Jane', license: 'cc_by', source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg', license_note: null },
      { key: 'banner:otakudle', needs_credit: false, author: null, license: null, source_url: null, license_note: null },
    ]);
  });

  it('a new licence link or Commons file leaves a picture unverified, unless the same statement checks the box again', async () => {
    await db.exec(`update public.entity_images set license_verified = true where kind = 'idol' and slug = '1'`);
    const verified = (): Promise<unknown> => one(db, `select license_verified from public.entity_images where kind = 'idol' and slug = '1'`);
    expect(await verified()).toBe(true);
    await db.exec(`update public.entity_images set license_url = 'https://creativecommons.org/licenses/by-sa/3.0' where kind = 'idol' and slug = '1'`);
    expect(await verified()).toBe(false);
    await db.exec(`update public.entity_images set commons_file = 'File:Z.jpg', license_verified = true where kind = 'idol' and slug = '1'`);
    expect(await verified()).toBe(true);
    await db.exec(`update public.entity_images set commons_file = 'File:Y.jpg' where kind = 'idol' and slug = '1'`);
    expect(await verified()).toBe(false);
  });

  it('the browser roles read no new column of the table, and the table stays closed to writes', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const col of ['license_url', 'commons_file', 'needs_credit']) {
        expect(await one(db, `select has_column_privilege('${role}', 'public.entity_images', '${col}', 'select')`), `${role} ${col}`).toBe(false);
        expect((await asRole(db, role, `select ${col} from public.entity_images`)).error, `${role} ${col}`).toMatch(/permission denied/);
      }
      expect((await asRole(db, role, `insert into public.entity_images (site_id, kind, slug, path, width, height, license) values ('anime', 'series', 'zz', 'a/z.webp', 1, 1, 'cc0')`)).error, role).toMatch(/permission denied/);
    }
    // 018's own display columns are still the ones the anime pages read.
    expect(await one(db, `select has_column_privilege('anon', 'public.entity_images', 'author', 'select') and has_column_privilege('anon', 'public.entity_images', 'path', 'select')`)).toBe(true);
  });

  it('applies twice without change', async () => {
    const fp = (): Promise<string> => one<string>(db, `select md5(concat_ws('|',
      pg_get_viewdef('public.entity_images_public'::regclass), pg_get_viewdef('public.site_assets_public'::regclass),
      (select string_agg(conname || pg_get_constraintdef(oid), ',' order by conname) from pg_constraint where conrelid = 'public.entity_images'::regclass),
      (select string_agg(column_name || is_generated || is_nullable, ',' order by column_name) from information_schema.columns where table_name = 'entity_images' and table_schema = 'public')))`);
    const before = await fp();
    await db.exec(readMigration('018-entity-images.sql'));
    await db.exec(readMigration('022-photos-admin.sql'));
    expect(await fp()).toBe(before);
  });
});
