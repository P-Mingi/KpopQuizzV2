# Verification (run O1, Bunnyverse)

Read-only commands and queries, phase by phase, each with the result to expect. Since 2026-10-30 `docs/launch/o1/session.sh` runs the SQL lines of
V2 to V8 by itself after each file, as the OK or KO rows of `docs/launch/o1/checks/*.sql`; the HTTP checks (V1, V9, V10, the Data API wall of V3) stay the worker's. Nothing here writes to a database or changes a
setting, and every query returns names and numbers only. "Stop" means: do not go on to the next step; the way back is in
`ROLLBACK.md`.

Sites (2026-10-28): kpopquiz.org (project `kpopquiz`), the Bunnyverse hub at `https://bunnyverse.org` (project `fandomverse`) and OtakuQuiz at
`https://bunnyverse.org/anime` (project `otakuquiz`, through the Microfrontends group `fandomverse`). Every OtakuQuiz path starts with `/anime`.
Watches: 24 hours after B, after 008 (D3) and after 010 (F) (RUNBOOK).

Helpers (the same as `SQL-ORDER.md` section 1):

    read -rs PROD_DB_URL; export PROD_DB_URL
    q() { psql "$PROD_DB_URL" -X -At -v ON_ERROR_STOP=1 -c "$1"; }
    M=docs/pending-migrations/multisite
    mkdir -p ~/kpq-launch

`~/kpq-launch` is a folder of your own for the snapshots below, outside the repository. In these blocks a `# ...` note follows only a `q` line,
which reads its first argument only, so it is harmless in zsh too; any other command carries no note.

Where a result is "the same as V0", compare with the numbers you saved in `~/kpq-launch/v0.txt`. Counts that move with traffic
(plays, profiles) are compared with the rule written next to them, never as equal to the old number.

## A0. S4 (applied 2026-10-23; run again after 008, after G and on launch day)

**V-S4 (must pass, fails loudly otherwise).** S4 was applied in production on 2026-10-23 at 14:53 UTC. This check raises, and psql exits
non-zero, if any of the 28 functions S4 closed is executable again by anon or authenticated, if service_role lost EXECUTE on one, or
if one of the 28 is missing. Expect the notice `V-S4 ok: 28 functions closed to anon and authenticated, open to service_role`.

    psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/launch/o1/V-S4-closed.sql

The query is in the header of `docs/pending-migrations/s4/S4-revoke-public-execute.sql`; run it as one command:

    q "select count(*) filter (where not has_function_privilege('anon', p.oid, 'EXECUTE') and not has_function_privilege('authenticated', p.oid, 'EXECUTE') and has_function_privilege('service_role', p.oid, 'EXECUTE')), count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('award_xp', 'award_bt_xp', 'award_daily_capped_byeol', 'award_first_time_byeol', 'award_like_xp', 'dev_award_byeol', 'dev_open_card_pack', 'dev_open_starter_pack', 'create_quiz_bypass', 'merge_anon_passport', 'record_bt_play', 'record_game_play', 'update_player_rank', 'update_player_streak', 'grant_streak_badges', 'emit_activity', 'fanout_followed_new_quiz', 'generate_daily_challenges', 'ensure_daily_blindtest', 'ensure_daily_debate', 'reconcile_quiz_counters', 'recalculate_difficulty', 'increment_game_play_count', 'increment_tot_appear', 'increment_tot_category_plays', 'increment_tot_pick', 'tier_list_bump_view', 'get_daily_bt_leaderboard')"

Expect `28|28` (every one of the 28 closed to anon and authenticated, open to service_role). After 008 the 7 argument `merge_anon_passport` replaces the 6 argument one for `service_role` only: the line still reads `28|28`.
The four kept functions (`record_play`, `increment_like_count`, `decrement_like_count`, `get_personality_counts`) stay executable by anon and authenticated.

## V0. Baseline, before anything (save it)

    { date -u; for s in \
      "select count(*) from public.profiles" \
      "select coalesce(sum(xp),0) from public.profiles" \
      "select count(*), coalesce(sum(play_count),0) from public.quizzes" \
      "select count(*) from public.plays" \
      "select count(*) from public.groups" \
      "select count(*) from public.quiz_bank" \
      "select count(*) from public.qotd_log" \
      "select count(*) from public.badge_definitions" \
      "select count(*) from public.quizzes q where q.play_count <> (select count(*) from public.plays p where p.quiz_id = q.id)"; do
        echo "$s"; q "$s"; done; } | tee ~/kpq-launch/v0.txt

The last query is the counters audit: how many quizzes have a `play_count` that differs from their rows in `plays`. It may not be 0 today
(the cron `plays-counter-reconcile` fixes drift at 04:15 UTC). Keep the number: later it must not grow beyond what one night of the cron explains.

Also save the 11 function signatures that 008 will replace, to compare later (V4):

    q "select proname, pg_get_function_identity_arguments(oid), prosecdef, proconfig, proacl from pg_proc where pronamespace='public'::regnamespace and proname in ('award_xp','record_play','handle_new_quiz','increment_like_count','decrement_like_count','notify_badge_earned','notify_group_quiz_alerts','cast_duel_vote','passport_on_battle_result','record_bt_play','merge_anon_passport','ensure_daily_quiz') order by proname, oid" > ~/kpq-launch/functions-before.txt

Expect 12 rows (11 for 008, plus `ensure_daily_quiz` for 010).

## V1. kpopquiz.org did not change (after the PR merge, after each deploy, after each flag)

Snapshot the 60 parity URLs before the step, and again after. Pages with live numbers or relative times ("6h ago") always differ a little:

    snap() { mkdir -p "$1"; grep -v '^#' apps/quiz/e2e/o1/parity/urls.txt | grep . | while read -r p; do
      curl -sS -m 30 "https://kpopquiz.org$p" -o "$1/$(printf '%s' "$p" | tr '/?&=' '____').html"; done; }
    snap ~/kpq-launch/before
    snap ~/kpq-launch/after
    diff -rq ~/kpq-launch/before ~/kpq-launch/after

