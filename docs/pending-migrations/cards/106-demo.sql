-- 106-demo.sql (Bunnyverse Cards lot 3, 2026-11-13; lane UI, integrator point A18 / lot 4 C5: the guest demo pack)
--
-- What:   adds the claim of a demo pack. A signed-out visitor opens ONE demo pack (drawn by the server, signed with an HMAC the server
--         keeps); when the visitor signs in, the browser posts that token once and the five cards are added to the binder. This file
--         holds the table of claims and the one function that adds the cards:
--           cards_demo_claims                      one row per claimed token
--           cards_demo_claim(user, jti, cards, device_hash, ip_hash, now)   checks the limits, stores the claim, adds the cards
--         The token itself (its signature and its age) is checked by the server route before this function runs; this function never sees
--         a secret. The device id and the IP address arrive HASHED with a salt only the server knows; the database never holds either one in
--         the clear.
-- Rules:  one claim per token (jti is the key); at most 1 claim a day per device hash and 3 a day per IP hash (the Paris day of p_now);
--         rows older than 7 days are deleted by the function on each call, so a token must not live longer than that (the route gives it
--         2 days). A Team account never claims: the route refuses it before calling (teamRefusal); the function adds nothing for a
--         card that is no longer in packs. If cards_owned has the column first_source (lane ECON), a card that is new to the player is
--         marked 'demo' there; without that column, or if its check refuses the word, nothing more is written.
-- Why:    the owner wants a visitor to feel a pack before creating an account, and the cards to be real afterwards: the demo is attached to
--         the account, not thrown away. No wallet, stock, shard or pack row is touched: a demo costs nothing and is not a pack of the stack.
-- Rows:   0 rows. 1 table, 3 indexes besides the key, 1 function. Additive: no existing table or function is changed.
-- Needs:  001 and 002 (cards_catalog, cards_entities, cards_owned); auth.users.
-- Errors: a refusal is an exception whose message starts with 'cards: ' and one word: user, pack, demo_used (the token was claimed),
--         demo_device (this device claimed one today), demo_ip (3 claims today from this network).
-- Verify: select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'cards_demo_claims';   expect 1
-- Verify: select relrowsecurity from pg_class where oid = 'public.cards_demo_claims'::regclass;   expect t
-- Verify: select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_demo_claims' and grantee in ('anon', 'authenticated', 'PUBLIC');   expect 0
-- Verify: select has_function_privilege('service_role', 'public.cards_demo_claim(uuid, text, integer[], text, text, timestamptz)', 'execute');   expect t
-- Verify: select has_function_privilege('anon', 'public.cards_demo_claim(uuid, text, integer[], text, text, timestamptz)', 'execute') or has_function_privilege('authenticated', 'public.cards_demo_claim(uuid, text, integer[], text, text, timestamptz)', 'execute');   expect f
-- Verify: select count(*) from public.cards_demo_claims;   expect 0
-- Undo:   106-demo.rollback.sql (drops the function and the table; the cards already added to binders stay).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c106$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_owned') is null or to_regclass('public.cards_catalog') is null or to_regclass('public.cards_entities') is null then
    raise exception '106-demo: run 001-schema.sql and 002-functions.sql first';
  end if;

  create table if not exists public.cards_demo_claims (
    jti text constraint cards_demo_claims_pkey primary key constraint cards_demo_claims_jti_check check (length(jti) between 16 and 64),
    user_id uuid not null constraint cards_demo_claims_user_id_fkey references auth.users(id) on delete cascade,
    device_hash text not null constraint cards_demo_claims_device_check check (length(device_hash) between 16 and 128),
    ip_hash text not null constraint cards_demo_claims_ip_check check (length(ip_hash) between 16 and 128),
    cards integer[] not null constraint cards_demo_claims_cards_check check (cardinality(cards) = 5),
    claimed_day date not null,
    claimed_at timestamptz not null default now()
  );
  alter table public.cards_demo_claims enable row level security;
  revoke all on table public.cards_demo_claims from public, anon, authenticated;
  create index if not exists cards_demo_claims_device_idx on public.cards_demo_claims (device_hash, claimed_day);
  create index if not exists cards_demo_claims_ip_idx on public.cards_demo_claims (ip_hash, claimed_day);
  create index if not exists cards_demo_claims_at_idx on public.cards_demo_claims (claimed_at);

  create or replace function public.cards_demo_claim(
      p_user uuid, p_jti text, p_cards integer[], p_device text, p_ip text, p_now timestamptz default now())
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    v_day date := (p_now at time zone 'Europe/Paris')::date;
    v_card integer;
    v_new boolean;
    v_seen integer[] := '{}';
    v_out jsonb := '[]'::jsonb;
    v_ok integer;
    v_has_src boolean;
  begin
    if p_user is null then raise exception 'cards: user'; end if;
    if p_jti is null or length(p_jti) not between 16 and 64 then raise exception 'cards: demo_used'; end if;
    if p_cards is null or cardinality(p_cards) <> 5 or array_position(p_cards, null) is not null then raise exception 'cards: pack'; end if;
    if p_device is null or p_ip is null then raise exception 'cards: user'; end if;

    -- Serialise the claims of one device and one network, so two tabs cannot both pass the count.
    perform pg_advisory_xact_lock(hashtext('cards_demo:d:' || p_device));
    perform pg_advisory_xact_lock(hashtext('cards_demo:i:' || p_ip));

    -- The rows older than 7 days go (the IP hash is kept no longer than that).
    delete from public.cards_demo_claims where claimed_at < p_now - interval '7 days';

    if exists (select 1 from public.cards_demo_claims where jti = p_jti) then raise exception 'cards: demo_used'; end if;
    if (select count(*) from public.cards_demo_claims where device_hash = p_device and claimed_day = v_day) >= 1 then raise exception 'cards: demo_device'; end if;
    if (select count(*) from public.cards_demo_claims where ip_hash = p_ip and claimed_day = v_day) >= 3 then raise exception 'cards: demo_ip'; end if;

    -- Only the cards still in packs are added (a photo may have been retired since the token was signed). None left: nothing to claim.
    select count(distinct c.card_no) into v_ok
      from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
     where c.card_no = any (p_cards) and c.in_packs and e.active;
    if v_ok = 0 then raise exception 'cards: pack'; end if;

    insert into public.cards_demo_claims (jti, user_id, device_hash, ip_hash, cards, claimed_day, claimed_at)
    values (p_jti, p_user, p_device, p_ip, p_cards, v_day, p_now);

    v_has_src := exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_owned' and column_name = 'first_source');

    foreach v_card in array p_cards loop
      if not exists (select 1 from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
                      where c.card_no = v_card and c.in_packs and e.active) then
        continue;
      end if;
      v_new := not (v_card = any (v_seen)) and not exists (select 1 from public.cards_owned o where o.user_id = p_user and o.card_no = v_card);
      v_seen := v_seen || v_card;
      insert into public.cards_owned as o (user_id, card_no, copies, first_at, last_at)
      values (p_user, v_card, 1, p_now, p_now)
      on conflict (user_id, card_no) do update set copies = o.copies + 1, last_at = p_now;
      if v_new and v_has_src then
        -- Lane ECON's column: the first source of a card. If its check does not know 'demo', the card keeps what the column holds.
        begin
          execute 'update public.cards_owned set first_source = ''demo'' where user_id = $1 and card_no = $2' using p_user, v_card;
        exception when check_violation then
          null;
        end;
      end if;
      v_out := v_out || jsonb_build_array(jsonb_build_object('n', v_card, 'isNew', v_new));
    end loop;

    return jsonb_build_object('cards', v_out);
  end
  $f$;

  revoke all on function public.cards_demo_claim(uuid, text, integer[], text, text, timestamptz) from public, anon, authenticated;
  grant execute on function public.cards_demo_claim(uuid, text, integer[], text, text, timestamptz) to service_role;
  -- The service role needs the table too (the function is security definer, but the purge and the tests read it).
  grant select, insert, delete on table public.cards_demo_claims to service_role;

  if not (select relrowsecurity from pg_class where oid = 'public.cards_demo_claims'::regclass) then
    raise exception '106-demo: cards_demo_claims has row level security off';
  end if;
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'cards_demo_claims'
             and grantee in ('anon', 'authenticated', 'PUBLIC')) then
    raise exception '106-demo: cards_demo_claims is granted to a browser role';
  end if;
end
$c106$;
