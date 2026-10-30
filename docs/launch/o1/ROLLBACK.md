# Rollback (run O1, Bunnyverse)

For each phase of `RUNBOOK.md`: how to return to the state before it, and the point after which that is no longer possible because
data has been written. Sites (2026-10-28): kpopquiz.org (project `kpopquiz`), the Bunnyverse hub at `https://bunnyverse.org` (project `fandomverse`)
and OtakuQuiz at `https://bunnyverse.org/anime` (project `otakuquiz`, no domain, reached through the Microfrontends group `fandomverse`).
Every SQL file has its rollback beside it (`SQL-ORDER.md`); every launch file (L01 to L08, L10-PERS, L12) has its
rollback in `docs/pending-migrations/multisite/launch/` (`M` = `docs/pending-migrations/multisite`, as in `SQL-ORDER.md`). A rollback refuses, and changes nothing, when undoing would delete data written since (the message names what).
Rollbacks run in reverse order of the apply order. Same shell helpers as `SQL-ORDER.md` section 1 (`sql1`, `sqln`, `q`).

Rules that hold everywhere:
- Stop first, then roll back. A half applied "single" file is not half applied: it was undone by the database. A half applied "none"
  file (002b, 002c, 009) leaves some statements done; run the file again to finish, or its rollback to undo.
- Re-check with the matching V section of `VERIFY.md` after every rollback.
- A code rollback (Vercel "Instant Rollback" to the previous production deployment) is always one click and never touches data.
  But the code and the database must stay compatible, see the table in section 2.
- `SITE_SCOPE` is turned off only while no anime or hub row exists in any table (before launch). After L04 it stays on, always:
  off, it would show anime quizzes on kpopquiz.org.

## 1. Phase by phase

