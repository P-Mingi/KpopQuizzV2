# C1 pixel check (UX v11.2, Phase 3)

Branch `ux11/c1-check`. Implementation: the shared flag-ON production build of `feat/ux-v1-v11` on
http://localhost:3021 (head in each `verdict.json`: `at`, `url`). Reference:
`v11/checks/reference/<w>-<theme>-<state>.png` + `styles.json` (`v11/capture-prototype.mjs`).
Harness: `harness/c1-pixel.mjs` (drivers and landmark maps in `harness/drivers.mjs`), extra
checks `harness/c1-extra.mjs`, this table `harness/c1-summary.mjs`.

Per state and combo: landmark boxes within 2px (x, y, w, h as listed per landmark; text-driven
heights are not compared), computed styles equal to `styles.json` for its 27 landmarks and to
the prototype measured live in the same state for the others (px within 0.5), no horizontal
scroll at 390, and a masked pixel diff (photos and text masked on both sides; information only,
real data changes the page length). Cells: verdict, landmarks passed / compared, masked diff %.
Evidence: `<state>/<w>-<theme>-side.webp` (reference | implementation), `-diff.webp` (red =
differs, blue = masked), `verdict.json` (every number). No production write: every mutating
request was answered locally (payloads in `verdict.json` `writes`).

Totals (152 checks): pass 128, fail 8, not verified 16.

