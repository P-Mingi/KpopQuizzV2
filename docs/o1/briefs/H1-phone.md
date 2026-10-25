# Lane H1: the publisher's phone is given (owner, 2026-10-25)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-H1, branch o1/H1 (already at o1/integration). Q = apps/quiz/src.
Read this brief, Q/copy/hub/h1.ts, Q/lib/site/hub/legal.ts, Q/app/(site)/legal/page.tsx, Q/app/(site)/legal/legal.test.ts. Model:
`git show c9bf6ab -- apps/quiz` (the same change on kpopquiz.org's branch legal/notice). No push, no en or em dash, no emoji.
## Do
- Q/copy/hub/h1.ts: 'legal.phone' becomes '+33 7 81 55 70 19'. No placeholder is left in the real copy.
- The launch gate stays (LEGAL_PLACEHOLDER_KEYS, legalPlaceholders, legalLaunchGate unchanged in behaviour).
- legal.test.ts: the tests that need a placeholder printed (noindex while one is left, the open build fails and names the key,
  each placeholder printed once) now mock 'legal.phone' as '[TELEPHONE]' through the render helper (an option `placeholder: true`,
  replacing the `filled` mock which the real copy no longer needs); the tests on the real copy say: no placeholder, kpop with the
  flag is indexable, anime and hub open are indexable and the build does not fail, the page prints the phone with the publisher.
  Never weaken an assertion: every behaviour tested before is still tested, on mocked or real copy.
## Checks
`pnpm -C apps/quiz exec vitest run src/app/(site)/legal src/lib/site/hub src/app/sites` green; tsc 0. Update the phone line of
docs/o1/reports/H1/legal-final.html. One commit ("o1: H1 the publisher's phone"; last line
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 3 lines: sha, tests.
