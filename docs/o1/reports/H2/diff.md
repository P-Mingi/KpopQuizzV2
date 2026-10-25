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

Data (lot H2b):

4. The numbers, titles, handles, streaks and links are the design's sample data, from the loaders `lib/site/hub/home-*.ts`. The signed-in fan is real for the username, the level and the sites joined (`readHubPassport`); the progress to the next level (72%) and the streaks (6 and 2 days) are the design's samples. Links of the sample quizzes point at plausible paths of their own site, which exist only once H2b gives real slugs.

Words that are not the design's (one decision, for the owner):

5. Passport block, signed out (5.10% of the 1440 block; the block keeps its height because the Top fans card is the taller one): the design lists "Your username and avatar", "Your level, if you make it public", "The sites you joined" and "They never see". The task says the block reuses `HubShares`, which prints the keys of the privacy page word for word (privacy policy, point 5: "The sites you joined, only if you choose to show them"; "Your username" and "Your avatar" are two lines; the title is "Other sites never see"). I kept the legal wording and gave the block the design's two columns, sizes and colours. Changing the three keys `shares.*` (copy/hub/h1.ts) to the design's text would change the privacy page too, and drops a privacy condition ("only if you choose to show them"), so it is the owner's call.

Noise that is not a difference:

6. Hot right now, 1440 and 390 (0.01%, 65 and 32 pixels): scattered anti-aliasing pixels, no shape.
7. Interactions, `surprise` and `surprise-another` (0.5%): the design and the page scroll the page by different amounts to reach the button, so the sticky bar covers a different part of the hero, plus the two door logos. The pick card itself is identical.
8. Phone filter (0.10%, 0.12%): scattered text pixels, no shape.

## Things the design does not decide, and what the page does

- Mobile signed in: the Mobile board has no signed-in state. The page shows the desktop signed-in blocks on the phone width (level chip in the bar, "For you, name" as the two or three plain cards, the passport with the progress bar and the streaks), no reference to compare.
- Search ("Search both sites"): a button, as in the design; the design's script gives it no action, so it does none (lot H2b wires it).
- Options of the question: the design's `.fq-opt:hover` border colour never shows (its inline border wins), so the page has none.
- One markup serves both boards (a text that differs, such as "Play today's quiz" and "Play", is in the markup twice and the sheet shows one; blocks the phone board leaves out are hidden by the sheet at 719 px and below). Landmarks: bar (`header`), `main`, `footer` are siblings in the page, as in the Main board.
- Fonts: DM Sans from `next/font` (self-hosted, with the optical size axis), the face the design links from Google Fonts.
- Dark mode: the existing dark tokens, with local `--hub-*` values for the site colours (KpopQuiz pink and OtakuQuiz orange), AA checked in `lib/site/hub/home-styles.test.ts`.