| State | Owner | 1440 light | 1440 dark | 390 light | 390 dark | Notes |
|---|---|---|---|---|---|---|
| home | P1 | pass 17/17, 3.52% | pass 17/17, 9.87% | pass 17/17, 14.05% | pass 17/17, 18.59% |  |
| home-guest | P1 | pass 19/19, 10.4% | pass 19/19, 12.87% | pass 19/19, 21.86% | pass 19/19, 23.35% |  |
| groups | P3 | **fail** 10/11, 5.83% | **fail** 10/11, 5.69% | **fail** 10/11, 5.72% | **fail** 10/11, 5.54% | fails: group tile |
| quizzes | P2 | not verified 3/3, 87.18% | not verified 3/3, 87.11% | not verified 3/3, 89.56% | not verified 3/3, 89.37% | pending P2 (branch waits for the owner; the server shows the pre-P2 page) |
| quiz | P4 | pass 15/15, 12.95% | pass 15/15, 12.81% | pass 15/15, 23.94% | pass 15/15, 23.76% |  |
| play | P4 | pass 6/6, 0.01% | pass 6/6, 0.01% | pass 6/6, 0.15% | pass 6/6, 1.75% |  |
| play-answered | P4 | pass 9/9, 0.42% | pass 9/9, 0.42% | pass 9/9, 5.97% | pass 9/9, 6.26% |  |
| play-qotd | P4 | pass 4/4, 0% | pass 4/4, 0.75% | pass 4/4, 1.7% | pass 4/4, 2.03% |  |
| end-guest | P4 | pass 11/11, 5.21% | pass 11/11, 5.34% | pass 11/11, 13.19% | pass 11/11, 13.4% |  |
| end | P4 | pass 11/11, 6.27% | pass 11/11, 6.28% | pass 11/11, 13.25% | pass 11/11, 13.43% |  |
| share | P4 | pass 5/5, 0.12% | pass 5/5, 0.79% | pass 5/5, 0.88% | pass 5/5, 0.52% |  |
| create-1 | P5 | pass 7/7, 2.25% | pass 7/7, 2.57% | pass 7/7, 9.7% | pass 7/7, 10.06% |  |
| create-2 | P5 | pass 7/7, 4.29% | pass 7/7, 4% | pass 7/7, 6.13% | pass 7/7, 5.67% |  |
| create-3 | P5 | pass 7/7, 1.35% | pass 7/7, 1.36% | pass 7/7, 4.64% | pass 7/7, 4.6% |  |
| signin | P5 | pass 4/4, 0.62% | pass 4/4, 0.61% | pass 4/4, 1.52% | pass 4/4, 0.73% |  |
| blindtest | P6 | pass 14/14, 2.37% | pass 14/14, 2.67% | pass 14/14, 4.91% | pass 14/14, 4.6% |  |
| blindtest-playlist-open | P6 | pass 6/6, 2.71% | pass 6/6, 4.6% | pass 6/6, 1.98% | pass 6/6, 10.3% |  |
| blindtest-group-search | P6 | pass 5/5, 2.8% | pass 5/5, 3.34% | pass 5/5, 5.34% | pass 5/5, 5.48% |  |
| btplay | P6 | pass 5/5, 0.07% | pass 5/5, 0.05% | pass 5/5, 0.41% | pass 5/5, 0.37% |  |
| btplay-answered | P6 | pass 6/6, 0.06% | pass 6/6, 0.06% | pass 6/6, 0.6% | pass 6/6, 0.59% |  |
| btend-ranked | P7 | not verified 3/3, 6.57% | not verified 3/3, 10.68% | not verified 3/3, 15.8% | not verified 3/3, 20.67% | NOT verified until the ranked migration is applied (populated ranked state) |
| ranked | P7 | not verified 5/5, 22.79% | not verified 5/5, 23.82% | not verified 5/5, 30.6% | not verified 5/5, 32.1% | populated state NOT verified until the ranked migration is applied; the not-live state is checked |
| community | P8 | pass 11/11, 14.28% | pass 11/11, 14.97% | pass 10/10, 14.84% | pass 10/10, 16.05% |  |
| post-challenge | P8 | not verified 6/6, 24.46% | not verified 6/6, 24.45% | not verified 6/6, 16.39% | not verified 6/6, 16.4% | NOT verified: no challenge post exists (the challenge store is a pending migration, P8 report); the thread post view stands in for the shared post layout |
| post-blog | P8 | pass 7/7, 9.39% | pass 7/7, 9.39% | pass 7/7, 32.93% | pass 7/7, 32.91% |  |
| post-debate | P8 | pass 7/7, 22.87% | pass 7/7, 22.65% | pass 7/7, 19.37% | pass 7/7, 18.9% |  |
| editor | P8 | pass 5/5, 1.37% | pass 5/5, 1.18% | pass 5/5, 4.08% | pass 5/5, 3.91% |  |
| leaderboard | P9 | pass 8/8, 48.3% | pass 8/8, 49.37% | pass 8/8, 64.62% | pass 8/8, 65.7% |  |
| hub-blackpink | P3 | pass 14/14, 33.86% | pass 14/14, 33.71% | pass 14/14, 38.32% | pass 14/14, 38.32% |  |
| hub-ateez | P3 | pass 14/14, 33.78% | pass 14/14, 33.64% | pass 14/14, 43.37% | pass 14/14, 43.28% |  |
| hub-empty | P3 | pass 8/8, 44.74% | pass 8/8, 44.79% | pass 8/8, 51.54% | pass 8/8, 51.62% |  |
| passport | P10 | pass 10/10, 3.7% | pass 10/10, 3.78% | pass 11/11, 23.21% | pass 11/11, 23.79% |  |
| passport-badges | P10 | pass 6/6, 56.17% | pass 6/6, 56.21% | pass 7/7, 67% | pass 7/7, 67.14% |  |
| settings | P10 | pass 5/5, 6.01% | pass 5/5, 5.89% | pass 6/6, 9.13% | pass 6/6, 8.87% |  |
| header-sheet | P10 | **fail** 3/4, 2.96% | **fail** 3/4, 2.98% | **fail** 3/4, 1.57% | **fail** 3/4, 0.63% | fails: drop zone |
| notifications | P11 | pass 7/7, 6.47% | pass 7/7, 6.47% | pass 8/8, 19.39% | pass 8/8, 19.3% |  |
| search | P11 | pass 5/5, 0.38% | pass 5/5, 0.37% | pass 5/5, 1.01% | pass 5/5, 0.98% |  |
| bell | P11 | pass 3/3, 1.72% | pass 3/3, 2.6% | pass 3/3, 0.93% | pass 3/3, 0.88% |  |

## Extra checks (`_extra/verdict.json`)

| Check | Result |
|---|---|
| Nav fits at 1280 and 1440 (one line, no overlap, no truncation) | 1280-user: pass, 1280-guest: pass |
| Hover (cards, buttons, tabs, rows, nav links) vs the prototype :hover |  |
| Keyboard focus ring vs the prototype :focus-visible |  |
| Theme tokens (prototype --x vs --ux-x) |  |
| Reduced motion (no running infinite animation, transitions off) |  |

Issues filed: `v11/issues/<owner>.md` (ids C1-nnn).
