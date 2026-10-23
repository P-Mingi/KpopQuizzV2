-- Lot (c) part 1, lane B3, checks 1 and 2 plus the behaviour of the 003 to 008 functions on o1-scratch.
--
-- Everything runs inside BEGIN ... ROLLBACK (nothing persists), except the first block, which only reads the rows at
-- rest. Output: lines "CHK <name> ok" or "CHK <name> FAIL <detail>", then "CHK TOTAL pass=<n> fail=<n>".
-- Variable (optional): -v xp_before=<sum of profiles.xp measured before 003>; without it that one check prints the value.
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset footer off
set client_min_messages = warning;

-- ---------------------------------------------------------------------------------------------------------------
-- Check 1, at rest: the backfill and the data untouched.
-- ---------------------------------------------------------------------------------------------------------------
select 'CHK1 kpop memberships = profiles: ' || (select count(*) from public.world_memberships where site_id = 'kpop') || ' = ' || (select count(*) from public.profiles)
       || case when (select count(*) from public.world_memberships where site_id = 'kpop') = (select count(*) from public.profiles) then ' ok' else ' FAIL' end;
select 'CHK1 sum(profiles.xp) = ' || coalesce(sum(xp), 0) || case when :'xp_before' = '' then ' (no baseline given)' when coalesce(sum(xp), 0)::text = :'xp_before' then ' ok (unchanged)' else ' FAIL (before ' || :'xp_before' || ')' end from public.profiles;
select 'CHK1 badge_definitions with site_id <> kpop: ' || count(*) || case when count(*) = 0 then ' ok' else ' FAIL' end from public.badge_definitions where site_id <> 'kpop';
select 'CHK1 kpop memberships carrying progression: ' || count(*) || case when count(*) = 0 then ' ok' else ' FAIL' end from public.world_memberships where site_id = 'kpop' and (xp is not null or daily_streak is not null or quizzes_played is not null);
select 'CHK1 profiles without a kpop membership: ' || count(*) || case when count(*) = 0 then ' ok' else ' FAIL' end from public.profiles p where not exists (select 1 from public.world_memberships m where m.user_id = p.id and m.site_id = 'kpop');

begin;

create temp table chk_results (n serial, name text, ok boolean, detail text);
create function pg_temp.chk(p_name text, p_ok boolean, p_detail text default null) returns void language sql as $$
  insert into chk_results (name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail);
$$;
-- runs one statement (one text column, one row) as a role with a JWT subject, returns the text or 'ERR:<sqlstate>:<message>'
create function pg_temp.as_role(p_role text, p_sub uuid, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_sub::text, ''), true);
  execute format('set local role %I', p_role);
  begin
    execute p_sql into v;
  exception when others then
    v := 'ERR:' || sqlstate || ':' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  return coalesce(v, 'null');
end $$;
-- runs one DML statement as a role with a JWT subject, returns the row count or 'ERR:<sqlstate>:<message>'
create function pg_temp.dml(p_role text, p_sub uuid, p_sql text) returns text language plpgsql as $$
declare v text; n bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_sub::text, ''), true);
  execute format('set local role %I', p_role);
  begin
    execute p_sql;
    get diagnostics n = row_count;
    v := n::text;
  exception when others then
    v := 'ERR:' || sqlstate || ':' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  return v;
