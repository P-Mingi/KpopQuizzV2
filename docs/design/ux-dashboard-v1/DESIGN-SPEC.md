# UX Dashboard v1 - design spec (owner-validated prototype)

Source of truth: `prototype.html` in this folder (open it in a browser: nav, filters and views are
clickable). Screenshots: `shot-dashboard.png`, `shot-quizzes.png`, `shot-blindtest.png` (1440x900).
Scope: Dashboard (home), Quizzes browse, Blindtest, global nav shell. Community and Profile are
Phase 2, NOT in this spec. Implement pixel-per-pixel; where the prototype and this file disagree,
the prototype wins.

## 1. Direction
Game-launcher STRUCTURE (left sidebar, top search, featured hero, side "keep playing" panel, cover
card grids) with a NOTION SKIN: light warm background, Inter, hairline borders, tinted tag pills,
one pink accent. Zero emoji anywhere. Zero display font (Syne is NOT used in this design).

## 2. Tokens (CSS custom properties)
--bg:#FAF9F7  --panel:#FFFFFF  --tint:#F4F2EE  --tint2:#EFECE7
--ink:#26221D  --mut:#6F6A62  --fnt:#A6A096  --line:#ECE8E1  --line2:#E2DDD5
--pink:#E8457A  --pink-dk:#C93868  --pink-lt:#FCE8EF  --pink-md:#F7CFDD
radius: 16px cards/panels, 10px small controls, 999px pills
shadow card: 0 1px 2px rgba(38,34,29,.05) ; hover: 0 12px 32px rgba(38,34,29,.10)
font: Inter 400/500/600/700/800, base 14px, ink on bg; -webkit-font-smoothing antialiased
Type tag pills (Notion-style tints):
classic #E8F0F9/#2C5F94 - image #FBE7EF/#A03A64 - intruder #EEEBFA/#584FA8
tf #E7F2E1/#42722A - clue #FAF0DC/#8F5F1E - level #F4F2EE/#6F6A62

## 3. Shell
Sidebar 232px fixed, white, 1px right hairline. Logo = 28px pink rounded square "K" + "KpopQuiz"
(Quiz in pink). Section labels uppercase 10.5px. Items 13.5px/600, 9px 12px padding, radius 10,
hover tint, ACTIVE = pink-lt bg + pink-dk text. Order: PLAY Dashboard / Quizzes (count badge=real
published count) / Blindtest; SOCIAL Community / Leaderboard / Create. Footer: user row (avatar,
name, streak). Topbar 64px sticky blur: search pill (tint bg, focus->white+border), streak pill
(pink-lt, flame icon, "N days"), bell w/ pink dot, avatar btn. Mobile <=760px: sidebar hidden,
bottom nav 62px, 5 items (Home, Quizzes, Blindtest, Social, You), active pink.

## 4. Dashboard
Greeting h1 22px/800 + sub 13.5px muted.
Grid 1fr/330px gap 18 (stacks <=1020px):
- HERO daily: gradient 120deg #FCE8EF -> #FBEFE4 62% -> #F4EFFB, border pink-md, radius 16,
  padding 30/32, min-height 250. White "Daily challenge" pill, h1 30px/800, sub, CTA row: pink
  button "Play now" + soft white button + carousel dots (pink active 18x6). RIGHT: tilted quiz-card
  preview (white card rotate -3deg + ghost card rotate 6deg behind): QUESTION 3/10 eyebrow, question,
  2 answers (first = pink-lt "correct" style). Hidden <=1120px.
- KEEP PLAYING panel: rows thumb 44px (real group image, cover) + title 13px + sub 11.5 + 4px pink
  progress bar; hover row tint, hover play btn -> pink. Footer 3 stat tiles (STREAK highlighted
  pink-lt, BEST BT, RANK).
Sections below: "Groups of the moment" avatar rail; "Trending this week" 4-col cover cards with
arrows (next = pink filled circle); duo panels "From the community" + "Blindtest modes" rows.

## 5. Group chips (rail)
62px circle. WITH photo: group image cover-cropped, no text. WITHOUT photo: DB display_color bg +
text_color initials (exactly the existing GroupLogo fallback). fresh groups: 2px pink ring + "NEW"
pink micro-badge below; name 11.5px + "N quizzes" 10px (real quiz_count from DB).

