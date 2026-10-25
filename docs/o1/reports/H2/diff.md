# H2a: the new FanQuiz home against the design, block by block

Design: `docs/o1/design/fanquiz-hub/` (Main.dc.html at 1440, Mobile.dc.html at 390). The design tool's `support.js` is not in the folder, so
`apps/quiz/e2e/o1/H1/H2a/dc-support.js` stands in for it (sc-for, sc-if, {{values}}, onClick, the script of the file); the design renders
through it in Chromium at the same widths as the page. Page: a local hub server (offline build, `next start`), light theme, DM Sans.

Files in this folder:

- `design-1440-out.png`, `design-1440-in.png`, `design-390.png`: the design itself (the Mobile board has no signed-in state).
- `impl-1440-out.png`, `impl-1440-in.png`, `impl-390-out.png`, `impl-390-in.png`: the page, signed out and signed in (signed in through a local fake database, `fake-supabase.mjs`).
- `compare-blocks.txt`: per block (top bar, hero, Today, 60 seconds, Hot right now, For you or Start easy, Crossover, Top fans and passport, footer), size of the design block, size of the page block, share of pixels that differ by more than 24 of 255 in a channel. `node apps/quiz/e2e/o1/H1/H2a/compare.mjs <hubUrl> <dir> [cookie]`.
- `compare-interactions.txt`: the same clicks in the design and in the page (filter chips at both widths, an answer right and wrong and "Try again", Surprise me and Another, the player paused after one tick and after ten seconds). `interact.mjs`.

Sizes: every block has the size of the design to the pixel at both widths, signed out and signed in. Full page 1440: 3360 (design 3359) signed out,
3337 (3336) signed in. The one pixel comes with the footer logo (a 28 px rabbit beside the wordmark).
The Mobile board is a fixed 3300 px canvas, the page is its natural 3111 px signed out.

## Differences left

Logos (owner exception, brief section 2):

1. Top bar, 1440 and 390 (1.08%, 3.36% of the block): the "F" square is the KpopQuiz rabbit (36 px, 32 px on the phone) followed by FanQuiz. Only the logo pixels differ.
2. Footer, 1440 (1.94%): the rabbit (28 px) before FanQuiz in the brand line.
3. Doors, 1440 and 390 (0.07%, 0.36% of the hero): the "K" and "O" letters of the 40 px (36 px) tiles are the rabbit in white (`rabbit-white.png`, made from the mascot by `rabbit-white.mjs`).

Data (lot H2b, wired by lot H2c, see the section "H2c: the real data" below):

4. Every number, title, handle, streak and link is now real (o1-dev); no sample is left in a render path. The streaks and the progress of the signed-in fan are read from their account.

Words that are not the design's (one decision, for the owner):

5. Passport block, signed out (5.10% of the 1440 block; the block keeps its height because the Top fans card is the taller one): the design lists "Your username and avatar", "Your level, if you make it public", "The sites you joined" and "They never see". The task says the block reuses `HubShares`, which prints the keys of the privacy page word for word (privacy policy, point 5: "The sites you joined, only if you choose to show them"; "Your username" and "Your avatar" are two lines; the title is "Other sites never see"). I kept the legal wording and gave the block the design's two columns, sizes and colours. Changing the three keys `shares.*` (copy/hub/h1.ts) to the design's text would change the privacy page too, and drops a privacy condition ("only if you choose to show them"), so it is the owner's call.

Noise that is not a difference:

6. Hot right now, 1440 and 390 (0.01%, 65 and 32 pixels): scattered anti-aliasing pixels, no shape.
7. Interactions, `surprise` and `surprise-another` (0.5%): the design and the page scroll the page by different amounts to reach the button, so the sticky bar covers a different part of the hero, plus the two door logos. The pick card itself is identical.
8. Phone filter (0.10%, 0.12%): scattered text pixels, no shape.

## Things the design does not decide, and what the page does

