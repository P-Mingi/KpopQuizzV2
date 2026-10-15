-- account-deletion.sql  (Mission U, part D). NOT APPLIED. The owner runs it in the Supabase SQL editor.
--
-- WHAT
--   1. Row   auth.users + public.profiles  00000000-0000-0000-0000-00000000dead
--            the "deleted user" sentinel (username deleted_user, display name "Deleted user").
--            It never signs in: no password, no identity, a reserved .invalid e-mail, banned.
--            The blind test trigger on auth.users creates a players row for it; that row is
--            removed again at once (the KpopQuizz Team account has none either).
--   2. Func  public.admin_delete_account(p_user uuid,
--                                        p_keep_quizzes boolean default true,
--                                        p_dry_run boolean default true) returns jsonb
--            Deletes one account by hand, in one transaction. Dry run by default: it then
--            only counts and writes nothing. The result lists, in order, every step and
--            every foreign key with at least one row: table names and numbers only, no
--            personal data. Real run (p_dry_run => false): published quizzes, games and public or
--            unlisted tier lists are handed to the sentinel (or deleted when
--            p_keep_quizzes => false), every NO ACTION / RESTRICT reference is deleted or
--            anonymised, the Verse tables without a foreign key are cleaned like
--            apps/quiz/src/lib/verse/account-cleanup.ts does, then the Auth user is deleted
--            (which cascades to profiles and to every ON DELETE CASCADE table).
--
-- WHY
--   quizzes.creator_id is ON DELETE CASCADE to profiles, so deleting an Auth user today
--   deletes the quizzes, and 14 tables reference the account with NO ACTION (games,
--   game_plays, game_reports, blind_test_plays, tot_plays, bt_players, debate_votes,
--   activity_cheers, daily_blindtest_scores, dev_byeol_transactions, dev_pack_opens,
--   dev_user_byeol, dev_user_cards, pinterest_csv_batches): they make a plain delete fail.
--   The table by table decisions are in account-deletion-MODE-EMPLOI.md (notes section).
--
-- REFUSALS (the dry run lists them, the real run raises and changes nothing)
--   - the sentinel and the KpopQuizz Team profile (00000000-0000-0000-0000-000000000001);
--   - an editorial (staff) account, or the reviewer of approved/published editorial drafts
--     (editorial_drafts.account_id is RESTRICT and editorial_drafts_reviewed_chk needs a
--     reviewer: those are handled by hand);
--   - a quiz of the account that the daily bank points to (quiz_bank.published_quiz_id)
--     and that would be deleted: nulling it would reopen the bank row for the rotation;
--   - rows of the account in a new NO ACTION / RESTRICT foreign key to profiles or
--     auth.users that this function does not handle yet (a future table fails loudly
--     and cleanly, never halfway).
--
-- NOT DONE HERE
--   Files in Supabase Storage are not deleted by SQL. The result gives their number
--   (storage_files_left: files owned by the account plus the community photos in
--   verse-space-assets/community/<account id>/); remove them in the dashboard. Quiz
--   images (quiz-images/<year>/<month>/) carry no account id and stay with the quizzes.
--
-- SAFETY
--   SECURITY DEFINER, search_path pinned to public. Executable by service_role only:
--   EXECUTE is revoked from PUBLIC, anon and authenticated. The SQL editor runs as the
--   owner (postgres), so the owner can call it there. Everything runs in the caller's
--   transaction: any error rolls back every step. The Auth row is locked first, so no
--   new play or like can be written for the account while it runs.
--
-- ORDER
--   Standalone. Run this whole file once, then use the function (see the MODE-EMPLOI).
--
-- VERIFY (read only, after apply)
--   select id, username from public.profiles where id = '00000000-0000-0000-0000-00000000dead';   -- 1 row, deleted_user
--   select count(*) from public.players where id = '00000000-0000-0000-0000-00000000dead';         -- 0
--   select has_function_privilege('anon', 'public.admin_delete_account(uuid, boolean, boolean)', 'execute');          -- f
--   select has_function_privilege('authenticated', 'public.admin_delete_account(uuid, boolean, boolean)', 'execute'); -- f
--   select has_function_privilege('service_role', 'public.admin_delete_account(uuid, boolean, boolean)', 'execute');  -- t
--
-- ROLLBACK
--   docs/pending-migrations/account-deletion-rollback.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The "deleted user" sentinel
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, banned_until, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-00000000dead',
  'authenticated',
  'authenticated',
  'deleted-user@kpopquiz.invalid',
  '',
  now(),
  '', '', '', '',
  '{}'::jsonb,
  '{}'::jsonb,
  '2999-12-31 00:00:00+00',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, display_name, bio)
