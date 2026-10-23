-- SEO Mission 3, part A (2026-10-15): exhaustive IndexNow. NOT APPLIED. Apply only on the
-- owner's go, as one run (the file is one transaction). Rollback: seo-indexnow-rollback.sql.
-- Until it is applied, the app keeps today's behaviour: the publish fast path pings IndexNow
-- directly and the post-deploy route resubmits the sitemap (code in apps/quiz fails soft).
--
-- What it adds
--   seo_indexnow_outbox   the URLs to tell IndexNow about. One pending row per URL (a unique
--                         index on the pending rows), so a bulk import of 4,000 songs leaves
--                         one row per page, never 4,000.
--   seo_url_state         one row per URL the system knows: its content fingerprint, whether it
--                         is indexable and in the sitemap, when it last changed, when it was last
--                         submitted.
--   seo_indexnow_events   what each run did (flush, reconcile, deploy diff, key check), the
--                         alerts (IndexNow 400, 403 or 422, a wrong key file, a give-up) and the
--                         429 back-off.
--   triggers              on quizzes, groups, songs (the blind test playlists), trivia (the stored
--                         facts) and pulse_reports. A write from the app, the admin, a SQL restore
--                         or an import puts the pages it changes in the outbox.
--
-- Who can read and write: the server only (service role). RLS is on with no policy and anon
-- and authenticated have no grant, so nothing here is readable from a browser. The trigger
-- functions are SECURITY DEFINER so that a write made with a signed-in user's own client still
-- enqueues; the helper functions can be called by the service role only.
--
-- Safety
--   - A trigger never blocks the write that fired it: its body catches every error and raises
--     a WARNING instead.
--   - Counter updates never fire a trigger (plays, likes, report_count, song play_count, group
--     quiz_count and total_plays, difficulty recomputed from plays): each trigger lists its
--     columns (UPDATE OF ...) and a WHEN clause compares the old and new values.
--   - A draft, flagged or removed quiz that changes enqueues nothing.
--
-- Read in the catalogue on 2026-10-15 (SELECT only): quizzes, groups, songs, trivia,
-- pulse_reports exist. There is no playlists table: a group's blind test playlist
-- (/blindtest/group-<slug>) is built from songs. The facts stored in a table are trivia
-- (status 'published', with source_url). The group trivia page itself is derived from the fun
-- facts of published quizzes, so a quiz question edit enqueues it.
--
-- URLs enqueued (paths on https://kpopquiz.org)
--   quiz published, removed, moved   /q/<slug>, its hub /<group>-quiz, /new, its trivia page*
--   quiz edited (title, creator note, questions)
--                                    /q/<slug>; title: + hub, + /new when among the 10 newest;
--                                    questions: + trivia page*
--   group edited                     hub (when it has a published quiz), trivia*, blind test*,
--                                    which member*, name them all*; name or slug: + /groups and
--                                    every published /q of the group; slug: the old URLs too
--   song added, removed, edited      /blindtest/group-<slug>* (old and new group)
--   trivia fact (published) changed  the group's hub* and trivia page*
--   pulse report changed             /data/pulse/<month>, /data/pulse
--   * only when the URL is known in seo_url_state (it was in the sitemap or was submitted), so
--     a group with no trivia page never sends one. The nightly reconciliation adds a page the
--     first time it enters the sitemap. Before the first reconciliation (empty state) every
--     URL counts as known.
-- Localized equivalents: none exists today for /q/<slug>, the hubs, trivia pages, blind test
-- group pages or /new (the /pt, /fr, /es and /id pages are site level; lib/growth/sitemap-v12.ts
-- says the same of the growth pages). When one appears, add it to seo_indexnow_group_paths.
--
-- The trivia mapping, honestly: today the hub and trivia pages do not render the trivia table
-- (its facts show in the rotating "Did you know" card of quiz pages, which the fingerprint
-- ignores on purpose). They are the pages where verified facts belong (rulebook 5.5), so a
-- fact edit enqueues them; facts are edited by hand and rarely. To send nothing for facts until
-- a page shows them, drop trigger seo_indexnow_trivia (and seo_indexnow_trivia_ins_del).

begin;

-- 1. Tables ------------------------------------------------------------------------------

create table if not exists public.seo_indexnow_outbox (
  id               bigint generated always as identity primary key,
  url              text        not null check (url ~ '^https://kpopquiz\.org/'),
  reason           text        not null check (length(reason) between 1 and 80),
  enqueued_at      timestamptz not null default now(),
  last_enqueued_at timestamptz not null default now(),
  submitted_at     timestamptz,
  status_code      integer,
  attempts         integer     not null default 0 check (attempts >= 0),
  last_attempt_at  timestamptz,
  outcome          text check (outcome in ('submitted', 'covered', 'gave_up'))
);
comment on table public.seo_indexnow_outbox is
  'IndexNow outbox (SEO Mission 3). Pending = outcome is null. submitted: sent and answered 200/202. covered: a submission of the same URL made after its last enqueue already told IndexNow. gave_up: failed 24 times. status_code: last IndexNow answer (0 = network error).';

-- one pending row per URL: enqueueing is idempotent
create unique index if not exists seo_indexnow_outbox_one_pending
  on public.seo_indexnow_outbox (url) where outcome is null;
create index if not exists seo_indexnow_outbox_pending_age
  on public.seo_indexnow_outbox (enqueued_at, id) where outcome is null;
create index if not exists seo_indexnow_outbox_recent
  on public.seo_indexnow_outbox (enqueued_at desc);
create index if not exists seo_indexnow_outbox_submitted
  on public.seo_indexnow_outbox (submitted_at desc) where submitted_at is not null;

create table if not exists public.seo_url_state (
  url               text primary key check (url ~ '^https://kpopquiz\.org/'),
  hash              text,
  indexable         boolean,
  last_changed_at   timestamptz,
  last_submitted_at timestamptz,
  last_checked_at   timestamptz,
  http_status       integer,
  in_sitemap        boolean not null default false,
  scope             text check (scope in ('code', 'data'))
);
comment on table public.seo_url_state is
  'One row per URL known to the IndexNow system (SEO Mission 3). hash: content fingerprint (lib/seo/indexnow-fingerprint.ts). scope: code (pages defined in the code) or data (quiz, group, blind test group, pulse month, verse pages).';
create index if not exists seo_url_state_checked on public.seo_url_state (last_checked_at nulls first);

create table if not exists public.seo_indexnow_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('flush', 'alert', 'backoff', 'reconcile', 'deploy_diff', 'keycheck')),
  status_code integer,
  detail      jsonb not null default '{}'::jsonb
);
comment on table public.seo_indexnow_events is
  'IndexNow runs and alerts (SEO Mission 3). alert rows: IndexNow 400/403/422, key file wrong, URLs given up. backoff rows: detail.until and detail.consecutive after a 429.';
