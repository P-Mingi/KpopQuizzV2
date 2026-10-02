# KpopQuiz growth system v12 (owner-validated plan, 2026-09-25, updated 2026-09-29)

Goal: more people playing, starting with the blindtest. Owner priorities, in order:
1. Measure first: every blindtest run is recorded (today none is, since 2026-06-05).
2. Fix what lies to players: clue-quiz averages above 100%.
3. Complete the catalogue: RESCENE, NCT WISH, and playable songs for Hearts2Hearts and KickFlip.
4. The blindtest as the acquisition engine: localized landing pages, themed playlists, KPop Demon Hunters.
5. Then the new ways to play (designed in the v12 prototype): Name them all, Which member are you,
   This or that bonus + Fans picked, Fans create (empty group pages, share kit, creators board),
   Live blindtest (one screen, everyone on their phone). The quiz version is parked (owner, 2026-09-29).

Who builds what (owner, 2026-09-29):
- W2 is finished (PR #66). R1 (`R1-RELEASE-PROMPT.md`) fixes the live-site security and data bugs, merges v11,
  applies its migrations and keeps the flag off in production (owner, 2026-09-30).
- Then ONE run builds all of v12 on main (items 1 to 5 plus 5.6), pixel by pixel against the prototype:
  `V12-PROMPT-MULTIAGENT.md`. The W3 prompt and its isolation rules are superseded (kept in `superseded/`).

Precedence: where this file and `V12-PROMPT-MULTIAGENT.md` differ (file names, where a page or a test lives), the
V12 prompt wins.

Reference design: `prototype.html` in this folder (window.UX_VERSION = "v12.2 growth (2026-09-29)"),
published at https://claude.ai/artifact/AcDCcgsUaeM39VqeQC7B5d (button "New in v12" lists the new views).
Text in a dashed box starting with "Design note" is an annotation for builders, never shipped copy. It contains every v11.2 page unchanged plus
the new views. v11.2 stays the reference for W2.

Numbers below were read on 2026-09-25 (read-only SQL, Search Console export in docs/refonte/gsc).

---

## 1. Blindtest tracking (W3)

Why: `blind_test_plays` last row 2026-06-05, `bt_plays` 1 row, `songs.play_count` all 0. The hub game
(`components/blind-test/blindtest-game.tsx`, used by /blindtest and /pt/blindtest) only calls
`/api/blind-test/generate` and the daily endpoints. The playlist pages (`/blindtest/<mode>`,
`components/blind-test/blind-test-player.tsx`) still call `/api/blind-test/play`, which writes the old
`blind_test_plays` / `blind_test_songs` model, yet nothing has landed since 2026-06-05 (W3 finds out why
and reports; the old endpoint stays in place for rollback). We rank for "kpop blind test" (position 3.6,
39% CTR) and cannot see a single run.

Model (additive migration, owner applies):
- `bt_runs`: id uuid, created_at, finished_at null, player_id uuid null, anon_id uuid null (same anon id
  as `plays.anon_id`), playlist text (`all`, `group:<slug>`, `theme:<slug>`, `daily:<date>`,
  `challenge:<code>`, `live:<room>`), mode text (classic, intro, speed, verse, bridge, ranked), source
  text (hub, landing-en, landing-fr, landing-es, landing-id, group-hub, daily, challenge, live, share,
  other), locale text, rounds smallint, answered smallint, correct smallint, score int, best_combo
  smallint, duration_ms int, completed boolean, songs jsonb
  `[{song_id, kind: 'title'|'artist', correct, ms}]`, user_agent_class text (mobile|desktop|bot),
  is_test boolean default false (true when `VERCEL_ENV` is not `production`, which covers localhost and
  previews: the site has one production database, so test runs must never count; never derived from the
  Host header).
  Indexes on (created_at), (playlist, created_at), (player_id), (anon_id).
- `bt_song_stats` view or nightly table: per song plays, correct rate, median ms (difficulty tuning,
  "hardest songs" content, playlist quality).
- RLS: insert only through the API (service role), no public select; admin select.

Flow:
- `POST /api/track/bt-run` with `{event:'start'|'finish', run_id, ...}`. Start is sent when the first
  clip plays, finish on the results screen or when the player quits (`completed=false`,
  `navigator.sendBeacon`). Server clamps values, rate limits per anon id and IP hash (IP never stored),
  drops obvious bots (no JS clip play, impossible timings), increments `songs.play_count` in one RPC.
- Client helper `trackBtRun()` in `src/lib/tracking/bt.ts`: the only way any blindtest UI (old game,
  daily, challenge, group mode, the v11 game later, live mode later) records a run.
- Guests: runs keep `anon_id`; the existing claim-runs flow attaches them after sign-in.
- XP: unchanged rules; the finish call returns what the existing XP path already awards. No recompute.
- Admin: `/admin/blind-tests/runs` (next to the existing `/admin/blind-tests/create`): runs per day, per
  source, per playlist, completion rate, runs per player, top and hardest songs. is_test rows excluded.
  No personal data shown.
- Funnel: landing page views already arrive in Vercel Web Analytics (mounted in the root layout); runs
  by `source` come from `bt_runs`. No new event table and no new Vercel custom event name
  (`lib/analytics.ts` keeps its fixed six). No third-party tracker.

Done when: a run on production appears within seconds with the right playlist/source; abandoned runs
appear as completed=false; the admin page shows today's numbers; the daily and challenge flows record
too; flag-off pages unchanged apart from the tracking call.

## 2. Score normalization (W3)

Why: guess-from-clues quizzes store points (up to 3 per question) in `plays.score` while
`total_questions` is the question count: "Guess the SKZ member from clues" shows 18/6, averages of
189% and 249%.
- Today `lib/quiz/scoring.ts` only hides the numbers (`scoreIsPerQuestion`, used by /q/[slug] and
  `quiz-stats-block.tsx`), while the cards, quiz of the day, hover teaser, stats queries and admin
  compute `total_score_sum / total_completions / question_count` inline.
- Add to `lib/quiz/scoring.ts` (additive, `scoreIsPerQuestion` kept): `maxPointsPerQuestion(quizType)`
  (guess_from_clues 3, others 1, same rule as `quiz-player.tsx` and the play API `max_score`),
  `maxScore(quizType, questionCount)`, `avgScorePct({ total_score_sum, total_completions,
  question_count, quiz_type })` returning 0..100 or null, `runScoreLabel(score, questionCount,
  quizType)` for "18/18" style labels. Unit tested.
- SQL view `quiz_score_stats` (quiz_id, plays, avg_pct, median_pct) computed with the same rule, used by
  every "Average", "You beat X%", QOTD average and hall of fame percentage.
- Every inline computation outside W2's paths switches to these helpers (one expression per file). The
  v11 components W2 is building get the same instruction through the handoff message. Stored rows are
  not rewritten.

## 3. Catalogue completion (W3)

- Groups to add: RESCENE (The Muze Entertainment, 2024) and NCT WISH (SM Entertainment, 2024). Verify
  every fact from two sources (official site or label, plus a reference wiki) before writing; same
  columns as the existing groups (slug, names, fandom, debut, label, generation, seo fields left to the
  existing defaults). No photo scraping: typographic cover until the owner adds `public/idols/<Group>.jpg`.
- Songs to add with the existing Deezer ingestion `apps/quiz/scripts/ingest-blindtest-songs.mts`
  (idempotent on deezer_track_id, but it writes straight to the database and has no dry run: W3 adds
  `--dry-run --sql-out <file>` and only ever runs that mode). Hearts2Hearts, KickFlip, RESCENE,
  NCT WISH, until each reaches ROUND_SIZE = 10 clean songs (`lib/blind-test-playlists.ts`; no remix,
  instrumental, inst., karaoke, sped up; valid preview). Mark their title tracks from a cited source.
- Data quality found on the way: no song has `year = 2026` (the hits-2026 playlist needs 2026 releases
  of the groups already in the catalogue, same script); only 45 songs are flagged
  `is_title_track = true` (3,919 are null): W3 flags the new songs and the hits playlists only, a full
  backfill needs a sourced list and is an owner decision; `language` mixes `korean` (3,964) and `ko`
  (156): W3 checks every reader of that column first and proposes the update in its own SQL file.
- Everything is written as idempotent SQL in `docs/pending-migrations/w3-*.sql`
  (`insert ... on conflict do nothing`), with a dry-run report (rows to add, playlists that become
  playable). Applied only after the owner types "go <file>" in the W3 session.
- After apply: playlists count rises from 79; W2 must treat group and playlist counts as live values.

## 4. Blindtest acquisition (W3)

Landing pages (one intent per language, each a real page, server rendered, same game):

| Lang | URL | H1 | Target queries |
|---|---|---|---|
| en | /guess-the-kpop-song | Guess the K-pop song | guess the kpop song, kpop song quiz |
| fr | /fr/blind-test-kpop | Blind test K-pop | blind test kpop, blind test k-pop |
| es | /es/adivina-la-cancion-kpop | Adivina la canción K-pop | adivina la cancion kpop |
| id | /id/tebak-lagu-kpop | Tebak lagu K-pop | tebak lagu kpop |

Routing facts (checked in the repo on 2026-09-25): the middleware 301s every path that
`lib/route-allowlist.ts` does not know to the home page, so `/guess-the-kpop-song`, `/fr/`, `/es/` and
`/id/` (with the trailing slash, the allowlist uses startsWith) must be added there first, with its test.
`lib/i18n/config.ts` only knows en and pt and drives site-wide hreflang: do not add fr, es, id there.
The landings set their own `lang` the way `app/(site)/pt/layout.tsx` does and carry their own copy.

- `/blindtest` stays the hub and keeps its H1, URL and its existing en/pt hreflang pair (it already
  ranks). The four landings form their own hreflang cluster with `x-default` = /guess-the-kpop-song.
  The /blindtest language row and Playlists section shown in the prototype belong to W2 (P6 owns
  `app/(site)/blindtest/**`); they read the themes from `lib/blind-test-modes.ts` once W3 has merged. Each landing: H1, one-line promise, Start (playlist menu + rounds), themed playlists,
  3 steps, a short localized FAQ with FAQPage JSON-LD matching the visible text, BreadcrumbList.
- The game strings are localized for fr, es, id (question label, buttons, results, share text) through an
  optional `strings` prop on the current game; English output stays byte for byte the same. Song titles
  and artist names stay as released.
- Styling: page-scoped CSS (`styles/growth/*.css`, classes prefixed `gl-`, tokens scoped to the page
  root) inside today's site chrome; no global CSS change. After W2 merges, W4 moves them onto the A0
  components.
- Copy is in the prototype (view `btland`, language switch). No machine translation left unreviewed.

Themed playlists (new modes in `lib/blind-test-modes.ts`, so `/blindtest/<slug>` pages exist through
the current `[mode]` route; each needs at least 10 clean songs):
- `kpop-hits-2026`: year 2026 (needs the ingestion above), best Deezer rank first.
- `kpop-hits-2025`: year 2025 (51 songs today).
- `5th-gen`: generation 5th (300 songs today).
- `tiktok-viral`: a curated list in `lib/blind-test-curated.ts` with one public source per song
  (a TikTok or chart article showing the trend). No TikTok logo or branding.
- `kpop-demon-hunters`: the film soundtrack songs available on Deezer with previews (HUNTR/X, Saja Boys,
  TWICE "Strategy" and "Takedown" versions if present). The fictional acts' songs get their own non-active
  status so they never enter the daily, the all-songs pool, group playlists or ranked; TWICE songs keep
  their group and are listed by id. Text and audio only: no poster, no stills, no
  character art, no logo. Title used descriptively ("KPop Demon Hunters songs blind test").

Bridge quiz `/kpop-demon-hunters-quiz`: "Loved HUNTR/X? Find your real K-pop girl group." Six
picture-free questions, weighted answers, result = one of BLACKPINK, TWICE, ITZY, aespa, LE SSERAFIM,
ILLIT with the reason, links to that group page and its blindtest. Built standalone now; moved onto the
Which-member engine by W4.

Distribution notes (no build): YouTube "guess the kpop song" videos are where passive fans are. Do not
build an aggregation page of other channels' videos (little unique value, sends users to YouTube,
heavy embeds, videos get taken down). Instead: a creators program later (YouTubers and streamers get
a playlist link and a live room; their description links back), and our own short clips of the game.

