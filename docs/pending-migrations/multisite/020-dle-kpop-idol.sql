-- 020-dle-kpop-idol.sql (run O1, daily games step 1 "socle invisible", owner brief of 2026-10-29; RAPPORT-JEUX-DU-JOUR-v2.md 5.1)
--
-- What:   the view dle_src_kpop_idol (the facts of public.idols and public.groups as the 8 columns of Kpopdle Idol) and the
--         game row kpopdle-idol with its columns, switched off (active false, no epoch, no bank). Nothing is shown to players.
--         The view:
--         - reads the real columns idols.name, name_romanized and name_hangul (the name and the search names);
--         - keeps adults only: an idol with no birth date, or under 18 on the day of the snapshot, is not in the game at all;
--         - never reads height_cm, mbti or blood_type;
--         - gives a picture only when entity_images (site kpop, kind idol, slug = the idol id) has license_verified and a
--           96 px thumb_path; otherwise null and the client shows the initials;
--         - reads idols.gender and idols.debut_year through to_jsonb(row), because lot K1 adds those two columns: until then
--           both read null, so no idol is complete and none can be a target (dle_activate then fails: pool too small).
--         Columns: gender (single), group (multi, near: same parent group, for a sub-unit), agency (single, groups.record_label;
--         near needs the mother companies of the agencies table of step 2), nationality (multi), birth year (number, near 2),
--         debut year (number, near 1), generation (ordinal: groups.generation, else the published rule on the debut year of
--         the group: 1st <= 2002, 2nd 2003-2011, 3rd 2012-2017, 4th 2018-2022, 5th >= 2023), role (single: leader, maknae,
--         none). Hints after 5, 8 and 12 errors: fandom, debut song (no verified source yet: never unlocked), initial.
-- Why:    the first game of the Terrier (step 4 switches it on).
-- Rows:   1 dle_games row, 8 dle_attributes rows.
-- Needs:  019-dle-core.sql.
-- Verify: select id, active, epoch from public.dle_games;   expect kpopdle-idol, f, null
--         select count(*) from public.dle_attributes where game_id = 'kpopdle-idol';   expect 8
--         select has_table_privilege('anon', 'public.dle_src_kpop_idol', 'select'), has_table_privilege('authenticated', 'public.dle_src_kpop_idol', 'select');   expect f, f
--         select count(*) from public.dle_src_kpop_idol;   expect the adult active idols (dle-smoke.sql)
-- Undo:   020-dle-kpop-idol.rollback.sql (refused once the game has a play).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regprocedure('public.dle_build_bank(text, date, double precision)') is null then
    raise exception '020-dle-kpop-idol: the dle engine is missing (apply 019 first)';
  end if;
end $$;