end $$;
-- true when the statement raises
create function pg_temp.raises(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Fixtures: users A (kpop member), B, C, D, E, U (unconfirmed), X (banned); an anime group and quiz.
-- ---------------------------------------------------------------------------------------------------------------
create temp table u as
  select k, md5('chk-b3-user-' || k)::uuid as id, 'chk_' || lower(k) as username
  from unnest(array['A', 'B', 'C', 'D', 'E', 'U', 'X']) k;
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
select id, 'authenticated', 'authenticated', username || '@chk-b3.invalid', case when k = 'U' then null else now() end, '{}'::jsonb, '{}'::jsonb, now(), now() from u;
insert into public.profiles (id, username, avatar_bg, avatar_text) select id, username, '#222222', 'C' from u;
update public.profiles set banned_at = now() where id = (select id from u where k = 'X');
create function pg_temp.uid(p_k text) returns uuid language sql as $$ select id from u where k = p_k $$;

insert into public.badge_definitions (id, name, description, icon_type, color_bg, color_stroke, color_text, site_id) values
  ('first_steps', 'Chk first steps', 'd', 'star', '#000', '#111', '#fff', 'kpop'),
  ('anime_first_steps', 'Chk anime first steps', 'd', 'star', '#000', '#111', '#fff', 'anime'),
  ('anime_quiz_maker', 'Chk anime quiz maker', 'd', 'star', '#000', '#111', '#fff', 'anime'),
  ('anime_extra', 'Chk anime extra', 'd', 'star', '#000', '#111', '#fff', 'anime');
insert into public.groups (name, slug, display_color, text_color, site_id) values ('Chk Anime Group', 'chk-anime-group', '#123456', '#ffffff', 'anime');
insert into public.groups (name, slug, display_color, text_color) values ('Chk Kpop Group', 'chk-kpop-group', '#123456', '#ffffff');
create temp table g as select id, slug from public.groups where slug in ('chk-anime-group', 'chk-kpop-group');

-- ---------------------------------------------------------------------------------------------------------------
-- Check 2: the sign-up trigger.
-- ---------------------------------------------------------------------------------------------------------------
select pg_temp.chk('2 new profile gets its kpop membership',
  exists (select 1 from public.world_memberships m where m.user_id = pg_temp.uid('A') and m.site_id = 'kpop'
          and m.joined_via = 'signup' and m.activated_at is not null and m.notice_seen_at is not null and m.xp is null)
  and (select count(*) from public.world_memberships where user_id = pg_temp.uid('A')) = 1);

-- a profile created with app.site_id = 'anime' gets an anime membership, not activated, and no kpop one
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values (md5('chk-b3-anime-new')::uuid, 'authenticated', 'authenticated', 'chk_anime_new@chk-b3.invalid', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
select set_config('app.site_id', 'anime', true);
insert into public.profiles (id, username, avatar_bg, avatar_text) values (md5('chk-b3-anime-new')::uuid, 'chk_anime_new', '#222222', 'N');
select set_config('app.site_id', '', true);
select pg_temp.chk('2 app.site_id = anime gives an anime membership',
  (select array_agg(site_id order by site_id) from public.world_memberships where user_id = md5('chk-b3-anime-new')::uuid) = array['anime']
  and (select activated_at is null and notice_seen_at is null from public.world_memberships where user_id = md5('chk-b3-anime-new')::uuid and site_id = 'anime'));

-- a forced failure inside the trigger function (unknown site: the foreign key fails) does not block the insert
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values (md5('chk-b3-forced')::uuid, 'authenticated', 'authenticated', 'chk_forced@chk-b3.invalid', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
select set_config('app.site_id', 'nosuchsite', true);
insert into public.profiles (id, username, avatar_bg, avatar_text) values (md5('chk-b3-forced')::uuid, 'chk_forced', '#222222', 'F');
select set_config('app.site_id', '', true);
select pg_temp.chk('2 a forced failure in the trigger does not block the profile insert',
  exists (select 1 from public.profiles where id = md5('chk-b3-forced')::uuid)
  and not exists (select 1 from public.world_memberships where user_id = md5('chk-b3-forced')::uuid));
-- a second forced failure: the table check (a kpop row with progression cannot be made by the trigger, so break the site column type with a long id)
select pg_temp.chk('2 award_world_xp(kpop) raises', pg_temp.raises($q$select public.award_world_xp(pg_temp.uid('A'), 'kpop', 5, 'play')$q$));
select pg_temp.chk('2 bump_world_counter(kpop) raises', pg_temp.raises($q$select public.bump_world_counter(pg_temp.uid('A'), 'kpop', 'quizzes_played', 1)$q$));
select pg_temp.chk('2 bump_world_counter refuses an unknown counter', pg_temp.raises($q$select public.bump_world_counter(pg_temp.uid('A'), 'anime', 'xp', 1)$q$));

-- ---------------------------------------------------------------------------------------------------------------
-- ACL matrix (has_function_privilege / has_table_privilege / has_schema_privilege). service_role keeps the EXECUTE that
-- Supabase's default privileges give it on every function (schema.sql header); anon and authenticated only where listed.
-- ---------------------------------------------------------------------------------------------------------------
select pg_temp.chk('acl ' || f.sig || ' ' || r.role, has_function_privilege(r.role, f.sig, 'execute') = (r.role = 'service_role' or r.role = any (f.allowed)),
                   'has=' || has_function_privilege(r.role, f.sig, 'execute'))
from (values
  ('public.profiles_membership()', array[]::text[]),
  ('public.ensure_membership(text, text, text)', array['authenticated', 'service_role']),
  ('public.create_profile_for_site(text, text, text, text, text, text, uuid)', array['authenticated', 'service_role']),
  ('public.world_follows_counts()', array[]::text[]),
  ('public.net_bridge_bump(text, text, text, text, boolean, integer)', array['service_role']),
  ('public.passport_issue_code(uuid, text, text, text, text, text, text, text)', array['service_role']),
  ('public.passport_redeem_code(text, text, text, text, text, text)', array['service_role']),
  ('public.passport_log_event(text, uuid, text, text, text, text, text)', array['service_role']),
  ('public.passport_cleanup()', array['service_role']),
  ('public.award_world_xp(uuid, text, integer, text)', array['service_role']),
  ('public.bump_world_counter(uuid, text, text, integer)', array['service_role']),
  ('public.public_passport(text)', array['anon', 'authenticated', 'service_role']),
  ('public.my_passport()', array['authenticated']),
  ('public.update_my_membership(text, jsonb)', array['authenticated']),
  ('public.set_passport_prefs(jsonb)', array['authenticated'])
) as f(sig, allowed)
cross join (values ('anon'), ('authenticated'), ('service_role')) as r(role);
select pg_temp.chk('acl PUBLIC cannot execute the new functions',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace
              and p.proname in ('profiles_membership', 'ensure_membership', 'create_profile_for_site', 'world_follows_counts', 'net_bridge_bump',
                                'passport_issue_code', 'passport_redeem_code', 'passport_log_event', 'passport_cleanup', 'award_world_xp',
                                'bump_world_counter', 'public_passport', 'my_passport', 'update_my_membership', 'set_passport_prefs')
              and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')));
select pg_temp.chk('acl merge_anon_passport: PUBLIC, anon and authenticated revoked, service_role keeps EXECUTE (S4, D-100)',
  (select p.proacl::text from pg_proc p where p.proname = 'merge_anon_passport' and p.pronamespace = 'public'::regnamespace) = '{postgres=X/postgres,service_role=X/postgres}',
  (select p.proacl::text from pg_proc p where p.proname = 'merge_anon_passport' and p.pronamespace = 'public'::regnamespace));
select pg_temp.chk('acl passport schema and tables closed to anon and authenticated',
  not has_schema_privilege('anon', 'passport', 'usage') and not has_schema_privilege('authenticated', 'passport', 'usage')
  and has_schema_privilege('service_role', 'passport', 'usage')
  and not has_table_privilege('anon', 'passport.handoff_codes', 'select') and not has_table_privilege('authenticated', 'passport.handoff_events', 'select'));
select pg_temp.chk('acl bridge_daily closed to anon and authenticated',
  not has_table_privilege('anon', 'public.bridge_daily', 'select') and not has_table_privilege('authenticated', 'public.bridge_daily', 'select')
  and (select relrowsecurity from pg_class where oid = 'public.bridge_daily'::regclass));
select pg_temp.chk('rls enabled on the new tables',
  (select bool_and(relrowsecurity) from pg_class where oid in ('public.world_memberships'::regclass, 'public.passport_prefs'::regclass,
     'public.favourites'::regclass, 'public.world_follows'::regclass, 'passport.handoff_codes'::regclass, 'passport.handoff_events'::regclass)));
select pg_temp.chk('the 5 locked trigger names are unchanged',
  (select count(*) from pg_trigger where not tgisinternal and tgname in ('on_quiz_insert', 'trg_notify_badge_earned', 'group_quiz_alerts_on_insert',
     'group_quiz_alerts_on_publish', 'trg_passport_on_battle_result')) = 5);

-- ---------------------------------------------------------------------------------------------------------------
-- ensure_membership, my_passport, update_my_membership, set_passport_prefs as a signed-in user.
-- ---------------------------------------------------------------------------------------------------------------
select pg_temp.chk('ensure_membership: created on first call',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select (select created::text from public.ensure_membership('anime', 'jump', 'k.abc'))$q$) = 'true');
select pg_temp.chk('ensure_membership: second call created = false, first via wins',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select (select created::text || joined_via from public.ensure_membership('anime', 'signup', null))$q$) = 'falsejump');
select pg_temp.chk('ensure_membership: via_code stored', (select via_code from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime') = 'k.abc');
select pg_temp.chk('ensure_membership: anime stamp not activated',
  (select activated_at is null from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime'));
select pg_temp.chk('ensure_membership: an existing kpop stamp is left alone (created = false)',
  pg_temp.as_role('authenticated', pg_temp.uid('A'), $q$select (select created::text from public.ensure_membership('kpop', 'signup', null))$q$) = 'false');
select pg_temp.chk('ensure_membership: needs a session', pg_temp.as_role('authenticated', null, $q$select (select created::text from public.ensure_membership('anime', 'jump', null))$q$) like 'ERR:%');
select pg_temp.chk('ensure_membership: refuses a bad via', pg_temp.as_role('authenticated', pg_temp.uid('C'), $q$select (select created::text from public.ensure_membership('anime', 'nope', null))$q$) like 'ERR:%');
select pg_temp.chk('ensure_membership: refuses a bad via_code', pg_temp.as_role('authenticated', pg_temp.uid('C'), $q$select (select created::text from public.ensure_membership('anime', 'jump', 'x.abc'))$q$) like 'ERR:%');
select pg_temp.chk('ensure_membership: refuses an unknown site', pg_temp.as_role('authenticated', pg_temp.uid('C'), $q$select (select created::text from public.ensure_membership('nosuch', 'jump', null))$q$) like 'ERR:%');

select pg_temp.chk('my_passport: one row per stamp, kpop values from profiles',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select string_agg(site_id || ':' || xp || ':' || plays, ',' order by site_id) from public.my_passport()$q$) = 'anime:0:0,kpop:0:0');
select pg_temp.chk('my_passport: empty without a session', pg_temp.as_role('authenticated', null, $q$select count(*)::text from public.my_passport()$q$) = '0');
select pg_temp.chk('world_memberships: a user reads only their own rows',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select count(*)::text from public.world_memberships$q$) = '2'
  and pg_temp.as_role('anon', null, $q$select count(*)::text from public.world_memberships$q$) = '0');
select pg_temp.chk('world_memberships: no write for authenticated',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$with i as (insert into public.world_memberships (user_id, site_id) values (md5('chk-b3-user-B')::uuid, 'hub') returning 1) select count(*)::text from i$q$) like 'ERR:%'
  and pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$with d as (delete from public.world_memberships returning 1) select count(*)::text from d$q$) = '0');

select pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.update_my_membership('anime', '{"show_elsewhere": true, "auto_continue": true}'::jsonb)::text$q$) as r1 \gset
select pg_temp.chk('update_my_membership: any-site keys on anime',
  :'r1' = ''
  and (select show_elsewhere and auto_continue from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime'));
select pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.update_my_membership('anime', '{"bio": "hello", "tag_text": "tag", "since_year": 2019, "avatar_override": {"avatar_bg": "#fff"}, "profile_theme": "dark"}'::jsonb)::text$q$) as r1 \gset
select pg_temp.chk('update_my_membership: presentation keys on anime',
  :'r1' = ''
  and (select bio = 'hello' and tag_text = 'tag' and since_year = 2019 and avatar_override ->> 'avatar_bg' = '#fff' and profile_theme = 'dark'
         from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime'));
select pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.update_my_membership('anime', '{"bio": null}'::jsonb)::text$q$) as r1 \gset
select pg_temp.chk('update_my_membership: null clears a nullable column',
  :'r1' = ''
  and (select bio is null from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime'));
select pg_temp.chk('update_my_membership: a presentation key raises on kpop',
  pg_temp.as_role('authenticated', pg_temp.uid('A'), $q$select public.update_my_membership('kpop', '{"bio": "x"}'::jsonb)::text$q$) like 'ERR:%');
select pg_temp.chk('update_my_membership: any-site key works on kpop',
  pg_temp.as_role('authenticated', pg_temp.uid('A'), $q$select public.update_my_membership('kpop', '{"show_elsewhere": true}'::jsonb)::text$q$) = '');
select pg_temp.chk('update_my_membership: an unknown key raises (xp is not patchable)',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.update_my_membership('anime', '{"xp": 100}'::jsonb)::text$q$) like 'ERR:%');
select pg_temp.chk('update_my_membership: a missing membership raises',
  pg_temp.as_role('authenticated', pg_temp.uid('C'), $q$select public.update_my_membership('anime', '{"bio": "x"}'::jsonb)::text$q$) like 'ERR:%');
select pg_temp.chk('update_my_membership: a table check raises (bio over 160)',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), format($q$select public.update_my_membership('anime', '{"bio": "%s"}'::jsonb)::text$q$, repeat('x', 161))) like 'ERR:%');
select pg_temp.chk('update_my_membership: a not-null column cannot be cleared',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.update_my_membership('anime', '{"show_elsewhere": null}'::jsonb)::text$q$) like 'ERR:%');

select pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.set_passport_prefs('{"show_passport_level": true, "your_sites_menu": "show", "crossover_suggestions": false, "welcomed_sites": ["anime"]}'::jsonb)::text$q$) as r1 \gset
select pg_temp.chk('set_passport_prefs: replaces plain keys',
  :'r1' = ''
  and (select show_passport_level and your_sites_menu = 'show' and not crossover_suggestions and welcomed_sites = array['anime'] from public.passport_prefs where user_id = pg_temp.uid('B')));
select pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.set_passport_prefs('{"worlds": {"anime": {"optin": true}, "hub": 1}, "dismissed": {"ab": "2030-01-01", "cd": "2030-02-02"}}'::jsonb)::text$q$) as r1 \gset
select pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.set_passport_prefs('{"worlds": {"hub": null, "kpop": {"x": 1}}, "dismissed": {"ab": null}}'::jsonb)::text$q$) as r2 \gset
select pg_temp.chk('set_passport_prefs: worlds and dismissed merge, null removes a key',
  :'r1' = '' and :'r2' = ''
  and (select worlds = '{"anime": {"optin": true}, "kpop": {"x": 1}}'::jsonb and dismissed = '{"cd": "2030-02-02"}'::jsonb from public.passport_prefs where user_id = pg_temp.uid('B')));
select pg_temp.chk('set_passport_prefs: unknown key raises', pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.set_passport_prefs('{"user_id": "x"}'::jsonb)::text$q$) like 'ERR:%');
select pg_temp.chk('set_passport_prefs: the anon_merged_ marker key is refused',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.set_passport_prefs('{"dismissed": {"anon_merged_anime": null}}'::jsonb)::text$q$) like 'ERR:%');
select pg_temp.chk('set_passport_prefs: showcase_badges needs owned badges, at most 3',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.set_passport_prefs('{"showcase_badges": ["anime_extra"]}'::jsonb)::text$q$) like 'ERR:%'
  and pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.set_passport_prefs('{"showcase_badges": ["a", "b", "c", "d"]}'::jsonb)::text$q$) like 'ERR:%');
insert into public.user_badges (user_id, badge_id) values (pg_temp.uid('B'), 'anime_extra'), (pg_temp.uid('B'), 'first_steps');
select pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select public.set_passport_prefs('{"showcase_badges": ["anime_extra", "first_steps"]}'::jsonb)::text$q$) as r1 \gset
select pg_temp.chk('set_passport_prefs: showcase_badges accepts owned badges',
  :'r1' = ''
  and (select showcase_badges = array['anime_extra', 'first_steps'] from public.passport_prefs where user_id = pg_temp.uid('B')));
select pg_temp.chk('passport_prefs: a user reads only their own row',
  pg_temp.as_role('authenticated', pg_temp.uid('B'), $q$select count(*)::text from public.passport_prefs$q$) = '1'
  and pg_temp.as_role('authenticated', pg_temp.uid('C'), $q$select count(*)::text from public.passport_prefs$q$) = '0');

-- ---------------------------------------------------------------------------------------------------------------
-- public_passport. State of B: anime stamp (show_elsewhere true, not yet activated), kpop stamp (hidden); prefs with
-- show_passport_level true and showcase [anime_extra, first_steps].
-- ---------------------------------------------------------------------------------------------------------------
select pg_temp.chk('public_passport: a stamp that is not activated is not visible', (select count(*) from public.public_passport('chk_b')) = 0);
select public.bump_world_counter(pg_temp.uid('B'), 'anime', 'quizzes_created', 4) as _ \gset
select pg_temp.chk('public_passport: the activated anime stamp shows alone, the hidden kpop stamp does not',
  (select string_agg(site_id || ':' || quizzes_created || ':' || passport_xp || ':' || showcase_badges::text, ',') from public.public_passport('chk_b')) = 'anime:4:0:{anime_extra}',
  (select string_agg(site_id || ':' || quizzes_created || ':' || coalesce(passport_xp::text, 'null') || ':' || showcase_badges::text, ',') from public.public_passport('chk_b')));
select public.award_world_xp(pg_temp.uid('B'), 'anime', 40, 'play') as _ \gset
update public.world_memberships set show_elsewhere = true where user_id = pg_temp.uid('B') and site_id = 'kpop';
select pg_temp.chk('public_passport: two visible stamps, passport_xp is their sum, showcase spans both',
  (select string_agg(site_id || ':' || xp || ':' || passport_xp || ':' || showcase_badges::text, ',' order by site_id) from public.public_passport('chk_b'))
    = 'anime:40:40:{anime_extra,first_steps},kpop:0:40:{anime_extra,first_steps}',
  (select string_agg(site_id || ':' || xp || ':' || coalesce(passport_xp::text, 'null') || ':' || showcase_badges::text, ',' order by site_id) from public.public_passport('chk_b')));
update public.passport_prefs set show_passport_level = false where user_id = pg_temp.uid('B');
select pg_temp.chk('public_passport: passport_xp is null while show_passport_level is off',
  (select count(*) from public.public_passport('chk_b') where passport_xp is not null) = 0 and (select count(*) from public.public_passport('chk_b')) = 2);
update public.passport_prefs set show_passport_level = true where user_id = pg_temp.uid('B');
update public.world_memberships set show_elsewhere = false where user_id = pg_temp.uid('B') and site_id = 'anime';
select pg_temp.chk('public_passport: a hidden world drops out of the showcase and of passport_xp',
  (select string_agg(site_id || ':' || passport_xp || ':' || showcase_badges::text, ',') from public.public_passport('chk_b')) = 'kpop:0:{first_steps}');
update public.world_memberships set show_elsewhere = false where user_id = pg_temp.uid('B');
select pg_temp.chk('public_passport: no visible stamp, no row (fail closed)', (select count(*) from public.public_passport('chk_b')) = 0);
update public.world_memberships set show_elsewhere = true where user_id = pg_temp.uid('B') and site_id = 'anime';
select pg_temp.chk('public_passport: anon can call it', pg_temp.as_role('anon', null, $q$select count(*)::text from public.public_passport('CHK_B')$q$) = '1');
update public.world_memberships set banned_at = now() where user_id = pg_temp.uid('B') and site_id = 'anime';
select pg_temp.chk('public_passport: a banned stamp shows nothing', (select count(*) from public.public_passport('chk_b')) = 0);
update public.world_memberships set banned_at = null where user_id = pg_temp.uid('B') and site_id = 'anime';
update public.profiles set banned_at = now() where id = pg_temp.uid('B');
select pg_temp.chk('public_passport: a banned profile shows nothing', (select count(*) from public.public_passport('chk_b')) = 0);
update public.profiles set banned_at = null where id = pg_temp.uid('B');
select pg_temp.chk('public_passport: unknown username, no row', (select count(*) from public.public_passport('nobody_here')) = 0);

