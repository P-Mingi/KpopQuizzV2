# C1 pixel check (UX v11.2, Phase 3)

Branch `ux11/c1-check`. Implementation: the shared flag-ON production build of `feat/ux-v1-v11` on
http://localhost:3021 (head in each `verdict.json`: `at`, `url`). Reference:
`v11/checks/reference/<w>-<theme>-<state>.png` + `styles.json` (`v11/capture-prototype.mjs`).
Harness: `harness/c1-pixel.mjs` (drivers and landmark maps in `harness/drivers.mjs`), extra
checks `harness/c1-extra.mjs`, this table `harness/c1-summary.mjs`.

Per state and combo: landmark boxes within 2px (x, y, w, h as listed per landmark; text-driven
heights are not compared), computed styles equal to `styles.json` for its 27 landmarks and to
the prototype measured live in the same state for the others (px within 0.5), no horizontal
scroll at 390, and a masked pixel diff (photos and text masked on both sides; information only,
real data changes the page length). Cells: verdict, landmarks passed / compared, masked diff %.
Evidence: `<state>/<w>-<theme>-side.webp` (reference | implementation), `-diff.webp` (red =
differs, blue = masked), `verdict.json` (every number). No production write: every mutating
request was answered locally (payloads in `verdict.json` `writes`).

Totals (152 checks, latest run of each): pass 136, fail 0, not verified 16.

Runs: loop 1 on dcc3159 (all 38 states); loop 2 on cc6c394 (fix loop 1 merged) re-ran the states
whose code changed: groups, header-sheet, home, home-guest, hub-blackpink, hub-ateez, hub-empty,
quiz, end, end-guest, share, create-1, create-2, create-3, blindtest, blindtest-playlist-open,
blindtest-group-search, btplay, btplay-answered, community (80 checks, 80 pass). Each combo's
`at` in `verdict.json` dates its run. C1-001 (P3) and C1-002 (A0): fixed, verified in loop 2.

