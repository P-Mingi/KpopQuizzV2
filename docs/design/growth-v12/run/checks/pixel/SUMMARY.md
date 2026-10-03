# C1 pixel check (V12 run, Phase 3)

Branch `v12/c1-check` (from `feat/v12` 29dd95a). Implementation: ORCH's shared flag-on production build of afb83f4
(`NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1`, tracking unset) on http://localhost:3071. Each combo's `at` and `base` in
`verdict.json` date its run. Reference: `run/checks/reference/` (40 v12 states, `styles.json`) and
`run/checks/reference/v11/` (38 v11 states on the v12 prototype).

Harness (`harness/`): `c1-pixel-v12.mjs` (v12 states; drivers and landmark pairs in `drivers-v12*.mjs`, taken from
each agent's own spec), `c1-pixel-v11.mjs` (v11 regression set; the v11 C1 harness retargeted, drivers in
`drivers-v11.mjs`), `c1-extra.mjs` (v11 extras: nav fit, hover, focus, header sheet, theme tokens, reduced motion),
`c1-extra-v12.mjs` (hover and focus on the new v12 controls, reduced motion on the new pages), `c1-summary.mjs`
(this file), `run-batch.sh` (batches of at most 10 states).

Per state and variant: landmark boxes within 2px of the prototype measured live in the same state (the capture
sequence replayed), computed styles equal to `styles.json` with the owner deviations applied (`deviations.mjs`), or
to the live prototype for landmarks outside `styles.json` (px within 0.5), no sideways scroll at 390, and a masked
pixel diff vs the reference PNG (photos and text masked on both sides; information only: real data and page length
differ). Framing as the reference: v12 states are viewport shots with the anchor 80px from the top; v11 states are
full pages except overlays and in-game states. Cells: verdict, landmarks passed / compared, masked diff %.
Evidence: `<state>/<w>-<theme>-side.webp` (reference | implementation), `-diff.webp` (red differs, blue masked),
`verdict.json` (every number, the url, the writes answered locally). v11 states under `v11/<state>/`.

No production write: every POST / PUT / PATCH / DELETE to `/api/**` or Supabase was answered locally (recorded in
`verdict.json` `writes`). Signed in only through the Playwright setup project (storage state deleted at the end);
`/me` and `/profile` never loaded. States whose data waits for pending SQL are "not verified" with the file named,
checked in their hidden or not-live form (`hiddenForm` in `verdict.json`).

Totals (78 states x 4 variants): pass 240, fail 0, not verified 72, not run 0.

## V12 states (40)

