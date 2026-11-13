-- 105-goals.sql (Bunnyverse Cards lots 3 and 4, lane GOALS, 2026-11-13; the sets, the reward packs and the week)
--
-- What:   adds the database side of Goals, in ONE DO block:
--           tables   cards_sets_claimed   one row per player and set: the set is claimed, its reward packs were given (never twice)
--                    cards_week_claims    one row per player and Paris week: the week's reward was claimed
--           columns  cards_wallets.reward_packs   reward packs waiting in Goals (opened like any pack, source 'reward')
--           constraint cards_packs_source_check   now also allows the source 'reward'
--           new functions
--                    cards_goals_progress(user, cards)   every set with its card count, the cards the player owns and whether it is claimed
--                    cards_goals_settle(user, now, cards)   claims the complete sets (those with a card in `cards` when given) and adds their packs
--                    cards_week_progress(user, now)      the week's three counters, the Paris week and whether it is claimed
--                    cards_week_claim(user, now)         claims the week once: +2 reward packs and +25 shards
--                    cards_goals_sync(user, now)         settles, then returns the packs waiting, the week and the sets (what Goals shows)
--           replaced functions (same signature, create or replace; exactly one of each name exists)
--                    cards_apply_pack   104's version plus: the source 'reward' (spends one waiting pack), the sets the pack completes
--                                       (returned as 'finished')
--                    cards_craft        104's version plus: the sets the craft completes (returned as 'finished')
-- Why:    lot 4 A15 and A16, lot 3 C2, C3, C6: a set with a fixed reward, given once; a weekly list of three goals with progress bars, no streak
--         and nothing lost by a missed week; the reward packs wait in Goals and open like any pack. Every number comes from the player's own
--         rows (packs, Kpopdle wins decided in the database, first copies): nothing is typed in by a browser.
-- Sets:   a set is complete when the player owns every card of it that is in packs today (cards_catalog.in_packs and an active entity). A claimed
--         set never pays twice, even if the catalog grows later. The sets and their reward packs:
--           group:<id>   a group (a group entity with a card in packs): its own cards and the cards of its idols (cards_entities.group_id)   +1
--           solo         the soloists: every idol card whose entity has no group subject (no group_id, or a group with no card in packs)   +1
--           holo         every Holo card (rarity R)                                                                                          +3
--           gold         every Gold card (rarity UR)                                                                                         +5
--           year:<yyyy>  a debut year (cards_entities.debut_year of the group entity) with 2 or more group subjects: all their set cards   +2
-- Week:   Monday 00:00 to the next Monday 00:00, Europe/Paris. Goals: 20 packs opened (cards_packs.opened_at, any source), 3 Kpopdle wins
--         (dle_plays won, finished in the week, read like cards_bonus_record reads them; 0 on a database without 019) and 10 cards new to the
--         player (cards_owned.first_at in the week, a craft included). All three done and claimed once: +2 reward packs and +25 shards. A missed
--         week takes nothing away: no streak, no counter outside the week.
-- Rows:   0 rows. 2 tables, 1 column, 5 new functions, 2 functions replaced. Additive: no existing table is dropped and no row is changed.
--         No XP, level, streak or badge is read or written. The routes refuse a Team account before any of these functions runs.
-- Needs:  001, 002 and 104 (cards_apply_pack and cards_craft of 104 are replaced); 103 only for the real catalog. 019 is optional (Kpopdle wins).
-- Errors: new words: reward (no reward pack waiting), claimed (the week is already claimed), goal (the week's goals are not all done).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_goals_progress', 'cards_goals_settle', 'cards_week_progress', 'cards_week_claim', 'cards_goals_sync');   expect 5
-- Verify: select proname, count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_apply_pack', 'cards_craft') group by proname order by proname;   expect cards_apply_pack 1, cards_craft 1
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cards\_%';   expect f
-- Verify: select count(*) from pg_tables where schemaname = 'public' and tablename in ('cards_sets_claimed', 'cards_week_claims') and rowsecurity;   expect 2
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_sets_claimed', 'cards_week_claims') and grantee in ('anon', 'authenticated');   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_wallets' and column_name = 'reward_packs';   expect 1
-- Verify: select pg_get_constraintdef(oid) like '%reward%' from pg_constraint where conname = 'cards_packs_source_check' and conrelid = 'public.cards_packs'::regclass;   expect t
-- Verify: select (public.cards_week_progress('00000000-0000-0000-0000-000000000000', '2026-11-12 10:00+00')) ->> 'week_start';   expect 2026-11-09
-- Verify: select count(*) from public.cards_sets_claimed;   expect 0 right after the first run (nothing is claimed for you; a set pays when a pack or a craft completes it, or when Goals is opened)
-- Undo:   105-goals.rollback.sql (puts 104's cards_apply_pack and cards_craft back; refused while a claim, a waiting reward pack or a reward pack is recorded)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c105$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_wallets') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_packs') is null
     or to_regclass('public.cards_owned') is null or to_regclass('public.cards_entities') is null then
    raise exception '105-goals: run 001-schema.sql first';
  end if;
  if to_regprocedure('public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text)') is null
     or to_regprocedure('public.cards_craft(uuid, integer, timestamptz)') is null then
    raise exception '105-goals: run 104-economy.sql first';
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

  alter table public.cards_wallets add column if not exists reward_packs integer not null default 0;
  if not exists (select 1 from pg_constraint where conname = 'cards_wallets_reward_packs_check' and conrelid = 'public.cards_wallets'::regclass) then
    alter table public.cards_wallets add constraint cards_wallets_reward_packs_check check (reward_packs >= 0);
  end if;

  -- A pack of source 'reward' is allowed in the history.
  if not exists (select 1 from pg_constraint where conname = 'cards_packs_source_check' and conrelid = 'public.cards_packs'::regclass
                  and pg_get_constraintdef(oid) like '%reward%') then
    alter table public.cards_packs drop constraint if exists cards_packs_source_check;
    alter table public.cards_packs add constraint cards_packs_source_check check (source in ('stock', 'ad', 'shards', 'bonus', 'reward'));
  end if;

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

  -- Claims the complete sets that are not claimed yet (only those holding one of p_cards when given) and adds their packs to the waiting
  -- reward packs. The primary key makes a set pay once even when two calls race. Returns the sets claimed by THIS call:
  -- [{id, kind, name, packs}], an empty list when none.
  create or replace function public.cards_goals_settle(p_user uuid, p_now timestamptz default now(), p_cards integer[] default null)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    r record;
    v_out jsonb := '[]'::jsonb;
    v_got integer;
    v_sum integer := 0;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    for r in select x.* from public.cards_goals_progress(p_user, p_cards) x where x.total > 0 and x.owned >= x.total and not x.claimed order by x.set_id loop
      insert into public.cards_sets_claimed (user_id, set_id, kind, packs, claimed_at) values (p_user, r.set_id, r.kind, r.packs, p_now)
      on conflict (user_id, set_id) do nothing;
      get diagnostics v_got = row_count;
      if v_got = 1 then
        v_sum := v_sum + r.packs;
        v_out := v_out || jsonb_build_array(jsonb_build_object('id', r.set_id, 'kind', r.kind, 'name', r.name, 'packs', r.packs));
      end if;
    end loop;
    if v_sum > 0 then
      insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
      values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
      on conflict (user_id) do nothing;
      update public.cards_wallets set reward_packs = reward_packs + v_sum, version = version + 1, updated_at = p_now where user_id = p_user;
    end if;
    return v_out;
  end
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

  -- Claims the week once: +2 reward packs and +25 shards. 'cards: claimed' when it was claimed, 'cards: goal' while a counter is short.
  create or replace function public.cards_week_claim(p_user uuid, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    v_wk jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;
    v_wk := public.cards_week_progress(p_user, p_now);
    if (v_wk ->> 'claimed')::boolean then raise exception 'cards: claimed'; end if;
    if not (v_wk ->> 'done')::boolean then raise exception 'cards: goal'; end if;
    insert into public.cards_week_claims (user_id, week_start, packs, shards, claimed_at)
    values (p_user, (v_wk ->> 'week_start')::date, (v_wk ->> 'reward_packs')::integer, (v_wk ->> 'reward_shards')::integer, p_now);
    update public.cards_wallets
       set reward_packs = reward_packs + (v_wk ->> 'reward_packs')::integer, shards = shards + (v_wk ->> 'reward_shards')::integer,
           version = version + 1, updated_at = p_now
     where user_id = p_user;
    return jsonb_build_object('packs', (v_wk ->> 'reward_packs')::integer, 'shards', (v_wk ->> 'reward_shards')::integer,
                              'reward_packs', w.reward_packs + (v_wk ->> 'reward_packs')::integer, 'shards_total', w.shards + (v_wk ->> 'reward_shards')::integer);
  end
  $f$;

  -- What the Goals tab shows: settles the sets first (a set complete before this file was applied, or after the catalog shrank, pays here),
  -- then the packs waiting, the week and every set. 'finished' lists the sets this call claimed.
  create or replace function public.cards_goals_sync(p_user uuid, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_fin jsonb;
    v_wait integer;
    v_sets jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    v_fin := public.cards_goals_settle(p_user, p_now, null);
    select coalesce((select w.reward_packs from public.cards_wallets w where w.user_id = p_user), 0) into v_wait;
    select coalesce(jsonb_agg(jsonb_build_object('id', x.set_id, 'kind', x.kind, 'name', x.name, 'packs', x.packs, 'total', x.total, 'owned', x.owned, 'claimed', x.claimed)
                              order by array_position(array['gold', 'holo', 'year', 'solo', 'group'], x.kind), x.name, x.set_id), '[]'::jsonb)
      into v_sets from public.cards_goals_progress(p_user, null) x;
    return jsonb_build_object('reward_packs', v_wait, 'week', public.cards_week_progress(p_user, p_now), 'sets', v_sets, 'finished', v_fin);
  end
  $f$;

  -- The pack: 104's cards_apply_pack plus the source 'reward' (one waiting pack is spent, 'cards: reward' when none) and the sets the five
  -- cards complete ('finished', see cards_goals_settle). Every other rule of 104 is kept as it was: the Gold guarantee, the missing half,
  -- the focus pack, the moment columns, the timer refills.
  create or replace function public.cards_apply_pack(
      p_user uuid, p_source text, p_cards integer[], p_ticket uuid default null, p_now timestamptz default now(),
      p_ads_limit integer default 10, p_bonus_cap integer default 3, p_timer_cap integer default 40, p_focus text default null)
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_today date := (p_now at time zone 'Europe/Paris')::date;
    r jsonb;
    v_stock integer;
    v_anchor timestamptz;
    v_ads integer;
    v_bonus integer;
    v_timer integer;
    v_shards integer;
    v_ok integer;
    v_want integer;
    v_fifth text;
    v_card integer;
    v_new boolean;
    v_pair boolean;
    v_part smallint;
    v_c record;
    v_out jsonb := '[]'::jsonb;
    v_seen integer[] := '{}';
    v_pack uuid;
    v_packno integer;
    v_newn integer := 0;
    v_i integer;
    v_rarity text;
    v_reward integer := 0;
    v_fin jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_source is null or p_source not in ('stock', 'shards', 'bonus', 'reward') then raise exception 'cards: source'; end if;
    if p_cards is null or cardinality(p_cards) <> 5 or array_position(p_cards, null) is not null then raise exception 'cards: pack'; end if;

    select count(distinct c.card_no) into v_ok
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = any (p_cards) and c.in_packs and e.active;
    select count(distinct x) into v_want from unnest(p_cards) as x;
    if v_ok <> v_want then raise exception 'cards: pack'; end if;
    select rarity into v_fifth from public.cards_catalog where card_no = p_cards[5];
    if v_fifth = 'C' then raise exception 'cards: pack'; end if;

    if p_focus is not null and p_source <> 'stock' then raise exception 'cards: focus'; end if;

    insert into public.cards_wallets (user_id, stock, anchor, paris_day, ads_today, bonus_today, shards, version, updated_at)
    values (p_user, 5, p_now, v_today, 0, 0, 0, 0, p_now)
    on conflict (user_id) do nothing;
    select * into w from public.cards_wallets where user_id = p_user for update;

    r := public.cards_roll(w.stock, w.anchor, w.paris_day, w.ads_today, w.bonus_today, p_now, w.timer_today, p_timer_cap);
    v_stock := (r ->> 'stock')::integer;
    v_anchor := (r ->> 'anchor')::timestamptz;
    v_ads := (r ->> 'ads_today')::integer;
    v_bonus := (r ->> 'bonus_today')::integer;
    v_timer := (r ->> 'timer_today')::integer;
    v_shards := w.shards;

    if p_source = 'stock' then
      -- A pack in the stack always opens, whatever the day's timer count (A13: the cap only stops the stack from refilling).
      if v_stock < 1 then raise exception 'cards: empty'; end if;
      v_stock := v_stock - 1;
    elsif p_source = 'shards' then
      if v_shards < 50 then raise exception 'cards: shards'; end if;
      v_shards := v_shards - 50;
    elsif p_source = 'reward' then
      -- 105: a pack the sets and the week gave, waiting in Goals (cards_wallets.reward_packs).
      if w.reward_packs < 1 then raise exception 'cards: reward'; end if;
      v_reward := 1;
    else
      if p_bonus_cap <= 0 or v_bonus >= least(p_bonus_cap, public.cards_bonus_plays(p_user, v_today)) then raise exception 'cards: bonus'; end if;
      v_bonus := v_bonus + 1;
    end if;

    -- A11 (PITY_UR 30 in rules.ts): after 29 packs in a row with no Gold and no Full Art, the 5th card of the 30th pack must be Gold, only
    -- while a Gold card is in packs. Any source counts. The refusal rolls the whole call back.
    if public.cards_pity_count(p_user) >= 29 and public.cards_pity_pool() and v_fifth is distinct from 'UR' then
      raise exception 'cards: pity';
    end if;

    -- A17: a focus pack is a pack of the stack, once a Paris day, for a group; cards 2 and 4 come from the group's cards (its own and those
    -- of its idols) unless the group has no card of their rarity.
    if p_focus is not null then
      if not exists (select 1 from public.cards_entities where id = p_focus and kind = 'group' and active) then raise exception 'cards: focus'; end if;
      if public.cards_focus_used(p_user, p_now) then raise exception 'cards: focus_used'; end if;
      foreach v_i in array array[2, 4] loop
        select c.rarity into v_rarity from public.cards_catalog c where c.card_no = p_cards[v_i];
        if not exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                        where c.card_no = p_cards[v_i] and (c.entity_id = p_focus or e.group_id = p_focus))
           and exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                        where c.rarity = v_rarity and c.in_packs and e.active and (c.entity_id = p_focus or e.group_id = p_focus)) then
          raise exception 'cards: pack';
        end if;
      end loop;
    end if;

    select count(*) + 1 into v_packno from public.cards_packs where user_id = p_user;

    foreach v_card in array p_cards loop
      v_new := not (v_card = any (v_seen)) and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
      v_seen := v_seen || v_card;
      -- A12: a new card whose other half (same subject, same rarity, the other part) is already owned completes the pair. The cards of this
      -- pack stored before this one count, because they are in cards_owned by now.
      v_pair := false;
      if v_new then
        v_newn := v_newn + 1;
        select c.entity_id, c.rarity, c.part into v_c from public.cards_catalog c where c.card_no = v_card;
        v_part := v_c.part;
        if v_part in (1, 2) then
          v_pair := exists (select 1 from public.cards_catalog h join public.cards_owned o on o.card_no = h.card_no and o.user_id = p_user
                             where h.entity_id = v_c.entity_id and h.rarity = v_c.rarity and h.part = 3 - v_part);
        end if;
      end if;
      insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source)
      values (p_user, v_card, 1, p_now, p_now, v_packno, 'pack')
      on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
      v_out := v_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new, 'completesPair', v_pair));
    end loop;
    delete from public.cards_wishlist where user_id = p_user and card_no = any (p_cards);
    -- 105: a set this pack completes pays its reward packs now (once per set, ever).
    v_fin := public.cards_goals_settle(p_user, p_now, p_cards);

    insert into public.cards_packs (user_id, source, cards, opened_at, focus, new_count)
    values (p_user, p_source, p_cards, p_now, p_focus, v_newn) returning id into v_pack;

    update public.cards_wallets
       set stock = v_stock, anchor = v_anchor, paris_day = v_today, ads_today = v_ads, bonus_today = v_bonus, timer_today = v_timer,
           shards = v_shards, reward_packs = reward_packs - v_reward, version = version + 1, updated_at = p_now
     where user_id = p_user;

    return jsonb_build_object('id', v_pack, 'source', p_source, 'cards', v_out, 'new_count', v_newn, 'pack_no', v_packno, 'finished', v_fin);
  end
  $f$;

  -- The craft: 104's cards_craft plus the sets the crafted card completes ('finished').
  create or replace function public.cards_craft(p_user uuid, p_card_no integer, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    w public.cards_wallets%rowtype;
    v_rarity text;
    v_cost integer;
    v_packno integer;
    v_fin jsonb;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    select c.rarity into v_rarity
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = p_card_no and c.in_packs and e.active;
    if v_rarity is null then raise exception 'cards: card'; end if;
    if v_rarity = 'L' then raise exception 'cards: no_craft'; end if;
    v_cost := case v_rarity when 'C' then 10 when 'U' then 20 when 'R' then 50 when 'SR' then 120 else 300 end;

    select * into w from public.cards_wallets where user_id = p_user for update;
    if not found then raise exception 'cards: shards'; end if;
    if exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = p_card_no) then raise exception 'cards: owned'; end if;
    if w.shards < v_cost then raise exception 'cards: shards'; end if;

    select count(*) into v_packno from public.cards_packs where user_id = p_user;
    update public.cards_wallets set shards = shards - v_cost, version = version + 1, updated_at = p_now where user_id = p_user;
    insert into public.cards_owned (user_id, card_no, copies, first_at, last_at, first_pack_no, first_source)
    values (p_user, p_card_no, 1, p_now, p_now, v_packno, 'craft');
    insert into public.cards_crafts (user_id, card_no, rarity, cost, crafted_at) values (p_user, p_card_no, v_rarity, v_cost, p_now);
    delete from public.cards_wishlist where user_id = p_user and card_no = p_card_no;
    -- 105: a craft that completes a set pays it like a pack does.
    v_fin := public.cards_goals_settle(p_user, p_now, array[p_card_no]);
    return jsonb_build_object('card_no', p_card_no, 'rarity', v_rarity, 'cost', v_cost, 'shards', w.shards - v_cost, 'finished', v_fin);
  end
  $f$;

  revoke all on function public.cards_goals_progress(uuid, integer[]) from public, anon, authenticated;
  revoke all on function public.cards_goals_settle(uuid, timestamptz, integer[]) from public, anon, authenticated;
  revoke all on function public.cards_week_progress(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_week_claim(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_goals_sync(uuid, timestamptz) from public, anon, authenticated;
  revoke all on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) from public, anon, authenticated;
  revoke all on function public.cards_craft(uuid, integer, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_goals_progress(uuid, integer[]) to service_role;
  grant execute on function public.cards_goals_settle(uuid, timestamptz, integer[]) to service_role;
  grant execute on function public.cards_week_progress(uuid, timestamptz) to service_role;
  grant execute on function public.cards_week_claim(uuid, timestamptz) to service_role;
  grant execute on function public.cards_goals_sync(uuid, timestamptz) to service_role;
  grant execute on function public.cards_apply_pack(uuid, text, integer[], uuid, timestamptz, integer, integer, integer, text) to service_role;
  grant execute on function public.cards_craft(uuid, integer, timestamptz) to service_role;

  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_apply_pack') <> 1
     or (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_craft') <> 1 then
    raise exception '105-goals: cards_apply_pack and cards_craft must each exist once';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename in ('cards_sets_claimed', 'cards_week_claims') and not rowsecurity) then
    raise exception '105-goals: a new table has row level security off';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('cards_sets_claimed', 'cards_week_claims')
             and grantee in ('anon', 'authenticated', 'PUBLIC')) then
    raise exception '105-goals: a new table is granted to a browser role';
  end if;

  notify pgrst, 'reload schema';
end $c105$;
