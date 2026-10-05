# Live load and chaos test, real (2026-10-05)

Owner's go: "go live load test", `--limit-connections 500` (Supabase Pro minimum; the script refuses above 60%,
this run opened at most 250 Realtime connections, 50%).

- App: local production build of `v12/launch-prep` (c23645b), `NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1`, tracking
  unset, `next start -p 3080`, against the production database and Realtime of `rdkgouofytwfdpbxbzio`. Rooms were
  created with `is_test` true (not the Vercel production environment).
- Command: `pnpm exec tsx --env-file=.env.local scripts/live-load/load.mts --real --base http://localhost:3080
  --limit-connections 500 --owner-go "..." --out run1.json`. Raw output: `run1.log`, `run1.json`.
- Started 2026-10-05T17:31Z (`started.txt`).

| Phase | Rooms x players | Rounds | Answers | Answer latency p50 / p95 / p99 / max (ms) | Join p95 (ms) | Host action p95 (ms) | Realtime loss | Score mismatches | Failures |
|---|---|---|---|---|---|---|---|---|---|
| burst, chaos on | 5 x 50 at once | 5 | 1,150 | 52 / 1,579 / 2,142 / 2,266 | 2,216 | 5,536 | 1 of 4,000 (0.02%), recovered by the state route | 0 | 0 |
| long | 1 x 50 | 20 | 1,000 | 50 / 126 / 139 / 217 | 659 | 439 | 8 of 3,050 (0.26%), all recovered | 0 | 0 |

Chaos (SYSTEM.md 5.5), all as expected:

| Case | Result |
|---|---|
| Two players with the same nickname | every player shows a distinct name |
| 51st player | refused 409 `full`, 5 of 5 rooms |
| Double tap | second answer refused 409 `duplicate`, 175 of 175 |
| Answer after the deadline (server time) | refused 409 `late`, 75 of 75; no answer inside the round called late |
| Phone drops and rejoins | gets its room and score back, rejoins the channel |
| Host reloads mid game | reads the room back in round 2 with its question |
| Room expires (`expiry.json`) | after `expires_at` was set in the past on a test room: state 404 `gone` (player and host), join 404, host start 404, answer 404 |

Not run: the expiry cron (`/api/cron/live-expire`) on that room. It deletes every expired test room, and one other
expired test room existed (`493fc353...`, lobby, created before this run, not ours), so the cron was not called;
expiry itself is enforced on every read and write (rows above).

To watch: in the burst phase, latency spikes while 250 phones answer within the same second (answer p95 1.6 s, host
p95 5.5 s; one machine drove all 250 phones and the app). With one room at a time the same paths are 126 ms and
439 ms. No failure and no wrong score in either phase.

Cleanup (`cleanup.txt`): the 7 rooms of this run (6 load, 1 expiry) deleted by id, `is_test` checked; afterwards
`live_rooms` 1 (the room above, not ours), `live_players` 0, `live_answers` 0.

Follow-up (owner, 2026-10-05): the other test room `493fc353...` (lobby, `is_test` true) deleted on the owner's
request; afterwards `live_rooms` 0, `live_players` 0, `live_answers` 0 (`owner-followup.txt`).
