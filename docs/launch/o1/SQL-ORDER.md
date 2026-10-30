# SQL order for production (run O1, Bunnyverse)

Every SQL file of run O1, in the order the owner applies it to production. Source: `docs/o1/contracts/manifest.md`
(frozen file names and order) and the header of each file. Every file below exists in the repository (`apps/quiz/e2e/o1/L1/runbook-paths.sh` proves it).
Updated on 2026-10-28 for Bunnyverse (bunnyverse.org, OtakuQuiz at `/anime`): the files and their order do not change; lane 2 updates the names and
domains inside them (the `sites` rows of L01, the Team addresses of L02 on `team.bunnyverse.org`). Applied to production so far: S4 (row 0, 2026-10-23) and
Mission U part D (row 18b, 2026-10-27, LEDGER D-127). Nothing else.
No calendar: a phase starts when the one before is clean (RUNBOOK table). A backup (RUNBOOK A2) opens every SQL session.

Folder names used below:
- `M` = `docs/pending-migrations/multisite`
- `LAUNCH` = `M/launch`, one folder for every launch file. L01, L03 and L06 are written by hand; L02, L04, L05, L07, L08 and L12 are
  generated into the same folder by `apps/quiz/e2e/o1/L1/content-sql.mjs` (section 4). The folder also holds `content-verify.sql`,
  `expected-counts.json` and `MANIFEST.json`, which that script writes.

## 1. How a file is applied

