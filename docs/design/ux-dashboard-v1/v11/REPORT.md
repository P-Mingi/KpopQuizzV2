# UX v11.2 run report (C3, Phase 3)

## Progress

- Status: PAUSED, waiting for ORCH. The branch push is refused by the session permission check (first
  attempt at 516eb39, classified "Git Destructive"); per CHECKERS.md C3 stops and tells ORCH. Every commit
  is local on `ux11/c3-check` in this worktree (`.claude/worktrees/agent-a0c9933401ee9710b`).
- Build under test: the shared flag-on production build of `feat/ux-v1-v11` at dcc3159 (P8 included) on
  http://localhost:3021. Flag-off build of the same head in the C3 worktree (`apps/quiz/.next`), served on
  :4203 when needed (stopped now).
- Done: SEO diff flag on vs flag off vs live on 34 URLs + robots.txt + sitemap (`checks/qa/seo/seo-diff.json`,
  script `checks/qa/seo-diff.mjs`); QA specs written and debugged (`apps/quiz/e2e/ux-v1/qa-a11y.spec.ts`: axe
  on the whole document for every state, guest + signed in, both themes, both widths;
  `qa-keyboard.spec.ts`: Tab walk of every v11 page, sheets and popovers, game live regions); perf probe
  (`checks/qa/perf.mjs`) debugged on one hub; e2e summariser (`checks/qa/e2e-summary.mjs`).
- Interrupted: the full e2e run (all `e2e/ux-v1/*.spec.ts` except parity, ux-1440 + ux-390) reached 517 of
  551 when the app stopped; no JSON report was written, so it must be re-run in full.
- Next (once the push question is settled): re-run the full e2e; run qa-a11y + qa-keyboard in full; perf
  on /, a quiz, a hub, /blindtest (390, 4x CPU, local + slow 4G); file issues; write the per-page report
  with C1's and C2's verdicts.
- Pending by design: `/quizzes` (P2 waits for the owner).

## Findings so far (not final)

- robots.txt identical flag on vs off; sitemap 2998 URLs on both, 0 only-on, 0 only-off; no new page
  (/community, its posts, /blindtest/ranked) in the sitemap. /community and its posts: 200 noindex with the
  flag on, 301 to / with the flag off (live: 301).
- SEO fields (title, description, robots, canonical, hreflang, og, H1) identical flag on vs off on every
  URL checked except the new pages (expected).
- Link set: the first pass (build-time snapshot) lost links on /, /pt, /leaderboard, /most-liked,
  /data/pulse and /groups showed "0 groups". Root cause: the dcc3159 build prerendered those ISR pages while
  the machine was saturated; their reads failed soft (safeFetch) and the empty sections were cached until
  the revalidate window. Re-fetched at 18:26 after regeneration: / has every hub link (19) and the quiz of
  the day again, /most-liked has its 10 quizzes, /pt has the daily block, /leaderboard 97 links (0 lost).
  /groups ("0 groups" intro) and /data/pulse (empty hasPart, 2 month links missing) were still the cached
  build copies at 18:26 (window ends near 18:51): to re-check. Not a v11 regression by itself, but the
  same fail-soft-then-cache pattern P2 reported for popular.ts; it goes in the owner notes.
- Hubs (/blackpink-quiz, /ateez-quiz): 4 quiz links each are in the flag-off server HTML as visible cards
  but only inside `<noscript>` with the flag on (the hub shows 6 cards, the rest after "Show all"). To be
  confirmed and filed to P3 (crawlable collapse law).
- /create (noindex): the cover helper sentence of the flag-off HTML is not in the flag-on server HTML. To be
  confirmed and filed to P5 (low).
- a11y (debug runs, 1440 light): whole-document axe clean on /groups, /chungha-quiz, /leaderboard, search
  overlay, sign-in sheet; /pt/leaderboard has serious color-contrast (legacy content, same on the flag-off
  build: existing, not v11). Sheets checked so far pass role, name, aria-modal, focus in, Tab trap, X /
  Escape / backdrop, focus return (search, sign-in, share). Quiz game: named timer ("15 seconds left"),
  question H1 focused, live region announces the answer and "Quiz finished. N out of 8."
- e2e (partial run, 517/551 before the stop): failures seen were p1 home tests at 1440 (sections missing:
  the same build-time cache effect above, to re-run) and p4 "like" (count 43 expected 44: the like count
  read back from the server overwrote the optimistic +1 because the write is stubbed; to re-check).
