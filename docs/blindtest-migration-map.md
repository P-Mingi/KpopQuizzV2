# Blindtest Migration Map (B10, phase 1 — read + document, NO port yet)

Source: `apps/blindtest` (standalone Deezer blind-test app)
Target: `apps/quiz` (kpopquiz.org, branch `redesign/v2-fresh`)
Spec: `kpopquiz_redesign_instructions.md` Section 16a — V1 = **SOLO only**, on the kpopquiz.org design system.

This document is a read-only inventory + mapping. It writes no migrations and ports no code. Sign-off on this map gates the actual port (B10 a–e).

---

## 0. TL;DR — the three answers that matter

1. **Songs-data sourcing: the live blindtest Supabase project is DEAD.**
   `apps/blindtest/.env.local` points at `https://fvyuznnyugznzfskgcvy.supabase.co`, which now returns **NXDOMAIN** (DNS does not resolve — project deleted/paused). Outbound network is fine (Deezer + generic both 200), so this is a dead project, not a sandbox issue. **We cannot export the ~22k songs from the live DB.**
   **BUT** there is a complete local snapshot: `apps/blindtest/docs/songs-database.json` — **26 MB, 22,105 song records**, with all game columns including precomputed `wrong_answers_artist`/`wrong_answers_title`. This is the import source. Fallback is a full re-populate from Deezer via `populate-songs.mjs` (keyless, ~hours).

2. **Collisions: the source schema is ALREADY in the quiz project.** A prior port created `songs` (024, Deezer-shaped, currently **EMPTY**), `bt_plays` (020, anon-capable), `players`, `player_group_mastery`, `player_achievements`, `record_bt_play` RPC, plus party/ranked/daily tables (051/052). Separately, quiz has a **different, YouTube-based** blind-test (`blind_test_songs` 349 rows + `blind_test_plays` 140 rows, routes under `/api/blind-test/*`). The Deezer port **replaces the YouTube game**; it does not add net-new tables — it mostly **populates `songs`** and ports the API/UI.

3. **iOS audio unlock: it is NOT YouTube.** Playback is **Deezer 30-second preview MP3 via HTML5 `Audio`**. The iOS/Safari autoplay unlock (`apps/blindtest/src/components/game/use-audio-player.ts`) is a **dual trick fired inside a tap handler**: (a) create an `AudioContext`, play a 1-sample silent buffer; (b) create a silent base64 WAV-data-URI `<audio>` at volume 0 and `.play()`. Both set `unlockedRef = true`. This is the single most fragile piece and must be ported verbatim.

---

## 1. SOURCE backend inventory (`apps/blindtest`)

### 1.1 Migration history
There are **no `.sql` migration files** in `apps/blindtest`. Schema history does not live in this app. The schema exists (a) in the now-dead Supabase project, and (b) mirrored into the quiz repo's migrations (`017`, `020`, `024`, `026`, `044`, `051`, `052`) — see §2. The reconstructed schema below is derived from the live-code column references and the snapshot.

### 1.2 Schema (reconstructed from code + snapshot)

**`songs`** (the playable Deezer table — read by `/api/game/generate`):
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `deezer_track_id` | bigint UNIQUE NOT NULL | durable key; preview URLs are re-fetched by this |
| `title` | text NOT NULL | |
| `artist_name` | text NOT NULL | |
| `album_name` | text | |
| `album_cover_small/medium/big` | text | Deezer CDN URLs |
| `preview_url` | text NOT NULL | Deezer 30s MP3; **expires in hours** |
| `duration` | int | |
| `gender` | text | `gg`/`bg`/`solo_female`/`solo_male`/`coed` |
| `generation` | text | `1st`–`5th` |
| `is_title_track` | bool | |
| `year` | int | mostly null in snapshot |
| `difficulty` | text | `easy`/`medium`/`hard` — in practice all `medium` |
| `status` | text | `active`/`inactive`/`review` |
| `wrong_answers_artist` | text[] | precomputed distractors (same-gender artists) |
| `wrong_answers_title` | text[] | precomputed distractors (same-artist titles) |
| `is_curated` | bool | curation flag; gated by `SONGS_IS_CURATED` env (added later, NOT in snapshot) |
| `deezer_rank` | int | popularity proxy; in practice 0 (NOT in snapshot) |

