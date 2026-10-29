-- 007-world-xp.sql (run O1, lane B3; manifest.md row 11; BACKLOG 4.1 row 15 (M7); schema.sql section "@file 007-world-xp")
--
-- What:   creates the six functions of the passport that write or read world progress: award_world_xp and
--         bump_world_counter (service_role only; both raise on 'kpop', whose progress stays on profiles and
--         award_xp), public_passport (anon, authenticated, service_role), my_passport, update_my_membership and
--         set_passport_prefs (authenticated).
-- Why:    008's non-kpop branches write world counters through award_world_xp and bump_world_counter; the hub reads
--         the passport through public_passport and my_passport and edits it through the two update functions.
-- Rows:   6 new functions; no table, row or column is touched.
-- Needs:  003 (world_memberships), 004 (passport_prefs). 008 needs this file.
-- Decisions where the contract is silent:
--   - bump_world_counter and award_world_xp create the membership (joined_via 'play') when the member has none
--     yet, and set activated_at at the first counted action (a stamp is activated by a real action; kpop's is
--     activated at once by 003). They never set first_play_at: the server sets it, so it can tell the first play.
--     Counters clamp at 0 (an unlike never goes below 0, as decrement_like_count does today). A user without a
--     profile, or a null user (anonymous play), is ignored (bump returns null).
--   - award_world_xp "runs that site's badge rules": the rules of award_xp (first_steps, dedicated_fan, multi_stan on
--     'play'; quiz_maker, prolific_creator on 'create'; community_star on 'like_received') applied to this world's
--     counters. A rule awards only a badge the world defines: badge_definitions row with site_id = p_site and
--     id = p_site || '_' || <rule>. Until a world defines them (launch, L06) no badge is ever awarded.
--   - public_passport: passport_xp is the sum of xp over the VISIBLE stamps only (fail closed: a hidden world's xp is
--     never summed in); rows are ordered by joined_at then site_id; the username is matched lowercased.
--   - set_passport_prefs refuses the dismissed keys that start with 'anon_merged_': 008's merge_anon_passport keeps
--     its once-per-world marker there, and a member must not be able to reset it.
-- Verify: select proname, prosecdef, provolatile from pg_proc where pronamespace = 'public'::regnamespace and proname in ('award_world_xp', 'bump_world_counter', 'public_passport', 'my_passport', 'update_my_membership', 'set_passport_prefs') order by 1;   expect 6 rows, prosecdef t; public_passport and my_passport s
--         select public.award_world_xp(gen_random_uuid(), 'kpop', 1, 'play');   expect an exception (kpop keeps award_xp)
--         select has_function_privilege('anon', 'public.public_passport(text)', 'execute'), has_function_privilege('anon', 'public.award_world_xp(uuid, text, integer, text)', 'execute');   expect t, f
-- Undo:   007-world-xp.rollback.sql (refused while 008 is applied: its functions call these).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

-- Precondition: plpgsql binds late, so refuse to start without the tables these functions read and write.
do $$
begin
  if to_regclass('public.world_memberships') is null or to_regclass('public.passport_prefs') is null then
    raise exception '007-world-xp: world_memberships or passport_prefs is missing (apply 003 and 004 first)';
  end if;
  if not exists (select 1 from pg_attribute a where a.attrelid = to_regclass('public.quizzes') and a.attname = 'site_id' and not a.attisdropped)
     or not exists (select 1 from pg_attribute a where a.attrelid = to_regclass('public.badge_definitions') and a.attname = 'site_id' and not a.attisdropped) then
    raise exception '007-world-xp: quizzes.site_id or badge_definitions.site_id is missing (apply 002a first)';
  end if;
end $$;

-- award_world_xp: raises on p_site = 'kpop' (kpop keeps award_xp); adds p_amount to world_memberships.xp of
-- (p_user, p_site), runs that site's badge rules, returns the new xp.
create or replace function public.award_world_xp(p_user uuid, p_site text, p_amount integer, p_reason text)
  returns integer
  language plpgsql security definer set search_path = public
  as $$
declare
  v_xp    integer;
  v_n     integer;
  v_rules text[] := '{}';
