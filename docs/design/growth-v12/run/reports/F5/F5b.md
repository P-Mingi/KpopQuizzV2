# F5b: v11 surfaces, boards, fandom war (branch v12/f5b-boards, base 89d893d)

Progress: done. Next: ORCH merge, owner `go v12-f5-fandom-war.sql` after `v12-g9-editorial.sql`. Blockers: none.

Checks: whole-app `tsc --noEmit` 0 errors; `vitest run` 86 files, 1882 tests passed (5 new files, 24 new tests);
no existing test line edited or removed; no em or en dash in the diff; no dev server started, no `next build`,
no production read or write (Supabase is a recording fake in every new test).

## Items (file, commit, owner, test)

| Item | Files | Commit | Owner | Test |
|---|---|---|---|---|
| War SQL + RPC helper | `docs/pending-migrations/v12-f5-fandom-war.sql`, `lib/editorial/surfaces/war.ts` | 030c124 | F5 | `surfaces/war.test.ts` (4) |
| Ranked ladder | `lib/ranked/view.ts`, `lib/ranked/service.ts`, `lib/editorial/surfaces/team.ts` | fa90748 | F5 | `lib/ranked/team-ladder.test.ts` (4) |
| War map readers (hub rank, profile war line, P8 rail, /stats, legacy community) | `lib/db/queries/community.ts` | 535e18c | F2 | `surfaces/war-readers.test.ts` (2), f050558 F5 |
| Players (10 rows), Fresh quizzes Team badge, Around gates after the filter, war board and standing pin | `lib/ux-v1/p9/data.ts`, `components/leaderboard/ux-v1/around.tsx` | a9b619c | G8 | `lib/ux-v1/p9/f5b-team.test.ts` (7) |
| Hubs: From the community Team badge, first creator fallback | `components/group/ux-v1/hub.tsx`, `lib/ux-v1/p3/data.ts`, `lib/ux-v1/p3/growth-data.ts` | 33f6ac3 | G8 | `lib/ux-v1/p3/f5b-team.test.ts` (5) |
| Home community rows | `components/home/ux-v1/community-rows.tsx` + `teamCacheKey` (b21dd99, F5); `lib/ux-v1/p1/home-data.ts` (369593b, G1) | b21dd99, 369593b | F5, G1 | `components/home/ux-v1/f5b-team.test.ts` (2), c3b2a3a F5 |
| /creators: plays BY editorial accounts out | `lib/creators/board.ts`, `lib/creators/data.ts` (cache key v2) | aab32f7 | G8 | `lib/creators/f5b-team.test.ts` (3) |

## Decisions
- Fandom war SQL is a NEW function `get_fandom_war_map_v12(p_limit int default 30)`, not an extra defaulted
  parameter: a second overload of `get_fandom_war_map` would make today's PostgREST call `{p_limit}` ambiguous.
  The 107 function is untouched. Tested on a throwaway local Postgres (fixture and output in this folder):
  applies twice (idempotent), team plays and fans removed, anonymous plays kept, anon can execute, undo leaves 107.
- `rpcFandomWar`: flag off or nobody editorial = today's call; flag on with team = v12 function; PGRST202/42883/404
  = fall back to today's call. War map caches get a separate key only with the flag on (`warCacheKey`).
- Players read size = 10 + max(5, team size) (19 with the 9 accounts); flag off stays 15 rows, same cache key.
- Ranked: rows carry no user id, so team rows are matched on username; the ladder reads 8 + team size rows,
  renumbers positions and lowers the total by the team rows found. Leaderboard `ranked.tsx` and `ladder.tsx` need
  no change (they never receive a team row).
- Around feeds: comments and badges reads already exclude the team in the query (F2); `feedsWithoutTeam` re-applies
  MIN_COMMENTS / MIN_EARNS after the username filter, Happening keeps its 48-hour count gate (team-free count).

## Flag-off proof
Every new test has a flag-off case with a recording Supabase fake: `editorial_accounts` never read, today's RPC
name and `p_limit`, today's limits (players 15, ladder 8), no `byTeam` / `teamAuthor` / `team` key, cache keys
unchanged (`warCacheKey`, `teamCacheKey` return the base key).

## NOT verified
- No dev server or served-HTML diff (unit and render tests only); the Team badge was not seen on a real page.
- Ranked: a viewer's own row below the read window is renumbered only by the team rows inside the window (exact
  for every top row; the 9 accounts are not known to have ranked runs). The season card standing
  (`ranked_player_standing`, "#N of M" on /ranked) still counts them: it needs SQL, not in this brief.
- The v12 war function has not run against production data (owner applies it).