| State | Owner | 1440 light | 1440 dark | 390 light | 390 dark | Notes |
|---|---|---|---|---|---|---|
| home | P1 | pass 17/17, 3.54% | pass 17/17, 9.92% | pass 17/17, 15% | pass 17/17, 19.43% |  |
| home-guest | P1 | pass 19/19, 10.45% | pass 19/19, 12.93% | pass 19/19, 22.97% | pass 19/19, 24.45% |  |
| groups | P3 | pass 11/11, 5.92% | pass 11/11, 5.79% | pass 11/11, 5.68% | pass 11/11, 5.54% |  |
| quizzes | P2 | not verified 3/3, 87.18% | not verified 3/3, 87.11% | not verified 3/3, 89.56% | not verified 3/3, 89.37% | pending P2 (branch waits for the owner; the server shows the pre-P2 page) |
| quiz | P4 | pass 15/15, 12.95% | pass 15/15, 12.81% | pass 15/15, 23.94% | pass 15/15, 23.77% |  |
| play | P4 | pass 6/6, 0.01% | pass 6/6, 0.01% | pass 6/6, 0.15% | pass 6/6, 0.15% |  |
| play-answered | P4 | pass 9/9, 0.42% | pass 9/9, 0.42% | pass 9/9, 3.3% | pass 9/9, 5.19% |  |
| play-qotd | P4 | pass 4/4, 0.67% | pass 4/4, 0.65% | pass 4/4, 1.71% | pass 4/4, 2.07% |  |
| end-guest | P4 | pass 11/11, 8.03% | pass 11/11, 8.08% | pass 11/11, 16.86% | pass 11/11, 17.38% |  |
| end | P4 | pass 11/11, 9.8% | pass 11/11, 9.92% | pass 11/11, 17.76% | pass 11/11, 17.85% |  |
| share | P4 | pass 5/5, 1.05% | pass 5/5, 1.05% | pass 5/5, 0.89% | pass 5/5, 0.53% |  |
| create-1 | P5 | pass 7/7, 6.63% | pass 7/7, 6.93% | pass 7/7, 15.61% | pass 7/7, 16.05% |  |
| create-2 | P5 | pass 7/7, 4.29% | pass 7/7, 4% | pass 7/7, 6.15% | pass 7/7, 5.69% |  |
| create-3 | P5 | pass 7/7, 1.37% | pass 7/7, 1.37% | pass 7/7, 1.98% | pass 7/7, 1.94% |  |
| signin | P5 | pass 4/4, 0.63% | pass 4/4, 0.62% | pass 4/4, 1.52% | pass 4/4, 0.73% |  |
| blindtest | P6 | pass 14/14, 2.37% | pass 14/14, 2.67% | pass 14/14, 4.94% | pass 14/14, 4.63% |  |
| blindtest-playlist-open | P6 | pass 6/6, 2.51% | pass 6/6, 4.31% | pass 6/6, 1.97% | pass 6/6, 10.34% |  |
| blindtest-group-search | P6 | pass 5/5, 2.83% | pass 5/5, 3.38% | pass 5/5, 5.49% | pass 5/5, 5.58% |  |
| btplay | P6 | pass 5/5, 0.07% | pass 5/5, 0.06% | pass 5/5, 0.43% | pass 5/5, 0.49% |  |
| btplay-answered | P6 | pass 6/6, 0.86% | pass 6/6, 0.87% | pass 6/6, 0.59% | pass 6/6, 0.58% |  |
| btend-ranked | P7 | not verified 3/3, 6.57% | not verified 3/3, 10.68% | not verified 3/3, 15.8% | not verified 3/3, 20.67% | NOT verified until the ranked migration is applied (populated ranked state) |
| ranked | P7 | not verified 5/5, 22.79% | not verified 5/5, 23.82% | not verified 5/5, 30.15% | not verified 5/5, 31.66% | populated state NOT verified until the ranked migration is applied; the not-live state is checked |
| community | P8 | pass 11/11, 14.16% | pass 11/11, 14.85% | pass 10/10, 14.89% | pass 10/10, 16.1% |  |
| post-challenge | P8 | not verified 6/6, 24.46% | not verified 6/6, 24.45% | not verified 6/6, 15.67% | not verified 6/6, 15.67% | NOT verified: no challenge post exists (the challenge store is a pending migration, P8 report); the thread post view stands in for the shared post layout |
| post-blog | P8 | pass 7/7, 9.2% | pass 7/7, 9.2% | pass 7/7, 33.12% | pass 7/7, 33.1% |  |
| post-debate | P8 | pass 7/7, 22.87% | pass 7/7, 22.65% | pass 7/7, 18.7% | pass 7/7, 18.23% |  |
| editor | P8 | pass 5/5, 1.37% | pass 5/5, 1.18% | pass 5/5, 4.07% | pass 5/5, 3.91% |  |
| leaderboard | P9 | pass 8/8, 48.23% | pass 8/8, 49.31% | pass 8/8, 64.78% | pass 8/8, 65.86% |  |
| hub-blackpink | P3 | pass 14/14, 41.03% | pass 14/14, 40.74% | pass 14/14, 46.45% | pass 14/14, 46.39% |  |
| hub-ateez | P3 | pass 14/14, 40.58% | pass 14/14, 40.33% | pass 14/14, 50.18% | pass 14/14, 50.1% |  |
| hub-empty | P3 | pass 8/8, 44.56% | pass 8/8, 44.61% | pass 8/8, 51.98% | pass 8/8, 52.05% |  |
| passport | P10 | pass 10/10, 3.7% | pass 10/10, 3.78% | pass 11/11, 22.57% | pass 11/11, 23.15% |  |
| passport-badges | P10 | pass 6/6, 56.12% | pass 6/6, 56.16% | pass 7/7, 67.18% | pass 7/7, 67.32% |  |
| settings | P10 | pass 5/5, 5.89% | pass 5/5, 5.77% | pass 6/6, 9.16% | pass 6/6, 8.9% |  |
| header-sheet | P10 | pass 4/4, 2.57% | pass 4/4, 2.69% | pass 4/4, 1.36% | pass 4/4, 0.46% |  |
| notifications | P11 | pass 7/7, 6.14% | pass 7/7, 6.14% | pass 8/8, 11.2% | pass 8/8, 11.22% |  |
| search | P11 | pass 5/5, 0.38% | pass 5/5, 0.36% | pass 5/5, 1.02% | pass 5/5, 0.98% |  |
| bell | P11 | pass 3/3, 1.72% | pass 3/3, 2.6% | pass 3/3, 0.94% | pass 3/3, 0.88% |  |

