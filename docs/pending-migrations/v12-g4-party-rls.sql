-- V12 G4 (2026-10): close the PUBLIC write policies of party_rooms and party_players, the
-- same way r1-rls-tighten.sql closed six other tables (R1 report, "seen in passing", item 6).
--
-- NOT APPLIED. Apply only after the owner types "go v12-g4-party-rls.sql". It does not depend
-- on v12-g4-live.sql and the live blindtest does not depend on it.
--
-- What G4 found (read only, 2026-10-02)
--   Migration 059 created both tables with
--     party_rooms_insert   FOR INSERT WITH CHECK (true)     party_rooms_update   FOR UPDATE USING (true)
--     party_players_insert FOR INSERT WITH CHECK (true)     party_players_update FOR UPDATE USING (true)
--   so anyone holding the public anon key could insert and edit rooms and scores, and added
--   both tables to the supabase_realtime publication. Migration 072 ("drop the old battle")
--   then DROPPED both tables. On the production project (one catalog query, no data read) neither table
--   exists today, there is no policy on them and nothing of them in the publication.
--   R1 read 059 and not 072.
--
-- Every writer, and what happens to it
--   apps/quiz   none. The app never names these tables. The live blindtest uses its own
--               live_rooms / live_players / live_answers (v12-g4-live.sql): RLS with no policy,
--               every write through the API with the service role.
--   apps/blindtest (the old standalone app; its Supabase project is deleted, it is not
--               deployed with apps/quiz, and it is outside this run)
--     server    /api/party/create, /api/party/[code]/join, /start, /answer: service role
--               already. They keep working: the service role bypasses RLS.
--     browser   components/party/kahoot-host-screen.tsx updates party_rooms with the anon key
--               (round, status). That is the one client writer. If that app is ever pointed at
--               this database again, those three updates must first move behind a server route
--               (the host check of /api/party/[code]/start is the model); until then the host
--               screen of that app cannot advance a round once this file is applied. The reads
--               (hooks/use-party-channel.ts: select and postgres_changes) keep working, the
--               SELECT policies stay.
--   db          no trigger and no function writes either table.
--
-- So this file is a guard, not a fix of something live: on production today it does nothing
-- (the tables do not exist, each block is skipped). If the tables are ever restored (a replay of
-- 059 on another environment, a backup), it leaves them read only for the public keys.
--
-- Rows touched: none (policies and one publication change). Reversible: the commented block
-- at the end recreates the four policies exactly as migration 059 wrote them.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.party_rooms') IS NOT NULL THEN
    DROP POLICY IF EXISTS "party_rooms_insert" ON public.party_rooms;
    DROP POLICY IF EXISTS "party_rooms_update" ON public.party_rooms;
    -- RLS must be on for the SELECT policy to be the only door (059 turned it on; idempotent).
    ALTER TABLE public.party_rooms ENABLE ROW LEVEL SECURITY;
    -- Table grants: the public keys read, they do not write.
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.party_rooms FROM PUBLIC, anon, authenticated;
  END IF;

  IF to_regclass('public.party_players') IS NOT NULL THEN
    DROP POLICY IF EXISTS "party_players_insert" ON public.party_players;
    DROP POLICY IF EXISTS "party_players_update" ON public.party_players;
    ALTER TABLE public.party_players ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.party_players FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;

COMMIT;

-- Verification 1: the policies left on the two tables. Expected on production today: no row
-- (the tables do not exist). Where they exist: exactly two rows, both SELECT
--   party_players | party_players_select | SELECT
--   party_rooms   | party_rooms_select   | SELECT
-- Any other row, or a cmd other than SELECT, means a policy with another name exists: tell G4
-- before going on.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('party_rooms', 'party_players')
ORDER BY tablename, policyname;

-- Verification 2: RLS is on where the tables exist (no row on production today; else two rows, both true).
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relname IN ('party_rooms', 'party_players')
ORDER BY relname;

-- Rollback (run only to undo this file, and only where the tables exist):
-- BEGIN;
-- CREATE POLICY "party_rooms_insert" ON public.party_rooms FOR INSERT WITH CHECK (true);
-- CREATE POLICY "party_rooms_update" ON public.party_rooms FOR UPDATE USING (true);
-- CREATE POLICY "party_players_insert" ON public.party_players FOR INSERT WITH CHECK (true);
-- CREATE POLICY "party_players_update" ON public.party_players FOR UPDATE USING (true);
-- GRANT INSERT, UPDATE, DELETE ON public.party_rooms, public.party_players TO anon, authenticated;
-- COMMIT;
