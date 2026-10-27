-- SEO Mission 3, part E point 1 (2026-10-15). PENDING: the owner applies it. Rollback:
-- seo-refresh-queue-rollback.sql.
--
-- What it adds. Two small tables, both written and read by the server only (service role):
--   seo_refresh_queue      the weekly snapshot of the SEO refresh queue. The Monday cron
--                          /api/cron/seo-refresh-queue computes it (lib/seo/refresh-queue.ts)
--                          and replaces the rows of that week. The Monday e-mail (part C) can
--                          read it. One row per (week, page).
--   seo_refresh_approvals  the pages the owner approved for refresh in /admin/seo, at most 5
--                          per month (the API checks the 5; the table keeps one row per
--                          (month, page)).
--
-- Before it is applied the code fails soft: /admin/seo computes the queue on the fly and
-- says approvals cannot be recorded yet; the cron returns the queue without storing it.
--
-- Security. RLS on, no policy: anon and signed-in users can neither read nor write. All
-- access goes through the service role in admin-gated routes. No personal data: paths,
-- scores, reasons and dates only.

BEGIN;

CREATE TABLE IF NOT EXISTS public.seo_refresh_queue (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week_of     date        NOT NULL CHECK (extract(isodow FROM week_of) = 1),  -- a Monday
  rank        integer     NOT NULL CHECK (rank >= 1),
  path        text        NOT NULL CHECK (path LIKE '/%' AND length(path) <= 500),
  score       integer     NOT NULL CHECK (score >= 0),
  reasons     jsonb       NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(reasons) = 'array'),
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_of, path)
);

CREATE INDEX IF NOT EXISTS seo_refresh_queue_week_rank_idx ON public.seo_refresh_queue (week_of, rank);

CREATE TABLE IF NOT EXISTS public.seo_refresh_approvals (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month       date        NOT NULL CHECK (extract(day FROM month) = 1),  -- first day of the month
  path        text        NOT NULL CHECK (path LIKE '/%' AND length(path) <= 500),
  rank        integer     NOT NULL CHECK (rank BETWEEN 1 AND 5),
  score       integer     NOT NULL CHECK (score >= 0),
  reasons     jsonb       NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(reasons) = 'array'),
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, path)
);

ALTER TABLE public.seo_refresh_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_refresh_approvals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.seo_refresh_queue FROM anon, authenticated;
REVOKE ALL ON public.seo_refresh_approvals FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_refresh_queue TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_refresh_approvals TO service_role;

COMMENT ON TABLE public.seo_refresh_queue IS 'SEO refresh queue, weekly snapshot (SEO Mission 3 part E). Written by /api/cron/seo-refresh-queue.';
COMMENT ON TABLE public.seo_refresh_approvals IS 'Pages the owner approved for refresh in /admin/seo, at most 5 a month (SEO Mission 3 part E).';

COMMIT;

-- Check after applying (expect 2 rows, both with rowsecurity = true):
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename IN ('seo_refresh_queue', 'seo_refresh_approvals');
