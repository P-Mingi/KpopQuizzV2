-- 002a-site-columns.sql (run O1, lane B2; manifest.md row 3; BACKLOG 4.1 rows 2 and 3; schema.sql "@file 002a-site-columns")
--
-- What:   adds site_id text not null default 'kpop' to the 24 scoped tables of schema.sql (the 14 of BACKLOG row 2,
--         then the inventory: verse_threads, verse_essays, editorial_posts, community_replies, community_debates,
--         community_challenges, reports, live_rooms, challenges, personality_profiles), and on each one the foreign
--         key <table>_site_id_fkey references public.sites(id), added NOT VALID (002b validates it).
-- Why:    one database serves kpopquiz.org, otakuquiz.org and fanquiz.org; every scoped read filters by site_id
--         (forSite, SITE_SCOPE) and every scoped insert carries it (withSite). Additive only: kpop code that never
--         names site_id keeps working, and every existing and future kpop row reads 'kpop' through the default.
-- Rows:   24 tables altered; no row is rewritten or scanned (a constant default is catalog-only since Postgres 11,
--         and a NOT VALID foreign key checks new rows only). Each ALTER takes a short ACCESS EXCLUSIVE lock;
--         lock_timeout 3s makes the file fail whole (one transaction) rather than queue behind a long read: rerun.
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and column_name = 'site_id'
--           and column_default = '''kpop''::text' and is_nullable = 'NO';                         expect 24 (plus
--           any later file's own site_id columns)
--         select count(*) from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass
--           and conname like '%\_site\_id\_fkey' and not convalidated;                            expect 24 (0 after 002b)
--         select count(*) from public.quizzes where site_id <> 'kpop';                              expect 0
--         select count(*) from public.badge_definitions where site_id <> 'kpop';                    expect 0 (BACKLOG 4.4)
-- Undo:   002a-site-columns.rollback.sql (after 002d's, 002c's and 002b's rollbacks; refused while any row of the
--         24 tables has a site other than kpop).
-- Needs:  001-sites.sql.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '3s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.sites') is null or not exists (select 1 from public.sites where id = 'kpop') then
    raise exception '002a-site-columns: public.sites or its kpop row is missing; apply 001-sites.sql first';
  end if;
end $$;

alter table public.quizzes               add column if not exists site_id text not null default 'kpop';
alter table public.groups                add column if not exists site_id text not null default 'kpop';
alter table public.games                 add column if not exists site_id text not null default 'kpop';
alter table public.trivia                add column if not exists site_id text not null default 'kpop';
alter table public.quiz_bank             add column if not exists site_id text not null default 'kpop';
alter table public.qotd_log              add column if not exists site_id text not null default 'kpop';
alter table public.badge_definitions     add column if not exists site_id text not null default 'kpop';
alter table public.creator_notifications add column if not exists site_id text not null default 'kpop';
alter table public.activity_events       add column if not exists site_id text not null default 'kpop';
alter table public.editorial_accounts    add column if not exists site_id text not null default 'kpop';
alter table public.editorial_drafts      add column if not exists site_id text not null default 'kpop';
alter table public.bt_runs               add column if not exists site_id text not null default 'kpop';
alter table public.personality_questions add column if not exists site_id text not null default 'kpop';
alter table public.songs                 add column if not exists site_id text not null default 'kpop';
alter table public.verse_threads         add column if not exists site_id text not null default 'kpop';
alter table public.verse_essays          add column if not exists site_id text not null default 'kpop';
alter table public.editorial_posts       add column if not exists site_id text not null default 'kpop';
alter table public.community_replies     add column if not exists site_id text not null default 'kpop';
alter table public.community_debates     add column if not exists site_id text not null default 'kpop';
alter table public.community_challenges  add column if not exists site_id text not null default 'kpop';
alter table public.reports               add column if not exists site_id text not null default 'kpop';
alter table public.live_rooms            add column if not exists site_id text not null default 'kpop';
alter table public.challenges            add column if not exists site_id text not null default 'kpop';
alter table public.personality_profiles  add column if not exists site_id text not null default 'kpop';

-- The 24 foreign keys, NOT VALID (no scan; 002b validates each one alone). Added only when missing.
do $$
declare
  t text;
begin
  foreach t in array array[
    'quizzes', 'groups', 'games', 'trivia', 'quiz_bank', 'qotd_log', 'badge_definitions', 'creator_notifications',
    'activity_events', 'editorial_accounts', 'editorial_drafts', 'bt_runs', 'personality_questions', 'songs',
    'verse_threads', 'verse_essays', 'editorial_posts', 'community_replies', 'community_debates',
    'community_challenges', 'reports', 'live_rooms', 'challenges', 'personality_profiles'
  ] loop
    if not exists (
      select 1 from pg_constraint
       where conrelid = format('public.%I', t)::regclass and conname = t || '_site_id_fkey'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (site_id) references public.sites(id) not valid',
        t, t || '_site_id_fkey');
    end if;
  end loop;
end $$;

-- Self-check: 24 columns text not null default 'kpop', each with its foreign key to public.sites(id).
do $$
declare
  n integer;
begin
  select count(*) into n
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid and c.relnamespace = 'public'::regnamespace
    join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    join pg_constraint k on k.conrelid = a.attrelid and k.conname = c.relname || '_site_id_fkey'
                        and k.contype = 'f' and k.confrelid = 'public.sites'::regclass and k.conkey = array[a.attnum]
   where a.attname = 'site_id' and not a.attisdropped and a.attnotnull
     and a.atttypid = 'text'::regtype and pg_get_expr(d.adbin, d.adrelid) = '''kpop''::text'
     and c.relname in (
       'quizzes', 'groups', 'games', 'trivia', 'quiz_bank', 'qotd_log', 'badge_definitions', 'creator_notifications',
       'activity_events', 'editorial_accounts', 'editorial_drafts', 'bt_runs', 'personality_questions', 'songs',
       'verse_threads', 'verse_essays', 'editorial_posts', 'community_replies', 'community_debates',
       'community_challenges', 'reports', 'live_rooms', 'challenges', 'personality_profiles');
  if n <> 24 then
    raise exception '002a-site-columns: expected 24 site_id columns with their foreign keys, found %', n;
  end if;
end $$;
