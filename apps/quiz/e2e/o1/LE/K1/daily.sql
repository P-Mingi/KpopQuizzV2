-- Lot (e) part 1, lane K1, check 2: the kpop daily quiz is the same before and after 010, and a kpop and an anime daily on
-- the same date both publish.
--
-- Part 1 (always): 110 consecutive dates (2031-01-01 and on), each with a kpop quiz_bank row of its own (statuses scheduled,
-- verified, draft and published; a group or none, so the fallback group 'general-kpop' is used; titles with quotes and
-- with nothing but punctuation, so the slug clash path runs; questions with a "source" key that must be stripped), some
-- dates with a quiz already flagged as the quiz of the day, some with a stale date and no flag, some with a qotd_log row
-- already there (the ON CONFLICT path). ensure_daily_quiz(date text) is called twice for each date (220 calls) and ONE md5
-- is taken over what the 110 dates end with (the quiz, its group, creator, questions, flags, the bank row, the log row and
-- the counters the insert trigger moves). Nothing there depends on a random value, a sequence or a timestamp: ids are
-- md5-derived or left out, the slug epoch suffix is normalised, every hashed line is ordered. Run it before 010 (today's
-- function) and after 010 (the wrapper over ensure_daily_quiz_v2): the two "DQ HASH" values must be equal.
-- Part 2 (only when ensure_daily_quiz_v2 exists): a kpop and an anime daily on the same date, in both call orders, the
-- site isolation of the lookups and the grants. Its lines start with "DQ2" and end with PASS or FAIL.
--
-- Everything runs inside BEGIN ... ROLLBACK, nothing persists. Lines starting with "DQ" are the output the runner keeps.
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset footer off
set client_min_messages = warning;

begin;

create temp table dq_out (k text primary key, v text not null);

-- ---------------------------------------------------------------- fixtures (before the baseline of the counters)
insert into public.groups (name, slug, display_color, text_color)
select 'Dq K1 Group ' || i, 'dq-k1-group-' || i, '#123456', '#ffffff' from generate_series(1, 6) i;
create temp table dq_g as
  select row_number() over (order by slug)::integer as gi, id, slug from public.groups where slug like 'dq-k1-group-%';
create temp table dq_dates as
  select i, (date '2031-01-01' + i) as d from generate_series(0, 109) i;

-- an old quiz that the pre-existing qotd_log rows point at
insert into public.quizzes (id, creator_id, group_id, title, slug, questions, status)
select md5('dq-k1-old')::uuid, '00000000-0000-0000-0000-000000000001', id, 'Dq old quiz', 'dq-k1-old-quiz', '[1, 2, 3]'::jsonb, 'published'
  from dq_g where gi = 1;

insert into public.quiz_bank (id, title, group_id, quiz_type, difficulty, category, questions, scheduled_date, status)
select md5('dq-k1-bank-' || i)::uuid,
       case when i in (22, 45) then '?????'
            when i % 7 = 0 then 'Who''s the "BTS" fan?? Edition ' || i
            else 'Daily check number ' || i || ' of the run' end,
       case when i % 5 = 0 then null else (select id from dq_g where gi = 1 + (i % 6)) end,
       (array['multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'])[1 + (i % 5)],
       (array['easy', 'medium', 'hard'])[1 + (i % 3)],
       (array['group_specific', 'knowledge', 'true_false', 'fun', 'era'])[1 + (i % 5)],
       (select jsonb_agg(jsonb_build_object('question', 'Q' || q || ' of ' || i, 'options', jsonb_build_array('a', 'b', 'c', 'd'),
                                            'correct', q % 4, 'source', 'src-' || i || '-' || q) order by q)
          from generate_series(1, 3 + (i % 5)) q),
       d,
       case when i % 11 = 5 then 'draft' when i % 17 = 3 then 'published' when i % 13 = 7 then 'verified' else 'scheduled' end
  from dq_dates;

-- dates that already have a flagged quiz of the day (the "existing" path)
insert into public.quizzes (id, creator_id, group_id, title, slug, questions, status, is_quiz_of_the_day, quiz_of_the_day_date)
select md5('dq-k1-flagged-' || i)::uuid, '00000000-0000-0000-0000-000000000001', (select id from dq_g where gi = 2),
       'Dq pre-flagged ' || i, 'dq-k1-flagged-' || i, '[1, 2, 3]'::jsonb, 'published', true, d
  from dq_dates where i % 29 = 4;
