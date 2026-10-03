# F5a: quiz pages and the results rank (Team badge and exclusions)

## Progress
- Done: quiz page author line and Made by box, hall of fame, comments and replies, rank SQL and helpers.
- Next: ORCH applies request R1 (`run/requests/F5.md`, 3 lines in the standing route, owned by nobody).
- Blockers: none. Results rank stays today's numbers until R1 is merged AND `v12-f5-quiz-rank.sql` is applied.

Branch `v12/f5a-quiz-pages` (from `feat/v12` 89d893d). Every commit by owner F5 (guard ok). Integration: whole-app
tsc 0, vitest 1871/1871 (83 files), no em or en dash in the diff.

## Items
| Item | Files | Commit | Test |
|---|---|---|---|
| `/q/[slug]` by line and Made by box: team avatar, Team pill, no "Lv", no level title | `components/quiz/ux-v1/quiz-page.tsx`, `lib/ux-v1/p4/queries.ts` (`getP4Creator` adds `team: true`) | a90fa18 | `lib/editorial/surfaces/quiz-page-render.test.ts` (4), `quiz-page-data.test.ts` (5) |
| Hall of fame without editorial plays (guest rows kept) | `lib/ux-v1/p4/queries.ts` | a90fa18 | `quiz-page-data.test.ts` |
| Comments and replies: team avatar, Team pill, no flair (comments show no level for anyone) | `components/quiz/ux-v1/comments.tsx` (`P4CommentAvatar`, `P4CommentName`, shared `useTeamUsernames`) | a3e54c6 | `quiz-comments-render.test.ts` (3) |
| Results rank "#N of M players" without editorial players | `docs/pending-migrations/v12-f5-quiz-rank.sql`, `lib/editorial/surfaces/quiz-rank.ts` | b502aaf | `quiz-rank.test.ts` (4), SQL dry run `F5/f5a/sql-dryrun.txt` |

## Flag off (NEXT_PUBLIC_UX_V12 unset)
- Hall of fame and creator: the v11 `unstable_cache` callbacks are kept with their exact source text and key parts
  (`p4:hall-of-fame:v1`, `p4:creator:v1`; Next derives the cache key from both), only the const was renamed.
  `teamIdsToExclude()` and `isEditorialUser()` read nothing with the flag off; tests assert `editorial_accounts`
  is never read and no `.or` filter is added, and the creator object has no `team` key.
- Quiz page and comment authors: render tests show identical HTML with or without `team` on the props.
- Comments: `useTeamUsernames` sends no request with the flag off (its effect returns before the fetch).
- Rank: `quiz-rank.ts` calls today's RPC with the same name and arguments, nothing else read (tested).

## SQL (not applied)
`v12-f5-quiz-rank.sql`: new names `get_quiz_rank_v12` and `get_quiz_rank_for_score_v12` with
`p_exclude_team boolean DEFAULT false` (a defaulted parameter on the existing names would create an overload and
make every 2-argument call ambiguous). Needs `v12-g9-editorial.sql` first (refuses with a clear error otherwise).
Dry run on a throwaway local Postgres 14: refused before g9, nothing written; applied twice (idempotent); default
answers equal today's for 4 viewers and 4 scores; with `true` the editorial player leaves both numbers and an
editorial viewer gets rank null; callable as anon.

## Requests
- R1 (`run/requests/F5.md`): wire `src/app/api/ux-v1/p4/standing/route.ts` to `quizRankForUser` /
  `quizRankForScore`. Typechecked locally, then reverted.

## NOT verified
- No dev server, browser or e2e run of `/q/[slug]` (render tests on the real components only).
- No live database: PostgREST filters through a fake; the SQL only on a local throwaway Postgres.
- The rank exclusion is not live until R1 and the SQL. The intro "Your best" uses the same route and follows it.
- If the creator read fails (`getP4Creator` null) the page cannot know the author is editorial and shows the v11
  line with its level for that render.
