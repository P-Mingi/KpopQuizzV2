# Lane H1: privacy policy, owner's second pass, and the legal notice of the 3 sites (owner, 2026-10-24)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-H1, branch o1/H1 (merge o1/integration first:
`git merge --no-edit o1/integration`). Second worktree for part 3 only: /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-legal,
branch legal/notice made from origin/main (today's kpopquiz.org). Q = apps/quiz/src. Read this brief, docs/o1/briefs/H1-privacy.md
(its rules apply), docs/o1/reports/H1/privacy-final.html and the code you change. Nothing else.
## 1. Privacy policy (o1/H1): only these changes, everything else validated
- privacy.controller: "Nuri, 6 rue Rémusat, 75016 Paris, France".
- Deletion (point 12): describe the owner's path. Delete your passport from any site's settings, or on KpopQuiz from Settings,
  "Delete account" (the exact label of Q/components/profile/ux-v1/settings.tsx): type your @username, fresh sign-in, signed out
  everywhere, an email, 7 days to cancel by signing in, then everything is deleted; published quizzes kept under "deleted user"
  unless you ask to remove them too. Lane B7 builds the KpopQuiz part now (do not edit settings.tsx or deletion code). The test
  pins the words to the code: grace days and keep default of Q/lib/passport/deletion/policy.ts, and the label read from settings.tsx.
- Sign-in notice on KpopQuiz (point 17), at launch: behind a new public flag NEXT_PUBLIC_NET_PRIVACY (lane H1, registry O1_FLAGS;
  owner exception: you may add its row to docs/o1/contracts/flags-env.md). Off: kpop renders the same HTML and Flight as today, the
  same client modules (apps/quiz/e2e/o1/P1/kpop-chunks.sh) and chunk count (apps/quiz/e2e/o1/O2/kpop-chunk-count.sh); chunk bytes
  may change. On: the kpop sign-in sheet and login page show the same notice as the other sites, link https://fanquiz.org/privacy.
- Footer of the 3 sites: a "Legal notice" link to /legal beside Privacy (kpop: behind the same flag, except what part 3 ships now).
## 2. Legal notice page /legal on OtakuQuiz and FanQuiz (o1/H1)
One page, English, title "Legal notice", sub-title "Mentions légales". Content (French law, LCEN article 6):
- Publisher: Nuri, 6 rue Rémusat, 75016 Paris, France; legal form "[FORME JURIDIQUE]"; SIREN "[SIREN]"; email contact@fanquiz.org.
- Publication director: "[DIRECTEUR DE LA PUBLICATION]".
- Host: Vercel Inc. with the postal address and phone number printed on vercel.com's own legal pages (read them; cite the URL in
  the hand-back; if no phone is printed, write none and say so).
- Personal data: link to https://fanquiz.org/privacy. Site name and domain from the registry. Indexable like privacy (NET_INDEXING).
- Keys legal.* in one copy file; placeholders in one place each; a test fails while a placeholder is printed on a build with
  NET_INDEXING on, so launch cannot go out with them. Rule 18: kpop route Q/app/(site)/legal/page.tsx is the source, the anime and
  hub twins re-export it (twins row: list it in the hand-back for ORCH).
## 3. kpopquiz.org now (branch legal/notice from origin/main, the owner merges the PR)
The same Legal notice page for kpopquiz.org (publisher Nuri, same host, same placeholders, contact@kpopquiz.org, privacy link to
kpopquiz.org/privacy) and a footer link. Same text as part 2 with the kpop values; tsc 0, the kpop build green, unit tests of what
you touch. Commit there ("legal: legal notice page (mentions légales)"); do not push.
## Checks (o1/H1)
tsc 0; `pnpm -C apps/quiz exec vitest run src/app/sites src/components/hub src/lib/site src/app/(site)/legal` green; S/check.sh ok;
builds green: hub, anime and kpop (flag off and on) with `scripts/o1/env.sh offline -- env NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1
NEXT_PUBLIC_SITE_ID=<site> pnpm -C apps/quiz build`; the two kpop chunk scripts against the base.
Update docs/o1/reports/H1/privacy-final.html into docs/o1/reports/H1/legal-final.html: the policy text and the legal notice text.
Commit on o1/H1 ("o1: H1 privacy second pass, legal notice"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: shas (o1/H1, legal/notice), checks, Vercel address and source URL, twins row, kpop chunk proofs.
