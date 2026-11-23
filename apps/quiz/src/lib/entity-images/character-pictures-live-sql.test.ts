// Owner, 2026-11-23: every anime character picture goes live (docs/pending-migrations/multisite/launch/L38-l1-character-pictures-live.sql and its
// rollback), on PGlite, with the real check, triggers and view of 022 taken from the file itself. A picture with its 96 px file is verified and an
// http source page moves to https in the same statement (the view passes on https only); one with no 96 px file stays hidden; the series and the
// kpop pictures are untouched; the log table is closed to the browser roles; the rollback restores exactly the logged rows.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../docs/pending-migrations/multisite');
const rd = (f: string): string => readFileSync(path.join(MIGRATIONS, f), 'utf8');
const UP = 'launch/L38-l1-character-pictures-live.sql';
const DOWN = 'launch/L38-l1-character-pictures-live.rollback.sql';
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

/** The part of 022 between two markers, both included. */
function slice022(from: string, to: string): string {
  const src = rd('022-photos-admin.sql');
  const a = src.indexOf(from);
  const b = src.indexOf(to, a);
  expect(a, from).toBeGreaterThan(0);
  expect(b, to).toBeGreaterThan(a);
  return src.slice(a, b + to.length);
}

const BASE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table public.sites (id text primary key);
insert into public.sites (id) values ('kpop'), ('anime');
create table public.groups (id bigint generated always as identity primary key, slug text, name text, site_id text);
create table public.idols (id bigint primary key, name text);
create table public.agencies (id bigint primary key, name text);
create table public.entity_images (
  id bigint generated always as identity primary key,
  site_id text not null references public.sites(id),
  kind text not null check (kind in ('series', 'character', 'idol', 'group', 'agency')),
  slug text not null,
  path text not null,
  width integer not null default 400,
  height integer not null default 400,
  focal_x numeric(5, 2) not null default 50,
  focal_y numeric(5, 2) not null default 50,
  source_url text check (source_url is null or (source_url ~ '^https?://' and char_length(source_url) <= 2000)),
  author text,
  license text not null,
  license_note text,
  license_url text,
  commons_file text,
  needs_credit boolean generated always as (license in ('cc_by', 'cc_by_sa')) stored,
  license_verified boolean not null default false,
  thumb_path text,
  updated_at timestamptz not null default now(),
  unique (site_id, kind, slug)
);
alter table public.entity_images add constraint entity_images_verified_thumb_check check (not license_verified or thumb_path is not null);
`;

/** [slug, kind, site, verified, has 96 px file, source page, licence, note] */
const ROWS: ReadonlyArray<readonly [string, string, string, boolean, boolean, string | null, string, string | null]> = [
  ['one-piece/luffy', 'character', 'anime', false, true, 'https://example.org/luffy', 'cc_by', null],
  ['one-piece/zoro', 'character', 'anime', false, true, 'http://example.org/zoro', 'cc0', null],
  ['one-piece/nami', 'character', 'anime', false, false, null, 'other', 'Official artwork, rights belong to the original creators and studio'],
  ['naruto/naruto', 'character', 'anime', true, true, 'http://example.org/naruto', 'cc_by_sa', null],
  ['naruto/sasuke', 'character', 'anime', true, true, 'https://example.org/sasuke', 'cc0', null],
  ['naruto/sakura', 'character', 'anime', false, true, null, 'other', 'Official artwork, rights belong to the original creators and studio'],
  ['one-piece', 'series', 'anime', false, true, null, 'other', 'Official artwork'],
  ['7', 'idol', 'kpop', false, true, null, 'cc_by', null],
];

async function world(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BASE);
  await db.exec(slice022('create or replace function public.entity_images_licence_listed()', 'for each row execute function public.entity_images_licence_reset();'));
  await db.exec(slice022('create or replace view public.entity_images_public as', "(e.source_url is null or e.source_url ~ '^https://');"));
  for (const [slug, kind, site, verified, thumb, src, lic, note] of ROWS) {
    await db.query(`insert into public.entity_images (site_id, kind, slug, path, source_url, license, license_note, license_verified, thumb_path)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [site, kind, slug, `${site}/${kind}/${slug.replace('/', '-')}.webp`, src, lic, note, verified, thumb ? `${site}/${kind}/${slug.replace('/', '-')}-96.webp` : null]);
  }
  return db;
}

async function run(db: PGlite, sql: string): Promise<string[]> {
  const notices: string[] = [];
  await db.exec(sql, { onNotice: (n) => notices.push(n.message ?? '') });
  return notices;
}

