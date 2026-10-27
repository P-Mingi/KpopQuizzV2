-- Rollback of seo-index-status.sql: drops the two tables and every row in them (the inspection
-- history is lost; nothing else depends on them).

begin;

drop table if exists public.seo_index_checks;
drop table if exists public.seo_index_status;

commit;