-- dates that carry a stale day without the flag (the unflagging UPDATE)
insert into public.quizzes (id, creator_id, group_id, title, slug, questions, status, is_quiz_of_the_day, quiz_of_the_day_date)
select md5('dq-k1-stale-' || i)::uuid, '00000000-0000-0000-0000-000000000001', (select id from dq_g where gi = 3),
       'Dq stale day ' || i, 'dq-k1-stale-' || i, '[1, 2, 3]'::jsonb, 'published', false, d
  from dq_dates where i % 31 = 6;
-- dates that already have a log row (the ON CONFLICT path)
insert into public.qotd_log (quiz_id, featured_date, selection_method)
select md5('dq-k1-old')::uuid, d, 'manual' from dq_dates where i % 19 = 2;

-- counters before the batch
create temp table dq_base as
  select (select total_quizzes_created from public.profiles where id = '00000000-0000-0000-0000-000000000001') as tqc,
         (select coalesce(max(id), 0) from public.activity_events) as act_max;
create temp table dq_gbase as select id, quiz_count from public.groups where slug like 'dq-k1-group-%' or slug = 'general-kpop';

-- ---------------------------------------------------------------- part 1: 110 dates, 2 calls each
create temp table dq_calls (d date primary key, i integer not null, first_id uuid, second_id uuid);
do $$
declare
  r record;
  a uuid;
  b uuid;
begin
  for r in select d, i from dq_dates order by d loop
    a := public.ensure_daily_quiz(r.d::text);
    b := public.ensure_daily_quiz(r.d::text);
    insert into dq_calls values (r.d, r.i, a, b);
  end loop;
end $$;

insert into dq_out select 'calls ensure_daily_quiz', (select count(*) * 2 from dq_calls)::text;
insert into dq_out select 'dates published (id returned)', count(first_id)::text from dq_calls;
insert into dq_out select 'dates null', count(*) filter (where first_id is null)::text from dq_calls;
insert into dq_out select 'dates second call differs', count(*) filter (where first_id is distinct from second_id)::text from dq_calls;
insert into dq_out select 'dates already flagged', count(*)::text from dq_calls c join public.quizzes q on q.id = c.first_id where q.slug like 'dq-k1-flagged-%';
insert into dq_out select 'dates published from the bank', count(*)::text from public.quiz_bank b where b.id in (select md5('dq-k1-bank-' || i)::uuid from dq_dates) and b.status = 'published' and b.published_quiz_id is not null and b.scheduled_date in (select d from dq_dates where i % 17 <> 3);

-- one md5 per section, then the final one
insert into dq_out
select 'md5 quizzes', md5(coalesce(string_agg(concat_ws('|', c.d, (c.first_id is not null)::text, (c.first_id is not distinct from c.second_id)::text,
         q.title, regexp_replace(q.slug, '-[0-9]{8,}$', '-T'), g.slug, q.creator_id, q.quiz_type, q.difficulty, q.questions::text,
         q.question_count, q.settings::text, q.status, q.is_quiz_of_the_day, q.quiz_of_the_day_date, q.site_id, q.language, q.play_count),
         E'\n' order by c.d), ''))
  from dq_calls c left join public.quizzes q on q.id = c.first_id left join public.groups g on g.id = q.group_id;
insert into dq_out
select 'md5 bank', md5(coalesce(string_agg(concat_ws('|', b.scheduled_date, b.status, (b.published_quiz_id is not null)::text,
         (b.published_quiz_id is not distinct from c.first_id)::text, b.site_id, b.title, b.category), E'\n' order by b.scheduled_date), ''))
  from public.quiz_bank b join dq_calls c on c.d = b.scheduled_date where b.id in (select md5('dq-k1-bank-' || i)::uuid from dq_dates);
insert into dq_out
select 'md5 log', md5(coalesce(string_agg(concat_ws('|', c.d, (select count(*) from public.qotd_log l where l.featured_date = c.d),
         (select string_agg(l.selection_method || ':' || l.site_id || ':' || (l.quiz_id is not distinct from c.first_id)::text, ',' order by l.selection_method)
            from public.qotd_log l where l.featured_date = c.d)), E'\n' order by c.d), ''))
  from dq_calls c;
