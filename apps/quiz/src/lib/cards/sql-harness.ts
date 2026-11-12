// Bunnyverse Cards: a throwaway Postgres in WebAssembly (PGlite) for the SQL proofs of docs/pending-migrations/cards/. Test code only.
// It builds stand-ins for the production objects the files need (Supabase roles, auth.users, storage.buckets, plays, quizzes, dle_plays),
// then applies the real files. Nothing here touches a real database.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
export const CARDS_SQL = path.join(REPO, 'docs/pending-migrations/cards');
export const readCardsSql = (file: string): string => readFileSync(path.join(CARDS_SQL, file), 'utf8');

export const SCHEMA_FILES = ['001-schema.sql', '002-functions.sql', '003-rls.sql'] as const;

export const BASE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;

create schema auth;
create table auth.users (id uuid primary key);
grant usage on schema auth to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id bigserial primary key, bucket_id text);
-- Supabase's storage.protect_delete: a statement-level trigger that refuses any SQL delete unless storage.allow_delete_query is 'true'.
create function storage.protect_delete() returns trigger language plpgsql as $p$
begin
  if coalesce(current_setting('storage.allow_delete_query', true), 'false') <> 'true' then
    raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.';
  end if;
  return null;
end
$p$;
create trigger protect_buckets_delete before delete on storage.buckets for each statement execute function storage.protect_delete();
create trigger protect_objects_delete before delete on storage.objects for each statement execute function storage.protect_delete();

-- Stand-ins for the play tables: plays and quizzes (written by a browser, never counted: the proof of review 1 finding 1), dle_plays and
-- dle_games (the production columns cards_bonus_record reads).
create table public.quizzes (id uuid primary key default gen_random_uuid(), site_id text not null default 'kpop');
create table public.plays (id uuid primary key default gen_random_uuid(), quiz_id uuid not null references public.quizzes(id),
  player_id uuid, created_at timestamptz not null default now());
create table public.dle_plays (id bigint generated always as identity primary key, game_id text not null, play_date date not null,
  user_id uuid, status text not null default 'playing', finished_at timestamptz);
create table public.dle_games (id text primary key);
insert into public.dle_games (id) values ('kpopdle-idol'), ('otakudle-character');
`;

/** BASE without the Kpopdle tables (a database where docs/pending-migrations/multisite/019-dle-core.sql is not applied). */
export const BASE_NO_DLE = BASE.slice(0, BASE.indexOf('create table public.dle_plays'));

/** A fresh database: the stand-ins, then the given cards files in order. */
export async function freshCardsDb(files: readonly string[] = SCHEMA_FILES, base: string = BASE): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(base);
  for (const f of files) await db.exec(readCardsSql(f));
  return db;
}

export async function rows<T = Record<string, unknown>>(db: PGlite, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

export async function one<T = unknown>(db: PGlite, sql: string, params: unknown[] = []): Promise<T> {
  const r = await db.query<Record<string, T>>(sql, params);
  const first = r.rows[0];
  return (first ? Object.values(first)[0] : undefined) as T;
}

/** The error message of a statement that must fail, or null when it passed. */
export async function failure(db: PGlite, sql: string, params: unknown[] = []): Promise<string | null> {
  try {
    await db.query(sql, params);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
