// Daily games step 2: 022-photos-admin.sql on PGlite (Postgres 18 in WebAssembly), on the stand-in of the dle tests (pglite-harness.ts) plus
// groups.site_id (002a). The full proof on a real Postgres 18, with the rollback, is docs/proofs/step2/local-pg-transcript.txt.
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
      insert into public.idols (group_id, name, birth_date) values (1, 'Idol One', '1995-01-01');
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
});