## 5. New ways to play (W4, after W2; designs in the v12 prototype)

### 5.1 Name them all (view `nta`)
- Name every member (or every title track) in 60 seconds. Input with Enter, slots reveal as found,
  accepted spellings: romanizations, stage and birth names, Hangul, 1-letter typos on names of 5+
  letters. Give up reveals the rest. Result: found/total, time, share card, "fans who got all 8".
- Never publish "most forgotten member" style stats (fans read it as an insult). Only positive
  aggregates ("named first most often").
- Data: reuse `name_all_member_results` (do not drop it), sets per group from the members data.
- URL: `/stray-kids-name-all-members` style pages later, indexable, one per group with members data.

### 5.2 Which member are you (view `wma`)
- 8 picture-free questions, big answer cards, no timer. Result describes the player, then links to the
  member only through their public role (leader, producer, main dancer...). No invented personal facts.
- Result: member name, 3 traits, share of fans with the same result, full distribution, share card
  (story 1080x1920 and square), "Set <member> as your bias tag" (identity flair), retake.
- Data: reuse `personality_questions`, `personality_profiles`, `personality_results` (do not drop).
- URL: `/which-stray-kids-member-are-you` (the exact search phrase), one per group with a profile set.
  Today `next.config.ts` 301s `/which-:group-member-are-you` to the group hub (REFONTE P1): W4 removes
  that redirect only for the groups it relaunches.

