# v10 "Air" - FINAL direction (arbitrated after critic round 1 + cross-critique)

Owner constraints kept: three home quiz rows (Trending this week, New quizzes, All time best, no duplicates);
Happening now + Badge watch + Community pulse in the community right column; passport personalization header;
editor with 4 modes; Inter; pink accent; zero emoji; real data.

## Tokens
Light: page #FFFFFF, surface #F7F6F4, raised #FFFFFF, hairline #ECE9E4 (decorative only), card edge #E0DBD3,
input border #8C857C, ink #1F1B17, muted #6B655E (only two text colours; #9A948B never for text).
Pink: --pink #E8457A non-text only (bars, underline, rings, dots); --pink-fill #D13A6E buttons with white
text (4.62:1), hover #BE2F62, same in dark; --pink-ink #C93868 pink text/links (4.94 on white, 4.58 on
surface); --pink-soft #FCE8EF bg with #B3305C text (5.13).
Dark (warm): page #141312, surface #1C1B19, raised #252321, hairline #2F2C29, card edge #3A3632, input
#6E6A64, ink #F3F0EB, muted #A8A198, pink-ink #FF7AA5, pink-soft #3A2129.
Plum (blindtest hero + blindtest game only, both themes): #1B1524 / #2A2135.
Semantic: ok #2F8A55, no #C8423B (+ icon and label, never colour alone).

## Type (Inter, weights 400/500/600/700 only)
Display 48/1.05 700 -0.03em (mobile 32). H1 32/1.15 700 (mobile 26). H2 20/1.3 600. Card title 16/1.35 600.
Body 16/1.6. UI 15. Meta 13/1.45 500 muted. Nothing under 12. tabular-nums on scores, ranks, timers.
One small eyebrow per hero (13px sentence case, muted). Korean: Pretendard / system fallback.

## Layout
Widths: wide 1120; text 720 (quiz, create, post, notifications, settings, leaderboard, ranked, groups list
stays wide); stage 600 (games, results); community 720 feed + 80 gap + 320 rail.
Spacing: page top 56 (m 28); section gaps home 80 / others 64 / mobile 48; section title to content 20;
grid 24 col / 40 row; card padding 20 (m 16); list rows 16px vertical.
Radius: 8 thumbs, 12 inputs + answers, 16 cards, 24 hero + photocard, 999 buttons + chips.
Buttons 48/40/32, pill, no glow. Icons 20px 1.5 stroke currentColor, no tinted tiles. Type = monochrome glyph.
No boxes around sections. Boxes only for clickable objects (text cards, mode cards). Photo cards frameless.
Max one filled pink button per view; at most two pink marks in the first view.

## Navigation
Desktop bar 64px sticky, aligned to 1120: logo (= Home) | Quizzes, Groups, Blindtest, Community, Leaderboard
(15/500, 28px gaps, active = ink + 2px pink underline) | search (180px field at >=1280, icon below; opens
overlay with groups, quizzes, songs) | + Create (ghost) | streak pill (neutral; flame pink only at risk;
popover) | bell (panel with latest 6) | avatar (menu: Passport, My quizzes, Settings, Theme, Preview as guest,
Sign out). Guest: search, + Create, Sign in. Mobile: top = logo, streak, search, bell; bottom = Home, Quizzes,
Blindtest, Community, You. Focus mode in games: bars and footer hidden, slim game bar only.

## Pages
Home: hero (guest H1 "Free K-pop quizzes and blindtests"; signed-in eyebrow greeting + H1 "Today's Ten") with
one Play + text link to the daily blindtest; Continue (signed-in); Groups rail (80px); Trending this week
(4 photo cards); All time best (numbered top 5) beside New quizzes (5 rows); Blindtest of the day band (plum);
From the community (3 rows). No duplicates across rows.
Groups: new index page, all groups as crawlable links, filter, most played row, A to Z.
Quizzes: title; one control row (sort segmented + Type, Level, Group dropdowns); active-filter chips; 4-col
photo grid; "Load more" as a ?page=2 link.
Quiz page: breadcrumb; cover 720x300; H1; one meta line (type, level, questions, time, plays, avg); author
line; Start quiz + share icon; guest note "No account needed"; then Hall of fame (perfect count + fastest in
the header, top 5, your best + Beat it + Challenge a friend if you have a score), Did you know (one sentence +
trivia link), About, In this quiz (3), More from group (text cards), made by + Report. Sticky Start on mobile.
In-game: focus; game bar (quit, title, segmented progress with filled/hollow segments, score, sound); timer
ring with seconds; question 28; answers 56px with 1-4 key chips; after answer: correct = check + "Correct",
your wrong pick = X + "Your pick", others muted (no fading); fun fact; Next with Enter glyph; "3 in a row"
pill. Results (600): photocard 3:4 with the group photo; XP + streak line (guest: "Save your 7/8, sign in");
You / Avg / Time; rank + best; Share (sheet with story card, challenge link, copy) + Play again; like; Keep
playing (Next quiz big + 2); Comments collapsed.
Create (720): stepper; type as 5 radio rows; group search; difficulty segments; cover; sticky bottom bar
with status + Next; preview on Publish; Done is its own state.
Blindtest hub: plum hero with setup in one row (playlist picker, 5/10/15, Start) (mobile: Start + Change);
challenges waiting strip; Ways to play = Daily, Ranked, Challenge; Today's board; Play by group; How it
works + scoring + FAQ as text. No live rooms card.
Blindtest game: focus, plum page, orb, album art 200 on reveal. Results (600): score card; ranked season
impact in one sentence + tier change; mode-aware primary; challenge link; song rows.
Ranked (720): tier shield + division + score + progress + "Beat 1,540 to count, 12 runs left" + Play; thin
tier track; ladder (Global / My fandom / Following); How ranked works accordion; rewards list.
Community: feed 720 (composer = one field + New post; tabs For you / Following / Blogs; group dropdown;
posts frameless with hairlines, icon + count actions); rail 320 sticky: Daily debate, Happening now (pulse in
its header, 5 rows), Badge watch (3 rows). Fandom war -> Leaderboard. Live rooms -> link on group hubs.
Post (720): breadcrumb; post 28/17px body; comments nested 40px; More from group.
Leaderboard (720): tabs Fandom war / Players / Ranked / Creators; frameless podium 96/120/96; rows; your row
pinned on surface; "Play for STAY"; How points work accordion.
Group hub: hero 1120x400 photo + overlay, H1, intro sentence, Play the top quiz + Blindtest; facts line;
quiz text cards (9) + sort + filters + "Show all 29"; About (visible) + trivia + room link; FAQ <details>
(answers in DOM); From the community; Fans also play.
Passport: header band 160 (user image or flat theme tint), avatar 96 overlapping, name 28/700, level, xp;
stats inline; tabs Overview / Quizzes / History / Badges. Settings (720): Profile, Fandom, Passport look
(collapsed), Notifications, Appearance, Account; Save bar after a change.
Notifications (720): filters All / Your quizzes / Social / Achievements; pinned streak row; rows with unread
dot + 600 title; no tinted cards.
Footer: full-width surface band; Play / Explore / Community / Support columns + top groups row; SVG heart.
