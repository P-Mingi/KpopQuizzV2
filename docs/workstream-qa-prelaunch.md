# QA-PRELAUNCH - the full-platform sweep before THE PUSH

## Claude Code Implementation Prompt

---

The last gate before the ~88-commit stack ships. Both worlds (Play + Verse),
every surface, prove-then-fix. Read first: VERSE-MASTER-VISION.md,
LOOP-CHARTER.md, workstream-wnav.md, workstream-wcustom.md. This workstream
FIXES only mechanical failures (broken link, missing allowlist entry, contrast
bug, typo). Anything requiring judgment (design, policy, data, copy tone)
gets REPORTED, not fixed. When in doubt: report.

Hard rules: NO em dashes. No new deps, no migrations, no schema changes. NO
push. Commit fixes in small labeled commits (qa: ...). Real data only; if a
number looks wrong, verify against a hand-run query, never adjust data to
match display.

## Sweep 1 - routes + auth (the allowlist graveyard)

- Enumerate EVERY route (check:routes list). For each: fetch logged-out AND
  logged-in. Expected: public pages 200, gated pages redirect/404 correctly,
  NO public page 301s to home (the needsAuth() bug that bit us 5x).
- /verse/[slug]/studio: 404 logged-out, works for curator role only.
- Dev login: prove /api/dev/login is 404 in a production build (re-run the
  existing proof).
- 404 + error pages render branded in BOTH worlds, all breakpoints.

## Sweep 2 - SEO (protect what ranks)

- Head-tag regression: byte-diff title/meta/H1/JSON-LD on the top pages
  (games home, /bts-quiz and 3 other group hubs, /quizzes, /blindtest,
  /verse, /verse/bts) against production (fetch live prod as baseline).
  Expected: identical or a listed, justified diff for owner review.
- Sitemap: every URL in it returns 200; no draft/unpublished entity leaks;
  Verse entity URLs present incl. hidden-tab pages.
- JSON-LD validates (schema.org types parse) on one page per template.
- robots.txt, llms.txt, canonicals correct; no accidental noindex.
- W-CUSTOM SEO parity re-run on both showcase spaces (the one law, re-proven
  on the final code).

## Sweep 3 - Verse integrity

- Living-persons: re-run the grep + form proofs (no excluded content path).
- Publish gate: draft/unsourced entities unreachable publicly (direct URL
  probe on known drafts).
- Min-gate audit: crawl all Verse pages of the 3 launch spaces + showcases;
  ZERO empty sections / ghost modules rendered.
- Quest board: on the launch spaces, computed gaps include "add the first
  photocards" (Collections is empty by design; it must read as an invitation
  once curators exist). If the quest engine does not emit it, REPORT (do not
  build new quest logic).
- Editor journey smoke: open page, edit section, @-mention, source chip,
  save, revision, diff, undo. Once, on one space.
- Curator journey smoke: studio open, change preset, publish, rollback.

## Sweep 4 - Play regression (do not break the money)

- Full player journey: home, pick quiz, play to result, ResultLoop links
  (incl. the Verse cross-link), share. One quiz, one blindtest, one game.
- Community: feed loads, comment posts (then delete test data), debate vote
  records, rankings render with the threshold-30 provisional display.
- Creation flow: create a quiz as a normal user (title mandatory, group
  picker, share step), then delete it.
- The Play/Verse toggle: 6 sample URLs resolve to the correct world; cookie
  set on deliberate click only; deep landings never redirected.

## Sweep 5 - visual + a11y + perf

- Screenshot matrix: key templates x 3 breakpoints x light/dark x both
  worlds. Flag anything broken; fix only mechanical CSS bugs.
- Mobile: More-sheet (keyboard, focus trap, Escape), bottom bars per world,
  no horizontal-scroll nav anywhere.
- A11y pass on new surfaces (studio, More-sheet, collectibles checklist,
  poll): keyboard-complete, aria sane, focus visible.
- Perf: build output symbols unchanged vs the recorded baseline (static
  stays static); LCP/CLS spot-check on games home, one group hub, one
  showcase space; stickers/banners sized (no CLS).

## Sweep 6 - platform hygiene

- Em-dash grep over apps/quiz/src AND all docs touched this cycle: zero.
- Migrations: local files 001-139 contiguous; prod schema matches (list
  applied migrations, diff against files).
- Cron endpoints smoke: verse-refresh, monthly pulse, spotify-snapshot
  (quiet-skip), each returns its expected no-op/ok without side effects.
- External hosts audit: grep the codebase for fetch targets; list EVERY
  external host called at runtime; flag anything not on the known list.
- Console errors: zero on the key templates (browser console during the
  screenshot matrix).
- Test data: every account/row created during QA deleted; list what was
  created and confirm cleanup.

## Sweep 7 - fresh eyes (report only, fix nothing)

Walk the 3 launch spaces + both showcase spaces as a first-time fan from
Google: land on an entity page, not the home. Write 5 honest bullets per
space: what confused, what delighted, what looked empty or broken, whether
you would join. No fixes; this is owner input for launch-copy decisions.

## Permitted loops (per LOOP-CHARTER)

- QA SWEEP class: run checks, fix MECHANICAL failures, re-run · MAX 6 per
  sweep · STOP IF fix requires judgment/design/policy/schema · REPORT
  iterations used per sweep.

## Verify (the exit bar)

- [ ] All 7 sweeps run; every checklist item pass or listed as a reported
      exception with severity (blocker / launch-ok / post-launch)
- [ ] Zero blockers open, or each blocker reported with a proposed fix for
      owner decision
- [ ] tsc, build, check:routes green on the final commit
- [ ] The fix-commit list is small and labeled; nothing non-mechanical
      slipped in

/caveman report per sweep: pass/fail table, fixes made (with commits),
exceptions reported with severity, the fresh-eyes bullets verbatim, the
head-tag diff verdict, screenshots. This is the last gate before THE PUSH:
thoroughness beats speed.