### 5.3 This or that bonus + Fans picked
- After a quiz result, an optional bonus card: two songs of that group (title + year, Deezer cover),
  tap one, see the split, up to 5 pairs in a row. Songs and eras only, never member against member.
- Group page section "<Fandom> picked": top 10 songs from the votes (Bradley-Terry or Elo), vote count,
  weekly movement, "Vote" opens the pairs.
- Data: reuse `duel_questions` / `duel_votes` (75,191 votes, do not drop; export before any cleanup).
- Anti-abuse: one vote per pair per anon id per day, voter hash only.

### 5.4 Fans create
- Empty group page (0 quizzes, e.g. RIIZE, ZEROBASEONE, BOYNEXTDOOR, NCT DREAM): "No RIIZE quiz yet.
  Be the first." Real signals only (songs ready in the blindtest, plays on the group blindtest), what
  the first creator gets (name on the page, badge, play alerts), 3 templates, Create prefilled.
- Thin group page (1 to 2 quizzes, e.g. KATSEYE: 211 plays in 60 days on its only quiz): a nudge row
  "Make the second KATSEYE quiz".
- Share kit after publish: link, QR, story image, captions with the fandom name, a challenge link,
  live counter of plays from the creator's link.
- Creators board `/creators`: this month and all time, plays from unique players (own plays excluded),
  rising creator per fandom, creator badges (existing tiers), rules shown on the page.