## 6. Quiz cards
Radius 16, hairline, cover ratio 1.55 = REAL group image (public/idols/<Group>.jpg family, or DB
logo_url), bottom scrim gradient rgba(24,20,16,.28) for legibility, top-right "N plays" chip
(white 82% + blur, pink dot). Body: title 13.5px/650 2-line clamp, tag pills row (type + level).
No-photo fallback: soft duo-tone gradient + big 800 monogram at 32% ink (General K-pop = "K").
Hover: translateY(-4px) + big soft shadow.

## 7. Quizzes browse (ONE page)
h1 24px + sub. Filter panel: segmented sort (Trending/Newest/Most played/Top rated, active white +
shadow), TYPE chips (dot in type color; active = pink-lt bg + pink-md border) and LEVEL chips.
Group rail (all groups) above the 4-col grid. IA RULE: trending/most-liked/new/hard/easy/groups
remain as SEO landing URLs but the in-app browse is THIS single faceted page; facets never dead-end.

## 8. Blindtest
Hero grid 1.2/0.8: gradient #FCE8EF -> #F2EBFA 70% -> #EAF1FB, "Audio game" pill, h1 "Name the
song.", sub, pink "Play classic" + soft "Leaderboard". Right: white blur card with 7-bar pink
equalizer animation (1.05s ease-in-out loop) + 3 stats (best / rank / songs). Modes = 6 cards:
tinted 38px icon square, title 14.5, sub 12, corner tag (Hard/Daily/New). Then group rail. SEO copy
(how-it-works, FAQ) stays on the page but BELOW the fold; play is first.

## 9. Motion
View fade+8px rise .35s cubic-bezier(.2,.7,.2,1); hovers .15-.18s; toast = ink pill bottom center.
Nothing else. No parallax, no decorative loops except the equalizer.

## 10. Data contract (all values real, no lorem)
Group coin: reuse GroupLogo (logo_url -> image; else display_color/text_color initials).
Counts: quiz_count per group, published quiz total on the sidebar badge, play_count on cards
("2.3k plays"), streak/best/rank from the user. Titles = real quiz titles. Photos: the prototype
embeds public/idols group images resized 480x300 JPEG q70; production uses the originals/next-image.

## 11. Out of scope here (Phase 2, next)
Community (verse: feed/spaces/blog/chat/comments) and the unified profile ("You"). Do not invent
them from this spec.

## 12. PHASE 2 (v2, owner-validated direction) - Community, Group hub, Passport
NO Verse. Nothing from src/components/verse is used. The social layer is NEW and must be built:
threads, blogs, debates, challenges, plus one live room per group. The group hub IS the space.

### 12.1 Community page (/community, replaces the confusing Community/Fandoms/Verse trio)
Grid 1fr/300px, then a 3-column band below.
LEFT column:
- Composer panel: avatar + prompt of the day placeholder ("Today's prompt: ...") + soft "Write a
  blog" + pink "Post".
- Feed controls: segmented tabs For you / Following / Trending / Blogs + horizontal group filter
  chips (All groups active in pink-lt; then real groups).
- Feed panel: posts separated by hairlines. Every post: 32px avatar, handle + level pill
  ("Lv 9 - Stan", tint pill), subline "Type - Group - Topic - time", type tag top-right.
  Four post types, exactly:
  1. THREAD (tag tg-classic): title, body, action row (replies, reactions, follow thread), ONE inline
     reply bubble (tint) + "Reply as <user>" inline input + soft Reply button.
  2. BLOG (tag tg-intruder): 120px cover (real image) with a white category chip, title, excerpt,
     "N reads - N likes - N comments". Open to everyone. Rich editor (reuse the existing essay editor).
  3. DEBATE (tag tg-clue): question, 2-4 options as label + bar + percent (leader in pink),
     "N votes - N comments - you have not voted". Extends the daily debate; feeds Debater badges.
  4. CHALLENGE (tag tg-tf): pink score chip "9 / 10" + "Beat my score on <quiz>", reply score chips
     (bold score + handle, "+N more"), pink-lt "Take the challenge" chip.
RIGHT column, top to bottom (all existing product widgets, restyled):
- YOUR STANDING card (pink-lt bg, pink-md border): eyebrow, "Lv 7" + title "Stan 덕후", "You are
  climbing. 50% to Level 8.", xp bar.