create or replace view public.dle_src_kpop_idol with (security_invoker = true) as
with idol as (
  select i.id, i.group_id, i.unit_id, i.name, i.name_romanized, i.name_hangul, i.birth_date, i.nationality, i.positions,
    lower(nullif(btrim(to_jsonb(i) ->> 'gender'), '')) as gender,
    case when (to_jsonb(i) ->> 'debut_year') ~ '^[0-9]{4}$' then (to_jsonb(i) ->> 'debut_year')::integer end as debut_year
  from public.idols i
  where i.active and not i.needs_review and i.detached_at is null
    and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date
)
select
  i.id::text as entity_id,
  i.name,
  array(select distinct n from unnest(array[i.name, i.name_romanized, i.name_hangul]) as n where nullif(btrim(n), '') is not null) as search,
  jsonb_build_object(
    'gender', jsonb_build_object('v', case when i.gender in ('female', 'male') then i.gender end),
    'group', jsonb_build_object('v', jsonb_build_array(coalesce(u.name, g.name)), 'p', jsonb_build_array(g.name)),
    'agency', jsonb_build_object('v', jsonb_build_array(nullif(btrim(g.record_label), ''))),
    'nationality', jsonb_build_object('v', to_jsonb(coalesce(regexp_split_to_array(nullif(btrim(i.nationality), ''), '\s*[,;/]\s*'), '{}'::text[]))),
    'birth', jsonb_build_object('v', extract(year from i.birth_date)::integer),
    'debut', jsonb_build_object('v', i.debut_year),
    'generation', jsonb_build_object('v', coalesce(
      substring(g.generation from '([1-5])')::integer,
      case
        when g.inception_date is null then null
        when extract(year from g.inception_date) <= 2002 then 1
        when extract(year from g.inception_date) <= 2011 then 2
        when extract(year from g.inception_date) <= 2017 then 3
        when extract(year from g.inception_date) <= 2022 then 4
        else 5
      end)),
    'role', jsonb_build_object('v', case
      when exists (select 1 from unnest(i.positions) as p where p ~* '\mleader\M') then 'leader'
      when exists (select 1 from unnest(i.positions) as p where p ~* '\mmaknae\M') then 'maknae'
      else 'none'
    end)
  ) as attrs,
  jsonb_strip_nulls(jsonb_build_object('fandom', nullif(nullif(btrim(g.fandom_name), ''), 'fan'), 'initial', upper(left(i.name, 1)))) as hints,
  (select ei.thumb_path from public.entity_images ei
    where ei.site_id = 'kpop' and ei.kind = 'idol' and ei.slug = i.id::text and ei.license_verified and ei.thumb_path is not null) as thumb_path,
  g.slug as balance_key,
  true as can_be_target
from idol i
join public.groups g on g.id = i.group_id
left join public.group_units u on u.id = i.unit_id;

-- A view is readable by anon and authenticated by default on Supabase and runs with its owner's rights unless security_invoker:
-- only the dle functions (as their owner) and the service role read it.
revoke all on table public.dle_src_kpop_idol from public, anon, authenticated;
grant select on table public.dle_src_kpop_idol to service_role;

insert into public.dle_games (id, universe, entity_kind, source_view, no_repeat_days, min_pool, hint_keys, hint_after, active)
values ('kpopdle-idol', 'kpop', 'idol', 'dle_src_kpop_idol', 120, 40, '{fandom,debut_song,initial}', '{5,8,12}', false)
on conflict (id) do nothing;

insert into public.dle_attributes (game_id, key, kind, position, near) values
  ('kpopdle-idol', 'gender', 'single', 1, null),
  ('kpopdle-idol', 'group', 'multi', 2, null),
  ('kpopdle-idol', 'agency', 'single', 3, null),
  ('kpopdle-idol', 'nationality', 'multi', 4, null),
  ('kpopdle-idol', 'birth', 'number', 5, 2),
  ('kpopdle-idol', 'debut', 'number', 6, 1),
  ('kpopdle-idol', 'generation', 'ordinal', 7, null),
  ('kpopdle-idol', 'role', 'single', 8, null)
on conflict (game_id, key) do nothing;

-- Self-check: the game is off and complete; the view is closed to the browser roles and never names a private column.
do $$
begin
  if (select active from public.dle_games where id = 'kpopdle-idol') then
    raise exception '020-dle-kpop-idol: kpopdle-idol is active (only dle_activate switches it on)';
  end if;
  if (select count(*) from public.dle_attributes where game_id = 'kpopdle-idol') <> 8 then
    raise exception '020-dle-kpop-idol: kpopdle-idol does not have 8 columns';
  end if;
  if has_table_privilege('anon', 'public.dle_src_kpop_idol', 'select') or has_table_privilege('authenticated', 'public.dle_src_kpop_idol', 'select') then
    raise exception '020-dle-kpop-idol: dle_src_kpop_idol is readable by a browser role';
  end if;
  if pg_get_viewdef('public.dle_src_kpop_idol'::regclass) ~ '(height_cm|mbti|blood_type)' then
    raise exception '020-dle-kpop-idol: dle_src_kpop_idol names a private column';
  end if;
end $$;

notify pgrst, 'reload schema';
