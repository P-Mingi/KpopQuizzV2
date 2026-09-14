# REPORT - GAMES HUB REDESIGN + FIX 1: report pret.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). Branch `feat/games-hub-redesign` off main (ba1aaf1).
The redesign is built, tested, proven, and the audit findings on the first build (fa91886) are
closed. `feat/tierlist-social` (unpushed e93315d) left untouched.

Full proof battery: `docs/proofs/games-hub/` (start at its README). All proofs re-taken on
`next build` + `next start -p 3021` against the revision-3 renders.

## FIX 1: audit findings closed (on the same branch)

BLOCKER 1, proofs were on a dev server. Re-taken on `next build` + `next start -p 3021` (the exact
command and its first log lines are in `test-output.md`); the full mobile capture
`pixel/render-390-fullpage-no-dev-badge.png` ends in the footer with no dev badge. No old PNG reused.

BLOCKER 2, data honesty:
1. This or That foot stat is `{votes} votes` (no "today"; `total_votes` is all-time).
2. The This or That preview 61/39 split is labelled "live" with NO number (it is a demo split); the
   real total stays in the foot stat.
3. `/pt/games` band is no longer empty: a shared `readBandSongs` helper feeds both pages' band chips,
   each inside its own `unstable_cache` (new `getPtGamesData`), still no per-request read.