insert into dq_out
select 'md5 flags', md5(coalesce(string_agg(concat_ws('|', c.d,
         (select count(*) from public.quizzes q where q.quiz_of_the_day_date = c.d and q.is_quiz_of_the_day),
         (select count(*) from public.quizzes q where q.quiz_of_the_day_date = c.d and not q.is_quiz_of_the_day)), E'\n' order by c.d), ''))
  from dq_calls c;
insert into dq_out
select 'md5 counters', md5(
         ((select total_quizzes_created from public.profiles where id = '00000000-0000-0000-0000-000000000001') - (select tqc from dq_base))::text || E'\n' ||
         coalesce((select string_agg(g.slug || ':' || (g.quiz_count - b.quiz_count), E'\n' order by g.slug)
                     from public.groups g join dq_gbase b on b.id = g.id), '') || E'\n' ||
         coalesce((select string_agg(e.event_type || ':' || coalesce(e.group_slug, '') || ':' || e.payload::text || ':' || e.site_id, E'\n' order by e.payload::text, e.group_slug)
                     from public.activity_events e where e.id > (select act_max from dq_base) and e.event_type = 'quiz_created'), ''));

insert into dq_out select 'HASH', md5(string_agg(v, '|' order by k)) from dq_out where k like 'md5 %';

select 'DQ ' || k || ' ' || v from dq_out order by (k = 'HASH'), k;

-- ---------------------------------------------------------------- part 2: a kpop and an anime daily on one date
select (to_regprocedure('public.ensure_daily_quiz_v2(date, text)') is not null) as has_v2 \gset
\if :has_v2

