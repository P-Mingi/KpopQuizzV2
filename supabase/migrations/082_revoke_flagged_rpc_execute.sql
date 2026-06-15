-- Final SECURITY DEFINER lockdown: the three RPCs flagged in 081's audit as
-- "needs app code refactor first". The app-side switch landed in the commit
-- pairing this migration: every API route call to these RPCs now uses
-- createServiceRoleClient(), so REVOKE'ing EXECUTE from anon/authenticated
-- only blocks direct REST attacks against the Supabase API (which is the
-- whole point).
--
-- - create_quiz_bypass:  bypasses creation rules. Was directly callable by
--                         any authenticated user via Supabase REST until now.
-- - ensure_daily_quiz:   admin-only publish flow. Service-role inside the
--                         /api/qotd/publish + home QotD code paths.
-- - award_xp:            user XP grants. Service-role inside every play /
--                         create / battle / blind-test handler. Locks down
--                         the self-grant vector.
--
-- Same DO-block + pg_proc pattern as 081 so every overload is hit without
-- hand-writing argument signatures.

DO $$
DECLARE
  fn_name TEXT;
  fn_signature TEXT;
  fn_names CONSTANT TEXT[] := ARRAY[
    'create_quiz_bypass',
    'ensure_daily_quiz',
    'award_xp'
  ];
BEGIN
  FOREACH fn_name IN ARRAY fn_names LOOP
    FOR fn_signature IN
      SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn_name
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', fn_signature);
      RAISE NOTICE 'revoked execute on %', fn_signature;
    END LOOP;
  END LOOP;
END$$;
