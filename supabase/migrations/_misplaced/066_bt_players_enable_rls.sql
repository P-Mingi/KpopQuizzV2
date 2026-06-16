-- Migration 066: Enable RLS on public.bt_players
-- Fixes Supabase Advisor: 0013 rls_disabled_in_public (CRITICAL) on public.bt_players.
--
-- Why it regressed: 026_blindtest_progression.sql originally created bt_players
-- WITH RLS enabled + policies, but 046_challenges.sql re-creates the table via
-- `CREATE TABLE IF NOT EXISTS public.bt_players (...)` without re-enabling RLS.
-- On the live project the table ended up existing with RLS OFF, so it was
-- world-readable/writable through the anon PostgREST endpoint.
--
-- Safety: every app write to bt_players goes through the service-role client
-- (createServiceRoleClient / adminDb in apps/blindtest), which BYPASSES RLS, so
-- inserts/updates keep working. Public leaderboard/party reads keep working via
-- the SELECT USING (true) policy. This restores the canonical 026 policy set and
-- is idempotent (safe to run more than once).

ALTER TABLE public.bt_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bt_players_read_all" ON public.bt_players;
CREATE POLICY "bt_players_read_all"
  ON public.bt_players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "bt_players_insert_own" ON public.bt_players;
CREATE POLICY "bt_players_insert_own"
  ON public.bt_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bt_players_update_own" ON public.bt_players;
CREATE POLICY "bt_players_update_own"
  ON public.bt_players FOR UPDATE
  USING (auth.uid() = user_id);
