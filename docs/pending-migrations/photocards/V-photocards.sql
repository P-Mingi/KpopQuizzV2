-- V-photocards.sql: read-only checks of 001-remove-photocard-badges.sql. Before 001: lines 1 and 2 say KO (6 and 3).
-- After: four ok lines.
-- Run:  psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -At -F ' | ' -f docs/pending-migrations/photocards/V-photocards.sql
begin transaction read only;
select case when n = 0 then 'ok' else 'KO' end, 'photocard badge definitions left', n
  from (select count(*) n from public.badge_definitions where id in ('pc_first','pc_collector','pc_set','quest_collector_1','quest_collector_5','quest_collector_25') or description ilike '%photocard%') x;
select case when n = 0 then 'ok' else 'KO' end, 'earned photocard badges left', n
  from (select count(*) n from public.user_badges where badge_id in ('pc_first','pc_collector','pc_set','quest_collector_1','quest_collector_5','quest_collector_25')) x;
select case when n = 0 then 'ok' else 'KO' end, 'pinned photocard badges', n
  from (select (select count(*) from public.profiles where pinned_badge_id in ('pc_first','pc_collector','pc_set','quest_collector_1','quest_collector_5','quest_collector_25'))
             + (select count(*) from public.world_memberships where pinned_badge_id in ('pc_first','pc_collector','pc_set','quest_collector_1','quest_collector_5','quest_collector_25')) n) x;
select case when n > 0 then 'ok' else 'KO' end, 'other badge definitions still there', n
  from (select count(*) n from public.badge_definitions) x;
rollback;
