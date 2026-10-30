# Verification (run O1, Bunnyverse)

Read-only commands and queries, phase by phase, each with the result to expect. Nothing here writes to a database or changes a
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
    q "select count(*) from pg_policy where polrelid in ('public.passport_prefs'::regclass,'public.favourites'::regclass,'public.world_follows'::regclass)"   # 7
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

016: the tables `passport.deletion_requests` and `passport.deletion_log` exist with RLS on and no policy (`select relname, relrowsecurity from pg_class where relnamespace = 'passport'::regnamespace and relname like 'deletion%' and relkind = 'r' order by 1` gives `deletion_log|t`, `deletion_requests|t`); the five functions
`passport_request_deletion`, `passport_cancel_deletion`, `passport_run_deletion`, `passport_leave_world`, `passport_due_deletions` are executable by `service_role` only
(`has_function_privilege('anon', ..., 'execute')` and the same for `authenticated` are `f`); `select count(*) from passport.deletion_requests` is 0.

017 (row 19b), the query of its header:

    q "select proname, has_function_privilege('anon', oid, 'execute'), has_function_privilege('authenticated', oid, 'execute'), has_function_privilege('service_role', oid, 'execute') from pg_proc where proname in ('passport_run_deletion', 'passport_deletion_status') order by 1"   # f|f|t for both

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