| State | Owner | 1440 light | 1440 dark | 390 light | 390 dark | Notes |
|---|---|---|---|---|---|---|
| bthub-playlists | G3 | pass 3/3, 8.7% | pass 3/3, 13.39% | pass 3/3, 11.33% | pass 3/3, 13.92% |  |
| bthub-live-band | G3 | pass 2/2, 0.6% | pass 2/2, 0.76% | pass 2/2, 0.82% | pass 2/2, 0.87% |  |
| land-en | G3 | pass 8/8, 10.88% | pass 8/8, 13.76% | pass 8/8, 8.34% | pass 8/8, 12% |  |
| land-en-steps | G3 | pass 1/1, 0.18% | pass 1/1, 0.17% | pass 1/1, 0.32% | pass 1/1, 0.37% |  |
| land-en-faq | G3 | pass 1/1, 0.58% | pass 1/1, 0.52% | pass 1/1, 1.49% | pass 1/1, 1.68% |  |
| land-fr | G3 | pass 6/6, 10.65% | pass 6/6, 13.5% | pass 6/6, 8.02% | pass 6/6, 11.78% |  |
| land-es | G3 | pass 6/6, 10.92% | pass 6/6, 13.82% | pass 6/6, 8.26% | pass 6/6, 12.06% |  |
| land-id | G3 | pass 6/6, 10.73% | pass 6/6, 13.55% | pass 6/6, 10.23% | pass 6/6, 14.21% |  |
| theme-hits26 | G3 | not verified 0/0, 13.54% | not verified 0/0, 15.39% | not verified 0/0, 14.45% | not verified 0/0, 18.44% | NOT verified until v12-g2-03-releases-2026.sql is applied (kpop-hits-2026 has under 10 playable songs; the page answers 404 and the hub hides its card) |
| theme-hits25 | G3 | pass 4/4, 7.65% | pass 4/4, 7.68% | pass 4/4, 0.33% | pass 4/4, 0.36% |  |
| theme-gen5 | G3 | pass 4/4, 0.22% | pass 4/4, 0.22% | pass 4/4, 0.41% | pass 4/4, 0.47% |  |
| theme-viral | G3 | pass 4/4, 1.71% | pass 4/4, 1.53% | pass 4/4, 0.41% | pass 4/4, 0.45% |  |
| theme-kpdh | G3 | not verified 0/0, 6.2% | not verified 0/0, 9.7% | not verified 0/0, 14.36% | not verified 0/0, 22.06% | NOT verified until v12-g2-07-kpdh.sql is applied (the KPop Demon Hunters playlist has no songs yet; the page answers 404 and the hub hides its card) |
| theme-kpdh-tracks | G3 | not verified 0/0, 5.6% | not verified 0/0, 8.58% | not verified 0/0, 1.79% | not verified 0/0, 8.57% | NOT verified until v12-g2-07-kpdh.sql is applied (the KPop Demon Hunters playlist has no songs yet; the page answers 404 and the hub hides its card) |
| kpdh-intro | G5 | pass 3/3, 0.22% | pass 3/3, 0.21% | pass 3/3, 0.42% | pass 3/3, 0.47% |  |
| kpdh-question | G5 | pass 3/3, 0.19% | pass 3/3, 0.19% | pass 3/3, 0.38% | pass 3/3, 0.43% |  |
| kpdh-result | G5 | pass 5/5, 0.98% | pass 5/5, 1.51% | pass 5/5, 4.51% | pass 5/5, 5.38% | the distribution and the "same result" line show only with real shares (G5); the result card height is compared only when they show |
| wma-question | G5 | pass 3/3, 0.59% | pass 3/3, 0.32% | pass 3/3, 2.16% | pass 3/3, 0.9% |  |
| wma-result | G5 | pass 6/6, 3.51% | pass 6/6, 2.61% | pass 6/6, 4.4% | pass 6/6, 4.31% |  |
| nta-intro | G6 | pass 5/5, 2.42% | pass 5/5, 1.42% | pass 5/5, 12.73% | pass 5/5, 10.48% |  |
| nta-play | G6 | pass 5/5, 0.17% | pass 5/5, 0.17% | pass 5/5, 0.42% | pass 5/5, 0.47% |  |
| nta-result | G6 | pass 5/5, 0.27% | pass 5/5, 1.07% | pass 5/5, 0.41% | pass 5/5, 0.4% | community line NOT verified until v12-g6-name-all.sql is applied (hidden as specified) |
| quiz-bonus | G7 | pass 3/3, 0.87% | pass 3/3, 1.01% | pass 3/3, 2.06% | pass 3/3, 2.33% | pairs answered by the G7 fixture (the prototype's five BTS pairs) so text-driven boxes compare; the save of the play is answered locally |
| quiz-bonus-voted | G7 | not verified 3/3, 0.92% | not verified 3/3, 1.05% | not verified 3/3, 2.25% | not verified 3/3, 2.52% | NOT verified until v12-g7-this-or-that.sql is applied (duel_cast_song_vote: the real vote and split); checked with the vote answered locally by the G7 fixture |
| hub-ways-to-play | G8 | pass 4/4, 0.11% | pass 4/4, 0.12% | pass 4/4, 0.33% | pass 4/4, 0.4% |  |
| hub-fans-picked | G8 | not verified 4/4, 1.51% | not verified 4/4, 1.13% | not verified 4/4, 2.62% | not verified 4/4, 2.94% | NOT verified until v12-g7-this-or-that.sql and v12-g7-song-questions.sql are applied and a group passes the 100-vote floor (no group is ranked: the section and its tile are absent, checked) |
| hub-empty-riize | G8 | pass 3/3, 1.87% | pass 3/3, 5.4% | pass 3/3, 1.12% | pass 3/3, 1.15% |  |
| hub-thin-katseye | G8 | pass 4/4, 0.28% | pass 4/4, 0.2% | pass 4/4, 6.86% | pass 4/4, 11.57% |  |
| share-kit | G8 | pass 2/2, 4.34% | pass 2/2, 1.72% | pass 2/2, 13.03% | pass 2/2, 12.83% | create done reached with the P5 sample draft, the publish and the kit read answered locally (G8 fixture, linkPlays null: "plays from your link" NOT verified until v12-g8-share-link-plays.sql) |
| creators | G8 | pass 4/4, 3.05% | pass 4/4, 2.93% | pass 4/4, 2.07% | pass 4/4, 1.47% | Rising in each fandom: shown only with real rows; compared when present |
| live-setup | G4 | not verified 2/2, 0.83% | not verified 2/2, 0.8% | not verified 2/2, 5.19% | not verified 2/2, 8.27% | NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form |
| live-lobby | G4 | not verified 0/0, 3.42% | not verified 0/0, 3.85% | not verified 0/0, 7.05% | not verified 0/0, 11.1% | NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form |
| live-join | G4 | not verified 0/0, 2.83% | not verified 0/0, 3.24% | not verified 0/0, 8.1% | not verified 0/0, 11.57% | NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form |
| live-round | G4 | not verified 0/0, 14.01% | not verified 0/0, 14.34% | not verified 0/0, 14.2% | not verified 0/0, 17.93% | NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form |
| live-answer | G4 | not verified 0/0, 14.13% | not verified 0/0, 14.47% | not verified 0/0, 14.16% | not verified 0/0, 17.9% | NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form |
| live-reveal | G4 | not verified 0/0, 6.97% | not verified 0/0, 7.01% | not verified 0/0, 14.67% | not verified 0/0, 18.39% | NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form |
| live-board | G4 | not verified 0/0, 1.55% | not verified 0/0, 1.31% | not verified 0/0, 5.23% | not verified 0/0, 8.96% | NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form |
| live-end | G4 | not verified 0/0, 4.92% | not verified 0/0, 4.92% | not verified 0/0, 18.98% | not verified 0/0, 23.03% | NOT verified until v12-g4-live.sql (and v12-g4-party-rls.sql) are applied: /api/live answers 503, no room can open; checked in its not-live form |
| community-team-post | G9 | not verified 1/1, 1.57% | not verified 1/1, 4.56% | not verified 1/1, 2.3% | not verified 1/1, 4.41% | NOT verified until v12-g9-editorial.sql and v12-g9-editorial-accounts.sql are applied (no editorial account or post exists); the feed is checked to carry no Team badge |
| post-team | G9 | not verified 1/1, 1.72% | not verified 1/1, 3.89% | not verified 1/1, 2.94% | not verified 1/1, 2.07% | NOT verified until v12-g9-editorial.sql and v12-g9-editorial-accounts.sql are applied (no editorial account or post exists); the feed is checked to carry no Team badge |

## V11 regression set (38)

| State | Owner | 1440 light | 1440 dark | 390 light | 390 dark | Notes |
|---|---|---|---|---|---|---|
| home | P1 | pass 17/17, 3.36% | pass 17/17, 9.93% | pass 17/17, 12.37% | pass 17/17, 16.23% |  |
| home-guest | P1 | pass 19/19, 10.31% | pass 19/19, 12.92% | pass 19/19, 18.09% | pass 19/19, 20.09% |  |
| groups | P3 | pass 11/11, 7.87% | pass 11/11, 7.42% | pass 11/11, 5.48% | pass 11/11, 5.15% |  |
| quizzes | P2 | pass 7/7, 73.39% | pass 7/7, 73.23% | pass 7/7, 71.49% | pass 7/7, 71.06% | P2 deviations (v11 RUN-STATE 19, 32): the live H1, intro and breadcrumb (SEO lock) push the grid down; card height follows real titles |
| quiz | P4 | pass 15/15, 12.88% | pass 15/15, 12.84% | pass 15/15, 21.65% | pass 15/15, 21.66% |  |
| play | P4 | pass 6/6, 0% | pass 6/6, 0.01% | pass 6/6, 1.73% | pass 6/6, 0.14% |  |
| play-answered | P4 | pass 9/9, 0.41% | pass 9/9, 0.42% | pass 9/9, 4.13% | pass 9/9, 6.84% |  |
| play-qotd | P4 | pass 4/4, 0.66% | pass 4/4, 0% | pass 4/4, 2.13% | pass 4/4, 0.15% |  |
| end-guest | P4 | pass 11/11, 9.34% | pass 11/11, 10.41% | pass 11/11, 15.4% | pass 11/11, 17.93% | known deviation (loop 2, documented by P4, C2-003): the live Discord line + Brag row (p4-discord) sits under the result actions; it is live content, so it is recorded, not failed; the rest of the layout is compared |
| end | P4 | pass 11/11, 9.35% | pass 11/11, 10.43% | pass 11/11, 15.39% | pass 11/11, 17.92% | known deviation (loop 2, documented by P4, C2-003): the live Discord line + Brag row (p4-discord) sits under the result actions; it is live content, so it is recorded, not failed; the rest of the layout is compared |
| create-1 | P5 | pass 7/7, 6.62% | pass 7/7, 6.94% | pass 7/7, 11.66% | pass 7/7, 12.18% | known deviation (loop 2, documented by P5): the restored live help lines push the cover field 28.8px down on step 1 (field tops are compared as gaps for information only) |
| create-2 | P5 | pass 7/7, 4.25% | pass 7/7, 4.01% | pass 7/7, 4.83% | pass 7/7, 4.49% |  |
| create-3 | P5 | pass 7/7, 1.26% | pass 7/7, 1.39% | pass 7/7, 8.03% | pass 7/7, 8.24% |  |
| blindtest | P6 | pass 14/14, 5.37% | pass 14/14, 12.9% | pass 14/14, 10.35% | pass 14/14, 17.61% |  |
| blindtest-playlist-open | P6 | pass 6/6, 8.99% | pass 6/6, 10.88% | pass 6/6, 2.5% | pass 6/6, 11.17% |  |
| blindtest-group-search | P6 | pass 5/5, 5.93% | pass 5/5, 14.27% | pass 5/5, 11.56% | pass 5/5, 19.95% |  |
| btplay | P6 | pass 5/5, 0.02% | pass 5/5, 0.02% | pass 5/5, 0.29% | pass 5/5, 0.33% |  |
| btplay-answered | P6 | pass 6/6, 0.06% | pass 6/6, 0.06% | pass 6/6, 0.52% | pass 6/6, 0.59% |  |
| btend-ranked | P7 | not verified 3/3, 13.07% | not verified 3/3, 17.82% | not verified 3/3, 14.87% | not verified 3/3, 21.87% |  |
| ranked | P7 | not verified 5/5, 34.89% | not verified 5/5, 36.17% | not verified 5/5, 41.59% | not verified 5/5, 42.94% |  |
| community | P8 | pass 11/11, 5.24% | pass 11/11, 6.69% | pass 10/10, 2.8% | pass 10/10, 4.26% |  |
| post-challenge | P8 | not verified 6/6, 24.57% | not verified 6/6, 24.55% | not verified 6/6, 18.83% | not verified 6/6, 18.76% |  |
| post-blog | P8 | pass 7/7, 9.27% | pass 7/7, 9.27% | pass 7/7, 30.87% | pass 7/7, 30.84% |  |
| post-debate | P8 | pass 7/7, 22.89% | pass 7/7, 22.67% | pass 7/7, 22.73% | pass 7/7, 22.16% |  |
| editor | P8 | pass 5/5, 0.31% | pass 5/5, 0.29% | pass 5/5, 3.98% | pass 5/5, 3.76% |  |
| leaderboard | P9 | pass 8/8, 48.06% | pass 8/8, 49.16% | pass 8/8, 63.05% | pass 8/8, 64.14% |  |
| hub-blackpink | P3 | pass 14/14, 18% | pass 14/14, 18.01% | pass 14/14, 30.27% | pass 14/14, 30.46% |  |
| hub-ateez | P3 | pass 14/14, 38.23% | pass 14/14, 38.17% | pass 14/14, 44.33% | pass 14/14, 44.45% |  |
| hub-empty | P3 | pass 8/8, 31.93% | pass 8/8, 33.66% | pass 8/8, 36.48% | pass 8/8, 38.18% |  |
| passport | P10 | pass 10/10, 3.67% | pass 10/10, 3.79% | pass 11/11, 25.76% | pass 11/11, 26.17% | checked on /u/testtest as a guest (signed-in /me NOT verified, owner decision 1): no owner controls |
| passport-badges | P10 | pass 6/6, 56.69% | pass 6/6, 56.19% | pass 7/7, 67.57% | pass 7/7, 66.94% | checked on /u/testtest as a guest (signed-in /me NOT verified, owner decision 1) |
| settings | P10 | pass 5/5, 5.71% | pass 5/5, 5.78% | pass 6/6, 7% | pass 6/6, 7.08% |  |
| header-sheet | P10 | pass 4/4, 2.58% | pass 4/4, 2.71% | pass 4/4, 1.35% | pass 4/4, 0.46% | signed in on /u/testtest (public read page, owner controls on the client); never /me |
| notifications | P11 | pass 7/7, 6.16% | pass 7/7, 6.16% | pass 8/8, 8.36% | pass 8/8, 8.38% | rows = P11's fixture (the prototype's sample, p11.spec.ts); streak row saved (13 days, played today) as the reference PNG draws it (the capture reaches notifications after a finished quiz) |
| search | P11 | pass 5/5, 0.39% | pass 5/5, 0.38% | pass 5/5, 1.08% | pass 5/5, 1.04% |  |
| share | P4 | pass 5/5, 0.61% | pass 5/5, 0.62% | pass 5/5, 0.87% | pass 5/5, 0.52% | known deviation (loop 2, documented by P4, C2-003): the live Discord line + Brag row (p4-discord) sits under the result actions; it is live content, so it is recorded, not failed; the rest of the layout is compared (behind the scrim) |
| signin | P5 | pass 4/4, 0.64% | pass 4/4, 0.63% | pass 4/4, 1.27% | pass 4/4, 0.72% |  |
| bell | P11 | pass 3/3, 1.81% | pass 3/3, 2.63% | pass 3/3, 1.75% | pass 3/3, 0.87% |  |