**`groups`** (id int, name, slug, `deezer_artist_id`) — referenced for group playlists.

**Progression / play tracking** (used by the standalone app; mostly NOT ported for V1):
- `bt_plays` — `player_id` (nullable → **anon plays**), `mode_id`, `score`, `correct`, `total`, `total_time`, `best_combo`, `songs` jsonb, `created_at`.
- `players` — game profile (id = auth.users, username, xp, level, streaks, `liked_song_ids`).
- `player_group_mastery` — per-group mastery xp/level.
- `player_achievements` — earned achievement ids.
- `daily_challenges` / `daily_challenge_plays` — daily mode.
- `party_rooms` / `party_players` — multiplayer.
- `ranked_plays` — ranked mode.
- RPC `record_bt_play(...)` — inserts the play, updates player xp/level/streak/mastery, bumps per-song stats.

### 1.3 Song population path
- **Catalog:** `docs/kpop-artists-catalog.mjs` (~600 artists with `name`, `gender`, `generation`, `deezer_artist_id`/`deezer_search`).
- **Populate (from scratch):** `docs/populate-songs.mjs` → fetches Deezer **keyless** (`https://api.deezer.com`), self-rate-limited `300 ms`/call, max **200 tracks/artist** (artist top tracks + album tracks), dedupes by `deezer_track_id`, computes `wrong_answers_artist` (same-gender artists, same-gen first) and `wrong_answers_title` (same-artist titles, then same-gender fill). Writes `songs-database.json` + `artist-stats.json`.
- **Import:** `docs/import-to-supabase.mjs` → reads `songs-database.json`, batches of **200** via Supabase REST `POST /rest/v1/songs` with **service-role key**, `Prefer: resolution=ignore-duplicates` (idempotent on `deezer_track_id`). Defaults to the dead URL but honors `SUPABASE_URL` env override → **retargetable to the quiz project**. Post-step it suggests a `difficulty` UPDATE keyed on `deezer_rank` (a no-op in practice — rank is 0).

### 1.4 Deezer integration
- **No API key, no auth, no secret.** Public endpoints only.
- Endpoints used: `GET /track/{id}`, `GET /search/track?q=`, `GET /search/artist?q=`, `GET /artist/{id}`, `GET /artist/{id}/top`, `GET /artist/{id}/albums`, `GET /album/{id}/tracks`.
- Rate limiting: only the self-imposed `300 ms` sleep in the populate script. Runtime `/api/game/generate` fires up to 10 parallel `GET /track/{id}` calls per game to **refresh expiring preview URLs + album covers** (stored URL kept as fallback on failure).

### 1.5 `/api/game/generate` (the endpoint to port)
- **Request** `POST` JSON: `{ playlist?: string='all', mode?: 'quick'|'challenge'='quick', difficulty?: string='all' }`.
  - `playlist`: `all` | `gg` | `bg` | `solo` | `4th-gen`/`3rd-gen`/`2nd-gen` | `title-tracks` | `hits` | `deep` | or a group slug/name.
  - `mode`: `challenge` → 10s timer, else 15s.
- **Selection:** query `songs` where `status='active'`, exclude remixes/instrumentals/live/etc via `title NOT ILIKE`, apply `is_curated` gating (when `SONGS_IS_CURATED=true`), gender/generation/group filters; split by `difficulty`; `smartMix()` by a per-mode distribution; pick **10**.
- **Distractors (the key bit):** per song, **prefer the precomputed `wrong_answers_artist`/`wrong_answers_title` columns** (used directly when length ≥ 3). Runtime fallback when < 3:
  - artist distractors → other artists of the **same `gender`**, unique, 3 random;
  - title distractors → other titles by the **same `artist_name`**; if < 3, fill from **same-gender, other-artist** titles; 3 random.
  - `buildChoices()` drops any distractor equal to the answer, pads to 3 with `"Unknown"`, shuffles the 4.
