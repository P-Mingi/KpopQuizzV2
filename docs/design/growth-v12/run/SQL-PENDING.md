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

## Owner plan (2026-10-03)

- `v12-bundle-a.sql`: files 1 to 5, 7 and 9 to 18 above, in this order, each in its own transaction, then a read-only
  verification grid (one row per check with an `ok` column). The grid was syntax-tested on a throwaway local
  Postgres 18 with stub objects; the bundle itself has not run against the real schema (each file was replayed by
  its agent on a scratch Postgres). The SQL editor stops at the first error: the files before it stay applied, every
  file is idempotent, so fix and re-run from that file.
- File 6 is replaced by `v12-g2-03b-releases-2026-filtered.sql`: 141 inserts, without the 5 titles the owner left
  out (FIFTY FIFTY My Wonder, Hopping, Still In Time; KISS OF LIFE Was It You from a Japanese EP; the YOUNG POSSE
  title with a swear word). Apply it after the bundle, then run file 9 (`v12-g2-06-title-tracks.sql`) again so its
  2026 title tracks are flagged.
- File 8 (years backfill) waits: 30 random rows with their source are in `docs/growth/catalogue/v12-g2-05-sample30.md`
  (Deezer release date and ISRC year, read 2026-10-03; 30 of 30 agree with the year the file writes).
- File 19 waits for the owner's editorial accounts.

## Go log

- 2026-10-03 owner: `go v12-bundle-a.sql` (the owner pastes it in the SQL editor; waiting for `applied`).
- 2026-10-03 owner: go for file 8. `v12-bundle-b.sql` written: filtered file 6, file 9 again, file 8, each in its own
  transaction, then a read-only grid (5 checks, `ok` column; syntax-tested on a throwaway local Postgres 18). Run it
  after bundle A.

## Added by the F5 fix pass (2026-10-03), not in any bundle yet

- `v12-f5-quiz-rank.sql` (F5a): new functions `get_quiz_rank_v12` and `get_quiz_rank_for_score_v12` with
  `p_exclude_team boolean DEFAULT false`; the existing rank functions are untouched. After `v12-g9-editorial.sql`.
  Unlocks: the results rank "#N of M players" without editorial players (flag on). Until applied, today's call.
- `v12-f5-fandom-war.sql` (F5b): new function `get_fandom_war_map_v12` without editorial plays;
  `get_fandom_war_map` is untouched. After `v12-g9-editorial.sql`. Unlocks: the fandom war without editorial plays
  (flag on). Until applied, today's call.
Both were replayed by their agent on a throwaway local Postgres (refuse before the editorial file, re-run cleanly,
default answers equal today's).

## Applied (2026-10-04, by ORCH through the Supabase connector, on the owner's go for bundles A, B, C)

Bundle A, file by file, each in its own transaction (statements identical to the files, comments left out):
- 1 `v12-g1-bt-runs.sql`, 2 `v12-g1-bt-fans-today.sql`, 3 `v12-g1-quiz-score-stats.sql`, 4 `v12-g2-01-groups.sql`:
  applied, no error.
- 5 `v12-g2-02-songs-new-groups.sql`: applied in two transactions (inserts 1 to 12, then 13 to 20 and the two link
  updates). Check: the 20 rows' md5 over id, title, artist, album, covers, preview, duration, year, status, tier, rank
  equals the md5 computed from the file (db0858673b66e8fb1339067454e64e36); KickFlip 10, RESCENE 10, NCT WISH 22,
  Hearts2Hearts 14 songs linked.
- 7 `v12-g2-04-years-fix.sql`, 9 `v12-g2-06-title-tracks.sql` (sent as one `where deezer_track_id in (...)` update,
  same rows and condition), 11 `v12-g2-08-language.sql`: applied, no error.
- 10 `v12-g2-07-kpdh.sql`: applied; the only status CHECK on songs was `songs_status_check`, recreated with
  'soundtrack' added; md5 of the 10 rows equals the file's (6f70f430bc2bec8a3cc24ef6d26abf95).
- 12 `v12-g4-live.sql`: the connector call failed at the transport level ("Invalid or expired requestState"), not in
  SQL. Read-only check right after: none of its tables, functions or the Realtime policy exists. STOPPED here, as the
  owner asked (first error).
- 2026-10-04, after the owner reconnected the connector: 12 `v12-g4-live.sql` retried as is and applied in one
  transaction. 13 `v12-g4-party-rls.sql` (no party table exists: nothing changed), 14 `v12-g6-name-all.sql` (wrapped
  in a transaction), 15 `v12-g7-this-or-that.sql`, 16 `v12-g7-song-questions.sql` (a read-only dry count first: 81
  new questions and 1,251 ratings, not 77 and 1,201, because KickFlip, RESCENE, NCT WISH and Hearts2Hearts now have
  enough songs), 17 `v12-g8-share-link-plays.sql`, 18 `v12-g9-editorial.sql` (the two community CHECKs only gain
  'editorial'; both tables were empty): applied, no error.
- Bundle A grid: 21 of 23 lines ok. The two others were foreseen: file 9 reads 22 of 41 (the 19 missing songs come
  with the filtered file 6 of bundle B; the 22 present are all flagged), file 16 reads 84 song questions instead of
  80 (the 4 new groups, see above). duel_votes unchanged at 75,191.
- Bundle B: pasted by the owner in the SQL editor (too big for the connector); ORCH reads its grid after `applied`.

Write tests that also wait for a go (V12 prompt 4d): the tracking proof (`run/reports/G1/tracking-proof.mjs`, after 1),
the live load test (`apps/quiz/scripts/live-load/load.mts --real`, after 12 and the Realtime limits).
