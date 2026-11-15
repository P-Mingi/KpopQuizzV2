// KpopCards, PR #231: the database the integrator read in production on 2026-11-14, as SQL texts, for the proofs of the bundle
// (docs/pending-migrations/cards/ALL-099-115.sql, ALL-verify.sql, ALL-rollback.sql). Test code only, nothing here touches a real database.
//   - the stand-ins of sql-harness.ts (Supabase roles, auth.users, storage, quizzes, plays, dle_plays, dle_games), plus the default
//     privileges Supabase gives a new table, function or sequence of public (anon, authenticated and service_role get everything), so a
//     missing revoke in a file would show;
//   - 001 to 003 applied, then public.groups and public.idols as the files read them (the columns of idols-members-sql.test.ts), the
//     Kpopdle source view of idols-returning-sql.test.ts, the profiles table of sql-social.test.ts, then 101 applied: 92 cards of 23 subjects,
//     no part column, 0 row of 099. The 36 subjects 101 leaves out are the ones production leaves out: the 31 of 099 (no idols row yet),
//     fromis-9, kara and loona (no idols row, 099b adds them), and three groups with a minor or an unknown birth date;
//   - a player with a wallet and an earned Kpopdle bonus but no card and no pack (the guard accepts it), so the rollback has rows to keep.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { BASE, CARDS_SQL, SCHEMA_FILES, readCardsSql } from './sql-harness';

/** What Supabase grants on a new object of public (the files revoke it where a browser must not reach). */
export const SUPABASE_DEFAULTS = `
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

type Subject = { slug: string; kind: 'idol' | 'group' };
const SUBJECTS = ((): Subject[] => {
  const sql = readFileSync(path.join(CARDS_SQL, '101-catalog.sql'), 'utf8');
  const a = sql.indexOf('$subjects$[') + '$subjects$'.length;
  return JSON.parse(sql.slice(a, sql.indexOf(']$subjects$', a) + 1)) as Subject[];
})();
const LIST099 = ((): string[] => {
  const sql = readFileSync(path.join(CARDS_SQL, '099-idols-members.sql'), 'utf8');
  const a = sql.indexOf('$members$[') + '$members$'.length;
  return (JSON.parse(sql.slice(a, sql.indexOf(']$members$', a) + 1)) as Array<{ slug: string }>).map((s) => s.slug);
})();

/** The people of the run who are members of a group that is not a subject: the groups row of the person, the idols row in the group. */
const MEMBERS: Record<string, [group: string, name: string]> = {
  jennie: ['blackpink', 'Jennie'], rose: ['blackpink', 'Rosé'], jimin: ['bts', 'Jimin'], jungkook: ['bts', 'Jungkook'], 'v-bts': ['bts', 'V'],
  hwasa: ['mamamoo', 'Hwasa'], taeyang: ['bigbang', 'Taeyang'], taeyeon: ['girls-generation', 'Taeyeon'],
  // Zico is a subject of 099 too: his active row in Block B makes 099 skip him and 101 bind him to it
  zico: ['block-b', 'Zico'],
};
const LINES: Record<string, string[]> = {
  blackpink: ['Jennie', 'Rosé', 'Lisa', 'Jisoo'], bts: ['Jimin', 'Jungkook', 'V', 'RM'], mamamoo: ['Hwasa', 'Solar'],
  bigbang: ['Taeyang', 'G-Dragon'], 'girls-generation': ['Taeyeon', 'Yoona'], 'block-b': ['Zico', 'P.O'],
};
/** No idols row: 099b adds their members after 102. */
const RETURNING = ['fromis-9', 'kara', 'loona'];
/** A group 101 leaves out at apply time (decision 17). */
const OUT_101: Record<string, 'minor' | 'unknown'> = { team: 'minor', 'young-posse': 'minor', tws: 'unknown' };

const q = (s: string): string => `'${s.replace(/'/g, "''")}'`;

export const U1 = '00000000-0000-4000-8000-0000000000a1';

