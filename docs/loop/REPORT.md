# REPORT - PR #27 UI-POLISH: rebased on the new main, re-CI, merge-ready for the screenshot audit

Branch `refonte/ui-polish` (PR #27). Three validated UI tweaks, opened before the #26 kill and the
#28/#29 perf work landed, so it was stale on the old main with a stale-saturation CI red. Rebased
onto the current main. NO push to main, NO merge (owner gate). No content/behaviour change beyond
the three intended UI tweaks.

## The rebase (clean, zero drift)
- Base moved: `dfc009c` (kill-era) -> `origin/main` `5059264` (has #26 kill + #28 + #29).
- Old tip `0af60ca` -> new tip `a0afe91`. Branch is 1 ahead of main, 0 behind (fast-forwardable).
- NO conflicts: main never touched the three files this commit changes (verified
  `git diff dfc009c..origin/main` on those paths = empty), so the single commit replayed cleanly.
- Owner's uncommitted docs (VERSE-LEDGER.md, MISSION.md) preserved via `--autostash`.

## Only the 3 intended UI changes survive (proof: docs/proofs/ui-polish-27/range-diff.txt)
`git range-diff dfc009c..0af60ca  origin/main..a0afe91` prints `1: 0af60ca = 1: a0afe91` - the `=`
means the patch is byte-identical across the rebase (zero drift). `git diff origin/main..HEAD
--stat` shows exactly three files, nothing else:

| File | Change (the validated tweak) |
|---|---|
| `components/layout/top-nav-links.tsx` | active tab = solid filled-brand PILL: `background: accent`, `color:#fff`, `borderRadius:999`, underline removed |
| `components/blind-test/blindtest-game.tsx` | "By group" toggle -> single-group select grid |
| `components/ui/group-logo.tsx` | BLACKPINK inline coin recolored: `#F06292` fill + `#FFFFFF` box/text (no black blob) |

## Verification
- `tsc --noEmit`: 0 errors. Unit: 118/118. range-diff: identical (above).
- Route table UNCHANGED vs main BY CONSTRUCTION: the diff touches only three CLIENT component
  files - zero page.tsx / render-config / generateStaticParams changes - so no route can change
  mode. (No route-table diff to show because nothing route-affecting changed.)
- `next build` LOCAL: not completed - the Supabase nano origin was returning 522 (Cloudflare
  "Connection timed out") during the attempt, so page prerenders hit the 60s limit. This is the
  same transient DB-saturation the CI has hit before, NOT the rebase (which is byte-identical to
  the already-green 0af60ca content). I stopped the local build rather than keep hammering a
  struggling production origin. The build runs on CI + the Vercel preview (their infra) instead.
- Screenshots (1440 + 390): PARTIAL, blocked by the intermittent nano 522.
  - nav pill: CONFIRMED - "Home"/"Blindtest" active tab renders as the solid filled-brand pink
    pill with white text (DB-independent chrome, captured cleanly).
  - blindtest by-group toggle: could not capture - the toggle only renders when `groups.length
    > 0` (blindtest-game.tsx:467), and getBlindtestGroups returned empty on every attempt because
    the DB was 522-ing. Not a code issue.
  - BLACKPINK coin: could not capture - /blackpink-quiz hit the error boundary because
    getGroupBySlug threw on a 522.
  - Both data-dependent shots are blocked by the SAME transient DB saturation that failed my
    local build and the Vercel preview. Playwright's headless browser is not installed and I did
    not install it (owner rule). The definitive isolation proof is the range-diff (byte-identical
    to the already-owner-validated 0af60ca), which answers "did the rebase change the 3 tweaks"
    more strongly than a screenshot. Remaining two shots: capture from the Vercel preview once it
    redeploys on a healthy-DB window, or re-run when the nano stabilizes.
- CI run: PR #27 https://github.com/P-Mingi/KpopQuizzV2/pull/27
- No em dashes, zero emoji.

## Owner gate remaining
1. CI green on the rebased head (unit + e2e).
2. Cowork audits the three screenshots.
3. Owner merges `refonte/ui-polish` to main. NOT done here.
