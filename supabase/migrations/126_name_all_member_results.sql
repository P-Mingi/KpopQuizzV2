-- 126_name_all_member_results.sql
-- Workstream W2.x: per-member name-all outcomes for the idol WHAT-FANS-KNOW block.
-- Run manually in the prod Supabase SQL editor; NOT auto-applied.
--
-- Name-all is client-only today (no per-member persistence exists). This adds
-- cheap, AGGREGATE-ONLY logging so the "% name them right" stat can accrue and
-- unlock itself at >= 30 rounds per group. NO user linkage, no PII: one row per
-- (member, finished round) recording only whether that member was named.

CREATE TABLE IF NOT EXISTS public.name_all_member_results (
  id           BIGSERIAL PRIMARY KEY,
  group_id     INTEGER REFERENCES public.groups(id) ON DELETE CASCADE,
  member_name  TEXT NOT NULL,
  found        BOOLEAN NOT NULL,
  round_id     UUID NOT NULL,   -- one per finished round (counts rounds); NOT user-linked
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_namr_group ON public.name_all_member_results(group_id);
CREATE INDEX IF NOT EXISTS idx_namr_group_member ON public.name_all_member_results(group_id, member_name);

ALTER TABLE public.name_all_member_results ENABLE ROW LEVEL SECURITY;
-- No public read of raw rows. Aggregates are exposed only through the SECURITY
-- DEFINER function below. Writes go through the service-role finish path, which
-- bypasses RLS, so there are no write policies.

-- Aggregate reader: per-member recognition % + sample size for a group, plus the
-- group's total finished-round count (the gate). Definer so the public idol page
-- can read aggregates without touching raw rows.
CREATE OR REPLACE FUNCTION public.verse_name_recognition(p_group_id INTEGER)
RETURNS TABLE (member_name TEXT, found_pct NUMERIC, samples BIGINT, rounds BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.member_name,
         ROUND(100.0 * AVG(CASE WHEN r.found THEN 1 ELSE 0 END), 0) AS found_pct,
         COUNT(*) AS samples,
         (SELECT COUNT(DISTINCT round_id)
            FROM public.name_all_member_results
           WHERE group_id = p_group_id) AS rounds
    FROM public.name_all_member_results r
   WHERE r.group_id = p_group_id
   GROUP BY r.member_name;
$$;
REVOKE ALL ON FUNCTION public.verse_name_recognition(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verse_name_recognition(INTEGER) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
