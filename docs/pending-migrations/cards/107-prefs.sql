-- 107-prefs.sql (KpopCards lots 3 + 4 + 5, 2026-11-13; the player's preferences: sound, vibration, pack theme, focus group)
--
-- What:   adds, in ONE DO block:
--           table     cards_prefs        one row per player: sound, vibration, the theme of the pack in the centre, the group of the focus pack
--           functions cards_prefs_get(user)            the preferences as jsonb (the defaults when the player has no row)
--                     cards_prefs_set(user, patch, now) merges a jsonb patch {sound, vibration, theme, focus} into the row, validated
-- Why:    the prototype v6 keeps sound and vibration as two separate switches and remembers the chosen theme and the focus group; the server
--         keeps them so a second device shows the same lobby, and so the server (not the browser) knows the theme a plain "Open a pack" uses.
-- Rows:   0 rows. 1 table, 2 functions. Additive. A player without a row reads the defaults (sound on, vibration on, theme all, no focus).
-- Needs:  001 (cards_entities).
-- Errors: "cards: pref" (an unknown theme, a value of the wrong type, or a focus that is not a group entity), "cards: user".
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_prefs_get', 'cards_prefs_set');   expect 2
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename = 'cards_prefs' and rowsecurity;   expect 1
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_prefs' and grantee in ('anon', 'authenticated');   expect 0
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_prefs%';   expect f
-- Verify: select (public.cards_prefs_get('00000000-0000-0000-0000-000000000000')) ->> 'theme';   expect all
-- Undo:   107-prefs.rollback.sql (drops the table with its rows)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c107$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_entities') is null then
    raise exception '107-prefs: run 001-schema.sql first';
  end if;

  create table if not exists public.cards_prefs (
    user_id uuid constraint cards_prefs_pkey primary key constraint cards_prefs_user_id_fkey references auth.users(id) on delete cascade,
    sound boolean not null default true,
    vibration boolean not null default true,
    theme text not null default 'all' constraint cards_prefs_theme_check check (theme in ('all', 'girls', 'boys', 'solo')),
    focus text constraint cards_prefs_focus_fkey references public.cards_entities(id) on delete set null,
    updated_at timestamptz not null default now()
  );
  alter table public.cards_prefs enable row level security;
  revoke all on table public.cards_prefs from public, anon, authenticated;
  grant all on table public.cards_prefs to service_role;

  create or replace function public.cards_prefs_get(p_user uuid)
    returns jsonb
    language sql stable security definer set search_path = public
    as $f$
      select jsonb_build_object(
        'sound', coalesce((select x.sound from public.cards_prefs x where x.user_id = p_user), true),
        'vibration', coalesce((select x.vibration from public.cards_prefs x where x.user_id = p_user), true),
        'theme', coalesce((select x.theme from public.cards_prefs x where x.user_id = p_user), 'all'),
        'focus', (select x.focus from public.cards_prefs x where x.user_id = p_user))
    $f$;

  create or replace function public.cards_prefs_set(p_user uuid, p_patch jsonb, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    cur jsonb;
    v_sound boolean;
    v_vib boolean;
    v_theme text;
    v_focus text;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'cards: pref'; end if;
    cur := public.cards_prefs_get(p_user);
    v_sound := (cur ->> 'sound')::boolean;
    v_vib := (cur ->> 'vibration')::boolean;
    v_theme := cur ->> 'theme';
    v_focus := cur ->> 'focus';
    if p_patch ? 'sound' then
      if jsonb_typeof(p_patch -> 'sound') <> 'boolean' then raise exception 'cards: pref'; end if;
      v_sound := (p_patch ->> 'sound')::boolean;
    end if;
    if p_patch ? 'vibration' then
      if jsonb_typeof(p_patch -> 'vibration') <> 'boolean' then raise exception 'cards: pref'; end if;
      v_vib := (p_patch ->> 'vibration')::boolean;
    end if;
    if p_patch ? 'theme' then
      if jsonb_typeof(p_patch -> 'theme') <> 'string' or (p_patch ->> 'theme') not in ('all', 'girls', 'boys', 'solo') then raise exception 'cards: pref'; end if;
      v_theme := p_patch ->> 'theme';
    end if;
    if p_patch ? 'focus' then
      if jsonb_typeof(p_patch -> 'focus') = 'null' then v_focus := null;
      elsif jsonb_typeof(p_patch -> 'focus') = 'string'
            and exists (select 1 from public.cards_entities e where e.id = p_patch ->> 'focus' and e.kind = 'group' and e.active) then
        v_focus := p_patch ->> 'focus';
      else raise exception 'cards: pref';
      end if;
    end if;
    insert into public.cards_prefs (user_id, sound, vibration, theme, focus, updated_at) values (p_user, v_sound, v_vib, v_theme, v_focus, p_now)
    on conflict (user_id) do update set sound = excluded.sound, vibration = excluded.vibration, theme = excluded.theme, focus = excluded.focus, updated_at = excluded.updated_at;
    return public.cards_prefs_get(p_user);
  end
  $f$;

  revoke all on function public.cards_prefs_get(uuid) from public, anon, authenticated;
  revoke all on function public.cards_prefs_set(uuid, jsonb, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_prefs_get(uuid) to service_role;
  grant execute on function public.cards_prefs_set(uuid, jsonb, timestamptz) to service_role;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'cards_prefs' and not rowsecurity) then
    raise exception '107-prefs: cards_prefs has row level security off';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_prefs' and grantee in ('anon', 'authenticated', 'PUBLIC')) then
    raise exception '107-prefs: cards_prefs is granted to a browser role';
  end if;

  notify pgrst, 'reload schema';
end $c107$;
