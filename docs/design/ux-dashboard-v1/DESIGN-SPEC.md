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

## 16. v10 "Air" - SUPERSEDES the shell (section 3) and the visual rules of sections 2, 4 to 15

Owner brief: v9 was too heavy. Top navbar back, much more air, less overwhelming, more readable, on every
page. v10 was designed from a written direction, reviewed by three critical agents (visual, UX,
fan/accessibility/SEO), cross-critiqued, rebuilt, then reviewed twice more against the build
(see DECISIONS-LOG 2026-09-25). Where section 16 and an older section disagree, section 16 wins.
Product rules, data sources and the ranked rule set of the older sections still apply.

### 16.1 Tokens (light / dark warm)
- Surfaces: page #FFFFFF / #141312, surface #F7F6F4 / #1C1B19, surface-2 #F0EEEA / #232120,
  hairline #ECE9E4 / #2F2C29 (decorative only), card edge #E0DBD3 / #3A3632, input border #8C857C / #6E6A64.
- Text: ink #1F1B17 / #F3F0EB, muted #6B655E / #A8A198. Only these two text colours. #9A948B is never text.
- Pink: --pink #E8457A for non-text marks only (nav underline, unread dots, rings, XP and timer);
  --pink-fill #D13A6E buttons with white text (4.62:1), hover #BE2F62; --pink-ink #C93868 / #FF7AA5
  pink text; --pink-soft #FCE8EF / #3A2129 with #B3305C / #FF9DBC text.
- Semantic: ok #257547 / #4FC07F, no #B83A34 / #FF7A70, text on ok/no chips #FFFFFF / #141312.
  Never colour alone: every right/wrong state has an icon and a word.
- Plum #1B1524 / #2A2135 only for the blindtest hero, the daily band and the blindtest game.
- Toggles on = ink (not pink). Knob page colour; off knob #FFFFFF / #A8A198.
- Theme: the real site's class-based `.dark` + localStorage 'theme' stays; map these tokens onto it.

