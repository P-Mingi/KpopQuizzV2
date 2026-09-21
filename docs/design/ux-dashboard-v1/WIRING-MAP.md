# WIRING MAP - every control in the prototype, what it connects to today

Prototype: `prototype.html` (v9, https://claude.ai/artifact/JRuLPzYX6SSec9A4QHTYBT). Spec: `DESIGN-SPEC.md`.
Repo facts below were read from `apps/quiz/src` on 2026-09-21 (routes, API, lib, tables). Nothing here is
guessed: every "EXISTS" names the file or endpoint; every "NEW" is work the worker has to do, and it says
which table or endpoint to build on.

Status legend
- EXISTS: the function is live today, the new UI only re-skins it. Reuse the component or endpoint named.
- PARTIAL: the backend exists but the UI or a piece of logic is missing. The gap is spelled out.
- NEW: nothing exists. Table / endpoint / component to create is spelled out. No DDL without owner go.
- DEAD: exists in the DB or code but nothing uses it. Decide reuse or drop.

Phase 0 of the worker mission is to VERIFY this map (grep, open each file, run each endpoint) and return
the corrected map before writing UI.

---------------------------------------------------------------------------------------------------

## 0. Shell (every page)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Sidebar Dashboard | `/` `app/(site)/page.tsx` | EXISTS | Link |
| Sidebar Quizzes + count 419 | `/quizzes` (`components/quiz/browse-quizzes.tsx`), count = published quizzes (`lib/db/queries/quizzes.ts`) | EXISTS | Link + count query |
| Sidebar Blindtest | `/blindtest` | EXISTS | Link |
| Sidebar Community | `/leaderboard` today points at community-ish content; the new Community page is NEW (see 7) | NEW | New route `/community` |
| Sidebar Leaderboard | `/leaderboard` (`components/community/fandom-war-map.tsx`, `top-creators-tabs.tsx`) | EXISTS | Link |
| Sidebar Create | `/create` (`components/create/create-funnel.tsx`) | EXISTS | Link |
| Sidebar user row (name, streak) | `/me`, streak from `lib/streak.ts` + `/api/daily/streak` | EXISTS | Link + streak value |
| Top search | `/search` page + `GET /api/search`, `GET /api/quizzes/search` (`components/home/search-bar.tsx`) | EXISTS | Same component, new skin, results dropdown = NEW UI |
| Streak pill "12 days" | `daily-streak.ts`, `GET /api/daily/streak`, guest streak `lib/guest-streak.ts` | EXISTS | Same value |
| Night mode toggle | none | NEW | `data-theme` on `<html>`, tokens in `lib/design-tokens.ts` + globals; persist in localStorage + `profiles` pref later; default = system |
| Bell + unread dot | `/notifications` + `GET /api/notifications` (unreadCount) | EXISTS | Link + count |
| Avatar button | `/me` | EXISTS | Link |
| Mobile bottom nav (5) | current bottom bar (Home, Quizzes, Blindtest, Community, Search/Create/Sign in) | EXISTS | Rebuild with 5 tabs: Home, Quizzes, Blindtest, Social, You |
| Footer links | all exist: `/quizzes`, `/quizzes/popular-this-week`, `/trivia`, `/blindtest`, `/leaderboard`, `/stats`, `/data/pulse`, `/data/knowledge-report-2026`, `/articles`, `/news`, `/create`, Reddit, Discord, `/about`, `/faq`, `/contact`, `/terms`, `/privacy`, `/dmca`, `/pt` | EXISTS | Links |
| UX notes drawer | prototype only | drop | - |

## 1. Dashboard (/)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Greeting "Good evening, Mingi" | `profiles.username` via `GET /api/auth/me`; guest = "Good evening" | EXISTS | server render |
| Hero "Today's Ten" daily challenge | `/daily` route + `daily_challenges` + `components/home/quiz-of-the-day.tsx` / `home-qotd.tsx` (QOTD is a quiz, not a 10-question mix) | PARTIAL | Hero = quiz of the day (existing). "Today's Ten" as a 10-question cross-group set is NEW (would use `quiz_bank` or `daily_challenges.questions`). Ship QOTD first. |
| "Play now" | `/q/{qotd slug}` | EXISTS | Link |
| "Daily blindtest" | `/blindtest?daily=1` (`home-btotd.tsx`, `daily_blindtests`) | EXISTS | Link |
| Keep playing (resume rows, progress %) | none: plays are recorded at the end only (`POST /api/quiz/[id]/play`); no in-progress state server-side. `lib/create-draft.ts` pattern exists for drafts | NEW | localStorage "in-progress" per quiz (questionIndex, answers) written by quiz-player; rows read client-side. Server sync later. |
| Keep playing stats (streak, best BT, rank) | streak EXISTS; best BT = `daily_blindtest_scores` best for user (EXISTS in `/api/daily/blindtest/leaderboard` shape) ; rank = weekly players rank (`lib/weekly-leaderboard-padding.ts`, `/leaderboard`) | PARTIAL | One small `GET /api/passport/summary` returning the 3 numbers |
| Groups of the moment rail (NEW badge) | `components/home/home-group-rail.tsx` + `groups.quiz_count`; NEW = `groups.created_at` recent or `lib/db/queries/group-freshness.ts` | EXISTS | Same data, new chip |
| Trending this week grid + arrows | `/quizzes/popular-this-week` (`lib/db/queries/popular.ts`), `home-trending-card.tsx` | EXISTS | Same query, 4 cards, arrows page the list |
| New quizzes grid | `/new` page (`quizzes.created_at desc`) | EXISTS | Same query |
| All time best grid | `quizzes.play_count desc` (`popular.ts`) | EXISTS | Same query |
| From the community (3 rows) | Happening now (`getHappeningNow`), community comments (`getCommunityComments`) | PARTIAL | Rows come from the NEW posts feed once it exists; until then show happening-now events |
| Blindtest panel (Classic, Daily, By group) | `/blindtest`, `/blindtest?daily=1`, `/blindtest?playlist=group` | EXISTS | Links |
| Quiz card (any) | `components/quiz/quiz-card.tsx` -> `/q/{slug}` | EXISTS | Re-skin `quiz-card.tsx`; cover = `quizzes.cover_image_url` else group photo `public/idols/{Group}.jpg` (`GroupLogo` fallback logic in `components/group`) |

## 2. Quizzes browse (/quizzes)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Sort tabs Trending / Newest / Most played / Top rated | `browse-quizzes.tsx` + `quiz-filters.tsx`, `GET /api/quizzes?sort=` | EXISTS | Same params |
| Type chips (5) | `quiz_type` filter in `GET /api/quizzes` | EXISTS | Same |
| Level chips | `difficulty` filter | EXISTS | Same |
| Group rail | `browse-group-select.tsx`, `GET /api/quizzes/group` | EXISTS | Same, chips instead of select |
| Infinite grid | `components/home/infinite-quiz-list.tsx` | EXISTS | Same |
| SEO landing pages (`/easy-kpop-quizzes`, `/hard-kpop-quizzes`, `/kpop-true-or-false`, `/most-liked`, `/new`, `/trending`, `/quizzes/popular-*`) | exist | EXISTS | Keep as URLs; they render the same browse component with the filter preselected (no dead ends) |

## 3. Quiz page (/q/[slug])

| Control | Today | Status | Wire to |
|---|---|---|---|
| Breadcrumb Quizzes > Group > quiz | `app/(site)/q/[slug]/page.tsx` | EXISTS | Same |
| Cover, tags (type, difficulty, language) | `quizzes.cover_image_url`, `quiz_type`, `difficulty`, `language` | EXISTS | Same |
| Title H1 | `quizzes.title` | EXISTS | Same |
| Author row + level title | `profiles` + `lib/level-titles.ts` | EXISTS | Same |
| Follow | `POST /api/follow` (`follows` table) | EXISTS | Same endpoint |
| Meta: plays, questions, 15s per question, likes | `play_count`, `question_count`, `settings.timer_seconds`, `like_count` | EXISTS | Same |
| Start quiz | `quiz-player.tsx` (client, same page) | EXISTS | Same component |
| Challenge a friend (battle link) | `battles` table exists; written today only by `POST /api/game/[id]/play` (games). Quiz battles: `docs/pending-migrations/154_battle_challenge_notification.sql` pending, `battle_beaten` notification type declared | PARTIAL | `POST /api/quiz/[id]/battle` (creates battles row with question_ids + challenger score) + `/b/{code}` route that opens the quiz with the frozen questions; needs mig 154 applied by owner |
| Share Reddit / Discord / X / copy | `components/share/*`, `POST /api/share/generate`, `/api/share/reddit-image`, `/s/[code]` redirect + `/api/share/click/[code]` | EXISTS | Same |
| About text (avg %, perfect count) | generated in `q/[slug]/page.tsx` (socialProof) from `quiz_time_stats` + `total_score_sum/total_completions` | EXISTS | Same |
| In this quiz (sample questions, answers hidden) | `GET /api/quiz/[id]/questions` / server render | EXISTS | Same, show 3 |
| Did you know + "Learn before you play" | `lib/trivia`, `/{group}-trivia` (`lib/db/queries/trivia.ts`) | EXISTS | Same |
| More group quizzes | `GET /api/quiz/[id]/related` (`related-quizzes.ts`) | EXISTS | Same |
| Stats card (6) | `GET /api/quiz/[id]/stats` + `GET /api/quiz/[id]/time-stats` (`quiz-stats-block.tsx`) | EXISTS | Same |
| Hall of fame top 5 + times | `quiz-hall-of-fame.tsx` (`plays` + `quiz_time_stats`) | EXISTS | Same |
| Your best + Beat it | `GET /api/quiz/[id]/my-rank` (`quiz-my-rank.tsx`) | EXISTS | Same |
| Made by card | profile query | EXISTS | Same |
| Report | `POST /api/quiz/[id]/report` (`report-form.tsx`) | EXISTS | Same |
| Owner actions (edit) | `quiz-owner-actions.tsx`, `/quiz/[id]/edit`, `POST /api/quiz/[id]/edit` | EXISTS | Keep, shown only to the creator |

## 4. Quiz in-game (quiz-player.tsx, playing phase)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Quit | `dispatch RESET` | EXISTS | Same |
| Group tag, progress, counter, score pill | state in quiz-player | EXISTS | Same |
| Sound toggle | `lib/sounds.ts` (mute flag) | PARTIAL | expose the mute toggle in the top bar (today it is in settings "Sound effects") |
| Streak dots + fire badge | `progressResults`, streak computation in quiz-player | EXISTS | Same |
| Timer ring 15s warn/danger | `timer_seconds`, ring in quiz-player (`timer-circle.tsx`) | EXISTS | Same, keep on screen after answer (frozen state = NEW CSS only) |
| Answers A-D, correct/wrong/dimmed | `answer-button.tsx`, `handleAnswer` | EXISTS | Same |
| Image / intruder / clues variants | `image-question.tsx`, `intruder-question.tsx`, clue controls | EXISTS | Same |
| Fun fact card | `question.fun_fact` | EXISTS | Same |
| Next / See results | `handleNext` | EXISTS | Same |
| Keyboard 1-4 / Enter | none | NEW | keydown handler in quiz-player |
| Per-question times | `plays.per_question_times` via `POST /api/quiz/[id]/play` (`record_play` RPC) | EXISTS | Same |
| Animations (pulse, shake, pop) | `animate-question-in` exists; others NEW | PARTIAL | CSS only, `prefers-reduced-motion` guard exists |

## 5. Quiz results (quiz-player.tsx, result phase)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Photocard (score count-up, bar, percentile, mascot, verdict, serial) | exists in quiz-player (`RollingNumber`, `Mascot`, `getResultLabel`) | EXISTS | Re-skin only |
| Confetti on pass | `lib/confetti.ts`, `lib/celebrate.ts` | EXISTS | Same |
| Share this card | `handleShare` + `POST /api/quiz/[id]/share-card` | EXISTS | Same |
| Play again | `/quizzes` | EXISTS | Same |
| Discord line / Brag | `DiscordResultsLine`, `BragButton` (`/api/discord/flex`) | EXISTS | Same |
| Run ledger You/Avg/Pass/XP/Time | `ledgerCells` in quiz-player (`avgScorePct`, `passRate`, `xpEarned`, `timeTaken`) | EXISTS | Same |
| Your rank on this quiz | `quiz-my-rank.tsx` | EXISTS | Same |
| Like | `POST /api/quiz/[id]/like` (`like-quiz-button`) | EXISTS | Same |
| Saved to passport / Put my name on it | `claim-run.tsx`, `POST /api/claim-runs`, `POST /api/passport/merge-anon` | EXISTS | Same (guest sees claim, signed-in sees saved) |
| Level up overlay | `level-up-overlay.tsx` | EXISTS | Same |
| Keep playing list | `relatedQuizzes` (`GET /api/quiz/[id]/related`) | EXISTS | Same |
| Share row | `QuizShareRow` | EXISTS | Same |
| Comments (200 chars, score chip) | `quiz-comments.tsx`, `POST /api/quiz/[id]/comment` (`quiz_comments`) | EXISTS | Same |
| Reactions | `quiz-reactions.tsx`, `POST /api/quiz/[id]/react` | EXISTS | Keep (not drawn in the proto, place under the like) |
| Beat my score (battle link) | see 3 | PARTIAL | Same battle endpoint |
| Streak backup nudge | `streak-backup.tsx` | EXISTS | Keep |
| Report | `report-form.tsx` | EXISTS | Same |

## 6. Create (/create, create-funnel.tsx, 4 steps -> 3 visible + done)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Autosave chip | `lib/create-draft.ts` (localStorage draft + step) | EXISTS | Show the saved-at time |
| Stepper 1/2/3 | `cf-progress` dots (4 steps) | EXISTS | Same state, new visual |
| Title (5+) + counter | `MIN_TITLE`, `POST /api/quiz/title-check` | EXISTS | Same |
| About 280 | `cf-input` | EXISTS | Same |
| Quiz type cards (5) | Q-B6 in create-funnel | EXISTS | Same |
| Group search with chip | `components/create/group-picker.tsx` (91 groups, custom group request -> `pending groups` admin) | EXISTS | Same |
| Difficulty segments | `difficulty` | EXISTS | Same |
| Language | `language` | EXISTS | Same |
| Cover + rights checkbox | `compressImageToDataUrl`, `POST /api/quiz/upload-image`, `coverRights` | EXISTS | Same |
| Start adding questions | `setStep(2)` | EXISTS | Same |
| Question list (drag, expand, duplicate, delete) | `question-list-editor.tsx` (drag to reorder, duplicate, delete) | EXISTS | Same, one row open at a time = UI only |
| Answers with circle marker, TF, clues, image labels | `question-list-editor.tsx` | EXISTS | Same |
| Fun fact | field exists | EXISTS | Same |
| Add an image per question | `qle-imgpick` | EXISTS | Same |
| Add a question | exists | EXISTS | Same |
| Paste several at once | none | NEW | client-side parser: blocks of 5 lines (question + 4 answers, first = correct) -> questions; no backend |
| Preview | none | NEW | render quiz-player in preview mode with local questions (no play recorded) |
| Done -> Publish step | step 3 | EXISTS | Same |
| Checklist (title, type, group, 3+ complete, cover, fun facts) | `cf-reqs` text | PARTIAL | Compute the 6 booleans from the same validation (`lib/quiz-validation.ts`) |
| How it will look (card preview) | none | NEW | render `quiz-card.tsx` with the draft |
| Publish | `POST /api/quiz/create` (`MIN_QUESTIONS = 3`), guest -> claim username (`/api/auth/check-username`, `/api/auth/create-profile`) | EXISTS | Same |
| Save as draft | localStorage draft only | EXISTS | Same (server drafts = `quizzes.status='draft'` exists in schema, optional) |
| Done state: URL, Copy, Open, Post a challenge | published slug from create response; "Post a challenge" -> community editor (NEW, see 7) | PARTIAL | URL + Open exist; challenge post is NEW |
| Creator XP | `award_xp` on publish + `creator_notifications` milestones | EXISTS | Same |

## 7. Community (/community) - the social layer (posts do not exist yet)

| Control | Today | Status | Wire to |
|---|---|---|---|
| New post composer + 4 modes | none | NEW | Tables from DESIGN-SPEC 12.5: `posts`, `post_replies`, `post_reactions`, `debate_options`, `debate_votes`. Endpoints: `POST /api/posts`, `GET /api/posts?tab=&group=`, `POST /api/posts/[id]/reply`, `POST /api/posts/[id]/react`, `POST /api/posts/[id]/vote`. RLS on all. NOTE: `verse_threads` / `verse_discussions` exist but are Verse; do not reuse. |
| Tabs For you / Following / Trending / Blogs | none | NEW | `GET /api/posts?tab=` (following uses `follows`) |
| Group chips | `groups` | EXISTS | filter param |
| Thread / Blog / Debate / Challenge cards | none | NEW | posts rows; challenge card links a `plays` row score + quiz |
| Post view + comments (nested 1 level) | none | NEW | `post_replies.parent_id` |
| Editor modal (title, text, image, group, topic, mode extras) | none | NEW | `POST /api/posts`; image via `POST /api/quiz/upload-image` (reuse the uploader, 10 MB cap) |
| Your standing (level, xp) | `lib/passport.ts`, `lib/level-titles.ts` | EXISTS | Same |
| Daily debate (vote, results) | `components/community/daily-debate.tsx`, `POST /api/debate/vote`, `GET /api/debate/me`, `daily_debates`, `debate_votes` | EXISTS | Same |
| Today (QOTD + BToTD) | `today-strip.tsx`, `daily-ritual.tsx` | EXISTS | Same |
| Live rooms + chat drawer | none for text rooms. `party_rooms` / `party_players` exist (Realtime enabled, mig 059) for blindtest party, unused | NEW | `rooms`, `room_messages` (spec 12.5) with Supabase Realtime; or reuse `party_rooms` naming. Owner call. |
| Happening now | `happening-now.tsx`, `GET /api/activity/recent` (`activity_events`) | EXISTS | Same |
| Fandom war (top 3) | `fandom-war-map.tsx`, `getGroupWarRank` (`group-hub.ts`) | EXISTS | Same |
| Badge watch | `getLatestBadgeEarns` (`user_badges`) | EXISTS | Same |
| Community pulse (live, plays, quizzes, groups) | `GET /api/stats/live`, `getCommunityStats` | EXISTS | Same |
| Cheer (heart on an event) | `cheer-button.tsx`, `POST /api/cheer` (`activity_cheers`) | EXISTS | Same |

## 8. Group hub (/{slug}-quiz, group-quiz-page.tsx)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Breadcrumb, H1, intro paragraph | `group-quiz-page.tsx` (`buildGroupFaqs`, `groups.seo_intro` or generated) | EXISTS | Same text, same server render (SEO) |
| Photo hero | `public/idols/{Group}.jpg` when present, else `display_color` tile | EXISTS | Same asset rule |
| Play the top quiz | first quiz by play_count | EXISTS | Link |
| Blindtest N songs | `/blindtest?playlist={slug}`; song count from `blind_test_songs` by group (`lib/db/queries/blindtest.ts`) | EXISTS | Same |
| From the community (3 rows) + composer | NEW posts feed filtered by group (see 7); until then, `getCommunityComments` for the group | PARTIAL | `GET /api/posts?group=` |
| Facts strip (gen, members, debut, label, quizzes, plays) | `groups.generation`, member count (`lib/db/queries/groups.ts` / idols), `inception_date`, `record_label`, `quiz_count`, `total_plays` | EXISTS | Same fields; hide a tile when the field is null (fact-gated like the FAQ) |
| Updated month | `groups.updated_at` / latest quiz | EXISTS | Same |
| Tiles quizzes / blind test | links | EXISTS | Same |
| Sort tabs Popular / Newest / Most liked / Hardest | today on the page | EXISTS | Same |
| Type + level chips | `GET /api/quizzes?group=` filters | EXISTS | Same |
| Quiz grid (avg %, likes) | `quiz_count` list, `like_count`, avg from `total_score_sum` | EXISTS | Same |
| Show all N | pagination | EXISTS | Same |
| FAQ (fact-gated, 2 columns) | `buildGroupFaqs` | EXISTS | Same content, new layout, keep FAQ JSON-LD |
| Learn before you play (trivia) | `/{slug}-trivia` | EXISTS | Link |
| Fandom war line | `getGroupWarRank` | EXISTS | Same |
| Make a group quiz | `/create?group={slug}` | EXISTS | prefill group in create-funnel (NEW param) |
| Live room panel | see 7 | NEW | rooms |
| Verse links | `verse_spaces` | drop from this page | - |

## 9. Passport (/me, /u/[username]) and Settings (/settings)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Header (theme, avatar, name font/colour, level title, meta) | `lib/passport-themes.ts`, `lib/passport-flair.ts`, `profiles`, `lib/level-titles.ts` | EXISTS | Same |
| XP bar | `profiles.xp` | EXISTS | Same |
| Stats (streak, mastered, quizzes made, plays received) | `lib/passport.ts`, `player_group_mastery`, `GET /api/quizzes/user` | EXISTS | Same |
| Tabs Overview / My quizzes / My posts / Mastered / Settings | ProfileTabs exists (Overview, quizzes, badges); My posts NEW (posts) | PARTIAL | My posts once 7 exists |
| Badge shelf + tiers | `lib/badges.ts`, `user_badges`, `badge_definitions` | EXISTS | Same |
| Recent activity | `activity_events` | EXISTS | Same |
| Settings form (all fields) | `/settings`, `POST /api/auth/update-profile` | EXISTS | Same |
| Preferences: sound, email on replies | sound = `lib/sounds.ts` mute; email = NEW (`notification_prefs` has categories, no email channel) | PARTIAL | add `email_weekly_recap` to `notification_prefs` |
| Appearance System / Light / Dark | none | NEW | see Shell |
| Public passport `/u/[username]` | exists | EXISTS | Same |

## 10. Leaderboard (/leaderboard)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Fandom war podium + board + weekly delta | `fandom-war-map.tsx`, `getGroupWarRank` (delta exists) | EXISTS | Same |
| Your fandom card | ult groups from `profiles` | EXISTS | Same |
| How points work | copy only; confirm the real rule in `lib/db/queries/community.ts` before writing it | PARTIAL | text |
| Last weeks | none | NEW | weekly snapshot (`passport_group_snapshots` exists, check content) |
| Players tab | `weekly-leaderboard-padding.ts`, `top-creators-tabs.tsx` | EXISTS | Same |
| Creators tab | `getRisingCreators`, `creator-leaderboard.tsx` | EXISTS | Same |
| Streak leaders | `profiles` streak | EXISTS | Same query |

## 11. Notifications (/notifications)

| Control | Today | Status | Wire to |
|---|---|---|---|
| List grouped by day, unread state | `notifications-center.tsx`, `GET /api/notifications?limit=&offset=` (`NotificationRow`) | EXISTS | Same, group by day client-side |
| Tabs = 5 categories | `NOTIFICATION_CATEGORIES` in `lib/notification-types.ts` | EXISTS | filter client-side (or add `?category=`) |
| Row icon per type | 12 types in `NOTIFICATION_TYPES` | EXISTS | icon map |
| Row link | `quiz_slug`, `link_url` | EXISTS | Same |
| Mark all read | `POST /api/notifications/mark-read` | EXISTS | Same |
| Per-row read on click | same endpoint with id | EXISTS | Same |
| Category toggles | `GET/POST /api/notifications/prefs` (`notification_prefs`) | EXISTS | Same |
| Streak at risk card | streak + `daily-played.ts` | EXISTS | Same |
| Weekly recap email toggle | none | NEW | pref column + Resend job (owner has Resend) |
| Unread badge in topbar | `unreadCount` | EXISTS | Same |
| `battle_beaten` type | declared, needs mig 154 | PARTIAL | owner applies the migration |

## 12. Blindtest hub (/blindtest)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Setup: playlist All / By group (multi) / Girl / Boy / Generation; rounds 5-10-15 | `blindtest-game.tsx` setup phase, `POST /api/blind-test/generate` (playlist, groups[], count, mode, difficulty), `lib/blind-test-playlists.ts`, `lib/blind-test-modes.ts` | EXISTS | Same |
| Your stats (rank title, best, combo, streak) | `bt_players` (rank_title, rank_level, best_score, best_combo, current_streak) + RPCs `update_player_rank`, `award_bt_xp` (mig 052/059) | DEAD | Tables and RPCs exist, nothing writes them: `POST /api/blind-test/play` writes `blind_test_plays` and calls `award_xp` (profile XP). Wire: on play submit, upsert `bt_players` + insert `bt_plays`, call `award_bt_xp` then `update_player_rank`. Rank titles: trainee, rookie, debut, idol, star, superstar, legend (XP 0/500/1500/3000/6000/12000/25000). |
| Quick play | `mode=quick` | EXISTS | Same |
| Blindtest of the day + board | `GET /api/daily/blindtest`, `POST /api/daily/blindtest/submit`, `GET /api/daily/blindtest/leaderboard` (RPCs `ensure_daily_blindtest`, `submit_daily_bt_score`, `get_daily_bt_leaderboard`) | EXISTS | Same |
| Ranked | `ranked_plays` table exists (mig 059), no code | NEW | see 14 |
| Challenge a friend | `challenges` + `challenge_attempts` tables exist (short_code, frozen questions, expires_at), no code | NEW | `POST /api/blind-test/challenge` (after a run: store questions payload + creator score, return short_code), `/bt/c/[code]` page (plays the frozen set), `POST /api/blind-test/challenge/[code]/attempt`; "challenges waiting" = attempts where I am invited (needs an `invitee` or is public by link) |
| Live rooms (Soon) | `party_rooms`, `party_players` (Realtime) exist, no code | NEW, phase 3 | later |
| Today's board | daily leaderboard RPC | EXISTS | Same |
| Your recent runs | `blind_test_plays` by user (today), `bt_plays` after wiring | PARTIAL | `GET /api/blind-test/runs` |
| Playlists (title tracks, b-sides, recent, legends, 4th gen gg/bg, solo, speed) | `lib/blind-test-playlists.ts` + `blind_test_songs.is_title_track / year / gender / generation`; Speed round = clip_duration 5 (`daily_challenges.clip_duration` shows the field exists) | EXISTS (verify each id in blind-test-playlists.ts) | Same ids |
| How scoring works | today: 1 point per correct. Speed + combo = NEW | NEW | server-side scoring in `/api/blind-test/play` (needs `time_ms` per answer: `challenge_attempts.song_results` shape already has it) |
| Blindtest by group rail | groups with songs (`blindtest.ts` queries) | EXISTS | Same |
| How it works, FAQ | on page today | EXISTS | Same |
| Removed: Intro, Lyrics modes | `blind_test_songs.clip_intro` exists but the mode is not offered | drop | - |

## 13. Blindtest in-game and results (blindtest-game.tsx)

| Control | Today | Status | Wire to |
|---|---|---|---|
| Quit, progress, counter | exist | EXISTS | Same |
| Points pill + combo | score exists (correct count); points/combo NEW | NEW | client computes for display, server recomputes on submit |
| Orb: ring 10s, equaliser, seconds, danger | `bt-orb`, `bt-eq`, `TIMER` | EXISTS | Same |
| Playing clip / Loading clip | `use-audio-player.ts` (Deezer preview via generate) | EXISTS | Same |
| Song round / Artist round badge, question | `q.question_type`, `q.question_text` | EXISTS | Same |
| Choices 4 + marks | `pick(i)` | EXISTS | Same |
| Reveal (cover, title, artist, album) | `q.reveal` | EXISTS | Same |
| Points pop, combo badge | NEW | NEW | CSS + client state |
| Auto-next 3s + Skip | auto-advance exists in reveal phase | PARTIAL | add the Skip button |
| Keyboard 1-4 | none | NEW | keydown |
| Results: mascot, score, label, points, combo, avg answer, XP, today rank | `scoreLabel()`, mascot, `time_ms` per answer exists (N4), XP from `/api/blind-test/play` | PARTIAL | add points/combo/avg from the run |
| Challenge a friend link | see 12 | NEW | endpoint |
| Song breakdown with covers | `bt-breakdown` rows | EXISTS | Same |
| Level card (rank title, xp) | `bt_players` after wiring | DEAD -> wire | see 12 |
| Daily results: board + come back tomorrow | exists | EXISTS | Same |

## 14. Ranked (NEW product surface, /blindtest/ranked)

Everything here is NEW code on existing tables. No DDL needed except two columns (owner go):
`ranked_plays.season INTEGER` and `ranked_plays.points INTEGER` (points = speed/combo score; `score`
stays the correct count). Season config in `lib/blind-test-modes.ts` (start date, length 8 weeks).

| Control | Wire to |
|---|---|
| Play a ranked run | `POST /api/blind-test/generate` with `mode: 'ranked'`: server draws 10 songs from the whole pool, 4/4/2 by community accuracy (`blind_test_songs.times_correct / times_played`), 6 song + 4 artist rounds, ignores playlist and groups, stores the drawn set with a run id (in `ranked_plays` as a pending row or in a signed payload) |
| Submit run | `POST /api/blind-test/ranked/submit`: answers with `time_ms`; server recomputes points (100 + speed bonus 100*(1 - max(0,t-2)/8) capped at 0, x combo 1.0 + 0.1 per consecutive correct, cap 2.0); inserts `ranked_plays` (player_id, score, correct_count, total_rounds, best_combo, avg_speed_ms, song_ids, points, season) |
| Daily cap 15 | count `ranked_plays` today per player before generate |
| Quit = recorded | client submits partial answers; remaining songs scored 0 |
| Season score | SQL: sum of the 5 highest `points` per player per season (`ORDER BY points DESC LIMIT 5`), materialised nightly into a small `ranked_season_scores` view or computed in `GET /api/blind-test/ranked/me` |
| Tiers + divisions | thresholds Bronze 0, Silver 4000, Gold 6500, Platinum 8500, Diamond 10500, Master 12000; divisions = thirds of the band; Legend = top 100 by season score among Master, nightly cron (`/api/cron/*` pattern) |
| Ladder tabs Global / My fandom / Following | `GET /api/blind-test/ranked/ladder?scope=` (fandom = `profiles` ult groups; following = `follows`) |
| Your card (tier, score, best 5, progress to next) | `GET /api/blind-test/ranked/me` |
| Your ranked runs | `ranked_plays` by player, season |
| Season impact block on results | response of submit: previous score, new score, tier before/after, ladder rank before/after |
| Placement 3/5 | fewer than 5 runs this season -> show placement |
| Rewards | season end cron: `user_badges` insert (badge_definitions row per season/tier), fandom war x2 for ranked runs (in the war points query), tier colour on handle = `profiles` flair (`lib/passport-flair.ts`) |
| Rank title card (Idol, xp) | `bt_players` after wiring in 12 |

## 15. Cross-cutting

| Item | Today | Status |
|---|---|---|
| Auth gates (guest vs signed-in) | `lib/use-signed-in.ts`, `/login`, `/onboarding`, anon runs claimable | EXISTS |
| Guest play | anon_id in `plays`, `claim-runs` | EXISTS |
| SEO | every public page keeps H1, intro, FAQ, JSON-LD, canonical, `/pt` mirror, sitemap; the app shell must not turn these into client-only pages | EXISTS, protect |
| Analytics events | `lib/analytics.ts` | EXISTS, keep event names |
| Design tokens | `lib/design-tokens.ts` + globals.css; add dark tokens | PARTIAL |
| Fonts | DM Sans + Syne today; prototype uses Inter. Owner decision: the prototype's Inter is the target | decision |
| Images | `public/idols/*.jpg`, `public/mascot/*.png`, `public/logos/blackpink.svg`; never redraw logos | EXISTS |
| Sounds | `lib/sounds.ts`, `lib/haptics.ts` | EXISTS |
| Reduced motion | `reduceMotion` in players | EXISTS |
| Discord / Reddit | `/api/discord/*`, `lib/reddit-api.ts`, share images | EXISTS |
| i18n `/pt` | `lib/i18n` | EXISTS, mirror the new pages |