begin
  if p_site is null then
    raise exception 'award_world_xp: site is required';
  end if;
  if p_site = 'kpop' then
    raise exception 'award_world_xp: kpop keeps award_xp';
  end if;
  if p_user is null or p_amount is null then
    raise exception 'award_world_xp: user and amount are required';
  end if;

  insert into public.world_memberships as m (user_id, site_id, joined_via, activated_at, xp)
  values (p_user, p_site, 'play', now(), greatest(p_amount, 0))
  on conflict on constraint world_memberships_pkey do update
     set xp = greatest(coalesce(m.xp, 0) + p_amount, 0),
         activated_at = coalesce(m.activated_at, now())
  returning m.xp into v_xp;

  -- the site's badge rules (award_xp's rules on this world's counters; a rule awards only a badge the world defines)
  if p_reason = 'play' then
    select count(*) into v_n
      from public.plays pl join public.quizzes q on q.id = pl.quiz_id
     where pl.player_id = p_user and q.site_id = p_site;
    if v_n >= 1 then v_rules := array_append(v_rules, 'first_steps'); end if;
    if v_n >= 100 then v_rules := array_append(v_rules, 'dedicated_fan'); end if;
    select count(distinct q.group_id) into v_n
      from public.plays pl join public.quizzes q on q.id = pl.quiz_id
     where pl.player_id = p_user and q.site_id = p_site;
    if v_n >= 10 then v_rules := array_append(v_rules, 'multi_stan'); end if;
  elsif p_reason = 'create' then
    select coalesce(m.quizzes_created, 0) into v_n from public.world_memberships m where m.user_id = p_user and m.site_id = p_site;
    if v_n >= 1 then v_rules := array_append(v_rules, 'quiz_maker'); end if;
    if v_n >= 10 then v_rules := array_append(v_rules, 'prolific_creator'); end if;
  elsif p_reason = 'like_received' then
    select coalesce(m.likes_received, 0) into v_n from public.world_memberships m where m.user_id = p_user and m.site_id = p_site;
    if v_n >= 100 then v_rules := array_append(v_rules, 'community_star'); end if;
  end if;
  if cardinality(v_rules) > 0 then
    insert into public.user_badges (user_id, badge_id)
    select p_user, b.id
      from public.badge_definitions b
     where b.site_id = p_site and b.id in (select p_site || '_' || r from unnest(v_rules) as r)
    on conflict do nothing;
  end if;

  return v_xp;