### 16.2 Pink budget
Max one filled pink button per view, max ~2 pink marks in the first viewport besides the logo tile.
Links are ink with a quiet underline (#E0DBD3, current colour on hover), arrows muted. Progress bars in
lists (Continue, Groups mastered) are ink; only the XP bar, game progress and timers are pink.

### 16.3 Type (Inter 400/500/600/700, Pretendard fallback for Korean)
Display 48/1.05 700 -0.03em (mobile 32). H1 32/1.15 700 (mobile 26). H2 20/1.3 600. Card title
16/1.35 600. Body 16/1.6. UI 15 (segmented controls, dropdowns, chips, menu items). Meta 13 muted.
Page subtitles 18/1.55 muted. Stats 24/700 tabular. Nothing under 12px. tabular-nums on every score,
rank, timer and count. Sentence case everywhere, no uppercase labels except the photocard.
Long text max 34em (post body) / 38em (prose).

### 16.4 Layout and spacing
Widths: wide 1120 (home, groups, quizzes, blindtest, community, hub, passport); text 720 (quiz, create,
post, leaderboard, ranked, settings, notifications); stage 600 (games, results). Community: 720 feed +
80 gap + 320 rail. Gutter 32 (mobile 20). Page top 56 (mobile 28). Section gaps 80 home / 64 others /
48 mobile. Section title to content 20. Grid gap 24 columns / 40 rows. Radius 8 thumbs, 12 inputs and
answers, 16 cards, 24 hero and photocard, 999 buttons and chips. Buttons 48 / 40 / 32 (40 min on touch),
pill, no glow. Icons 20px, 1.5 stroke. No boxes around sections; borders only on clickable objects
(text cards, mode cards, inputs). Photo cards are frameless.

### 16.5 Navigation (replaces the 232px sidebar)
- Desktop bar 64px, sticky, blurred page colour, hairline appears after 8px of scroll, aligned to 1120:
  logo (= Home) | Quizzes, Groups, Blindtest, Community, Leaderboard (15/500 muted, active ink +
  2px pink underline, aria-current) | search (180px field with "/" hint at >=1280, 40px icon below;
  opens an overlay with groups, quizzes, songs, a real no-results state) | + Create (ghost) | streak
  pill (neutral; flame turns pink when the streak is at risk; popover with the week) | bell (panel with
  the latest 6, Mark all read, See all) | avatar menu (Passport, My quizzes, Settings, Theme, Sign out).
  Guest: search, Create, Sign in. Leaderboard link hides under 1100px (reachable from Community/You).
- Mobile: top bar = logo, search, streak, bell (44px targets). Bottom tabs = Home, Quizzes, Blindtest,
  Community, You (64px + safe area).
- Focus mode: in quiz and blindtest games the bars and footer disappear; a slim game bar remains.
  Create hides the bottom tabs and the footer (its own sticky bar takes the bottom).
- Every navigation item is an `<a href>` with the real path (/, /quizzes, /groups, /{slug}-quiz,
  /q/{slug}, /blindtest, /community, /leaderboard, ?page=2). Buttons only for actions. On client
  navigation: update document.title, focus the page H1 (tabindex -1, no focus ring).

### 16.6 Sign-in sheet (NEW, replaces "Sign in = instant")
Sheet (bottom sheet on mobile): title from context ("Save your 7/8", "Sign in to publish", "Sign in to
reply"), Continue with Google, Continue with Discord, or email + "Email me a sign-in link". No
password anywhere (matches the real passwordless auth). After success the original action continues
(score saved, quiz published, reply posted) and the draft is kept. Guests can build a whole quiz;
sign-in is asked at Publish.

### 16.7 Pages (what each one keeps, in order)
- Home: hero (guest H1 "Free K-pop quizzes and blindtests" + keyword lead / signed-in eyebrow greeting +
  "Today's Ten"), one pink button; Continue playing (resumes at the saved question); Groups rail
  (10, 80px avatars, "New quiz" as a word, never a dot alone); Trending this week (4 photo cards); All
  time best (numbered, no thumbnails) beside New quizzes (type glyph, no initials); Blindtest of the day
  band (the only coloured block; after playing it shows "You scored 8/10 today" + See today's board);
  From the community (3 rows). No quiz appears twice.
- Groups: filter, Most played (hidden while filtering), A to Z in 3 columns. Groups without a quiz are
  listed muted and open an empty group page.
- Quizzes: sort segmented (Trending, Newest, Most played, Top rated) + Type / Level / Group dropdowns
  that add removable chips; the grid really filters; empty state with Clear filters; Load more is a real
  ?page=2 link. Photo grid on desktop, compact rows on phones.
- Quiz page (720): breadcrumb, cover, H1, one meta line, author + Follow, Start + share; under it the
  timer rule and "Play without a timer" (relaxed runs do not enter the hall of fame); Hall of fame with
  your best + Beat it + Challenge a friend; Did you know (labelled) + trivia link; About; In this quiz
  (3); More from the group as text cards; creator + Report. Mobile: sticky Start once the first one
  scrolls away (hidden and not focusable until then).
- Quiz game: game bar (quit asks for confirmation once an answer would be lost and saves the run to
  Continue; title or "Beat {user}: 7/8" chip in challenge runs; segmented progress filled/hollow;
  score; sound). Timer ring 72 with seconds (warn 8, danger 5). Question 28. Answers 56px with 1-4 key
  chips (A-D on touch, aria-hidden, aria-keyshortcuts). After answer: Correct (check) / Your pick (X),
  others muted but readable; Did you know; Next + Enter; focus moves to Next; a polite live region
  announces the result. "3 in a row" pill from 3.
- Results (600): photocard (kept exactly, owner-approved), XP + streak line (guest: "Save your 7/8" ->
  sign-in sheet), You / Average / Time, rank line (challenge runs: win or lose line). Primary button:
  Share when above the quiz average, Play again when below. Like. Keep playing (one big next quiz + 2
  rows with type glyphs). Comments folded, real field with score chip. Visually hidden H1 "7/8 on {quiz}".
  After any quiz: streak pill, popover, home greeting and notifications all switch to "saved".
- Share sheet: numbers come from the actual run (score, beat %, rank). Copy link, Story image, More apps
  (navigator.share; share the story image as a file where supported), Discord. Challenge link block when
  relevant. Bottom sheet on mobile.
- Create (720): stepper (aria-current step), title field validates (5+), 5 native radio type rows,
  group, difficulty, language, cover + rights checkbox (native). Questions list with one open editor,
  circle marks the correct answer. Publish step shows the card as it will look + checklist. Done state
  with link, Open the quiz, Post a challenge.
- Blindtest hub: plum hero with the whole setup in one row (playlist menu, 5/10/15, Start, "Your best
  8/10 · Idol"); challenges waiting (Accept starts a run with the score to beat); Ways to play (Daily,
  Ranked, Challenge a friend); Today's board (your row: Play or your score); How it works; Play by group;
  FAQ in the HTML. One site-wide streak only (no blindtest streak). Daily = one try per day.
- Blindtest game: plum, game bar with replay and sound. The orb (200, 168 mobile) becomes the album art
  (140, 116 mobile) in the same space so answers never move; points pop; auto-next 3s, Next + Enter;
  focus to Next. Needed in build: a "Tap to play the clip" state when autoplay is blocked.
- Blindtest results: score card; mode-aware primary (Play again / Play another ranked run / See today's
  board); ranked season sentence + tier chips; challenge win/lose sentence; challenge link; every song
  row has a play button.
- Ranked (720): shield + division + season score + progress (solid tier colour); "Score over 1,420 to
  count" (the lowest of the best 5; best 5 always sorted descending and summed); tier track (mobile:
  label only on the current tier); ladder Global / My fandom / Following; rules accordion; rewards.
- Community: feed 720 (one-field composer, tabs For you / Following / Blogs, group dropdown, frameless
  posts); rail 320 sticky: Daily debate, Happening now (with the community pulse line), Badge watch.
  Phone: fandom war strip + debate at the top of the feed, Happening now + Badge watch after the 3rd post.
- Post (720): per type - challenge (quiz card with the score to beat), blog (cover max 480 wide, no
  upscaling), debate (vote then results), thread. Replies: real field, score chip, 44px Send.
- Leaderboard (720): tabs Fandom war / Players / Ranked / Creators; frameless podium; rows with +n / -n;
  your row pinned; guest pin opens the sign-in sheet.
- Group hub (/{slug}-quiz): SPLIT hero - H1 "{Group} Quiz", intro, Play the top quiz + Blindtest, facts
  line on the left; the group photo on the right, no text over it (one column when there is no photo).
  Quiz text cards (6) + sort + filters + "Show all N" as a real ?page=2 link; About in plain view;
  trivia link (real href); 8 FAQ questions in details, answers in the HTML, first open (FAQPage JSON-LD
  must match); From the community; Fans also play; fandom war line. Live rooms link removed until rooms
  ship (Phase 7). Group with 0 quizzes: empty state (Make the first quiz + Notify me), noindex until
  3 quizzes.
- Passport: band 120 (mobile 96) = the fan's image, else their main group photo blurred over their tint;
  avatar 96 overlapping (above the band); name Inter 28/700 ink + "Lv 7 · Stan" chip; meta; XP bar
  (pink); stats in one row (scrolls on phones); tabs Overview / Quizzes / History / Badges; Overview
  starts with the fandom war strip (Leaderboard is one tap away on phones); badges on neutral discs.
- Settings (720): Profile, Fandom, Passport look (folded), Notifications (7 switches, role=switch),
  Appearance (System / Light / Dark), Account (sign-in method, data export, sign out, delete). Save bar
  appears after the first change.
- Notifications (720): All / Your quizzes / Social / Achievements; streak row pinned (turns into
  "Streak saved" after playing); rows are links to their target, unread dot + bold title.
- Footer: surface band, brand + Play / Explore / Community / Support + Top groups row (2 columns on
  phones).

### 16.8 Images
Every photo in the prototype is a 480x300 site asset shown up to 2.3x. Production needs: hub photo
1040w (2x of 520), quiz cover 1440w, photocard portrait crop 640x853, thumbs 2x. Never repeat the same
photo twice in one row or stacked in one column. Quiz without a cover: the group photo; group without a
photo: typographic cover (type glyph + group name on surface-2), neutral initials for avatars. Top 20
groups need a real photo (ATEEZ first: #4 by quizzes, #5 in the fandom war).

### 16.9 Accessibility checklist (all verified in the prototype)
Contrast AA on every text pair in both themes; focus-visible ring 2px pink; skip link; one H1 per view;
live region for game results; aria-pressed on segmented controls and toggles, role=switch on settings
switches, role=tab/aria-selected on tabs, aria-expanded/aria-haspopup/aria-controls on popovers and
dropdowns; native radios/checkboxes; 44px touch targets on coarse pointers; key hints hidden on touch;
lang="ko" on Korean stickers; reduced motion kills confetti, count-ups and point pops; timer can be
turned off (relaxed mode).

### 16.10 SEO checklist (unchanged pages keep everything; these are additions)
Per-page title and meta description; canonical; JSON-LD: FAQPage + BreadcrumbList on hubs,
BreadcrumbList (+ Quiz where valid) on quiz pages; the blindtest FAQ stays in the HTML; real hrefs for
every group, quiz, pagination and trivia link. Group counts: 90 visible groups (the DB has 91 rows
including one quarantine group); 422 published quizzes. NOTE: `groups.quiz_count` is stale against
published quizzes (BTS 31 vs 27 published, BLACKPINK 29 vs 24, Stray Kids 29 vs 28): show counts from
published quizzes, not from that column.

## 17. v11 - owner review fixes (2026-09-25). SUPERSEDES section 16 where they differ

Owner verdict on v10: home, quizzes, groups + group pages, create, new thread, leaderboard, ranked UI
and the community threads are VALIDATED. The changes below are the only deltas. The prototype is the
reference, "pixel by pixel".

### 17.1 Global
- Every box has a border, and borders are LIGHT (v11.1: owner found them too heavy). One hairline token
  for every box: `--line` #ECE8E3 light / #2B2826 dark; inner dividers `--line-2` #F3F1EE / #242220;
  control borders `--edge` lightened to #E5E0DA / #35312E; hover on cards `--pink-line` #F2CFDB /
  #4A2A37 (no shadow). Boxes: quiz cards (cover inside the card, 8px inset, radius 18, 2px lift on
  hover), community posts (radius 20, padding 24/26, 16 between posts), the community rail panels and
  its debate options, the quiz of the day card, "About this quiz", the results stats row, popovers,
  menus, the identity preview.
- More pink, on purpose:
  - Nav: icon + label per item, Home added back, the active item is a filled pink pill (#D13A6E, white
    text, 38px). Mobile tab bar: active icon sits in a pink-soft pill.
  - Section titles carry a 20px pink line icon (flame for Trending, trophy for All time best...).
  - Links are pink-ink again (no underline until hover).
  - Tabs (community, leaderboard, passport): active = pink-soft pill with pink-ink text.
  - Segmented controls: active text pink-ink. Filter chips and post type chips: pink-soft.
  - Top 3 ranks pink-ink; your pinned leaderboard row pink-soft.
- Logo: unchanged (pink K tile + "KpopQuiz"). Do not redraw.
- Search in the top bar is an icon button at every width (the pill nav needs the room); "/" still opens it.

### 17.2 Home
- (v11.2) Live ticker, then the CENTRED header of the live site (components/home/home-hero.tsx), see
  17.11. Guest: eyebrow "K-pop Quiz" inside the H1, "Are you a real fan?" with "real fan?" pink italic,
  H2 "Prove it. Play K-pop quizzes and see where you rank.", CTAs "Browse K-pop quizzes" + "Create a
  quiz". Signed in: same look, "Good evening, Mingi" with the name pink italic, one streak line, no CTAs.
- Quiz of the day card (v11.1: owner asked for smaller, calmer, minimalist; the group tag and the
  question preview are REMOVED). One bordered row, white (`--raised`), radius 20, padding 22/24/22/28:
  background = soft pink gradient (v11.2, 17.11), border `--qotd-edge`;
  left = label "Quiz of the day" (13/600 pink-ink, 14px bolt icon, no pill) + countdown (13 muted),
  the REAL quiz title (22/700), one meta line (14 muted, dot separated: type, level, question count,
  average, time); right = one pink "Play" button (40px). Mobile: stacks, padding 20, title 20, Play full
  width 44px. No blobs, no description, no chips, no preview.
- Data: quizzes.is_quiz_of_the_day / qotd_log. BACKEND BUG: rotation stopped on 2026-06-30 (last
  qotd_log.featured_date). Fix the scheduler (quiz_bank + qotd_log, lib/quiz-bank-scheduling.ts).

### 17.3 Quizzes, Groups, group hub, Leaderboard
Validated. Only the global pink and border rules apply. Group photos: use the site's own
`public/idols/<Group>.jpg` (736 to 1200px wide) through next/image with correct `sizes`; never the
480px copies. 33 groups have a photo today; others use the typographic cover.

### 17.4 Quiz page, game, results
- "About this quiz" in a bordered box.
- Timer ring 76px, the number alone, optically centred (no "s" unit; aria-label "14 seconds left").
- Results: You / Average / Time in one bordered row with hairline dividers, max 440 wide. Average and
  plays come from the quiz played (no hard-coded 52%).

### 17.5 Blindtest: day mode
- No plum anywhere. Hub hero, the daily band on Home, the game page and the results card use the light
  pink-lilac gradient with a pink-edge border. In dark theme they follow the dark tokens.
- Game: light page, white orb with pink ring, song round chip pink-soft, artist round chip lavender-soft,
  answers use the standard answer states.
- Playlist menu: "All K-pop" first, then the GROUPS: every group playlist (79 today), searchable, with
  the song count, then the mixes (Girl groups, Boy groups, generation, title tracks, recent hits,
  legends, speed round).
- Play by group (v11.1 redesign, the chip wall is gone): section title + a search field on the right
  ("Search 79 groups", 40px pill, light border, pink border on focus). Then a row of 6 popular group
  playlists as photo tiles (4:3 photo radius 14, name 15/600, "18 songs" 13 muted; 3 per row under
  1100px). Then a clean index of ALL playable groups: 4 columns (3 under 1100, 2 on mobile), 48px rows
  with a `--line` bottom hairline, name left 15/500, song count right 13 muted (mobile: number only);
  hover or focus = name pink-ink and the count swaps for a pink play icon. First 24 shown, then "Show all
  79 groups". Typing in search filters the whole list live, hides the popular row, and shows "No group
  matches. Try the All K-pop playlist." when empty. Popular six = most blindtest plays over the last 30
  days (fallback: most quiz plays).
- Rule (runtime truth, lib/blind-test-playlists.ts): a group playlist exists when the group has at least
  ROUND_SIZE = 10 clean active rows in `songs` (not blind_test_songs). Today: 79 groups, 4,120 active songs.

### 17.6 Ranked
UI validated. The system must work exactly as section 15.4 says, and today `ranked_plays` has 0 rows,
so it is not live yet. Scoring per song: right = (100 + speed bonus) x combo; speed bonus 100 under 2s,
then round(100 x (10 - t) / 8) down to 0 at 10s; combo x1.0, +0.1 per consecutive right answer, cap
x2.0; wrong or timeout = 0 and resets the combo. Season score = sum of the 5 best runs; a run counts
when it beats the 5th best. Tiers Bronze 0 / Silver 4,000 / Gold 6,500 / Platinum 8,500 / Diamond
10,500 / Master 12,000, divisions III-II-I as equal thirds of each tier range from Bronze to Diamond (Master has no divisions), Legend = top 100
Masters, nightly. 15 runs a day, 8-week seasons, placement = first 5 runs, quit runs recorded with the
answered songs, ties by average answer time. Server-drawn runs (4 easy / 4 medium / 2 hard by
accuracy, 6 song + 4 artist rounds), timing measured server side.

### 17.7 Community
Validated for threads, blogs, debates, challenges. Deltas: bordered posts and rail panels, comment likes
are a heart + count (pink when liked), names render with the author's identity flair (17.8), a bit
more pink (type chips, tabs, liked hearts).

### 17.8 Passport and identity flair (backend already has the columns)
- profiles.name_accent (default, pink, purple, blue, teal, amber, coral), profiles.name_font (default,
  serif, mono), profiles.bias (free text, max 40), profiles.profile_theme (default, purple, blue, teal,
  amber, coral), profiles.header_url, profiles.pinned_badge_id. Options and validation already live in
  lib/passport-flair.ts, lib/passport-themes.ts and /api/auth/update-profile.
- Settings > "Your look" (open, not folded): live preview "how you appear in Community", name colour,
  name font, bias tag (members of your main group as one-tap chips + custom text), passport theme,
  header picture, pinned badge.
- Everywhere a person is named (posts, comments, hall of fame, happening now, leaderboard players,
  passport): the name uses the accent colour and font, followed by the bias tag chip (heart + text,
  outlined in the accent).
- Header picture: "Change header" on the passport band opens a sheet: upload from computer (JPG, PNG,
  WebP, 5 MB, stored in Supabase storage, 1500x300 crop) or paste a link (server fetches it, checks type
  and size, copies it to storage; never hot-link), or use the theme colour. Default when nothing is set:
  the main group photo blurred over the theme tint.
- Badges (v11.1: NO mascot/rabbit art anymore, new medallions). Each badge is an SVG medallion (one
  `<BadgeMedal id rarity earned size>` component, no PNG): the RARITY sets the frame shape and gradient,
  the BADGE sets a unique glyph. Frames on a 72 box, corners rounded by stroking the shape with its own
  gradient (stroke 5, round joins): common = circle, uncommon = rounded square (rx 19), rare = hexagon,
  epic = shield, legendary = 12-point star. Gradients top-left to bottom-right: common #C9CED9 to
  #7C8499, uncommon #74E3A4 to #17994F, rare #93BFFF to #2C67DB, epic #DBAEFF to #8A3CDF, legendary
  #FFE38A to #E08E00 (base colours = lib/badges.ts RARITY_COLOR). Inside: a soft white highlight in the
  top half (16%), an inner ring at 80% scale (white 45%, 1.6), then the white glyph (24 box scaled 1.25,
  stroke 1.7, round caps). Earned: drop shadow in the rarity colour at 28%, hover tilts -5deg. Locked:
  `--surface-2` fill, dashed `--edge` ring, muted glyph, name muted. Glyph map (Lucide paths, ISC):
  perfect_score star, streak_7 flame, streak_30 calendar-check, creator_bronze pen-tool, creator_silver
  feather, golden_ear_* headphones, first_steps sprout, hard_mode zap, quiz_maker message-question,
  quizmaker_5 layers, marathoner_* flag, perfectionist_* target, debater_* messages, multi_stan users,
  fandom_traveler_* compass, dedicated_fan heart, viral_hit rocket, community_star sparkles,
  group_master crown, founding_fan gem. A badge id without a mapping falls back to its family glyph.
  Sizes: 64 in grids, 32 in the community rail, 28 next to the passport name (pinned badge), 22 in the
  settings picker, 16 frame-only in the rarity legend ("colour and shape show rarity"). Badge names,
  descriptions and rarity come from badge_definitions / lib/badges.ts; counts are live ("12 of 20
  earned", "All 20 badges").

### 17.9 Create, new thread
Validated. No change.

### 17.10 v11.1 fixes (owner review of v11, same day)
- Borders lighter everywhere (17.1 tokens).
- Quiz of the day: minimalist row, no group tag, no question preview (17.2).
- Play by group: popular six + searchable index (17.5).
- Badges: new medallions with unique glyphs, shape + colour by rarity, no mascot art (17.8).
- Guest state bug: never hide/show auth content with `display: revert` (it drops flex layouts; the
  "Save your 8/8 ... Sign in to save" line lost its centring). In the product auth content is rendered
  server side per session; in the prototype the rule is `body:not(.guest) [data-auth=out]{display:none}`.
  The prototype's "Guest preview" bar is a prototype control, not a product feature.
- Header picture sheet: X, Escape and a click on the backdrop all close it (the prototype only closed
  some sheets). Every sheet/dialog must close the same three ways and return focus to its trigger.
- Results: "Save your 8/8 and start a streak. Sign in to save" is one centred line with a space before
  the link.

### 17.11 v11.2 fixes (owner review of v11.1)
- Home header = the live site's hero, restyled in Inter. Order: live ticker, header, quiz of the day.
  - Live ticker (= components/home/activity-ticker.tsx): full-width bar, 44px (40 mobile), radius 14,
    `--line` border, white; pulsing 7px pink dot + "LIVE" 11/800 uppercase +0.1em pink-ink; line 14px,
    ellipsis. Cycles recent activity every 3.5s (fade-up 0.45s, none under reduced motion); when quiet
    shows "N fans playing now"; renders nothing when there is neither. Sits 24px under the nav (16 mobile).
    OWNER DECISION PENDING: the live component floors the online count with a random 12 to 27
    (`Math.max(d.online, 12 + random*16)`). Keep the current behaviour unless the owner says otherwise.
  - Header: centred, max 760, margin 48 auto 44 (32/28 mobile). H1 clamp(32px, 6vw, 48px), 800,
    -0.025em, line-height 1.04; eyebrow "K-pop Quiz" INSIDE the H1 as a block span (0.4em, 700, +0.02em,
    muted, 8px under); accent words italic 800 in `--hl` (#DB4B7E light / #FF7AA5 dark). Sub line 16px
    (15 mobile) muted, max 480, 14px under (guest: an H2, as today, for SEO). Guest CTAs 24px under,
    gap 10: primary "Browse K-pop quizzes" (play icon, links /quizzes, keeps the exact-match anchor) and
    ghost "Create a quiz". Heading semantics and copy for guests are unchanged from production.
- Quiz of the day background: `--qotd-bg` linear-gradient(110deg, #FBE1EA 0%, #FCEBF1 48%, #FEF6F8 100%)
  light / (#36202B, #2B1D25, #221B1F) dark; border `--qotd-edge` #F4D6E1 / #40283A.
- Quiz cards (UxQuizCard) redone: the photo is FLUSH with the card (no inset frame). Card: `--line`
  border, radius 18, overflow hidden, white, full height in its grid row. Cover 4:3, no radius of its
  own. Body padding 14/16/16: group name 13/600 pink-ink (ellipsis), title 16/600 two lines max, footer
  pushed to the bottom (margin-top auto, 14 above): left = difficulty bars (3 bars 3px wide, 5/8/11px
  tall, filled pink for the level: Easy 1, Medium 2, Hard 3; empty bars `--line`) + level; right =
  "842 plays" (or "New"). 13px muted. Hover: border `--pink-line`, lift 2px, soft pink shadow
  0 10px 24px -12px rgba(209,58,110,.22), photo zoom 1.035, title pink-ink. Mobile list rows: 96px
  square thumb radius 12 inside a bordered row (padding 10, gap 14), same eyebrow/title/footer.
- "Did you know" bulb (quiz page and the in-game fact) is yellow: stroke `--bulb` #E0A100 / #F5C542,
  fill `--bulb-fill` #FFE9A6 / rgba(245,197,66,.22).
- The prototype exposes `window.UX_VERSION` ("v11.2 (2026-09-25)"); the repo copy and the published
  artifact are the same build when that string matches.
