# SQL order for production (run O1, lane L1)

Every SQL file of run O1, in the order the owner applies it to production. Source: `docs/o1/contracts/manifest.md`
(frozen file names and order) and the header of each file. Second pass of 2026-10-23: every file below exists in the repository
(`apps/quiz/e2e/o1/L1/runbook-paths.sh` proves it), and the owner's decisions of D-099 are applied. Nothing here has been applied to production.

Folder names used below:
- `M` = `docs/pending-migrations/multisite`
- `LAUNCH` = `M/launch`, one folder for every launch file. L01, L03 and L06 are written by hand; L02, L04, L05, L07, L08 and L12 are
  generated into the same folder by `apps/quiz/e2e/o1/L1/content-sql.mjs` (section 4). The folder also holds `content-verify.sql`,
  `expected-counts.json` and `MANIFEST.json`, which that script writes.

## 1. How a file is applied

Set up once in your own terminal (the connection string is typed, never saved in a file):

    read -rs PROD_DB_URL; export PROD_DB_URL          # paste the Supabase direct or session pooler string, press return
    sql1() { psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f "$1"; }   # mode "single"
    sqln() { psql "$PROD_DB_URL" -X -v ON_ERROR_STOP=1 -f "$1"; }                         # mode "none"
    q()    { psql "$PROD_DB_URL" -X -At -v ON_ERROR_STOP=1 -c "$1"; }                       # one read-only query

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
| 0 | `docs/pending-migrations/s4/S4-revoke-public-execute.sql` (owner decision D-099: first, before everything else) | S4, step A0 | single | none (standalone) | 28 rows: anon f, authenticated f, service_role t (the query of its header) | `docs/pending-migrations/s4/S4-revoke-public-execute.rollback.sql` | A0 |
| 1 | `M/001-sites.sql` | P1 | single | none | `select id from public.sites` gives only `kpop` | `M/001-sites.rollback.sql` | V2 |
| 2 | `M/002a-site-columns.sql` | P1 | single | 001 | 24 columns `site_id` default `'kpop'`; 24 foreign keys not validated | `M/002a-site-columns.rollback.sql` | V2 |
| 3 | `M/002b-site-validate.sql` | P1 | none | 002a | 0 `site_id` foreign keys not validated | `M/002b-site-validate.rollback.sql` | V2 |
| 4 | `M/002c-site-indexes.sql` | P1 | none | 002b | 9 valid indexes | `M/002c-site-indexes.rollback.sql` | V2 |
| 5 | `M/002d-quiz-site-guard.sql` | P1 (DANGEROUS) | single | 002c | trigger `trg_quizzes_site_guard` enabled | `M/002d-quiz-site-guard.rollback.sql` | V2 |
| 6 | `M/003-memberships.sql` | P1 (DANGEROUS) | single | 001 | kpop memberships = profiles; `sum(xp)` unchanged | `M/003-memberships.rollback.sql` | V3 |
| 7 | `M/004-passport-prefs.sql` | P1 | single | 003 | 3 tables, 7 policies | `M/004-passport-prefs.rollback.sql` | V3 |
| 8 | `M/005-net-counters.sql` | P1 | single | 001 | RLS on, 0 policies, anon cannot select | `M/005-net-counters.rollback.sql` | V3 |
| 9 | `M/006-passport-handoff.sql` | P1 | single | 001 | schema `passport`; anon has no usage | `M/006-passport-handoff.rollback.sql` | V3 |
| 10 | `M/007-world-xp.sql` | P1 | single | 003, 004 | 6 functions; `award_world_xp` on kpop raises | `M/007-world-xp.rollback.sql` | V3 |
| 11 | `M/008-write-locks.sql` | P2 (DANGEROUS), by T-14 | single | 002a, 003, 004, 007 | 11 functions, 5 triggers, same ACLs; equivalence evidence | `M/008-write-locks.rollback.sql` | V4 |
| 12 | `M/009-daily-prep.sql` | P3 | none | 002a | 2 valid unique indexes; check validated | `M/009-daily-prep.rollback.sql` | V5 |
| 13 | `M/010-daily-v2.sql` | P3 (DANGEROUS), never alone | single | 009 | 2 old unique constraints gone; v2 function present | `M/010-daily-v2.rollback.sql` | V5 |
| 14 | `M/011-anime-series.sql` | P5, after P4 | single | 002a, 001 | 7 tables with RLS; `series` is empty | `M/011-anime-series.rollback.sql` | V6 |
| 15 | `M/012-editorial-quiz.sql` | P5 | single | 002a, 001 | `review_batches` RLS on, 0 policies | `M/012-editorial-quiz.rollback.sql` | V6 |
| 16 | `M/013-formats.sql` | P5 | single | 011 | `games_game_type_check` validated; column `character_id` | `M/013-formats.rollback.sql` | V6 |
| 17 | `M/014-daily-openings.sql` | P5 | single | 011, 001 | table and function present; function closed to anon | `M/014-daily-openings.rollback.sql` | V6 |
| 18 | `M/015-spoilers.sql` | P5 | single | 002a, 001, 011 | `report_spoiler` executable by authenticated only | `M/015-spoilers.rollback.sql` | V6 |
| 18b | `docs/pending-migrations/account-deletion.sql` (Mission U part D, #105 on main) | P5, before 016; skip if the owner already ran it (its MODE-EMPLOI check: the `deleted_user` sentinel row and `public.admin_delete_account` exist) | single | none | sentinel `00000000-0000-0000-0000-00000000dead` and `admin_delete_account` executable by `service_role` only | `docs/pending-migrations/account-deletion-rollback.sql` | V6 |
| 19 | `M/016-passport-deletion.sql` | P5, WAITS for Mission U part D | single | 004, 006, 011 and the Mission U deletion file (`admin_delete_account`) | tables `passport.deletion_requests`, `passport.deletion_log` (RLS on); 5 functions callable by `service_role` only | `M/016-passport-deletion.rollback.sql` | V6 |
| 19b | `M/017-deletion-kpop.sql` (B7, D-112) | P5, right after 016 | single | 016, 18b | `passport_run_deletion` calls `admin_delete_account(user, keep, false)` for the kpop data after the other sites' purges; service_role only | `M/017-deletion-kpop.rollback.sql` (restores 016's function; refused while a request is pending) | V6 |
| 20 | `LAUNCH/L01-B2-sites.sql` | P7 step 1 (Verrou 0), runbook K3 | single | 001 | 3 rows in `sites`, anime and hub `building` | `LAUNCH/L01-B2-sites.rollback.sql` | V8 |
| 21 | `LAUNCH/L02-K2-team-accounts.sql` (generated) | P7 | single | L01, 003, 009; the 31 auth users first (`team-auth.mjs`) | 31 `editorial_accounts` on anime; `sites.system_user_id` set | `LAUNCH/L02-K2-team-accounts.rollback.sql` | V8 |
| 22 | `LAUNCH/L03-B7-sentinel.sql` | P7 | single | L01, 003 | profiles `deleted_user_anime` and `deleted_user_hub`, ids `00000000-0000-0000-0000-00000000dea2` and `...dea3`, no membership | `LAUNCH/L03-B7-sentinel.rollback.sql` | V8 |
| 23 | `LAUNCH/L04-K1-series.sql` (generated) | P7 | single | L01, 011 | `series` count = number of series loaded | `LAUNCH/L04-K1-series.rollback.sql` | V8 |
| 24 | `LAUNCH/L05-K1-facts.sql` (generated) | P7 | single | L04 | `trivia` and `entity_sources` counts; verified facts are `published` | `LAUNCH/L05-K1-facts.rollback.sql` | V8 |
| 25 | `LAUNCH/L06-B3-badges.sql` | P7 | single | L01, 002a, 007 | 6 badge definitions with `site_id = 'anime'`, none for any other site but kpop | `LAUNCH/L06-B3-badges.rollback.sql` | V8 |
| 26 | `LAUNCH/L07-K2-catalogue.sql` (generated, only quizzes whose facts are all verified) | P7 | single | L02, L04, 002d | published quizzes count | `LAUNCH/L07-K2-catalogue.rollback.sql` | V8 |
| 27 | `LAUNCH/L08-K3-daily-bank.sql` (generated, only rows whose facts are all verified) | P7 | single | L04, 009 | `quiz_bank` rows, site anime | `LAUNCH/L08-K3-daily-bank.rollback.sql` | V8 |
| 31 | `LAUNCH/L12-L1-sites-live.sql` (generated) | P7 last | single | L01 to L08 | anime and hub `live` | `LAUNCH/L12-L1-sites-live.rollback.sql` | V8 |