- Mobile signed in: the Mobile board has no signed-in state. The page shows the desktop signed-in blocks on the phone width (level chip in the bar, "For you, name" as the two or three plain cards, the passport with the progress bar and the streaks), no reference to compare.
- Search ("Search both sites"): lot H2c makes it a link (same look, same label) to the search page of KpopQuiz while the Hot now filter is All or KpopQuiz, of OtakuQuiz when it is OtakuQuiz.
- Options of the question: the design's `.fq-opt:hover` border colour never shows (its inline border wins), so the page has none.
- One markup serves both boards (a text that differs, such as "Play today's quiz" and "Play", is in the markup twice and the sheet shows one; blocks the phone board leaves out are hidden by the sheet at 719 px and below). Landmarks: bar (`header`), `main`, `footer` are siblings in the page, as in the Main board.
- Fonts: DM Sans from `next/font` (self-hosted, with the optical size axis), the face the design links from Google Fonts.
- Dark mode: the existing dark tokens, with local `--hub-*` values for the site colours (KpopQuiz pink and OtakuQuiz orange), AA checked in `lib/site/hub/home-styles.test.ts`.

## H2c: the real data, block by block

Real shots, o1-dev, 1440 and 390, signed out and signed in (the `dual` fixture): `real-1440-out.png`, `real-1440-in.png`, `real-390-out.png`, `real-390-in.png` (`shoot-real.mjs`).
`real-compare-blocks.txt` is `compare.mjs` against the design with the real data: the share of differing pixels is now the text, the numbers and the heights of the real data, so it is no measure; sizes and structure are. The interactions that need data are driven by `interact-real.mjs` (all green).

Only logos (items 1 to 3 above), data and the passport wording (item 5) differ from the design. Block by block:

- Top bar: same structure and sizes (73 px at 1440, 69 px at 390, as the design). Search is a link (same box, `box-sizing` set so it is 44 px as the button was). Signed in: the level chip shows the real level. A pill (Today, Hot now, Top fans) is left out with the block it points to when that block has no data (today: Top fans, nobody has made a profile public on o1-dev).
- Hero: the pills are the real counts (474 quizzes, 274 quizzes, 51 series), the "New site" pill only while OtakuQuiz is in its first week (the rule of its Just added quiz), "Top now" or "Just added" with the real quiz. Daily blindtest and Which member are you are KpopQuiz's own features, written as in the design. A door with no data leaves the hero; the design's heights hold with both doors.
- Surprise me: the pool is the 100 best quizzes of each site, the draw is `pickSurprise` (never a played quiz, never the same site twice in a row), the link is the canonical page. No pool, no button.
- Today: real quizzes of the day (link `/q/<slug>?daily=quiz`, so the streak counts), "10 songs, 10 seconds each" (the real set is 10 songs, the design said 5), the real preview of the first song plays for ten seconds, the real debate, "New picks in N h M min (1:05, Paris time)" aiming at 00:05 UTC (2:05 in summer, 1:05 in winter; the design's fixed "2:05" was true in summer only). A card with no data leaves the grid (auto-fit), the section leaves when all three are missing. Streaks are the fan's real daily streaks.
- 60 seconds: a real question (no spoiler, no XP) with its story, the two sourced facts of the day; each part leaves alone. The phone board's short story is the first sentence of the story.
- Hot right now: the real ranking (Plan section 3 A), the three filter lists come from the module, `All` alternates. The block and its ItemList leave when there is no ranking.
- For you or Start easy: signed in, the next quiz of the fandom and the bridge (there is no Continue card: the run in progress lives in the browser of each site); a fan with nothing played sees Start easy without the "Save your progress" card (they have a passport).
- Crossover: the three picks of the week and one sourced fact; the fact line leaves when none is available; the block leaves with no pick.
- Top fans: public profiles only, no Team account; the board leaves when empty and the passport takes the row (it is empty on o1-dev: no public stamp). A fan who keeps the level private shows no level.
- Passport: real username, level, sites joined, progress to the next level and the daily streak of each site ("Streak 0 days" when there is none). Signed out: `HubShares`' wording (the one wording difference, item 5, owner decision: keep `HubShares`).
- Footer: unchanged.

What still lacks data: the Continue card (needs a server table of runs in progress), the "verified first" order of OtakuQuiz's start-up week (no per-quiz flag), the completion rate of Hot (no record of started runs), Top fans on a database with no public profile. Each leaves the page cleanly.
