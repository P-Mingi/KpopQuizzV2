-- L20-l1-kpopdle-view.rollback.sql (lane kpopdle, run O1): undoes L20-l1-kpopdle-view.sql.
--
-- What:   puts 020's view body back byte for byte (the `\mleader\M` roles, the agency without `p`), takes the 6 agencies out from under HYBE (only where the parent is
--         HYBE), resets their `sources` where they hold exactly the URL L20 wrote, deletes the HYBE row when it has no child left and still holds its own source, refreshes the snapshot. Deletes the agency rows L20 created (stamped created_at 2026-11-09 00:00:01 UTC); rows that existed before stay.
-- WHEN:   like L20. After this rollback the agency help of copy.ts ("Close if same parent company") is no longer true.
-- o1-transaction: single (psql --single-transaction). Idempotent.

set lock_timeout = '5s';
set client_min_messages = warning;

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

revoke all on table public.dle_src_kpop_idol from public, anon, authenticated;
grant select on table public.dle_src_kpop_idol to service_role;

update public.agencies a set parent_id = null,
  sources = case when a.sources = array[p.url] then '{}'::text[] else a.sources end
from (values
  ('BigHit Music', 'https://en.wikipedia.org/wiki/BigHit_Music'), ('Pledis Entertainment', 'https://en.wikipedia.org/wiki/Pledis_Entertainment'),
  ('Source Music', 'https://en.wikipedia.org/wiki/Source_Music'), ('Belift Lab', 'https://en.wikipedia.org/wiki/Hybe'),
  ('ADOR', 'https://en.wikipedia.org/wiki/Hybe'), ('YX LABELS', 'https://en.wikipedia.org/wiki/Hybe')
) as p(name, url)
where a.name = p.name and a.parent_id = (select h.id from public.agencies h where h.name = 'HYBE');

delete from public.agencies a
where a.created_at = timestamptz '2026-11-09 00:00:01+00'
  and a.name in ('HYBE', 'BigHit Music', 'Pledis Entertainment', 'Source Music', 'Belift Lab', 'ADOR', 'YX LABELS')
  and not exists (select 1 from public.agencies c where c.parent_id = a.id);

do $l20$ begin
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then
    perform public.dle_refresh_entities('kpopdle-idol');
  end if;
end $l20$;

notify pgrst, 'reload schema';
