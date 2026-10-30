// Daily games (step 1): a throwaway Postgres 18 in WebAssembly (PGlite) for the SQL tests of the dle engine. It builds a
// stand-in for the production objects the migrations need (the Supabase roles, auth.users and auth.uid(), storage.buckets,
// public.sites and the idols tables with their production columns, ~/kpq-o1/prod-public.sql of 2026-10-17), then applies the
// real files 018, 019 and 020 of docs/pending-migrations/multisite/. Test code only: nothing in the app imports it.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
export const MIGRATIONS = path.join(REPO, 'docs/pending-migrations/multisite');

export const readMigration = (file: string): string => readFileSync(path.join(MIGRATIONS, file), 'utf8');

const BASE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;

create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);

create table public.sites (id text primary key, domain text, brand text, kind text, status text, sort integer);
insert into public.sites values ('kpop', 'kpopquiz.org', 'KpopQuiz', 'world', 'live', 1);

create table public.groups (
  id serial primary key, name text not null unique, slug text not null unique, fandom_name text not null default 'fan',
  generation text, inception_date date, record_label text
);
create table public.group_units (id serial primary key, parent_group_id integer not null references public.groups(id), name text not null);
create table public.idols (
  id serial primary key, group_id integer not null references public.groups(id), unit_id integer references public.group_units(id),
  name text not null, name_romanized text, name_hangul text, birth_date date, nationality text,
  positions text[] not null default '{}', photo_url text, wikidata_qid text, active boolean not null default true,
  ord integer not null default 0, needs_review boolean not null default false, review_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  height_cm integer, blood_type text, mbti text, origin text not null default 'wikidata', created_by uuid, detached_at timestamptz
);
`;

/** A fresh database with the base and the given migration files applied, in order. */
export async function freshDb(files: readonly string[] = ['018-entity-images.sql', '019-dle-core.sql', '020-dle-kpop-idol.sql']): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BASE);
  for (const f of files) await db.exec(readMigration(f));
  return db;
}

/** Runs one statement and returns its rows. */
export async function rows<T = Record<string, unknown>>(db: PGlite, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

/** Runs one statement and returns the first column of its first row. */
export async function one<T = unknown>(db: PGlite, sql: string, params: unknown[] = []): Promise<T> {
  const r = await db.query<Record<string, T>>(sql, params);
  const first = r.rows[0];
  return (first ? Object.values(first)[0] : undefined) as T;
}

/** The error message of a statement that must fail, or null when it passed. */
export async function failure(db: PGlite, sql: string, params: unknown[] = []): Promise<string | null> {
  try {
    if (params.length) await db.query(sql, params);
    else await db.exec(sql);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
