-- L34-l1-kpopdle-fill.rollback.sql (lane DLE-KPOP, run O1): undoes L34-l1-kpopdle-fill.sql.
--
-- What:   puts back the exact previous value of every cell L34 changed (idols.gender, nationality, debut_year; groups.record_label, generation), read from public.kpopdle_fill_backup,
--         each only where the row still holds the value L34 wrote (a row changed since is left alone); deletes the entity_sources rows stamped fetched_at 2026-11-22 00:00 UTC for
--         those fields; deletes the public.agencies rows L34 created (stamped created_at 2026-11-22 00:00 UTC, no child, no group using them); drops the backup table; refreshes
--         the snapshot of kpopdle-idol. Without the backup table it changes nothing. A second run changes nothing.
-- WHEN:   apply by the owner after a backup, never during a build, never between 23:50 and 00:30 UTC, one launch file at a time, the Verify lines run after it.
-- Verify: select count(*) from pg_class where oid = to_regclass('public.kpopdle_fill_backup');   expect 0
-- Verify: select count(*) from public.idols where id in (39, 46, 48, 175) and (gender is not null or nationality is not null);   expect 0
-- Verify: select count(*) from public.agencies where created_at = timestamptz '2026-11-22 00:00:00+00';   expect 0
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent.

do $o1l34r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

declare
  v_n integer := 0;
begin
  if to_regclass('public.kpopdle_fill_backup') is null then
    raise notice 'L34 rollback: no backup table, nothing to undo';
  else
    update public.idols i set gender = b.old_value #>> '{}'
    from public.kpopdle_fill_backup b
    where b.file = 'L34' and b.kind = 'idol' and b.col = 'gender' and b.row_id = i.id and to_jsonb(i.gender) = b.new_value;
    update public.idols i set nationality = b.old_value #>> '{}'
    from public.kpopdle_fill_backup b
    where b.file = 'L34' and b.kind = 'idol' and b.col = 'nationality' and b.row_id = i.id and to_jsonb(i.nationality) = b.new_value;
    update public.idols i set debut_year = (b.old_value #>> '{}')::integer
    from public.kpopdle_fill_backup b
    where b.file = 'L34' and b.kind = 'idol' and b.col = 'debut_year' and b.row_id = i.id and to_jsonb(i.debut_year) = b.new_value;
    update public.groups g set record_label = b.old_value #>> '{}'
    from public.kpopdle_fill_backup b
    where b.file = 'L34' and b.kind = 'group' and b.col = 'record_label' and b.row_id = g.id and to_jsonb(g.record_label) = b.new_value;
    update public.groups g set generation = b.old_value #>> '{}'
    from public.kpopdle_fill_backup b
    where b.file = 'L34' and b.kind = 'group' and b.col = 'generation' and b.row_id = g.id and to_jsonb(g.generation) = b.new_value;
    delete from public.entity_sources e
    where e.fetched_at = timestamptz '2026-11-22 00:00:00+00' and e.source in ('wikidata', 'wikipedia')
      and ((e.entity_type = 'idol' and e.field in ('gender', 'nationality', 'debut_year')) or (e.entity_type = 'group' and e.field in ('record_label', 'generation')));
    delete from public.agencies a
    where a.created_at = timestamptz '2026-11-22 00:00:00+00'
      and not exists (select 1 from public.agencies c where c.parent_id = a.id)
      and not exists (select 1 from public.groups g where g.record_label = a.name);
    drop table public.kpopdle_fill_backup;
    if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then
      perform public.dle_refresh_entities('kpopdle-idol');
    end if;
    notify pgrst, 'reload schema';
  end if;
end;
end $o1l34r$;
