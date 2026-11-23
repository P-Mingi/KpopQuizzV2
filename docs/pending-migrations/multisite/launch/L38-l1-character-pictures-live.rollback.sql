-- L38-l1-character-pictures-live.rollback.sql (the undo of L38: the character pictures it put live go back to what they were)
--
-- What:   in ONE DO block, every row logged in public.o1_l38_verified_pictures gets back its former license_verified flag and, when its source page
--         is still the https address L38 wrote, its former http source page; then the log table is dropped. A picture the owner changed in the
--         admin after L38 keeps its new source page (its flag goes back all the same).
-- Why:    the undo of L38-l1-character-pictures-live.sql.
-- Rows:   updates the logged pictures only; drops the log table.
-- WHEN:   apply by the owner, never between 23:50 and 00:30 UTC.
-- Verify: select to_regclass('public.o1_l38_verified_pictures');   expect null
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $l38r$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_back integer := 0;
  begin
  if to_regclass('public.o1_l38_verified_pictures') is null then
    raise notice 'L38 rollback: nothing to undo (the log table is not there)';
  else
    -- One statement that names license_verified: the triggers of 022 keep the flag it sets although the source page changes.
    update public.entity_images e
       set license_verified = l.was_verified,
           source_url = case when l.old_source_url ~ '^http://' and e.source_url = 'https://' || substr(l.old_source_url, 8) then l.old_source_url else e.source_url end
      from public.o1_l38_verified_pictures l
     where e.id = l.image_id;
    get diagnostics v_back = row_count;
    drop table public.o1_l38_verified_pictures;
    raise notice 'L38 rollback: % character pictures put back', v_back;
  end if;
  end;
end $l38r$;