- **Question type:** `Math.random() < 0.6` → **artist** question (~60%), else **title** (~40%).
- **Response** JSON: `{ questions: Question[], playlist, mode, difficulty, timer_duration, songs_count: 10, all_artists: string[], all_titles: string[] }`, where `Question = { song_id, question_type: 'artist'|'title', question_text, preview_url, album_cover_medium, album_cover_big, correct_answer, choices: string[4], reveal: { title, artist, album, cover } }`.

### 1.6 Audio player + iOS unlock — `src/components/game/use-audio-player.ts`
Plain HTML5 `Audio`, **no YouTube**. API: `{ load, loadAndPlay, play, pause, stop, fadeOut, cleanup, unlock, isPlaying, isLoaded, audioRef }`.
- `unlock()` — call inside a click/tap. Idempotent via `unlockedRef`. Does **both**: `new AudioContext()` + 1-sample silent buffer played at t=0; **and** a silent base64 WAV data-URI `<audio>` at `volume=0` `.play()`. This is the iOS/Safari autoplay workaround.
- `load(url)` — tears down previous audio, `new Audio()`, `preload='auto'`, `volume=0.5` (headroom for SFX), wires `oncanplaythrough`/`onplay`/`onpause`/`onended`/`onerror`.
- `loadAndPlay(url)` — load then `play()`, retry on `canplaythrough` if the immediate play rejects.
- `fadeOut(ms=500)` — 20-step interval volume ramp then pause.
> Port note: this is UI-adjacent but the unlock sequence is backend-of-the-frontend critical. Port verbatim; do not "simplify".

### 1.7 Song admin panel
- Routes (all `GET`/`POST` gated by `isAdmin(user.id)` = membership in `ADMIN_USER_IDS`):
  `api/admin/songs/search-deezer` (keyless Deezer search), `…/search-artist`, `…/import-json`, `…/bulk-add`, `…/generate-wrong-answers`, `…/list`, `…/[id]` (edit/delete).
- UI: `src/app/admin/songs/song-manager.tsx`.
- Auth helper: `src/lib/admin.ts` → `isAdmin()` checks `process.env.ADMIN_USER_IDS`.

### 1.8 Env vars (source)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `ADMIN_PASSWORD`, `ADMIN_USER_IDS`, `CRON_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `DISCORD_CLIENT_ID/SECRET`, `SONGS_IS_CURATED`. **No Deezer key.** Google/Discord OAuth are the standalone app's own auth — not needed (quiz has its own auth). The quiz `.env.local` already defines every non-OAuth var above.

---

## 2. TARGET backend inventory (`apps/quiz`)

### 2.1 Conventions
- **Migrations:** `supabase/migrations/NNN_snake_case.sql`, 3-digit zero-padded sequential. Highest is **`068`** → next is **`069`**. ⚠ There is a **pre-existing duplicate number `051`** (`051_bt_redesign_schema.sql` AND `051_expand_game_types.sql`) — flagged in §4. Migrations are applied **manually** by the user via the Supabase SQL editor (MCP DB tools are permission-denied); several files note "run manually".
- **Supabase client:** house module `@/lib/supabase/server` exporting `createServerClient()` (SSR anon + cookies) and `createServiceRoleClient()` (service role). **Identical shape to the source's `@kpopquiz/shared/supabase/server`** → porting is an import swap.
- **API routes:** `src/app/api/**/route.ts`, `export async function GET/POST(req: NextRequest)`, JSON via `NextResponse.json`, parse-guard on `req.json()`. Admin gating via `ADMIN_USER_IDS`.
- **Auth/session:** Supabase auth via cookies (`supabase.auth.getUser()`); session refresh in middleware. Anonymous play supported: `player_id` columns are nullable and existing blind-test plays insert with `player_id: user?.id ?? null`. Profile XP via `award_xp(p_user_id, p_amount, p_reason)` RPC against `profiles` (distinct from the `bt_players`/`record_bt_play` XP system).

