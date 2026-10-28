# FandomVerse launch: your manual actions, in order (owner, 2026-10-28)

**Total: about 22 h 50 of hands-on work in 68 steps: 18 h 25 up to the end of launch day (steps 1 to 59), 4 h 25 after it (steps 60 to 68).**
**Elapsed: at least 4 days from step 10 to launch day (three 24 hour watches: after B, after 008, after 010). Earliest: B on day 1, launch day on day 5.**

How to use this page: do the steps in order; each block is one command, copy it whole. `read -rs` shows nothing while you paste: press return.
Times are UTC. Never run SQL between 23:50 and 00:30. Details, checks and the way back of each step: the RUNBOOK link. Steps 1 to 6 and 40 to 42 run in parallel with the others.

## Part 1. Now, while the lanes finish (50 min, no database change)

### 1. Buy the domain (10 min). [RUNBOOK H6](RUNBOOK.md#h-domain-vercel-supabase-and-google)
Buy `fandomverse.org` at any registrar. Bought in Vercel (Domains): skip step 2.

### 2. DNS records (10 min, then up to a few hours). [RUNBOOK H6](RUNBOOK.md#h-domain-vercel-supabase-and-google)
At the registrar, TTL 300. No MX record for `team`. If Vercel shows other values at step 55, use Vercel's.

| type | name | value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Check (expect `76.76.21.21`, then `cname.vercel-dns.com.`, then nothing):
```
dig +short fandomverse.org A
```
```
dig +short www.fandomverse.org CNAME
```
```
dig +short team.fandomverse.org MX
```

### 3. Microfrontends group (10 min). [RUNBOOK H7](RUNBOOK.md#h-domain-vercel-supabase-and-google)
Command checked by the integrator on 2026-10-28 against the options of Vercel CLI 59.4.0 (`vercel microfrontends create-group --help`).
```
mkdir -p ~/kpq-launch/mf
```
```
cd ~/kpq-launch/mf
```
```
vercel link --yes --project fandomverse
```
```
vercel microfrontends create-group --name=fandomverse --project=fandomverse --project=otakuquiz --default-app=fandomverse --project-default-route=otakuquiz=/anime --yes
```
```
cd -
```
Or in the dashboard: Vercel, Team Settings, Microfrontends: group `fandomverse`, `fandomverse` default application, `otakuquiz` default route `/anime`.

### 4. Service role key as a team shared variable (10 min). [RUNBOOK H3](RUNBOOK.md#h-domain-vercel-supabase-and-google)
Supabase, Project Settings, API Keys: copy the `service_role` key. Vercel, Team Settings, Environment Variables, Shared, Add: Sensitive, Production only, projects `kpopquiz`, `fandomverse`, `otakuquiz` (refused for `kpopquiz`: keep its own). Key:
```
SUPABASE_SERVICE_ROLE_KEY
```

### 5. Supabase redirect URLs (5 min). [RUNBOOK H4](RUNBOOK.md#h-domain-vercel-supabase-and-google)
Supabase, Authentication, URL Configuration, Redirect URLs, Add URL, once per line below. Site URL stays `https://kpopquiz.org`. Remove `https://otakuquiz.org/**` and `https://fanquiz.org/**` if listed. Exactly these two, with no `*` and no `?`: only the two sign-in callbacks may receive a session (AUTH-FANDOMVERSE.md).
```
https://fandomverse.org/auth/callback
```
```
https://fandomverse.org/anime/auth/callback
```

### 6. Google and Discord (0 min: nothing to do). [RUNBOOK H5](RUNBOOK.md#h-domain-vercel-supabase-and-google)
fandomverse.org signs in with Supabase's Google redirect and the kpopquiz.org Google client, like kpopquiz.org (AUTH-FANDOMVERSE.md): no JavaScript origin, no new redirect URI, no new client. Discord keeps its Supabase callback. Nothing to change in Google Cloud or in the Discord developer portal.

## Part 2. Merge and first deploys (1 h 55, when the integrator says the lanes are merged)