- DAILY DEBATE panel: question, two option buttons (chosen = pink-lt), "N votes so far", countdown.
- TODAY panel: 2 tiles Quiz of the day / Blindtest of the day (eyebrow pink, title, time left).
- LIVE ROOMS panel: rows avatar (group photo) + group name + green dot "N online" + pink "Join".
- FANDOM WAR panel: rank, fandom, bar (leader pink), points; "Full board" link -> /leaderboard.
BOTTOM band (grid 1.2fr 1fr 1fr): HAPPENING NOW (live score feed rows: who + level/bias subline,
what, time, heart; anonymous rows say "Someone"), BADGE WATCH (horizontal cards: badge name, time,
handle + level), COMMUNITY PULSE (LIVE pill "13 fans playing now" + 3 stat tiles total plays /
quizzes / groups).

### 12.2 Live room (the "chat" half of "both")
One room per group. Opens as a right DRAWER (380px) over any page, never a separate route:
header (group photo, "<Group> room", green dot N online, fandom), message list (avatar, handle +
level, tint bubble; own messages right-aligned in pink-lt), input row + pink Send. Entry points:
Live rooms panel (Community), "Live room - N online" button on the hub hero, Open in the hub's
live room panel. Threads stay async and persistent; the room is ephemeral.

### 12.3 Group hub = the space (/{group}-quiz, keeps ALL of the W1-W4 SEO structure)
hubhead grid 1fr/300px: photo hero card (eyebrow "Group hub - N quizzes - fandom X", H1 "<Group>
Quiz" (the SEO H1, unchanged), anchor-led intro line, pink Play now + white "Live room - N online")
and a FROM THE COMMUNITY panel (3 rows: threads/blogs tagged with the group, then an inline
"Start a thread about <Group>" composer). Then "<Group> quizzes" 4-col cover grid (real quizzes).
Then grid: the existing fact-gated FAQ (visible dl + FAQPage schema, untouched) and a LIVE ROOM
panel preview (2 messages + input + Open). Rule: posts tagged with the group appear here; this is
how the hub becomes the fandom home without a Verse.

### 12.4 Passport (/me == /profile == /u/username), personalization KEPT
Header: holographic cover 130px (the user's header image or the default gradient), 76px photo
avatar overlapping (-38px, 4px white ring), name in the user's chosen name color + font (mono in
the example), "LV 7 - Stan" pill, meta "@handle - bias X - stan since YYYY - N followers - public
at /u/handle", soft Edit profile (opens Settings tab), xp bar + "14k / 1.6k xp - 50% to Level 8".
Stats panel: Day streak / Mastered (highlighted, "0 / 91") / Quizzes made / Plays received (real).
Tabs (real panes): Overview (Badge shelf: earned = pink-lt, locked = tint with target text;
Recent activity), My quizzes (rows: title, Published/Draft, plays, Live/Draft tag), My posts
(threads, blogs, debates by the user), Mastered (rows: group avatar, name, progress bar, percent;
"a group is mastered at 100%"), Settings.
Settings tab = the CURRENT settings form one to one, restyled: profile picture URL + remove,
profile header (image or holographic default), username, display name, bio 0/160, "How you appear
to others" preview, ult groups (max 3, pinned on passport), bias, stan since, passport theme
(Pink/Purple/Blue/Teal/Amber/Coral), name color, name font (Default/Serif/Mono), avatar (photo or
preset colour), pinned badge chips, Save changes; Preferences panel with toggles (sound effects,
email on replies). "Collection" does not exist (it was Verse); Mastered replaces it.

### 12.5 Data model v1 (no DDL before owner go)
posts(id, type thread|blog|debate|challenge, author_id, group_id nullable, topic, title, body,
cover_url, quiz_id nullable, score nullable, indexable bool, created_at), post_replies(id, post_id,
author_id, body, score nullable, created_at), post_reactions(post_id, user_id, kind),
debate_options(id, post_id, label), debate_votes(option_id, user_id), rooms(group_id),
room_messages(room_id, user_id, body, created_at, ttl). RLS on everything. Badges: Debater
(votes + debates), Writer (blogs), Helper (accepted reply), Challenger (challenges won).

### 12.6 Ideas kept for later (owner-approved direction, not v1 scope)
Auto comeback thread per debut/comeback (hooks the W2 freshness detector), weekly recap post
written by the content autopilot, "Ask the fandom" threads with an accepted answer, moderation
(report/hide, group mods later).
Screenshots: shot-community.png, shot-liveroom.png, shot-hub.png, shot-passport.png, shot-settings.png.

## 13. PHASE 2 v3 - oxygenated feed, post modes, editor, thread page, leaderboard
### 13.1 Feed cards (replaces the single stacked panel)
Each post is its own card: 16px vertical gap, padding 20/22, radius 16, hairline, 4px LEFT RAIL in
the type colour and a TYPE LABEL pill top-left (uppercase 10.5/800 on the type tint), context line
top-right ("Group - Topic - extra"). Type colours: Thread #3F7FBF/#E8F0F9, Blog #7A73C4/#EEEBFA,
Debate #C98A2B/#FAF0DC, Challenge #5E8A2E/#E7F2E1. Author row: 32px avatar, handle, level pill,
time. Title 17/750. Body 13.5 muted. Actions = pill buttons (tint), primary action = pink-lt pill.
Blog card = 2-column: 210px cover (category chip) left, content right. Debate card = options with
bars (leader pink) + Vote. Challenge card = pink score chip + title + reply score chips.
Composer = "New post" card: prompt of the day + 4 mode tiles (icon, name, one-line hint).
Controls row below the composer: segmented tabs + group chips. Right column panels spaced 20px.
### 13.2 The four post modes (product definition)
THREAD: title + text + optional image; replies (1 level of nesting), reactions, follow. Open to all.
BLOG: cover + title + long text (same simple editor, no limit) + category (Rankings, Guide, Theory,
 Comeback review, Stan story); reads/likes/comments; indexable; open to all.
DEBATE: title + optional text + 2 to 4 options + duration (1 day / 3 days / 1 week); one vote per
 user; results after voting; feeds Debater badges.
CHALLENGE: pick one of your recent quiz results (score attached) + optional message; replies carry
 the replier's score; "Take the challenge" plays the quiz. Every mode: group tag (required, or
 All groups) + topic (Comeback, Theory, Help, Ranking, Off-topic); shows on the group hub.