| phase | the way back | possible until |
|---|---|---|
| A0. S4 (applied 2026-10-23) | `sql1 docs/pending-migrations/s4/S4-revoke-public-execute.rollback.sql` (gives back the grants of 2026-10-17). Use it only if a server path fails with `permission denied for function`; it reopens 28 functions to anyone holding the public key | always |
| A. Backup, baseline | nothing to undo | always |
| A. Mission U parts on main | revert the merge of the part on `main`; its own `*-rollback.sql` (for part D, `account-deletion-rollback.sql`; for part C, `songs-hide-cover-rollback.sql`) | until a deletion was done with the function (accounts deleted cannot come back; restore from the backup) |
| A. PR `o1/integration` to `main` | Vercel, `kpopquiz` project, Deployments, previous production deployment, "Instant Rollback". Then `git revert -m 1 <merge sha>` on `main` through a PR so the next push does not redeploy it | always for code; see section 2 for the database pairing |
| B. P1: 001, 002a to d | `sql1 M/002d-quiz-site-guard.rollback.sql`, then `sqln M/002c...rollback.sql`, `sqln M/002b...rollback.sql`, `sql1 M/002a...rollback.sql`, `sql1 M/001-sites.rollback.sql` (each in that order). Turn `SITE_SCOPE` off and redeploy first | until any non-kpop row exists (002a refuses then), that is before launch day, so always before launch |
| B. P1: 003 to 007 | `sql1 M/007...rollback.sql`, 006, 005, 004, 003 in that order. 008 must be rolled back before 007 and 003 | 003 and 004 refuse when a non-kpop membership, favourite or follow exists (after launch). 006 refuses while a code or event row exists. Before launch there are none |
| C. The 24 hour watch | nothing to undo; if a regression shows, roll back the last file applied, then the one before, no further than the cause | n/a |
| D. P2: 008 | `sql1 M/008-write-locks.rollback.sql` (the 11 functions go back to the production definitions verbatim). Then V4 compares the signatures with `functions-before.txt` | before launch: always. After launch do NOT roll back 008: the old functions do not know the anime branches, so an anime play would write kpop columns. Use section 3 instead |
| E. P3: 009, deploy, 010 | in this order: `sql1 M/010-daily-v2.rollback.sql` (today's function and the two single-date unique constraints come back; refused while a non-kpop bank or log row exists), then `sqln M/009-daily-prep.rollback.sql` (refused while a non-kpop sites row carries the columns). The PR app keeps working after the 010 rollback (009's unique indexes stay until 009's own rollback). Roll 009 back only if you also go back to the pre-PR app (section 2) | before launch: always. After L02 or L08 (anime rows in `quiz_bank`, `qotd_log`, `sites.system_user_id`) these refuse, by design |
| F. The 24 hour watch after 010 (P4) | nothing to undo | n/a |
| G. P5: 011 to 017 | `sql1` the rollbacks in reverse: 017, 016, 015, 014, 013, 012, 018, 011 | each refuses while rows of its tables exist (series data, spoiler reports, daily openings, review batches, deletion requests, entity images and their files); empty before launch |
| H. Domain, DNS, Microfrontends group, Vercel variables, Supabase redirect URLs | remove `bunnyverse.org` and `www.bunnyverse.org` from the `fandomverse` project (the hub and `/anime` go offline together), delete the DNS records, delete the Microfrontends group (the projects stay), unlink the shared `SUPABASE_SERVICE_ROLE_KEY`, and in Supabase, Authentication, URL Configuration, Redirect URLs remove the two exact entries `https://bunnyverse.org/auth/callback` and `https://bunnyverse.org/anime/auth/callback` (RUNBOOK H4 added only these two, no wildcard). Google Cloud: nothing to undo, no JavaScript origin, no redirect URI and no client were added (AUTH-BUNNYVERSE.md). The domain purchase itself is not undone | always |
| I. Emails (postponed) | Supabase dashboard, Authentication, Hooks, Send Email: switch the hook off. Auth sends its built-in mail again within seconds. Keep the function deployed but unused | always (a mail already sent cannot be recalled) |
| J. Generated files | `git checkout` the folder `docs/pending-migrations/multisite/launch` (or revert the PR); nothing was applied | always |
| K. Launch day | section 3 | see below |
| L. Flags and the first 72 hours | section 3, flag by flag | always for flags; data stays |

## 2. Which code with which database

| database state | the app that is safe on it |
|---|---|
| before 001 | any |
| 001 to 007 applied | the pre-PR app (it ignores the new tables and columns) or the PR app |
| 008 applied | both; the kpop branch of every function is the old body |
| 009 applied, 010 not | both. The pre-PR app uses `ON CONFLICT (featured_date)` which still exists |
| 010 applied | only the PR app (it upserts on `(site_id, featured_date)`). The pre-PR app breaks the daily quiz log and the admin "set quiz of the day". To go back to the pre-PR app after 010: roll back 010 first (the single-date keys come back). The PR app also works after the 010 rollback |
| 011 to 016 applied | both (empty and dormant) |
| launch SQL applied | only the PR app |

Until 009 is applied the PR app's admin "set quiz of the day" and "auto select" write their `qotd_log` row with no matching unique index. The
quiz of the day itself is set; the log write fails without a visible error. Do not use those two admin actions between the PR merge and P3.

## 3. After launch day: undo in layers, keeping the data

Nothing below deletes a reader's data. Use the first layer that is enough, in this order. Each layer is a redeploy of the named
project (public flags are baked at build), then the V10 loop.

1. **A bad network link or menu on kpopquiz.org.** Remove `NEXT_PUBLIC_NET_FOOTER`, `NEXT_PUBLIC_NET_MENU`, `NEXT_PUBLIC_NET_BEACON`, `NEXT_PUBLIC_NET_FACTS` from the
   `kpopquiz` project (empty or `0`) and redeploy it. kpopquiz.org is byte-identical to before the flags again (V1).
2. **A problem with the shared sign-in.** Set `PASSPORT_JUMP` to `0` on the three projects and redeploy them. The links become plain links; `/auth/authorize`,
   `/auth/land` and `/api/passport/redeem` answer 404. Accounts and stamps stay.
3. **A problem on one new site only.** OtakuQuiz (`/anime`): Instant Rollback on `otakuquiz`, or pause the `otakuquiz` project (`/anime` then answers an error page; the hub stays).
   The hub: Instant Rollback on `fandomverse`. Both at once: remove `bunnyverse.org` from the `fandomverse` project, or pause it (the hub and `/anime` go offline together, they share the domain).
   kpopquiz.org and the database are not touched. To mark it: `sql1 M/launch/L12-L1-sites-live.rollback.sql` puts `sites.status` back to `building`.
4. **Content that must come down.** For one quiz: unpublish it in the admin (status, not DELETE). For the whole catalogue: `update public.quizzes set status = 'draft' where site_id = 'anime'`
   (a reversible hide; save the count first). Do not run the L07 or L04 rollbacks once a quiz has been played: they refuse, on purpose.
5. **Emails.** Switch the Send Email hook off (I above).
5b. **Search engines.** Remove `NET_INDEXING` from `fandomverse` and `otakuquiz` and redeploy both (RUNBOOK K10): the `noindex, nofollow` header and meta come back at once.
6. **A wrong build.** Instant Rollback on the project concerned. The database state is compatible (section 2).

What is no longer possible once readers act:
- L01 (the anime and hub rows) cannot be rolled back after the first anime or hub sign-up (memberships point at them), after L02, or after any content.
- L03 (the sentinels) cannot be rolled back once a quiz was handed to one (a member left a site and kept the quiz) or a play points at one. L06 (the badges) cannot be rolled back once a member holds an anime badge.
- L07 cannot be rolled back after a quiz has been played; L08 after a row is scheduled or published; L04 once a quiz, a bank row or trivia uses the groups.
- 003 and 004 cannot be rolled back after the first anime membership, favourite or follow: that would delete passport data. The way back is layers 2 and 3.
- 008 cannot be rolled back after the first anime play (above).
- 010 cannot be rolled back once an anime bank or log row exists.
- A deleted account (016 and Mission U part D) cannot be restored except from the backup.

Last resort: restore the backup taken in step A2 at the start of the session (Supabase dashboard, Database, Backups, or `pg_restore` of the dump into a new project and
repoint the three projects). That loses everything written since the backup, on all three sites, so it is for corruption only.