### 7. Merge the PR `o1/integration` to `main` (90 min, then 1 h of logs). [RUNBOOK A5](RUNBOOK.md#a-before)
Read `docs/launch/o1/A5-REVIEW.md`, ARCHITECTURE-FANDOMVERSE.md and AUTH-FANDOMVERSE.md; merge on GitHub when green. Vercel `kpopquiz`: the deploy is Ready, Runtime Logs quiet for an hour. Then, in your repository folder:
```
git checkout main
```
```
git pull --ff-only
```

### 8. Cron list (5 min). [RUNBOOK A6](RUNBOOK.md#a-before)
Both lines printed, and the count equals Vercel, `kpopquiz`, Settings, Cron Jobs.
```
grep -E 'passport-(deletions|cleanup)' apps/quiz/vercel.json
```
```
grep -c '"path"' apps/quiz/vercel.json
```

### 9. First deploys of the new projects (20 min). [RUNBOOK H8](RUNBOOK.md#h-domain-vercel-supabase-and-google)
Vercel, `fandomverse`, Deployments, Redeploy the latest `main`; same on `otakuquiz`. Open the `fandomverse` `.vercel.app` address, then the same followed by `/anime`. Check: [VERIFY V9](VERIFY.md).

## Part 3. SQL session B: 001 to 007 (2 h 20, after step 7)

### 10. Dashboard backup (5 min). [RUNBOOK A2](RUNBOOK.md#a-before)
Supabase, Database, Backups: a backup of the last 24 hours exists (take one if your plan allows).

### 11. Dump and baseline in one run (15 min). [RUNBOOK A1 to A3](RUNBOOK.md#a-before)
It asks the database password, prints PASS lines and the dump file name. No IPv6 on your network: the script's header gives the pooler variant.
```
bash docs/launch/o1/A1-A3.sh
```

### 12. Terminal set-up, once per terminal (5 min). [RUNBOOK 0](RUNBOOK.md#0-how-to-read-a-step)
`read -rs` waits for the connection string (Supabase, Connect, direct or session pooler). `psql --version` must print 18.
```
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
```
```
psql --version
```
```
read -rs PROD_DB_URL
```
```
export PROD_DB_URL
```
```
M=docs/pending-migrations/multisite
```
```
sql1() { psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f "$1"; }
```
```
sqln() { psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f "$1"; }
```
```
q() { psql "$PROD_DB_URL" -X -At -v ON_ERROR_STOP=1 -c "$1"; }
```
```
snap() { mkdir -p "$1"; grep -v '^#' apps/quiz/e2e/o1/parity/urls.txt | grep . | while read -r p; do curl -sS -m 30 "https://kpopquiz.org$p" -o "$1/$(printf '%s' "$p" | tr '/?&=' '____').html"; done; }
```

### 13. Production commit (5 min). [RUNBOOK B1](RUNBOOK.md#b-p1-001-to-007)
The commit printed is the one Vercel shows for the current `kpopquiz` production deployment.
```
git log -1 --format='%h %s' origin/main
```

### 14. 001 (5 min). [RUNBOOK B2](RUNBOOK.md#b-p1-001-to-007)
```
sql1 $M/001-sites.sql
```

### 15. 002a (10 min). [RUNBOOK B3](RUNBOOK.md#b-p1-001-to-007)
```
sql1 $M/002a-site-columns.sql
```

### 16. 002b, then 002c (20 min). [RUNBOOK B4](RUNBOOK.md#b-p1-001-to-007)
```
sqln $M/002b-site-validate.sql
```
```
sqln $M/002c-site-indexes.sql
```

### 17. 002d, DANGEROUS (15 min). [RUNBOOK B5](RUNBOOK.md#b-p1-001-to-007)
Right after it: create a throwaway quiz on kpopquiz.org while signed in, check it saves, delete it.
```
sql1 $M/002d-quiz-site-guard.sql
```

### 18. `SITE_SCOPE=1` on kpopquiz (15 min, then 1 h of logs). [RUNBOOK B6](RUNBOOK.md#b-p1-001-to-007)
Vercel, `kpopquiz`, Settings, Environment Variables, Add, Production: key `SITE_SCOPE`, value `1`. Redeploy production without the build cache. Then:
```
snap ~/kpq-launch/after-b6
```
```
diff -rq ~/kpq-launch/before ~/kpq-launch/after-b6
```