### 2.2 Existing blind-test in quiz (the YouTube game — to be replaced)
- Tables (migration `017_blind_test_v2`):
  - `blind_test_songs` (**349 rows**): id, title, **artist** (single col), group_id, **`youtube_id` NOT NULL**, year, is_title_track, gender, generation, **`clip_intro/chorus/verse/bridge`** (int start seconds), **`wrong_answers` text[]** (single, not split), times_played, times_correct, avg_answer_time, status.
  - `blind_test_plays` (**140 rows**): id, `player_id` → `profiles` (nullable), mode_id, score, total, song_ids uuid[], choices jsonb, created_at.
- Routes: `/api/blind-test/generate` (reads `blind_test_songs`, **YouTube** `youtube_id` + clip timestamps, title-only questions), `/api/blind-test/play` (records `blind_test_plays`, updates per-song stats, `award_xp`), `/api/blind-test/modes`. Modes from `src/lib/blind-test-modes.ts`. Admin songs at `/api/admin/songs`.

### 2.3 Live DB probe (project `rdkgouofytwfdpbxbzio`, anon, read-only)
| table | exists | rows |
|---|---|---|
| `songs` (Deezer, 024) | yes | **0** ← import target |
| `groups` | yes | 66 |
| `blind_test_songs` (YouTube, 017) | yes | 349 |
| `blind_test_plays` (017) | yes | 140 |
| `bt_plays` (020, anon) | yes | 1 |
| `bt_players` (026/051) | yes | 0 |
| `bt_game_results` (026) | **no (404)** | — (dropped/never applied) |
| `bt_playlist_mastery` (026) | **no (404)** | — |
| `party_rooms` / `ranked_plays` (051) | yes | 0 / 0 |
| `daily_challenges` | yes | 1 |

---

## 3. Migration map (source object → target)

| Source object | Target | Rename? | Transformation / action |
|---|---|---|---|
| `songs` table | **`public.songs` (024, exists, EMPTY)** | none | Same schema. **Populate** with the 22,105-row snapshot via a retargeted `import-to-supabase.mjs`. Then backfill `group_id` (join `artist_name`→`groups`), and re-run `044` curation. |
| `songs-database.json` (22,105) | `songs` rows | n/a | Direct import. Snapshot lacks `deezer_rank`, `is_curated`, `group_id` → all default/backfilled. |
| `groups` | `public.groups` (66 rows) | none | Used for group playlists + `group_id` backfill (has `deezer_artist_id`). |
| `/api/game/generate` | `apps/quiz/src/app/api/blind-test/generate/route.ts` | **replaces** existing YouTube route | Port logic; swap import to `@/lib/supabase/server`; keep request/response shape; reads `songs` (Deezer), not `blind_test_songs`. |
| `use-audio-player.ts` | `apps/quiz/.../components/blind-test/` | none | Port verbatim incl. iOS unlock. Replaces the YouTube IFrame player. |
| admin Deezer routes (`search-deezer`, `import-json`, `generate-wrong-answers`, …) | `apps/quiz/src/app/api/admin/songs/*` | merge with existing `/api/admin/songs` | Port as needed for V1 (search-deezer + import are enough to maintain the catalog). Keep `isAdmin`/`ADMIN_USER_IDS`. |
| `bt_plays` (anon) | `public.bt_plays` (020, exists) OR `blind_test_plays` (017) | decision | V1 play recording target — see Risk R4. `bt_plays` matches source 1:1 and is anon-capable. |
| `isAdmin` / `src/lib/admin.ts` | already exists in quiz | none | Same `ADMIN_USER_IDS` mechanism. |
| `@kpopquiz/shared/supabase/server` | `@/lib/supabase/server` | import swap | Identical API. |

---

## 4. Risk register (flag everything)

