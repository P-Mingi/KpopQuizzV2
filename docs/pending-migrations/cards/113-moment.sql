-- 113-moment.sql (KpopCards lots 3 + 4 + 5, 2026-11-13; "The moment" of the card view: the event of the photo, the player's first copy, the quiz link)
--
-- What:   in ONE DO block:
--           column   cards_photos.event_precision   how much of event_date is known: 'day', 'month' or 'year' (null for no date); existing dates read as 'day'
--           function cards_moment(user, card_no)     the facts of one card in packs: the photo's event (name, date, precision), the player's first copy of it
--                                                    (when, in which of his packs, pack / craft / demo, copies) and the kpopquiz.org slug of its quiz page
-- Why:    lot 4 B3: the card view tells the moment the photo was taken (a null event hides the line), when and how the player got the card
--         ("Pulled on ..., pack 12" or "Crafted on ..."), and links to the idol's or the group's quiz on kpopquiz.org when that page exists.
-- Rows:   0 rows. 1 column, 1 function. Additive: the dates already stored are 'day' dates and keep reading as such.
-- Needs:  001 and 104 (cards_owned.first_pack_no, first_source). The quiz slug is read from public.groups when that table exists (the kpopquiz.org
--         groups, slug = the entity id after the colon); without it the slug is null and the link is hidden.
-- Errors: "cards: card" (not a card in packs), "cards: user".
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'event_precision';   expect 1
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_moment';   expect 1
-- Verify: select bool_or(has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cards_moment';   expect f
-- Undo:   113-moment.rollback.sql (drops the function and the column)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c113$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_photos') is null or to_regclass('public.cards_owned') is null then
    raise exception '113-moment: run 001-schema.sql first';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_owned' and column_name = 'first_pack_no') then
    raise exception '113-moment: run 104-economy.sql first';
  end if;

  alter table public.cards_photos add column if not exists event_precision text;
  if not exists (select 1 from pg_constraint where conname = 'cards_photos_event_precision_check' and conrelid = 'public.cards_photos'::regclass) then
    alter table public.cards_photos add constraint cards_photos_event_precision_check check (event_precision is null or event_precision in ('day', 'month', 'year'));
  end if;
  update public.cards_photos set event_precision = 'day' where event_date is not null and event_precision is null;

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

  revoke all on function public.cards_moment(uuid, integer) from public, anon, authenticated;
  grant execute on function public.cards_moment(uuid, integer) to service_role;

  notify pgrst, 'reload schema';
end $c113$;