Expect: no file differs, or only the pages with a live counter, leaderboard time or the quiz of the day (as the three accepted cases
D-054, D-058 and D-067 of the run: feed cut-offs and a relative time). Look at each other difference with `diff` before going on.
If the flags are all off the head and body of a page must be byte equal apart from those. The in-repo comparator does the same on two builds:
`scripts/o1/parity.sh` (needs the run's local tooling; the curl loop above needs nothing).

Leak check for SITE_SCOPE, once any anime content exists (V8) and again after every flag: no anime title on a kpop page.

    for p in / /quizzes /new /trending /trivia /most-liked /sitemap.xml /llms.txt; do
      printf '%s ' "$p"; curl -sS "https://kpopquiz.org$p" | grep -ciE 'death note|one piece|spy x family|otakuquiz'; done

Expect `0` on every line, except `/` and `/llms.txt` after `NEXT_PUBLIC_NET_FOOTER` is on (they then name the network, by design).

## V2. 001, 002a to 002d

    q "select id, domain, brand, kind, status, sort from public.sites order by sort"
Expect one row after 001: `kpop|kpopquiz.org|KpopQuiz|world|live|1` (no anime, no hub: Verrou 0).

    q "select count(*) from information_schema.columns where table_schema='public' and column_name='site_id' and column_default='''kpop''::text' and is_nullable='NO'"
Expect 24 after 002a (a later file adds its own, so the number may be higher after 009, 011 and the others).

    q "select count(*) from pg_constraint where contype='f' and confrelid='public.sites'::regclass and conname like '%\_site\_id\_fkey' and not convalidated"
Expect 24 after 002a, 0 after 002b.

    q "select count(*) from pg_index i join pg_class c on c.oid=i.indexrelid where c.relnamespace='public'::regnamespace and i.indisvalid and c.relname in ('quizzes_site_status_created_idx','groups_site_slug_idx','games_site_status_idx','trivia_site_group_idx','activity_events_site_created_idx','creator_notifications_site_user_idx','editorial_drafts_site_status_idx','verse_threads_site_created_idx','community_debates_site_created_idx')"
Expect 9 after 002c.
An index that is not valid is a stopped build: drop it with `DROP INDEX CONCURRENTLY`, run 002c again.

    q "select count(*) from public.quizzes where site_id <> 'kpop'"                 # expect 0
    q "select count(*) from public.badge_definitions where site_id <> 'kpop'"       # expect 0
    q "select tgname, tgenabled from pg_trigger where tgrelid='public.quizzes'::regclass and tgname='trg_quizzes_site_guard'"
Expect `trg_quizzes_site_guard|O` after 002d.

    q "select prosecdef, proconfig, has_function_privilege('anon','public.quizzes_site_guard()','execute') from pg_proc where oid='public.quizzes_site_guard()'::regprocedure"
Expect `t|{search_path=public}|f`.

Then a real quiz creation as a signed-in kpop user on kpopquiz.org (create a throwaway quiz, check it saves, delete it from your profile).
The guard fires on that insert path, so this is the proof that it does not block kpop.

After SITE_SCOPE (RUNBOOK B6) run V1 again: the snapshot must still match.

## V3. 003 to 007

    q "select (select count(*) from public.world_memberships where site_id='kpop') = (select count(*) from public.profiles)"     # expect t
    q "select count(*) from public.world_memberships where site_id='kpop' and (xp is not null or daily_streak is not null)"    # expect 0
    q "select (select coalesce(sum(xp),0) from public.profiles) = (select coalesce(sum(xp),0) from public.world_progress where site_id='kpop')"   # expect t (after 004)
    q "select tgname, tgenabled from pg_trigger where tgrelid='public.profiles'::regclass and tgname='trg_profiles_membership'"                  # expect one row, O
    q "select polname, polcmd from pg_policy where polrelid='public.world_memberships'::regclass"                                               # expect world_memberships_select_own|r
The first line compares live tables at one instant, so traffic does not disturb it. Also compare `select sum(xp) from public.profiles`
with the V0 number: it may only have grown, by the xp of plays since V0.

Sign-up proof for 003 (it adds a trigger to `profiles`): in a private window sign up a new throwaway account on kpopquiz.org, finish onboarding,
then `q "select count(*) from public.world_memberships m join public.profiles p on p.id=m.user_id where p.username='<the username>' and m.site_id='kpop'"` must be 1.
Delete that account afterwards the way you delete accounts today (Mission U part D function, or the dashboard).

    q "select to_regclass('public.passport_prefs'), to_regclass('public.favourites'), to_regclass('public.world_follows')"                      # 3 names (004)
    q "select count(*) from pg_policy where polrelid in ('public.passport_prefs'::regclass,'public.favourites'::regclass,'public.world_follows'::regclass)"   # 8 (the contract; 004's header says 7)
    q "select relrowsecurity from pg_class where oid='public.bridge_daily'::regclass"                                                            # t (005)
    q "select count(*) from pg_policy where polrelid='public.bridge_daily'::regclass"                                                            # 0
    q "select has_table_privilege('anon','public.bridge_daily','select'), has_table_privilege('authenticated','public.bridge_daily','select')"   # f|f
    q "select has_schema_privilege('anon','passport','usage'), has_schema_privilege('authenticated','passport','usage'), has_schema_privilege('service_role','passport','usage')"   # f|f|t (006)
    q "select relname, relrowsecurity from pg_class where relnamespace='passport'::regnamespace and relkind='r' order by 1"                       # handoff_codes|t, handoff_events|t
    q "select proname, has_function_privilege('anon',oid,'execute'), has_function_privilege('service_role',oid,'execute') from pg_proc where proname like 'passport\_%' and pronamespace='public'::regnamespace order by 1"   # f|t for each of the 4
    q "select proname, prosecdef from pg_proc where pronamespace='public'::regnamespace and proname in ('award_world_xp','bump_world_counter','public_passport','my_passport','update_my_membership','set_passport_prefs') order by 1"   # 6 rows (007)
    q "select has_function_privilege('anon','public.public_passport(text)','execute'), has_function_privilege('anon','public.award_world_xp(uuid,text,integer,text)','execute')"   # t|f
    q "select public.award_world_xp(gen_random_uuid(),'kpop',1,'play')"          # expect an ERROR naming kpop; it writes nothing

Data API wall for 006 (dashboard, Project Settings, API, "Exposed schemas"): `passport` must not be in the list. Check by request:
`curl -sS -o /dev/null -w '%{http_code}\n' -H "apikey: <the anon key>" "<project url>/rest/v1/handoff_codes" -H "Accept-Profile: passport"` expects 404 or 406 (never 200).
Type the anon key from your own settings; it is a public key.

24 hour watch after P1 (RUNBOOK C): at the end of the 24 hours, V1, and `q "select count(*), coalesce(sum(play_count),0) from public.quizzes"` must have grown with
traffic, Vercel "Runtime Logs" for `kpopquiz` must show no new error type over the 24 hours, and the counters audit of V0 must not exceed its baseline.

## V4. 008, write locks (RUNBOOK D)

Run V-S4 (section A0) after this step: it must print `V-S4 ok`.

    psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/launch/o1/V-S4-closed.sql

Gate before applying (production's functions must still be the ones the evidence was made on):

    q "select '@@@' || p.proname || E'\n' || p.prosrc || E'\n;;;;\n' from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('award_xp','record_play','handle_new_quiz','increment_like_count','decrement_like_count','notify_badge_earned','notify_group_quiz_alerts','cast_duel_vote','passport_on_battle_result','record_bt_play','merge_anon_passport') order by p.proname, p.oid" > ~/kpq-launch/prod-functions.txt

Then compare the bodies with the rollback file, which holds today's definitions verbatim (run from the repository root; paste into `python3`):

```
import os
n = lambda s: ' '.join(s.split())
back = n(open('docs/pending-migrations/multisite/008-write-locks.rollback.sql').read())
blocks = [b for b in open(os.path.expanduser('~/kpq-launch/prod-functions.txt')).read().split(';;;;') if b.strip()]
blocks = [b.strip() for b in blocks]
bad = [b.split('\n')[0][3:] for b in blocks if n(b.split('\n', 1)[1]) not in back]
print('functions read:', len(blocks), '| body different from the rollback file:', bad if bad else 'none')
```

Expect `functions read: 11 | body different from the rollback file: none`. A name in the list means production changed since the dump 008 was built on:
stop; the rollback file is no longer "today's definition" and the equivalence run must be redone on a fresh copy.

The equivalence evidence (same md5 before and after 008, 20 section hashes equal) is `docs/o1/reports/LC/scratch.md`
(and the batch `apps/quiz/e2e/o1/B3/equivalence.sh`, which runs only on the o1 branches, never on production: it creates fixture users). Attach that file to the step.

After 008:

    q "select proname, pg_get_function_identity_arguments(oid), prosecdef, proconfig, proacl from pg_proc where pronamespace='public'::regnamespace and proname in ('award_xp','record_play','handle_new_quiz','increment_like_count','decrement_like_count','notify_badge_earned','notify_group_quiz_alerts','cast_duel_vote','passport_on_battle_result','record_bt_play','merge_anon_passport','ensure_daily_quiz') order by proname, oid" > ~/kpq-launch/functions-after008.txt
    diff ~/kpq-launch/functions-before.txt ~/kpq-launch/functions-after008.txt
Expect exactly one changed line: `merge_anon_passport` gains the 7th argument `p_site text`; the ACL is `{postgres=X/postgres,service_role=X/postgres}` before and after (no `=X`: S4 came first and 008 keeps it closed).

    q "select tgname from pg_trigger where tgname in ('on_quiz_insert','trg_notify_badge_earned','group_quiz_alerts_on_insert','group_quiz_alerts_on_publish','trg_passport_on_battle_result') order by 1"     # 5 rows

Live proof on kpop, in a private window with a throwaway account: play one quiz (its `play_count` rises by 1, the account's xp rises by what it did before 008,
as the profile page shows), like and unlike a quiz (counter +1, then back), create and delete a quiz. Compare xp and counter movement with a play done just before the step.
Then V1 and the counters audit of V0.

## V5. 009, app deploy, 010 (the daily window)

After 009:

    q "select id, system_user_id is not null as has_author, fallback_group_slug from public.sites order by id"    # kpop|t|general-kpop
    q "select count(*) from pg_index i join pg_class c on c.oid=i.indexrelid where c.relname in ('quiz_bank_site_date','qotd_log_site_date') and i.indisvalid and i.indisready"     # 2
    q "select convalidated from pg_constraint where conname='quiz_bank_category_check'"                                   # t
    q "select category, count(*) from public.quiz_bank group by 1 order by 1"                                               # only the twelve listed categories

After the deploy: `curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://kpopquiz.org/daily` gives a redirect to today's `/q/<slug>`.

After 010:

    q "select count(*) from pg_constraint where conname in ('quiz_bank_scheduled_date_key','qotd_log_featured_date_key')"      # 0
    q "select proname, pg_get_function_identity_arguments(oid), prosecdef, proacl from pg_proc where pronamespace='public'::regnamespace and proname in ('ensure_daily_quiz','ensure_daily_quiz_v2') order by 1"
Expect 2 rows, security definer true; ACL `{postgres=X/postgres,service_role=X/postgres}` on both (the first unchanged from `functions-before.txt`).
The evidence that today's function and the wrapper publish the same quiz (110 dates, same md5) is `docs/o1/reports/K1/scratch.md`.

The day after (the cron fires at 00:05 UTC): `q "select featured_date, site_id from public.qotd_log order by featured_date desc limit 3"` has today's date with `kpop`,
`q "select slug from public.quizzes where is_quiz_of_the_day and quiz_of_the_day_date=current_date and site_id='kpop'"` returns one slug, and the `/daily` redirect points to it.
Vercel, project `kpopquiz`, Cron Jobs: `ensure-daily-quiz` shows a success at 00:05.

## V6. 011 to 017 (P5, after the 24 hour watch F)

Run V-S4 (section A0) after this step: it must print `V-S4 ok`.

    psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/launch/o1/V-S4-closed.sql

    q "select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in ('series','arcs','characters','episodes','series_themes','series_progress','favourite_characters') order by 1"   # 7 rows, t
    q "select count(*) from public.series"                                                                                     # 0 (011)
    q "select pg_get_constraintdef(oid) from pg_constraint where conname='trivia_entity_kind_check'"                           # the ten kinds
    q "select relrowsecurity from pg_class where oid='public.review_batches'::regclass"                                         # t (012)
    q "select count(*) from pg_policy where polrelid='public.review_batches'::regclass"                                         # 0
    q "select count(*) from public.editorial_drafts where kind='quiz'"                                                          # 0
    q "select convalidated from pg_constraint where conname='games_game_type_check'"                                            # t (013)
    q "select game_type, count(*) from public.games group by 1 order by 1"                                                      # only the eight listed types
    q "select to_regclass('public.daily_openings'), to_regprocedure('public.ensure_daily_opening(date,text)')"                  # both set (014)
    q "select proacl from pg_proc where proname='ensure_daily_opening'"                                                         # {postgres=X/postgres,service_role=X/postgres}
    q "select to_regclass('public.spoiler_reports'), to_regprocedure('public.report_spoiler(uuid)'), has_function_privilege('authenticated','public.report_spoiler(uuid)','execute'), has_function_privilege('anon','public.report_spoiler(uuid)','execute')"   # set|set|t|f (015)
    q "select pg_get_constraintdef(oid) from pg_constraint where conname='reason_valid' and conrelid='public.reports'::regclass"  # the five reasons of today
    q "select count(*) from pg_indexes where indexname='reports_spoiler_once'"                                                   # 0

018 (row 14b), the queries of its header:

    q "select relname, relrowsecurity from pg_class where oid = 'public.entity_images'::regclass"                                  # entity_images|t
    q "select has_table_privilege('anon', 'public.entity_images', 'insert'), has_table_privilege('authenticated', 'public.entity_images', 'update'), has_column_privilege('anon', 'public.entity_images', 'created_by', 'select'), has_column_privilege('anon', 'public.entity_images', 'path', 'select')"   # f|f|f|t
    q "select id, public, file_size_limit from storage.buckets where id = 'entity-images'"                                       # entity-images|t|4194304
    q "select has_column_privilege('anon', 'public.entity_images', 'license_url', 'select'), has_column_privilege('anon', 'public.entity_images', 'commons_file', 'select'), has_column_privilege('anon', 'public.entity_images', 'needs_credit', 'select')"   # f|f|f (CR-021: the three columns of the credit rules are closed; V-018 rows 4 and 5)

016: the tables `passport.deletion_requests` and `passport.deletion_log` exist with RLS on and no policy (`select relname, relrowsecurity from pg_class where relnamespace = 'passport'::regnamespace and relname like 'deletion%' and relkind = 'r' order by 1` gives `deletion_log|t`, `deletion_requests|t`); the five functions
`passport_request_deletion`, `passport_cancel_deletion`, `passport_run_deletion`, `passport_leave_world`, `passport_due_deletions` are executable by `service_role` only
(`has_function_privilege('anon', ..., 'execute')` and the same for `authenticated` are `f`); `select count(*) from passport.deletion_requests` is 0.

017 (row 19b), the query of its header:

    q "select proname, has_function_privilege('anon', oid, 'execute'), has_function_privilege('authenticated', oid, 'execute'), has_function_privilege('service_role', oid, 'execute') from pg_proc where proname in ('passport_run_deletion', 'passport_deletion_status') order by 1"   # f|f|t for both

019 and 020 (SQL-ORDER rows 14c and 14d): `psql "$PROD_DB_URL" -X -At -f $M/dle-smoke.sql` prints `ok` on its ten rows (three more are information).
Lot K1, 021a (row 14e): `idols.gender` and `idols.debut_year` exist, every gender is 'female' or 'male' (`docs/launch/o1/checks/V-K1a.sql`).
Lot K1, 021c (row 14e ter): the debut years of the list are in place with one source each, 39, 46, 48, 175 carry their QID, 14 and 19 have the right QID, birth date and source references (`docs/launch/o1/checks/V-K1c.sql`).
Lot K1, 021b (row 14e bis): no active idol is still to review, and no minor and no idol without a birth date is in the game (`docs/launch/o1/checks/V-K1b.sql`).
023 (row 14g): `character_facts` and `series_facts` have RLS on and no policy and are closed to the browser roles, the view `dle_src_anime_character` is closed, the game row is absent until L01 (`docs/launch/o1/checks/V-023.sql`).
Lot K2, 021d (row 14e quater): 91 new idols present, active, reviewed and complete with their sources; 8 other-group links; 11 idols of the 021b list active; the 18 groups have an agency and a generation; no minor or idol without a birth date is active; the pool size is printed (`docs/launch/o1/checks/V-K2.sql`).
022 (row 14f): `agencies` and `site_assets` have RLS on and no policy; the views `site_assets_public` and `entity_images_public` are readable by anon, the two tables and their sequences are not; one agency per label the kpop groups cite, 17 in production (`docs/launch/o1/checks/V-022.sql`). CR-021: `entity_images_public` and `site_assets_public` fill author, licence, source and note only for a CC BY or CC BY-SA row (V-022 rows 16 and 17).

After the whole P5, V-S4 (section A0), V1 once more (nothing visible may have changed on kpop) and the Vercel runtime errors of `kpopquiz` for the last hour.

## V7. Clearing Verrou 0 (RUNBOOK F, 24 hours after 010, before P5)

All of:
1. The morning after 010 (RUNBOOK E5), V5's "day after" checks pass.
2. `q "select count(*) from public.quizzes where site_id <> 'kpop'"` is 0 and `q "select count(*) from public.badge_definitions where site_id <> 'kpop'"` is 0.
3. `q "select (select count(*) from public.world_memberships where site_id='kpop') = (select count(*) from public.profiles)"` is `t`.
4. `q "select (select sum(xp) from public.profiles) = (select sum(xp) from public.world_progress where site_id='kpop')"` is `t`, and `sum(xp)` is not lower than V0.
5. The counters audit of V0 is not above its baseline.
6. V1 shows kpopquiz.org unchanged.

## V8. Launch SQL (launch day), after each file

Run V-S4 (section A0) after this step: it must print `V-S4 ok`.

    psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/launch/o1/V-S4-closed.sql

Run `content-verify.sql` after L04 to L08 and compare with `expected-counts.json`:

    psql "$PROD_DB_URL" -X -At -F ' | ' -f $M/launch/content-verify.sql
    cat $M/launch/expected-counts.json
    grep -l '^-- DRAFTS' $M/launch/*.sql

The last command prints nothing.
The columns are, in order: groups, series, arcs, characters, themes, trivia, entity_sources, then (when the files L02 and L07 are in) Team accounts,
Team memberships, published quizzes, questions, then (L08) bank rows, bank questions. Each must equal the `counts` object, except `groups`, which is
one more than `counts.groups` (the series groups plus `anime-mix`). Rehearsed on o1-scratch on 2026-10-23 with the DRAFTS files and the whole repository SQL (`SQL-ORDER.md` section 5):
every file applied twice with no change the second time, every rollback refused when data had been written and ran clean otherwise.

    q "select id, domain, brand, kind, status, sort from public.sites order by sort"
After L01: the three rows its header lists ("Verify" lines): `kpop|kpopquiz.org|KpopQuiz|world|live|1`, then `anime` and `hub` with the Bunnyverse domains and brands lane 2 wrote, both `building`, sort 2 and 3. After L12 (K8): all three `live`.

After L03 (the sentinels): `q "select username, id from public.profiles where id::text like '00000000-0000-0000-0000-%' and username like 'deleted_user_%' order by 1"` gives `deleted_user_anime|00000000-0000-0000-0000-00000000dea2` and `deleted_user_hub|...dea3`
(plus `deleted_user` of Mission U part D when it is applied); `q "select count(*) from public.world_memberships where user_id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3')"` is 0;
with 016 applied `q "select public.passport_site_sentinel('anime'), public.passport_site_sentinel('hub')"` returns the two ids.
After L06 (the badges): `q "select count(*) from public.badge_definitions where site_id <> 'kpop'"` is 6 (`anime_first_steps`, `anime_quiz_maker`, `anime_prolific_creator`, `anime_multi_stan`, `anime_dedicated_fan`, `anime_community_star`), and `q "select count(*) from public.badge_definitions where site_id = 'hub'"` is 0.
After 023 run again in J4: `otakudle` is there, switched off, with 7 columns (`docs/launch/o1/checks/V-023.sql`).
024 (row 14h) and again in J4: `character_game_facts` has RLS on and no policy and is closed to the browser roles, the two views `dle_src_otakudle_one_piece` and `dle_src_otakudle_dragon_ball` are closed, the two games are absent until L01 and then there, switched off or whole, with 8 columns each and no Dragon Ball height (`docs/launch/o1/checks/V-024.sql`). After L15 (J4): every stored value and every hint has its source, a target has every column and its 5-error hint (`docs/launch/o1/checks/V-L15.sql`); the counts of targets against the minimums are information.
After L13 (the facts of the 750 characters of the pool, lots A1 and A2): 50 demographics, no fact outside the pool, no value without a source (the role of the site data itself counts), the targets over the game's minimum, 200 characters featured (the TOP200); 584 characters with the 7 columns and 113 targets are printed as information (`docs/launch/o1/checks/V-L13.sql`).
After L14 (Kpopdle Idol and Otakudle on), on each game: on, with its epoch; 365 days, each on a target of the pool; no target twice in the window around the cycle; the bank matches the pool; targets at the minimum or more (`docs/launch/o1/checks/V-L14.sql`). Counts only, never a target. Then `dle_day` of each game answers its number, as the browser calls it (session.sh J5).
After L05: `q "select count(*) from public.trivia where site_id='anime' and status='published'"` equals the `published` figure in its header (every verified fact).

    q "select count(*) from public.editorial_accounts where site_id='anime' and active"                      # 31 (L02)
    q "select s.system_user_id is not null, s.fallback_group_slug from public.sites s where id='anime'"       # t|anime-mix
    q "select count(*) from public.profiles where username like 'oq\_creator\_%' or username='otakuquiz_team'"   # 31
    q "select count(*) from public.world_memberships where site_id='kpop' and user_id in (select id from public.profiles where username like 'oq\_creator\_%' or username='otakuquiz_team')"   # 0 after L02: no kpop stamp for a Team account
Careful with the last one: 003's trigger gives a new profile a stamp for the site in `app.site_id`, and `create_profile_for_site` sets it to anime, so 0 is expected. If it is 31, stop: the accounts were created by another path.

Team accounts are off every board (rule 7): `q "select count(*) from public.world_memberships where site_id='anime' and xp > 0 and user_id in (select user_id from public.editorial_accounts where site_id='anime')"` is 0 before launch.

Leaks (SQL side), after L04 to L08:

    q "select count(*) from public.quizzes q join public.groups g on g.id=q.group_id where q.site_id <> g.site_id"             # 0
    q "select count(*) from public.groups g where g.site_id='anime' and g.slug in (select slug from public.groups where site_id='kpop')"   # 0
    q "select count(*) from public.quiz_bank where site_id='anime' and scheduled_date is not null"                          # 0 until you verify and the cron schedules
    q "select count(*) from public.trivia where site_id='anime' and status='published'"                                      # equals the `published` figure in L05's header

## V-DLE. The kept days of the daily games (each morning after launch, RUNBOOK L6)

    psql "$PROD_DB_URL" -X -At -f docs/launch/o1/checks/V-DLE-KEPT.sql

One row per active game: the kept days (today and the 7 after it) whose target has left the pool. 0 expected, `ok`. A number above 0 is `KO`: those days cannot be won, RUNBOOK L6 says what to do. Read only, counts only, never a target. It is item 4 of V12's morning check.

## V9. Vercel projects and environment (before the domain is attached)

Use each project's production `.vercel.app` address (Vercel, the project, Overview; you are signed in to Vercel, so protection lets your browser through; or use the dashboard "Visit").
OtakuQuiz has no address of its own to check: it is reached on the `fandomverse` address under `/anime`, through the Microfrontends group (RUNBOOK H7).

    KP=https://<kpopquiz production .vercel.app address>
    FV=https://<fandomverse production .vercel.app address>
    for B in "$KP" "$FV" "$FV/anime"; do
      echo "== $B"
      curl -sS -o /dev/null -w 'home %{http_code}\n' "$B"
      curl -sS -o /dev/null -w 'authorize %{http_code}\n' "$B/auth/authorize"
      curl -sS "$B" | grep -o 'application/ld+json' | head -1
      curl -sS "$B" | grep -o '<title>[^<]*' | head -1
    done
    curl -sS "$FV/robots.txt" | head -5

Expect for each: home 200; authorize 404 while `PASSPORT_JUMP` is off (never 500); `application/ld+json` printed (structured data present); the titles name KpopQuiz, Bunnyverse and OtakuQuiz in that order.

The build log of each project must show `check:env` passing and no line naming a missing variable. The three secrets are equal by length only:
in Vercel, open each project's variable, use "show" once, and compare the character count (never the value) of `PASSPORT_TICKET_SECRET`, `PASSPORT_REVALIDATE_SECRET` and `NET_IP_HASH_SALT` on the 3 projects.
If they are marked Sensitive (Vercel shows no value), skip this: the jump test of RUNBOOK K7 proves they are equal (it fails with an invalid ticket otherwise).

## V10. The three live sites (domain attached, flags as the runbook step says)

    for B in https://kpopquiz.org https://bunnyverse.org https://bunnyverse.org/anime; do
      echo "== $B"; curl -sS -o /dev/null -w 'home %{http_code} %{time_total}s\n' "$B"
      curl -sS "$B" | grep -o '<link rel="canonical"[^>]*>' | head -1
      curl -sS -o /dev/null -w 'sitemap %{http_code}\n' "$B/sitemap.xml"
      curl -sSI "$B" | grep -iE '^(strict-transport|x-robots-tag|set-cookie)' | sed 's/=.*//'
    done
    for H in kpopquiz.org bunnyverse.org; do
      echo "== $H"; curl -sS "https://$H/robots.txt" | grep -i '^sitemap'
      curl -sS -o /dev/null -w 'llms %{http_code}\n' "https://$H/llms.txt"
    done
    curl -sS -o /dev/null -w 'www %{http_code} %{redirect_url}\n' https://www.bunnyverse.org/

Expect: home 200 on all three; each canonical names its own base (`https://kpopquiz.org`, `https://bunnyverse.org`, `https://bunnyverse.org/anime`), never another;
one `robots.txt` per host, and the `Sitemap:` lines of bunnyverse.org name only bunnyverse.org addresses (never kpopquiz.org); sitemaps and llms 200;
`www.bunnyverse.org` redirects (301 or 308) to `https://bunnyverse.org/`; no `x-robots-tag: noindex` once indexing is open (RUNBOOK K10);
on the hub and `/anime` homes no `set-cookie` of a kpop name; `strict-transport-security` present.
Before indexing is open the hub and `/anime` homes carry a `noindex` robots meta (`curl -sS https://bunnyverse.org/anime | grep -io '<meta name="robots"[^>]*>'`); after K10 it must be gone on the hub home, `/anime`, `/anime/series`, a series page and `/anime/q/<slug>`, and still there on `/settings`, `/me`, `/anime/admin`.

String leaks (a site must not talk like another):

    for p in / /series /quizzes /daily /about /privacy /terms /faq /dmca; do
      printf 'anime %s ' "$p"; curl -sSL "https://bunnyverse.org/anime$p" | grep -ciE 'k-?pop|idol|bias group|kpopquiz'; done
    for p in / /privacy; do printf 'hub %s ' "$p"; curl -sSL "https://bunnyverse.org$p" | grep -ciE 'k-?pop|bias group'; done

Expect `0` on each line. Known leftovers from `RAPPORT-FINAL.md` section 5 (K-pop text on `/u/<name>`, name-all, the empty hub, the "Ways to play"
tiles and `/dmca`) may show here: write each hit down as a launch decision (fix first, or accept and date it).

Sign-in sheet (owner decision 2026-10-28, AUTH-BUNNYVERSE.md): on bunnyverse.org and `/anime` it offers Google and Discord and no email field; both sign in.
Same session: signed in on `https://bunnyverse.org`, `https://bunnyverse.org/anime` is signed in too, with no jump (one origin).

Cross-site cookie check: sign in on kpopquiz.org, open bunnyverse.org in the same browser: you are signed out there until the jump is on. After `PASSPORT_JUMP` (K7): from kpop open
`https://kpopquiz.org/auth/passport/out?to=anime`, you land on `https://bunnyverse.org/anime` signed in, and `https://bunnyverse.org` shows the same session; the Network tab shows the `via` parameter once and no token left in the URL after the landing.

Admin and noindex pages answer 404 or a login page for an anonymous visitor: `curl -sS -o /dev/null -w '%{http_code}\n' https://bunnyverse.org/anime/admin/review` is not 200; `https://bunnyverse.org/admin` is 404.

Email (section I of the runbook, only once the hook is on): request a magic link on kpopquiz.org with a mailbox you own; the mail looks exactly as before and signs you in; the Resend dashboard shows delivered, not bounced.
bunnyverse.org offers no email sign-in, so there is no mail to test there.

## V11. First 72 hours (hour 0, +1h, +24h, +48h, +72h)

Each time:
1. V10 loop, quickly. 2. Vercel, each project, Runtime Logs: errors in the last hour (compare with the previous hour; any new error type is a finding).
3. Cron Jobs: `ensure-daily-quiz` on `kpopquiz` and `otakuquiz` (00:05 UTC; on `otakuquiz` it answers 500 when the day has no quiz, RUNBOOK J4, and its log line is `/anime/api/cron/ensure-daily-quiz` with 200, never 401 or 404: RUNBOOK K6b), `passport-deletions` (03:50) and `passport-cleanup` (03:55, answers `{"codesDeleted":...}` on `fandomverse`); the other routes answer `{"skipped":true}` on a site that is not theirs.
4. `q "select featured_date, site_id from public.qotd_log order by featured_date desc, site_id limit 4"`: today's date has one `kpop` and one `anime` row.
5. `q "select site_id, count(*) from public.world_memberships group by 1 order by 1"`, `q "select src_site, dst_site, step, sum(n) from public.bridge_daily group by 1,2,3 order by 1,2,3"`:
   numbers only, small at first; no row of the 31 Team accounts in a leaderboard.
6. V1 for kpop (flags that touch kpop are on from this phase; the only expected differences are the footer line, the "Your sites" menu and the organization JSON-LD, each in the step that enabled it).
7. Supabase dashboard: Auth logs (no burst of failed Google or Discord sign-ins), Database advisors (no new security finding about the new tables); Resend bounce rate under 2 percent once the hook is on.
8. Search Console for kpopquiz.org and bunnyverse.org: the sitemaps submitted (on bunnyverse.org the hub's and `/anime`'s), no new "blocked by robots" or "noindex" on kpopquiz.org URLs.
At +72h write down the numbers of step 5 and 3 and decide whether to leave everything on (RUNBOOK L5).

## V12. Daily games: the nightly maintenance on the hub (before a game is switched on, then each morning after)

`ensure-daily-quiz` (00:05 UTC, shared `apps/quiz/vercel.json`) runs `dle_daily_maintenance` on the hub build only, after the quiz's work (`apps/quiz/src/lib/dle/maintenance.ts`). Its answer does not change, so read the log, not the response.

Before a game is switched on (Claude, read-only, after 019 and 020):

    q "select rolname, rolconfig from pg_roles where rolname in ('authenticator', 'service_role')"
    q "select has_table_privilege('service_role', 'public.idols', 'select'), has_table_privilege('service_role', 'public.groups', 'select'), has_table_privilege('service_role', 'public.group_units', 'select'), has_table_privilege('service_role', 'public.entity_images', 'select'), has_table_privilege('service_role', 'public.dle_src_kpop_idol', 'select'), has_function_privilege('service_role', 'public.dle_daily_maintenance(timestamptz)', 'execute'), has_function_privilege('anon', 'public.dle_daily_maintenance(timestamptz)', 'execute')"

Expect `t|t|t|t|t|t|f`: the view is `security_invoker`, so the cron's role needs the source tables (`psql` as the owner does not prove it). Any game's own source view gets the same check. A `statement_timeout` under 10 seconds on either role: tell the integrator (a rebuild took up to 3.6 s for 3000 targets on PGlite, one game; never measured on real Postgres).

The morning after (a worker, Vercel; Claude, SQL):

1. Vercel, project `fandomverse`, Logs, search `dle_daily_maintenance`, 00:05 UTC: one line, `[ensure-daily-quiz] dle_daily_maintenance: [...]`, with `game`, `pool` and `rebuilt_days` per active game (`[]` when none is active). `not applied on this database yet` is expected only before 019. Any `failed` line is a finding, the integrator looks at it the same day: `failed for game <id>: <code> <message>` names one game (the others ran, and the line of counts lists them), `failed: <code> <message>` is the whole call. The same search on `kpopquiz` and `otakuquiz` finds nothing.
2. `q "select game_id, game_no from public.dle_daily_stats where play_date = current_date order by 1"`: one row per active game (never select `entity_id`: it is the answer).
3. `q "select count(*) from public.dle_salt where day < current_date - 1"`: 0.
4. `psql "$PROD_DB_URL" -X -At -f docs/launch/o1/checks/V-DLE-KEPT.sql`: `ok` for each active game (V-DLE above, RUNBOOK L6).

Each game runs alone (CR-019). A game whose targets fell under `min_pool` (`dle_pool_too_small`), or whose `epoch` is still in the future (`dle_daily_stats_game_no_check`), keeps its snapshot and its bank of the day before and fails every night until fixed; the other games and the purges still run. A statement timeout fails the whole call, purges included. Activate a game with `epoch` = the day it opens.

On o1-dev, before that (cron schedules never fire on a preview, so it is called by hand; a worker, with the `CRON_SECRET` of the preview and access to the protected preview): after the merge into `o1/integration`, `curl -sS -H "Authorization: Bearer $CRON_SECRET" https://fandomverse-git-o1-integration-p-mingis-projects.vercel.app/api/cron/ensure-daily-quiz`, then point 1 on the Preview logs of `fandomverse`.

## H9. dle_rate_hit: the address it really sees (o1-dev, before a game is switched on)

`dle_rate_hit` (019) reads `cf-connecting-ip`, else the last address of `x-forwarded-for`, from PostgREST's `request.headers`. If neither is there it does not limit at all, and if the value is the same for every player, all of them share 40 calls a minute. PGlite cannot prove this: only the real Supabase edge can. Not run yet.

**Vercel is not on this path.** The games call Postgres from the browser (019, header), straight to `<ref>.supabase.co`; `apps/quiz/next.config.ts` has no rewrite to Supabase and no game client exists yet. So the headers to check are Supabase's, and the preview only supplies the real origin and the o1-dev keys (`scripts/o1-tools/vercel-preview-env.sh`). No new build, no repository route and no Vercel change is needed. If a server render or a route ever calls `dle_day`, `dle_guess` or `dle_give_up`, Supabase sees Vercel's outgoing address and every visitor shares one count: such a call must not be added without a new check.

| Step | Who | Needs |
|---|---|---|
| 1, 6 | orchestrator | SQL on o1-dev, `scripts/o1/env.sh dev`; an exception to "only `migrate-dev.sh` writes to dev", his call |
| 2, 3, 5 | a worker | a browser signed in to Vercel (preview protection), a terminal, the o1-dev URL and anon key from the orchestrator (the anon key is public, it ships in the preview's pages) |
| 4 | a worker with a second network, else the owner on a phone | a phone hotspot, or the phone's browser |
| decision on a fail | owner, on the integrator's proposal | |

**1. Create the probes (orchestrator).** Check 019 first: `select to_regprocedure('public.dle_rate_hit(timestamptz)')`. `docs/o1/migration-log.md` records no 018 or 019 on o1-dev, and `scripts/o1/migrate-dev.sh` refuses them on dev: they are not in `docs/o1/contracts/manifest.md`. So when it prints null, either add them to the manifest and apply them, or do steps 2 to 4 with `h9_probe` alone and step 5 once 019 is there. Note the time, then:

```sql
-- H9-PROBE-BEGIN
create or replace function public.h9_probe() returns jsonb
language sql volatile security definer set search_path = public
as $$
  with h as (select nullif(current_setting('request.headers', true), '')::jsonb as j)
  select jsonb_build_object(
    'header_names', (select jsonb_agg(k order by k) from jsonb_object_keys(h.j) as k),
    'cf_connecting_ip', h.j ->> 'cf-connecting-ip',
    'x_forwarded_for', h.j ->> 'x-forwarded-for',
    'x_real_ip', h.j ->> 'x-real-ip',
    'true_client_ip', h.j ->> 'true-client-ip',
    'derived', nullif(btrim(coalesce(h.j ->> 'cf-connecting-ip', (regexp_split_to_array(h.j ->> 'x-forwarded-for', '\s*,\s*'))[
      cardinality(regexp_split_to_array(h.j ->> 'x-forwarded-for', '\s*,\s*'))])), ''))
  from h
$$;
revoke all on function public.h9_probe() from public, anon, authenticated;
grant execute on function public.h9_probe() to anon;
-- H9-PROBE-END
-- H9-HIT-BEGIN
create or replace function public.h9_hit() returns text
language plpgsql volatile security definer set search_path = public
as $$
begin
  perform public.dle_rate_hit(now());
  return 'counted';
end $$;
revoke all on function public.h9_hit() from public, anon, authenticated;
grant execute on function public.h9_hit() to anon;
-- H9-HIT-END
notify pgrst, 'reload schema';
```

`h9_probe` returns header names, and values only for the four address headers: never `authorization`, `apikey` or `cookie`. `derived` is the expression of `dle_rate_hit`, copied. Create `h9_hit` only when 019 is there.

**2. From the preview, as a game will call it (worker).** Open `https://fandomverse-git-o1-integration-p-mingis-projects.vercel.app`, then the browser console, with the URL and the anon key in `U` and `K`:

    const U = '...', K = '...';
    const call = (fn) => fetch(`${U}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: K, authorization: `Bearer ${K}`, 'content-type': 'application/json' }, body: '{}' }).then(async (r) => ({ status: r.status, body: await r.json() }));
    console.log(JSON.stringify(await call('h9_probe'), null, 1));
    console.log(await fetch('https://www.cloudflare.com/cdn-cgi/trace').then((r) => r.text()));

Note `derived`, and the `ip=` line of the second print: the worker's own address as seen from outside.

**3. A client cannot choose its address (worker, same machine, in a terminal).** With `U` and `K` exported:

    p() { curl -sS -X POST "$U/rest/v1/rpc/$1" -H "apikey: $K" -H "authorization: Bearer $K" -H 'content-type: application/json' -d '{}' "${@:2}"; echo; }
    curl -sS https://www.cloudflare.com/cdn-cgi/trace | grep '^ip='
    p h9_probe
    p h9_probe -H 'cf-connecting-ip: 203.0.113.7' -H 'x-forwarded-for: 203.0.113.8' -H 'x-real-ip: 203.0.113.9' -H 'true-client-ip: 203.0.113.10'

**4. Another network gives another address.** Repeat the call of step 2 or the first `p h9_probe` from a phone hotspot. Note `derived`.

**5. The limit counts per address (worker, needs `h9_hit`).** From the first network, in one go right after the start of a minute:

    for i in $(seq 1 45); do curl -sS -o /dev/null -w '%{http_code} ' -X POST "$U/rest/v1/rpc/h9_hit" -H "apikey: $K" -H "authorization: Bearer $K" -H 'content-type: application/json' -d '{}'; done; echo

Then, at once, one `h9_hit` from the second network. If the minute turned during the loop, wait and run it again. Orchestrator, with the time of step 1: `select count(distinct ip_hash), max(calls) from public.dle_rate where bucket >= '<time>'`.

**6. Remove everything (orchestrator).**

    drop function if exists public.h9_hit();
    drop function if exists public.h9_probe();
    delete from public.dle_rate where bucket >= '<time>';
    notify pgrst, 'reload schema';

Check: `select to_regprocedure('public.h9_probe()'), to_regprocedure('public.h9_hit()')` prints two nulls.

**Pass, all of:**
- steps 2 and 3: `derived` is the worker's `ip=` (browser against browser, terminal against terminal: one can be IPv6 and the other IPv4);
- step 3: the second call gives the same `derived`, with none of the `203.0.113.x` values in it;
- step 4: `derived` differs from the first network;
- step 5: 40 times `200`, then `400` on each further call (body `dle_rate_limited`), the second network still `200`; the query prints `2|40`.

**Fail, and what to change.** Always the one expression of `dle_rate_hit` (`docs/pending-migrations/multisite/019-dle-core.sql`, section 7) and its copy in `h9_probe`:

| Seen | Means | Change |
|---|---|---|
| no `cf-connecting-ip`, the last `x-forwarded-for` is the worker's address, and a sent value stays to its left | works as written | nothing; write down that the fallback is the one in use |
| a sent `cf-connecting-ip` comes back as `derived` | anyone can pick their count: the limit is void | stop reading that header; use the last `x-forwarded-for` if the other lines pass |
| the last `x-forwarded-for` is private or the same on both networks, the real address further left, no `cf-connecting-ip` | every player shares 40 calls a minute: the games stop for everybody under load | take the last address that is not private, or the header `header_names` shows carrying the address once it passes the spoof line |
| `derived` is null, step 5 all `200`, no row | the limit is silently off | the header `header_names` shows carrying the address, under the same spoof line |

Any of the last three blocks the switch-on. While 019 is not in production: change 019 in place, change the rate limit tests of `apps/quiz/src/lib/dle/sql.test.ts` forward with the real header shape, a new CR in `docs/o1/LEDGER.md`, apply it again on o1-dev, run H9 again. Once 019 is in production: a new file that replaces `dle_rate_hit` alone, same tests and same kind of CR.

**Not covered:** o1-dev is a Supabase branch; that production's edge behaves the same is an assumption. After the switch-on, Claude on production (read-only): `select bucket, count(distinct ip_hash), max(calls) from public.dle_rate group by 1 order by 1 desc limit 5`: several addresses per busy minute. One address with a high count on every minute is the shared-count failure above.
