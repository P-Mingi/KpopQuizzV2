-- 127n-kpopcards-launch-notice.rollback.sql (KpopCards launch, 2026-11-23; takes the "KpopCards is here" notification back)
--
-- What:   in ONE DO block, deletes the rows 127n-kpopcards-launch-notice.sql inserted: type admin_dm, no sender, its title, its body and one of
--         its three links. Read or not, they leave every bell. Nothing else is touched (an admin message sent by hand, even with the same
--         title, has a sender and stays).
-- Why:    the undo of 127n-kpopcards-launch-notice.sql.
-- Rows:   deletes those rows only; the notice gives the number.
-- When:   any time except 23:50 to 00:30 UTC.
-- Verify: select count(*) from public.creator_notifications where type = 'admin_dm' and title = 'KpopCards is here! Collect all your fave idols <3' and sender_id is null;   expect 0
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run deletes nothing.

do $c127r$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_title constant text := 'KpopCards is here! Collect all your fave idols <3';
    v_body constant text := 'Free K-pop photocards on Bunnyverse. Open free packs and build your collection.';
    v_gone integer := 0;
  begin
  if to_regclass('public.creator_notifications') is null then raise exception '127n-kpopcards-launch-notice.rollback: public.creator_notifications is missing'; end if;

  delete from public.creator_notifications
   where type = 'admin_dm'
     and title = v_title
     and body = v_body
     and sender_id is null
     and link_url in ('/auth/passport/out?to=hub&next=%2Fkpopcards&via=k.pp', '/auth/passport/out?to=hub&next=%2Fkpopcards&via=a.pp', '/kpopcards');
  get diagnostics v_gone = row_count;
  raise notice '127n-kpopcards-launch-notice.rollback: % notifications deleted', v_gone;
  end;
end $c127r$;