### 19. 003, DANGEROUS (15 min). [RUNBOOK B7](RUNBOOK.md#b-p1-001-to-007)
Right after it: sign up a throwaway account on kpopquiz.org in a private window and finish onboarding.
```
sql1 $M/003-memberships.sql
```

### 20. 004 and 005 (5 min). [RUNBOOK B8](RUNBOOK.md#b-p1-001-to-007)
```
sql1 $M/004-passport-prefs.sql
```
```
sql1 $M/005-net-counters.sql
```

### 21. 006 (10 min). [RUNBOOK B9](RUNBOOK.md#b-p1-001-to-007)
First: Supabase, Project Settings, API, Exposed schemas: `passport` is NOT listed.
```
sql1 $M/006-passport-handoff.sql
```

### 22. 007 (5 min). [RUNBOOK B10](RUNBOOK.md#b-p1-001-to-007)
```
sql1 $M/007-world-xp.sql
```

### 23. Close session B (10 min). [RUNBOOK B11](RUNBOOK.md#b-p1-001-to-007)
Note the time: the 24 hour watch starts.
```
snap ~/kpq-launch/after-b
```
```
diff -rq ~/kpq-launch/before ~/kpq-launch/after-b
```

## Part 4. Watch, then SQL session D: 008 (1 h 55)

### 24. The 24 hour watch, at step 23 plus 24 hours (15 min). [RUNBOOK C](RUNBOOK.md#c-24-hour-watch-after-b)
VERIFY V3 "24 hour watch" lines, `kpopquiz` Runtime Logs, Search Console for kpopquiz.org, then:
```
snap ~/kpq-launch/after-c
```
```
diff -rq ~/kpq-launch/before ~/kpq-launch/after-c
```

### 25. Backup (15 min). [RUNBOOK A2](RUNBOOK.md#a-before)
Terminal set-up of step 12 if this is a new terminal. Dashboard backup (step 10), then:
```
F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```
```
pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F"
```
```
pg_restore --list "$F" | wc -l
```

### 26. Gate before 008 (20 min). [RUNBOOK D1](RUNBOOK.md#d-p2-008-write-locks)
The second command must print `functions read: 11 | body different from the rollback file: none`. A name listed: stop.
```
q "select '@@@' || p.proname || E'\n' || p.prosrc || E'\n;;;;\n' from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('award_xp','record_play','handle_new_quiz','increment_like_count','decrement_like_count','notify_badge_earned','notify_group_quiz_alerts','cast_duel_vote','passport_on_battle_result','record_bt_play','merge_anon_passport') order by p.proname, p.oid" > ~/kpq-launch/prod-functions.txt
```
```
python3 - <<'EOF'
import os
n = lambda s: ' '.join(s.split())
back = n(open('docs/pending-migrations/multisite/008-write-locks.rollback.sql').read())
blocks = [b for b in open(os.path.expanduser('~/kpq-launch/prod-functions.txt')).read().split(';;;;') if b.strip()]
blocks = [b.strip() for b in blocks]
bad = [b.split('\n')[0][3:] for b in blocks if n(b.split('\n', 1)[1]) not in back]
print('functions read:', len(blocks), '| body different from the rollback file:', bad if bad else 'none')
EOF
```

