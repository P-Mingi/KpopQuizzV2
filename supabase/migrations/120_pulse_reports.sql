-- Migration 120: Monthly K-pop Pulse report (Workstream T0).
-- Run manually in the prod SQL editor; not auto-applied.
--
-- Two tables: pulse_reports (one row per month, the computed payload the page
-- renders from) and pulse_citations (owner-editable external citations, e.g.
-- soridata milestones). RLS: public read, writes service-role only.

-- 1. One computed report per month (month PK = 'YYYY-MM'). Idempotent: the cron
--    upserts, so re-running a month recomputes the same row.
CREATE TABLE IF NOT EXISTS public.pulse_reports (
  month TEXT PRIMARY KEY,          -- 'YYYY-MM'
  payload JSONB NOT NULL,          -- the whole computed report (sections + numbers + as_of)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Curated external citations (the "context corner"). Owner edits in admin;
--    the report renders whatever is active, each with its own as_of date.
CREATE TABLE IF NOT EXISTS public.pulse_citations (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,            -- e.g. 'soridata'
  claim TEXT NOT NULL,             -- the sentence, "according to {source}, ..."
  url TEXT NOT NULL,
  as_of_date DATE NOT NULL,        -- shown honestly so stale entries read as stale
  active BOOLEAN NOT NULL DEFAULT true,
  ord SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pulse_citations_active ON public.pulse_citations(active, ord);

-- RLS: public read; all writes are service-role only (which bypasses RLS), so
-- there are no INSERT/UPDATE policies.
ALTER TABLE public.pulse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_citations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_public_read ON public.pulse_reports;
CREATE POLICY pr_public_read ON public.pulse_reports FOR SELECT USING (true);

-- Only active citations are visible to the public; admin reads all via service role.
DROP POLICY IF EXISTS pc_public_read ON public.pulse_citations;
CREATE POLICY pc_public_read ON public.pulse_citations FOR SELECT USING (active = true);

-- Seed 3 soridata citations (OWNER VERIFIES THE EXACT WORDING/FIGURES before the
-- report is public). Each carries an as_of date and links to soridata; no
-- scraping is performed, these are hand-curated citations.
INSERT INTO public.pulse_citations (source, claim, url, as_of_date, ord) VALUES
  ('soridata', 'According to soridata, K-pop music videos have together passed 321 billion total YouTube views.', 'https://soridata.com', '2026-07-01', 0),
  ('soridata', 'According to soridata, K-pop music videos have together passed 21 billion total YouTube likes.', 'https://soridata.com', '2026-07-01', 1),
  ('soridata', 'According to soridata, girl groups hold the majority of 2026''s most-viewed K-pop music videos.', 'https://soridata.com', '2026-07-01', 2)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
