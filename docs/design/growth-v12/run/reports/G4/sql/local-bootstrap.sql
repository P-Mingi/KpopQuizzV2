-- G4 local check, step 1: what a bare local Postgres lacks compared with a Supabase
-- project, so docs/pending-migrations/v12-g4-live.sql applies unchanged. LOCAL SCRATCH
-- CLUSTER ONLY (run.sh creates it under a temp folder); never run this anywhere else.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- Supabase gives the three API roles every privilege on new public tables by default: mimic
-- it, so the REVOKE of the migration is really tested.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

-- The part of Supabase Realtime the policy touches: realtime.messages (RLS on) and
-- realtime.topic(), which reads the topic the Realtime server sets for the check.
CREATE SCHEMA IF NOT EXISTS realtime;
GRANT USAGE ON SCHEMA realtime TO anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS realtime.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  inserted_at timestamp NOT NULL DEFAULT now()
);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON realtime.messages TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('realtime.topic', true), '')::text $$;
GRANT EXECUTE ON FUNCTION realtime.topic() TO anon, authenticated, service_role;