create index if not exists seo_indexnow_events_kind_time on public.seo_indexnow_events (kind, created_at desc);

-- 2. Access: server only -----------------------------------------------------------------

alter table public.seo_indexnow_outbox enable row level security;
alter table public.seo_url_state       enable row level security;
alter table public.seo_indexnow_events enable row level security;

revoke all on table public.seo_indexnow_outbox, public.seo_url_state, public.seo_indexnow_events
  from public, anon, authenticated;
grant select, insert, update, delete on table public.seo_indexnow_outbox, public.seo_url_state, public.seo_indexnow_events
  to service_role;

-- 3. Helpers -----------------------------------------------------------------------------

-- Put paths in the outbox. p_only_known: keep only the URLs already known in seo_url_state
-- (every URL counts as known while the state is empty). Returns the number of rows written.
-- A path already pending is not duplicated: its last_enqueued_at moves forward instead (once
-- per transaction, so a bulk statement rewrites nothing).
create or replace function public.seo_indexnow_enqueue(p_paths text[], p_reason text, p_only_known boolean default false)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
  state_empty boolean := false;
begin
  if p_paths is null or cardinality(p_paths) = 0 then
    return 0;
  end if;
  if p_only_known then
    select not exists (select 1 from public.seo_url_state) into state_empty;
  end if;
  insert into public.seo_indexnow_outbox as o (url, reason)
  select distinct 'https://kpopquiz.org' || t.p, left(coalesce(nullif(p_reason, ''), 'unknown'), 80)
  from unnest(p_paths) as t(p)
  where t.p is not null
    and t.p ~ '^/[A-Za-z0-9._~%/-]*$'
    and (not p_only_known
         or state_empty
         or exists (select 1 from public.seo_url_state s where s.url = 'https://kpopquiz.org' || t.p))
  on conflict (url) where outcome is null
  do update set last_enqueued_at = excluded.last_enqueued_at
  where o.last_enqueued_at < excluded.last_enqueued_at;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- The pages of one group, by kind: hub, trivia, blindtest, which, nameall.
