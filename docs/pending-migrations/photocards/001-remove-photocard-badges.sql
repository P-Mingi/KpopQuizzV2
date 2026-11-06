-- 001-remove-photocard-badges.sql (owner order 2026-11-06): the 6 photocard achievements leave kpopquiz.org.
-- Owner-run, production write. Only after the code that hides these ids and never awards them is live on kpopquiz.org
-- (PR of branch o1/nophotocards): user_badges.badge_id is ON DELETE NO ACTION, so an award of a deleted id would fail.
-- It deletes the earned rows first (3 rows, 1 player, read on 2026-11-06), then the 6 definitions. A pinned badge among
-- them becomes null through its foreign key (none pinned on 2026-11-06). No badge notification names them (read on
-- 2026-11-06). The tables photocards and photocard_collection stay.
-- Prints one row: user_badges_deleted | definitions_deleted | definitions_left. Expect 3 | 6 | 0 (0 | 0 | 0 on a second run).
-- Run:  psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -At -F ' | ' -f docs/pending-migrations/photocards/001-remove-photocard-badges.sql
-- Back: 001-remove-photocard-badges.rollback.sql (the 6 definitions; the 3 earned rows come back from the session's backup).
begin;
set local lock_timeout = '5s';
create temp table _pc_ids (id text primary key) on commit drop;
insert into _pc_ids values ('pc_first'), ('pc_collector'), ('pc_set'), ('quest_collector_1'), ('quest_collector_5'), ('quest_collector_25');
create temp table _pc_before on commit drop as
  select (select count(*) from public.user_badges where badge_id in (select id from _pc_ids)) as user_badges_deleted,
         (select count(*) from public.badge_definitions where id in (select id from _pc_ids)) as definitions_deleted;
delete from public.user_badges where badge_id in (select id from _pc_ids);
delete from public.badge_definitions where id in (select id from _pc_ids);
select user_badges_deleted, definitions_deleted,
       (select count(*) from public.badge_definitions where id in (select id from _pc_ids)) as definitions_left
from _pc_before;
commit;
