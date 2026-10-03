# V12 pending SQL (V12 prompt 4c)

Every file is in `docs/pending-migrations/`, idempotent, with its own header (what, why, rows, verify, undo). None is
applied. The owner applies a file only by typing `go <filename>` to ORCH; then pastes it in the Supabase SQL editor of
`rdkgouofytwfdpbxbzio` (this session's Supabase connector does not see that project) and answers `applied <filename>`;
ORCH runs the file's verification queries read-only and records the result here.

| # | File | Owner | What | Rows | Unlocks | Order | Status |
|---|---|---|---|---|---|---|---|
| 1 | `v12-g1-bt-runs.sql` | G1 | `bt_runs`, `bt_song_stats` (security invoker), `bt_bump_song_plays` (service role only) | new empty table | blindtest run tracking (`NEXT_PUBLIC_BT_TRACKING=1`), `/admin/blind-tests/runs` | first G1 file | pending |
| 2 | `v12-g1-bt-fans-today.sql` | G1 | `bt_fans_today()` | none | "fans playing today" on `/blindtest` and the landings | after 1 | pending |
| 3 | `v12-g1-quiz-score-stats.sql` | G1 | view `quiz_score_stats` | none | nothing yet (no reader) | any time | pending |
| 4 | `v12-g2-01-groups.sql` | G2 | groups RESCENE, NCT WISH | 2 inserts | their hubs and playlists | first G2 file | pending |
| 5 | `v12-g2-02-songs-new-groups.sql` | G2 | KickFlip 10, RESCENE 10 songs; group links for 22 NCT WISH and 14 Hearts2Hearts songs | 20 inserts, 2 updates | 4 new group playlists (79 to 83) | after 4 | pending |
| 6 | `v12-g2-03-releases-2026.sql` | G2 | 2026 releases of 58 groups | 146 inserts | `kpop-hits-2026` | after 5 | pending (owner look: 3 OST tracks, 1 Japanese EP track, 1 title with a swear word) |
| 7 | `v12-g2-04-years-fix.sql` | G2 | wrong years (debut year stored as release year) | 98 updates | correct year playlists | any time | pending |
| 8 | `v12-g2-05-years-backfill.sql` | G2 | missing years | 3,076 updates | `kpop-legends` as named; visible Year line on song pages with the flags off | any time | pending (owner decision) |
| 9 | `v12-g2-06-title-tracks.sql` | G2 | sourced title tracks | 41 updates | `title-tracks` as named (plus a one-line switch, G2 R6) | after 5 and 6 | pending |
| 10 | `v12-g2-07-kpdh.sql` | G2 | status `soundtrack` + KPop Demon Hunters songs | 1 constraint, 10 inserts | `kpop-demon-hunters` playlist (needs 10 playable) | any time (reader proof: no reader shows `soundtrack`) | pending |
| 11 | `v12-g2-08-language.sql` | G2 | `ko` to `korean` | 156 updates | one spelling; visible Language line on song pages with the flags off | any time | pending (owner decision) |
| 12 | `v12-g4-live.sql` | G4 | `live_rooms`, `live_players`, `live_answers`, Realtime Authorization policies, expiry | new empty tables | the live blindtest | before the load test | pending (read the Realtime limits first) |
| 13 | `v12-g4-party-rls.sql` | G4 | closes public writes on `party_rooms` / `party_players` if they exist | none today (tables dropped by migration 072) | guard only | any time | pending |
| 14 | `v12-g6-name-all.sql` | G6 | 2 nullable columns on `name_all_member_results`, index, `name_all_round_stats()` | 0 rows written | Name them all community lines | any time | pending |
| 15 | `v12-g7-this-or-that.sql` | G7 | `duel_vote_guard`, `duel_cast_song_vote()`, `duel_song_rankings`, one index | 0 rows | This or that votes, Fans picked ranking (cron) | before 16 | pending |
| 16 | `v12-g7-song-questions.sql` | G7 | song pairs per group | +77 `duel_questions`, +1,201 `duel_ratings` | the card for 77 groups (3 without it) | after 15, after G2's files if applied | pending |
| 17 | `v12-g8-share-link-plays.sql` | G8 | plays from a creator's share link | new empty table | "plays from your link" in the share kit (with G8 R1, R2) | any time | pending |
| 18 | `v12-g9-editorial.sql` | G9 | `editorial_accounts`, `editorial_drafts`, `editorial_posts`, `is_editorial(uuid)`, two widened CHECKs | new empty tables | the editorial pipeline | before 19 | pending |
| 19 | `v12-g9-editorial-accounts.sql` | G9 | the 3 to 5 editorial account rows | 3 to 5 inserts | Team badge, publisher | after 18 and after the owner fills in the ids (raises an exception until then) | pending (owner creates the accounts) |

Write tests that also wait for a go (V12 prompt 4d): the tracking proof (`run/reports/G1/tracking-proof.mjs`, after 1),
the live load test (`apps/quiz/scripts/live-load/load.mts --real`, after 12 and the Realtime limits).
