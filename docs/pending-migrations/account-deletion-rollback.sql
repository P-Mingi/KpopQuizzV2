-- Rollback of docs/pending-migrations/account-deletion.sql. NOT APPLIED.
--
-- Drops public.admin_delete_account. Removes the "deleted user" sentinel ONLY when
-- nothing points to it any more: quizzes.creator_id is ON DELETE CASCADE, so deleting
-- the sentinel after a run with p_keep_quizzes => true would delete every kept quiz.
-- If anything still points to it, the sentinel stays and a NOTICE says why.
-- Accounts already deleted by the function cannot be brought back by this file.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_delete_account(uuid, boolean, boolean);

DO $$
DECLARE
  c_sentinel CONSTANT uuid := '00000000-0000-0000-0000-00000000dead';
  v_n bigint;
  v_total bigint := 0;
  r record;
BEGIN
  -- Every foreign key to profiles or auth.users, except the sentinel's own profile row.
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f'
       AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
       AND c.connamespace = 'public'::regnamespace
       AND NOT (c.conrelid = 'public.profiles'::regclass AND a.attname = 'id')
  LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE %I = $1', r.tbl, r.col) INTO v_n USING c_sentinel;
    v_total := v_total + v_n;
  END LOOP;

  -- Columns without a foreign key that the function points to the sentinel.
  SELECT v_total
       + (SELECT count(*) FROM public.verse_discussions WHERE author = c_sentinel)
       + (SELECT count(*) FROM public.verse_essays WHERE author = c_sentinel)
       + (SELECT count(*) FROM public.pages WHERE created_by = c_sentinel)
       + (SELECT count(*) FROM public.page_revisions WHERE author = c_sentinel)
       + (SELECT count(*) FROM public.verse_revisions WHERE author = c_sentinel::text)
       + (SELECT count(*) FROM public.verse_pages WHERE created_by = c_sentinel::text)
       + (SELECT count(*) FROM public.entity_overrides WHERE author = c_sentinel::text)
    INTO v_total;

  IF v_total > 0 THEN
    RAISE NOTICE 'deleted-user sentinel kept: % row(s) still point to it', v_total;
  ELSE
    DELETE FROM public.players WHERE id = c_sentinel;
    DELETE FROM auth.users WHERE id = c_sentinel;  -- cascades its profile
    RAISE NOTICE 'deleted-user sentinel removed';
  END IF;
END $$;

COMMIT;
