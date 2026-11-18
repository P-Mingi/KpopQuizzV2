-- 124-photoless-owned.rollback.sql (Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK, 2026-11-18; undoes 124-photoless-owned.sql)
--
-- What:   in ONE DO block, gives cards_moment and cards_profile_of their bodies of 113 and 112 back (a function that does not carry the 124 mark is left alone).
-- Why:    without 124 an owned card out of packs has no "moment" answer ("cards: card", the box stays hidden) and a showcase skips it; nothing is lost.
-- Rows:   0 rows. Two functions replaced, same signatures and grants.
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_moment', 'cards_profile_of') and prosrc like '%124 (owner decision 2026-11-18)%';   expect 0
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

  if to_regprocedure('public.cards_moment(uuid, integer)') is not null then
    revoke all on function public.cards_moment(uuid, integer) from public, anon, authenticated;
    grant execute on function public.cards_moment(uuid, integer) to service_role;
  end if;
  if to_regprocedure('public.cards_profile_of(uuid, uuid)') is not null then
    revoke all on function public.cards_profile_of(uuid, uuid) from public, anon, authenticated;
    grant execute on function public.cards_profile_of(uuid, uuid) to service_role;
  end if;

  notify pgrst, 'reload schema';
end $c124r$;