Visual defects 4 to 10, all fixed and verified in the new renders:
4. Mobile Name Them All uses 46px faces and three slots (RM no longer clipped).
5. Foot stats use the short copy ("Beat the clock", "Timer counts up", "+3 s per wrong pair", "N
   votes", "Elo, best of 7", "Just launched", "Daily, soon") and stay on one line at 390; the mobile
   foot was tightened so the widest CTAs (Start ranking, Find a duel) never overlap the stat. e2e
   asserts one line and no stat/CTA overlap on all eight cards at 390.
6. Mobile header sub trims its second sentence (kept in the DOM via a hidden span for crawlers).
7. Match-Up hook uses a non-breaking hyphen (U+2011) in "K-pop", so it never orphans.
8. K-pop Idle "Coming soon" is a non-interactive chip (surface-alt fill), not an outline button.
9. Mobile ranking strip wraps its actions to a second row with the dot inline before the title.
10. Band answer chips put the artist inline after the title in muted text, not right-aligned.

Cost nit 11: the streak fetch is gated on a JS-readable `sb-...-auth-token` cookie (the app's browser
client stores the session there, not httpOnly), so anonymous viewers and crawlers make zero
`/api/daily/streak` calls; only signed-in viewers hit it.

New pixel numbers (next start, vs revision-3 renders): 1440 diff 4.47%, 390 full-column diff 12.49%
(down from 15.71%; the mobile height now matches the revised oracle to within 3px). Route table
unchanged: `○ /games` and `○ /pt/games` at 1h. Unit 80 passed, e2e 18 passed (2 mobile-only guards
skipped on desktop), tsc 0 source errors.

## What shipped (PART A)

`/games` and `/pt/games` are rebuilt as a faithful port of the owner artboards `Main.dc.html`
(1440) and `Mobile.dc.html` (390). Header (kicker, "Prove it.", sub, streak chip), one dark daily
blind-test band (live countdown to the UTC reset, CSS waveform with the middle run tinted rose,
"Play today's" to /blindtest, streak pill, four REAL song answer chips, none marked picked), the
"All games" header with five filter chips (client-side CSS filter that keeps every card in the
server HTML), eight cards with real `/idols` faces in the artboard order (Name Them All, Sort It,
Match-Up, This or That, Which member, Duel 1v1, Tier Lists [New], K-pop Idle [dimmed, "Coming
soon", no dead button]), and the live ranking strip.

New files: `components/game/games-hub.tsx` (rewritten), `games-filter.tsx`, `games-countdown.tsx`,
`games-streak.tsx`, `lib/games/reset-countdown.ts`, `lib/games/hub-filters.ts`,
`lib/games/pickDailyMany` (in `daily-rotation.ts`). CSS: the `gh-*` block in `styles/globals.css`
(replaced the old `gh2-*` block; the separate lobby `lmc-*` block is untouched).

## Pixel fidelity (`docs/proofs/games-hub/pixel-fidelity.md`)

Rendered in system Chrome at both widths, clipped to the hub root, pixelmatched against the owner
renders (oracle cropped to its content column, offset swept to tightest alignment; the real site
nav and tab bar are out of scope and excluded).

- 1440: 4.52% mismatch, structurally aligned.
- 390: 15.71% full column, 14.08% header+band.

The residual is not layout drift. It is (1) real idol photos vs the artboard placeholders (the
largest share, a fidelity gain), (2) real data text vs sample text, and (3) the intentional
data-honesty deviations. Every box, radius, color, the dark band, the eight-card grid, the filter
row and the strip land on the artboard grid. Full deviation list with reasons in `deviations.md`.

## Data honesty (`docs/proofs/games-hub/data-honesty.md`)

No artboard SAMPLE literal ships. Corrections from the pre-build plan:

- "N fans playing today" and "N played today": DROPPED. The pre-build note called a 24h plays count
  feasible; on inspection it is not cheaply so (the plays index is keyed quiz_id/player_id, no
  owner-gated index bounds a 24h count under 200ms server-side). Real or absent -> absent, rather
  than add a per-request read that would break the cost fence.
- Band answers: four real songs from a cached pool, rotated per UTC day by `pickDailyMany`,
  excluding today's actual daily answers; none marked picked.
- Counts (groups, modes, boards, rankings), live votes, and the ranking strip: real from the cached
  `getGamesData`. Streak and countdown: client, real or absent. "Your best: 5 of 7" and "Fans
  online now" foot stats replaced with the games' honest mechanics.
- Card preview zones are the artboard's illustrative gameplay mock-ups, marked aria-hidden; the demo
  Elo and percentages live only inside those hidden previews and never appear as the viewer's stats.
- No dead buttons. K-pop Idle is a non-interactive "Coming soon" label.

## Cost fence (`docs/proofs/games-hub/cost-fence.md`)

- `next build` route table: `/games` and `/pt/games` are both `Static` with a 1h ISR window.
  Neither is `Dynamic`. A request serves prerendered HTML with zero DB reads.
- The page diff adds no `force-dynamic`, no `cookies()`, no `headers()`, no page-level `fetch`
  (grep of added lines = 0). Render mode is unchanged from before this branch.
- The two new reads (band song pool + today's daily exclusion) are inside the existing
  `getGamesData` `unstable_cache(3600s)`, shared across all visitors, once per hourly revalidation.
- Client fetch on load: only the pre-existing `/api/daily/streak` (the old hub already called it via
  `BlindStreak`); returns nothing for anon and crawlers. Countdown is pure client math. Filter is
  client-only state. No new API route.

## PART B, SEO (`docs/proofs/games-hub/seo.md`)

Five gates green against the built HTML: canonical `/games` unchanged; hreflang en/pt-BR/x-default
unchanged; title/description unchanged; JSON-LD ItemList gains "K-pop Tier Lists" at position 8
(after Duel), rankings shifted to 9; all eight card test ids present in the prerendered static HTML
(the filter only toggles visibility, never removes a card).

## PART C, band-becomes-game

Deferred; the band keeps its link to `/blindtest` (a live route, no dead button). It is feasible to
lazy-mount the blind-test player on tap via `next/dynamic` (zero initial load cost, the player
fetching its own data only after the interaction), but mounting the full player with audio and
scoring is a real new surface that should not be rushed under this pixel-and-cost mission. It is
noted for a follow-up rather than shipped half-built.

## Verification

- Unit: 80 passed (10 files), including the three new games-hub files (filter tag map, band picker
  determinism, countdown helper) = 17 tests.
- e2e: 18 passed, 2 skipped (the desktop skips of the two mobile-only guards), on both the desktop
  and mobile Playwright projects, against the `next start` build on :3021. Covers the eight cards in
  server HTML, every idol face loaded (naturalWidth > 0), band CTA -> /blindtest, Tier Lists ->
  /tier-list with the New badge, K-pop Idle has no link, each filter reveals its set and All restores
  eight, no emoji, /pt/games same eight cards, no horizontal overflow at 390, and (new) every foot
  stat is one line and never overlaps its CTA at 390.
- tsc: 0 source errors. `next build`: green (check:routes, check:verse-tokens, check:env all pass).
- No em dashes, zero emoji in the shipped hub.

## CI (on the current head 80b681d)

Pushed the feature branch (main stays owner-gated) and opened PR #23 to run the full suite. Both jobs
are GREEN on head 80b681d: unit passed (30s), e2e passed (3m14s). Run:
https://github.com/P-Mingi/KpopQuizzV2/actions/runs/34879005227 (PR
https://github.com/P-Mingi/KpopQuizzV2/pull/23).

The one owner gate that remains: merging to main (production). This branch is not merged.

## Scope touched

Only `/games`, `/pt/games`, `GamesHub` and its new children, the `gh-*` CSS, `hub-filters.ts`,
`daily-rotation.ts` (added `pickDailyMany`), `reset-countdown.ts`, the tests, and the proofs.
Nothing else. `feat/tierlist-social` and its unpushed e93315d untouched.
