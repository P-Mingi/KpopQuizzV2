# Lane H1: the final network privacy policy (owner decisions 2026-10-24)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-H1, branch o1/H1 (up to date with o1/integration). Q = apps/quiz/src.
Read this brief, docs/o1/reports/H1/privacy-draft.md (its OWNER lines are the questions answered below), Q/copy/hub/h1.ts,
Q/components/hub/hub-privacy.tsx, Q/app/sites/[site]/privacy/page.tsx, Q/lib/site/indexing.ts, Q/lib/passport/deletion/account.ts,
docs/o1/contracts/cookies.md, and the code you change. Nothing else.
## Rules
- No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets. No en or em dash, no emoji.
- Never edit docs/o1/contracts/**, scripts/o1/**, Q/middleware.ts, next.config.ts, vercel.json. Tests: only the two named in 3.
- Rule 18 and the kpop render tree as in docs/o1/briefs/LD.md; kpopquiz.org stays byte for byte (prove with
  apps/quiz/e2e/o1/P1/kpop-chunks.sh and apps/quiz/e2e/o1/O2/kpop-chunk-count.sh if you touch anything the kpop build loads).
- The page text is English, plain fan-made voice, short lines. One text, in the privacy.* keys; no second copy anywhere.
## The owner's answers (numbers are the OWNER points of the draft, in order)
1. Date: the launch date. Read it from a new server env NET_LAUNCH_DATE (YYYY-MM-DD, add it to Q/lib/site/registry.ts beside
   NET_INDEXING, lane L1). While INDEXING_OPEN is false on the build: draft banner, noindex, not in the sitemap. Once open: no banner,
   indexable, in the hub sitemap, date printed from NET_LAUNCH_DATE (missing date while open: the build fails with a clear message).
2. Controller: print exactly "[NOM OU SOCIÉTÉ, PAYS, ADRESSE POSTALE]" from one key privacy.controller; the owner fills it before launch.
3. Name the 3 sites everywhere: KpopQuiz (kpopquiz.org), OtakuQuiz (otakuquiz.org), FanQuiz (fanquiz.org), names and origins from the
   registry NETWORK. Owner exception: you may change Q/app/sites/[site]/anime-copy.site.test.ts and the voice test of
   network-page.test.ts so the hub privacy keys may name the three sites; nothing else in them is loosened.
4. Sign-in: KpopQuiz Google, Discord, email link; OtakuQuiz and FanQuiz Google, email link (from the registry, not literals).
5. Shared block line: "The sites you joined, only if you choose to show them" (home and privacy read the same key).
6. Publish the jump values as they are: ticket 10 minutes, code 60 seconds, 90 day log, hashed IP (from the code constants).
7. KpopQuiz: bio, banner and favourite groups belong to the account profile; the other sites do not show them. Say so.
8. Add: Vercel Web Analytics, cookieless audience measurement, anonymous events, no personal data. No advertising.
9, 10. Cookies as written; a test fails if a cookie of cookies.md is missing from the page or the page names one cookies.md lacks.
11. Resend confirmed. Add: data hosted in the EU (Supabase in Ireland, Vercel servers in Dublin); US providers covered by the
    European Commission standard contractual clauses.
12. Deletion: 7 day grace, published quizzes kept under "deleted user" unless you ask to remove them. A test pins these words to the
    code: the grace days and the keepQuizzes default of Q/lib/passport/deletion. Also compare with the KpopQuiz settings delete text
    (Q/components/profile/ux-v1/settings.tsx) and with part D (read only: `git show mission-u/account-deletion:<path>`); do not edit
    them; report each mismatch in the hand-back with file:line.
13. Add how to delete a KpopQuiz-only account: KpopQuiz Settings, "Delete my account".
14. Rights: access, rectification, erasure, restriction, objection, portability, and the right to complain to the CNIL; answer
    within one month.
15. Minimum age 15 on the 3 sites.
16. Contact: contact@fanquiz.org.
17. Short notice on the sign-in screen of the 3 sites with a link to https://fanquiz.org/privacy, no OK click. Anime and hub: in the
    shared sign-in sheet through an optional prop (rule 18). Kpop: only if the kpop build stays byte for byte while the network is
    closed (a flag read at build, proven by the two chunk scripts); if not provable, leave kpop untouched and say so.
18. Retention: play history as long as the account exists; data export on request by email to contact@fanquiz.org; French law;
    "We tell you about important changes with a banner and by email."
- OtakuQuiz /privacy shows the same network policy (HubPrivacy), canonical https://fanquiz.org/privacy. Kpop /privacy unchanged.
## Checks
- Unit tests for each point above where code decides it (1, 3, 4, 5, 9, 12, 17); `pnpm -C apps/quiz exec tsc --noEmit` 0 errors;
  `pnpm -C apps/quiz exec vitest run src/app/sites src/components/hub src/lib/site` green; `scripts/o1/check.sh $PWD` ok.
- Builds green: hub and anime with `scripts/o1/env.sh offline -- env NEXT_PUBLIC_SITE_ID=<site> pnpm -C apps/quiz build`.
- One file for the owner: docs/o1/reports/H1/privacy-final.html, the full page text as rendered (closed and open states of point 1).
Commit on o1/H1 ("o1: H1 final privacy policy"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: sha, files (count), checks, point 12 mismatches, point 17 kpop outcome, what ORCH must add to C/**.
