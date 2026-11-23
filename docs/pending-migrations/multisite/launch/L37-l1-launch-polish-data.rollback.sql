-- L37-l1-launch-polish-data.rollback.sql (lane DATA37, run O1): undoes L37-l1-launch-polish-data.sql.
--
-- What:   puts the label of AKMU back to "YG Entertainment" (only where L37 moved it and it still reads "Cemter of Inspiration"), deletes the entity_sources row and the public.agencies row L37 wrote (the agency only when
--         no group uses it and no child hangs on it), sets the three bounties (Dragon, Rayleigh, Oden) back to {"v": 0, "l": "No bounty"} (only where they still read Unknown), lets Heeseung back into the
--         pool (only the dle_curation row whose note starts with "L37:"), restores 019's dle_compare byte for byte (only when no bounty of any game is still a non-number, otherwise it stays, warning),
--         and refreshes the two snapshots. A second run changes nothing.
--         The first Verify line holds where L37 moved the label; where L34 had already written "Cemter of Inspiration" it stays.
-- Needs:  the state L37 leaves; undo it before L36's rollback.
-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it.
-- Verify: select record_label from public.groups where site_id = 'kpop' and slug = 'akmu';   expect YG Entertainment
-- Verify: select count(*) from public.agencies where created_at = timestamptz '2026-11-23 00:00:00+00';   expect 0
-- Verify: select count(*) from public.dle_curation where note like 'L37:%';   expect 0
-- Verify: select count(*) from public.character_game_facts f join public.characters c on c.id = f.character_id where f.game_id = 'otakudle-one-piece' and c.slug in ('monkey-d-dragon', 'silvers-rayleigh', 'kozuki-oden') and f.attrs -> 'bounty' is distinct from '{"v": 0, "l": "No bounty"}'::jsonb;   expect 0
-- Verify: select count(*) from pg_proc where oid = 'public.dle_compare(text, numeric, jsonb, jsonb)'::regprocedure and prosrc like '%Unknown%';   expect 0
-- Undo:   L37-l1-launch-polish-data.sql.
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing; a row that already moved to another value is left alone (warning).

do $o1l37r$
begin
perform set_config('lock_timeout', '5s', true);
perform set_config('client_min_messages', 'warning', true);

begin
  if to_regclass('public.groups') is null or to_regclass('public.agencies') is null or to_regclass('public.entity_sources') is null or to_regclass('public.dle_curation') is null
     or to_regclass('public.character_game_facts') is null then
    raise exception 'L37 rollback: 020, 022, 024 and L15 must be applied first';
  end if;
end;

-- 1. AKMU.
begin
  -- The label goes back only when L37 moved it (the source_ref of its official row says so); where L34 had already written it, it stays.
  update public.groups g set record_label = 'YG Entertainment'
  where g.site_id = 'kpop' and g.slug = 'akmu' and g.record_label = 'Cemter of Inspiration'
    and exists (select 1 from public.entity_sources s where s.entity_type = 'group' and s.entity_id = g.id::text and s.field = 'record_label' and s.source = 'official'
      and s.fetched_at = timestamptz '2026-11-23 00:00:00+00' and s.source_ref like '%(L37 moved the label)');
  delete from public.entity_sources s using public.groups g
  where s.entity_type = 'group' and s.entity_id = g.id::text and g.site_id = 'kpop' and g.slug = 'akmu' and s.field = 'record_label' and s.source = 'official'
    and s.fetched_at = timestamptz '2026-11-23 00:00:00+00';
  delete from public.agencies a
  where a.created_at = timestamptz '2026-11-23 00:00:00+00' and a.name = 'Cemter of Inspiration'
    and not exists (select 1 from public.groups g where btrim(g.record_label) = a.name)
    and not exists (select 1 from public.agencies c where c.parent_id = a.id);
end;

-- 2. Heeseung.
begin
  delete from public.dle_curation k where k.game_id = 'kpopdle-idol' and k.entity_id = '115' and k.note like 'L37:%' and k.weight = 1;
  update public.dle_curation k set excluded = false, note = null, updated_at = now() where k.game_id = 'kpopdle-idol' and k.entity_id = '115' and k.note like 'L37:%';
end;

-- 3. The three bounties.
declare
  v_left integer;
begin
  update public.character_game_facts f set attrs = jsonb_set(f.attrs, '{bounty}', '{"v": 0, "l": "No bounty"}'::jsonb)
  from public.characters ch join public.groups g on g.id = ch.group_id and g.site_id = 'anime' and g.slug = 'one-piece'
  where ch.id = f.character_id and f.game_id = 'otakudle-one-piece' and ch.slug in ('monkey-d-dragon', 'silvers-rayleigh', 'kozuki-oden')
    and f.attrs -> 'bounty' = '{"v": "Unknown"}'::jsonb;
  -- 019's comparator casts a number column: it comes back only when no value is left that it could not cast.
  select count(*) into v_left from public.character_game_facts f
  where f.attrs -> 'bounty' ->> 'v' = 'Unknown';
  if v_left > 0 then
    raise warning 'L37 rollback: % other bounty value(s) still read Unknown, dle_compare keeps the L37 rule (019 would fail on them)', v_left;
  else
    execute $f$
create or replace function public.dle_compare(p_kind text, p_near numeric, p_guess jsonb, p_target jsonb) returns jsonb
language plpgsql immutable
  set search_path = public
as $body$
declare
  g text[] := public.dle_values(p_guess -> 'v');
  t text[] := public.dle_values(p_target -> 'v');
  gp text[] := coalesce(public.dle_values(p_guess -> 'p'), '{}');
  tp text[] := coalesce(public.dle_values(p_target -> 'p'), '{}');
  gn numeric;
  tn numeric;
  arrow text;
begin
  if g is null or t is null or cardinality(g) = 0 or cardinality(t) = 0 then
    return jsonb_build_object('status', 'unknown', 'arrow', null);
  end if;
  if p_kind in ('single', 'multi') then
    if g <@ t and t <@ g then
      return jsonb_build_object('status', 'correct', 'arrow', null);
    end if;
    if g && t or gp && tp then
      return jsonb_build_object('status', 'near', 'arrow', null);
    end if;
    return jsonb_build_object('status', 'wrong', 'arrow', null);
  end if;
  if p_kind in ('number', 'ordinal') then
    gn := g[1]::numeric;
    tn := t[1]::numeric;
    if gn = tn then
      return jsonb_build_object('status', 'correct', 'arrow', null);
    end if;
    arrow := case when tn > gn then 'up' else 'down' end;
    if p_kind = 'number' and p_near is not null and abs(tn - gn) <= p_near then
      return jsonb_build_object('status', 'near', 'arrow', arrow);
    end if;
    return jsonb_build_object('status', 'wrong', 'arrow', arrow);
  end if;
  raise exception 'dle_compare: unknown kind %', p_kind;
end $body$
    $f$;
  end if;
end;

begin
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then perform public.dle_refresh_entities('kpopdle-idol'); end if;
  if exists (select 1 from public.dle_entities where game_id = 'otakudle-one-piece') then perform public.dle_refresh_entities('otakudle-one-piece'); end if;
end;

notify pgrst, 'reload schema';

end $o1l37r$;
