-- Rollback of seo-refresh-queue.sql. Drops the two tables and their rows (the weekly
-- snapshots and the monthly approvals). The code goes back to computing the queue on the
-- fly, and /admin/seo says approvals cannot be recorded.

BEGIN;
DROP TABLE IF EXISTS public.seo_refresh_approvals;
DROP TABLE IF EXISTS public.seo_refresh_queue;
COMMIT;
