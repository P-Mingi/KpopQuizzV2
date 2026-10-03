# F5c: pages still in the old design (Team badge and exclusions)

Progress: done. Branch `v12/f5c-legacy` from feat/v12 89d893d. Next: none. Blockers: none.

## Items
| Item | File | Commit (owner) | Proof |
|---|---|---|---|
| Board helper: drop editorial rows, close the ranks up, ties kept | `src/lib/editorial/surfaces/daily-board.ts` | d41327d (F5) | `legacy-pages.test.ts`, 3 unit tests |
| `/blindtest/leaderboard`: editorial accounts left out with the flag on | `app/(site)/blindtest/leaderboard/page.tsx` | d527b1d (G3) | render test: flag on, the team row is gone, fans rank 1 and 2; both off and v11 only, all 3 rows and no `editorial_accounts` read |
| `/new`, `/trending`, `/most-liked` (`InfiniteQuizList`, `components/quiz/quiz-card.tsx`) and the `/search` quiz cards (`components/ui/quiz-card.tsx`) | no code change | d41327d (F5, test only) | render test, see below |
| Flag-off parity, 5 pages | `F5/F5c-flag-off.txt` | this report | flag-off-diff.mjs, 5 of 5 identical |

## Why the quiz cards need no change
`isUxV12()` is true only with `NEXT_PUBLIC_UX_V1` on, and with `UX_V1` on both legacy `QuizCard`s return
`UxQuizCard` (`components/ux-v1/quiz-card.tsx`), which names no author at all (group, title, level bars, plays).
So with the v12 flag on no editorial author is named on these cards, and no level or fan title can show; the
legacy author line with `FanTitle` is reachable only with both flags off, where nobody is editorial. The test
renders all three components with a team-authored quiz (creator xp 50000): flag on, no username, no `Lv`, no
`quiz-author`, no read; both off, the legacy markup with the author and the fan title, no read.
The `/search` People rows already carry `TeamTag` and no level (done before this run step, untouched).

## Tests
- `src/lib/editorial/surfaces/legacy-pages.test.ts`: 8 tests, pass.
- Whole app: `tsc --noEmit -p .` exit 0; vitest 80 files, 1863 / 1863 pass.
- No em or en dash in the diff.

## NOT verified
- The board with the flag on against real data: `editorial_accounts` does not exist yet (file 19 pending), so on a
  dev server the team set is empty; the exclusion is proven on a mocked render only.
- The SQL of `get_daily_bt_leaderboard` was not read: if it caps its rows, a board holding editorial accounts shows
  that many fewer rows with the flag on (no extra read added to refill it). The JSON route `/api/daily/blindtest/leaderboard` is outside F5c.
- Commit d41327d alone fails its board flag-on test (the page change is in the next commit, G3's); both together pass.
- No production build, no Playwright run, flags-on dev pages not loaded.
