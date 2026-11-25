-- L39-l1-kpopdle-agencies-again.rollback.sql (undo of L39-l1-kpopdle-agencies-again.sql; ORCH of run O1)
--
-- What:   in ONE DO block, puts back the label of every group logged in public.o1_l39_agencies, only where the group still holds the value L39 wrote
--         (a later change is left alone and named in a notice), refreshes the Kpopdle snapshot, then drops the log table. The Wikipedia source rows
--         stay: L19 and L34 wrote them, not L39.
-- WHEN:   apply by the owner, never between 23:50 and 00:30 UTC.
-- Verify: select to_regclass('public.o1_l39_agencies');   expect null
-- o1-transaction: single, ONE DO block. A second run changes nothing.

do $l39r$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_done integer := 0;
    v_left integer := 0;
  begin
  if to_regclass('public.o1_l39_agencies') is null then
    raise notice 'L39 rollback: nothing to undo (no log table)';
    return;
  end if;

  select count(*) into v_left from public.o1_l39_agencies l join public.groups g on g.id = l.group_id where g.record_label is distinct from l.new_label;

  update public.groups g set record_label = l.old_label
    from public.o1_l39_agencies l
   where g.id = l.group_id and g.record_label = l.new_label;
  get diagnostics v_done = row_count;

  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then
    perform public.dle_refresh_entities('kpopdle-idol');
  end if;

  drop table public.o1_l39_agencies;
  raise notice 'L39 rollback: % label(s) put back; % left alone (changed since L39)', v_done, v_left;
  end;
end $l39r$;