Since 2026-10-30 (owner order) the owner pastes only the session's backup line and one command per part: `bash docs/launch/o1/session.sh <part>`
(B1 B2 B3 D E1 E2 G J1 J2 J3 J4; RUNBOOK section 0 lists what each part holds). It applies the files below in this order, in the mode of the table (psql,
ON_ERROR_STOP, `--single-transaction` for "single"), runs their checks (`docs/launch/o1/checks`, VERIFY's lines as OK or KO rows), prints counts only and
stops at the first KO. The helpers below stay for rollbacks and one-off reads.

Set up once in your own terminal (the connection string is typed, never saved in a file):

    read -rs PROD_DB_URL; export PROD_DB_URL
    sql1() { psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f "$1"; }
    sqln() { psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f "$1"; }
    q()    { psql "$PROD_DB_URL" -X -At -v ON_ERROR_STOP=1 -c "$1"; }

`read -rs` waits for the Supabase direct or session pooler string (paste it, press return; nothing shows). `sql1` is mode "single", `sqln` mode "none",
`q` one read-only query. These blocks carry no `#` comments: zsh, the macOS shell, passes them as arguments unless `interactivecomments` is set.

- **single**: the file runs in one transaction (`sql1`). If anything fails, nothing is kept. Run it again after fixing the cause.
- **none**: the header says `-- o1-transaction: none` (CREATE INDEX CONCURRENTLY, VALIDATE CONSTRAINT). Use `sqln`; each statement
  commits alone. A file stopped half way is safe to run again (idempotent). Never wrap these in a transaction.
- Every file is idempotent: a second run changes nothing. A file starts with `set lock_timeout`: if it fails on a lock, run it
  again at a quieter hour; it never waits long behind a read.
- Do not use the Supabase SQL editor for a "none" file (it wraps the script in a transaction and CONCURRENTLY refuses).

## 2. The table

Phase names follow the manifest: P1 SQL part 1, P2 write locks, P3 daily window, P4 clears Verrou 0, P5 dormant files, P7 launch day.
"Verify" is the shortest read-only check; the full list, with expected results, is in `VERIFY.md` (the V-number).
"Back" is the rollback file beside the SQL file. Rollbacks run in reverse order.

| # | file | phase | mode | needs | verify (short) | back | V |
|---|---|---|---|---|---|---|---|
| 0 | `docs/pending-migrations/s4/S4-revoke-public-execute.sql` (owner decision D-099: first, before everything else; APPLIED 2026-10-23, D-103) | S4, step A0 | single | none (standalone) | 28 rows: anon f, authenticated f, service_role t (the query of its header) | `docs/pending-migrations/s4/S4-revoke-public-execute.rollback.sql` | A0 |
| 1 | `M/001-sites.sql` | P1 | single | none | `select id from public.sites` gives only `kpop` | `M/001-sites.rollback.sql` | V2 |
| 2 | `M/002a-site-columns.sql` | P1 | single | 001 | 24 columns `site_id` default `'kpop'`; 24 foreign keys not validated | `M/002a-site-columns.rollback.sql` | V2 |
| 3 | `M/002b-site-validate.sql` | P1 | none | 002a | 0 `site_id` foreign keys not validated | `M/002b-site-validate.rollback.sql` | V2 |
| 4 | `M/002c-site-indexes.sql` | P1 | none | 002b | 9 valid indexes | `M/002c-site-indexes.rollback.sql` | V2 |
| 5 | `M/002d-quiz-site-guard.sql` | P1 (DANGEROUS) | single | 002c | trigger `trg_quizzes_site_guard` enabled | `M/002d-quiz-site-guard.rollback.sql` | V2 |
| 6 | `M/003-memberships.sql` | P1 (DANGEROUS) | single | 001 | kpop memberships = profiles; `sum(xp)` unchanged | `M/003-memberships.rollback.sql` | V3 |
| 7 | `M/004-passport-prefs.sql` | P1 | single | 003 | 3 tables, 8 policies (the file's header says 7: stale) | `M/004-passport-prefs.rollback.sql` | V3 |
| 8 | `M/005-net-counters.sql` | P1 | single | 001 | RLS on, 0 policies, anon cannot select | `M/005-net-counters.rollback.sql` | V3 |
| 9 | `M/006-passport-handoff.sql` | P1 | single | 001 | schema `passport`; anon has no usage | `M/006-passport-handoff.rollback.sql` | V3 |
| 10 | `M/007-world-xp.sql` | P1 | single | 003, 004 | 6 functions; `award_world_xp` on kpop raises | `M/007-world-xp.rollback.sql` | V3 |
| 11 | `M/008-write-locks.sql` | P2 (DANGEROUS), RUNBOOK D, after the 24 hour watch of B | single | 002a, 003, 004, 007 | 11 functions, 5 triggers, same ACLs; equivalence evidence | `M/008-write-locks.rollback.sql` | V4 |
| 12 | `M/009-daily-prep.sql` | P3 | none | 002a | 2 valid unique indexes; check validated | `M/009-daily-prep.rollback.sql` | V5 |
| 13 | `M/010-daily-v2.sql` | P3 (DANGEROUS), never alone; then the 24 hour watch F | single | 009 | 2 old unique constraints gone; v2 function present | `M/010-daily-v2.rollback.sql` | V5 |
| 14 | `M/011-anime-series.sql` | P5, after F (P4) | single | 002a, 001 | 7 tables with RLS; `series` is empty | `M/011-anime-series.rollback.sql` | V6 |
| 14b | M/018-entity-images.sql (ADM back) | P5, after 14 (011); must be applied before K5 step 3c | single | 001 | table entity_images with RLS on; anon has no insert and no update, may select only the display columns; bucket entity-images public, 4 MB, image/webp | M/018-entity-images.rollback.sql (refused while a row or a file exists) | V6 |
| 14c | `M/019-dle-core.sql` (daily games step 1, owner order 2026-10-30) | P5, after 14b (018) | single | 001, 018 | 9 `dle_` tables with RLS and no policy; only `dle_guess`, `dle_give_up`, `dle_day`, `dle_pool` open to the browser roles (`dle-smoke.sql` checks 1 to 4) | `M/019-dle-core.rollback.sql` (refused once a game exists) | V6 |
| 14d | `M/020-dle-kpop-idol.sql` | P5, right after 019 | single | 019 | view `dle_src_kpop_idol` closed to the browser roles; game `kpopdle-idol` switched off, 8 columns (`dle-smoke.sql`) | `M/020-dle-kpop-idol.rollback.sql` (refused once a play exists) | V6 |
| 14e | lot K1, first file: `021a-k1-idol-gender-debut.sql` in `M` (written by the old worker; not on main yet) | P5, right after 020 | single | 020 | `idols.gender` ('female' or 'male') and `idols.debut_year` (integer) exist, with their sources (`checks/V-K1a.sql`) | its own rollback | V6 |
| 14e bis | lot K1, second file: `021b-k1-idol-activate.sql` in `M` (the idols the owner chose in K1-RELECTURE.md; not on main yet) | P5, right after 021a | single | 021a | no active idol left to review; no minor and no idol without a birth date in the game (`checks/V-K1b.sql`) | its own rollback | V6 |
| 14f | `M/022-photos-admin.sql` (daily games step 2, photos and admin) | P5, right after the lot K1 (14e) | single | 018, 019, 021b (and 001, 002a of session B) | tables `agencies` and `site_assets` with RLS on and 0 policies; views `site_assets_public` and `entity_images_public` readable by anon, the two tables and their sequences not; 17 agencies (the labels the kpop groups cite) (`checks/V-022.sql`) | `M/022-photos-admin.rollback.sql` (refused while an idol, group or agency picture, a site_assets row or an agency the owner edited exists) | V6 |
| 15 | `M/012-editorial-quiz.sql` | P5 | single | 002a, 001 | `review_batches` RLS on, 0 policies | `M/012-editorial-quiz.rollback.sql` | V6 |
| 16 | `M/013-formats.sql` | P5 | single | 011 | `games_game_type_check` validated; column `character_id` | `M/013-formats.rollback.sql` | V6 |
| 17 | `M/014-daily-openings.sql` | P5 | single | 011, 001 | table and function present; function closed to anon | `M/014-daily-openings.rollback.sql` | V6 |
| 18 | `M/015-spoilers.sql` | P5 | single | 002a, 001, 011 | `report_spoiler` executable by authenticated only | `M/015-spoilers.rollback.sql` | V6 |
| 18b | `docs/pending-migrations/account-deletion.sql` (Mission U part D, #105 on main; APPLIED 2026-10-27, D-127) | P5, before 016; skip if already run (its MODE-EMPLOI check: the `deleted_user` sentinel row and `public.admin_delete_account` exist) | single | none | sentinel `00000000-0000-0000-0000-00000000dead` and `admin_delete_account` executable by `service_role` only | `docs/pending-migrations/account-deletion-rollback.sql` | V6 |
| 19 | `M/016-passport-deletion.sql` | P5, WAITS for Mission U part D | single | 004, 006, 011 and the Mission U deletion file (`admin_delete_account`) | tables `passport.deletion_requests`, `passport.deletion_log` (RLS on); 5 functions callable by `service_role` only | `M/016-passport-deletion.rollback.sql` | V6 |
| 19b | `M/017-deletion-kpop.sql` (B7, D-112) | P5, right after 016 | single | 016, 18b | `passport_run_deletion` calls `admin_delete_account(user, keep, false)` for the kpop data after the other sites' purges; service_role only | `M/017-deletion-kpop.rollback.sql` (restores 016's function; refused while a request is pending) | V6 |
| 20 | `LAUNCH/L01-B2-sites.sql` | P7 step 1 (Verrou 0), runbook K3 | single | 001 | 3 rows in `sites` as its header lists (domains and brands of Bunnyverse, lane 2), anime and hub `building` | `LAUNCH/L01-B2-sites.rollback.sql` | V8 |
| 21 | `LAUNCH/L02-K2-team-accounts.sql` (generated) | P7 | single | L01, 003, 009; the 31 auth users first (`team-auth.mjs --team-email-domain bunnyverse.org`) | 31 `editorial_accounts` on anime; `sites.system_user_id` set | `LAUNCH/L02-K2-team-accounts.rollback.sql` | V8 |
| 22 | `LAUNCH/L03-B7-sentinel.sql` | P7 | single | L01, 003 | profiles `deleted_user_anime` and `deleted_user_hub`, ids `00000000-0000-0000-0000-00000000dea2` and `...dea3`, no membership | `LAUNCH/L03-B7-sentinel.rollback.sql` | V8 |
| 23 | `LAUNCH/L04-K1-series.sql` (generated) | P7 | single | L01, 011 | `series` count = number of series loaded | `LAUNCH/L04-K1-series.rollback.sql` | V8 |
| 24 | `LAUNCH/L05-K1-facts.sql` (generated) | P7 | single | L04 | `trivia` and `entity_sources` counts; verified facts are `published` | `LAUNCH/L05-K1-facts.rollback.sql` | V8 |
| 25 | `LAUNCH/L06-B3-badges.sql` | P7 | single | L01, 002a, 007 | 6 badge definitions with `site_id = 'anime'`, none for any other site but kpop | `LAUNCH/L06-B3-badges.rollback.sql` | V8 |
| 26 | `LAUNCH/L07-K2-catalogue.sql` (generated, only quizzes whose facts are all verified) | P7 | single | L02, L04, 002d | published quizzes count | `LAUNCH/L07-K2-catalogue.rollback.sql` | V8 |
| 27 | `LAUNCH/L08-K3-daily-bank.sql` (generated, only rows whose facts are all verified) | P7 | single | L04, 009 | `quiz_bank` rows, site anime | `LAUNCH/L08-K3-daily-bank.rollback.sql` | V8 |
| 27b | `LAUNCH/L10-PERS-personality.sql` (generated, 10 series, by apps/quiz/e2e/o1/L1/content-sql.mjs, only the sets marked published) | PERS | single | L04, 002a, 013 | personality_questions and personality_profiles rows, site anime | `LAUNCH/L10-PERS-personality.rollback.sql` | V8 |
| 31 | `LAUNCH/L12-L1-sites-live.sql` (generated) | P7 last | single | L01 to L08 | anime and hub `live` | `LAUNCH/L12-L1-sites-live.rollback.sql` | V8 |
| 32 | the file of lot A1, `L13-A1-character-facts.sql` in `LAUNCH` (written by the old worker; not on main yet) | P7, after the launch files (owner order 2026-10-30) | single | L04, 011 | content-verify unchanged; the character facts Otakudle reads | its own rollback | V8 |

Rows 28, 29 and 30 (L09 openings, L10 formats, L11 crossover quiz) are not on the launch path (owner decision D-099): see "After launch" below.
Order of the launch files on the day: L01, L02 (after its auth users), L03, L04, L05, L06, L07, L08, L10-PERS, then the builds and the domain, then L12, then the lot A1 file.
Order of session G (owner order 2026-10-30): 011, 018, 019, 020, 021a, 021b, 022, 012, 013, 014, 015, 016, 017.
Before launch day, `ls docs/pending-migrations/multisite/launch/` must show L01 to L08, L10-PERS and L12, each with its rollback,
`grep -l '^-- DRAFTS' docs/pending-migrations/multisite/launch/*.sql` must print nothing and
`grep -c 'team.otakuquiz.org' docs/pending-migrations/multisite/launch/L02-K2-team-accounts.sql` must print 0 (RUNBOOK J2).

### Files that wait for Mission U part D

- `016-passport-deletion.sql` (merged with lane B7) needs `public.admin_delete_account` and the "deleted user" sentinel of kpop from Mission U part D
  (branch `mission-u/account-deletion`: its file `account-deletion.sql` in the folder `docs/pending-migrations`, on `main` once merged, run once by the owner as its
  `account-deletion-MODE-EMPLOI.md` says). Without it 016 must not be applied: a real run of `passport_run_deletion` raises while it is missing.
- `L03-B7-sentinel.sql` does not need part D: it makes the two sentinels of the new sites (anime and hub) itself, with ids that start with
  `00000000-0000-0000-0000-` as `passport_site_sentinel` of 016 requires. The kpop sentinel stays part D's.
- The deletion cron `/api/cron/passport-deletions` stays dormant until 016 and part D are both applied.

Other Mission U parts (code only, plus their own owner SQL, not part of this order): part A (`bank-tools`, `bank-lot1`), part B (`deezer`, needed
by the openings blind test, after launch), part C (`ost-covers`, with `songs-hide-cover.sql`, needed by the crossover quiz, after launch).

### After launch (not on the launch path, owner decision D-099)

L09 openings (K4), L10 formats (K3) and L11 crossover quiz (X1) are not written and not needed to open: the sites launch without the Deezer
blind test of openings, the extra formats and the crossover facts. They come after launch, each with its own file in `LAUNCH`, in this order:
L09 (needs L04, 014, Mission U part B), L10 (needs L04, 013), L11 (needs 002a, Mission U part C; then `NEXT_PUBLIC_NET_FACTS=1`). Until they
exist nothing in the kit names them as a step; `L12` does not wait for them.

## 3. Order rules, in one list

0. S4 (row 0) goes first, before 001: it is standalone and independent of run O1.
1. 001 before 002a; 002a, 002b, 002c, 002d in that order. 003 before 004, 005 and 007. 007 before 008. 006 before 016 and before the flag `PASSPORT_JUMP`.
2. `SITE_SCOPE` on only after 002 is applied and verified (RUNBOOK step B6).
3. 008 only after the 24 hour watch of B is clean (RUNBOOK C); 009 only after the 24 hour watch of 008 (D3).
   009, the app deploy and 010 in one session, away from the 00:05 UTC cron. Never 010 alone.
4. 011 to 017 only after F (the 24 hour watch after 010, Verrou 0 cleared). They are additive, empty and dormant.
5. Anime and hub rows (L01) and all content only on launch day (Verrou 0, rule 6 of `docs/o1/briefs/COMMON.md`).
6. After launch, do not roll 003 or 004 back: that would delete anime passport data. The way back is the flags, not a DROP (ROLLBACK.md).
7. Never between 23:50 and 00:30 UTC. Every file sets `lock_timeout`; a backup (RUNBOOK A2) opens every SQL session.

Note on L01: decided by the owner (D-099): L01 runs at launch, as the first launch step (runbook K3). The manifest and rule 6 of COMMON keep
every anime and hub row out of production until launch, and nothing before launch needs it (009 and 010 act on the kpop row only).

## 4. The generated files

    node apps/quiz/e2e/o1/L1/content-sql.mjs --team-email-domain bunnyverse.org --drafts
    node apps/quiz/e2e/o1/L1/content-sql.mjs --team-email-domain bunnyverse.org

The first writes every draft fact and row (first line of each file: DRAFTS; never for production); the second only what is marked verified, over the same files.
Both write into `docs/pending-migrations/multisite/launch` (the `LAUNCH` folder; `--out <dir>` writes elsewhere, for a rehearsal). The script reads
`docs/anime/data`, never touches a database, and prints the selection and the counts. It writes L02, L04, L05, L07, L08 and L12 with their rollbacks,
`expected-counts.json` (what the load must give), `content-verify.sql` (one read-only query that returns those counts) and `MANIFEST.json` (the sha256 of
the data and of every file). The files in the folder today are generated in "verified" mode (`expected-counts.json` says `"mode": "verified"`; no file starts
with DRAFTS). A DRAFTS file must never reach production. Regenerate only when facts change (RUNBOOK J2), then commit, then rehearse again (J3).

What "verified" means: a fact whose `status` is `verified` in `docs/anime/data/facts/<slug>.json` (with `verified_at`), set by the owner's review. It is loaded
as a **published** trivia row (D-099; the dev loader `scripts/anime/k1/data-load.mjs` files every fact as a draft on purpose, this is the one difference between the
two, and L05 also promotes a draft row left by an earlier run, never the other way). A series, arc, character or opening goes in when its row says `published`.
A quiz or a daily row goes in when every question cites at least one fact and every cited fact is in. The lots of D-106 to D-119 marked the facts verified;
the selection of the current files is in `expected-counts.json` (50 series, 268 quizzes, 99 daily rows, 10 personality quizzes).

The Team accounts need their auth users before L02: `node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref <ref> --team-email-domain bunnyverse.org --apply`
with `--team-email-domain bunnyverse.org`, `SUPABASE_URL` set and `SUPABASE_SERVICE_ROLE_KEY` read with `read -rs` in your shell (RUNBOOK step K4). Without `--apply` it only prints a count.
Their addresses are `<username>@team.bunnyverse.org`, a sub-domain that receives no mail (ENV.md 1.7).

## 5. Rehearsal (2026-10-23, o1-scratch, DRAFTS files)

Repeat it (RUNBOOK J3) on the files you will apply, once lane 2's Bunnyverse changes are in them, after the reset below. What was proven on 2026-10-23 is at the end of this section.

### Reset before the replay (the dev branches hold the OLD L01 rows)

o1-scratch and o1-dev still hold what the old files wrote: the `sites` rows `anime | otakuquiz.org | OtakuQuiz` and `hub | fanquiz.org | FanQuiz`, and
the Team auth users of the old addresses `<username>@team.otakuquiz.org` (made by `team-auth.mjs` with the old default domain). L01 inserts with
`on conflict (id) do nothing` and then compares both rows with the registry, so a replay on top of the old rows stops with
`L01-B2-sites: the anime or hub row differs from the registry`; L02 looks the Team users up by their new address. Reset the branch first, in this order
(o1-scratch, the branch of the rehearsal; the commands run from the repository root and never print a key):

1. Read what the branch holds:

```
scripts/o1/env.sh scratch -- bash -c '"$0" "$O1_DB_URL" -X -At -c "select id, domain, brand, status from public.sites order by sort"' /opt/homebrew/opt/postgresql@18/bin/psql
```

   Old rows (`otakuquiz.org`, `fanquiz.org`): go on. Rows already on `bunnyverse.org/anime` and `bunnyverse.org`: skip to step 3 (the old Team users may still be there).

2. The launch rollbacks in reverse order, L01's last (it refuses while any row of another table points at anime or hub). One call, serial, logged in
   `docs/o1/migration-log.md`; it stops at the first file that refuses:

```
scripts/o1/migrate-dev.sh --branch scratch docs/pending-migrations/multisite/launch/L12-L1-sites-live.rollback.sql docs/pending-migrations/multisite/launch/L10-PERS-personality.rollback.sql docs/pending-migrations/multisite/launch/L08-K3-daily-bank.rollback.sql docs/pending-migrations/multisite/launch/L07-K2-catalogue.rollback.sql docs/pending-migrations/multisite/launch/L06-B3-badges.rollback.sql docs/pending-migrations/multisite/launch/L05-K1-facts.rollback.sql docs/pending-migrations/multisite/launch/L04-K1-series.rollback.sql docs/pending-migrations/multisite/launch/L03-B7-sentinel.rollback.sql docs/pending-migrations/multisite/launch/L02-K2-team-accounts.rollback.sql docs/pending-migrations/multisite/launch/L01-B2-sites.rollback.sql
```

   All ten `ok`: step 1 again prints only `kpop`; go to step 3.
   Only L01's rollback refused (its message names other tables: dev data of the branch points at anime or hub): leave that data alone and put the two
   rows on the new values instead, in the Supabase dashboard, the branch `o1-scratch`, SQL Editor (one statement; it touches these two rows only):

```
update public.sites set domain = case id when 'anime' then 'bunnyverse.org/anime' else 'bunnyverse.org' end, brand = case id when 'anime' then 'OtakuQuiz' else 'Bunnyverse' end where (id, domain) in (('anime', 'otakuquiz.org'), ('hub', 'fanquiz.org'));
```

   An earlier rollback refused (a played quiz, a Team account with quizzes): stop the reset, delete nothing by hand, and give the message to the integrator.

3. The old Team auth users (their profiles went with the L02 rollback of step 2), in the same SQL Editor of the branch:

```
delete from auth.users where email like '%@team.otakuquiz.org';
```

4. The Team auth users on the new domain, as K4 does in production (section 4): a dry run that prints a count, then the run that creates them (no email sent):

```
scripts/o1/env.sh scratch -- bash -c 'SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref "$O1_BRANCH_REF" --team-email-domain bunnyverse.org'
```

```
scripts/o1/env.sh scratch -- bash -c 'SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref "$O1_BRANCH_REF" --team-email-domain bunnyverse.org --apply'
```

   It prints `31 created, 0 already there, 0 failed` (a second run: `0 created, 31 already there`).

5. Then the replay of RUNBOOK J3: L01 first, then the launch files in the order of section 2, each twice.

o1-dev: `migrate-dev.sh --branch dev` skips a file its log already lists as applied and refuses a rollback out of the manifest order, so the files are
not replayed there (the rehearsal is o1-scratch's). Its two old rows are put on the new values with the update of step 2 in the SQL Editor of the
branch `o1-dev`, and steps 3 and 4 with `dev` in place of `scratch` before L02 is ever applied there.

What was proven on 2026-10-23:

L01, L03, L04, L05, L06, L07, L08 and L12 applied in order, each twice: the second run changed nothing (a fingerprint of sites, groups, series, arcs, characters,
themes, trivia, quizzes, bank rows, badges and sentinels was identical). L02 was rehearsed inside a transaction on the 31 real auth users made by
`team-auth.mjs` (31 created, then 0 created and 31 already there): 31 profiles, 31 editorial accounts, 31 anime memberships, `system_user_id` set; a second run changed
nothing; its rollback removed them; the transaction was rolled back (the scratch branch already held other Team profiles from the dev fixtures). Rollbacks refused with
their message when data existed (a played quiz, a scheduled bank row, a held badge, a quiz kept by a sentinel, quizzes on the groups, a Team account with quizzes) and ran
clean otherwise. L05 with five facts marked verified: 5 published rows (promoted from draft), a second run unchanged. `passport_site_sentinel('anime')` and `('hub')`
return the two sentinel ids; the Auth admin list still works with the sentinels present.
