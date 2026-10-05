-- V12 bundle C (owner request, 2026-10-04). Run AFTER bundles A and B (it needs public.editorial_accounts and
-- public.is_editorial from file 18). Three files, each in its own transaction, copied verbatim between "FILE" markers:
--   19  v12-g9-editorial-accounts.sql  (the 9 seed accounts become editorial accounts; refuses unless each has a
--                                       @fake.kpopquizz.com address, never printed)
--   F5a v12-f5-quiz-rank.sql           (rank twins without editorial players; today's functions untouched)
--   F5b v12-f5-fandom-war.sql          (fandom war twin without editorial plays; today's function untouched)
-- Every file is idempotent. The verification grid at the end is read only; every line should read ok = true.

-- ====================================================================================================
-- FILE 19: v12-g9-editorial-accounts.sql
-- ====================================================================================================
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

-- ====================================================================================================
-- FILE 20: v12-f5-quiz-rank.sql
-- ====================================================================================================
-- v12-f5-quiz-rank.sql  (V12 run, agent F5a: the results rank "#N of M players"). NOT APPLIED.
-- OWNER APPLIES THIS BY HAND, after a backup point, only after `go v12-f5-quiz-rank.sql`.
--
-- WHAT
--   Two NEW read-only functions, twins of the rank functions the results screen reads,
--   with one extra parameter p_exclude_team boolean DEFAULT false:
--     public.get_quiz_rank_v12(p_quiz_id uuid, p_user_id uuid, p_exclude_team boolean DEFAULT false)
--       twin of get_quiz_rank (migration 098), same columns:
--       best_score, total_questions, rank, total_players
--     public.get_quiz_rank_for_score_v12(p_quiz_id uuid, p_score int, p_exclude_team boolean DEFAULT false)
--       twin of get_quiz_rank_for_score (v11-p4-rank-for-score.sql), same columns: rank, total_players
--   With p_exclude_team = false each answers exactly what its twin answers (same board:
--   rank = 1 + distinct signed-in players whose best beats it; total = distinct signed-in
--   players). With true, the plays of active editorial accounts (public.is_editorial) are
--   left out of both numbers, and an editorial viewer gets rank null (they never act as fans).
--
-- WHY
--   Owner decision 2026-10-03 (F5 brief): the 9 editorial accounts are left out of the
--   results rank. New names, not a new parameter on the existing functions: adding a
--   defaulted parameter with CREATE OR REPLACE would create an overload and make every
--   existing two-argument call ambiguous. get_quiz_rank and get_quiz_rank_for_score are
--   NOT touched: every existing call keeps its exact signature and result. Only the v12
--   code (NEXT_PUBLIC_UX_V12 on, at least one editorial account) calls the new names with
--   p_exclude_team = true, and it falls back to today's call while this file is not applied.
--
-- ORDER
--   Apply after v12-g9-editorial.sql (it defines public.is_editorial). This file stops with
--   a clear error, writing nothing, when is_editorial does not exist yet.
--
-- ROWS
--   None. No table, column, policy, index or existing function changes; no row is written.
--   Both functions are STABLE, SECURITY INVOKER, and read public.plays through the caller's
--   existing RLS (public SELECT, migration 003), like their twins.
--
-- VERIFY (read only)
--   SELECT * FROM public.get_quiz_rank('<quiz uuid>', '<user uuid>');
--   SELECT * FROM public.get_quiz_rank_v12('<quiz uuid>', '<user uuid>');          -- same row
--   SELECT * FROM public.get_quiz_rank_v12('<quiz uuid>', '<user uuid>', true);    -- total_players lower by the editorial players of that quiz
--   SELECT * FROM public.get_quiz_rank_for_score_v12('<quiz uuid>', 5);            -- same as get_quiz_rank_for_score when that one is applied
--
-- UNDO
--   DROP FUNCTION IF EXISTS public.get_quiz_rank_v12(uuid, uuid, boolean);
--   DROP FUNCTION IF EXISTS public.get_quiz_rank_for_score_v12(uuid, int, boolean);
--   NOTIFY pgrst, 'reload schema';

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.is_editorial(uuid)') IS NULL THEN
    RAISE EXCEPTION 'v12-f5-quiz-rank.sql: apply v12-g9-editorial.sql first (public.is_editorial(uuid) is missing)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_quiz_rank_v12(p_quiz_id uuid, p_user_id uuid, p_exclude_team boolean DEFAULT false)
RETURNS TABLE(best_score int, total_questions int, rank int, total_players int)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  with board as (
    select player_id, score from public.plays
    where quiz_id = p_quiz_id and player_id is not null
      and (not p_exclude_team or not public.is_editorial(player_id))
  ),
  mine as (
    select max(score) as s, max(total_questions) as tq
    from public.plays
    where quiz_id = p_quiz_id and player_id = p_user_id
  )
  select
    (select s from mine)::int as best_score,
    (select tq from mine)::int as total_questions,
    case
      when (select s from mine) is null then null
      when p_exclude_team and public.is_editorial(p_user_id) then null
      else 1 + (select count(distinct player_id) from board where score > (select s from mine))
    end::int as rank,
    (select count(distinct player_id) from board)::int as total_players;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_rank_for_score_v12(p_quiz_id uuid, p_score int, p_exclude_team boolean DEFAULT false)
RETURNS TABLE(rank int, total_players int)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  with board as (
    select player_id, score from public.plays
    where quiz_id = p_quiz_id and player_id is not null
      and (not p_exclude_team or not public.is_editorial(player_id))
  )
  select
    (1 + (select count(distinct player_id) from board where score > p_score))::int as rank,
    (select count(distinct player_id) from board)::int as total_players;
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_rank_v12(uuid, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_rank_for_score_v12(uuid, int, boolean) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ====================================================================================================
-- FILE 21: v12-f5-fandom-war.sql
-- ====================================================================================================
-- v12-f5-fandom-war.sql  (V12 run, agent F5b). NOT APPLIED. Apply only after the owner types
-- `go v12-f5-fandom-war.sql`, and only after v12-g9-editorial.sql (it calls public.is_editorial).
--
-- WHAT
--   One new function, public.get_fandom_war_map_v12(p_limit int default 30): the fandom war map of
--   migration 107 (get_fandom_war_map) with the plays of editorial accounts left out
--   (public.is_editorial(player_id) true). Same columns, same windows (7 days, previous 7 days), same
--   order, same limit. Anonymous plays (player_id null) still count, as in 107.
--   The existing public.get_fandom_war_map(int) is NOT touched: same name, signature, body and
--   result. A new name rather than an extra defaulted parameter on the old one, because a second
--   overload of get_fandom_war_map would make today's PostgREST call ({p_limit}) ambiguous.
--
-- WHY
--   Owner decision 2026-10-03 (F5 brief, rule 2): editorial (team) accounts never act as fans and
--   are left out of the fandom war. Only the v12 code calls this function, and only when the v12
--   flag is on and at least one editorial account exists (src/lib/editorial/surfaces/war.ts). With
--   the flag off the app calls get_fandom_war_map exactly as today. While this file is not applied,
--   the v12 code falls back to get_fandom_war_map (PGRST202 / 42883).
--
-- ROWS
--   None. No table is created, altered or written. Read-only function (STABLE, SECURITY INVOKER
--   like 107: it reads plays, quizzes and groups as the caller; is_editorial is the G9 SECURITY
--   DEFINER boolean, so the closed editorial_accounts table stays closed).
--
-- VERIFY
--   SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc
--    WHERE proname IN ('get_fandom_war_map','get_fandom_war_map_v12');
--                                   -- two rows: (p_limit integer) each; 107 unchanged
--   SELECT * FROM public.get_fandom_war_map_v12(5);   -- at most 5 rows
--   -- equal to the old map when no editorial account played in the last 14 days:
--   SELECT count(*) FROM (SELECT * FROM public.get_fandom_war_map(90)
--                         EXCEPT SELECT * FROM public.get_fandom_war_map_v12(90)) d;
--                                   -- 0 when the team has no play in the window, else > 0
--
-- UNDO
--   DROP FUNCTION IF EXISTS public.get_fandom_war_map_v12(int);
--   NOTIFY pgrst, 'reload schema';

BEGIN;

CREATE OR REPLACE FUNCTION public.get_fandom_war_map_v12(p_limit int DEFAULT 30)
RETURNS TABLE (
  group_id      int,
  name          text,
  slug          text,
  logo_url      text,
  display_color text,
  plays_week    bigint,
  fans_week     bigint,
  plays_prev    bigint
)
LANGUAGE sql
STABLE
AS $$
  with windowed_all as (
    select q.group_id as gid, p.player_id, p.created_at
    from public.plays p
    join public.quizzes q on q.id = p.quiz_id
    where p.created_at > now() - interval '14 days'
      and q.group_id is not null
  ),
  -- is_editorial runs once per distinct signed-in player of the window, not once per play.
  team as (
    select d.player_id
    from (select distinct w.player_id from windowed_all w where w.player_id is not null) d
    where public.is_editorial(d.player_id)
  ),
  windowed as (
    select w.gid, w.player_id, w.created_at
    from windowed_all w
    where w.player_id is null
       or not exists (select 1 from team t where t.player_id = w.player_id)
  ),
  agg as (
    select
      w.gid,
      count(*) filter (where w.created_at > now() - interval '7 days')                as plays_week,
      count(distinct w.player_id) filter (where w.created_at > now() - interval '7 days') as fans_week,
      count(*) filter (where w.created_at <= now() - interval '7 days')               as plays_prev
    from windowed w
    group by w.gid
  )
  select g.id, g.name, g.slug, g.logo_url, g.display_color,
         a.plays_week, a.fans_week, a.plays_prev
  from agg a
  join public.groups g on g.id = a.gid
  where a.plays_week > 0
  order by a.plays_week desc, g.name asc
  limit p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_fandom_war_map_v12(int) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ====================================================================================================
-- VERIFICATION GRID (read only). One row per check: file, check, expected, actual, ok.
-- ====================================================================================================
WITH team AS (
  SELECT p.username, a.display_name, a.beat, a.active, public.is_editorial(a.user_id) AS is_team
  FROM public.editorial_accounts a JOIN public.profiles p ON p.id = a.user_id
),
q AS (SELECT quiz_id FROM public.plays WHERE player_id IS NOT NULL GROUP BY quiz_id ORDER BY count(*) DESC LIMIT 1),
old_rank AS (SELECT r.rank, r.total_players FROM q, public.get_quiz_rank_for_score((SELECT quiz_id FROM q), 5) r),
new_rank AS (SELECT r.rank, r.total_players FROM q, public.get_quiz_rank_for_score_v12((SELECT quiz_id FROM q), 5) r),
old_war AS (SELECT string_agg(slug || ':' || plays_week || ':' || fans_week || ':' || plays_prev, ',' ORDER BY slug) AS s FROM public.get_fandom_war_map(30)),
new_war AS (SELECT string_agg(slug || ':' || plays_week || ':' || fans_week || ':' || plays_prev, ',' ORDER BY slug) AS s FROM public.get_fandom_war_map_v12(30))
SELECT file, check_name, expected, actual, actual = expected AS ok
FROM (VALUES
  ('19', 'editorial accounts', '9', (SELECT count(*) FROM team)::text),
  ('19', 'all 9 active and is_editorial', '9', (SELECT count(*) FROM team WHERE active AND is_team)::text),
  ('19', 'the 9 usernames', 'caratland,exoplanet99,joonified,kpophistory,njeansstan,pinkvelvet,skzrealm,soojinnie,twiceland',
         (SELECT string_agg(username, ',' ORDER BY username) FROM team)),
  ('19', 'display names kept from profiles', '0',
         (SELECT count(*) FROM public.editorial_accounts a JOIN public.profiles p ON p.id = a.user_id
           WHERE a.display_name <> left(btrim(coalesce(nullif(btrim(p.display_name), ''), p.username)), 40))::text),
  ('F5a', 'rank twins exist', 'true',
         (to_regprocedure('public.get_quiz_rank_v12(uuid, uuid, boolean)') IS NOT NULL
          AND to_regprocedure('public.get_quiz_rank_for_score_v12(uuid, integer, boolean)') IS NOT NULL)::text),
  ('F5a', 'default twin answers like today (most played quiz, score 5)', 'true',
         ((SELECT row(rank, total_players)::text FROM old_rank) = (SELECT row(rank, total_players)::text FROM new_rank))::text),
  ('F5b', 'war twin exists', 'true', (to_regprocedure('public.get_fandom_war_map_v12(integer)') IS NOT NULL)::text),
  ('F5b', 'war twin equals today (the 9 accounts have not played since 2026-04-15)', 'true',
         ((SELECT coalesce(s, '') FROM old_war) = (SELECT coalesce(s, '') FROM new_war))::text)
) AS g(file, check_name, expected, actual)
ORDER BY file;