/** public.groups, public.idols and the rest of the state of 2026-11-14 (after 001 to 003, before 101). */
export function prodFixture(): string {
  const groups: Array<[slug: string, name: string]> = [];
  const idols: string[] = [];
  const name = (slug: string): string => MEMBERS[slug]?.[1] ?? slug.toUpperCase();
  for (const s of SUBJECTS) groups.push([s.slug, name(s.slug)]);
  for (const g of Object.keys(LINES)) groups.push([g, g.toUpperCase()]);
  for (const [g, names] of Object.entries(LINES)) {
    names.forEach((n, i) => idols.push(`(${q(g)}, ${q(n)}, date '${1990 + i}-03-0${i + 1}', true, ${i + 1}, null)`));
  }
  for (const s of SUBJECTS) {
    if (s.kind !== 'group' || LIST099.includes(s.slug) || RETURNING.includes(s.slug)) continue;
    const out = OUT_101[s.slug];
    idols.push(`(${q(s.slug)}, ${q(`${s.slug} one`)}, date '1996-05-01', true, 1, null)`);
    const second = out === 'minor' ? `(current_date - interval '16 years')::date` : out === 'unknown' ? 'null' : `date '1998-07-02'`;
    idols.push(`(${q(s.slug)}, ${q(`${s.slug} two`)}, ${second}, true, 2, null)`);
  }
  // rows production has around the subjects of 099: a former member (099 still adds the group), a former member with the name of a member
  // of 099's list (099 skips that one name: on conflict (group_id, name) do nothing)
  idols.push(`('winner', 'Nam Tae-hyun', date '1994-05-10', false, 5, null)`);
  idols.push(`('apink', 'Bomi', date '1993-08-13', false, 2, null)`);
  return `
create table public.groups (id serial primary key, name text not null unique, slug text not null unique, inception_date date);
create table public.idols (
  id serial primary key, group_id integer not null references public.groups(id), name text not null, birth_date date,
  wikidata_qid text, active boolean not null default true, ord integer not null default 0, needs_review boolean not null default false,
  review_reason text, detached_at timestamptz, unique (group_id, name));
create view public.dle_src_kpop_idol as select id::text as entity_id from public.idols where active and not needs_review;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, username text unique not null);
insert into public.groups (slug, name, inception_date) values
  ${groups.map(([s, n], i) => `(${q(s)}, ${q(n)}, date '${2008 + (i % 15)}-0${(i % 9) + 1}-15')`).join(',\n  ')};
insert into public.idols (group_id, name, birth_date, active, ord, review_reason)
select g.id, v.name, v.birth_date, v.active, v.ord, v.reason from (values
  ${idols.join(',\n  ')}
) as v(slug, name, birth_date, active, ord, reason) join public.groups g on g.slug = v.slug;
insert into auth.users (id) values ('${U1}');
insert into public.profiles (id, username) values ('${U1}', 'fan1');
insert into public.cards_wallets (user_id, stock, anchor, paris_day, shards) values ('${U1}', 5, timestamptz '2026-11-13 18:00+00', date '2026-11-13', 12);
insert into public.cards_bonus_earned (user_id, paris_day, source, play_ref, earned_at)
  values ('${U1}', date '2026-11-13', 'kpopdle', 'dle_plays:41', timestamptz '2026-11-13 18:05+00');
`;
}

/** The SQL texts that build the database of 2026-11-14, in order. */
export function prodStateSql(): string[] {
  return [BASE, SUPABASE_DEFAULTS, ...SCHEMA_FILES.map(readCardsSql), prodFixture(), readCardsSql('101-catalog.sql')];
}

/**
 * One text for the whole state of the schemas the files touch: every table, view and sequence with its columns, constraints, indexes,
 * triggers, policies, row level security and grants; every function with its definition and grants; and a checksum of the rows of every
 * table (identity columns of the cards photos left in, so a new id shows). Runs on PGlite and on Postgres alike.
 */
export const FINGERPRINT = `
with rels as (
  select c.oid, n.nspname || '.' || c.relname as name, c.relkind::text as relkind, c.relrowsecurity, c.relacl::text as acl
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'auth', 'storage') and c.relkind in ('r', 'v', 'S', 'p')),
parts as (
  select 'rel ' || r.name || ' ' || r.relkind || ' rls=' || r.relrowsecurity || ' acl=' || coalesce(r.acl, '-') as line from rels r
  union all
  select 'col ' || r.name || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod) || ' notnull=' || a.attnotnull
         || ' default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '-') || ' acl=' || coalesce(a.attacl::text, '-')
    from rels r join pg_attribute a on a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  union all
  select 'con ' || r.name || ' ' || k.conname || ' ' || pg_get_constraintdef(k.oid) from rels r join pg_constraint k on k.conrelid = r.oid
  union all
  select 'idx ' || r.name || ' ' || pg_get_indexdef(i.indexrelid) from rels r join pg_index i on i.indrelid = r.oid
  union all
  select 'trg ' || r.name || ' ' || pg_get_triggerdef(t.oid) from rels r join pg_trigger t on t.tgrelid = r.oid and not t.tgisinternal
  union all
  select 'pol ' || p.schemaname || '.' || p.tablename || ' ' || p.policyname || ' ' || p.cmd || ' ' || coalesce(p.qual, '-') || ' ' || coalesce(p.with_check, '-')
    from pg_policies p where p.schemaname in ('public', 'auth', 'storage')
  union all
  select 'viw ' || r.name || ' ' || pg_get_viewdef(r.oid) from rels r where r.relkind = 'v'
  union all
  select 'fun ' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') acl=' || coalesce(p.proacl::text, '-')
         || ' ' || md5(pg_get_functiondef(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'auth', 'storage') and p.prokind in ('f', 'p'))
select string_agg(line, E'\\n' order by line) from parts`;

/** The rows of every table of these schemas, one checksum each: "schema.table count md5". */
export const ROW_SUMS_SQL = `select n.nspname || '.' || c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'auth', 'storage') and c.relkind in ('r', 'p') order by 1`;
export const rowSumOf = (table: string): string =>
  `select '${table} ' || count(*) || ' ' || md5(coalesce(string_agg(t::text, E'\\n' order by t::text), '')) from ${table} t`;
