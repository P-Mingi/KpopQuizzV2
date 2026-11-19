-- 124-photoless-owned.rollback.sql (Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK, 2026-11-18; undoes 124-photoless-owned.sql)
--
-- What:   in ONE DO block, gives cards_moment, cards_profile_of, cards_ranking and cards_goals_progress their bodies of 113, 112 and 105 back (a function that does not carry the 124 mark is left alone).
-- Why:    without 124 an owned card out of packs has no "moment" answer ("cards: card", the box stays hidden), a showcase skips it, and the count of cards, the
--         ranking and the sets count the cards in packs only; nothing is lost in cards_owned.
-- Rows:   0 rows. Four functions replaced, same signatures and grants.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_moment', 'cards_profile_of', 'cards_ranking', 'cards_goals_progress') and prosrc like '%124 (owner decision 2026-11-18)%';   expect 0
-- Undo:   run 124-photoless-owned.sql again.
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c124r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regprocedure('public.cards_moment(uuid, integer)') is not null
     and (select prosrc from pg_proc where oid = 'public.cards_moment(uuid, integer)'::regprocedure) like '%124 (owner decision 2026-11-18)%' then
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
      if p_user is null then raise exception 'cards: user'; end if;
      select k.card_no, k.entity_id, k.photo_id, e.kind, e.group_id into c
        from public.cards_catalog k join public.cards_entities e on e.id = k.entity_id
       where k.card_no = p_card_no and k.in_packs and e.active;
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

  if to_regprocedure('public.cards_profile_of(uuid, uuid)') is not null
     and (select prosrc from pg_proc where oid = 'public.cards_profile_of(uuid, uuid)'::regprocedure) like '%124 (owner decision 2026-11-18)%' then
    create or replace function public.cards_profile_of(p_user uuid, p_viewer uuid)
      returns jsonb
      language plpgsql stable security definer set search_path = public
      as $f$
    declare
      v_nick text;
      v_owned integer;
      v_created timestamptz;
      v_badges jsonb := '[]'::jsonb;
      v_show jsonb;
      v_friend boolean;
      v_me boolean := p_user = p_viewer;
      r record;
    begin
      select username into v_nick from public.profiles where id = p_user;
      if v_nick is null then return null; end if;
      select count(*) into v_owned from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where o.user_id = p_user and c.in_packs;
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
         where o.user_id = p_user and c.in_packs
         order by o.favorite desc, array_position(array['C', 'U', 'R', 'SR', 'UR', 'L'], c.rarity) desc, o.card_no limit 3) s;
      v_friend := exists (select 1 from public.cards_friends f where f.user_id = p_viewer and f.friend_id = p_user);
      return jsonb_build_object('nickname', v_nick, 'owned', v_owned, 'showcase', v_show, 'badges', v_badges, 'friend', v_friend, 'me', v_me,
        'wishlist', case when v_me or v_friend then coalesce((select jsonb_agg(x.card_no order by x.card_no) from public.cards_wishlist x where x.user_id = p_user), '[]'::jsonb) else null end);
    end
    $f$;
  end if;

  if to_regprocedure('public.cards_ranking(uuid, text, integer)') is not null
     and (select prosrc from pg_proc where oid = 'public.cards_ranking(uuid, text, integer)'::regprocedure) like '%124 (owner decision 2026-11-18)%' then
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
      if p_scope not in ('friends', 'all') then raise exception 'cards: scope'; end if;
      with counts as (
        select o.user_id, count(*)::integer as n from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where c.in_packs group by o.user_id),
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

  if to_regprocedure('public.cards_goals_progress(uuid, integer[])') is not null
     and (select prosrc from pg_proc where oid = 'public.cards_goals_progress(uuid, integer[])'::regprocedure) like '%124 (owner decision 2026-11-18)%' then
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
  end if;

  if to_regprocedure('public.cards_moment(uuid, integer)') is not null then
    revoke all on function public.cards_moment(uuid, integer) from public, anon, authenticated;
    grant execute on function public.cards_moment(uuid, integer) to service_role;
  end if;
  if to_regprocedure('public.cards_profile_of(uuid, uuid)') is not null then
    revoke all on function public.cards_profile_of(uuid, uuid) from public, anon, authenticated;
    grant execute on function public.cards_profile_of(uuid, uuid) to service_role;
  end if;

  if to_regprocedure('public.cards_ranking(uuid, text, integer)') is not null then
    revoke all on function public.cards_ranking(uuid, text, integer) from public, anon, authenticated;
    grant execute on function public.cards_ranking(uuid, text, integer) to service_role;
  end if;
  if to_regprocedure('public.cards_goals_progress(uuid, integer[])') is not null then
    revoke all on function public.cards_goals_progress(uuid, integer[]) from public, anon, authenticated;
    grant execute on function public.cards_goals_progress(uuid, integer[]) to service_role;
  end if;

  notify pgrst, 'reload schema';
end $c124r$;