-- ---------------------------------------------------------------------------------------------------------------
-- 007 helpers.
-- ---------------------------------------------------------------------------------------------------------------
select public.bump_world_counter(pg_temp.uid('C'), 'anime', 'quizzes_played', 2) as r1 \gset
select public.bump_world_counter(pg_temp.uid('C'), 'anime', 'quizzes_played', -5) as r2 \gset
select pg_temp.chk('bump_world_counter: creates the stamp (play), activates, returns the new value, clamps at 0',
  :r1 = 2 and :r2 = 0
  and (select joined_via = 'play' and activated_at is not null and first_play_at is null from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime'));
select pg_temp.chk('bump_world_counter: null user and missing profile are ignored',
  public.bump_world_counter(null, 'anime', 'games_played', 1) is null and public.bump_world_counter(gen_random_uuid(), 'anime', 'games_played', 1) is null);
select public.award_world_xp(pg_temp.uid('D'), 'anime', 25, 'play') as r1 \gset
select public.award_world_xp(pg_temp.uid('D'), 'anime', 5, 'daily') as r2 \gset
select pg_temp.chk('award_world_xp: adds xp; no badge while the world defines none for the rule',
  :r1 = 25 and :r2 = 30
  and (select count(*) from public.user_badges where user_id = pg_temp.uid('D')) = 0);

-- ---------------------------------------------------------------------------------------------------------------
-- 008: the world branches never write a kpop column; the kpop branches still do. D follows both groups first.
-- ---------------------------------------------------------------------------------------------------------------
insert into public.group_quiz_alerts (user_id, group_id) select pg_temp.uid('D'), g.id from g;
insert into public.quizzes (id, creator_id, group_id, title, slug, questions, site_id)
select md5('chk-b3-quiz-anime')::uuid, pg_temp.uid('B'), g.id, 'Chk anime quiz', 'chk-anime-quiz', '[1, 2, 3]'::jsonb, 'anime' from g where g.slug = 'chk-anime-group';
insert into public.quizzes (id, creator_id, group_id, title, slug, questions)
select md5('chk-b3-quiz-kpop')::uuid, pg_temp.uid('A'), g.id, 'Chk kpop quiz', 'chk-kpop-quiz', '[1, 2, 3]'::jsonb from g where g.slug = 'chk-kpop-group';

select pg_temp.chk('008 handle_new_quiz: an anime quiz counts on the world, not on profiles',
  (select total_quizzes_created from public.profiles where id = pg_temp.uid('B')) = 0
  and (select quizzes_created from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime') = 5
  and (select quiz_count from public.groups where slug = 'chk-anime-group') = 1);
select pg_temp.chk('008 handle_new_quiz: a kpop quiz counts on profiles as today',
  (select total_quizzes_created from public.profiles where id = pg_temp.uid('A')) = 1
  and (select quiz_count from public.groups where slug = 'chk-kpop-group') = 1
  and not exists (select 1 from public.world_memberships where user_id = pg_temp.uid('A') and site_id = 'anime'));
select pg_temp.chk('008 activity: the world event is filed under anime, the kpop one under kpop',
  (select site_id from public.activity_events where event_type = 'quiz_created' and group_slug = 'chk-anime-group') = 'anime'
  and (select site_id from public.activity_events where event_type = 'quiz_created' and group_slug = 'chk-kpop-group') = 'kpop'
  and (select display_name from public.activity_events where event_type = 'quiz_created' and group_slug = 'chk-anime-group') = 'chk_b');
select pg_temp.chk('008 notify_group_quiz_alerts: the notification carries the quiz site',
  (select string_agg(site_id || ':' || link_url, ',' order by site_id) from public.creator_notifications where user_id = pg_temp.uid('D') and type = 'followed_new_quiz')
    = 'anime:/q/chk-anime-quiz,kpop:/q/chk-kpop-quiz');

select pg_temp.chk('008 notify_badge_earned: a badge notification carries the badge site',
  (select string_agg(site_id, ',' order by site_id) from public.creator_notifications where user_id = pg_temp.uid('B') and type = 'badge_earned') = 'anime,kpop');

-- plays
select (select count(*) from public.record_play(md5('chk-b3-quiz-anime')::uuid, pg_temp.uid('C'), 8, 10, 30)) as _ \gset
select (select count(*) from public.record_play(md5('chk-b3-quiz-anime')::uuid, pg_temp.uid('C'), 10, 10, 30)) as _ \gset
select (select count(*) from public.record_play(md5('chk-b3-quiz-anime')::uuid, null, 5, 10, 30)) as _ \gset
select pg_temp.chk('008 record_play (anime): world counters move, profiles do not',
  (select quizzes_played from public.profiles where id = pg_temp.uid('C')) = 0
  and (select total_plays_received from public.profiles where id = pg_temp.uid('B')) = 0
  and (select plays_received from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime') = 3
  and (select quizzes_played from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') = 1
  and (select play_count from public.quizzes where id = md5('chk-b3-quiz-anime')::uuid) = 3
  and (select total_plays from public.groups where slug = 'chk-anime-group') = 3
  and (select count(*) from public.plays where quiz_id = md5('chk-b3-quiz-anime')::uuid) = 3
  and not exists (select 1 from public.player_group_mastery m join g on g.id = m.group_id where g.slug = 'chk-anime-group'),
  (select quizzes_played from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime')::text);
select pg_temp.chk('008 record_play (anime): activity under anime (perfect_score and quiz_completed)',
  (select string_agg(event_type || ':' || site_id || ':' || display_name, ',' order by event_type, display_name) from public.activity_events where event_type in ('perfect_score', 'quiz_completed') and group_slug = 'chk-anime-group')
    = 'perfect_score:anime:chk_c,quiz_completed:anime:chk_c,quiz_completed:anime:someone');
select (select count(*) from public.record_play(md5('chk-b3-quiz-kpop')::uuid, pg_temp.uid('C'), 8, 10, 30)) as _ \gset
select pg_temp.chk('008 record_play (kpop): profiles move as today, mastery row written',
  (select quizzes_played from public.profiles where id = pg_temp.uid('C')) = 1
  and (select total_plays_received from public.profiles where id = pg_temp.uid('A')) = 1
  and (select quizzes_played from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') = 1
  and (select count(*) from public.player_group_mastery m join g on g.id = m.group_id where g.slug = 'chk-kpop-group') = 1);

-- likes
select public.increment_like_count(md5('chk-b3-quiz-anime')::uuid) as _ \gset
select pg_temp.chk('008 increment_like_count (anime)',
  (select total_likes_received from public.profiles where id = pg_temp.uid('B')) = 0
  and (select likes_received from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime') = 1
  and (select like_count from public.quizzes where id = md5('chk-b3-quiz-anime')::uuid) = 1);
select public.decrement_like_count(md5('chk-b3-quiz-anime')::uuid) as _ \gset
select public.decrement_like_count(md5('chk-b3-quiz-anime')::uuid) as _ \gset
select pg_temp.chk('008 decrement_like_count (anime): clamps at 0',
  (select likes_received from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime') = 0
  and (select like_count from public.quizzes where id = md5('chk-b3-quiz-anime')::uuid) = 0);
select public.increment_like_count(md5('chk-b3-quiz-kpop')::uuid) as _ \gset
select pg_temp.chk('008 increment_like_count (kpop): profiles as today',
  (select total_likes_received from public.profiles where id = pg_temp.uid('A')) = 1);

-- award_xp counts kpop quizzes only
select public.award_xp(pg_temp.uid('E'), 3, 'play') as _ \gset
select (select count(*) from public.record_play(md5('chk-b3-quiz-anime')::uuid, pg_temp.uid('E'), 8, 10, 30)) as _ \gset
select public.award_xp(pg_temp.uid('E'), 3, 'play') as _ \gset
select pg_temp.chk('008 award_xp: an anime play does not earn the kpop first_steps badge',
  not exists (select 1 from public.user_badges where user_id = pg_temp.uid('E') and badge_id = 'first_steps')
  and (select xp from public.profiles where id = pg_temp.uid('E')) = 6);
select (select count(*) from public.record_play(md5('chk-b3-quiz-kpop')::uuid, pg_temp.uid('E'), 8, 10, 30)) as _ \gset
select public.award_xp(pg_temp.uid('E'), 3, 'play') as _ \gset
select pg_temp.chk('008 award_xp: a kpop play earns it',
  exists (select 1 from public.user_badges where user_id = pg_temp.uid('E') and badge_id = 'first_steps'));

-- duels
insert into public.duel_questions (id, group_slug, question_type, prompt, entity_kind) values
  (md5('chk-b3-duel-anime')::uuid, 'chk-anime-group', 'bias', 'Chk duel anime', 'idol'),
  (md5('chk-b3-duel-kpop')::uuid, 'chk-kpop-group', 'bias', 'Chk duel kpop', 'idol');
insert into public.duel_ratings (question_id, entity_id, entity_name, elo, wins, losses, last_delta)
select md5('chk-b3-duel-' || q)::uuid, md5('chk-b3-duel-' || q || '-' || o)::uuid, 'Chk option ' || q || o, 1500, 0, 0, 0
from unnest(array['anime', 'kpop']) q cross join unnest(array['1', '2']) o;
select set_config('request.jwt.claim.sub', pg_temp.uid('C')::text, true) as _ \gset
select (select count(*) from public.cast_duel_vote(md5('chk-b3-duel-anime')::uuid, md5('chk-b3-duel-anime-1')::uuid, md5('chk-b3-duel-anime-2')::uuid, md5('chk-b3-duel-anime-1')::uuid, null)) as _ \gset
select pg_temp.chk('008 cast_duel_vote (anime): the vote and the ratings are written, profiles.duels_voted is not',
  (select duels_voted from public.profiles where id = pg_temp.uid('C')) = 0
  and (select elo from public.duel_ratings where entity_id = md5('chk-b3-duel-anime-1')::uuid) = 1512
  and (select site_id from public.activity_events where event_type = 'duel_voted' and group_slug = 'chk-anime-group') = 'anime');
select (select count(*) from public.cast_duel_vote(md5('chk-b3-duel-kpop')::uuid, md5('chk-b3-duel-kpop-1')::uuid, md5('chk-b3-duel-kpop-2')::uuid, md5('chk-b3-duel-kpop-1')::uuid, null)) as _ \gset
select set_config('request.jwt.claim.sub', '', true) as _ \gset
select pg_temp.chk('008 cast_duel_vote (kpop): duels_voted as today',
  (select duels_voted from public.profiles where id = pg_temp.uid('C')) = 1
  and (select site_id from public.activity_events where event_type = 'duel_voted' and group_slug = 'chk-kpop-group') = 'kpop');

-- battles
insert into public.battles (id, quiz_id, group_slug, question_ids, challenger_hash, challenger_score) values
  (md5('chk-b3-battle-anime')::uuid, md5('chk-b3-quiz-anime')::uuid, null, array[md5('q1')::uuid], 'chk-challenger', 3),
  (md5('chk-b3-battle-kpop')::uuid, null, 'chk-kpop-group', array[md5('q1')::uuid], 'chk-challenger', 3);
insert into public.battle_results (battle_id, player_hash, score, per_question, time_ms, user_id) values
  (md5('chk-b3-battle-anime')::uuid, 'chk-player-c', 5, array[true], 1000, pg_temp.uid('C')),
  (md5('chk-b3-battle-kpop')::uuid, 'chk-player-c', 5, array[true], 1000, pg_temp.uid('C'));
select pg_temp.chk('008 passport_on_battle_result: an anime battle is a world game, a kpop one moves profiles',
  (select battles_played || ':' || battles_won from public.profiles where id = pg_temp.uid('C')) = '1:1'
  and (select games_played from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') = 1
  and (select string_agg(site_id, ',' order by site_id) from public.activity_events where event_type = 'battle_won' and display_name = 'chk_c') = 'anime,kpop');

-- blind tests (the world of a play is app.site_id, else kpop: never the groups named in the request)
insert into public.blind_test_songs (id, title, artist, youtube_id, year) values (md5('chk-b3-song')::uuid, 'Chk song', 'Chk artist', 'chkyt1', 2020);
select set_config('app.site_id', 'anime', true) as _ \gset
select public.record_bt_play(pg_temp.uid('C'), 'classic', 100, 5, 10, 30.5, 3,
  jsonb_build_array(jsonb_build_object('song_id', md5('chk-b3-song')::uuid, 'correct', true)), 10,
  (select jsonb_build_array(jsonb_build_object('group_id', g.id, 'mastery_xp', 5)) from g where g.slug = 'chk-anime-group')) as _ \gset
select set_config('app.site_id', '', true) as _ \gset
select pg_temp.chk('008 record_bt_play (app.site_id anime, anime group): only the world counter and activity are written',
  (select blindtests_played from public.profiles where id = pg_temp.uid('C')) = 0
  and (select blindtests_played from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') = 1
  and (select count(*) from public.bt_plays where mode_id = 'classic' and player_id = pg_temp.uid('C')) = 0
  and (select times_played from public.blind_test_songs where youtube_id = 'chkyt1') = 0
  and (select total_songs_played from public.players where id = pg_temp.uid('C')) = 0
  and (select site_id from public.activity_events where event_type = 'blindtest_played' and display_name = 'chk_c') = 'anime');
select public.record_bt_play(pg_temp.uid('C'), 'classic', 100, 5, 10, 30.5, 3,
  jsonb_build_array(jsonb_build_object('song_id', md5('chk-b3-song')::uuid, 'correct', true)), 10,
  (select jsonb_build_array(jsonb_build_object('group_id', g.id, 'mastery_xp', 5)) from g where g.slug = 'chk-kpop-group')) as _ \gset
select pg_temp.chk('008 record_bt_play (kpop group): as today',
  (select blindtests_played from public.profiles where id = pg_temp.uid('C')) = 1
  and (select count(*) from public.bt_plays where mode_id = 'classic' and player_id = pg_temp.uid('C')) = 1
  and (select times_played from public.blind_test_songs where youtube_id = 'chkyt1') = 1
  and (select total_songs_played from public.players where id = pg_temp.uid('C')) = 10);
select set_config('app.site_id', 'anime', true) as _ \gset
select public.record_bt_play(pg_temp.uid('C'), 'classic', 100, 5, 10, 30.5, 3, '[]'::jsonb, 10, null) as _ \gset
select set_config('app.site_id', '', true) as _ \gset
select pg_temp.chk('008 record_bt_play: with no group, app.site_id picks the world',
  (select blindtests_played from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') = 2
  and (select blindtests_played from public.profiles where id = pg_temp.uid('C')) = 1);
select public.record_bt_play(pg_temp.uid('C'), 'classic', 100, 5, 10, 30.5, 3, '[]'::jsonb, 10, '[]'::jsonb) as _ \gset
select pg_temp.chk('008 record_bt_play: an odd mastery payload still takes the kpop path',
  (select blindtests_played from public.profiles where id = pg_temp.uid('C')) = 2);
-- blocker 3 of review R: a kpop call (app.site_id unset) that names a world group stays on the kpop path and writes no
-- world counter, no world activity event and no world membership change
select (select blindtests_played from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') as wm_before,
       (select count(*) from public.world_memberships where user_id = pg_temp.uid('C')) as wms_before,
       (select count(*) from public.activity_events where event_type = 'blindtest_played' and display_name = 'chk_c' and site_id <> 'kpop') as ev_world_before,
       (select count(*) from public.activity_events where event_type = 'blindtest_played' and display_name = 'chk_c' and site_id = 'kpop') as ev_kpop_before,
       (select count(*) from public.bt_plays where mode_id = 'classic' and player_id = pg_temp.uid('C')) as bt_before \gset
select public.record_bt_play(pg_temp.uid('C'), 'classic', 100, 5, 10, 30.5, 3,
  jsonb_build_array(jsonb_build_object('song_id', md5('chk-b3-song')::uuid, 'correct', true)), 10,
  (select jsonb_build_array(jsonb_build_object('group_id', g.id, 'mastery_xp', 5)) from g where g.slug = 'chk-anime-group')) as _ \gset
select pg_temp.chk('008 record_bt_play (kpop call naming an anime group): the kpop path, no world counter, event or membership',
  (select blindtests_played from public.profiles where id = pg_temp.uid('C')) = 3
  and (select blindtests_played from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') = :wm_before
  and (select count(*) from public.world_memberships where user_id = pg_temp.uid('C')) = :wms_before
  and (select count(*) from public.activity_events where event_type = 'blindtest_played' and display_name = 'chk_c' and site_id <> 'kpop') = :ev_world_before
  and (select count(*) from public.activity_events where event_type = 'blindtest_played' and display_name = 'chk_c' and site_id = 'kpop') = :ev_kpop_before + 1
  and (select count(*) from public.bt_plays where mode_id = 'classic' and player_id = pg_temp.uid('C')) = :bt_before + 1);

-- anon merge
select pg_temp.chk('008 merge_anon_passport: the 6-argument form is gone, the 7-argument form exists',
  to_regprocedure('public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb)') is null
  and to_regprocedure('public.merge_anon_passport(uuid, integer, integer, integer, integer, jsonb, text)') is not null);
select public.merge_anon_passport(pg_temp.uid('E'), 3, 2, 1, 1, '[]'::jsonb, 'anime') as r1 \gset
select public.merge_anon_passport(pg_temp.uid('E'), 3, 2, 1, 1, '[]'::jsonb, 'anime') as r2 \gset
select pg_temp.chk('008 merge_anon_passport (anime): once per world, counters on the stamp, profiles untouched',
  :'r1' = 't' and :'r2' = 'f'
  and (select quizzes_played || ':' || blindtests_played from public.world_memberships where user_id = pg_temp.uid('E') and site_id = 'anime') = '4:2'
  and (select passport_anon_merged_at is null and quizzes_played = 1 from public.profiles where id = pg_temp.uid('E')),
  (select quizzes_played || ':' || coalesce(blindtests_played::text, 'null') from public.world_memberships where user_id = pg_temp.uid('E') and site_id = 'anime'));
select public.merge_anon_passport(pg_temp.uid('A'), 3, 2, 1, 1, '[]'::jsonb, 'anime') as r1 \gset
select pg_temp.chk('008 merge_anon_passport (anime): no stamp, nothing merged, no marker claimed',
  :'r1' = 'f'
  and not exists (select 1 from public.passport_prefs where user_id = pg_temp.uid('A')));
select public.merge_anon_passport(pg_temp.uid('E'), 5, 4, 3, 2, '[]'::jsonb) as r1 \gset
select public.merge_anon_passport(pg_temp.uid('E'), 5, 4, 3, 2, '[]'::jsonb) as r2 \gset
select pg_temp.chk('008 merge_anon_passport (kpop, 6 arguments): as today, then idempotent',
  :'r1' = 't' and :'r2' = 'f'
  and (select passport_anon_merged_at is not null and quizzes_played = 6 and blindtests_played = 4 and duels_voted = 3 and battles_played = 2 from public.profiles where id = pg_temp.uid('E')),
  (select quizzes_played || ':' || blindtests_played from public.profiles where id = pg_temp.uid('E')));
select public.merge_anon_passport(pg_temp.uid('E'), 5, 4, 3, 2, '[]'::jsonb, 'kpop') as r1 \gset
select pg_temp.chk('008 merge_anon_passport (explicit kpop) is the kpop branch (already merged, false)', :'r1' = 'f');

-- award_world_xp rules once the world defines the badges
select public.award_world_xp(pg_temp.uid('B'), 'anime', 5, 'create') as _ \gset
select public.award_world_xp(pg_temp.uid('C'), 'anime', 5, 'play') as _ \gset
select pg_temp.chk('007 award_world_xp: defined badges are awarded by the rules (anime_quiz_maker, anime_first_steps)',
  exists (select 1 from public.user_badges where user_id = pg_temp.uid('B') and badge_id = 'anime_quiz_maker')
  and exists (select 1 from public.user_badges where user_id = pg_temp.uid('C') and badge_id = 'anime_first_steps')
  and (select count(*) from public.creator_notifications where user_id = pg_temp.uid('C') and type = 'badge_earned' and site_id = 'anime') = 1);

-- ---------------------------------------------------------------------------------------------------------------
-- 006: the passport handoff.
-- ---------------------------------------------------------------------------------------------------------------
create function pg_temp.hh(p_i integer) returns text language sql as $$ select md5('chk-code-' || p_i) || md5('chk-code-b-' || p_i) $$;
create function pg_temp.ch(p_c text) returns text language sql as $$ select rpad(p_c, 43, 'x') $$;
select public.passport_issue_code(pg_temp.uid('A'), 'kpop', 'anime', pg_temp.hh(1), pg_temp.ch('c1'), 'k.abc', 'iphash-a', 'chrome') as r1 \gset
select pg_temp.chk('006 issue: a confirmed user gets a code that lives 60 s, the event is logged',
  :'r1' = 'issued'
  and (select extract(epoch from expires_at - created_at) = 60 and used_at is null and user_id = pg_temp.uid('A') from passport.handoff_codes where code_hash = pg_temp.hh(1))
  and (select count(*) from passport.handoff_events where outcome = 'issued' and user_id = pg_temp.uid('A') and via_code = 'k.abc' and ip_hash = 'iphash-a' and ua_family = 'chrome') = 1);
select public.passport_issue_code(pg_temp.uid('U'), 'kpop', 'anime', pg_temp.hh(2), pg_temp.ch('c2')) as r1 \gset
select public.passport_issue_code(pg_temp.uid('X'), 'kpop', 'anime', pg_temp.hh(3), pg_temp.ch('c3')) as r2 \gset
select pg_temp.chk('006 issue: unconfirmed, banned',
  :'r1' = 'unconfirmed' and :'r2' = 'banned'
  and not exists (select 1 from passport.handoff_codes where code_hash in (pg_temp.hh(2), pg_temp.hh(3)))
  and (select count(*) from passport.handoff_events where outcome in ('unconfirmed', 'banned')) = 2);
select public.passport_issue_code(pg_temp.uid('E'), 'kpop', 'anime', pg_temp.hh(4), pg_temp.ch('c4')) as r1 \gset
select pg_temp.chk('006 issue: with no passport.deletion_requests table (before 016) nothing is pending', :'r1' = 'issued');
create table passport.deletion_requests (user_id uuid primary key, cancelled_at timestamptz, completed_at timestamptz);
insert into passport.deletion_requests (user_id) values (pg_temp.uid('E'));
select public.passport_issue_code(pg_temp.uid('E'), 'kpop', 'anime', pg_temp.hh(5), pg_temp.ch('c5')) as r1 \gset
select pg_temp.chk('006 issue: a pending deletion is refused',
  :'r1' = 'deletion_pending'
  and not exists (select 1 from passport.handoff_codes where code_hash = pg_temp.hh(5)));
update passport.deletion_requests set cancelled_at = now() where user_id = pg_temp.uid('E');
select public.passport_issue_code(pg_temp.uid('E'), 'kpop', 'anime', pg_temp.hh(6), pg_temp.ch('c6')) as r1 \gset
select pg_temp.chk('006 issue: a cancelled deletion request does not block', :'r1' = 'issued');
drop table passport.deletion_requests;
select pg_temp.chk('006 issue: an unknown site and the same site on both ends raise',
  pg_temp.raises($q$select public.passport_issue_code(pg_temp.uid('A'), 'kpop', 'nosuch', pg_temp.hh(7), pg_temp.ch('c7'))$q$)
  and pg_temp.raises($q$select public.passport_issue_code(pg_temp.uid('A'), 'kpop', 'kpop', pg_temp.hh(7), pg_temp.ch('c7'))$q$));
-- rate limits: 30 per user per hour (C), 60 per IP hash per hour (A, B, D and E, 15 each)
do $$
declare i integer;
begin
  for i in 100 .. 129 loop
    perform public.passport_issue_code(pg_temp.uid('C'), 'kpop', 'anime', pg_temp.hh(i), pg_temp.ch('c' || i));
  end loop;
end $$;
select public.passport_issue_code(pg_temp.uid('C'), 'kpop', 'anime', pg_temp.hh(130), pg_temp.ch('c130')) as r1 \gset
select pg_temp.chk('006 issue: the 31st code of a user in an hour is rate_limited and logged',
  :'r1' = 'rate_limited'
  and (select count(*) from passport.handoff_events where user_id = pg_temp.uid('C') and outcome = 'issued') = 30
  and (select count(*) from passport.handoff_events where user_id = pg_temp.uid('C') and outcome = 'rate_limited') = 1);
do $$
declare i integer;
begin
  for i in 200 .. 214 loop
    perform public.passport_issue_code(pg_temp.uid('A'), 'kpop', 'anime', pg_temp.hh(i), pg_temp.ch('a' || i), null, 'iphash-shared');
    perform public.passport_issue_code(pg_temp.uid('B'), 'kpop', 'anime', pg_temp.hh(i + 100), pg_temp.ch('b' || i), null, 'iphash-shared');
    perform public.passport_issue_code(pg_temp.uid('D'), 'kpop', 'anime', pg_temp.hh(i + 200), pg_temp.ch('d' || i), null, 'iphash-shared');
    perform public.passport_issue_code(pg_temp.uid('E'), 'kpop', 'anime', pg_temp.hh(i + 300), pg_temp.ch('e' || i), null, 'iphash-shared');
  end loop;
end $$;
select public.passport_issue_code(pg_temp.uid('D'), 'kpop', 'anime', pg_temp.hh(600), pg_temp.ch('d600'), null, 'iphash-shared') as r1 \gset
select public.passport_issue_code(pg_temp.uid('D'), 'kpop', 'anime', pg_temp.hh(601), pg_temp.ch('d601'), null, 'iphash-other') as r2 \gset
select pg_temp.chk('006 issue: the 61st code of an IP hash in an hour is rate_limited, another IP is not', :'r1' = 'rate_limited' and :'r2' = 'issued');

select concat_ws(':', r.outcome, r.user_id, r.from_site) as r1 from public.passport_redeem_code(pg_temp.hh(1), 'anime', pg_temp.ch('c1'), 'k.abc', 'iphash-r', 'safari') r \gset
select pg_temp.chk('006 redeem: right challenge, right site, redeemed with user and origin; the event is logged',
  :'r1' = 'redeemed:' || pg_temp.uid('A')::text || ':kpop'
  and (select count(*) from passport.handoff_events where outcome = 'redeemed' and ip_hash = 'iphash-r' and to_site = 'anime' and from_site = 'kpop' and user_id = pg_temp.uid('A') and via_code = 'k.abc' and ua_family = 'safari') = 1);
select r.outcome as r1 from public.passport_redeem_code(pg_temp.hh(1), 'anime', pg_temp.ch('c1')) r \gset
select pg_temp.chk('006 redeem: a second use is a replay', :'r1' = 'replay');
select concat_ws(':', r.outcome, coalesce(r.user_id::text, 'nouser'), coalesce(r.from_site, 'nosite')) as r1 from public.passport_redeem_code(pg_temp.hh(4), 'anime', pg_temp.ch('wrong')) r \gset
select r.outcome as r2 from public.passport_redeem_code(pg_temp.hh(4), 'anime', pg_temp.ch('c4')) r \gset
select pg_temp.chk('006 redeem: a wrong challenge burns the code (pkce_fail, then replay), no user returned', :'r1' = 'pkce_fail:nouser:nosite' and :'r2' = 'replay');
update passport.handoff_codes set expires_at = now() - interval '1 second' where code_hash = pg_temp.hh(6);
select r.outcome as r1 from public.passport_redeem_code(pg_temp.hh(9999), 'anime', pg_temp.ch('c')) r \gset
select r.outcome as r2 from public.passport_redeem_code(pg_temp.hh(6), 'anime', pg_temp.ch('c6')) r \gset
select r.outcome as r3 from public.passport_redeem_code(pg_temp.hh(100), 'hub', pg_temp.ch('c100')) r \gset
select r.outcome as r4 from public.passport_redeem_code(pg_temp.hh(100), 'anime', pg_temp.ch('c100')) r \gset
select pg_temp.chk('006 redeem: unknown hash, expired code, other site all read as expired; the other-site code stays usable',
  :'r1' = 'expired' and :'r2' = 'expired' and :'r3' = 'expired' and :'r4' = 'redeemed');
select r.outcome as r1 from public.passport_redeem_code('zz', 'anime', 'short') r \gset
select r.outcome as r2 from public.passport_redeem_code(pg_temp.hh(101), 'anime', 'short') r \gset
select pg_temp.chk('006 redeem: a malformed hash or challenge does not raise', :'r1' = 'expired' and :'r2' = 'pkce_fail');
select public.passport_log_event('login_required', null, null, 'anime', null, 'iphash-l', 'chrome') as _ \gset
select public.passport_log_event('rate_limited', gen_random_uuid(), 'nosuch', 'anime', 'f.abc') as _ \gset
select pg_temp.chk('006 log_event: writes a row, an unknown user or site is stored null, a bad outcome raises',
  (select count(*) from passport.handoff_events where outcome = 'login_required' and ip_hash = 'iphash-l' and to_site = 'anime' and ua_family = 'chrome') = 1
  and (select count(*) from passport.handoff_events where outcome = 'rate_limited' and user_id is null and from_site is null and via_code = 'f.abc') = 1
  and pg_temp.raises($q$select public.passport_log_event('whatever')$q$));
insert into passport.handoff_codes (code_hash, user_id, from_site, to_site, code_challenge, expires_at, created_at)
values (pg_temp.hh(7000), pg_temp.uid('A'), 'kpop', 'anime', pg_temp.ch('old'), now() - interval '2 days', now() - interval '2 days');
insert into passport.handoff_events (at, outcome) values (now() - interval '91 days', 'issued'), (now() - interval '89 days', 'issued');
select concat_ws(':', codes_deleted, events_deleted) as r1 from public.passport_cleanup() \gset
select concat_ws(':', codes_deleted, events_deleted) as r2 from public.passport_cleanup() \gset
select pg_temp.chk('006 cleanup: deletes codes older than a day and events older than 90 days',
  :'r1' = '1:1' and :'r2' = '0:0' and not exists (select 1 from passport.handoff_codes where code_hash = pg_temp.hh(7000)),
  :'r1' || ' then ' || :'r2');
select pg_temp.chk('006 the Data API roles cannot reach the schema',
  pg_temp.as_role('authenticated', pg_temp.uid('A'), $q$select count(*)::text from passport.handoff_codes$q$) like 'ERR:42501%'
  and pg_temp.as_role('anon', null, $q$select count(*)::text from passport.handoff_events$q$) like 'ERR:42501%'
  and pg_temp.as_role('authenticated', pg_temp.uid('A'), $q$select public.passport_cleanup()::text$q$) like 'ERR:42501%');
select pg_temp.chk('006 service_role can call the functions',
  pg_temp.as_role('service_role', null, format($q$select public.passport_issue_code(%L, 'kpop', 'hub', %L, %L)$q$, pg_temp.uid('D'), pg_temp.hh(8000), pg_temp.ch('s8000'))) = 'issued');

-- ---------------------------------------------------------------------------------------------------------------
-- 005: net_bridge_bump.
-- ---------------------------------------------------------------------------------------------------------------
select public.net_bridge_bump('kpop', 'anime', 'ab', 'click', false) as _ \gset
select public.net_bridge_bump('kpop', 'anime', 'ab', 'click', false, 3) as _ \gset
select public.net_bridge_bump('kpop', 'anime', 'ab', 'click', true) as _ \gset
select pg_temp.chk('005 net_bridge_bump: upserts n on the UTC day, one row per signed_in flag',
  (select string_agg(signed_in || ':' || n, ',' order by signed_in) from public.bridge_daily where bridge = 'ab' and day = (now() at time zone 'utc')::date) = 'false:4,true:1');
select pg_temp.chk('005 net_bridge_bump: bad inputs raise',
  pg_temp.raises($q$select public.net_bridge_bump('nosuch', 'anime', 'ab', 'click', false)$q$)
  and pg_temp.raises($q$select public.net_bridge_bump('kpop', 'nosuch', 'ab', 'click', false)$q$)
  and pg_temp.raises($q$select public.net_bridge_bump('kpop', 'anime', 'AB', 'click', false)$q$)
  and pg_temp.raises($q$select public.net_bridge_bump('kpop', 'anime', 'ab', 'visit', false)$q$)
  and pg_temp.raises($q$select public.net_bridge_bump('kpop', 'anime', 'ab', 'click', null)$q$)
  and pg_temp.raises($q$select public.net_bridge_bump('kpop', 'anime', 'ab', 'click', false, 0)$q$));
select pg_temp.chk('005 net_bridge_bump: authenticated cannot call it, cannot read bridge_daily',
  pg_temp.as_role('authenticated', pg_temp.uid('A'), $q$select public.net_bridge_bump('kpop', 'anime', 'ab', 'click', false)::text$q$) like 'ERR:42501%'
  and pg_temp.as_role('authenticated', pg_temp.uid('A'), $q$select count(*)::text from public.bridge_daily$q$) like 'ERR:42501%');

-- ---------------------------------------------------------------------------------------------------------------
-- 004: favourites, world_follows and their counters, the two views.
-- ---------------------------------------------------------------------------------------------------------------
select pg_temp.chk('004 favourites: own insert on anime, never on kpop, not for someone else',
  pg_temp.dml('authenticated', pg_temp.uid('B'), format($q$insert into public.favourites (user_id, site_id, slot, rank, entity_type, entity_id, label) values (%L, 'anime', 'topic', 0, 'series', 's1', 'My series')$q$, pg_temp.uid('B'))) = '1'
  and pg_temp.dml('authenticated', pg_temp.uid('B'), format($q$insert into public.favourites (user_id, site_id, slot, rank, entity_type, label) values (%L, 'kpop', 'topic', 0, 'group', 'x')$q$, pg_temp.uid('B'))) like 'ERR:%'
  and pg_temp.dml('authenticated', pg_temp.uid('B'), format($q$insert into public.favourites (user_id, site_id, slot, rank, entity_type, label) values (%L, 'anime', 'topic', 1, 'series', 'x')$q$, pg_temp.uid('C'))) like 'ERR:%');
select pg_temp.chk('004 favourites: a public read, own update and delete only',
  pg_temp.as_role('anon', null, $q$select count(*)::text from public.favourites$q$) = '1'
  and pg_temp.dml('authenticated', pg_temp.uid('C'), $q$update public.favourites set label = 'hijack'$q$) = '0'
  and pg_temp.dml('authenticated', pg_temp.uid('B'), $q$update public.favourites set label = 'Renamed'$q$) = '1'
  and pg_temp.dml('authenticated', pg_temp.uid('C'), $q$delete from public.favourites$q$) = '0'
  and pg_temp.dml('authenticated', pg_temp.uid('B'), $q$delete from public.favourites$q$) = '1');
select pg_temp.chk('004 world_follows: own follow only, never kpop, never self',
  pg_temp.dml('authenticated', pg_temp.uid('B'), format($q$insert into public.world_follows (site_id, follower_id, followed_id) values ('anime', %L, %L)$q$, pg_temp.uid('B'), pg_temp.uid('C'))) = '1'
  and pg_temp.dml('authenticated', pg_temp.uid('B'), format($q$insert into public.world_follows (site_id, follower_id, followed_id) values ('anime', %L, %L)$q$, pg_temp.uid('C'), pg_temp.uid('B'))) like 'ERR:%'
  and pg_temp.dml('authenticated', pg_temp.uid('B'), format($q$insert into public.world_follows (site_id, follower_id, followed_id) values ('kpop', %L, %L)$q$, pg_temp.uid('B'), pg_temp.uid('C'))) like 'ERR:%'
  and pg_temp.dml('authenticated', pg_temp.uid('B'), format($q$insert into public.world_follows (site_id, follower_id, followed_id) values ('anime', %L, %L)$q$, pg_temp.uid('B'), pg_temp.uid('B'))) like 'ERR:%');
select pg_temp.chk('004 world_follows: counters follow the insert, a public read',
  (select following_count from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime') = 1
  and (select follower_count from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') = 1
  and pg_temp.as_role('anon', null, $q$select count(*)::text from public.world_follows$q$) = '1');
select pg_temp.dml('authenticated', pg_temp.uid('C'), $q$delete from public.world_follows$q$) as r1 \gset
select pg_temp.dml('authenticated', pg_temp.uid('B'), $q$delete from public.world_follows$q$) as r2 \gset
select pg_temp.chk('004 world_follows: own delete only, counters follow the delete',
  :'r1' = '0' and :'r2' = '1'
  and (select following_count from public.world_memberships where user_id = pg_temp.uid('B') and site_id = 'anime') = 0
  and (select follower_count from public.world_memberships where user_id = pg_temp.uid('C') and site_id = 'anime') = 0);
update public.profiles set bias = 'Chk idol', ult_groups = '["chk-kpop-group", "unknown-slug"]'::jsonb where id = pg_temp.uid('A');
select pg_temp.chk('004 favourites_all: kpop rows derive from profiles (topics from ult_groups, pick from bias)',
  (select string_agg(slot || ':' || rank || ':' || entity_type || ':' || coalesce(entity_id, 'null') || ':' || label, ',' order by slot, rank) from public.favourites_all where user_id = pg_temp.uid('A'))
    = 'pick:0:idol:null:Chk idol,topic:0:group:chk-kpop-group:Chk Kpop Group,topic:1:group:unknown-slug:unknown-slug');
select pg_temp.chk('004 world_progress: one row per stamp, kpop values from profiles, world values from the stamp',
  (select count(*) from public.world_progress) = (select count(*) from public.world_memberships)
  and (select xp from public.world_progress where user_id = pg_temp.uid('E') and site_id = 'kpop') = (select xp from public.profiles where id = pg_temp.uid('E'))
  and (select xp from public.world_progress where user_id = pg_temp.uid('B') and site_id = 'anime') = 45);
select pg_temp.chk('004 the views are security_invoker',
  (select bool_and(coalesce(reloptions::text, '') like '%security_invoker=true%') from pg_class where oid in ('public.world_progress'::regclass, 'public.favourites_all'::regclass)));

-- ---------------------------------------------------------------------------------------------------------------
-- 003: create_profile_for_site.
-- ---------------------------------------------------------------------------------------------------------------
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
select md5('chk-b3-new-' || n)::uuid, 'authenticated', 'authenticated', 'chk_new_' || n || '@chk-b3.invalid', now(), '{}'::jsonb, '{}'::jsonb, now(), now() from unnest(array['1', '2', '3']) n;
select pg_temp.as_role('authenticated', md5('chk-b3-new-1')::uuid, $q$select public.create_profile_for_site('chk_new_one', 'anime', '#111111', 'N', 'jump', 'k.xyz')::text$q$) as r1 \gset
select pg_temp.chk('003 create_profile_for_site: an anime sign-up gets one anime stamp, activated, with its via',
  :'r1' = md5('chk-b3-new-1')::uuid::text
  and (select string_agg(site_id || ':' || joined_via || ':' || via_code || ':' || (activated_at is not null), ',') from public.world_memberships where user_id = md5('chk-b3-new-1')::uuid) = 'anime:jump:k.xyz:true'
  and (select username = 'chk_new_one' and avatar_bg = '#111111' from public.profiles where id = md5('chk-b3-new-1')::uuid)
  and coalesce(current_setting('app.site_id', true), '') = '');
select pg_temp.chk('003 create_profile_for_site: the username rules of today',
  pg_temp.as_role('authenticated', md5('chk-b3-new-2')::uuid, $q$select public.create_profile_for_site('Bad Name', 'anime', '#1', 'N')::text$q$) like 'ERR:%'
  and pg_temp.as_role('authenticated', md5('chk-b3-new-2')::uuid, $q$select public.create_profile_for_site('ab', 'anime', '#1', 'N')::text$q$) like 'ERR:%'
  and pg_temp.as_role('authenticated', md5('chk-b3-new-2')::uuid, $q$select public.create_profile_for_site('admin', 'anime', '#1', 'N')::text$q$) like 'ERR:%reserved'
  and pg_temp.as_role('authenticated', md5('chk-b3-new-2')::uuid, $q$select public.create_profile_for_site('chk_a', 'anime', '#1', 'N')::text$q$) like 'ERR:%taken'
  and pg_temp.as_role('authenticated', md5('chk-b3-new-1')::uuid, $q$select public.create_profile_for_site('chk_new_uno', 'anime', '#1', 'N')::text$q$) like 'ERR:%already exists'
  and not exists (select 1 from public.profiles where id = md5('chk-b3-new-2')::uuid));
select pg_temp.chk('003 create_profile_for_site: an unknown site, an unknown via and another user id raise and leave nothing',
  pg_temp.as_role('authenticated', md5('chk-b3-new-2')::uuid, $q$select public.create_profile_for_site('chk_new_two', 'nosuch', '#1', 'N')::text$q$) like 'ERR:%'
  and pg_temp.as_role('authenticated', md5('chk-b3-new-2')::uuid, $q$select public.create_profile_for_site('chk_new_two', 'anime', '#1', 'N', 'nope')::text$q$) like 'ERR:%'
  and pg_temp.as_role('authenticated', md5('chk-b3-new-2')::uuid, format($q$select public.create_profile_for_site('chk_new_two', 'anime', '#1', 'N', 'signup', null, %L)::text$q$, md5('chk-b3-new-3')::uuid)) like 'ERR:%'
  and not exists (select 1 from public.profiles where id in (md5('chk-b3-new-2')::uuid, md5('chk-b3-new-3')::uuid)));
select pg_temp.as_role('service_role', null, format($q$select public.create_profile_for_site('chk_new_three', 'kpop', '#1', 'N', 'seed', null, %L)::text$q$, md5('chk-b3-new-3')::uuid)) as r1 \gset
select pg_temp.chk('003 create_profile_for_site: the service role passes p_user_id; kpop gets an activated kpop stamp',
  :'r1' = md5('chk-b3-new-3')::uuid::text
  and (select joined_via = 'seed' and activated_at is not null and xp is null from public.world_memberships where user_id = md5('chk-b3-new-3')::uuid and site_id = 'kpop')
  and pg_temp.as_role('service_role', null, $q$select public.create_profile_for_site('chk_new_four', 'kpop', '#1', 'N')::text$q$) like 'ERR:%');

-- ---------------------------------------------------------------------------------------------------------------
-- Result.
-- ---------------------------------------------------------------------------------------------------------------
select 'CHK ' || name || case when ok then ' ok' else ' FAIL' || coalesce(' (' || detail || ')', '') end from chk_results order by n;
select 'CHK TOTAL pass=' || count(*) filter (where ok) || ' fail=' || count(*) filter (where not ok) from chk_results;

rollback;