Rows 28, 29 and 30 (L09 openings, L10 formats, L11 crossover quiz) are not on the launch path (owner decision D-099): see "After launch" below.
Order of the launch files on the day: L01, L02 (after its auth users), L03, L04, L05, L06, L07, L08, then the domains, then L12.
Before launch day, `ls docs/pending-migrations/multisite/launch/` must show L01 to L08 and L12, each with its rollback, and
`grep -l '^-- DRAFTS' docs/pending-migrations/multisite/launch/*.sql` must print nothing (RUNBOOK J2).

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
3. 009, the app deploy and 010 in one session, away from the 00:05 UTC cron. Never 010 alone.
4. 011 to 016 only after P4 (Verrou 0 cleared). They are additive, empty and dormant.
5. Anime and hub rows (L01) and all content only on launch day (Verrou 0, rule 6 of `docs/o1/briefs/COMMON.md`).
6. After launch, do not roll 003 or 004 back: that would delete anime passport data. The way back is the flags, not a DROP (ROLLBACK.md).

Note on L01: decided by the owner (D-099): L01 runs at launch, as the first launch step (runbook K3). The manifest and rule 6 of COMMON keep
every anime and hub row out of production until launch, and nothing before launch needs it (009 and 010 act on the kpop row only).

## 4. The generated files

    node apps/quiz/e2e/o1/L1/content-sql.mjs --drafts       # every draft fact and row (today's state of the repository; first line of each file: DRAFTS)
    node apps/quiz/e2e/o1/L1/content-sql.mjs                # only what you marked verified; overwrites the same files