### 5.5 Live blindtest (view `livegame` and the phone frame)

Blindtest only. The live quiz is parked (owner, 2026-09-29): no quiz option in the setup, no "Host live"
button on quiz results. Nothing of this mode exists in the codebase today (checked 2026-09-29); the
prototype simulates players with timers.
- One screen hosts (TV, laptop, stream), everyone plays on their phone. Join by QR or code at
  kpopquiz.org/join. No account needed to join; nickname filter; host can remove a player.
- Audio plays on the host screen only (no sync problem, one preview stream). Phones show 4 colour +
  shape answers.
- Points: right answer 500 + 500 x (1 - t/T), rounded to 10; streak bonus +100 from the 3rd right answer
  in a row, capped at +300; wrong or no answer 0 and the streak resets. Leaderboard after every round,
  podium at the end, "Play again", sign-in to keep the score.
- Tech: `live_rooms`, `live_players`, `live_answers` tables, Supabase Realtime broadcast per room,
  answers through an API with server timestamps (no client clock trust), host tab is the clock.
- Done means proven, not assumed: a load test with scripted phones (50 per room, several rooms at once)
  on a preview, a host that reloads mid-game, a phone that drops and rejoins, late answers rejected by
  server time, two players with the same nickname, a room that expires. Supabase
  Pro allows 500 concurrent realtime connections and 500 messages/s by default (about 20 rooms of 25
  players); raise the cap before promoting it to streamers. Rooms expire after 2 hours.
- Why: every room brings new players who scan the QR (classrooms, K-pop clubs, fan meetups, Discord and
  Twitch watch parties). Competitors exist (Blinest K-pop rooms, Blindtest.gg, Kahoot K-pop kahoots),
  none is K-pop only with 4,120 songs and group playlists.

### 5.6 Editorial accounts and scheduled seeding (owner, 2026-09-29)