### 13.3 Editor (one modal, Reddit-simple)
Modal 680px: header "New post - as <user> - Lv N"; 4 mode tabs (tinted when active). Same skeleton:
Title (big input), Text (B / I / link / image mini toolbar + textarea), Add image dropzone, Group
chips (+ Search), Topic chips. Mode extras: Blog = cover dropzone on top + category chips + longer
textarea; Debate = options A-D inputs + "+ Add option" + voting duration; Challenge = text hidden,
"Pick one of your recent results" radio list with score. Footer: contextual hint + Cancel + pink Post.
### 13.4 Thread page (post view)
Back link, the post card (bigger title, full body, actions incl. Report), then a comments panel:
"N comments" + Top/New tabs, comment box (avatar + textarea + pink Comment), comments (avatar,
handle + level pill + time, text, likes/Reply), replies nested one level with a 2px left rail,
"Load N more". Right column: About this thread (group hub link + live room), More from the group.
### 13.5 Leaderboard (/leaderboard)
Tabs Fandom war / Players / Creators (real panes). Fandom war: podium (3 cards, #1 centre larger,
pink-lt gradient, group photos, points) + Full board panel (rank, avatar, fandom + group, bar,
points, weekly movement arrow green/red) + right: Your fandom card, How points work, Last weeks.
Players: ranked users with level/fandom + your row pinned (pink-lt) + Your rank card + streak
leaders. Creators: ranked by plays received + your row + most played this week.
NOTE: "How points work" rules in the prototype are illustrative; confirm the real scoring rules
before implementing the copy.
Screenshots: shot-community.png, shot-editor.png, shot-post.png, shot-leaderboard.png.

## 14. v8 - dashboard rows + footer, quiz page, in-game, results, creation, blindtest product, motion
Prototype views: #home (rows + footer), #quiz, #play, #end, #create, #blindtest, #btplay, #btend.
Every number on these screens is real or derived from a real row (see 14.9). Section 8 (old
blindtest) is superseded by 14.6 and 14.7.

