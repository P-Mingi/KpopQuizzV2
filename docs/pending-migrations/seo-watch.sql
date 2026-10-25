-- SEO Mission 3, part D (2026-10-15): monitoring. NOT APPLIED. Apply only on the owner's go,
-- as one run (the file is one transaction). Rollback: seo-watch-rollback.sql.
-- Until it is applied the app keeps working: every read and write below is fail soft in the
-- code (apps/quiz/src/lib/seo/watch/*, apps/quiz/src/lib/seo/slug-redirects.ts), the crons run
-- and alert without logging their runs, and AI assistant visits are simply not counted.
--
-- What it adds
--   seo_slug_redirects    old slug -> new slug, for quizzes and groups. Filled by two triggers
--                         (a slug UPDATE on quizzes or groups, from the app, the admin, a SQL
--                         restore or an import) and by seo_record_slug_redirect() (the admin
--                         group merge, where the old group row is deleted). Read by /q/<slug>,
--                         /<group>-quiz, /<group>-trivia and /blindtest/group-<slug> when no live
--                         row has the slug: they answer a permanent redirect to the new URL
--                         instead of a 404. Chains are collapsed when written (A->B then B->C
--                         leaves A->C and B->C), so a redirect is always one hop.
--   seo_ai_visits_daily   visits that came from an AI assistant (chatgpt.com, perplexity.ai,
--                         copilot.microsoft.com, gemini.google.com), by UTC day, assistant and
--                         landing path. Written by seo_ai_visit_hit() from the middleware. No IP,
--                         no user id, no user agent, no cookie: a counter per (day, source, path).
--   seo_linked_urls       URLs that earned a link, beyond the versioned list in the code
--                         (apps/quiz/src/lib/seo/watch/linked-urls.ts). Empty at first; the
--                         weekly link data (Mission 3 part C) or the owner adds rows. The nightly
--                         guard checks both.
--   seo_watch_runs        one row per monitoring run that found something (linked-URL guard,
--                         source check, play spike), for /admin/ai-visibility and the Monday
--                         e-mail. Kept 180 days.
--
-- Who can read and write
--   seo_slug_redirects: everyone may READ (old and new slugs are public URLs; the ISR pages read
--   it with the anon key); nobody but the service role and the triggers may write.
--   The three other tables: the server only (service role). RLS on, no policy, no grant to
--   anon or authenticated.
--
-- Safety
--   - A trigger never blocks the write that fired it: its body catches every error and raises a
--     WARNING instead.
--   - The triggers fire only when the slug really changes (UPDATE OF slug ... WHEN old <> new).
--   - seo_ai_visit_hit() accepts only the four known sources and a short, plain path.
--
-- Read in the catalogue on 2026-10-15 (SELECT only): quizzes.slug is unique with the check
-- ^[a-z0-9-]{1,80}$, groups.slug unique with ^[a-z0-9-]{1,60}$. Existing triggers on quizzes:
-- group_quiz_alerts_on_insert, group_quiz_alerts_on_publish, on_quiz_insert; none on groups.
-- No slug history existed before this file. The app never changes a quiz slug (the edit routes
-- keep it); a group slug can change through the admin approve route, and the admin merge
-- deletes a group whose quizzes move to another (that one is recorded by the route).

begin;

-- 1. Slug history --------------------------------------------------------------------------

create table if not exists public.seo_slug_redirects (
  kind       text        not null check (kind in ('quiz', 'group')),
  old_slug   text        not null check (old_slug ~ '^[a-z0-9-]{1,80}$'),
  new_slug   text        not null check (new_slug ~ '^[a-z0-9-]{1,80}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, old_slug),
  check (old_slug <> new_slug)
);
comment on table public.seo_slug_redirects is
  'Permanent redirects for renamed quiz and group slugs (SEO Mission 3 part D). One hop: chains are collapsed on write. Consulted only when no live row has the slug.';
create index if not exists seo_slug_redirects_target on public.seo_slug_redirects (kind, new_slug);

alter table public.seo_slug_redirects enable row level security;
revoke all on table public.seo_slug_redirects from public, anon, authenticated;
grant select on table public.seo_slug_redirects to anon, authenticated;
grant select, insert, update, delete on table public.seo_slug_redirects to service_role;
drop policy if exists seo_slug_redirects_read on public.seo_slug_redirects;
create policy seo_slug_redirects_read on public.seo_slug_redirects
  for select to anon, authenticated using (true);

-- Write one mapping and keep every redirect one hop long.
create or replace function public.seo_slug_redirect_put(p_kind text, p_old text, p_new text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_kind not in ('quiz', 'group') or p_old is null or p_new is null or p_old = p_new then
    return;
  end if;
  -- the new slug is live: nothing redirects away from it. First, so that the next statement
  -- can never write a self loop (B->A then A->B would leave B->B).
  delete from public.seo_slug_redirects where kind = p_kind and old_slug = p_new;
  -- whatever pointed at the old slug now points at the new one
  update public.seo_slug_redirects
     set new_slug = p_new, updated_at = now()
   where kind = p_kind and new_slug = p_old;
  insert into public.seo_slug_redirects (kind, old_slug, new_slug)
  values (p_kind, p_old, p_new)
  on conflict (kind, old_slug) do update set new_slug = excluded.new_slug, updated_at = now();
end;
$$;

-- For a route that removes a slug without an UPDATE (the admin group merge deletes the old row).
create or replace function public.seo_record_slug_redirect(p_kind text, p_old text, p_new text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.seo_slug_redirect_put(p_kind, p_old, p_new);
end;
$$;

create or replace function public.seo_slug_on_quiz()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    perform public.seo_slug_redirect_put('quiz', old.slug, new.slug);
  exception when others then
    raise warning 'seo_slug_on_quiz: % (%), the slug change itself is kept', sqlerrm, sqlstate;
  end;
  return new;
end;
$$;

create or replace function public.seo_slug_on_group()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    perform public.seo_slug_redirect_put('group', old.slug, new.slug);
  exception when others then
    raise warning 'seo_slug_on_group: % (%), the slug change itself is kept', sqlerrm, sqlstate;
  end;
  return new;
end;
$$;

drop trigger if exists seo_slug_redirect_on_quiz on public.quizzes;
create trigger seo_slug_redirect_on_quiz
  after update of slug on public.quizzes
  for each row when (old.slug is distinct from new.slug)
  execute function public.seo_slug_on_quiz();

drop trigger if exists seo_slug_redirect_on_group on public.groups;
create trigger seo_slug_redirect_on_group
  after update of slug on public.groups
  for each row when (old.slug is distinct from new.slug)
  execute function public.seo_slug_on_group();

-- 2. AI assistant visits -------------------------------------------------------------------

create table if not exists public.seo_ai_visits_daily (
  day    date    not null,
  source text    not null check (source in ('chatgpt', 'perplexity', 'copilot', 'gemini')),
  path   text    not null check (path ~ '^/[A-Za-z0-9._~%/-]{0,199}$'),
  visits integer not null default 0 check (visits >= 0),
  primary key (day, source, path)
);
comment on table public.seo_ai_visits_daily is
  'Visits whose referrer (or utm_source) is an AI assistant, per UTC day, assistant and landing path (SEO Mission 3 part D). No personal data: no IP, user id, user agent or cookie.';

alter table public.seo_ai_visits_daily enable row level security;
revoke all on table public.seo_ai_visits_daily from public, anon, authenticated;
grant select, insert, update, delete on table public.seo_ai_visits_daily to service_role;

create or replace function public.seo_ai_visit_hit(p_source text, p_path text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_source not in ('chatgpt', 'perplexity', 'copilot', 'gemini')
     or p_path is null or p_path !~ '^/[A-Za-z0-9._~%/-]{0,199}$' then
    return;
  end if;
  insert into public.seo_ai_visits_daily as v (day, source, path, visits)
  values ((now() at time zone 'utc')::date, p_source, p_path, 1)
  on conflict (day, source, path) do update set visits = v.visits + 1;
end;
$$;

-- 3. Linked URLs fed by link data ----------------------------------------------------------

create table if not exists public.seo_linked_urls (
  path            text        primary key check (path ~ '^/[A-Za-z0-9._~%/?=&-]{0,250}$'),
  source          text        not null check (length(source) between 1 and 200),
  first_seen      date        not null default (now() at time zone 'utc')::date,
  expect_redirect text        check (expect_redirect is null or expect_redirect ~ '^/[A-Za-z0-9._~%/?=&-]{0,250}$'),
  added_at        timestamptz not null default now()
);
comment on table public.seo_linked_urls is
  'URLs that earned a link, added from link data (SEO Mission 3 part D, rulebook 13.5). expect_redirect: the exact 301 target when the URL is kept as a redirect; null = must answer 200 and be indexable.';

alter table public.seo_linked_urls enable row level security;
revoke all on table public.seo_linked_urls from public, anon, authenticated;
grant select, insert, update, delete on table public.seo_linked_urls to service_role;

-- 4. Monitoring runs -----------------------------------------------------------------------

create table if not exists public.seo_watch_runs (
  id      bigint generated always as identity primary key,
  ran_at  timestamptz not null default now(),
  kind    text        not null check (kind in ('linked_urls', 'sources', 'spikes')),
  ok      boolean     not null,
  summary text        not null check (length(summary) between 1 and 500),
  detail  jsonb       not null default '{}'::jsonb
);
comment on table public.seo_watch_runs is
  'Monitoring runs (SEO Mission 3 part D): nightly linked-URL guard, monthly source check, hourly play spikes (only runs that found something). Kept 180 days.';
create index if not exists seo_watch_runs_kind_time on public.seo_watch_runs (kind, ran_at desc);

alter table public.seo_watch_runs enable row level security;
revoke all on table public.seo_watch_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.seo_watch_runs to service_role;

-- 5. Function grants -----------------------------------------------------------------------

revoke all on function public.seo_slug_redirect_put(text, text, text)    from public, anon, authenticated;
revoke all on function public.seo_record_slug_redirect(text, text, text) from public, anon, authenticated;
revoke all on function public.seo_slug_on_quiz()                         from public, anon, authenticated;
revoke all on function public.seo_slug_on_group()                        from public, anon, authenticated;
revoke all on function public.seo_ai_visit_hit(text, text)               from public, anon, authenticated;
grant execute on function public.seo_record_slug_redirect(text, text, text) to service_role;
grant execute on function public.seo_ai_visit_hit(text, text)               to service_role;

commit;
