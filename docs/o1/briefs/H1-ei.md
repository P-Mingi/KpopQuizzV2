# Lane H1: legal identity of the publisher and controller (owner, 2026-10-25)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-H1, branch o1/H1 (first `git merge --no-edit o1/integration`).
Q = apps/quiz/src. Read this brief, Q/copy/hub/h1.ts (privacy.controller, legal.*), Q/lib/site/hub/legal.ts, Q/app/(site)/legal/page.tsx,
Q/app/(site)/legal/legal.test.ts, Q/lib/site/hub/privacy-final.test.ts and the privacy component that prints the controller. Nothing else.
Model (already done on kpopquiz.org's branch legal/notice, beabb91): `git show beabb91 -- apps/quiz` shows the exact strings.
## Rules
No push, no production, no connector; no en or em dash, no emoji. Kpop with NEXT_PUBLIC_NET_PRIVACY off: unchanged.
## Do (OtakuQuiz and FanQuiz, and kpop behind the flag)
"Nuri" does not exist legally: remove it and the Paris address everywhere (copy, tests, comments).
- Publisher of /legal: 'Louis Pecchia, entrepreneur individuel (EI), 3560 chemin des Lauves, 13100 Aix-en-Provence, France';
  form 'Entrepreneur individuel (EI)'; siren 'SIREN 109 686 634, SIRET du siège 109 686 634 00014'; a line 'TVA non applicable,
  article 293 B du CGI'; director 'Louis Pecchia'; a new key legal.phone '[TELEPHONE]' printed with the publisher and counted as a
  placeholder (noindex, and the NET_INDEXING build fails while it is left). No RCS line. Email stays the site's contact@ (never Gmail).
- Privacy policy, section on who runs this: the controller is Louis Pecchia, entrepreneur individuel, 3560 chemin des Lauves,
  13100 Aix-en-Provence, France, SIREN 109 686 634, contact@fanquiz.org, with a link to /legal.
- Update the tests to the new strings; add one that no Q/ file outside tests says Nuri, Rémusat or 75016.
## Checks
`pnpm -C apps/quiz exec vitest run src/app/(site)/legal src/lib/site/hub src/app/sites` green; tsc 0. Regenerate
docs/o1/reports/H1/legal-final.html with the new text. One commit on o1/H1 ("o1: H1 publisher and controller Louis Pecchia (EI)";
last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 4 lines: sha, files, tests.
