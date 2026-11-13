-- 105-goals.sql (KpopCards lots 3 + 4 + 5, 2026-11-13; the sets, the week, the claims and the shared ledgers)
--
-- What:   adds the database side of Missions, in ONE DO block:
--           tables   cards_sets_claimed   one row per player and set: the set is claimed, its packs were given (never twice)
--                    cards_week_claims    one row per player and Paris week: the week's reward was claimed
--                    cards_idem           the idempotency ledger: one row per player and key, with the stored answer (a retry or a double tap
--                                         returns it and never spends or gives twice); shared by 105 and 110 to 112; kept 24 hours by cards_idem_gc
--                    cards_audit          the audit trail of every spending write (openings, claims, crafts, recycles, ad grants, friends)
--           constraint cards_wallets_stock_check   now stock >= 0 and <= 500 (a claimed set pays straight into the stack, which may pass its cap)
--           new functions
--                    cards_goals_progress(user, cards)   every set with its card count, the cards the player owns and whether it is claimed
--                    cards_week_progress(user, now)      the week's three counters, the Paris week and whether it is claimed
--                    cards_missions(user, now)           the week and every set (what Missions shows)
--                    cards_claim(user, key, target, now, timer_cap)   claims one set or the week once, adds its packs to the STACK and its shards
--                    cards_idem_gc(now)                  deletes the idempotency rows older than 24 hours
-- Why:    the prototype v6 (Missions): a set with a fixed reward, claimed by the player's tap, pays its packs into the stack; the weekly list of
--         three goals pays +2 packs and +25 shards; no streak and nothing lost by a missed week. Every number comes from the player's own rows
--         (packs, Kpopdle wins decided in the database, first copies): nothing is typed in by a browser. A claim is idempotent by its key.
-- Sets:   a set is complete when the player owns every card of it that is in packs today (cards_catalog.in_packs and an active entity). A claimed
--         set never pays twice, even if the catalog grows later. The sets and their packs:
--           group:<id>   a group (a group entity with a card in packs): its own cards and the cards of its idols (cards_entities.group_id)   +1
--           solo         the soloists: every idol card whose entity has no group subject (no group_id, or a group with no card in packs)   +1
--           holo         every Holo card (rarity R)                                                                                          +3
--           gold         every Gold card (rarity UR)                                                                                         +5
--           year:<yyyy>  a debut year (cards_entities.debut_year of the group entity) with 2 or more group subjects: all their set cards   +2
-- Week:   Monday 00:00 to the next Monday 00:00, Europe/Paris. 20 packs opened (cards_packs.opened_at, any source), 3 Kpopdle wins (dle_plays won,
--         finished in the week; 0 on a database without 019) and 10 cards new to the player (cards_owned.first_at in the week, a craft included).
--         All three done and claimed once: +2 packs and +25 shards. A missed week takes nothing away.
-- Rows:   0 rows. 4 tables, 1 constraint, 5 new functions. Additive. No XP, level, streak or badge of kpopquiz.org is read or written.
-- Needs:  001, 002 and 104 (cards_roll with 8 arguments). 019 is optional (Kpopdle wins).
-- Errors: words after "cards: ": claimed (already claimed), goal (the set or the week is not complete), set (no such set), idem_conflict (the key was
--         used for another operation), user.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_goals_progress', 'cards_week_progress', 'cards_missions', 'cards_claim', 'cards_idem_gc');   expect 5
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_%';   expect f
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_sets_claimed', 'cards_week_claims', 'cards_idem', 'cards_audit') and rowsecurity;   expect 4
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_sets_claimed', 'cards_week_claims', 'cards_idem', 'cards_audit') and grantee in ('anon', 'authenticated');   expect 0
-- Verify: select pg_get_constraintdef(oid) like '%500%' from pg_constraint where conname = 'cards_wallets_stock_check' and conrelid = 'public.cards_wallets'::regclass;   expect t
-- Verify: select (public.cards_week_progress('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'week_start';   expect 2026-11-09
-- Verify: select count(*) from public.cards_sets_claimed;   expect 0 right after the first run (nothing is claimed for you)
-- Undo:   105-goals.rollback.sql (refused while a claim or an idempotency row is recorded, or a stack is above 5)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c105$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_wallets') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_packs') is null
     or to_regclass('public.cards_owned') is null or to_regclass('public.cards_entities') is null then
    raise exception '105-goals: run 001-schema.sql first';
  end if;
  if to_regprocedure('public.cards_roll(integer, timestamptz, date, integer, integer, timestamptz, integer, integer)') is null then
    raise exception '105-goals: run 104-economy.sql first';
  end if;

  if exists (select 1 from pg_constraint where conname = 'cards_wallets_stock_check' and conrelid = 'public.cards_wallets'::regclass
              and pg_get_constraintdef(oid) not like '%500%') then
    alter table public.cards_wallets drop constraint cards_wallets_stock_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cards_wallets_stock_check' and conrelid = 'public.cards_wallets'::regclass) then
    alter table public.cards_wallets add constraint cards_wallets_stock_check check (stock between 0 and 500);
  end if;

  -- The sets a player has claimed. No foreign key on the set: a catalog rebuild must not erase what was paid.
  create table if not exists public.cards_sets_claimed (
    user_id uuid not null constraint cards_sets_claimed_user_id_fkey references auth.users(id) on delete cascade,
    set_id text not null constraint cards_sets_claimed_set_id_check check (set_id ~ '^(group:.+|solo|holo|gold|year:[0-9]{4})$'),
    kind text not null constraint cards_sets_claimed_kind_check check (kind in ('group', 'solo', 'holo', 'gold', 'year')),
    packs integer not null constraint cards_sets_claimed_packs_check check (packs > 0),
    claimed_at timestamptz not null default now(),
    constraint cards_sets_claimed_pkey primary key (user_id, set_id)
  );
  alter table public.cards_sets_claimed enable row level security;
  revoke all on table public.cards_sets_claimed from public, anon, authenticated;
  grant all on table public.cards_sets_claimed to service_role;

  create table if not exists public.cards_week_claims (
    user_id uuid not null constraint cards_week_claims_user_id_fkey references auth.users(id) on delete cascade,
    week_start date not null,
    packs integer not null constraint cards_week_claims_packs_check check (packs > 0),
    shards integer not null constraint cards_week_claims_shards_check check (shards > 0),
    claimed_at timestamptz not null default now(),
    constraint cards_week_claims_pkey primary key (user_id, week_start)
  );
  alter table public.cards_week_claims enable row level security;
  revoke all on table public.cards_week_claims from public, anon, authenticated;
  grant all on table public.cards_week_claims to service_role;

  -- The idempotency ledger. op names the operation and its parameters ('open:stock:5'), response is what the caller got.
  create table if not exists public.cards_idem (
    user_id uuid not null constraint cards_idem_user_id_fkey references auth.users(id) on delete cascade,
    idem_key text not null constraint cards_idem_key_check check (length(idem_key) between 8 and 64),
    op text not null,
    response jsonb not null,
    created_at timestamptz not null default now(),
    constraint cards_idem_pkey primary key (user_id, idem_key)
  );
  alter table public.cards_idem enable row level security;
  revoke all on table public.cards_idem from public, anon, authenticated;
  grant all on table public.cards_idem to service_role;
  create index if not exists cards_idem_created_idx on public.cards_idem (created_at);

  -- The audit trail: one row per spending write. No foreign key on the player (the trail outlives an account for dispute handling).
  create table if not exists public.cards_audit (
    id bigint generated always as identity constraint cards_audit_pkey primary key,
    user_id uuid not null,
    kind text not null constraint cards_audit_kind_check check (kind in ('open', 'claim', 'craft', 'recycle', 'ad', 'friend', 'demo')),
    idem_key text,
    detail jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  alter table public.cards_audit enable row level security;
  revoke all on table public.cards_audit from public, anon, authenticated;
  grant all on table public.cards_audit to service_role;
  create index if not exists cards_audit_user_idx on public.cards_audit (user_id, created_at desc);
  create index if not exists cards_audit_kind_idx on public.cards_audit (kind, created_at desc);

  -- Every set with its cards in packs today, how many of them the player owns, and whether the set is claimed. p_cards limits the answer to
  -- the sets that hold one of those cards (the sets a pack or a craft can have completed); each set still counts ALL its cards.
  create or replace function public.cards_goals_progress(p_user uuid, p_cards integer[] default null)
    returns table (set_id text, kind text, name text, packs integer, total integer, owned integer, claimed boolean)
    language sql stable security definer set search_path = public
    as $f$
      with live as (
        select c.card_no, c.rarity, c.entity_id, e.kind as ekind, e.group_id, e.name as ename
          from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
         where c.in_packs and e.active),
      subj as (select distinct l.entity_id as gid from live l where l.ekind = 'group'),
      gm as (
        select l.entity_id as sid, l.ename as sname, l.card_no from live l where l.ekind = 'group'
        union all
        select l.group_id, g.name, l.card_no
          from live l join public.cards_entities g on g.id = l.group_id
         where l.ekind = 'idol' and l.group_id in (select gid from subj)),
      yrs as (
        select g.debut_year as y from public.cards_entities g where g.id in (select gid from subj) and g.debut_year is not null
         group by g.debut_year having count(*) >= 2),
      m as (
        select gm.sid, 'group'::text as skind, gm.sname, 1 as spacks, gm.card_no from gm
        union all
        select 'solo', 'solo', null, 1, l.card_no from live l
         where l.ekind = 'idol' and (l.group_id is null or l.group_id not in (select gid from subj))
        union all select 'holo', 'holo', null, 3, l.card_no from live l where l.rarity = 'R'
        union all select 'gold', 'gold', null, 5, l.card_no from live l where l.rarity = 'UR'
        union all
        select 'year:' || g.debut_year::text, 'year', g.debut_year::text, 2, gm.card_no
          from gm join public.cards_entities g on g.id = gm.sid where g.debut_year in (select y from yrs)),
      sel as (select distinct m.sid from m where p_cards is null or m.card_no = any (p_cards))
      select m.sid, m.skind, min(m.sname), min(m.spacks)::integer, count(*)::integer, count(o.card_no)::integer, (cl.user_id is not null)
        from m join sel on sel.sid = m.sid
        left join public.cards_owned o on o.user_id = p_user and o.card_no = m.card_no
        left join public.cards_sets_claimed cl on cl.user_id = p_user and cl.set_id = m.sid
       group by m.sid, m.skind, cl.user_id
    $f$;

  -- The week of p_now: Monday 00:00 to the next Monday 00:00, Europe/Paris. Read only.
  create or replace function public.cards_week_progress(p_user uuid, p_now timestamptz default now())
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_start date := (date_trunc('week', v_today::timestamp))::date;
    v_from timestamptz := v_start::timestamp at time zone 'Europe/Paris';
    v_to timestamptz := (v_start + 7)::timestamp at time zone 'Europe/Paris';
    v_packs integer;
    v_wins integer := 0;
    v_new integer;
    v_claimed boolean;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    select count(*) into v_packs from public.cards_packs p where p.user_id = p_user and p.opened_at >= v_from and p.opened_at < v_to;
    select count(*) into v_new from public.cards_owned o where o.user_id = p_user and o.first_at >= v_from and o.first_at < v_to;
    -- The Kpopdle wins, read the way cards_bonus_record reads them: a win is decided in the database (dle_guess), never reported by a browser.
    -- A play's date is its UTC day or the day before (dle_playable), so the Monday's plays start two dates earlier. A database without the
    -- daily games (019 not applied) counts none.
    if to_regclass('public.dle_plays') is not null and to_regclass('public.dle_games') is not null then
      select count(*) into v_wins
        from public.dle_plays d
       where d.game_id = any (array(select g.id from public.dle_games g where g.id like 'kpopdle%'))
         and d.play_date between v_start - 2 and v_today
         and d.user_id = p_user and d.status = 'won'
         and d.finished_at >= v_from and d.finished_at < v_to and d.finished_at <= p_now;
    end if;
    v_claimed := exists (select 1 from public.cards_week_claims k where k.user_id = p_user and k.week_start = v_start);
    return jsonb_build_object(
      'week_start', v_start, 'starts_at', v_from, 'ends_at', v_to,
      'packs_opened', v_packs, 'kpopdle_wins', v_wins, 'new_cards', v_new,
      'goal_packs', 20, 'goal_wins', 3, 'goal_cards', 10,
      'reward_packs', 2, 'reward_shards', 25,
      'done', v_packs >= 20 and v_wins >= 3 and v_new >= 10,
      'claimed', v_claimed);
  end
  $f$;

  -- What Missions shows: the week and every set (ready ones are complete and not claimed).
  create or replace function public.cards_missions(p_user uuid, p_now timestamptz default now())
    returns jsonb
    language plpgsql stable security definer set search_path = public
    as $f$
  declare
    v_sets jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', x.set_id, 'kind', x.kind, 'name', x.name, 'packs', x.packs, 'total', x.total, 'owned', x.owned, 'claimed', x.claimed)
                              order by array_position(array['gold', 'holo', 'year', 'solo', 'group'], x.kind), x.name, x.set_id), '[]'::jsonb)
      into v_sets from public.cards_goals_progress(p_user, null) x;
    return jsonb_build_object('week', public.cards_week_progress(p_user, p_now), 'sets', v_sets);
  end
  $f$;

  -- Claims one set (p_target = the set id) or the week (p_target = 'week'), once. The packs go straight into the stack (which may then pass its
  -- cap: the cap only stops the timer), the week's shards into the shards. The wallet row is locked first, so two taps cannot both pay; the
  -- same p_key returns the stored answer ("replayed"). Words: claimed, goal, set, idem_conflict.
  create or replace function public.cards_claim(
      p_user uuid, p_key text, p_target text, p_now timestamptz default now(), p_timer_cap integer default 40)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_op text := 'claim:' || coalesce(p_target, '');
    v_hit public.cards_idem%rowtype;
    v_wk jsonb;
    v_set record;
    v_packs integer := 0;
    v_shards integer := 0;
    v_out jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_key is null or length(p_key) not between 8 and 64 then raise exception 'cards: key'; end if;
    if p_target is null or length(p_target) > 80 then raise exception 'cards: set'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 10, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;

    select * into v_hit from public.cards_idem where user_id = p_user and idem_key = p_key;
    if found then
      if v_hit.op <> v_op then raise exception 'cards: idem_conflict'; end if;
      return v_hit.response || jsonb_build_object('replayed', true);
    end if;

    if p_target = 'week' then
      v_wk := public.cards_week_progress(p_user, p_now);
      if (v_wk ->> 'claimed')::boolean then raise exception 'cards: claimed'; end if;
      if not (v_wk ->> 'done')::boolean then raise exception 'cards: goal'; end if;
      insert into public.cards_week_claims (user_id, week_start, packs, shards, claimed_at)
      values (p_user, (v_wk ->> 'week_start')::date, (v_wk ->> 'reward_packs')::integer, (v_wk ->> 'reward_shards')::integer, p_now);
      v_packs := (v_wk ->> 'reward_packs')::integer;
      v_shards := (v_wk ->> 'reward_shards')::integer;
    else
      select x.* into v_set from public.cards_goals_progress(p_user, null) x where x.set_id = p_target;
      if not found then raise exception 'cards: set'; end if;
      if v_set.claimed then raise exception 'cards: claimed'; end if;
      if v_set.total < 1 or v_set.owned < v_set.total then raise exception 'cards: goal'; end if;
      insert into public.cards_sets_claimed (user_id, set_id, kind, packs, claimed_at) values (p_user, v_set.set_id, v_set.kind, v_set.packs, p_now);
      v_packs := v_set.packs;
    end if;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap);
    update public.cards_wallets
       set stock = (r ->> 'stock')::integer + v_packs, anchor = (r ->> 'anchor')::timestamptz, paris_day = v_today,
           ads_today = (r ->> 'ads_today')::integer, bonus_today = (r ->> 'bonus_today')::integer, timer_today = (r ->> 'timer_today')::integer,
           shards = shards + v_shards, version = version + 1, updated_at = p_now
     where user_id = p_user;
    v_out := jsonb_build_object('replayed', false, 'target', p_target, 'packs', v_packs, 'shards', v_shards);
    insert into public.cards_idem (user_id, idem_key, op, response, created_at) values (p_user, p_key, v_op, v_out, p_now);
    insert into public.cards_audit (user_id, kind, idem_key, detail, created_at) values (p_user, 'claim', p_key, v_out, p_now);
    return v_out;
  end
  $f$;

  create or replace function public.cards_idem_gc(p_now timestamptz default now())
    returns integer
    language plpgsql security definer set search_path = public
    as $f$
  declare
    n integer;
  begin
    delete from public.cards_idem where created_at < p_now - interval '24 hours';
    get diagnostics n = row_count;
    return n;
  end
  $f$;

  revoke all on function public.cards_goals_progress(uuid, integer[]) from public, anon, authenticated;
  revoke all on function public.cards_week_progress(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_missions(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_claim(uuid, text, text, timestamptz, integer) from public, anon, authenticated;
  revoke all on function public.cards_idem_gc(timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_goals_progress(uuid, integer[]) to service_role;
  grant execute on function public.cards_week_progress(uuid, timestamptz) to service_role;
  grant execute on function public.cards_missions(uuid, timestamptz) to service_role;
  grant execute on function public.cards_claim(uuid, text, text, timestamptz, integer) to service_role;
  grant execute on function public.cards_idem_gc(timestamptz) to service_role;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename in ('cards_sets_claimed', 'cards_week_claims', 'cards_idem', 'cards_audit') and not rowsecurity) then
    raise exception '105-goals: a new table has row level security off';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_sets_claimed', 'cards_week_claims', 'cards_idem', 'cards_audit')
             and grantee in ('anon', 'authenticated', 'PUBLIC')) then
    raise exception '105-goals: a new table is granted to a browser role';
  end if;

  notify pgrst, 'reload schema';
end $c105$;