## Extra checks (`_extra/verdict.json` v11 set, `_extra/verdict-v12.json` new controls)

| Check | Result |
|---|---|
| Nav fits at 1280 and 1440, signed in and guest (one line, no overlap, no truncation, 65px) | 4 / 4 pass |
| Hover, v11 controls (quiz card, primary, ghost, text card, tab, nav link, row), light and dark | 14 / 14 pass (light surfaces and pink ink are the owner deviations, recorded in `deviated`) |
| Hover, v12 controls (theme card, language switch link, live band ghost button, personality answer, This or that song, Ways to play tile, quiz template), light and dark | 12 / 14 pass; language switch link fails in both themes (C1-001, A1) |
| Keyboard focus ring, v11 controls | 10 / 10 pass |
| Keyboard focus ring, v12 controls | 14 / 14 pass |
| Header picture sheet (resting drop zone, ring on keyboard focus only) | light pass, dark pass |
| Theme tokens, prototype `--x` vs `--ux-x` (59 compared) | dark pass (0 differ); light pass, the 5 that differ are the owner deviations (`--page`, `--surface`, `--surface-2`, `--pink-ink`, `--nav-bg`); `--plum*` have no counterpart (feed only base rules the v11 rules override, as in v11) |
| Reduced motion (no infinite or long animation, no transition) | v11: home, blindtest game, quiz game pass; v12: land-en, theme-gen5, bthub-live-band, kpdh-question, nta-play, hub-ways-to-play, live-setup pass |
| No sideways scroll at 390 | every v12 and v11 state measured: 0px overflow (part of each verdict) |