## Extra checks (`_extra/verdict.json`)

| Check | Result |
|---|---|
| Nav fits at 1280 and 1440 (one line, no overlap, no truncation) | 1280-user: pass, 1280-guest: pass, 1440-user: pass, 1440-guest: pass |
| Hover (cards, buttons, tabs, rows, nav links) vs the prototype :hover | quiz card-light: pass, primary button-light: pass, ghost button-light: pass, text card-light: pass, tab (off)-light: pass, nav link-light: pass, row-light: pass, quiz card-dark: pass, primary button-dark: pass, ghost button-dark: pass, text card-dark: pass, tab (off)-dark: pass, nav link-dark: pass, row-dark: pass |
| Keyboard focus ring vs the prototype :focus-visible (loop 2 adds the community feed panel) | quiz card-light: pass, primary button-light: pass, tab-light: pass, nav link-light: pass, community feed panel-light: pass, quiz card-dark: pass, primary button-dark: pass, tab-dark: pass, nav link-dark: pass, community feed panel-dark: pass |
| Header picture sheet (C1-002, loop 2): resting drop zone when opened, 2px pink ring on keyboard focus only | light: pass, dark: pass |
| Theme tokens (prototype --x vs --ux-x) | light: pass, dark: pass |
| Reduced motion (no running infinite animation, transitions off) | home: pass, blindtest game: pass, quiz game: pass |

## Comparison notes (every relaxation and its reason)

Default per landmark: the box parts listed in `drivers.mjs` within 2px and all 16 style props.
Photos: fill and initials-fallback text styles are not compared (box, radius, photo edge are).
A radius on a box with no fill, border or shadow is not compared (invisible; the prototype H1
radius is its focus style). A photo edge drawn by an `::after` overlay counts as the inset shadow.