Goal: the community never looks empty at launch. A few named team accounts open topics and publish blogs on a
schedule; real fans reply, vote and like. The owner checks every item before it goes live.
- Identity: 3 to 5 editorial accounts with their own name, initial avatar and a beat (for example Mina: girl
  groups, Jae: boy groups, Sol: charts and data). They always show the Team badge next to the name (feed, post,
  profile, notifications, search) and, on the post and the profile, one line: "Editorial account of the KpopQuiz
  team. Topics and blogs are written by the team and checked before they go live." (prototype: community feed,
  second post, and `openPost('team')`). They never pose as ordinary fans: no level, no fandom flair.
- Accounts: created by the owner himself (normal sign-up or the Supabase dashboard, his own mail aliases). No agent
  creates an account or handles a password. An `editorial_accounts` table (user_id, display_name, beat, active)
  marks them; the owner inserts the rows through a pending SQL file with the ids he gives.
- What they do: create topics (threads), fan debates and blogs. Nothing else: no replies, likes, votes, follows,
  challenges, quiz plays; no XP, streak, badge; excluded from every leaderboard, the creators board, Fans picked,
  counts of "fans" and the live ticker.
- Pipeline: `editorial_drafts` (id, account_id, kind thread|debate|blog, group_id, title, body, options for a
  debate, sources, scheduled_at, status draft|approved|published|rejected, created_by, reviewed_by, reviewed_at,
  published_ref). Drafts come from templates fed by real data (weekly recap: hardest song of the week, top
  scores, This or that splits; comeback topics from the release calendar) and from the owner. `/admin/editorial`:
  queue, preview rendered exactly like the post, edit, approve with a date, reject. A Vercel cron every 15 minutes
  publishes approved drafts whose time has come through the same write path as a fan post, marked editorial.
  Nothing publishes without `reviewed_by` = an admin. At most 3 items a day, never two in a row from one account.
- Blogs follow the existing blog review (decision 27) and stay noindex while /community is noindex. No invented
  facts: every factual line of a blog cites a source in `sources`.

## 6. Isolation between W2 and W3 (superseded 2026-09-29: W2 is finished, v12 runs alone on main)

- The main checkout (`KpopQuizzV2/`) is on W2's integration branch `feat/ux-v1-v11`, and W2's agents
  live in `KpopQuizzV2/.claude/worktrees/agent-*` on `ux11/*` branches. W3 works only in its own git
  worktree (`../KpopQuizzV2-w3`) on `feat/growth-w3` created from `origin/main`. It never runs git in the main checkout or in W2's worktrees, never checks out, stashes,
  resets, rebases or deletes any W2 branch (`feat/ux-v1-*`, `ux11/*`), never prunes worktrees, never
  runs `git gc`.
- W3 never edits a path listed in `docs/design/ux-dashboard-v1/v11/OWNERSHIP.template.json` (W2).
  Its own globs are in `W3-OWNERSHIP.json`; its guard rejects anything else.
- W3's worktrees: `../KpopQuizzV2-w3`, `../KpopQuizzV2-w3-agents/<id>` (created by hand, never under
  `KpopQuizzV2/.claude/worktrees/`), `../KpopQuizzV2-w3-base` (a copy of main for the SEO diff). Only
  `feat/growth-w3` is pushed (one Vercel preview); agents never push.
- W3's tests stub every existing write endpoint (plays, daily submit, challenges, likes, comments) so the
  shared test user's daily try and XP stay untouched for W2's checks.
- W3 uses ports 3031 to 3035 for its local builds (W2 uses 3021) and its own `.next` in its worktree.
- This package folder is listed in `.git/info/exclude` (local only) so W2's `git status` stays clean;
  W3 commits it with `git add -f`.
- DB: additive only, owner-applied. W3 never changes a row W2's data guard watches (profiles, plays,
  badges, likes, comments...).
- Handoff: W3 writes `docs/growth/W3-HANDOFF.md` (what W2 must call: `trackBtRun()`, the score view,
  live counts). The owner forwards one message to W2 (in the W3 prompt).

## 7. KPIs (read on /admin/blind-tests/runs and Search Console)
Blindtest runs per day, completion rate, runs per player per week, share of runs by source (landing
languages), landing CTR in Search Console, playlists that become playable, quizzes created on empty
group pages per week, live rooms per week and players per room.