create or replace function public.seo_indexnow_group_paths(p_slug text, p_kinds text[])
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(x.p) filter (where x.p is not null), '{}'::text[])
  from (values
    (case when p_slug is not null and 'hub'       = any(p_kinds) then '/' || p_slug || '-quiz' end),
    (case when p_slug is not null and 'trivia'    = any(p_kinds) then '/' || p_slug || '-trivia' end),
    (case when p_slug is not null and 'blindtest' = any(p_kinds) then '/blindtest/group-' || p_slug end),
    (case when p_slug is not null and 'which'     = any(p_kinds) then '/which-' || p_slug || '-member-are-you' end),
    (case when p_slug is not null and 'nameall'   = any(p_kinds) then '/' || p_slug || '-name-all-members' end)
  ) as x(p)
$$;

-- One flush attempt on outbox rows: attempts + 1, the IndexNow status, and when it succeeded
-- the outcome and the URL's last_submitted_at.
create or replace function public.seo_indexnow_record_attempt(p_ids bigint[], p_status integer, p_ok boolean, p_at timestamptz)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  update public.seo_indexnow_outbox o
     set attempts        = o.attempts + 1,
         last_attempt_at = now(),
         status_code     = p_status,
         outcome         = case when p_ok then 'submitted' else o.outcome end,
         submitted_at    = case when p_ok then p_at else o.submitted_at end
   where o.id = any(p_ids)
     and o.outcome is null;
  get diagnostics n = row_count;
  if p_ok then
    insert into public.seo_url_state as s (url, last_submitted_at)
    select distinct o.url, p_at from public.seo_indexnow_outbox o where o.id = any(p_ids)
    on conflict (url) do update
      set last_submitted_at = greatest(s.last_submitted_at, excluded.last_submitted_at);
  end if;
  return n;
end;
$$;

-- The publish fast path sent these URLs at p_at and IndexNow answered 200/202: the pending
-- rows enqueued before p_at are done, and the URLs' last_submitted_at moves.
create or replace function public.seo_indexnow_mark_submitted(p_urls text[], p_status integer, p_at timestamptz)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  update public.seo_indexnow_outbox o
     set outcome         = 'submitted',
         submitted_at    = p_at,
         status_code     = p_status,
         attempts        = o.attempts + 1,
         last_attempt_at = now()
   where o.url = any(p_urls)
     and o.outcome is null
     and o.last_enqueued_at <= p_at;
  get diagnostics n = row_count;
  insert into public.seo_url_state as s (url, last_submitted_at)
  select distinct u, p_at from unnest(p_urls) as t(u)
  where u ~ '^https://kpopquiz\.org/'
  on conflict (url) do update
    set last_submitted_at = greatest(s.last_submitted_at, excluded.last_submitted_at);
  return n;