- **R1 — Dead source DB.** `fvyuznnyugznzfskgcvy` is NXDOMAIN; no live export. Mitigation: import `songs-database.json` (22,105). Re-populate from Deezer only if the snapshot is rejected.
- **R2 — Snapshot is missing `deezer_rank`, `is_curated`, `group_id`.** Curation (`044`) ranks by `deezer_rank`; with rank=0 it degrades to arbitrary "top N per artist". Options: (a) accept degraded curation for V1; (b) backfill `deezer_rank` from Deezer `/track/{id}` post-import; (c) set `is_curated=true` for a hand-picked flagship set. `group_id` must be backfilled by `artist_name`→`groups.name` join (case-sensitive — see R6).
- **R3 — Two competing blind-test implementations.** Existing quiz game = YouTube (`blind_test_songs`, clip timestamps, single `wrong_answers`); source = Deezer (`songs`, preview MP3, split distractors). The port **replaces** the YouTube game. Decide the fate of `blind_test_songs`/`blind_test_plays` (349/140 rows): leave dormant, or retire. The route path `/api/blind-test/generate` is reused → old behavior is overwritten.
- **R4 — Play-recording table choice + anon.** Three candidates: `bt_plays` (020, matches source, anon-ok), `blind_test_plays` (017, currently used, anon-ok), or none (localStorage-only for V1). Per-song stats: source bumps `songs.play_count`; existing route bumps `blind_test_songs`. Pick one; do not double-write. V1 is SOLO + anon, so XP coupling must be avoided.
- **R5 — Migration numbering.** Next file = **`069`**. Pre-existing **duplicate `051`** in the repo (`051_bt_redesign_schema` + `051_expand_game_types`) — do not add a third; do not reuse 051. Migrations are applied **manually** by the user.
- **R6 — `artist_name` ↔ `groups` matching.** Generate's group-playlist path matches `songs.artist_name` to `groups.name` (exact, case-sensitive) then `groups.slug`, then fuzzy. Backfilling `group_id` and group playlists both depend on this; casing/romanization mismatches (e.g. `Girls' Generation`, `(G)I-DLE`) will silently miss.
- **R7 — Preview URL expiry.** Snapshot `preview_url`s are stale. Generate already re-fetches per `deezer_track_id` at play time (10 parallel calls/game) — keep this; it is the reason the dead-DB snapshot is still usable. Adds Deezer latency to each game start + a Deezer availability dependency.
- **R8 — iOS audio unlock fragility.** Must run inside a user gesture; both unlock paths required. Any refactor that defers `unlock()` out of the tap handler breaks iOS Safari silently.
- **R9 — Env.** No new secrets (Deezer keyless; quiz already has Supabase/admin/curated vars). Do **not** port Google/Discord OAuth.
- **R10 — `SONGS_IS_CURATED` gate.** Generate's curation branch is env-gated; `songs` is empty today, so curation is meaningless until import + `044` re-run. Sequence matters: import → backfill → curate → enable.

---

## 5. NOT ported (per Section 16a — V1 = SOLO only)

Party mode (`party_rooms`/`party_players`, `/api/party/*`, `use-party-channel`, kahoot/everyone screens), ranked mode (`ranked_plays`, `/api/play/ranked`), daily challenge (`daily_challenges`/`daily_challenge_plays`, `/api/daily/*`), the XP/combo/powerup/mastery systems (`players`/`bt_players` xp, `player_group_mastery`, `record_bt_play` xp logic, `combo.ts`, `powerups.ts`, `progression.ts`, `ranks.ts`, achievements), the multiplayer room-code system (`short-code.ts`, challenge codes), the lightstick mascot (`components/mascot`), `use-game-state` XP/mastery logic, and the dark-purple gradient theme. V1 runs on the kpopquiz.org B0 design system.

---

## 6. Suggested port order (B10 a–e) — for review, not yet executed

- **a.** Migration `069_*`: ensure `songs` has `deezer_rank` + `is_curated` (already via 029/044); add any missing index. No new tables expected.
- **b.** Data: retarget `import-to-supabase.mjs` at the quiz project, import 22,105 songs; backfill `group_id`; backfill `deezer_rank` (optional, R2); run `044` curation; set `SONGS_IS_CURATED`.
- **c.** API: port `/api/game/generate` → `/api/blind-test/generate` (Deezer), decide play-record target (R4), port minimal admin Deezer (`search-deezer` + `import`).
- **d.** UI: port `use-audio-player` (verbatim iOS unlock) + the solo game screen onto B0.
- **e.** Verify: anon solo game end-to-end on iOS Safari (audio unlock), generate latency, curation sanity.

*Gate: user reviews this map before any of a–e.*
