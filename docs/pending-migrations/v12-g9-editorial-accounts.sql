-- v12-g9-editorial-accounts.sql  (V12 run, file 19 of run/SQL-PENDING.md). NOT APPLIED.
-- Rewritten 2026-10-03 on the owner's decision: the editorial (team) accounts are the 9 seed accounts created by
-- apps/quiz/scripts/import-batch*.ts, not new accounts. Not the accounts 0001 to 0003.
--
-- WHAT
--   Inserts 9 rows into public.editorial_accounts (user_id, display_name, beat, active):
--     soojinnie, joonified, pinkvelvet, caratland, skzrealm, njeansstan, kpophistory, twiceland, exoplanet99.
--   The accounts are found by username. display_name = their current profiles.display_name (kept as is);
--   beat = a theme written from their bio (below).
--
-- SAFETY (all checked before any write, in one transaction; on any failure nothing is written)
--   1. public.editorial_accounts exists (apply v12-g9-editorial.sql first; it is in v12-bundle-a.sql).
--   2. Each of the 9 usernames matches exactly one profile.
--   3. Each of those profiles is an auth user whose email ends with @fake.kpopquizz.com. The check never prints
--      an address: a failure names the username only.
--   4. Exactly 9 distinct user ids.
--
-- ROWS
--   9 inserts (or updates of display_name and beat if a row already exists). Nothing else: no auth user, profile,
--   quiz, play, XP or badge is created or changed.
--
-- WHAT CHANGES ONCE APPLIED (with NEXT_PUBLIC_UX_V12 on; with it off, nothing reads this table)
--   The 9 accounts carry the Team badge where the code wires it, and are left out of leaderboards, the creators
--   board, Fans picked, fan counts, the ticker and search people (see run/RUN-STATE.md, 2026-10-03).
--
-- VERIFY (read only, after applying)
--   SELECT p.username, a.display_name, a.beat, a.active, public.is_editorial(a.user_id) AS team
--     FROM public.editorial_accounts a JOIN public.profiles p ON p.id = a.user_id
--    ORDER BY p.username;                                   -- 9 rows, team = true
--
-- UNDO
--   Retire one account (keeps its posts, removes the badge and the exclusions):
--     UPDATE public.editorial_accounts SET active = false
--      WHERE user_id = (SELECT id FROM public.profiles WHERE username = '<username>');
--   Remove them all (refused while a draft still points at an account: reject or delete those drafts first):
--     DELETE FROM public.editorial_accounts;

BEGIN;

CREATE TEMP TABLE _g9_accounts (username text PRIMARY KEY, beat text NOT NULL) ON COMMIT DROP;

INSERT INTO _g9_accounts (username, beat) VALUES
  ('soojinnie',   'Girl groups and trivia'),
  ('joonified',   'BTS'),
  ('pinkvelvet',  'BLACKPINK and Red Velvet'),
  ('caratland',   'SEVENTEEN'),
  ('skzrealm',    'Stray Kids and ATEEZ'),
  ('njeansstan',  'NewJeans, IVE and LE SSERAFIM'),
  ('kpophistory', '2nd generation and K-pop history'),
  ('twiceland',   'TWICE and ITZY'),
  ('exoplanet99', 'EXO and SHINee');

DO $$
DECLARE
  bad text;
  n integer;
BEGIN
  IF to_regclass('public.editorial_accounts') IS NULL THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: apply v12-g9-editorial.sql first (public.editorial_accounts is missing)';
  END IF;

  -- 2. Each username matches exactly one profile.
  SELECT string_agg(t.username, ', ' ORDER BY t.username) INTO bad
    FROM _g9_accounts t
   WHERE (SELECT count(*) FROM public.profiles p WHERE p.username = t.username) <> 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: not exactly one profile for: %', bad;
  END IF;

  -- 3. Each profile is an auth user with a @fake.kpopquizz.com address (the address is never printed).
  SELECT string_agg(t.username, ', ' ORDER BY t.username) INTO bad
    FROM _g9_accounts t
    JOIN public.profiles p ON p.username = t.username
    LEFT JOIN auth.users u ON u.id = p.id
   WHERE u.id IS NULL OR lower(coalesce(u.email, '')) NOT LIKE '%@fake.kpopquizz.com';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: not a @fake.kpopquizz.com account, nothing written: %', bad;
  END IF;

  -- 4. Exactly 9 distinct users.
  SELECT count(DISTINCT p.id) INTO n FROM _g9_accounts t JOIN public.profiles p ON p.username = t.username;
  IF n <> 9 THEN
    RAISE EXCEPTION 'v12-g9-editorial-accounts.sql: expected 9 distinct accounts, found %', n;
  END IF;
END
$$;

INSERT INTO public.editorial_accounts (user_id, display_name, beat, active)
SELECT p.id,
       left(btrim(coalesce(nullif(btrim(p.display_name), ''), p.username)), 40),
       t.beat,
       true
  FROM _g9_accounts t
  JOIN public.profiles p ON p.username = t.username
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, beat = EXCLUDED.beat, active = true;

COMMIT;