create temp table dq2 (name text, ok boolean);
create temp table dq2_ids (k text primary key, id uuid);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values (md5('dq-k1-anime-author')::uuid, 'authenticated', 'authenticated', 'dq-k1-anime@o1-scratch.invalid', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
insert into public.profiles (id, username, avatar_bg, avatar_text) values (md5('dq-k1-anime-author')::uuid, 'dq_k1_anime', '#222222', 'A');
insert into public.groups (name, slug, display_color, text_color, site_id) values
  ('Dq Anime Fallback', 'dq-k1-anime-fallback', '#111111', '#ffffff', 'anime'),
  ('Dq Anime Series', 'dq-k1-anime-series', '#111111', '#ffffff', 'anime');
update public.sites set system_user_id = md5('dq-k1-anime-author')::uuid, fallback_group_slug = 'dq-k1-anime-fallback' where id = 'anime';

-- date A: a kpop row and an anime row (the anime one with a group, category series_specific), kpop first
-- date B: the same with a bank row without a group on both sides, anime first
-- date C: an anime row only
insert into public.quiz_bank (id, title, group_id, quiz_type, difficulty, category, questions, scheduled_date, status, site_id)
select md5('dq2-' || k)::uuid, t, (select id from public.groups where slug = gs), 'multiple_choice', 'medium', cat,
       '[{"question":"Q1","options":["a","b"],"correct":0,"source":"s"},{"question":"Q2","options":["a","b"],"correct":1,"source":"s"},{"question":"Q3","options":["a","b"],"correct":0,"source":"s"}]'::jsonb,
       d, st, site
  from (values
    ('kpop-a',  'Dq2 kpop daily A', 'dq-k1-group-1',       'fun',             date '2032-02-01', 'scheduled', 'kpop'),
    ('anime-a', 'Dq2 anime daily A', 'dq-k1-anime-series', 'series_specific', date '2032-02-01', 'verified',  'anime'),
    ('kpop-b',  'Dq2 kpop daily B', null,                  'knowledge',       date '2032-02-02', 'scheduled', 'kpop'),
    ('anime-b', 'Dq2 anime daily B', null,                 'who_am_i',        date '2032-02-02', 'scheduled', 'anime'),
    ('anime-c', 'Dq2 anime daily C', 'dq-k1-anime-series', 'crossover',       date '2032-02-03', 'scheduled', 'anime')
  ) v(k, t, gs, cat, d, st, site);

insert into dq2_ids select 'kpop-a', public.ensure_daily_quiz('2032-02-01');
insert into dq2_ids select 'anime-a', public.ensure_daily_quiz_v2(date '2032-02-01', 'anime');
insert into dq2_ids select 'anime-b', public.ensure_daily_quiz_v2(date '2032-02-02', 'anime');
insert into dq2_ids select 'kpop-b', public.ensure_daily_quiz('2032-02-02');
insert into dq2_ids select 'kpop-c', public.ensure_daily_quiz('2032-02-03');
insert into dq2_ids select 'anime-c', public.ensure_daily_quiz_v2(date '2032-02-03', 'anime');
insert into dq2_ids select 'kpop-a2', public.ensure_daily_quiz_v2(date '2032-02-01', 'kpop');
insert into dq2_ids select 'anime-a2', public.ensure_daily_quiz_v2(date '2032-02-01', 'anime');
insert into dq2_ids select 'hub-a', public.ensure_daily_quiz_v2(date '2032-02-01', 'hub');
insert into dq2_ids select 'none-a', public.ensure_daily_quiz_v2(date '2032-02-01', 'nosuchsite');

insert into dq2 select 'both dailies published on 2032-02-01', (select id from dq2_ids where k = 'kpop-a') is not null and (select id from dq2_ids where k = 'anime-a') is not null
  and (select id from dq2_ids where k = 'kpop-a') <> (select id from dq2_ids where k = 'anime-a');
insert into dq2 select 'both dailies published on 2032-02-02 (anime first, no group)', (select id from dq2_ids where k = 'kpop-b') is not null and (select id from dq2_ids where k = 'anime-b') is not null
  and (select id from dq2_ids where k = 'kpop-b') <> (select id from dq2_ids where k = 'anime-b');
insert into dq2 select 'kpop has no bank row on 2032-02-03 (the anime row is not published as kpop)', (select id from dq2_ids where k = 'kpop-c') is null and (select id from dq2_ids where k = 'anime-c') is not null;
insert into dq2 select 'qotd_log holds 2 rows on 2032-02-01 (kpop and anime)', (select count(*) from public.qotd_log where featured_date = '2032-02-01') = 2
  and (select count(*) from public.qotd_log where featured_date = '2032-02-01' and site_id = 'kpop' and quiz_id = (select id from dq2_ids where k = 'kpop-a')) = 1
  and (select count(*) from public.qotd_log where featured_date = '2032-02-01' and site_id = 'anime' and quiz_id = (select id from dq2_ids where k = 'anime-a')) = 1;
insert into dq2 select 'qotd_log holds 2 rows on 2032-02-02', (select count(*) from public.qotd_log where featured_date = '2032-02-02') = 2;
insert into dq2 select 'qotd_log holds 1 row on 2032-02-03 (anime)', (select count(*) from public.qotd_log where featured_date = '2032-02-03') = 1
  and (select site_id from public.qotd_log where featured_date = '2032-02-03') = 'anime';
insert into dq2 select 'the kpop quiz was not unflagged by the anime call (one flagged quiz per site and date)',
  (select count(*) from public.quizzes where quiz_of_the_day_date = '2032-02-01' and is_quiz_of_the_day) = 2
  and (select count(*) from public.quizzes where quiz_of_the_day_date = '2032-02-01' and is_quiz_of_the_day and site_id = 'kpop') = 1
  and (select count(*) from public.quizzes where quiz_of_the_day_date = '2032-02-01' and is_quiz_of_the_day and site_id = 'anime') = 1
  and (select count(*) from public.quizzes where quiz_of_the_day_date = '2032-02-02' and is_quiz_of_the_day) = 2;
insert into dq2 select 'a second call returns the same quiz for each site',
  (select id from dq2_ids where k = 'kpop-a') = (select id from dq2_ids where k = 'kpop-a2')
  and (select id from dq2_ids where k = 'anime-a') = (select id from dq2_ids where k = 'anime-a2');
insert into dq2 select 'a site without a system author (hub) and an unknown site return null', (select id from dq2_ids where k = 'hub-a') is null and (select id from dq2_ids where k = 'none-a') is null;
insert into dq2 select 'anime quiz: site anime, the anime author, its series group, published, questions without source',
  exists (select 1 from public.quizzes q join public.groups g on g.id = q.group_id
           where q.id = (select id from dq2_ids where k = 'anime-a') and q.site_id = 'anime' and q.creator_id = md5('dq-k1-anime-author')::uuid
             and g.slug = 'dq-k1-anime-series' and g.site_id = 'anime' and q.status = 'published' and q.is_quiz_of_the_day
             and q.quiz_of_the_day_date = '2032-02-01' and not (q.questions::text like '%source%') and q.question_count = 3);
insert into dq2 select 'anime quiz without a bank group: the anime fallback group',
  exists (select 1 from public.quizzes q join public.groups g on g.id = q.group_id
           where q.id = (select id from dq2_ids where k = 'anime-b') and g.slug = 'dq-k1-anime-fallback' and q.site_id = 'anime');
insert into dq2 select 'kpop quiz: site kpop, the kpop system author, its own group or general-kpop',
  exists (select 1 from public.quizzes q join public.groups g on g.id = q.group_id
           where q.id = (select id from dq2_ids where k = 'kpop-a') and q.site_id = 'kpop' and q.creator_id = '00000000-0000-0000-0000-000000000001' and g.slug = 'dq-k1-group-1')
  and exists (select 1 from public.quizzes q join public.groups g on g.id = q.group_id
           where q.id = (select id from dq2_ids where k = 'kpop-b') and q.site_id = 'kpop' and g.slug = 'general-kpop');
insert into dq2 select 'both bank rows are published and point at their quiz',
  (select count(*) from public.quiz_bank b where b.id in (md5('dq2-kpop-a')::uuid, md5('dq2-anime-a')::uuid, md5('dq2-kpop-b')::uuid, md5('dq2-anime-b')::uuid, md5('dq2-anime-c')::uuid)
      and b.status = 'published' and b.published_quiz_id is not null) = 5
  and (select b.published_quiz_id from public.quiz_bank b where b.id = md5('dq2-anime-a')::uuid) = (select id from dq2_ids where k = 'anime-a');
insert into dq2 select 'the single-date keys are gone and the per-site indexes hold',
  not exists (select 1 from pg_constraint where conname in ('quiz_bank_scheduled_date_key', 'qotd_log_featured_date_key'))
  and (select count(*) from pg_index i join pg_class c on c.oid = i.indexrelid where c.relname in ('quiz_bank_site_date', 'qotd_log_site_date') and i.indisunique and i.indisvalid) = 2;
insert into dq2 values ('a second bank row for the same site and date is refused by quiz_bank_site_date', true);
do $$
begin
  begin
    insert into public.quiz_bank (title, category, questions, scheduled_date, status, site_id)
    values ('Dq2 clash', 'fun', '[1, 2, 3]'::jsonb, '2032-02-01', 'scheduled', 'anime');
    update dq2 set ok = false where name like 'a second bank row%';
  exception when unique_violation then
    null;
  end;
end $$;
-- grants: v2 is service_role only; the wrapper keeps today's ACL (service_role only, anon and authenticated closed)
insert into dq2 select 'ACL: ensure_daily_quiz_v2 service_role only; ensure_daily_quiz as today (service_role, closed to anon and authenticated)',
  has_function_privilege('service_role', 'public.ensure_daily_quiz_v2(date, text)', 'execute')
  and not has_function_privilege('anon', 'public.ensure_daily_quiz_v2(date, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.ensure_daily_quiz_v2(date, text)', 'execute')
  and has_function_privilege('service_role', 'public.ensure_daily_quiz(text)', 'execute')
  and not has_function_privilege('anon', 'public.ensure_daily_quiz(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.ensure_daily_quiz(text)', 'execute')
  and (select proacl::text from pg_proc where oid = 'public.ensure_daily_quiz(text)'::regprocedure) = '{postgres=X/postgres,service_role=X/postgres}'
  and (select proacl::text from pg_proc where oid = 'public.ensure_daily_quiz_v2(date, text)'::regprocedure) = '{postgres=X/postgres,service_role=X/postgres}';

select 'DQ2 ' || name || ' ' || case when ok then 'PASS' else 'FAIL' end from dq2 order by name;
select 'DQ2 total ' || count(*) || ' pass ' || count(*) filter (where ok) || ' fail ' || count(*) filter (where not ok) from dq2;

\endif

rollback;