VALUES ('00000000-0000-0000-0000-00000000dead', 'deleted_user', 'Deleted user', '')
ON CONFLICT (id) DO NOTHING;

-- on_auth_user_created_blindtest made a players row for the sentinel: it is not a player.
DELETE FROM public.players WHERE id = '00000000-0000-0000-0000-00000000dead';

-- ---------------------------------------------------------------------------
-- 2. public.admin_delete_account
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_delete_account(
  p_user uuid,
  p_keep_quizzes boolean DEFAULT true,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_sentinel CONSTANT uuid := '00000000-0000-0000-0000-00000000dead';
  c_team     CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  -- The NO ACTION / RESTRICT foreign keys to profiles or auth.users this function handles.
  c_handled  CONSTANT text[] := ARRAY[
    'activity_cheers.user_id', 'blind_test_plays.player_id', 'bt_players.user_id',
    'daily_blindtest_scores.user_id', 'debate_votes.user_id', 'dev_byeol_transactions.user_id',
    'dev_pack_opens.user_id', 'dev_user_byeol.user_id', 'dev_user_cards.user_id',
    'game_plays.player_id', 'game_reports.reporter_id', 'games.creator_id',
    'pinterest_csv_batches.created_by', 'tot_plays.user_id'
  ];
  v_txt      text := p_user::text;
  v_keep     boolean := coalesce(p_keep_quizzes, true);
  v_dry      boolean := coalesce(p_dry_run, true);
  v_refs     jsonb := '[]'::jsonb;
  v_act      jsonb := '[]'::jsonb;
  v_refusals text[] := '{}';
  v_n        bigint;
  v_plays    bigint;
  v_likes    bigint;
  v_files    bigint := NULL;
  r          record;
BEGIN
  -- Guards -------------------------------------------------------------------
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'admin_delete_account: p_user is required';
  END IF;
  IF p_user = c_sentinel OR p_user = c_team THEN
    RAISE EXCEPTION 'admin_delete_account: refused, this is a protected account (deleted user or KpopQuizz Team)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user) THEN
    RAISE EXCEPTION 'admin_delete_account: no Auth user with this id';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = c_sentinel) THEN
    RAISE EXCEPTION 'admin_delete_account: the deleted-user profile is missing, run account-deletion.sql first';
  END IF;

  IF NOT v_dry THEN
    -- Lock the account: a new row that references it would wait until this transaction ends.
    PERFORM 1 FROM auth.users WHERE id = p_user FOR UPDATE;
    PERFORM 1 FROM public.profiles WHERE id = p_user FOR UPDATE;
  END IF;

  -- Refusals -----------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM public.editorial_accounts WHERE user_id = p_user) THEN
    v_refusals := v_refusals || 'editorial (staff) account: remove its editorial_accounts row and drafts by hand first'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM public.editorial_drafts WHERE reviewed_by = p_user AND status NOT IN ('draft', 'rejected')) THEN
    v_refusals := v_refusals || 'reviewer of approved or published editorial drafts (staff): change reviewed_by by hand first'::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.quiz_bank b JOIN public.quizzes q ON q.id = b.published_quiz_id
     WHERE q.creator_id = p_user AND (NOT v_keep OR q.status IN ('draft', 'removed'))
  ) THEN
    v_refusals := v_refusals || 'a quiz that would be deleted is linked from quiz_bank.published_quiz_id: handle it by hand'::text;
  END IF;
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f'
       AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
       AND c.connamespace = 'public'::regnamespace
       AND c.confdeltype IN ('a', 'r')
  LOOP
    IF NOT (format('%s.%s', r.tbl, r.col) = ANY (c_handled)) THEN
      EXECUTE format('SELECT count(*) FROM %s WHERE %I = $1', r.tbl, r.col) INTO v_n USING p_user;
      IF v_n > 0 THEN
        v_refusals := v_refusals || format('%s row(s) in %s.%s (NO ACTION foreign key this function does not handle yet): update admin_delete_account first', v_n, r.tbl, r.col);
      END IF;
    END IF;
  END LOOP;

  IF NOT v_dry AND cardinality(v_refusals) > 0 THEN
    RAISE EXCEPTION 'admin_delete_account: refused: %', array_to_string(v_refusals, ' | ');
  END IF;

  -- What references the account through a foreign key, before anything runs ------
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col,
           CASE c.confdeltype WHEN 'a' THEN 'no action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade'
                              WHEN 'n' THEN 'set null' ELSE 'set default' END AS rule
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f'
       AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
       AND c.connamespace = 'public'::regnamespace
     ORDER BY c.conrelid::regclass::text, a.attname
  LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE %I = $1', r.tbl, r.col) INTO v_n USING p_user;
    IF v_n > 0 THEN
      v_refs := v_refs || jsonb_build_array(jsonb_build_object('fk', format('%s.%s', r.tbl, r.col), 'on_delete', r.rule, 'rows', v_n));
    END IF;
  END LOOP;

  -- A. Published content: quizzes, games, tier lists ------------------------------
  -- Kept (p_keep_quizzes, status not draft/removed) go to the sentinel; the rest is deleted.

  -- A1. Daily quiz log rows of the quizzes that get deleted (qotd_log.quiz_id is NO ACTION).
  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.qotd_log l JOIN public.quizzes q ON q.id = l.quiz_id
     WHERE q.creator_id = p_user AND (NOT v_keep OR q.status IN ('draft', 'removed'));
  ELSE
    DELETE FROM public.qotd_log l USING public.quizzes q
     WHERE q.id = l.quiz_id AND q.creator_id = p_user AND (NOT v_keep OR q.status IN ('draft', 'removed'));
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'qotd_log (deleted: log rows of deleted quizzes)', 'rows', v_n)); END IF;

  -- A2. Quizzes deleted (their plays, likes, comments... cascade).
  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.quizzes WHERE creator_id = p_user AND (NOT v_keep OR status IN ('draft', 'removed'));
  ELSE
    DELETE FROM public.quizzes WHERE creator_id = p_user AND (NOT v_keep OR status IN ('draft', 'removed'));
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'quizzes (deleted)', 'rows', v_n)); END IF;

  -- A3. Quizzes kept, handed to the sentinel (its profile counters follow).
  SELECT count(*), coalesce(sum(play_count), 0), coalesce(sum(like_count), 0) INTO v_n, v_plays, v_likes
    FROM public.quizzes WHERE creator_id = p_user AND v_keep AND status NOT IN ('draft', 'removed');
  IF NOT v_dry AND v_n > 0 THEN
    UPDATE public.quizzes SET creator_id = c_sentinel WHERE creator_id = p_user;
    UPDATE public.profiles
       SET total_quizzes_created = total_quizzes_created + v_n::int,
           total_plays_received  = total_plays_received + v_plays::int,
           total_likes_received  = total_likes_received + v_likes::int,
           updated_at = now()
     WHERE id = c_sentinel;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'quizzes.creator_id (to deleted user)', 'rows', v_n)); END IF;

  -- A4. Games (This or That). game_plays / game_reports of a deleted game are NO ACTION.
  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.game_plays p JOIN public.games g ON g.id = p.game_id
     WHERE g.creator_id = p_user AND (NOT v_keep OR g.status IN ('draft', 'removed'));
  ELSE
    DELETE FROM public.game_plays p USING public.games g
     WHERE g.id = p.game_id AND g.creator_id = p_user AND (NOT v_keep OR g.status IN ('draft', 'removed'));
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'game_plays (deleted: plays of deleted games)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.game_reports p JOIN public.games g ON g.id = p.game_id
     WHERE g.creator_id = p_user AND (NOT v_keep OR g.status IN ('draft', 'removed'));
  ELSE
    DELETE FROM public.game_reports p USING public.games g
     WHERE g.id = p.game_id AND g.creator_id = p_user AND (NOT v_keep OR g.status IN ('draft', 'removed'));
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'game_reports (deleted: reports of deleted games)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.games WHERE creator_id = p_user AND (NOT v_keep OR status IN ('draft', 'removed'));
  ELSE
    DELETE FROM public.games WHERE creator_id = p_user AND (NOT v_keep OR status IN ('draft', 'removed'));
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'games (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.games WHERE creator_id = p_user AND v_keep AND status NOT IN ('draft', 'removed');
  ELSE
    UPDATE public.games SET creator_id = c_sentinel WHERE creator_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'games.creator_id (to deleted user)', 'rows', v_n)); END IF;

  -- A5. Tier lists. creator_id is SET NULL, but tier_lists_public_needs_creator forbids a
  --     public list without a creator, so the plain cascade would fail on a public list.
  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.tier_lists WHERE creator_id = p_user AND (NOT v_keep OR visibility = 'private');
  ELSE
    DELETE FROM public.tier_lists WHERE creator_id = p_user AND (NOT v_keep OR visibility = 'private');
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'tier_lists (deleted: private ones, or all when quizzes are not kept)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.tier_lists WHERE creator_id = p_user AND v_keep AND visibility <> 'private';
  ELSE
    UPDATE public.tier_lists SET creator_id = c_sentinel WHERE creator_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'tier_lists.creator_id (to deleted user)', 'rows', v_n)); END IF;

  -- B. Nullable NO ACTION references: anonymised (like plays.player_id, which is SET NULL).
  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.game_plays p WHERE p.player_id = p_user
       AND NOT EXISTS (SELECT 1 FROM public.games g WHERE g.id = p.game_id AND g.creator_id = p_user
                         AND (NOT v_keep OR g.status IN ('draft', 'removed')));
  ELSE
    UPDATE public.game_plays SET player_id = NULL WHERE player_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'game_plays.player_id (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.game_reports p WHERE p.reporter_id = p_user
       AND NOT EXISTS (SELECT 1 FROM public.games g WHERE g.id = p.game_id AND g.creator_id = p_user
                         AND (NOT v_keep OR g.status IN ('draft', 'removed')));
  ELSE
    UPDATE public.game_reports SET reporter_id = NULL WHERE reporter_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'game_reports.reporter_id (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.blind_test_plays WHERE player_id = p_user;
  ELSE
    UPDATE public.blind_test_plays SET player_id = NULL WHERE player_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'blind_test_plays.player_id (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.tot_plays WHERE user_id = p_user;
  ELSE
    UPDATE public.tot_plays SET user_id = NULL WHERE user_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'tot_plays.user_id (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.pinterest_csv_batches WHERE created_by = p_user;
  ELSE
    UPDATE public.pinterest_csv_batches SET created_by = NULL WHERE created_by = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'pinterest_csv_batches.created_by (set null)', 'rows', v_n)); END IF;

  -- C. Blind test profile (bt_players): names copied into challenges are anonymised, the
  --    ranked plays (NO ACTION to bt_players) and the profile row are deleted.
  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.challenges c JOIN public.bt_players b ON b.id = c.creator_player_id WHERE b.user_id = p_user;
  ELSE
    UPDATE public.challenges c SET creator_name = 'Anonymous' FROM public.bt_players b
     WHERE b.id = c.creator_player_id AND b.user_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'challenges.creator_name (to Anonymous)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.challenge_attempts c JOIN public.bt_players b ON b.id = c.player_id WHERE b.user_id = p_user;
  ELSE
    UPDATE public.challenge_attempts c SET player_name = 'Anonymous' FROM public.bt_players b
     WHERE b.id = c.player_id AND b.user_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'challenge_attempts.player_name (to Anonymous)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.ranked_plays rp JOIN public.bt_players b ON b.id = rp.player_id WHERE b.user_id = p_user;
  ELSE
    DELETE FROM public.ranked_plays rp USING public.bt_players b WHERE b.id = rp.player_id AND b.user_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'ranked_plays (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN
    SELECT count(*) INTO v_n FROM public.bt_players WHERE user_id = p_user;
  ELSE
    DELETE FROM public.bt_players WHERE user_id = p_user;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'bt_players (deleted)', 'rows', v_n)); END IF;

  -- D. Per-account rows with a NOT NULL NO ACTION reference: deleted.
  IF v_dry THEN SELECT count(*) INTO v_n FROM public.daily_blindtest_scores WHERE user_id = p_user;
  ELSE DELETE FROM public.daily_blindtest_scores WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'daily_blindtest_scores (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.debate_votes WHERE user_id = p_user;
  ELSE DELETE FROM public.debate_votes WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'debate_votes (deleted, with replies and reports on them)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.activity_cheers WHERE user_id = p_user;
  ELSE DELETE FROM public.activity_cheers WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'activity_cheers (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.dev_user_cards WHERE user_id = p_user;
  ELSE DELETE FROM public.dev_user_cards WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'dev_user_cards (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.dev_pack_opens WHERE user_id = p_user;
  ELSE DELETE FROM public.dev_pack_opens WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'dev_pack_opens (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.dev_byeol_transactions WHERE user_id = p_user;
  ELSE DELETE FROM public.dev_byeol_transactions WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'dev_byeol_transactions (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.dev_user_byeol WHERE user_id = p_user;
  ELSE DELETE FROM public.dev_user_byeol WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'dev_user_byeol (deleted)', 'rows', v_n)); END IF;

  -- E. Activity feed: user_id is SET NULL by the foreign key, but display_name is a copy
  --    of the name, so it is replaced first.
  IF v_dry THEN SELECT count(*) INTO v_n FROM public.activity_events WHERE user_id = p_user;
  ELSE UPDATE public.activity_events SET display_name = 'Deleted user' WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'activity_events.display_name (to Deleted user)', 'rows', v_n)); END IF;

  -- F. Verse tables with a bare user id (no foreign key), exactly as
  --    apps/quiz/src/lib/verse/account-cleanup.ts: purgeUserCardsData (CARDS_USER_TABLES),
  --    cleanupUserEssaysData, purgeUserProfileData, cleanupUserThreadsData.
  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_binders WHERE user_id = p_user;
  ELSE DELETE FROM public.verse_binders WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_binders (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_profile_shelf WHERE user_id = p_user;
  ELSE DELETE FROM public.verse_profile_shelf WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_profile_shelf (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_profile_shelf_settings WHERE user_id = p_user;
  ELSE DELETE FROM public.verse_profile_shelf_settings WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_profile_shelf_settings (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.photocard_collection WHERE user_id = p_user;
  ELSE DELETE FROM public.photocard_collection WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'photocard_collection (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.collectible_collection WHERE user_id = p_user;
  ELSE DELETE FROM public.collectible_collection WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'collectible_collection (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_essay_series WHERE created_by = p_user;
  ELSE UPDATE public.verse_essay_series SET created_by = NULL WHERE created_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_essay_series.created_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_essay_reactions WHERE user_id = p_user;
  ELSE DELETE FROM public.verse_essay_reactions WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_essay_reactions (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.profile_section_visibility WHERE user_id = p_user;
  ELSE DELETE FROM public.profile_section_visibility WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'profile_section_visibility (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_threads WHERE created_by = p_user;
  ELSE UPDATE public.verse_threads SET created_by = NULL WHERE created_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_threads.created_by (set null)', 'rows', v_n)); END IF;

  -- G. Other columns that hold the account id without a foreign key (found in the catalog;
  --    account-cleanup.ts does not cover them). Private rows are deleted, optional author
  --    or reviewer references are nulled, and NOT NULL authorship of shared Verse content
  --    (comments, essays, pages, revisions) goes to the sentinel.
  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_watchlists WHERE user_id = p_user;
  ELSE DELETE FROM public.verse_watchlists WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_watchlists (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.space_members WHERE user_id = p_user;
  ELSE DELETE FROM public.space_members WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'space_members (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.space_poll_votes WHERE user_id = p_user;
  ELSE DELETE FROM public.space_poll_votes WHERE user_id = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'space_poll_votes (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_drafts WHERE author = v_txt;
  ELSE DELETE FROM public.verse_drafts WHERE author = v_txt; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_drafts (deleted)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.space_members WHERE invited_by = p_user AND user_id <> p_user;
  ELSE UPDATE public.space_members SET invited_by = NULL WHERE invited_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'space_members.invited_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.space_members WHERE blocked_by = p_user AND user_id <> p_user;
  ELSE UPDATE public.space_members SET blocked_by = NULL WHERE blocked_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'space_members.blocked_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.space_polls WHERE created_by = p_user;
  ELSE UPDATE public.space_polls SET created_by = NULL WHERE created_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'space_polls.created_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_essays WHERE reviewed_by = p_user;
  ELSE UPDATE public.verse_essays SET reviewed_by = NULL WHERE reviewed_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_essays.reviewed_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_flags WHERE reporter = p_user;
  ELSE UPDATE public.verse_flags SET reporter = NULL WHERE reporter = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_flags.reporter (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_flags WHERE resolved_by = p_user;
  ELSE UPDATE public.verse_flags SET resolved_by = NULL WHERE resolved_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_flags.resolved_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_space_assets WHERE uploaded_by = p_user;
  ELSE UPDATE public.verse_space_assets SET uploaded_by = NULL WHERE uploaded_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_space_assets.uploaded_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_space_assets WHERE reviewed_by = p_user;
  ELSE UPDATE public.verse_space_assets SET reviewed_by = NULL WHERE reviewed_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_space_assets.reviewed_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.idols WHERE created_by = p_user;
  ELSE UPDATE public.idols SET created_by = NULL WHERE created_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'idols.created_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.photocards WHERE created_by = p_user;
  ELSE UPDATE public.photocards SET created_by = NULL WHERE created_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'photocards.created_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.collectibles WHERE created_by = p_user;
  ELSE UPDATE public.collectibles SET created_by = NULL WHERE created_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'collectibles.created_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_banned_terms WHERE created_by = p_user;
  ELSE UPDATE public.verse_banned_terms SET created_by = NULL WHERE created_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_banned_terms.created_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.community_autohidden WHERE restored_by = p_user;
  ELSE UPDATE public.community_autohidden SET restored_by = NULL WHERE restored_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'community_autohidden.restored_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_edit_suggestions WHERE author = v_txt;
  ELSE UPDATE public.verse_edit_suggestions SET author = NULL WHERE author = v_txt; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_edit_suggestions.author (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_edit_suggestions WHERE reviewer = v_txt;
  ELSE UPDATE public.verse_edit_suggestions SET reviewer = NULL WHERE reviewer = v_txt; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_edit_suggestions.reviewer (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_content WHERE locked_by = v_txt;
  ELSE UPDATE public.verse_content SET locked_by = NULL WHERE locked_by = v_txt; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_content.locked_by (set null)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_discussions WHERE author = p_user;
  ELSE UPDATE public.verse_discussions SET author = c_sentinel WHERE author = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_discussions.author (to deleted user)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_essays WHERE author = p_user;
  ELSE UPDATE public.verse_essays SET author = c_sentinel WHERE author = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_essays.author (to deleted user)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.pages WHERE created_by = p_user;
  ELSE UPDATE public.pages SET created_by = c_sentinel WHERE created_by = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'pages.created_by (to deleted user)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.page_revisions WHERE author = p_user;
  ELSE UPDATE public.page_revisions SET author = c_sentinel WHERE author = p_user; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'page_revisions.author (to deleted user)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_revisions WHERE author = v_txt;
  ELSE UPDATE public.verse_revisions SET author = c_sentinel::text WHERE author = v_txt; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_revisions.author (to deleted user)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.verse_pages WHERE created_by = v_txt;
  ELSE UPDATE public.verse_pages SET created_by = c_sentinel::text WHERE created_by = v_txt; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'verse_pages.created_by (to deleted user)', 'rows', v_n)); END IF;

  IF v_dry THEN SELECT count(*) INTO v_n FROM public.entity_overrides WHERE author = v_txt;
  ELSE UPDATE public.entity_overrides SET author = c_sentinel::text WHERE author = v_txt; GET DIAGNOSTICS v_n = ROW_COUNT; END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'entity_overrides.author (to deleted user)', 'rows', v_n)); END IF;

  -- H. Storage files are only counted (SQL does not delete Storage objects): files owned by
  --    the account, and the community photos the app uploads (service role, so no owner)
  --    under verse-space-assets/community/<account id>/.
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM storage.objects WHERE owner = $1 OR owner_id = $2'
         || ' OR (bucket_id = ''verse-space-assets'' AND name LIKE ''community/'' || $2 || ''/%'')'
       INTO v_files USING p_user, v_txt;
  END IF;

  IF v_dry THEN
    RETURN jsonb_build_object(
      'mode', 'dry_run (nothing was changed)',
      'keep_quizzes', v_keep,
      'refusals', to_jsonb(v_refusals),
      'references_before', v_refs,
      'actions', v_act,
      'storage_files_left', v_files
    );
  END IF;

  -- I. Self-check: no NO ACTION / RESTRICT reference may remain.
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f'
       AND c.confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
       AND c.connamespace = 'public'::regnamespace
       AND c.confdeltype IN ('a', 'r')
  LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE %I = $1', r.tbl, r.col) INTO v_n USING p_user;
    IF v_n > 0 THEN
      RAISE EXCEPTION 'admin_delete_account: % row(s) of %.% still reference the account, nothing was deleted', v_n, r.tbl, r.col;
    END IF;
  END LOOP;

  -- J. The Auth user. profiles and every ON DELETE CASCADE table follow; SET NULL columns are nulled.
  DELETE FROM auth.users WHERE id = p_user;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 OR EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RAISE EXCEPTION 'admin_delete_account: the Auth user was not deleted, nothing was changed';
  END IF;
  IF v_n > 0 THEN v_act := v_act || jsonb_build_array(jsonb_build_object('step', 'auth.users (deleted, cascades profiles)', 'rows', v_n)); END IF;

  RETURN jsonb_build_object(
    'mode', 'deleted',
    'keep_quizzes', v_keep,
    'refusals', to_jsonb(v_refusals),
    'references_before', v_refs,
    'actions', v_act,
    'storage_files_left', v_files
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_account(uuid, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_account(uuid, boolean, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid, boolean, boolean) TO service_role;

COMMENT ON FUNCTION public.admin_delete_account(uuid, boolean, boolean) IS
  'Mission U part D: deletes one account by hand. Dry run by default (counts only). Kept quizzes go to the deleted-user sentinel 00000000-0000-0000-0000-00000000dead. Service role only. Guide: docs/pending-migrations/account-deletion-MODE-EMPLOI.md';

COMMIT;