Both write into `docs/pending-migrations/multisite/launch` (the `LAUNCH` folder; `--out <dir>` writes elsewhere, for a rehearsal). The script reads
`docs/anime/data`, never touches a database, and prints the selection and the counts. It writes L02, L04, L05, L07, L08 and L12 with their rollbacks,
`expected-counts.json` (what the load must give), `content-verify.sql` (one read-only query that returns those counts) and `MANIFEST.json` (the sha256 of
the data and of every file). The files committed on 2026-10-23 are the DRAFTS ones: they let the dev branches and the scratch rehearsal run, and they must
never reach production. After your review (RUNBOOK J1 and J2) you regenerate without `--drafts`, commit, and the first line of every file is no longer DRAFTS.

What "verified" means: a fact whose `status` is `verified` in `docs/anime/data/facts/<slug>.json` (with `verified_at`), set by the owner's review. It is loaded
as a **published** trivia row (D-099; the dev loader `scripts/anime/k1/data-load.mjs` files every fact as a draft on purpose, this is the one difference between the
two, and L05 also promotes a draft row left by an earlier run, never the other way). A series, arc, character or opening goes in when its row says `published`.
A quiz or a daily row goes in when every question cites at least one fact and every cited fact is in. All 1,174 non-rejected facts are `draft` today, so a run without
`--drafts` writes L02, L04, L05 (empty of facts), L12 and no L07 or L08. Review first, then generate.

The Team accounts need their auth users before L02: `node apps/quiz/e2e/o1/L1/team-auth.mjs --project-ref <ref> --apply`
with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in your shell (RUNBOOK step K4). Without `--apply` it only prints a count. Their addresses are
`<username>@team.otakuquiz.org`, a domain that receives no mail (ENV.md).

## 5. Rehearsal (2026-10-23, o1-scratch, DRAFTS files)

L01, L03, L04, L05, L06, L07, L08 and L12 applied in order, each twice: the second run changed nothing (a fingerprint of sites, groups, series, arcs, characters,
themes, trivia, quizzes, bank rows, badges and sentinels was identical). L02 was rehearsed inside a transaction on the 31 real auth users made by
`team-auth.mjs` (31 created, then 0 created and 31 already there): 31 profiles, 31 editorial accounts, 31 anime memberships, `system_user_id` set; a second run changed
nothing; its rollback removed them; the transaction was rolled back (the scratch branch already held other Team profiles from the dev fixtures). Rollbacks refused with
their message when data existed (a played quiz, a scheduled bank row, a held badge, a quiz kept by a sentinel, quizzes on the groups, a Team account with quizzes) and ran
clean otherwise. L05 with five facts marked verified: 5 published rows (promoted from draft), a second run unchanged. `passport_site_sentinel('anime')` and `('hub')`
return the two sentinel ids; the Auth admin list still works with the sentinels present.
