# C2 wiring rows (V12 backend check)

One row per control of every v12 view (prototype `docs/design/growth-v12/prototype.html`, the 40 states of
`capture-v12.mjs`, SYSTEM.md 1 to 5.6, the builders' reports). Target: ORCH's flag-on production build of afb83f4
on `http://localhost:3071` (`NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1`, `NEXT_PUBLIC_BT_TRACKING` unset).

Columns: control, endpoint and method, expected request shape, expected effect, flag-off behaviour (v11 only build),
data dependency (pending SQL file, if any), owner. "Link" = a plain `<a href>`, proven by the server HTML and the
target's status. "Client" = no request by design, proven by guardWrites recording zero calls.

Status values (in `SUMMARY.md`): PASS, FAIL (issue id), NOT verified until <file> (proven in the fail-soft form),
WAITING FOR GO (V12 prompt 4d write tests), FLAG-OFF PENDING (needs ORCH's v11-only build).

## Blindtest hub `/blindtest` (states bthub-playlists, bthub-live-band; owner G3)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| B01 | Playlists rail cards | Link `/blindtest/<theme>` | - | one card per playable theme only, each target 200; hidden themes absent | rail absent | kpop-hits-2026: g2-03; kpdh: g2-07 | G3 |
| B02 | "Play in your language" | Link `/guess-the-kpop-song` | - | 200 | absent | - | G3 |
| B03 | Live band: Host / Join | Links `/live`, `/join` | - | both 200, noindex | band absent | - | G3 |
| B04 | Language row | Links to the 4 landings | - | 4 hrefs, each 200 | absent | - | G3 |
| B05 | Playlist menu "Themes" item, Start | `POST /api/blind-test/generate` (read-only route) | `{ playlist: <theme id>, count, ... }` | questions from the theme pool; route reads only | no Themes item | - | G3 / G2 |
| B06 | Run tracking (any blindtest start / finish / quit) | `POST /api/track/bt-run` (beacon or fetch) | `{ event, run_id, playlist, source, ... }` | with `NEXT_PUBLIC_BT_TRACKING` unset: no call, route 404 | same (own switch) | g1-bt-runs | G1 |
| B07 | "N fans playing today" eyebrow | server read `bt_fans_today()` | - | hidden while the function is absent | absent | g1-bt-fans-today | G3 / G1 |

## Landings `/guess-the-kpop-song`, `/fr/...`, `/es/...`, `/id/...` (land-*; owner G3)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| L01 | Start (10 songs, All K-pop) | `POST /api/blind-test/generate` | `{ playlist: 'all', count: 10, ... }` | game starts in the page language | page 404 / 301 | - | G3 |
| L02 | "Play with friends" | Link `/live` | - | 200 | - | - | G3 |
| L03 | Themed playlist cards | Links `/blindtest/<theme>` | - | playable themes only, each 200 | - | as B01 | G3 |
| L04 | Other languages | Links to the 3 other landings | - | hreflang cluster + visible links | - | - | G3 |
| L05 | Song count in the lead and FAQ | server read `songs` count | - | equals SQL count of playable songs (real, formatted per language) | - | - | G3 |
| L06 | Results: Challenge a friend | `POST /api/ux-v1/p6/challenge` | v11 challenge body | stubbed by guardWrites; shape recorded | - | - | G3 (v11 P6 route) |

## Theme pages `/blindtest/<theme>` (theme-*; owner G3)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| T01 | "Play this playlist" | `POST /api/blind-test/generate` | `{ playlist: <theme id>, ... }` | questions from that theme only | v11 `[mode]` page | - | G3 |
| T02 | "Play it live" | Link `/live` (with playlist) | - | 200 | absent | - | G3 |
| T03 | Top 10 most played songs | server read | - | 10 rows that exist in `songs` with the theme rule | absent | - | G3 |
| T04 | Hidden themes (kpop-hits-2026, kpop-demon-hunters) | `GET /blindtest/<slug>` | - | 404 until playable | 404 | g2-03, g2-07 | G3 / G2 |
| T05 | KPDH bridge card | Link `/kpop-demon-hunters-quiz` | - | shown only on the kpdh theme | absent | g2-07 | G3 |

## KPop Demon Hunters quiz `/kpop-demon-hunters-quiz` (kpdh-*; owner G5)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| K01 | Start, 6 answer cards, Back | Client | - | no request until the result | 404 / 301 | - | G5 |
| K02 | Result saved | `POST /api/personality/result` | `{ quiz: 'kpdh', picks }` only (never the result) | one call per finished quiz; server recomputes | route 404 | - | G5 |
| K03 | Result links: group page, its blindtest | Links `/<slug>-quiz`, `/blindtest/group-<slug>` | - | 200; blindtest link only when playable | - | - | G5 |

## Which member are you `/which-<group>-member-are-you` (wma-*; owner G5)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| W01 | 8 answer cards, Back | Client | - | no request until the result | 301 to the hub (REFONTE P1) | - | G5 |
| W02 | Result saved | `POST /api/personality/result` | `{ quiz: 'wma', group: <slug>, picks }` | one call; none on a second run the same day | route 404 | - | G5 |
| W03 | "N results", distribution | server read `get_personality_counts` | - | equals SQL counts of `personality_results` for the group | - | - | G5 |
| W04 | "Make <member> your bias tag" | signed out: sign-in sheet; signed in: `POST /api/auth/update-profile` | `{ bias: <member> }` | signed out: no request | - | - | G5 |
| W05 | Share, Save as image (story, square), Retake | Client | - | no request | - | - | G5 |

## Name them all `/<group>-name-all-members` (nta-*; owner G6)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| N01 | Name input + Enter, slots | Client | - | no request during the round | 404 / 301 | - | G6 |
| N02 | Round end (all found or time out) | `POST /api/name-all/result`, header `x-nta-anon` | `{ group, found: [names in typed order], seconds, gaveUp: false }` | one call, sent once | route 404 | 4 old columns until g6 | G6 |
| N03 | Give up | same | `{ ..., gaveUp: true }` | rest revealed, one call | - | - | G6 |
| N04 | Slot count (roster) | server read `idols` | - | equals SQL count of active idols of the group | - | - | G6 |
| N05 | Community lines ("N% named all", "Named first") | server read `name_all_round_stats()` | - | hidden until the function and 30 v12 rounds exist | absent | g6-name-all | G6 |
| N06 | Route guard | `POST /api/name-all/result`, unknown group | `{ group: 'nope', ... }` | 4xx before any write (safe to send) | 404 | - | G6 |

## This or that bonus on quiz results `/q/<slug>` (quiz-bonus, quiz-bonus-voted; owner G7)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| Q01 | Card mount | `GET /api/duel/pairs?group=<slug>`, header `x-duel-anon` | - | `{ pairs: [{ token, a, b }], group, ranked }`; songs belong to an active song question | never asked, route 404 | aespa, BLACKPINK, BTS only until g7-song-questions | G7 |
| Q02 | Tap a song (vote) | `POST /api/duel/vote` | `{ token, winner: 'a' or 'b' }` | stubbed; shape recorded | 404 | g7-this-or-that | G7 |
| Q03 | Forged pair token | `POST /api/duel/vote` | `{ token: <not signed>, winner }` | 403 before any database call (safe to send) | 404 | - | G7 |
| Q04 | Next pair, Finish, Skip | Client | - | no request | - | - | G7 |
| Q05 | "See what <fandom> picked" | Link `/<slug>-quiz#fans-picked` | - | only when the group is ranked | - | g7-this-or-that | G7 |

## Group hub `/<slug>-quiz` (hub-*; owner G8)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| H01 | Ways to play tiles | Links `#hub-quizzes`, `/blindtest/group-<slug>`, `/<slug>-name-all-members`, `/which-<slug>-member-are-you`, `/live?...` | - | only tiles whose page exists, each 200 | absent | - | G8 |
| H02 | Fans picked section | `getFansPicked()` / `GET /api/duel/fans-picked?group=` | - | hidden while `ranked: false` (no `duel_song_rankings`) | absent | g7-this-or-that | G8 / G7 |
| H03 | Fans picked "Vote" | as Q01, Q02 | - | as Q01, Q02 | absent | g7 | G8 |
| H04 | Empty hub: Create + 3 templates | Links `/create?group=<slug>` and `&type=` | - | 200, prefilled | absent | - | G8 |
| H05 | Empty hub real signals | server read | - | numbers equal SQL | absent | - | G8 |
| H06 | Thin hub nudge | server read `plays`, 60 days | - | "Fans played them N times" equals SQL (hidden under 10) | absent | - | G8 |

## Share kit (create done; share-kit; owner G8)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| S01 | "Open the share kit" | `GET /api/creators/kit?quiz=<id>` | - | 400 bad id, 404 unknown quiz | 404 | - | G8 |
| S02 | Tracked link | `POST /api/share/generate` | `{ quizId, platform: 'link' }` | stubbed; shape recorded | v11 "Post a challenge" | - | G8 |
| S03 | "plays from your link" | `readLinkPlays` inside S01 | - | absent while null | absent | g8-share-link-plays + G8 requests R1, R2 | G8 |
| S04 | Challenge door | Link `/community?compose=challenge&quiz=<slug>` | - | 200 | - | - | G8 |

## Creators `/creators` (creators; owner G8)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| C01 | Tabs This month / All time | Client (both boards server rendered) | - | no request | `/creators` 301 to `/` | - | G8 |
| C02 | Board rows | server read | - | creators and plays equal SQL (unique players, own plays out) | - | - | G8 |
| C03 | Your standing | `GET /api/creators/standing` | - | anonymous `{ signedIn: false, me: null, standing: null }` | 404 | - | G8 |
| C04 | Create a quiz, Back to the leaderboard | Links `/create`, `/leaderboard#creators` | - | 200 | - | - | G8 |

## Live blindtest `/live`, `/join`, `/join/<code>` (live-*; owner G4)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| V01 | Setup: open state | `GET /api/live` | - | 503 `{ error: 'not_live' }` while the tables are absent; page says so | 404 | g4-live | G4 |
| V02 | Setup: Create room | `POST /api/blind-test/generate` then `POST /api/live/rooms` | `{ playlist, count, mode: 'challenge' }`, then settings + questions | not offered while not live | 404 | g4-live | G4 |
| V03 | Host controls (start, reveal, next, remove, close) | `POST /api/live/rooms/<code>/host`, host token | `{ action, ... }` | 503 while not live | 404 | g4-live | G4 |
| V04 | Join by code | `GET /api/live/rooms/<code>` | - | 503 not_live | 404 | g4-live | G4 |
| V05 | Join with nickname | `POST /api/live/rooms/<code>/join` | `{ nickname, colour }` | 503 while not live | 404 | g4-live | G4 |
| V06 | Answer (4 colour + shape buttons) | `POST /api/live/rooms/<code>/answer`, player token | `{ choice }` | 503 while not live | 404 | g4-live | G4 |
| V07 | Expiry cron | `GET /api/cron/live-expire` | bearer CRON_SECRET | 401 without it | 404 | g4-live | G4 |

## Editorial (community-team-post, post-team; owner G9)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| E01 | Team post card in the feed | server read `editorial_posts` | - | absent while the table is absent | absent | g9-editorial | G9 |
| E02 | Team post page `/community/thread/e<id>` | GET | - | 404 while absent | 404 | g9-editorial | G9 |
| E03 | Reply / heart on a team post | `POST /api/ux-v1/p8/replies`, `/like` | `{ target_type: 'editorial', ... }` | unreachable while absent (no post) | v11 shape | g9-editorial | G9 |
| E04 | Team rows in notifications | `GET /api/ux-v1/p11/team` | - | empty while absent | 404 | g9-editorial | G9 |
| E05 | `/admin/editorial` and its API | GET page, `GET /api/admin/editorial` | - | anonymous: login redirect, 401 | 404 | g9-editorial | G9 |
| E06 | Publisher cron | `GET /api/cron/editorial-publish` | bearer CRON_SECRET | 401 without it | 404 | g9-editorial, g9-editorial-accounts | G9 |

## Tracking, admin, crons (owner G1, G7)

| Id | Control | Endpoint, method | Request shape | Expected effect | Flag off | Data | Owner |
|---|---|---|---|---|---|---|---|
| R01 | `/api/track/bt-run` | GET, POST | - | 404 with `NEXT_PUBLIC_BT_TRACKING` unset | 404 | g1-bt-runs | G1 |
| R02 | `/admin/blind-tests/runs` | GET | - | anonymous: admin gate (login redirect) | same | g1-bt-runs | G1 |
| R03 | Fans picked nightly cron | `GET /api/cron/fans-picked` | bearer CRON_SECRET | 401 without it | 404 | g7-this-or-that | G7 |

## Write tests of V12 prompt 4d (never run here)

| Id | Test | Status |
|---|---|---|
| WG1 | Tracking proof `run/reports/G1/tracking-proof.mjs` (after g1-bt-runs) | WAITING FOR GO |
| WG2 | Live load test `apps/quiz/scripts/live-load/load.mts --real` (after g4-live and the Realtime limits) | WAITING FOR GO |