end
$$;
revoke all on function public.award_world_xp(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.award_world_xp(uuid, text, integer, text) to service_role;

-- bump_world_counter: raises on 'kpop'; p_counter in ('quizzes_played', 'blindtests_played', 'games_played',
-- 'quizzes_created', 'plays_received', 'likes_received'); returns the new value. Called by 008's non-kpop
-- branches and by the server.
create or replace function public.bump_world_counter(p_user uuid, p_site text, p_counter text, p_delta integer default 1)
  returns integer
  language plpgsql security definer set search_path = public
  as $$
declare
  v_val integer;
begin
  if p_site is null then
    raise exception 'bump_world_counter: site is required';
  end if;
  if p_site = 'kpop' then
    raise exception 'bump_world_counter: kpop counters live on profiles';
  end if;
  if p_counter is null or p_counter not in ('quizzes_played', 'blindtests_played', 'games_played', 'quizzes_created', 'plays_received', 'likes_received') then
    raise exception 'bump_world_counter: unknown counter %', p_counter;
  end if;
  if p_delta is null then
    raise exception 'bump_world_counter: delta is required';
  end if;
  if p_user is null or not exists (select 1 from public.profiles p where p.id = p_user) then
    return null;
  end if;

  execute format(
    'insert into public.world_memberships as m (user_id, site_id, joined_via, activated_at, %1$I)
     values ($1, $2, ''play'', case when $3 > 0 then now() end, greatest($3, 0))
     on conflict on constraint world_memberships_pkey do update
        set %1$I = greatest(coalesce(m.%1$I, 0) + $3, 0),
            activated_at = case when $3 > 0 then coalesce(m.activated_at, now()) else m.activated_at end
     returning m.%1$I', p_counter)
    into v_val using p_user, p_site, p_delta;
  return v_val;
end
$$;
revoke all on function public.bump_world_counter(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.bump_world_counter(uuid, text, text, integer) to service_role;

-- public_passport: one row per visible stamp (show_elsewhere true, activated, not banned) of p_username;
-- passport_xp only when passport_prefs.show_passport_level, else null; showcase_badges filtered to badges of
-- visible stamps. Fail closed: no visible stamp, no row.
create or replace function public.public_passport(p_username text)
  returns table (username text, display_name text, avatar_url text, site_id text, joined_at timestamptz,
                 xp integer, quizzes_created integer, daily_streak integer, passport_xp integer, showcase_badges text[])
  language plpgsql stable security definer set search_path = public
  as $$
#variable_conflict use_column
begin
  return query
  with me as (
    select p.id, p.username, p.display_name, p.avatar_url, p.xp as k_xp, p.daily_streak as k_streak,
           p.total_quizzes_created as k_created
      from public.profiles p
     where p.username = lower(btrim(p_username)) and p.banned_at is null
  ), vis as (
    select me.id, me.username, me.display_name, me.avatar_url, m.site_id, m.joined_at,
           case when m.site_id = 'kpop' then me.k_xp else coalesce(m.xp, 0) end as v_xp,
           case when m.site_id = 'kpop' then me.k_created else coalesce(m.quizzes_created, 0) end as v_created,
           case when m.site_id = 'kpop' then me.k_streak else coalesce(m.daily_streak, 0) end as v_streak
      from me
      join public.world_memberships m on m.user_id = me.id
     where m.show_elsewhere and m.activated_at is not null and m.banned_at is null
  )
  select v.username, v.display_name, v.avatar_url, v.site_id, v.joined_at, v.v_xp, v.v_created, v.v_streak,
         case when coalesce(pp.show_passport_level, false) then (sum(v.v_xp) over ())::integer end,
         case when pp.user_id is null then '{}'::text[]
              else coalesce(array(
                     select u.b from unnest(pp.showcase_badges) with ordinality as u(b, ord)
                       join public.badge_definitions bd on bd.id = u.b
                      where bd.site_id in (select vv.site_id from vis vv)
                      order by u.ord), '{}'::text[])
         end
    from vis v
    left join public.passport_prefs pp on pp.user_id = v.id
   order by v.joined_at, v.site_id;
end
$$;
revoke all on function public.public_passport(text) from public, anon, authenticated;
grant execute on function public.public_passport(text) to anon, authenticated, service_role;

-- my_passport: auth.uid()'s full summary, one row per membership (bunnyverse.org/passport, /api/n/me). plays: kpop
-- profiles.quizzes_played + blindtests_played; other sites quizzes_played + blindtests_played + games_played of the
-- membership (NetMe.sites[].plays, rpcs.md 2).
create or replace function public.my_passport()
  returns table (site_id text, joined_at timestamptz, joined_via text, via_code text, activated_at timestamptz,
                 xp integer, plays integer, daily_streak integer, quizzes_created integer, show_elsewhere boolean)
  language plpgsql stable security definer set search_path = public
  as $$
#variable_conflict use_column
begin
  return query
  select m.site_id, m.joined_at, m.joined_via, m.via_code, m.activated_at,
         case when m.site_id = 'kpop' then p.xp else coalesce(m.xp, 0) end,
         case when m.site_id = 'kpop' then p.quizzes_played + p.blindtests_played
              else coalesce(m.quizzes_played, 0) + coalesce(m.blindtests_played, 0) + coalesce(m.games_played, 0) end,
         case when m.site_id = 'kpop' then p.daily_streak else coalesce(m.daily_streak, 0) end,
         case when m.site_id = 'kpop' then p.total_quizzes_created else coalesce(m.quizzes_created, 0) end,
         m.show_elsewhere
    from public.world_memberships m
    join public.profiles p on p.id = m.user_id
   where m.user_id = auth.uid()
   order by m.joined_at, m.site_id;
end
$$;
revoke all on function public.my_passport() from public, anon, authenticated;
grant execute on function public.my_passport() to authenticated;

-- update_my_membership: auth.uid()'s row on p_site; p_patch keys allowed on every site: show_elsewhere,
-- auto_continue, notice_seen_at; on non-kpop sites also bio, header_url, profile_theme, pinned_badge_id,
-- display_name_override, avatar_override, tag_text, since_year. Any other key raises.
create or replace function public.update_my_membership(p_site text, p_patch jsonb)
  returns void
  language plpgsql security definer set search_path = public
  as $$
declare
  v_uid   uuid := auth.uid();
  v_any   text[] := array['show_elsewhere', 'auto_continue', 'notice_seen_at'];
  v_other text[] := array['bio', 'header_url', 'profile_theme', 'pinned_badge_id', 'display_name_override',
                          'avatar_override', 'tag_text', 'since_year'];
  k       text;
begin
  if v_uid is null then
    raise exception 'update_my_membership: not signed in';
  end if;
  if p_site is null or p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'update_my_membership: a site and a JSON object are required';
  end if;
  if not exists (select 1 from public.world_memberships m where m.user_id = v_uid and m.site_id = p_site) then
    raise exception 'update_my_membership: no membership on %', p_site;
  end if;

  for k in select jsonb_object_keys(p_patch) loop
    if k = any (v_any) then
      null;
    elsif k = any (v_other) then
      if p_site = 'kpop' then
        raise exception 'update_my_membership: % is not a membership field on kpop (it stays on profiles)', k;
      end if;
    else
      raise exception 'update_my_membership: unknown key %', k;
    end if;
  end loop;

  for k in select jsonb_object_keys(p_patch) loop
    execute format(
      'update public.world_memberships m set %1$I = (jsonb_populate_record(null::public.world_memberships, $1)).%1$I
        where m.user_id = $2 and m.site_id = $3', k)
      using jsonb_build_object(k, p_patch -> k), v_uid, p_site;
  end loop;
end
$$;
revoke all on function public.update_my_membership(text, jsonb) from public, anon, authenticated;
grant execute on function public.update_my_membership(text, jsonb) to authenticated;

-- set_passport_prefs: upsert of auth.uid()'s passport_prefs; p_patch keys: worlds, show_passport_level,
-- showcase_badges, your_sites_menu, crossover_suggestions, welcomed_sites, dismissed. Any other key raises.
-- Top-level keys replace their column, except worlds and dismissed, whose given keys merge into the stored object
-- (a key set to null removes it). showcase_badges holds at most 3 ids of badges the viewer owns.
create or replace function public.set_passport_prefs(p_patch jsonb)
  returns void
  language plpgsql security definer set search_path = public
  as $$
declare
  v_uid uuid := auth.uid();
  k     text;
begin
  if v_uid is null then
    raise exception 'set_passport_prefs: not signed in';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'set_passport_prefs: a JSON object is required';
  end if;
  for k in select jsonb_object_keys(p_patch) loop
    if k not in ('worlds', 'show_passport_level', 'showcase_badges', 'your_sites_menu', 'crossover_suggestions', 'welcomed_sites', 'dismissed') then
      raise exception 'set_passport_prefs: unknown key %', k;
    end if;
  end loop;
  if p_patch ? 'worlds' and jsonb_typeof(p_patch -> 'worlds') <> 'object' then
    raise exception 'set_passport_prefs: worlds must be an object';
  end if;
  if p_patch ? 'dismissed' then
    if jsonb_typeof(p_patch -> 'dismissed') <> 'object' then
      raise exception 'set_passport_prefs: dismissed must be an object';
    end if;
    if exists (select 1 from jsonb_object_keys(p_patch -> 'dismissed') d(key) where d.key like 'anon\_merged\_%') then
      raise exception 'set_passport_prefs: reserved dismissed key';
    end if;
  end if;
  if p_patch ? 'showcase_badges' then
    if jsonb_typeof(p_patch -> 'showcase_badges') <> 'array' or jsonb_array_length(p_patch -> 'showcase_badges') > 3 then
      raise exception 'set_passport_prefs: showcase_badges is an array of at most 3 badge ids';
    end if;
    if exists (select 1 from jsonb_array_elements_text(p_patch -> 'showcase_badges') b(id)
                where not exists (select 1 from public.user_badges ub where ub.user_id = v_uid and ub.badge_id = b.id)) then
      raise exception 'set_passport_prefs: showcase_badges holds a badge the member does not own';
    end if;
  end if;
  if p_patch ? 'welcomed_sites' and jsonb_typeof(p_patch -> 'welcomed_sites') <> 'array' then
    raise exception 'set_passport_prefs: welcomed_sites must be an array';
  end if;

  insert into public.passport_prefs (user_id) values (v_uid) on conflict (user_id) do nothing;

  update public.passport_prefs pp set
    worlds = case when p_patch ? 'worlds' then
      coalesce((select jsonb_object_agg(e.key, e.value) from (
        select o.key, o.value from jsonb_each(pp.worlds) o where not ((p_patch -> 'worlds') ? o.key)
        union all
        select n.key, n.value from jsonb_each(p_patch -> 'worlds') n where n.value <> 'null'::jsonb
      ) e), '{}'::jsonb) else pp.worlds end,
    show_passport_level = case when p_patch ? 'show_passport_level' then (p_patch ->> 'show_passport_level')::boolean else pp.show_passport_level end,
    showcase_badges = case when p_patch ? 'showcase_badges' then array(select jsonb_array_elements_text(p_patch -> 'showcase_badges')) else pp.showcase_badges end,
    your_sites_menu = case when p_patch ? 'your_sites_menu' then p_patch ->> 'your_sites_menu' else pp.your_sites_menu end,
    crossover_suggestions = case when p_patch ? 'crossover_suggestions' then (p_patch ->> 'crossover_suggestions')::boolean else pp.crossover_suggestions end,
    welcomed_sites = case when p_patch ? 'welcomed_sites' then array(select jsonb_array_elements_text(p_patch -> 'welcomed_sites')) else pp.welcomed_sites end,
    dismissed = case when p_patch ? 'dismissed' then
      coalesce((select jsonb_object_agg(e.key, e.value) from (
        select o.key, o.value from jsonb_each(pp.dismissed) o where not ((p_patch -> 'dismissed') ? o.key)
        union all
        select n.key, n.value from jsonb_each(p_patch -> 'dismissed') n where n.value <> 'null'::jsonb
      ) e), '{}'::jsonb) else pp.dismissed end,
    updated_at = now()
  where pp.user_id = v_uid;
end
$$;
revoke all on function public.set_passport_prefs(jsonb) from public, anon, authenticated;
grant execute on function public.set_passport_prefs(jsonb) to authenticated;
