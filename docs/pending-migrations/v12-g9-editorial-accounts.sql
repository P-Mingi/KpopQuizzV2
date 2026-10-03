-- v12-g9-editorial-accounts.sql  (V12 run, agent G9 Editorial seeding). NOT APPLIED.
-- THIS FILE CANNOT RUN AS IS. The owner fills in the ids first (see OWNER BLOCK).
--
-- WHAT
--   Inserts the 3 to 5 editorial (team) accounts into public.editorial_accounts
--   (user_id, display_name, beat, active). SYSTEM.md 5.6.
--
-- WHY
--   An editorial account is an ordinary auth user that the OWNER created himself (normal
--   sign-up or the Supabase dashboard, his own mail aliases). No agent creates an account,
--   handles a password or invents an id. This file only marks the ids the owner gives.
--
-- ROWS
--   One row per account in the OWNER BLOCK (3 to 5). Nothing else is written. No auth user,
--   no profile, no XP, no badge is created or changed here.
--
-- BEFORE RUNNING
--   1. Apply v12-g9-editorial.sql (it creates the table).
--   2. Create the accounts yourself. For each one: sign up, set the username and display name
--      you want fans to see, and do NOT play, vote, follow or post with it.
--   3. Copy each account's user id (Supabase dashboard, Authentication, Users, "User UID").
--   4. In the OWNER BLOCK below, replace every <<...>> placeholder. Delete the rows you do not
--      need (keep 3 to 5). The names and beats are the examples of SYSTEM.md 5.6: change them.
--
--   Run unedited, the file stops at the first statement with:
--     "v12-g9-editorial-accounts.sql: fill in the OWNER BLOCK first"
--   and writes nothing (one transaction).
--
-- VERIFY (read only, after applying)
--   SELECT a.user_id, a.display_name, a.beat, a.active, p.username
--     FROM public.editorial_accounts a LEFT JOIN public.profiles p ON p.id = a.user_id
--    ORDER BY a.created_at;                       -- your 3 to 5 rows, each with a username
--   SELECT public.is_editorial(user_id) FROM public.editorial_accounts;   -- all true
--
-- UNDO
--   Retire one account (keeps its posts, removes the badge and the exclusions):
--     UPDATE public.editorial_accounts SET active = false WHERE user_id = '<id>';
--   Remove them all (refused while a draft still points at an account: reject or delete
--   those drafts first):
--     DELETE FROM public.editorial_accounts;

BEGIN;

CREATE TEMP TABLE _g9_accounts (user_id_text text, display_name text, beat text) ON COMMIT DROP;

-- ============================ OWNER BLOCK: EDIT HERE ============================
-- Replace each <<...>> with the real value. Keep 3 to 5 rows.
INSERT INTO _g9_accounts (user_id_text, display_name, beat) VALUES
  ('<<USER_UID_OF_ACCOUNT_1>>', 'Mina', 'Girl groups'),
  ('<<USER_UID_OF_ACCOUNT_2>>', 'Jae',  'Boy groups'),
  ('<<USER_UID_OF_ACCOUNT_3>>', 'Sol',  'Charts and data');
-- ========================== END OF OWNER BLOCK ==================================

DO $$
DECLARE
  n integer;
  bad text;
BEGIN
  -- 1. No placeholder left, every id is a uuid.
  SELECT string_agg(user_id_text, ', ') INTO bad FROM _g9_accounts
   WHERE user_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: fill in the OWNER BLOCK first (not a user id: %)', bad;
  END IF;

  -- 2. Three to five accounts, no id twice, no empty name or beat.
  SELECT count(*) INTO n FROM _g9_accounts;
  IF n < 3 OR n > 5 THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: % accounts listed, SYSTEM.md 5.6 asks for 3 to 5', n;
  END IF;
  IF (SELECT count(DISTINCT lower(user_id_text)) FROM _g9_accounts) <> n THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: the same user id is listed twice';
  END IF;
  IF EXISTS (SELECT 1 FROM _g9_accounts WHERE btrim(coalesce(display_name, '')) = '' OR btrim(coalesce(beat, '')) = '') THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: every account needs a display name and a beat';
  END IF;

  -- 3. The table exists and every id is a real auth user.
  IF to_regclass('public.editorial_accounts') IS NULL THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: apply v12-g9-editorial.sql first (public.editorial_accounts is missing)';
  END IF;
  SELECT string_agg(t.user_id_text, ', ') INTO bad FROM _g9_accounts t
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id_text::uuid);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: no auth user with this id: %', bad;
  END IF;
END
$$;

INSERT INTO public.editorial_accounts (user_id, display_name, beat, active)
SELECT user_id_text::uuid, btrim(display_name), btrim(beat), true FROM _g9_accounts
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, beat = EXCLUDED.beat, active = true;

COMMIT;
