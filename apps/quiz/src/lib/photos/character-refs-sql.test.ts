// Owner, 2026-11-10: L32 makes the PRIVATE store of the Fandom reference pictures of the OtakuQuiz characters (bucket character-refs, table
// character_reference_images). Run on PGlite with the shape of Supabase storage it touches (storage.buckets, storage.objects) and the two
// API roles: the bucket is private, the table has RLS on, no policy, and neither anon nor authenticated can read it; the file can run
// twice; the rollback refuses while the bucket holds files, then undoes everything.
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { readLaunchFile, verifyDiffs, verifyLines } from '@/lib/editorial/launch-verify';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const UP = 'L32-l1-character-refs.sql';
const DOWN = 'L32-l1-character-refs.rollback.sql';

const SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[],
    created_at timestamptz default now()
  );
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
  alter table storage.objects enable row level security;
  -- the public bucket of the site and its read policy, as in production: L32 must leave them alone
  insert into storage.buckets (id, name, public) values ('entity-images', 'entity-images', true);
  create policy "entity images are public" on storage.objects for select using (bucket_id = 'entity-images');
  -- Supabase's default privileges: every new table of public is granted to the API roles
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`;

async function fresh(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE);
  return db;
}

describe('L32: the private store of the character references', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await fresh();
    await db.exec(readLaunchFile(UP));
  });

  it('every Verify line of its header holds after the apply', async () => {
    expect(verifyLines(UP).length).toBeGreaterThanOrEqual(6);
    expect(await verifyDiffs(db, UP)).toEqual([]);
  });

  it('makes the bucket private, images only, 10 MB at most, and leaves the public bucket and its policy alone', async () => {
    const b = await db.query<{ public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(`select public, file_size_limit::text, allowed_mime_types from storage.buckets where id = 'character-refs'`);
    expect(b.rows[0]).toEqual({ public: false, file_size_limit: '10485760', allowed_mime_types: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] });
    const e = await db.query<{ public: boolean }>(`select public from storage.buckets where id = 'entity-images'`);
    expect(e.rows[0]!.public).toBe(true);
    const p = await db.query<{ n: number }>(`select count(*)::int as n from pg_policies where schemaname = 'storage'`);
    expect(p.rows[0]!.n).toBe(1);
  });

  it('the table: the columns of the owner\'s list, the key (site, series, character), the status check, no read for anon or authenticated', async () => {
    const cols = await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'character_reference_images' order by ordinal_position`);
    expect(cols.rows.map((r) => r.column_name)).toEqual([
      'site_id', 'series_slug', 'character_slug', 'status', 'reference_path', 'reference_page_url', 'reference_image_url', 'reference_file_page_url',
      'reference_author', 'reference_license', 'reference_found_by', 'reference_fetched_at', 'reference_uploaded_at', 'candidate_path',
      'candidate_source_url', 'candidate_author', 'candidate_license', 'candidate_license_url', 'candidate_uploaded_at', 'published_at',
    ]);
    // the same character slug in two series is two rows (kohaku of Inuyasha and of Dr. Stone)
    await db.exec(`insert into public.character_reference_images (series_slug, character_slug) values ('inuyasha', 'kohaku'), ('dr-stone', 'kohaku')`);
    const two = await db.query<{ n: number; s: string }>(`select count(*)::int as n, min(status) as s from public.character_reference_images where character_slug = 'kohaku'`);
    expect(two.rows[0]).toEqual({ n: 2, s: 'reference' });
    await expect(db.exec(`insert into public.character_reference_images (series_slug, character_slug) values ('inuyasha', 'kohaku')`)).rejects.toThrow();
    await expect(db.exec(`insert into public.character_reference_images (series_slug, character_slug, status) values ('x', 'y', 'public')`)).rejects.toThrow();
    for (const role of ['anon', 'authenticated']) {
      for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        const r = await db.query<{ ok: boolean }>(`select has_table_privilege('${role}', 'public.character_reference_images', '${priv}') as ok`);
        expect(r.rows[0]!.ok, `${role} ${priv}`).toBe(false);
      }
    }
    await db.exec(`delete from public.character_reference_images`);
  });

  it('can run twice: a bucket made public by hand is private again, rows are kept', async () => {
    await db.exec(`insert into public.character_reference_images (series_slug, character_slug, reference_path) values ('one-piece', 'monkey-d-luffy', 'anime/one-piece/monkey-d-luffy-abc.png')`);
    await db.exec(`update storage.buckets set public = true where id = 'character-refs'`);
    await db.exec(readLaunchFile(UP));
    expect(await verifyDiffs(db, UP)).toEqual([]);
    const n = await db.query<{ n: number }>(`select count(*)::int as n from public.character_reference_images`);
    expect(n.rows[0]!.n).toBe(1);
    await db.exec(`delete from public.character_reference_images`);
  });

  it('refuses a policy on the table or a storage policy that names the bucket', async () => {
    const other = await fresh();
    await other.exec(readLaunchFile(UP));
    await other.exec(`create policy "leak" on public.character_reference_images for select using (true)`);
    await expect(other.exec(readLaunchFile(UP))).rejects.toThrow(/has a policy/);
    const third = await fresh();
    await third.exec(`create policy "refs" on storage.objects for select using (bucket_id = 'character-refs')`);
    await expect(third.exec(readLaunchFile(UP))).rejects.toThrow(/storage policy names the bucket/);
  });

  it('the rollback refuses while the bucket holds files, then drops the table and the bucket', async () => {
    await db.exec(`insert into storage.objects (bucket_id, name) values ('character-refs', 'anime/one-piece/monkey-d-luffy-abc.png')`);
    await expect(db.exec(readLaunchFile(DOWN))).rejects.toThrow(/still holds files/);
    await db.exec(`delete from storage.objects where bucket_id = 'character-refs'`);
    await db.exec(readLaunchFile(DOWN));
    expect(await verifyDiffs(db, DOWN)).toEqual([]);
    await db.exec(readLaunchFile(DOWN));
    expect(await verifyDiffs(db, DOWN)).toEqual([]);
    const e = await db.query<{ n: number }>(`select count(*)::int as n from storage.buckets where id = 'entity-images'`);
    expect(e.rows[0]!.n).toBe(1);
  });
});