### 27. 008, DANGEROUS (50 min). [RUNBOOK D2](RUNBOOK.md#d-p2-008-write-locks)
Quietest hour. Then `V-S4 ok` must print; then VERIFY V4 "After 008" and the live proof with a throwaway account (play, like, unlike, create).
```
sql1 $M/008-write-locks.sql
```
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/launch/o1/V-S4-closed.sql
```

### 28. The 24 hour watch, at step 27 plus 24 hours (15 min). [RUNBOOK D3](RUNBOOK.md#d-p2-008-write-locks)
VERIFY V4 live proof again; Runtime Logs quiet; counters audit of V0 at or under baseline.

## Part 5. SQL session E: 009, deploy, 010 (1 h 05; start between 18:00 and 22:20)

### 29. Backup (15 min). [RUNBOOK A2](RUNBOOK.md#a-before)
Terminal set-up of step 12 if this is a new terminal. Dashboard backup, then:
```
F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```
```
pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F"
```
```
pg_restore --list "$F" | wc -l
```

### 30. The old keys are still there (5 min). [RUNBOOK E1](RUNBOOK.md#e-p3-009-the-app-deploy-010)
Expect `2`.
```
q "select count(*) from pg_constraint where conname in ('quiz_bank_scheduled_date_key','qotd_log_featured_date_key')"
```

### 31. 009 (15 min). [RUNBOOK E2](RUNBOOK.md#e-p3-009-the-app-deploy-010)
Then VERIFY V5 "After 009".
```
sqln $M/009-daily-prep.sql
```

### 32. The app deploy (15 min). [RUNBOOK E3](RUNBOOK.md#e-p3-009-the-app-deploy-010)
Vercel `kpopquiz`: production runs the latest `main`; else Redeploy without cache. The command prints a redirect to a `/q/` page.
```
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://kpopquiz.org/daily
```

### 33. 010, DANGEROUS (15 min). [RUNBOOK E4](RUNBOOK.md#e-p3-009-the-app-deploy-010)
Not after 23:45 (then stop and do it the next day). Then VERIFY V5 "After 010". Note the time.
```
sql1 $M/010-daily-v2.sql
```

## Part 6. Watch after 010, then SQL session G: 011 to 017 (2 h 05)

### 34. The next morning, after 00:05 (10 min). [RUNBOOK E5](RUNBOOK.md#e-p3-009-the-app-deploy-010)
Today's date with `kpop`; `/daily` redirects to today's quiz; Vercel `kpopquiz`, Cron Jobs: `ensure-daily-quiz` succeeded.
```
q "select featured_date, site_id from public.qotd_log order by featured_date desc limit 3"
```
```
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://kpopquiz.org/daily
```

### 35. V7, at step 33 plus 24 hours (20 min). [RUNBOOK F](RUNBOOK.md#f-24-hour-watch-after-010)
VERIFY V7: the six conditions true. This clears Verrou 0.

### 36. Backup (15 min). [RUNBOOK A2](RUNBOOK.md#a-before)
Terminal set-up of step 12 if this is a new terminal. Dashboard backup, then:
```
F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```
```
pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F"
```
```
pg_restore --list "$F" | wc -l
```

### 37. 011, 018, 012, 013, 014, 015 (40 min). [RUNBOOK G1](RUNBOOK.md#g-p5-011-to-017)
In this order, each followed by its VERIFY V6 lines. 013 stops with a `game_type` name: send it to the integrator.
```
sql1 $M/011-anime-series.sql
```
```
sql1 $M/018-entity-images.sql
```
```
sql1 $M/012-editorial-quiz.sql
```
```
sql1 $M/013-formats.sql
```
```
sql1 $M/014-daily-openings.sql
```
```
sql1 $M/015-spoilers.sql
```

### 38. 016 and 017 (20 min). [RUNBOOK G2](RUNBOOK.md#g-p5-011-to-017)
The first command must print a name, not an empty line; empty: skip 016 and 017.
```
q "select to_regprocedure('public.admin_delete_account(uuid,boolean,boolean)')"
```
```
sql1 $M/016-passport-deletion.sql
```
```
sql1 $M/017-deletion-kpop.sql
```

### 39. Close session G (20 min). [RUNBOOK G3](RUNBOOK.md#g-p5-011-to-017)
`V-S4 ok` must print; then the kpop snapshot; then one hour of Runtime Logs.
```
psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/launch/o1/V-S4-closed.sql
```
```
snap ~/kpq-launch/after-g
```
```
diff -rq ~/kpq-launch/before ~/kpq-launch/after-g
```

## Part 7. Content and go / no-go (1 h 45, in parallel with Parts 3 to 6)

### 40. Content checks (10 min). [RUNBOOK J1, J2](RUNBOOK.md#j-content)
Expect: 0 failures; `none`; nothing; `0`.
```
node scripts/anime/editorial/check.mjs docs/anime/data
```
```
python3 - <<'EOF'
import json, hashlib
d = 'docs/pending-migrations/multisite/launch/'
m = json.load(open(d + 'MANIFEST.json'))
bad = [f['name'] for f in m['files'] if hashlib.sha256(open(d + f['name'], 'rb').read()).hexdigest() != f['sha256']]
print('files:', len(m['files']), '| sha256 different from MANIFEST.json:', bad if bad else 'none')
EOF
```
```
grep -l '^-- DRAFTS' docs/pending-migrations/multisite/launch/*.sql
```
```
grep -c 'team.otakuquiz.org' docs/pending-migrations/multisite/launch/L02-K2-team-accounts.sql
```

### 41. Sampling review and rehearsal result (65 min). [RUNBOOK J1, J3](RUNBOOK.md#j-content)
Read a sample of `docs/anime/editorial/packets/` (60 min). The integrator rehearses the launch files on `o1-scratch` (J3); read his result: the second run of each file changed nothing (5 min).

### 42. Go / no-go, the evening before launch day (30 min). [RUNBOOK K1](RUNBOOK.md#k-launch-day)
Every line of K1 true, or the day moves.

## Part 8. Launch day (J): start after 00:30, finish before 22:00 (6 h 30)

### 43. Backup (15 min). [RUNBOOK K2](RUNBOOK.md#k-launch-day)
Terminal set-up of step 12 if this is a new terminal. Dashboard backup, then:
```
F=~/kpq-launch/pre-o1-$(date -u +%F-%H%M).dump
```
```
pg_dump "$PROD_DB_URL" -Fc --no-owner --schema=public --schema=auth -f "$F"
```
```
pg_restore --list "$F" | wc -l
```

### 44. Baseline of the day (20 min). [RUNBOOK K2](RUNBOOK.md#k-launch-day)
```
{ date -u; for s in "select count(*) from public.profiles" "select coalesce(sum(xp),0) from public.profiles" "select count(*), coalesce(sum(play_count),0) from public.quizzes" "select count(*) from public.plays" "select count(*) from public.groups" "select count(*) from public.quiz_bank" "select count(*) from public.qotd_log" "select count(*) from public.badge_definitions" "select count(*) from public.quizzes q where q.play_count <> (select count(*) from public.plays p where p.quiz_id = q.id)"; do echo "$s"; q "$s"; done; } | tee ~/kpq-launch/v0-launch.txt
```
```
snap ~/kpq-launch/before
```

### 45. L01 (10 min). [RUNBOOK K3](RUNBOOK.md#k-launch-day)
```
sql1 $M/launch/L01-B2-sites.sql
```

### 46. The 31 Team auth users (15 min). [RUNBOOK K4](RUNBOOK.md#k-launch-day)
`read -rs` waits for the service role key. The first `node` prints a count (dry run); the second creates the users, no email sent.
```
read -rs SUPABASE_SERVICE_ROLE_KEY
```
```
export SUPABASE_SERVICE_ROLE_KEY
```
```
export SUPABASE_URL=https://rdkgouofytwfdpbxbzio.supabase.co
```
```
node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref rdkgouofytwfdpbxbzio --team-email-domain fandomverse.org
```
```
node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref rdkgouofytwfdpbxbzio --team-email-domain fandomverse.org --apply
```
```
unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
```

### 47. L02 (10 min). [RUNBOOK K4](RUNBOOK.md#k-launch-day)
```
sql1 $M/launch/L02-K2-team-accounts.sql
```

### 48. L03 (5 min). [RUNBOOK K5](RUNBOOK.md#k-launch-day)
```
sql1 $M/launch/L03-B7-sentinel.sql
```

### 49. L04, L05, leak check (20 min). [RUNBOOK K5](RUNBOOK.md#k-launch-day)
Every line of the last command prints `0`.
```
sql1 $M/launch/L04-K1-series.sql
```
```
sql1 $M/launch/L05-K1-facts.sql
```
```
for p in / /quizzes /new /trending /trivia /most-liked /sitemap.xml /llms.txt; do printf '%s ' "$p"; curl -sS "https://kpopquiz.org$p" | grep -ciE 'death note|one piece|spy x family|otakuquiz'; done
```

### 50. L06, L07, L08, counts (20 min). [RUNBOOK K5](RUNBOOK.md#k-launch-day)
The counts of the last two commands match (VERIFY V8).
```
sql1 $M/launch/L06-B3-badges.sql
```
```
sql1 $M/launch/L07-K2-catalogue.sql
```
```
sql1 $M/launch/L08-K3-daily-bank.sql
```
```
psql "$PROD_DB_URL" -X -At -F ' | ' -f $M/launch/content-verify.sql
```
```
cat $M/launch/expected-counts.json
```

### 51. L10-PERS (10 min). [RUNBOOK K5.3b](RUNBOOK.md#k-launch-day)
The second command prints `70`.
```
sql1 $M/launch/L10-PERS-personality.sql
```
```
q "select count(*) from public.personality_profiles where site_id = 'anime'"
```

### 52. Admin images, only if you uploaded some on o1-dev (15 min). [RUNBOOK K5.3c](RUNBOOK.md#k-launch-day)
`read -rs` waits for the service role key. The first `promote.mjs` is a dry run; the second writes.
```
read -rs PROMOTE_TARGET_SERVICE_KEY
```
```
export PROMOTE_TARGET_SERVICE_KEY
```
```
export PROMOTE_TARGET_URL=https://rdkgouofytwfdpbxbzio.supabase.co
```
```
scripts/o1/env.sh dev -- node scripts/anime/images/promote.mjs
```
```
scripts/o1/env.sh dev -- node scripts/anime/images/promote.mjs --apply
```
```
unset PROMOTE_TARGET_SERVICE_KEY PROMOTE_TARGET_URL
```

### 53. Fourteen bank rows verified (10 min). [RUNBOOK K5](RUNBOOK.md#k-launch-day)
It prints 14 titles.
```
q "update public.quiz_bank set status='verified', verified_at=now() where id in (select id from public.quiz_bank where site_id='anime' and status='draft' and scheduled_date is null order by md5(title) limit 14) returning title"
```

### 54. Builds on (15 min). [RUNBOOK K5b](RUNBOOK.md#k-launch-day)
Vercel, `otakuquiz` then `fandomverse`, Settings, Git, Ignored Build Step: remove `exit 0` if present. Then Deployments, Redeploy the latest `main` on each. `kpopquiz` untouched.

### 55. Attach the domain (60 min with the certificate). [RUNBOOK K6](RUNBOOK.md#k-launch-day)
Vercel, `fandomverse`, Settings, Domains: add the first name, then the second set to redirect to the first. Nothing on `otakuquiz`. Then sign in with Google, then Discord, on fandomverse.org; open `/anime`: still signed in. Check: [VERIFY V10](VERIFY.md).
```
fandomverse.org
```
```
www.fandomverse.org
```

### 56. `PASSPORT_JUMP=1` (25 min). [RUNBOOK K7](RUNBOOK.md#k-launch-day)
Vercel, Production, in `kpopquiz`, `fandomverse` and `otakuquiz`: key `PASSPORT_JUMP`, value `1`; redeploy the three together. Then, signed in on kpopquiz.org, open the address below: you land on `/anime` signed in.
```
https://kpopquiz.org/auth/passport/out?to=anime
```

### 57. L12, the sites go live (10 min). [RUNBOOK K8](RUNBOOK.md#k-launch-day)
```
sql1 $M/launch/L12-L1-sites-live.sql
```

### 58. The daily quiz and the go (90 min). [RUNBOOK K9](RUNBOOK.md#k-launch-day)
Signed in as admin on `https://fandomverse.org/anime`, paste in the browser console (replace the date with today's); it answers `scheduled: 14`.
```
fetch('/anime/api/admin/quiz-bank/auto-schedule', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({start_date: 'YYYY-MM-DD'})}).then(r => r.json()).then(console.log)
```
Then Vercel, `otakuquiz`, Settings, Cron Jobs, `ensure-daily-quiz`, Run. The command below prints a redirect to an `/anime/q/` page. Then VERIFY V10 in full, V1 for kpop, a real play on `/anime`, 30 minutes of clean Runtime Logs, and announce.
```
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://fandomverse.org/anime/daily
```

### 59. Open indexing, the very last step (40 min). [RUNBOOK K10](RUNBOOK.md#k-launch-day)
The first command must print the controller, not a placeholder. Then Vercel, Production, in `fandomverse` and `otakuquiz` (never `kpopquiz`): first `NET_LAUNCH_DATE` = today `YYYY-MM-DD`, then `NET_INDEXING` = `1`; redeploy both.
Search Console: add the Domain property `fandomverse.org` (its TXT record at the registrar), submit the two sitemaps below. The last command prints `200` (IndexNow key file).
```
grep "'privacy.controller'" apps/quiz/src/copy/hub/h1.ts
```
```
https://fandomverse.org/sitemap.xml
```
```
https://fandomverse.org/anime/sitemap.xml
```
```
curl -sS -o /dev/null -w '%{http_code}\n' https://fandomverse.org/339dab142e51883ae3a2c7e4737254e4.txt
```
```
curl -sS -o /dev/null -w '%{http_code}\n' https://fandomverse.org/anime/760f9a9459d4db0bd8a08f13a0f1ec6e.txt
```

## Part 9. After launch (4 h 25)

### 60. Hour 0 to +1 (60 min). [RUNBOOK L1](RUNBOOK.md#l-after-launch)
VERIFY V10 and V11 items 1 to 4; sign-ups on `/anime`, Google and Discord sign-in errors.

### 61. +24 hours, after the 00:05 cron (30 min). [RUNBOOK L2](RUNBOOK.md#l-after-launch)
One `kpop` and one `anime` row for today.
```
q "select featured_date, site_id from public.qotd_log order by featured_date desc, site_id limit 4"
```

### 62. Footer flag (20 min). [RUNBOOK L3](RUNBOOK.md#l-after-launch)
Vercel, Production, the three projects: key `NEXT_PUBLIC_NET_FOOTER`, value `1`; redeploy the three; V1 and V10; one hour of clean logs before step 63.

### 63. Menu flag (20 min). [RUNBOOK L3](RUNBOOK.md#l-after-launch)
Same with `NEXT_PUBLIC_NET_MENU` = `1`; one hour of clean logs before step 64.

### 64. Beacon flag (20 min). [RUNBOOK L3](RUNBOOK.md#l-after-launch)
Same with `NEXT_PUBLIC_NET_BEACON` = `1`.

### 65. kpopquiz privacy and deletion (20 min). [RUNBOOK L3b](RUNBOOK.md#l-after-launch)
Vercel `kpopquiz` only, Production: `NEXT_PUBLIC_NET_PRIVACY` = `1`; and `NEXT_PUBLIC_NET_DELETION` = `1` once 016 and 017 are applied and `passport-deletions` has run on `fandomverse`. Redeploy `kpopquiz`; V1.

### 66. +48 and +72 hours (30 min). [RUNBOOK L4](RUNBOOK.md#l-after-launch)
VERIFY V11 each time.

### 67. Decide at +72 hours (20 min). [RUNBOOK L5](RUNBOOK.md#l-after-launch)
V11 clean: raise the TTL of fandomverse.org back, keep the launch-day dump 60 days, write the date.

### 68. Hub tables, after step 64 (45 min, plus a small code PR first). [RUNBOOK L6](RUNBOOK.md#l-after-launch)
Backup (as step 43), then the two files, then the PR of the two cron routes (RUNBOOK L6 point 3).
```
sql1 docs/pending-migrations/hub/001-quiz-daily-plays.sql
```
```
sql1 docs/pending-migrations/hub/002-xp-daily-snapshots.sql
```

## Values settled by the integrator (2026-10-28)

No placeholder is left. Confirmed by the lanes (ARCHITECTURE-FANDOMVERSE.md, AUTH-FANDOMVERSE.md): the OtakuQuiz API answers under
`/anime/api/...` (step 58), its sitemap is `https://fandomverse.org/anime/sitemap.xml` and the root `https://fandomverse.org/sitemap.xml`
is the index of both (step 59), its admin is `/anime/admin`. The cron paths of `vercel.json` carry no `/anime`: on the `otakuquiz`
project they are proxied to `https://fandomverse.org/anime/api/cron/...`, so the Vercel "Run" button of step 58 works only once
`fandomverse.org` is attached (step 55); check the `otakuquiz` cron logs after it.
