-- L37-l1-launch-polish-data.sql (lane DATA37, run O1, integrator lot LAUNCH-POLISH-2 of 2026-11-23, task D: three facts the research of 2026-11-23 corrected)
--
-- What:   1. AKMU agency: groups.record_label of the group akmu goes from "YG Entertainment" to "Cemter of Inspiration", the name of the independent agency the duo founded after leaving YG
--            (the name is spelled this way by the duo's own account on X, https://x.com/official_akmu/status/2018339122465976823, and by English Wikipedia, https://en.wikipedia.org/wiki/AKMU; the
--            lead of that page writes "Center", the infobox and the body "Cemter": the official spelling is kept). The name goes into public.agencies (022) like L34 does (only when missing, created_at
--            2026-11-23 00:00 UTC so the rollback deletes exactly that row), with one entity_sources row (source official). Changed only where the label still reads "YG Entertainment" (L34 or 021d);
--            a label someone else set is left alone (warning). The agency cell of Lee Chan-hyuk and Lee Su-hyun in Kpopdle follows (snapshot refreshed);
--         2. Heeseung (idol 115, ENHYPEN, announced his departure on 10 March): Kpopdle models an idol's group as idols.group_id, joined to public.groups by the view dle_src_kpop_idol (020, L20): the
--            game has no soloist (an idol with no group has no group, agency or generation cell). So he leaves the pool through the curation the files already use (dle_curation, excluded, note "L37: ..."),
--            like Imu and Shiki in L36. The row of public.idols is not touched (not deleted, not detached, not deactivated here): KpopCards, the group pages and every other surface stay as they are.
--            Production already holds idols.active = false for him since seo-m2-idols-former-members.sql, so the view does not serve him today; this row keeps him out whatever that flag says;
--         3. One Piece bounty "Unknown": the bounty of Monkey D. Dragon, Silvers Rayleigh and Kozuki Oden was never revealed; L36 stored it as 0 "No bounty", which says "none", not "not known". Their value becomes
--            {"v": "Unknown"} (a text in a number column, no "l"). public.dle_compare (019) is redefined, same signature, with ONE added rule for the kind number: when either value is "Unknown", two "Unknown" are
--            correct and an "Unknown" against anything else (a number, 0 "No bounty" included) is wrong with no arrow, never near. Every other branch is 019's text. The game reads "Unknown" / "Inconnue"
--            (value-i18n.ts seriesValueLabel), and the bounty help of copy.ts says it. dle_compare is the only function that casts a number column.
--         Nothing else: no birth date or year is written, can_be_target is not touched (the answers stay as they are), no bank is rebuilt, updated_at of the facts is not touched.
-- Needs:  019, 020, L20, 022, 024, L15, L21, L34, L36. Applied AFTER L34, L35 and L36 (normal order L34, L35, L36, L37).
--         Re-reading L36 later changes nothing here: it finds the three bounties neither empty nor its old value and leaves them alone (warning). Re-reading L34 later WOULD put "YG Entertainment" back on AKMU
--         (its rule is "label differs from the truth table, after lower-casing and dropping non letters"): do not re-run L34 after L37. The clean fix is one line in L34's table (the AKMU entry, line "name":"AKMU":
--         label "Cemter of Inspiration", url and rev of the AKMU page) to be made by the integrator at the final merge; L37 stays idempotent on top of it.
-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it. The snapshots of kpopdle-idol and of
--         otakudle-one-piece are refreshed in the same transaction; no answer changes, the bank is not redrawn.
-- Effect: kpopquiz.org: the Label line of AKMU. Kpopdle: the agency cell of the two AKMU idols; Heeseung is not a possible guess. Otakudle One Piece: the bounty cell of three characters reads Unknown.
-- Verify: select record_label from public.groups where site_id = 'kpop' and slug = 'akmu';   expect Cemter of Inspiration
-- Verify: select count(*) from public.dle_entities where game_id = 'kpopdle-idol' and name in ('Lee Chan-hyuk', 'Lee Su-hyun') and attrs -> 'agency' ->> 'v' <> '["Cemter of Inspiration"]';   expect 0
-- Verify: select count(*) from public.dle_entities where game_id = 'kpopdle-idol' and entity_id = '115' and (in_pool or can_be_target);   expect 0
-- Verify: select count(*) from public.dle_schedule s join public.dle_games g on g.id = s.game_id where s.game_id = 'kpopdle-idol' and s.entity_id = '115' and s.bank_day in (select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from generate_series(0, 364) as k);   expect 0
-- Verify: select count(*) from public.character_game_facts f join public.characters c on c.id = f.character_id where f.game_id = 'otakudle-one-piece' and c.slug in ('monkey-d-dragon', 'silvers-rayleigh', 'kozuki-oden') and f.attrs -> 'bounty' is distinct from '{"v": "Unknown"}'::jsonb;   expect 0
-- Verify: select count(*) from public.character_game_facts where game_id = 'otakudle-one-piece' and attrs -> 'bounty' ->> 'v' = 'Unknown';   expect 3
-- Verify: select public.dle_compare('number', null, '{"v": "Unknown"}'::jsonb, '{"v": 0, "l": "No bounty"}'::jsonb) ->> 'status';   expect wrong
-- Verify: select public.dle_compare('number', null, '{"v": 3000000000}'::jsonb, '{"v": "Unknown"}'::jsonb) ->> 'arrow';   expect NULL
-- Verify: select public.dle_compare('number', null, '{"v": "Unknown"}'::jsonb, '{"v": "Unknown"}'::jsonb) ->> 'status';   expect correct
-- Verify: select count(*) from public.dle_curation where note like 'L37:%' and excluded;   expect 1
-- Undo:   L37-l1-launch-polish-data.rollback.sql (the label back to YG Entertainment, the three bounties back to 0 "No bounty", Heeseung back as he was, 019's dle_compare byte for byte).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing; a row that already moved to another value is left alone (warning).

do $o1l37$
begin
perform set_config('lock_timeout', '5s', true);
perform set_config('client_min_messages', 'warning', true);

begin
  if to_regclass('public.groups') is null or to_regclass('public.agencies') is null or to_regclass('public.entity_sources') is null or to_regclass('public.dle_curation') is null
     or to_regclass('public.dle_src_kpop_idol') is null or to_regclass('public.character_game_facts') is null then
    raise exception 'L37: 020, 022, 024 and L15 must be applied first';
  end if;
  if not exists (select 1 from public.dle_games where id = 'kpopdle-idol') or not exists (select 1 from public.dle_games where id = 'otakudle-one-piece') then
    raise exception 'L37: the games kpopdle-idol and otakudle-one-piece must exist (020 and 024)';
  end if;
end;

-- 1. AKMU: the name of its agency.
declare
  v_label constant text := 'Cemter of Inspiration';
  v_old constant text := 'YG Entertainment';
  v_url constant text := 'https://x.com/official_akmu/status/2018339122465976823';
  v_cur text;
  v_gid integer;
begin
  select g.id, g.record_label into v_gid, v_cur from public.groups g where g.site_id = 'kpop' and g.slug = 'akmu';
  if v_gid is null then
    raise warning 'L37: the group akmu is not there (apply 021d first), the agency is left alone';
  elsif v_cur is not distinct from v_label then
    null;
  elsif v_cur is not distinct from v_old then
    insert into public.agencies (slug, name, sources, created_at)
    values ('cemter-of-inspiration', v_label, array[v_url, 'https://en.wikipedia.org/wiki/AKMU'], timestamptz '2026-11-23 00:00:00+00')
    on conflict do nothing;
    update public.groups set record_label = v_label where id = v_gid and site_id = 'kpop' and slug = 'akmu' and record_label = v_old;
  else
    raise warning 'L37: the label of akmu is %, neither % nor %: left alone', v_cur, v_old, v_label;
  end if;
  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'group', g.id::text, 'record_label', 'official', 'official_akmu post, new agency', v_url, timestamptz '2026-11-23 00:00:00+00'
  from public.groups g where g.site_id = 'kpop' and g.slug = 'akmu' and g.record_label = v_label
  on conflict (entity_type, entity_id, field, source) do nothing;
end;

-- 2. Heeseung leaves the pool of Kpopdle (never the row of the idol).
declare
  v_why constant text := 'L37: left ENHYPEN (announced 10 March); Kpopdle holds no soloist, so he is not a possible guess';
begin
  if exists (select 1 from public.idols i join public.groups g on g.id = i.group_id where i.id = 115 and i.name = 'Heeseung' and g.slug = 'enhypen') then
    insert into public.dle_curation (game_id, entity_id, excluded, note)
    values ('kpopdle-idol', '115', true, v_why)
    on conflict (game_id, entity_id) do update set excluded = true, note = excluded.note, updated_at = now() where not public.dle_curation.excluded;
  else
    raise warning 'L37: idol 115 Heeseung of ENHYPEN is not there, nothing to take out of the pool';
  end if;
  if exists (select 1 from public.dle_schedule s join public.dle_games g on g.id = s.game_id
             where s.game_id = 'kpopdle-idol' and s.entity_id = '115'
               and s.bank_day in (select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from generate_series(0, 364) as k)) then
    raise warning 'L37: Heeseung is still the answer of a coming day of Kpopdle: the bank must be redrawn before that day (the Verify line shows it)';
  end if;
end;

-- 3. The bounty that was never revealed.
declare
  fixes constant jsonb := $j$[
{"slug":"monkey-d-dragon"},
{"slug":"silvers-rayleigh"},
{"slug":"kozuki-oden"}
]$j$;
  c record; r record; cur jsonb;
  v_was constant jsonb := '{"v": 0, "l": "No bounty"}'::jsonb;
  v_new constant jsonb := '{"v": "Unknown"}'::jsonb;
  n_changed integer := 0; n_already integer := 0; n_drift integer := 0; n_missing integer := 0;
begin
  for c in select t.slug from jsonb_to_recordset(fixes) as t(slug text) order by t.slug loop
    select f.character_id, f.attrs into r
    from public.character_game_facts f
    join public.characters ch on ch.id = f.character_id
    join public.groups g on g.id = ch.group_id and g.site_id = 'anime' and g.slug = 'one-piece'
    where ch.slug = c.slug and f.game_id = 'otakudle-one-piece';
    if not found then
      n_missing := n_missing + 1;
      raise warning 'L37: no fact row for otakudle-one-piece / %', c.slug;
      continue;
    end if;
    cur := r.attrs -> 'bounty';
    if cur is not distinct from v_new then
      n_already := n_already + 1;
    elsif cur is not distinct from v_was then
      update public.character_game_facts set attrs = jsonb_set(attrs, '{bounty}', v_new) where character_id = r.character_id and game_id = 'otakudle-one-piece';
      n_changed := n_changed + 1;
    else
      n_drift := n_drift + 1;
      raise warning 'L37: otakudle-one-piece / % holds the bounty %, neither % nor %: left alone', c.slug, cur, v_was, v_new;
    end if;
  end loop;
  if n_missing > 0 then
    raise exception 'L37: % bounties found no row (apply L15 first)', n_missing;
  end if;
  raise notice 'L37: % bounties set to Unknown, % already, % left alone', n_changed, n_already, n_drift;
end;

-- The comparator: 019's text with one added rule for the kind number.
begin
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
    -- L37: "Unknown" is a value that was never revealed (a bounty), not a number and not 0: two of them match, one against anything else is wrong, never near, never an arrow.
    if p_kind = 'number' and (g[1] = 'Unknown' or t[1] = 'Unknown') then
      return jsonb_build_object('status', case when g[1] = t[1] then 'correct' else 'wrong' end, 'arrow', null);
    end if;
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
  if public.dle_compare('number', null, '{"v": "Unknown"}'::jsonb, '{"v": "Unknown"}'::jsonb) ->> 'status' is distinct from 'correct'
     or public.dle_compare('number', 5, '{"v": "Unknown"}'::jsonb, '{"v": 0}'::jsonb) is distinct from '{"status": "wrong", "arrow": null}'::jsonb
     or public.dle_compare('number', 5, '{"v": 3}'::jsonb, '{"v": "Unknown"}'::jsonb) is distinct from '{"status": "wrong", "arrow": null}'::jsonb
     or public.dle_compare('number', 5, '{"v": 3}'::jsonb, '{"v": 6}'::jsonb) is distinct from '{"status": "near", "arrow": "up"}'::jsonb
     or public.dle_compare('number', null, '{"v": 0}'::jsonb, '{"v": 0}'::jsonb) is distinct from '{"status": "correct", "arrow": null}'::jsonb then
    raise exception 'L37: dle_compare does not answer as intended';
  end if;
end;

-- The snapshots the players read (a game that has none is refreshed by its own activation). Never dle_build_bank here.
begin
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then perform public.dle_refresh_entities('kpopdle-idol'); end if;
  if exists (select 1 from public.dle_entities where game_id = 'otakudle-one-piece') then perform public.dle_refresh_entities('otakudle-one-piece'); end if;
end;

notify pgrst, 'reload schema';

end $o1l37$;
