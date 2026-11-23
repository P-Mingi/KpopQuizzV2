-- 127n-kpopcards-launch-notice.sql (KpopCards launch, 2026-11-23; one notification to every account: KpopCards is here)
--
-- What:   in ONE DO block, one row of public.creator_notifications per account (a profile with its auth user, not banned), type admin_dm (the
--         "Announcements" category of the notification settings), no sender (a team message):
--           title     KpopCards is here! Collect all your fave idols <3
--           body      Free K-pop photocards on Bunnyverse. Open free packs and build your collection.
--           link_url  the way to bunnyverse.org/kpopcards from the bell it shows in
--         It goes in the bell of the account's own site, once per account: kpopquiz.org for a member of KpopQuiz (or an account with no
--         membership row), else OtakuQuiz for a member of OtakuQuiz, else Bunnyverse. From kpopquiz.org and OtakuQuiz the link is the signed-in
--         jump (/auth/passport/out?to=hub&next=/kpopcards&via=k.pp or a.pp, what cardsHref of lib/cards-bridge/links.ts builds); on Bunnyverse it
--         is /kpopcards. No table, column, function, trigger or grant is created or changed.
-- Why:    the owner, 2026-11-23: "a notification to all users saying KpopCards is here, collect all your fav idols <3, to all people who have
--         an account".
-- Rows:   inserts at most one row per account; an account that turned "Announcements" off gets none (the existing BEFORE INSERT trigger
--         gate_notification_prefs skips it, as for every admin message). No existing row is changed. No e-mail and no push: nothing in the
--         database sends anything on this insert; the message waits in the bell.
-- Needs:  creator_notifications with site_id (multisite 002a) and link_url (083), the admin_dm type, public.world_memberships (multisite 003),
--         and the sites kpop, anime and hub.
-- When:   any time except 23:50 to 00:30 UTC.
-- Errors: an exception names the missing prerequisite and nothing is inserted. A second run inserts nothing ("already sent").
-- Verify: select count(*) from public.creator_notifications where type = 'admin_dm' and title = 'KpopCards is here! Collect all your fave idols <3';   expect the "sent" number of the notice
-- Verify: select site_id, count(*) from public.creator_notifications where type = 'admin_dm' and title = 'KpopCards is here! Collect all your fave idols <3' group by site_id order by 1;   expect the per-site numbers of the notice
-- Verify: select count(*) from (select user_id from public.creator_notifications where type = 'admin_dm' and title = 'KpopCards is here! Collect all your fave idols <3' group by user_id having count(*) > 1) d;   expect 0
-- Undo:   127n-kpopcards-launch-notice.rollback.sql (deletes these rows only, read or not)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c127$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_title constant text := 'KpopCards is here! Collect all your fave idols <3';
    v_body constant text := 'Free K-pop photocards on Bunnyverse. Open free packs and build your collection.';
    v_link_k constant text := '/auth/passport/out?to=hub&next=%2Fkpopcards&via=k.pp';
    v_link_a constant text := '/auth/passport/out?to=hub&next=%2Fkpopcards&via=a.pp';
    v_link_h constant text := '/kpopcards';
    v_before integer := 0;
    v_sent integer := 0;
    v_k integer := 0;
    v_a integer := 0;
    v_h integer := 0;
    v_accounts integer := 0;
  begin
  -- Prerequisites.
  if to_regclass('public.creator_notifications') is null then raise exception '127n-kpopcards-launch-notice: public.creator_notifications is missing'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'creator_notifications' and column_name = 'site_id') then
    raise exception '127n-kpopcards-launch-notice: creator_notifications.site_id is missing (multisite 002a)';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'creator_notifications' and column_name = 'link_url') then
    raise exception '127n-kpopcards-launch-notice: creator_notifications.link_url is missing (083)';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.creator_notifications'::regclass and conname = 'creator_notifications_type_check'
                 and position('''admin_dm''' in pg_get_constraintdef(oid)) > 0) then
    raise exception '127n-kpopcards-launch-notice: the type admin_dm is not allowed by creator_notifications_type_check';
  end if;
  if to_regclass('public.world_memberships') is null then raise exception '127n-kpopcards-launch-notice: public.world_memberships is missing (multisite 003)'; end if;
  if (select count(*) from public.sites where id in ('kpop', 'anime', 'hub')) <> 3 then
    raise exception '127n-kpopcards-launch-notice: the sites kpop, anime and hub are not all in public.sites';
  end if;

  select count(*) into v_before from public.creator_notifications where type = 'admin_dm' and title = v_title;

  -- One row per account that has none yet, in the bell of its own site. The gate trigger drops the row of an account with Announcements off.
  insert into public.creator_notifications (user_id, type, title, body, link_url, site_id)
  select p.id, 'admin_dm', v_title, v_body,
         case s.site when 'kpop' then v_link_k when 'anime' then v_link_a else v_link_h end,
         s.site
    from public.profiles p
    join auth.users u on u.id = p.id
    cross join lateral (
      select case
               when exists (select 1 from public.world_memberships m where m.user_id = p.id and m.site_id = 'kpop')
                 or not exists (select 1 from public.world_memberships m where m.user_id = p.id) then 'kpop'
               when exists (select 1 from public.world_memberships m where m.user_id = p.id and m.site_id = 'anime') then 'anime'
               else 'hub'
             end as site
    ) s
   where p.banned_at is null
     and not exists (select 1 from public.creator_notifications n where n.user_id = p.id and n.type = 'admin_dm' and n.title = v_title)
   order by p.id;
  get diagnostics v_sent = row_count;

  select count(*) filter (where site_id = 'kpop'), count(*) filter (where site_id = 'anime'), count(*) filter (where site_id = 'hub')
    into v_k, v_a, v_h
    from public.creator_notifications where type = 'admin_dm' and title = v_title;
  select count(*) into v_accounts from public.profiles p join auth.users u on u.id = p.id where p.banned_at is null;

  if v_sent = 0 and v_before > 0 then
    raise notice '127n-kpopcards-launch-notice: already sent (% rows), nothing inserted', v_before;
  else
    raise notice '127n-kpopcards-launch-notice: sent % of % accounts; in the bells now: kpopquiz.org %, OtakuQuiz %, Bunnyverse %; % with Announcements off got none',
      v_sent, v_accounts, v_k, v_a, v_h, v_accounts - (v_k + v_a + v_h);
  end if;
  end;
end $c127$;