end;
$$;

revoke all on function public.seo_indexnow_enqueue(text[], text, boolean) from public, anon, authenticated;
revoke all on function public.seo_indexnow_group_paths(text, text[]) from public, anon, authenticated;
revoke all on function public.seo_indexnow_record_attempt(bigint[], integer, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.seo_indexnow_mark_submitted(text[], integer, timestamptz) from public, anon, authenticated;
grant execute on function public.seo_indexnow_enqueue(text[], text, boolean) to service_role;
grant execute on function public.seo_indexnow_group_paths(text, text[]) to service_role;
grant execute on function public.seo_indexnow_record_attempt(bigint[], integer, boolean, timestamptz) to service_role;
grant execute on function public.seo_indexnow_mark_submitted(text[], integer, timestamptz) to service_role;

-- 4. Triggers ----------------------------------------------------------------------------

-- quizzes: status, title, creator note (the description), questions, slug, group.
create or replace function public.seo_indexnow_on_quiz()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  was_pub boolean := false;
  is_pub  boolean := false;
  old_g   text;
  new_g   text;
  must    text[] := '{}';
  known   text[] := '{}';
  why     text;
begin
  begin
    if tg_op <> 'INSERT' then was_pub := coalesce(old.status = 'published', false); end if;
    if tg_op <> 'DELETE' then is_pub  := coalesce(new.status = 'published', false); end if;
    if not was_pub and not is_pub then
      return null; -- a draft, flagged or removed quiz: not on the site, before or after
    end if;
    if was_pub then select g.slug into old_g from public.groups g where g.id = old.group_id; end if;
    if is_pub  then select g.slug into new_g from public.groups g where g.id = new.group_id; end if;

    if was_pub <> is_pub
       or (tg_op = 'UPDATE' and (old.slug is distinct from new.slug or old.group_id is distinct from new.group_id)) then
      -- it appears, goes or moves: every page that lists it, before and after
      why := case when is_pub and not was_pub then 'quiz:published'
                  when was_pub and not is_pub then 'quiz:removed'
                  else 'quiz:moved' end;
      if was_pub then
        must  := must || ('/q/' || old.slug) || public.seo_indexnow_group_paths(old_g, array['hub']);
        known := known || public.seo_indexnow_group_paths(old_g, array['trivia']);
      end if;
      if is_pub then
        must  := must || ('/q/' || new.slug) || public.seo_indexnow_group_paths(new_g, array['hub']);
        known := known || public.seo_indexnow_group_paths(new_g, array['trivia']);
      end if;
      must := must || '/new'::text;
    else
      why  := 'quiz:edited';
      must := array['/q/' || new.slug];
      if old.title is distinct from new.title then
        must := must || public.seo_indexnow_group_paths(new_g, array['hub']);
        -- /new renders the 10 newest published quizzes
        if (select count(*) from public.quizzes q where q.status = 'published' and q.created_at > new.created_at) < 10 then
          must := must || '/new'::text;
        end if;
      end if;
      if old.questions is distinct from new.questions then
        known := known || public.seo_indexnow_group_paths(new_g, array['trivia']);
      end if;
    end if;

    perform public.seo_indexnow_enqueue(must, why, false);
    perform public.seo_indexnow_enqueue(known, why, true);
  exception when others then
    raise warning '[seo_indexnow] quiz trigger skipped: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists seo_indexnow_quiz_ins_del on public.quizzes;
create trigger seo_indexnow_quiz_ins_del
  after insert or delete on public.quizzes
  for each row execute function public.seo_indexnow_on_quiz();

drop trigger if exists seo_indexnow_quiz on public.quizzes;
create trigger seo_indexnow_quiz
  after update of status, title, slug, group_id, questions, settings on public.quizzes
  for each row
  when (old.status is distinct from new.status
     or old.title is distinct from new.title
     or old.slug is distinct from new.slug
     or old.group_id is distinct from new.group_id
     or old.questions is distinct from new.questions
     or (old.settings ->> 'creator_note') is distinct from (new.settings ->> 'creator_note'))
  execute function public.seo_indexnow_on_quiz();

-- groups: what the hub, trivia, blind test, which member and name them all pages show.
create or replace function public.seo_indexnow_on_group()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  opt_kinds constant text[] := array['trivia', 'blindtest', 'which', 'nameall'];
  must    text[] := '{}';
  known   text[] := '{}';
  why     text;
  has_pub boolean;
begin
  begin
    if tg_op = 'DELETE' then
      why   := 'group:removed';
      known := public.seo_indexnow_group_paths(old.slug, array['hub'] || opt_kinds);
      must  := array['/groups'];
    else
      why := 'group:edited';
      select exists (select 1 from public.quizzes q where q.group_id = new.id and q.status = 'published') into has_pub;
      if has_pub then
        must := public.seo_indexnow_group_paths(new.slug, array['hub']);
      end if;
      known := public.seo_indexnow_group_paths(new.slug, opt_kinds);
      if old.slug is distinct from new.slug then
        why   := 'group:slug';
        known := known || public.seo_indexnow_group_paths(old.slug, array['hub'] || opt_kinds);
      end if;
      if old.name is distinct from new.name or old.slug is distinct from new.slug then
        -- the name is in the title and breadcrumb of every quiz of the group, and in /groups
        must := must || '/groups'::text
             || coalesce((select array_agg('/q/' || q.slug) from public.quizzes q
                          where q.group_id = new.id and q.status = 'published'), '{}'::text[]);
      end if;
    end if;
    perform public.seo_indexnow_enqueue(must, why, false);
    perform public.seo_indexnow_enqueue(known, why, true);
  exception when others then
    raise warning '[seo_indexnow] group trigger skipped: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists seo_indexnow_group_del on public.groups;
create trigger seo_indexnow_group_del
  after delete on public.groups
  for each row execute function public.seo_indexnow_on_group();

drop trigger if exists seo_indexnow_group on public.groups;
create trigger seo_indexnow_group
  after update of name, slug, fandom_name, seo_intro, logo_url, generation, record_label,
                  official_website, inception_date, origin_country, wikidata_qid, musicbrainz_mbid
  on public.groups
  for each row
  when ((old.name, old.slug, old.fandom_name, old.seo_intro, old.logo_url, old.generation, old.record_label,
         old.official_website, old.inception_date, old.origin_country, old.wikidata_qid, old.musicbrainz_mbid)
        is distinct from
        (new.name, new.slug, new.fandom_name, new.seo_intro, new.logo_url, new.generation, new.record_label,
         new.official_website, new.inception_date, new.origin_country, new.wikidata_qid, new.musicbrainz_mbid))
  execute function public.seo_indexnow_on_group();

-- songs: a group's blind test playlist page lists its songs (title, album, year).
create or replace function public.seo_indexnow_on_song()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  known text[] := '{}';
  g     text;
begin
  begin
    for g in
      select distinct gr.slug from public.groups gr
      where gr.id in (case when tg_op <> 'INSERT' then old.group_id end,
                      case when tg_op <> 'DELETE' then new.group_id end)
    loop
      known := known || public.seo_indexnow_group_paths(g, array['blindtest']);
    end loop;
    perform public.seo_indexnow_enqueue(known, 'song:' || lower(tg_op), true);
  exception when others then
    raise warning '[seo_indexnow] song trigger skipped: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists seo_indexnow_song_ins_del on public.songs;
create trigger seo_indexnow_song_ins_del
  after insert or delete on public.songs
  for each row execute function public.seo_indexnow_on_song();

drop trigger if exists seo_indexnow_song on public.songs;
create trigger seo_indexnow_song
  after update of title, artist_name, album_name, year, status, group_id, is_curated, preview_url on public.songs
  for each row
  when ((old.title, old.artist_name, old.album_name, old.year, old.status, old.group_id, old.is_curated, old.preview_url)
        is distinct from
        (new.title, new.artist_name, new.album_name, new.year, new.status, new.group_id, new.is_curated, new.preview_url))
  execute function public.seo_indexnow_on_song();

-- trivia: the stored, sourced facts of a group (published rows only).
create or replace function public.seo_indexnow_on_trivia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  known text[] := '{}';
  g     text;
begin
  begin
    if not ((tg_op <> 'INSERT' and old.status = 'published') or (tg_op <> 'DELETE' and new.status = 'published')) then
      return null;
    end if;
    for g in
      select distinct gr.slug from public.groups gr
      where gr.id in (case when tg_op <> 'INSERT' then old.group_id end,
                      case when tg_op <> 'DELETE' then new.group_id end)
    loop
      known := known || public.seo_indexnow_group_paths(g, array['hub', 'trivia']);
    end loop;
    perform public.seo_indexnow_enqueue(known, 'fact:' || lower(tg_op), true);
  exception when others then
    raise warning '[seo_indexnow] trivia trigger skipped: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists seo_indexnow_trivia_ins_del on public.trivia;
create trigger seo_indexnow_trivia_ins_del
  after insert or delete on public.trivia
  for each row execute function public.seo_indexnow_on_trivia();

drop trigger if exists seo_indexnow_trivia on public.trivia;
create trigger seo_indexnow_trivia
  after update of fact, category, status, group_id, source_url on public.trivia
  for each row
  when ((old.fact, old.category, old.status, old.group_id, old.source_url)
        is distinct from
        (new.fact, new.category, new.status, new.group_id, new.source_url))
  execute function public.seo_indexnow_on_trivia();

-- pulse_reports: one page per month, plus the index.
create or replace function public.seo_indexnow_on_pulse()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  must text[] := array['/data/pulse'];
begin
  begin
    if tg_op <> 'INSERT' and old.month ~ '^\d{4}-\d{2}$' then must := must || ('/data/pulse/' || old.month); end if;
    if tg_op <> 'DELETE' and new.month ~ '^\d{4}-\d{2}$' then must := must || ('/data/pulse/' || new.month); end if;
    perform public.seo_indexnow_enqueue(must, 'pulse:' || lower(tg_op), false);
  exception when others then
    raise warning '[seo_indexnow] pulse trigger skipped: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists seo_indexnow_pulse_ins_del on public.pulse_reports;
create trigger seo_indexnow_pulse_ins_del
  after insert or delete on public.pulse_reports
  for each row execute function public.seo_indexnow_on_pulse();

drop trigger if exists seo_indexnow_pulse on public.pulse_reports;
create trigger seo_indexnow_pulse
  after update of month, payload on public.pulse_reports
  for each row
  when (old.month is distinct from new.month or old.payload is distinct from new.payload)
  execute function public.seo_indexnow_on_pulse();

-- Trigger functions are not callable as RPC (they return trigger), but keep them closed anyway.
revoke all on function public.seo_indexnow_on_quiz()   from public, anon, authenticated;
revoke all on function public.seo_indexnow_on_group()  from public, anon, authenticated;
revoke all on function public.seo_indexnow_on_song()   from public, anon, authenticated;
revoke all on function public.seo_indexnow_on_trivia() from public, anon, authenticated;
revoke all on function public.seo_indexnow_on_pulse()  from public, anon, authenticated;

commit;

-- After applying, read-only checks:
--   select count(*) from public.seo_indexnow_outbox;                         -- 0
--   select relrowsecurity from pg_class where relname like 'seo_%';           -- all true
--   select tgname from pg_trigger where tgname like 'seo_indexnow%' order by 1; -- 10 triggers
