-- 124-photoless-owned.sql (Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK, 2026-11-18; the owned cards that lost their photo stay in the binder AND keep counting)
--
-- What:   in ONE DO block, four functions get one change each (everything else of their bodies is 113's, 112's and 105's, copied):
--           cards_moment(user, card_no)        answers for a card OUT of packs too when the user owns it (before: "cards: card"), so the card page of an owned
--                                              card that lost its photo (119-photocheck) still has "The moment": no event, "Pulled on ...", the quiz link
--           cards_profile_of(user, viewer)     the showcase of three may hold an owned card out of packs; "owned" (the level, the "100 cards" badge, the pct of the
--                                              friends and ranking pages) counts EVERY card the user owns, and the new key "retired" says how many of them are out of
--                                              packs (the code adds them to that player's total, so a player never shows more than 100 %)
--           cards_ranking(user, scope, limit)  ranks by every card owned, retired ones included (a removal never moves a player down)
--           cards_goals_progress(user, cards)  for THIS player a set holds the cards in packs AND the cards he owns that are out of packs: his total and his owned both
--                                              keep the card, so a set never goes back, never shows more than 100 %, and "<group> complete" stays earned. A card out of
--                                              packs that nobody owns is in no set of anybody (nobody can collect it)
-- Why:    owner decision 2026-11-18: an owned card whose photo is gone (photo_id null, out of packs, 119 or any later removal: rights, the minors rule)
--         stays in the binder as a "New photo coming" frame (its number, edition and name, no image) and keeps counting everywhere it counted: the number of
--         cards, the level, the progress of the collection and of its group, the sets, the ranking. The player loses nothing because a photo was removed, and
--         takes the photo back when a new one arrives. The code already shows the frame and counts it (retired cards, withOwnedRetired, the model); these four
--         answers are the part that is in the database.
-- Order:  apply it BEFORE 119 (119 is what takes the photos away, and the counts of an owner of retired cards drop at that moment without this file). Applied after
--         119 it also works, nothing is lost: cards_owned is never touched. The CODE that draws and counts the frame must be live before 119 is applied.
-- Rows:   0 rows written and nothing recalculated: no experience, level, daily streak, badge or set claim row is touched; only how four answers count. A badge or a set
--         already earned stays earned. Four functions replaced (create or replace, same signatures and grants: service_role only). Additive: no answer changes unless
--         the user owns a card that is out of packs.
--         cards_open keeps its own owned_before / owned_after (cards in packs): the code adds the player's retired cards to both, so a level-up is read right.
-- Needs:  105 (cards_goals_progress), 112 (cards_profile_of, cards_ranking) and 113 (cards_moment).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_moment', 'cards_profile_of', 'cards_ranking', 'cards_goals_progress') and prosrc like '%124 (owner decision 2026-11-18)%';   expect 4
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_moment', 'cards_profile_of', 'cards_ranking', 'cards_goals_progress');   expect f
-- Verify: select count(*) from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where not c.in_packs;   (information: the owned cards out of packs; 119 makes them)
-- Verify: select count(*) from public.profiles p where (public.cards_profile_of(p.id, p.id) ->> 'owned')::integer <> (select count(*) from public.cards_owned o where o.user_id = p.id);   expect 0 (every owned card counts)
-- Undo:   124-photoless-owned.rollback.sql (gives 105's, 112's and 113's bodies back)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c124$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regprocedure('public.cards_moment(uuid, integer)') is null then
    raise exception '124-photoless-owned: run 113-moment.sql first';
  end if;
  if to_regprocedure('public.cards_profile_of(uuid, uuid)') is null then
    raise exception '124-photoless-owned: run 112-social.sql first';
  end if;
  if to_regprocedure('public.cards_ranking(uuid, text, integer)') is null then
    raise exception '124-photoless-owned: run 112-social.sql first';
  end if;
  if to_regprocedure('public.cards_goals_progress(uuid, integer[])') is null then
    raise exception '124-photoless-owned: run 105-goals.sql first';
  end if;
  if to_regclass('public.cards_owned') is null or to_regclass('public.cards_entities') is null then
    raise exception '124-photoless-owned: run 001-schema.sql first';
  end if;

  -- Guarded: a function already carrying the 124 mark is left as it is.
  if (select prosrc from pg_proc where oid = 'public.cards_moment(uuid, integer)'::regprocedure) not like '%124 (owner decision 2026-11-18)%' then
    create or replace function public.cards_moment(p_user uuid, p_card_no integer)
      returns jsonb
      language plpgsql stable security definer set search_path = public
      as $f$
    declare
      c record;
      p record;
      o record;
      v_slug text;
      v_has_groups boolean := to_regclass('public.groups') is not null;
      v_idol text;
      v_group text;
    begin
      -- 124 (owner decision 2026-11-18): a card out of packs is still a card of its owner (it shows as "New photo coming"), so its moment is answered for him.
      if p_user is null then raise exception 'cards: user'; end if;
      select k.card_no, k.entity_id, k.photo_id, e.kind, e.group_id into c
        from public.cards_catalog k join public.cards_entities e on e.id = k.entity_id
       where k.card_no = p_card_no and e.active
         and (k.in_packs or exists (select 1 from public.cards_owned w where w.user_id = p_user and w.card_no = p_card_no and w.copies > 0));
      if not found then raise exception 'cards: card'; end if;
      select ph.event_name, ph.event_date, ph.event_precision into p from public.cards_photos ph where ph.id = c.photo_id;
      select w.copies, w.first_at, w.first_pack_no, w.first_source into o from public.cards_owned w where w.user_id = p_user and w.card_no = p_card_no;
      -- The quiz page: the slug of the idol (or of the group itself) when a kpopquiz.org groups row has it, else the slug of its group.
      v_idol := regexp_replace(c.entity_id, '^[a-z]+:', '');
      v_group := case when c.group_id is null then null else regexp_replace(c.group_id, '^[a-z]+:', '') end;
      if v_has_groups then
        execute 'select slug from public.groups where slug = any ($1) order by (slug = $2) desc limit 1' into v_slug using array_remove(array[v_idol, v_group], null), v_idol;
      end if;
      return jsonb_build_object(
        'n', p_card_no,
        'event', case when p.event_name is null then null
                      else jsonb_build_object('name', p.event_name, 'date', p.event_date, 'precision', case when p.event_date is null then null else coalesce(p.event_precision, 'day') end) end,
        'yours', case when o.first_at is null then null
                      else jsonb_build_object('first_at', o.first_at, 'pack_no', o.first_pack_no, 'how', coalesce(o.first_source, 'pack'), 'copies', o.copies) end,
        'quiz_slug', v_slug);
    end
    $f$;
  end if;

  if (select prosrc from pg_proc where oid = 'public.cards_profile_of(uuid, uuid)'::regprocedure) not like '%124 (owner decision 2026-11-18)%' then
    create or replace function public.cards_profile_of(p_user uuid, p_viewer uuid)
      returns jsonb
      language plpgsql stable security definer set search_path = public
      as $f$
    declare
      v_nick text;
      v_owned integer;
      v_retired integer;
      v_created timestamptz;
      v_badges jsonb := '[]'::jsonb;
      v_show jsonb;
      v_friend boolean;
      v_me boolean := p_user = p_viewer;
      r record;
    begin
      -- 124 (owner decision 2026-11-18): a card out of packs ("New photo coming") still counts and may be in the showcase; "retired" says how many such cards the user owns.
      select username into v_nick from public.profiles where id = p_user;
      if v_nick is null then return null; end if;
      select count(*), count(*) filter (where not c.in_packs) into v_owned, v_retired from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user;
      select coalesce((select w.created_at from public.cards_wallets w where w.user_id = p_user), now()) into v_created;
      if v_created < timestamptz '2027-03-01 00:00+00' then v_badges := v_badges || to_jsonb('Founder'::text); end if;
      for r in select x.name from public.cards_goals_progress(p_user, null) x where x.kind = 'group' and x.total > 0 and x.owned >= x.total order by x.name loop
        v_badges := v_badges || to_jsonb(r.name || ' complete');
      end loop;
      if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.rarity = 'UR') then v_badges := v_badges || to_jsonb('First Gold'::text); end if;
      if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.rarity = 'L') then v_badges := v_badges || to_jsonb('First Full Art'::text); end if;
      if v_owned >= 100 then v_badges := v_badges || to_jsonb('100 cards'::text); end if;
      select coalesce(jsonb_agg(s.card_no), '[]'::jsonb) into v_show from (
        select o.card_no from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no
         where o.user_id = p_user and (c.in_packs or exists (select 1 from public.cards_entities e where e.id = c.entity_id and e.active))
         order by o.favorite desc, array_position(array['C', 'U', 'R', 'SR', 'UR', 'L'], c.rarity) desc, o.card_no limit 3) s;
      v_friend := exists (select 1 from public.cards_friends f where f.user_id = p_viewer and f.friend_id = p_user);
      return jsonb_build_object('nickname', v_nick, 'owned', v_owned, 'retired', v_retired, 'showcase', v_show, 'badges', v_badges, 'friend', v_friend, 'me', v_me,
        'wishlist', case when v_me or v_friend then coalesce((select jsonb_agg(x.card_no order by x.card_no) from public.cards_wishlist x where x.user_id = p_user), '[]'::jsonb) else null end);
    end
    $f$;
  end if;

  if (select prosrc from pg_proc where oid = 'public.cards_ranking(uuid, text, integer)'::regprocedure) not like '%124 (owner decision 2026-11-18)%' then
    create or replace function public.cards_ranking(p_user uuid, p_scope text, p_limit integer default 50)
      returns jsonb
      language plpgsql stable security definer set search_path = public
      as $f$
    declare
      r record;
      v_out jsonb := '[]'::jsonb;
      v_ids uuid[];
      v_me jsonb;
      v_lim integer := greatest(1, least(coalesce(p_limit, 50), 100));
    begin
      -- 124 (owner decision 2026-11-18): every card owned counts, the ones out of packs too.
      if p_scope not in ('friends', 'all') then raise exception 'cards: scope'; end if;
      with counts as (
        select o.user_id, count(*)::integer as n from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no group by o.user_id),
      pool as (
        select p.id, p.username, coalesce(c.n, 0) as n
          from public.profiles p left join counts c on c.user_id = p.id
         where (p_scope = 'all' and coalesce(c.n, 0) > 0)
            or (p_scope = 'friends' and (p.id = p_user or p.id in (select f.friend_id from public.cards_friends f where f.user_id = p_user)))),
      ranked as (select pool.*, row_number() over (order by pool.n desc, pool.username) as pos from pool)
      select array_agg(ranked.id order by ranked.pos) into v_ids from ranked where ranked.pos <= v_lim or ranked.id = p_user;
      for r in select x.id, row_number() over () as pos from unnest(coalesce(v_ids, '{}')) with ordinality as x(id, ord) order by x.ord loop
        v_me := public.cards_profile_of(r.id, p_user);
        if v_me is not null then v_out := v_out || jsonb_build_array(v_me); end if;
      end loop;
      return v_out;
    end
    $f$;
  end if;

  -- Every set with its cards, how many of them the player owns, and whether the set is claimed. For THIS player a set holds the cards in packs and the cards he
  -- owns that are out of packs (never a card out of packs that he does not own), so a removal moves neither his total nor his owned.
  if (select prosrc from pg_proc where oid = 'public.cards_goals_progress(uuid, integer[])'::regprocedure) not like '%124 (owner decision 2026-11-18)%' then
    create or replace function public.cards_goals_progress(p_user uuid, p_cards integer[] default null)
      returns table (set_id text, kind text, name text, packs integer, total integer, owned integer, claimed boolean)
      language sql stable security definer set search_path = public
      as $f$
        -- 124 (owner decision 2026-11-18): the cards this player owns that are out of packs stay in his sets.
        with live as (
          select c.card_no, c.rarity, c.entity_id, e.kind as ekind, e.group_id, e.name as ename
            from public.cards_catalog c join public.cards_entities e on e.id = c.entity_id
           where e.active
             and (c.in_packs or exists (select 1 from public.cards_owned w where w.user_id = p_user and w.card_no = c.card_no))),
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
  end if;

  revoke all on function public.cards_moment(uuid, integer) from public, anon, authenticated;
  grant execute on function public.cards_moment(uuid, integer) to service_role;
  revoke all on function public.cards_profile_of(uuid, uuid) from public, anon, authenticated;
  grant execute on function public.cards_profile_of(uuid, uuid) to service_role;
  revoke all on function public.cards_ranking(uuid, text, integer) from public, anon, authenticated;
  grant execute on function public.cards_ranking(uuid, text, integer) to service_role;
  revoke all on function public.cards_goals_progress(uuid, integer[]) from public, anon, authenticated;
  grant execute on function public.cards_goals_progress(uuid, integer[]) to service_role;

  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_moment', 'cards_profile_of', 'cards_ranking', 'cards_goals_progress') and prosrc like '%124 (owner decision 2026-11-18)%') <> 4 then
    raise exception '124-photoless-owned: a function does not carry the change';
  end if;
  if exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('cards_moment', 'cards_profile_of', 'cards_ranking', 'cards_goals_progress')
               and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) then
    raise exception '124-photoless-owned: a function is granted to a browser role';
  end if;

  notify pgrst, 'reload schema';
end $c124$;