### 14.1 Dashboard additions
Three quiz rows, 4 cards each, same .qc card: "Trending this week" (arrows), "New quizzes"
(link "See all new" = /quizzes sorted newest; source: quizzes.created_at desc, status=published),
"All time best" (link "Most played"; source: play_count desc). Under them the two panels
(From the community | Blindtest) where the blindtest panel lists REAL entries only: Classic,
Blindtest of the day, By group. Intro mode is gone everywhere.
Site footer on every page, reproducing the live footer: brand column (logo, "Made with <3 by
fans, for fans", one line, mascot-default.png 52px), DISCOVER (Quizzes, Popular quizzes, Trivia,
Blindtest, Leaderboard, Stats, Pulse, Knowledge Report, Articles, News), COMMUNITY (Create a quiz,
Reddit, Discord), SUPPORT (About, FAQ, Contact, Terms, Privacy, DMCA), bottom row (c) 2026
kpopquiz.org + language switch (English / Portugues). Footer is hidden while a game is on screen
(body.ingame).
Spacing fixes: .stand cards no longer carry margin-bottom:0 (the right column rhythm is 20px
everywhere). Community right column now holds, in order: Your standing, Daily debate, Today, Live
rooms, Happening now, Fandom war, Badge watch (list form, not a horizontal scroller), Community
pulse. The centre column is the feed only (6 cards + Load more).

