-- L20-l1-kpopdle-view.sql (lane kpopdle, run O1, owner 2026-11-09; audit 05 Part C items 1 and 2, rules R1, R4 and R13)
--
-- What:   (1) leader and maknae are read as WHOLE elements of idols.positions (R4): "Performance Unit Leader" and "Vocal Unit Leader" (Hoshi, Woozi) are no longer
--             leaders; "Leader" and "Maknae" still are. `create or replace view public.dle_src_kpop_idol`, 020's body with three changes, same columns, same grants;
--         (2) the agency column gets a mother company `p` (R1): the name of the parent in public.agencies (022), or the agency's own name when it has none, so two labels
--             of one group (BigHit Music and Pledis Entertainment, both HYBE) are Close and HYBE against SM Entertainment is Wrong. The 6 parent rows are set here (below),
--             each with its Wikipedia URL in agencies.sources (entity_sources does not accept the type agency);
--         (3) public.agencies: the parent HYBE (slug hybe) and the 6 children BigHit Music, Pledis Entertainment, Source Music, Belift Lab, ADOR and YX LABELS get their
--             parent_id, only where it is null today. Names are the strings of groups.record_label so the join and the slug match.
--         Sources read on 2026-11-09 (English Wikipedia, revision ids): Hybe 1384548971 (Pledis since 2020, Belift Lab since 2023-09-01, ADOR "Hybe's label for NewJeans", Hybe Japan
--         with YX Labels), BigHit_Music 1383772709 (parent Hybe Corporation), Pledis_Entertainment 1383795753 ("parent = Hybe Corporation, since May 2020"), Source_Music
--         1384475287 ("parent = Hybe Corporation, since 2019"). Not mapped, no source read: KATSEYE's "Hybe UMG", Starship (Kakao), WakeOne (CJ ENM): left without parent, so
--         their agency is Close to nothing but itself.
--         The agency help in copy.ts ("Close if same parent company") is true only once this file is applied: it ships in the same PR and the owner applies it right after the merge.
--         The role cell has no Close (R13): its `near` text is removed from copy.ts.
--         The game stays complete for every idol: no value of any column is added or removed, only `p` on agency and the role of unit leaders, so no entity enters or
--         leaves the targets and no served or kept day changes its answer (no schedule precheck needed). Past days' colours are recomputed on read: a guess of the agency of
--         one HYBE label against another turns from Wrong to Close, a unit leader's Leader cell from Right to Wrong.
-- Needs:  019, 020, 022 (public.agencies). Independent of L19, in any order.
-- WHEN:   after a backup, just after 00:30 UTC, never between 23:50 and 00:30 UTC, never during a build (a game in progress shows the new colours at once).
-- Effect: kpopquiz.org: nothing (the view is closed to the browser roles and read by the dle functions only). public.agencies is read by no public page.
-- Undo:   L20-l1-kpopdle-view.rollback.sql (020's view body byte for byte; the parent rows back to null).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $l20$
begin
  if to_regclass('public.agencies') is null or to_regclass('public.dle_src_kpop_idol') is null or to_regclass('public.entity_sources') is null then
    raise exception 'L20: public.agencies (022) and public.dle_src_kpop_idol (020) must exist';
  end if;
end $l20$;

-- The parent and the children, by the name written in groups.record_label (the slug rule of 022). A name already there is kept as it is.
create temp table l20_parents (child text primary key, url text not null, rev text not null, note text not null);
insert into l20_parents (child, url, rev, note) values
  ('BigHit Music',         'https://en.wikipedia.org/wiki/BigHit_Music',         '1383772709', 'infobox parent: Hybe Corporation'),
  ('Pledis Entertainment', 'https://en.wikipedia.org/wiki/Pledis_Entertainment', '1383795753', 'infobox parent: Hybe Corporation, since May 2020'),
  ('Source Music',         'https://en.wikipedia.org/wiki/Source_Music',         '1384475287', 'infobox parent: Hybe Corporation, since 2019'),
  ('Belift Lab',           'https://en.wikipedia.org/wiki/Hybe',                 '1384548971', 'wholly owned subsidiary of Hybe since 2023-09-01'),
  ('ADOR',                 'https://en.wikipedia.org/wiki/Hybe',                 '1384548971', '"ADOR, Hybe''s label for NewJeans"'),
  ('YX LABELS',            'https://en.wikipedia.org/wiki/Hybe',                 '1384548971', 'a label of Hybe Japan');

do $l20$
declare
  hybe_id bigint;
  n integer;
  missing text;
begin
  insert into public.agencies (slug, name, sources, created_at) values ('hybe', 'HYBE', array['https://en.wikipedia.org/wiki/Hybe'], timestamptz '2026-11-09 00:00:01+00')
  on conflict do nothing;
  select id into hybe_id from public.agencies where name = 'HYBE';
  if hybe_id is null then
    raise exception 'L20: the slug hybe is taken by another agency name; nothing was changed';
  end if;

  insert into public.agencies (slug, name, created_at)
  select distinct on (s.slug) s.slug, s.name, timestamptz '2026-11-09 00:00:01+00'
  from (select p.child as name, left(btrim(regexp_replace(lower(btrim(p.child)), '[^a-z0-9]+', '-', 'g'), '-'), 60) as slug from l20_parents p
        where exists (select 1 from public.groups g where btrim(g.record_label) = p.child)) s
  order by s.slug, s.name
  on conflict do nothing;

  update public.agencies a set parent_id = hybe_id,
    sources = case when cardinality(a.sources) = 0 then array[p.url] else a.sources end
  from l20_parents p
  where a.name = p.child and a.parent_id is null and a.id <> hybe_id;
  get diagnostics n = row_count;

  select string_agg(p.child, ', ') into missing from l20_parents p
  where exists (select 1 from public.groups g where btrim(g.record_label) = p.child)
    and not exists (select 1 from public.agencies a where a.name = p.child and a.parent_id = hybe_id);
  if missing is not null then
    raise notice 'L20: agency(ies) % used by a group but not under HYBE (slug taken by another name, or another parent already set)', missing;
  end if;
  raise notice 'L20: % agency row(s) put under HYBE', n;
end $l20$;


create or replace view public.dle_src_kpop_idol with (security_invoker = true) as
with idol as (
  select i.id, i.group_id, i.unit_id, i.name, i.name_romanized, i.name_hangul, i.birth_date, i.nationality, i.positions,
    coalesce((select array_agg(og2.name order by og2.name) from public.idol_other_groups og join public.groups og2 on og2.id = og.group_id
      where og.idol_id = i.id and og.group_id <> i.group_id), '{}'::text[]) as other_groups,
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
    'group', jsonb_build_object('v', to_jsonb(array[coalesce(u.name, g.name)] || i.other_groups), 'p', to_jsonb(array[g.name] || i.other_groups)),
    'agency', jsonb_build_object('v', jsonb_build_array(nullif(btrim(g.record_label), '')),
      'p', case when nullif(btrim(g.record_label), '') is null then null else jsonb_build_array(coalesce(ap.name, btrim(g.record_label))) end),
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
      when exists (select 1 from unnest(i.positions) as p where p ~* '^\s*leader\s*$') then 'leader'
      when exists (select 1 from unnest(i.positions) as p where p ~* '^\s*maknae\s*$') then 'maknae'
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
left join public.group_units u on u.id = i.unit_id
left join public.agencies a on a.name = btrim(g.record_label)
left join public.agencies ap on ap.id = a.parent_id;

revoke all on table public.dle_src_kpop_idol from public, anon, authenticated;
grant select on table public.dle_src_kpop_idol to service_role;

-- The snapshot the players read, when the game already has one (otherwise the activation takes it). Never dle_build_bank here.
do $l20$ begin
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then
    perform public.dle_refresh_entities('kpopdle-idol');
  end if;
end $l20$;

-- Self-check: the view keeps the 020 contract and holds the three changes.
do $l20$
declare
  def text := pg_get_viewdef('public.dle_src_kpop_idol'::regclass);
begin
  if has_table_privilege('anon', 'public.dle_src_kpop_idol', 'select') or has_table_privilege('authenticated', 'public.dle_src_kpop_idol', 'select') then
    raise exception 'L20: dle_src_kpop_idol is readable by a browser role';
  end if;
  if def ~ '(height_cm|mbti|blood_type)' then
    raise exception 'L20: dle_src_kpop_idol names a private column';
  end if;
  if def !~ 'ap\.name' or def ~ 'mleader' then
    raise exception 'L20: the view does not hold the new agency parent or still matches a leader inside a word';
  end if;
  if exists (select 1 from public.agencies a join public.agencies p on p.id = a.parent_id where p.parent_id is not null) then
    raise exception 'L20: an agency parent has a parent itself (only one level is read)';
  end if;
end $l20$;

drop table if exists pg_temp.l20_parents;

notify pgrst, 'reload schema';