const state = async (db: PGlite): Promise<Record<string, [boolean, string | null]>> => Object.fromEntries(
  (await db.query<{ slug: string; license_verified: boolean; source_url: string | null }>('select slug, license_verified, source_url from public.entity_images order by slug')).rows
    .map((r) => [r.slug, [r.license_verified, r.source_url]]),
);
const live = async (db: PGlite): Promise<string[]> =>
  (await db.query<{ slug: string }>(`select slug from public.entity_images_public where site_id = 'anime' and kind = 'character' order by slug`)).rows.map((r) => r.slug);

describe('L38: the files', () => {
  it.each([[UP, 'l38'], [DOWN, 'l38r']])('%s is one DO block with its header, no dash, no temp table, every update with its where', (file, tag) => {
    const sql = rd(file);
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(code.split(outer).length).toBe(3);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    expect(sql).toMatch(/never between 23:50 and 00:30 UTC/);
    expect(sql).not.toMatch(DASH);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    for (const st of code.split(';').map((x) => x.replace(/--.*$/gm, '').trim()).filter((x) => /^(update|delete)\b/i.test(x))) expect(st, st.slice(0, 60)).toMatch(/\bwhere\b/i);
  });
  it('the owner accepted the risk in the file itself', () => {
    expect(rd(UP)).toContain('"j\'accepte". The owner takes that risk.');
  });
});

describe('L38: on the tables and triggers of 022', () => {
  it('every character picture with its 96 px file goes live, an http source page moves to https, the rest is untouched', async () => {
    const db = await world();
    expect(await live(db)).toEqual(['naruto/sasuke']);
    expect(await run(db, rd(UP))).toEqual(['L38: 4 character pictures checked (2 sources moved to https); 5 now live of 6; 1 with no 96 px file stay hidden (save them again in the admin)']);
    expect(await state(db)).toEqual({
      'one-piece/luffy': [true, 'https://example.org/luffy'],
      'one-piece/zoro': [true, 'https://example.org/zoro'],
      'one-piece/nami': [false, null],
      'naruto/naruto': [true, 'https://example.org/naruto'],
      'naruto/sasuke': [true, 'https://example.org/sasuke'],
      'naruto/sakura': [true, null],
      'one-piece': [false, null],
      '7': [false, null],
    });
    expect(await live(db)).toEqual(['naruto/naruto', 'naruto/sakura', 'naruto/sasuke', 'one-piece/luffy', 'one-piece/zoro']);
    expect(await db.query('select image_id from public.o1_l38_verified_pictures').then((r) => r.rows.length)).toBe(4);
    const priv = await db.query<{ a: boolean; b: boolean }>(`select has_table_privilege('anon', 'public.o1_l38_verified_pictures', 'select') as a,
      has_table_privilege('authenticated', 'public.o1_l38_verified_pictures', 'select') as b`);
    expect(priv.rows[0]).toEqual({ a: false, b: false });
  });

  it('a second run changes nothing', async () => {
    const db = await world();
    await run(db, rd(UP));
    const before = await state(db);
    expect(await run(db, rd(UP))).toEqual(['L38: nothing to change (6 character pictures, 5 now live, 1 with no 96 px file stay hidden)']);
    expect(await state(db)).toEqual(before);
  });

  it('the rollback puts back every logged row (flag and http source page), keeps a source page the admin changed since, and drops the log', async () => {
    const db = await world();
    const start = await state(db);
    await run(db, rd(UP));
    // The admin saves a new source page for Sakura after L38 (its own save verifies it again).
    await db.query(`update public.entity_images set source_url = 'https://new.example/sakura', license_verified = true where slug = 'naruto/sakura'`);
    expect(await run(db, rd(DOWN))).toEqual(['L38 rollback: 4 character pictures put back']);
    expect(await state(db)).toEqual({ ...start, 'naruto/sakura': [false, 'https://new.example/sakura'] });
    expect(await live(db)).toEqual(['naruto/sasuke']);
    expect(await db.query(`select to_regclass('public.o1_l38_verified_pictures') as t`).then((r) => (r.rows[0] as { t: unknown }).t)).toBeNull();
    expect(await run(db, rd(DOWN))).toEqual(['L38 rollback: nothing to undo (the log table is not there)']);
  });

  it('a missing prerequisite stops it', async () => {
    const db = new PGlite();
    await db.exec('create role anon nologin; create role authenticated nologin;');
    await expect(run(db, rd(UP))).rejects.toThrow(/entity_images is missing/);
  });
});