### 14.2 Quiz page (/q/[slug])
Header card = 2 columns: 320px cover (group photo or cover_image_url, tags overlay bottom-left:
group avatar 34px + type tag + difficulty + language) | body: H1 25/800, author row (avatar 30,
handle, "Lv N - title - N quizzes", Follow pill), meta row with icons (plays, questions, "15s per
question - about 2 min" from settings.timer_seconds x question_count, likes), CTA row: pink
"Start quiz" (btn-big) + "Challenge a friend" (battles table, short link) + share icons right
(Reddit, Discord, X, copy link). Main column: About (the generated sentence, avg % and perfect
count from quiz_time_stats), In this quiz (3 sample questions, answers hidden, "+5 more"), Did
you know (pink tint, fact + "Learn before you play: <group> trivia"), More <group> quizzes (4
cards). Right column: Stats (6 tiles: plays, perfect, likes, avg score, pass rate, fastest
perfect), Hall of fame (top 5: rank gold/silver/bronze, avatar, handle, score, time; "Top 10"
link) + Your best strip with "Beat it", Made by (creator card + Follow, Report link).

### 14.3 Quiz in-game (quiz-player.tsx, playing phase)
Stage 620px centred. Top bar: Quit (ghost), group tag, progress bar (pink, animated width),
"n / N", score pill ("N correct" or "N pts" on clues), sound toggle (speaker icon; sounds
unchanged: taps, chime on correct, buzz on wrong, celebration on results). Streak row: one dot per
question (green ok / red wrong / pink current), "streak" label, fire badge appears at 2+.
Card: timer ring 68px (stroke 5, 15s, warn amber at <=8s, danger red + pulse at <=5s); on answer
the ring freezes and turns green with a check or red with a cross (no layout shift). Question
20/750 centred. Answers A-D: 1.5px hairline, letter chip, hover = pink border + translateX(3px)
+ soft pink shadow; states correct (green tint, pulse), wrong (red tint, shake), dimmed (opacity
.4). Fun fact card (amber) pops in after every answer with the bulb icon; then "Next question ->"
/ "See results". Keyboard: 1-4 answer, Enter next (hint line under the card). Per-question times
recorded (plays.per_question_times).

### 14.4 Quiz results (result phase)
Two columns (photocard + ledger + keep playing | share row, comments, beat my score). Photocard:
gradient top (kicker "<group> quiz", title, count-up score 64px, fill bar, "You beat N% of
players"), mascot sticker overlapping the seam (celebrate + bob when >=50%, sad and still
otherwise), verdict stamp = getResultLabel() kr + en (올킬!/PERFECT, 아깝다!/So close, 대박!/Great
round, 괜찮아~/Not bad, 다시!/Keep trying), Share this card + Play again, Discord line, serial strip
(KpopQuiz - Quiz | Play No. play_count+1 - month). Confetti (26 CSS pieces, 1.6s) on a pass.
Run ledger: cells You % / Avg % / Pass % / +XP / Time, row "Your rank on this quiz #n of N" +
"Your best", Like pill (toggles, count), "Saved to your passport" (guests see the ClaimRun block
instead). Keep playing: 3 related quizzes + blindtest row. Right: share buttons, Comments
(composer 200 chars, comment shows the commenter's score chip), Beat my score (battle link).

### 14.5 Create (create-funnel.tsx, 3 visible steps + done state)
Header: title, "No account needed to start. Your draft saves itself." + autosave chip. Stepper:
1 Details / 2 Questions / 3 Publish (done steps green, active pink with halo, connecting lines
fill). Two columns: form | sticky right column (Checklist, How it will look = the real .qc card,
Tips from top creators).
Step 1: Quiz title (5+), About (0/280, helper "Shown on your quiz page and in search results"),
Quiz type = 5 selectable cards (icon, name, one-line, italic example; Classic / True-False /
Guess from clues / Image quiz / Find the intruder; locked once questions exist), Group = search
input with the chosen group as a pink chip (91 groups) + helper "shows on the <group> hub, counts
for <fandom>", Difficulty = 3 segment cards with one-line meaning, Language select, Cover
(preview + dropzone + rights checkbox), CTA "Start adding questions ->".
Step 2: question list, one row per question (drag handle, number, text, complete check or amber
warning, hover actions duplicate / delete); tapping a row opens it inline (Question, Answers A-D
with the circle as the correct marker, Fun fact, Add an image); "Add a question" + "Paste several
at once"; footer: Back, "3 complete, 1 needs answers", Preview, "Done ->". Minimum 3 questions.
Step 3: summary (cover, title, type - group - difficulty - language - N questions - duration),
copy, Save as draft, "Publish quiz". Done state: mascot celebrate, "It's live", URL + Copy, Open
the quiz, Post a challenge (opens the community editor in challenge mode).
Checklist items: title, type, group, 3+ complete questions, cover (recommended), fun fact on
every question (n / N).

### 14.6 Blindtest hub (/blindtest) - the second product
Dark hero (#1B1524 + pink/purple radial glows + faint equaliser bars): kicker with live dot
"K-pop blindtest - N playing today", H1 "Name that K-pop song.", one line (10s clips, 4 choices,
speed counts, 4.1k songs, 91 groups, 5 generations, no account), your stats (rank title from
bt_players.rank_title / rank_level, best score, best combo, daily streak). Setup card (white, on
the right): Playlist chips All K-pop / By group (reveals the group avatar picker, multi-select) /
Girl groups / Boy groups / By generation (reveals 2nd-5th gen), Rounds 5 / 10 / 15, big Start
button whose label repeats the choice. This mirrors blindtest-game.tsx setup exactly.
"Ways to play" (5 cards): Quick play; Blindtest of the day (daily_blindtests, 1 shot, board);
Ranked (ranked_plays: score + speed + combo, season ladder); Challenge a friend (challenges +
challenge_attempts: short_code, frozen 10 songs, 48h); Live rooms (Phase 3, tagged Soon: room
code, up to 12 friends, synced clip - from meloz / jklm / blindtest.gg; no table yet).
Below: Today's board (daily_blindtest_scores: score + time, your row pinned), Your recent runs
(bt_plays: mode, score, combo, avg speed), right column: Playlists (metadata filters on
blind_test_songs: title tracks, b-sides, recent hits, legends, 4th gen gg / bg, solo, speed round
5s), How scoring works, Challenges waiting. Then Blindtest by group rail ("18 songs"), How it
works, FAQ. Intro and Lyrics modes removed.
Competitor takeaways applied: speed bonus + combo multiplier (meloz), daily same-songs board
(blindtest.gg), room codes later (jklm, meloz), level titles + run history on the account
(blindtest.gg, quizhit), no sign-up to play (all of them).

### 14.7 Blindtest in-game and results
Dark stage 640px: top bar (Quit, playlist tag, progress, n/N, "pts" pill with "xN" combo).
Orb 172px: timer ring (10s, red + pulse at <=3s), equaliser 7 bars, seconds; "Playing clip"
with green pulsing dot; round badge "Song round" (pink) / "Artist round" (purple); question
("Which song is this?" / "Who sings this?"); 4 choices on dark. On answer: the orb flips into
the reveal (cover 118px, CORRECT / NOT QUITE / TIME UP, title, artist, album - year), points pop
top-right ("+192, fast answer"), combo badge top-left with the fire icon, choices show
correct / wrong / dimmed, a 3s auto-next line with Skip. Scoring shown to players: 100 correct
+ up to 100 speed (full under 2s, linear to 0 at 10s) x combo (1 + 0.1 per streak, cap 2).
Results: dark card with the mascot on the seam, score, scoreLabel() (Perfect ear / Sharp
listener / Solid fan / Getting there / Keep listening) + points, best combo, avg answer, XP,
today's rank; Play again / Share / All modes. Challenge a friend link (short code). Song by song
breakdown (cover, title, artist - album, points - time, check/cross). Level card (bt_players
total_xp to next rank title).

### 14.8 Motion system (all views)
Tokens --ease (.2,.7,.2,1) and --spring (.34,1.56,.64,1). View enter: fade + 8px rise. Grids,
rails, feed and mode cards stagger in (40-50ms per child, max ~.42s). Hover: quiz cards lift 4px,
cover zooms 1.04, title turns pink; mode cards lift + icon tilts; group avatars lift + scale; list
rows tint; buttons press to .97. Game: timer ring 1s linear tween, warn/danger colours, danger
pulse ring; answers stagger in, correct pulse, wrong shake, fun fact pop, fire badge wiggle;
results count-up, bar fill, stamp drop-in, confetti, mascot bob; blindtest orb glow breathe,
equaliser, reveal flip, points pop, combo pop, auto-next line. prefers-reduced-motion collapses
every animation and transition to 1ms.

### 14.9 Data sources used on these screens
quizzes (title, quiz_type, difficulty, question_count, play_count, like_count, language,
settings.timer_seconds, questions[].fun_fact), quiz_time_stats (avg, fastest), quiz_comments
(<=200 chars, score/total), quiz_reactions, plays.per_question_times, battles /
battle_results (beat my score), bt_players (level, total_xp, best_score, best_combo,
current_streak, rank_title), bt_plays (mode_id, score, correct, total, total_time, best_combo),
daily_blindtests + daily_blindtest_scores, ranked_plays (avg_speed_ms, best_combo), challenges +
challenge_attempts, blind_test_songs (is_title_track, year, gender, generation, clip_chorus).
Handles in the prototype are invented except "mingi". Songs on the blindtest stage are real
titles used as sample data; covers are the site's group photos (the real stage uses the song
cover from the reveal payload).
Screenshots: shot-dashboard.png, shot-quiz.png, shot-play.png, shot-play-answered.png,
shot-results.png, shot-create-details.png, shot-create-questions.png, shot-create-publish.png,
shot-blindtest.png, shot-btplay.png, shot-btplay-reveal.png, shot-btresults.png, shot-community.png.

## 15. v9 - group hub template, notifications, night mode, ranked
Prototype views: #hub (openHub('BP') / openHub('SKZ')), #notifs, #ranked, plus the theme toggle.

### 15.1 Group hub (/{slug}-quiz) - one template for the 91 pages
Crumb Home > Quizzes > Group. Hero card (photo from public/idols when present, else display_color
tile) with kicker "Group hub - N quizzes - fandom X", H1 "<Group> Quiz", one-line sub, buttons
"Play the top quiz" and "Blindtest - N songs" | From the community panel (3 rows from the group feed +
composer). Facts strip: 6 tiles (generation, members, debut year, label, quizzes (pink), plays), each
hidden when the field is null. About panel: the SEO intro (same sentences as today, server-rendered)
+ "Updated <month>" + two tiles (quizzes, blind test). Live room panel (rooms are NEW; until then
hide the panel). Quiz grid: sort tabs Popular / Newest / Most liked / Hardest, type + level chips,
cards with "avg N% - N likes", "Show all N". FAQ in two columns, fact-gated (buildGroupFaqs), keep
the FAQ JSON-LD. Right: Learn before you play (trivia page), fandom war line (getGroupWarRank), Make a
<group> quiz (create with ?group=). Verse links removed.
Data: groups (name, fandom_name, generation, inception_date, record_label, quiz_count, total_plays,
seo_intro), blind_test_songs count by group, quizzes by group.

### 15.2 Notifications (/notifications)
Header + Mark all read + Settings. Tabs = the 5 real categories from lib/notification-types.ts
(All with unread count, Your quizzes, Social, Achievements, Following, Announcements). Rows grouped
Today / Yesterday / Earlier; each row = tinted icon by category, title, body, link label, time,
unread = pink left gradient + dot; click marks read. Types drawn: milestone, comment, battle_beaten,
badge_earned, new_follower, cheer, streak_milestone, followed_new_quiz, rating, group_mastered,
admin_dm. Right column: the 5 category toggles (notification_prefs), Streak at risk card (streak +
daily played), Email weekly recap toggle (NEW pref). Empty state per tab.

### 15.3 Night mode
`[data-theme=dark]` on <html>. Tokens: bg #141118, panel #1C1822, tint #26212D, tint2 #332C3B,
ink #F1ECE6, mut #A8A0AF, fnt #726B7C, line #2A2532, line2 #3A3343, pink #E8457A, pink-dk (text)
#FF7AA5, pink-lt #33202A, pink-md #5A2A40, ok #5DE0A0 / ok-bg #16301F, no #FF7A7A / no-bg #3A1A1A,
amber-bg #2E2616. Type tags get dark tints (classic #1B2A3A/#8FBBEA, image #3A1F2C/#F08BB3, intruder
#2A2544/#B4ABF5, tf #1B2E1B/#9DD27E, clue #33281A/#E9B963). Hero, dyk, fact, pods, photocard body,
toast, cover pills and inline pastel icon tiles have explicit dark overrides (see the CSS block
"v9: night mode"). Toggle in the top bar (moon / sun), setting in Settings (System / Light / Dark),
persisted in localStorage, default system. Every screenshot exists in both themes in the e2e.

### 15.4 Ranked (blindtest) - the full rule set
Two systems, separate on purpose:
RANK TITLE (progression): bt_players.rank_title from lifetime bt XP through update_player_rank():
trainee 0, rookie 500, debut 1,500, idol 3,000, star 6,000, superstar 12,000, legend 25,000. Never
drops. Shown as "Idol - 3,420 xp - Star at 6,000".
RANKED (competitive, seasonal):
- Run: 10 songs from the whole pool, server-drawn, 4 easy / 4 medium / 2 hard by community accuracy
  (times_correct / times_played), 6 song rounds + 4 artist rounds, 10-second clips, no skip, no group
  or playlist choice. Same rules for everyone.
- Points per song: 100 for a correct answer + speed bonus 100 x (1 - max(0, t - 2) / 8) (full under
  2 s, 0 at 10 s), multiplied by combo 1.0 + 0.1 per consecutive correct, capped at 2.0. A miss resets
  the combo. A perfect fast 10-song run is 2,900.
- Season score = sum of the player's 5 best runs of the season. A run only counts if it beats the 5th
  best. The score never goes down. Ties break on average answer speed.
- Tiers by season score: Bronze 0, Silver 4,000, Gold 6,500, Platinum 8,500, Diamond 10,500, Master
  12,000; each tier has divisions III / II / I (thirds of the band). Legend = top 100 by season score
  among Masters, recomputed nightly. Promotions are instant; no demotion inside a season.
- Season: 8 weeks. Reset keeps rank title and XP; season score restarts; first 5 runs = placement
  ("3 / 5 placed"). Season badge (final tier) on the passport, pinnable. Ranked runs count double in
  the fandom war. Diamond and above get the tier colour on their handle.
- Limits and fairness: 15 ranked runs per day; the song set and clip timings come from the server;
  answer times are measured from the server clip start; a quit run is recorded with the songs
  answered so far (remaining songs = 0); server recomputes points on submit.
- Screens: /blindtest/ranked (dark hero with season + CTA + runs left, your card = tier badge,
  division, season score, progress to next tier, best-5 tiles, then the 7-tier strip, the ladder with
  Global / My fandom / Following, your ranked runs, How ranked works, Season rewards, the separate
  rank title card). Results of a ranked run add the "Season 3 impact" block: before tier -> after
  tier, delta, promotion tag, one sentence (replaces your 5th best, ladder move).
- Tables: ranked_plays (exists: player_id, score, correct_count, total_rounds, best_combo,
  avg_speed_ms, playlist, song_ids, played_at) + two new columns (season, points). bt_players for the
  title. No new table.
Screenshots: shot-hub.png, shot-notifications.png, shot-ranked.png, shot-btresults-ranked.png,
shot-dark-*.png.