- **home**: quiz of the day (390 box: x, w): phone: the real title and replay line wrap (text); quiz card photo (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo; group photo (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo
- **home-guest**: quiz of the day (390 box: x, y, w): phone: the real title and replay line wrap (text); quiz card photo (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo; group photo (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo
- **groups**: group photo (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo
- **quiz**: cover (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo
- **play**: timer ring (styles not compared: background-image): the ring sweep is a live countdown
- **play-answered**: timer ring (styles not compared: background-image): live countdown; answer right (390 box: w): phone: the real answer text wraps; answer picked wrong (390 box: w): phone: the real answer text wraps; answer rest (390 box: w): phone: the real answer text wraps
- **play-qotd**: timer ring (styles not compared: background-image): live countdown
- **end-guest**: state: known deviation (loop 2, documented by P4, C2-003): the live Discord line + Brag row (p4-discord) sits under the result actions; it is live content, so it is recorded, not failed; the rest of the layout is compared; photocard (styles not compared: background-image, background-color, color, border-top-color): photo; the container colour is not drawn (every text child sets white, same as the reference)
- **end**: state: known deviation (loop 2, documented by P4, C2-003): the live Discord line + Brag row (p4-discord) sits under the result actions; it is live content, so it is recorded, not failed; the rest of the layout is compared; photocard (styles not compared: background-image, background-color, color, border-top-color): photo; the container colour is not drawn (every text child sets white, same as the reference)
- **share**: state: known deviation (loop 2, documented by P4, C2-003): the live Discord line + Brag row (p4-discord) sits under the result actions; it is live content, so it is recorded, not failed; the rest of the layout is compared (behind the scrim)
- **create-1**: state: known deviation (loop 2, documented by P5): the restored live help lines push the cover field 28.8px down on step 1 (field tops are compared as gaps for information only)
- **create-3**: sticky bar (top from stepper): 1440 short step: the bar follows the content (on phones it is pinned to the viewport bottom, compared as is); top measured from the stepper (the SEO-locked intro above is one line shorter)
- **blindtest**: setup row (390 box: x, w): phone: the stacked row ends with "Your best" only when the viewer has a best today (real data)
- **blindtest-playlist-open**: setup row (390 box: x, w): phone: the stacked row ends with "Your best" only when the viewer has a best today (real data); playlist menu (top from setup row): height: the live number of mixes (real data); top measured from the setup row (the SEO-locked lead above it is shorter)
- **btplay**: orb (styles not compared: box-shadow): the reference caught the breathing glow mid-animation (P6)
- **btplay-answered**: reveal: width and x follow the song and artist text (centred block); reveal cover (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo
- **post-blog**: cover (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo
- **hub-blackpink**: hub photo (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo
- **hub-ateez**: hub photo (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height, letter-spacing): photo
- **passport**: state: checked on /u/testtest as a guest (signed-in /me NOT verified, owner decision 1): no owner controls; avatar (styles not compared: background-image, background-color, color, border-top-color, font-size, font-weight, line-height): photo in the reference, initials here (the test user has no photo): text styles of the initial are not the photo; xp bar (390 box: x, w, h): phone: the identity block above wraps with the real name, bias and badge (data)
- **passport-badges**: state: checked on /u/testtest as a guest (signed-in /me NOT verified, owner decision 1)
- **settings**: person preview (styles not compared: margin-top): A0/P10 documented
- **header-sheet**: state: signed in on /u/testtest (public read page, owner controls on the client); never /me
- **notifications**: state: rows = P11's fixture (the prototype's sample, p11.spec.ts); streak row saved (13 days, played today) as the reference PNG draws it (the capture reaches notifications after a finished quiz)
- **search**: search field row (styles not compared: box-shadow): documented a11y deviation (A0 report section 9, P11 5; DESIGN-SPEC 16.9 focus): the focused field turns the row hairline into a 2px pink line; the prototype has no focus indicator there

## Observed, not filed (real data, SEO lock, harness)

- Leaderboard: the H1 "Community", its intro and the "Around the community" section are the live page's (SEO lock, P9 report); the prototype H1 is "Leaderboard". Landmarks pass; the page is longer.
- Group hubs: the SEO-locked lead and the extra side sections (newest quizzes, read more, fan knowledge) make the page longer; landmarks pass.
- Signed-in home: no "Continue playing" and no streak pill (the test user has no unfinished run and no streak): real data.
- Community feed: some thread titles stop mid-word at 80 characters; the post page H1 shows the same stored Verse title (data, not layout; noted for P8 / C3).
- Passport states are checked as a guest on /u/testtest (owner decision 1): no owner controls, initials instead of a photo.
- Header sheet reference: the page behind the scrim shows the Badges tab (the capture reached it from passport-badges); only the sheet is compared.
- Settings: Appearance shows the theme the checker forces (localStorage theme); the reference shows System.
- Loop 2 (cc6c394): group hubs list 12 quiz cards with a native <details> Show all (P3 change); the card grid landmarks pass, the page is longer.
- Loop 2 known deviation, not a failure: end, end-guest and share (behind the scrim) show the live Discord line + Brag row under the result actions (P4, C2-003, live content). The rest of the layout passes.
- Loop 2 known deviation, not a failure: create-1 restored live help lines push the cover field 28.8px down (P5, documented); field tops are compared as gaps for information only.
- Game states use the page agents' fixtures where the specs do (blindtest questions and silent audio, P6; notifications rows, P11); quiz runs are real questions with the save stubbed (so the results show no "beat" percentile).

Issues filed: `v11/issues/<owner>.md` (ids C1-nnn).