## Comparison notes (every relaxation and its reason)

Owner deviations applied to the reference (`harness/deviations.mjs`): the six rows of `e2e/ux-v1/helpers/landmarks.ts`
(v11 A0 fix 5 warm ground and surfaces, fix 8 94% nav glass), plus four rows that follow from the same tokens: the
quiz and blindtest game bars paint `--ux-nav-bg` (94% warm glass), the tab bar is the 94% glass of the brief, the
community phone rail panel is a bordered card filled by `--ux-card-fill` (v11 P8 warm ground token sweep), and the
passport avatar ring is drawn in `--ux-page` (the warm ground).

Agent deviations taken from the agents' own specs and reports (skips listed per landmark in `verdict.json` `why`):
landing hero height (fans playing today eyebrow hidden until bt_runs, G3), `.langsw` 336.8px at 390 (A1 deviation 1),
theme card and playlist hero heights (copy, G3), personality card heights (stored copy, real shares, G5), Name them
all card heights (members only, no invented community row, G6), hub tile sizes, nudge, be-the-first and creators
board heights (real data, G8), kit section at 390 (the prototype overflows, G8). Real-data landmarks compared only
when present: the personality distribution (kpdh: absent today, wma: present and compared) and Rising in each fandom
on /creators (absent today).

Harness normalizations: land-en-faq compares x and width, not the viewport top (the FAQ is the page end on both
sides, so the scroll is clamped by the footer below it, not by the FAQ). live-join: the prototype state is the host
screen after a phone joined, so its not-live form is /live (the /join page answers 200, recorded in `hiddenForm`).
quiz-bonus and quiz-bonus-voted use the G7 fixture (the prototype's five BTS pairs) so text-driven boxes compare;
share-kit uses the G8 fixture (P5 sample draft, publish and kit read answered locally). The v11 `quizzes` state is
checked now (P2 merged); v11 `btend-ranked`, `ranked`, `post-challenge` keep their v11 reasons (`/api/ranked/me`
answers 503, no challenge post exists).

## Observed, not filed (real data, pending SQL, harness)

- /blindtest Playlists rail and the landings' theme rail: K-pop hits 2026 and KPop Demon Hunters cards are hidden
  (under 10 playable songs until v12-g2-03 and v12-g2-07): the hidden form is as specified.
- Hub Fans picked: section and This or that tile absent on /stray-kids-quiz (`hiddenForm`: 0 and 0), as specified.
- /community: no Team badge anywhere in the feed (`hiddenForm.teamTags` 0) while the editorial SQL is pending.
- /live: `data-open` is not "open" (the API answers 503); every live state is checked in that form.
- /creators: two creators tie at 30 plays and both show rank 4 (data), a long name ellipsizes (data).
- Reference shots are signed in; v12 states run signed out except share-kit (signed in), so the nav right side differs.
