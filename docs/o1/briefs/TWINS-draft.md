# TWINS draft (ORCH, 16 October 2026, rule 18): input for F0's `docs/o1/contracts/TWINS.md`

F0 freezes this as `docs/o1/contracts/TWINS.md` (human table) and `docs/o1/contracts/twins.json` (machine form, the
same rows), after checking every path against the tree and every component against what the kpop page really renders
with `NEXT_PUBLIC_UX_V1=1` and `NEXT_PUBLIC_UX_V12=1` (the production flags). F0 may correct a path or a component
name; F0 may not add a difference. Any difference outside a row's closed list needs a CR approved in `LEDGER.md`.
The anime and hub page files live under `apps/quiz/src/app/sites/[site]/...` (F0's route map gives the exact file of
each route); `twins.json` names that file in `file`.

## Difference codes (closed list)

Every anime row allows: **T** theme tokens (Persimmon values of the frozen `--ux-*` names, `--ux-font-display` = M PLUS
Rounded 1c for display text); **B** brand (OtakuQuiz wordmark, the Fuki mascot where kpop shows its mascot, the OG
template); **V** vocabulary (series for group, character for member, oshi with a star for bias with a heart); **C**
copy text from per-site, per-lane files, same slots and same structure as the twin; **F** features off on otakuquiz.org
(image quizzes, fandom war, MV pulse, live rooms, Verse, Discord, cover art: the slot is absent, nothing replaces it);
**N** no K-pop text or link (artist credits excepted). CR-001 adds to F, off at launch with the slot absent from nav,
tab bar, footer and home: news, articles, data pages (`/stats`, `/data/*`) and ranked; the twins of `/quizzes` and its
lists, `/new`, `/most-liked`, `/trending`, `/trivia`, `/faq`, `/leaderboard` and `/dmca` exist (rows 31 to 36).

Anime blocks, allowed only on the rows that list them: **A1** series header facts with "Sources (i)", "Now airing"
only with a verified record; **A2** arcs (story map, quizzes grouped by arc); **A3** characters list (monogram and
role-shape tiles, never an image; oshi star; counts shown from 30); **A4** openings and endings table (crossover credit
slot, blind test link at 15 or more playable previews); **A5** spoiler protection (progress setting, "Safe for you" and
"Covers {arc}" labels, interstitial, spoiler-tagged questions absent from HTML and JSON-LD, spoiler tag and source per
question in create, thread spoiler flair); **A6** fan-made notice in the footer; **A7** typographic title card SVG where
kpop shows a group logo or photo.

Every FanQuiz row allows: **Tn** the neutral FanQuiz theme (same token names); **Bf** FanQuiz wordmark, no mascot;
**C**; **N** (no quiz, playlist or series content on the hub). Hub blocks: **H1** one card per site with real counts
above 30; **H2** "What your passport shares" (word for word the policy); **H3** world stamps, the private passport
level, world filters on the activity feed, the "Other worlds" card; **H4** the four settings tabs (Worlds and
visibility, Profile, Sign-in and security, Your data) with Leave a world and Delete my passport (S6 steps).

## otakuquiz.org

| # | Route | kpop twin (page file) | Shared components it must import (what the twin renders) | Allowed differences |
|---|---|---|---|---|
| 1 | `/` | `app/(site)/page.tsx` | `components/home/ux-v1/ux-home.tsx` (with home-header, qotd-row, quiz-rows, groups-rail, blindtest-band, continue-playing, community-rows), `components/ux-v1/page.tsx`, `section-header.tsx`, `quiz-card.tsx` | T B V C F N A7 (series rail shows title cards; the blind test band becomes the openings band through V) |
| 2 | `/series` | `app/(site)/groups/page.tsx` | `components/group/ux-v1/groups-index.tsx`, `groups-browser.tsx`, `group-avatar.tsx` | T B V C N A7 |
| 3 | `/{series}-quiz` | `app/(site)/[slug]/page.tsx` | `components/group/ux-v1/hub.tsx` with `hub-quizzes.tsx`, `hub-growth.tsx`, `hub-notify.tsx`; `components/ux-v1/page.tsx`, `section-header.tsx`, `panel.tsx`, `button.tsx`, `person-name.tsx` | T B V C F (no Fans picked) N A1 A2 A3 A4 A5 A7. The anime blocks go into slots of the shared hub (props added by its owner on request); no separate series hub component |
| 4 | `/anime-mix-quiz` | `app/(site)/[slug]/page.tsx` (the general K-pop hub) | same as row 3 | T B V C F N A7 (no A1 to A4: not a series) |
| 5 | `/{series}-trivia` | `app/(site)/[slug]/group-trivia-page.tsx` | `components/group/answer-first.tsx`, `components/trivia/trivia-share-button.tsx` | T B V C N A5 A7 |
| 6 | `/q/{slug}` | `app/(site)/q/[slug]/page.tsx` (UX v1 branch `ux-page.tsx`) | `components/quiz/ux-v1/quiz-page.tsx`, `intro-islands.tsx`, `comments.tsx`, `report.tsx`, `run-context.tsx`; `components/ux-v1/text-card.tsx`, `panel.tsx`, `person-name.tsx` | T B V C F N A5 |
| 7 | play (inside `/q/{slug}`) | same as row 6 | `components/quiz/ux-v1/game.tsx`, `quiz-run.tsx`, `components/ux-v1/answer-tiles.tsx` | T B V C F (no image question) |
| 8 | results (inside `/q/{slug}`) | same as row 6 | `components/quiz/ux-v1/results.tsx`, `story.ts`, `components/ux-v1/result-card.tsx`, `story-image.ts`, `share-sheet.tsx`; `components/this-or-that/bonus.tsx` (text pairs) | T B V C F N. The post-result oshi row of P1 has no kpop twin on quiz results: it needs a CR |
| 9 | `/create` | `app/(site)/create/page.tsx` | `components/create/ux-v1/loader.tsx`, `create.tsx`, `details.tsx`, `questions.tsx`, `publish.tsx`, `done.tsx`, `group-field.tsx` (series picker through V, aliases as data) | T B V C F N A5 (spoiler tag and source per question, anime rule codes) |
| 10 | `/daily` | `app/(site)/daily/route.ts` | same redirect to `/q/{slug}?daily=quiz` | none (the daily is the anime one through `getQuizOfTheDay(site)`) |
| 11 | `/blindtest` | `app/(site)/blindtest/page.tsx` | `components/blindtest/ux-v1/hub.tsx` (`hub-v12.tsx`), the Deezer kit of Mission U | T B V C F (no cover) N A4 (series playlists) |
| 12 | `/{series}-openings-quiz` (rewrite to `/blindtest/series-{series}`) | `app/(site)/blindtest/[mode]/page.tsx` (group playlist branch) | `components/blindtest/ux-v1/group-page.tsx`, `game.tsx`, `setup.tsx`, `results.tsx`, `use-run.ts`, the Deezer kit | T B V C F (no cover) N A4 |
| 13 | `/opening-of-the-day` | `app/(site)/blindtest/[mode]/page.tsx` (mode `daily`) | `components/blindtest/ux-v1/mode-page.tsx`, `game.tsx`, `results.tsx`, the Deezer kit | T B V C F (no cover) N A4 |
| 14 | `/which-{series}-character-are-you` | `app/(site)/personality/[group]/page.tsx` | `components/personality/quiz.tsx`, `about.tsx`; `components/ux-v1/page.tsx`, `section-header.tsx`, `ways-tile.tsx` | T B V C F (no image) N (the "set as bias" offer becomes "set as oshi" through V) |
| 15 | `/name-all/{series}/{set}` | `app/(site)/name-all/[group]/page.tsx` | `components/name-all/game.tsx`, `about.tsx`; `components/ux-v1/page.tsx` | T B V C F N A5 (sets of spoiler level 0) |
| 16 | `/me` | `app/(site)/me/page.tsx` | `components/profile/ux-v1/passport.tsx`, `passport-band.tsx`, `passport-tabs.tsx`, `passport-actions.tsx`, `rows.tsx`, `own-quiz-row.tsx`, `passport-guest.tsx`; `components/ux-v1/badge-medal.tsx`, `team.tsx` | T B V C F (no Verse cards, no fandom war) N; one "See your whole FanQuiz passport" link for multi-site users (link allowlist) |
| 17 | `/u/{username}` (incl. Team creator profiles) | `app/(site)/u/[username]/page.tsx` | `components/profile/ux-v1/passport.tsx`, `components/ux-v1/team.tsx` | T B V C F N |
| 18 | `/settings` | `app/(site)/settings/page.tsx` | `components/profile/ux-v1/settings.tsx`, `components/layout/ux-v1/ux-appearance-setting.tsx` | T B V C F N (the bias and groups section becomes Your series, Oshi, Watching since through V; Account gets "FanQuiz passport", "Sign out everywhere", "Sign out of OtakuQuiz only" in the existing sign-out row) |
| 19 | `/login` and the sign-in sheet | `app/(site)/login/page.tsx`, `components/ux-v1/sign-in-sheet.tsx` | `components/ux-v1/sign-in-sheet.tsx`, `sheet.tsx`, `button.tsx` | T B C F (no Discord, no passport button before P2) |
| 20 | `/onboarding` | `app/(site)/onboarding/page.tsx` | `onboarding-form.tsx` of the twin (imported, not copied) | T B V C |
| 21 | `/notifications` | `app/(site)/notifications/page.tsx` | `components/notifications/notifications-center.tsx`, `components/ux-v1/page.tsx` | T B V C |
| 22 | `/search` | `app/(site)/search/page.tsx` | `components/layout/ux-v1/ux-search.tsx`, `components/ux-v1/quiz-card.tsx`, `team.tsx` | T B V C N |
| 23 | `/community` and its routes | `app/(site)/community/page.tsx`, `community/[kind]/` | `components/community/ux-v1/feed.tsx`, `feed-card.tsx`, `rail.tsx`, `debate-panel.tsx`, `editor.tsx`, `viewer.tsx`, `post-view.tsx`, `replies.tsx` | T B V C F (no war strip) N A5 (thread spoiler flair) |
| 24 | `/about` | `app/(site)/about/page.tsx` | the twin's sections and `components/ux-v1/page.tsx`, `section-header.tsx` | T B V C F (no Discord block) N |
| 25 | `/editorial-policy` | `app/(site)/editorial-policy/page.tsx` (+ `corrections.ts`) | the twin's sections | T B V C N A5 (the spoiler policy section) |
| 26 | `/privacy`, `/terms`, `/contact` | `app/(site)/privacy/page.tsx`, `terms/page.tsx`, `contact/page.tsx` | the twin's sections | T B C (legal text per site) |
| 27 | 404 | `app/(site)/not-found.tsx` | `components/ui/mascot.tsx` | T B C F (no Discord line) |
| 28 | shell: nav, tab bar, footer | `components/layout/ux-v1/ux-shell.tsx`, `ux-footer.tsx`, `ux-nav-links.tsx`, `ux-tab-bar.tsx`, `ux-nav-actions.tsx`; `components/ux-v1/brand.tsx`; `lib/ux-v1/a0/nav.ts` | the same files, configured by the anime registry entry | T B V C F N A6 |
| 29 | `/admin/review` | `app/(site)/admin/editorial/page.tsx`, `editorial-admin.tsx` | `editorial-admin.tsx` (kind `quiz` added by its owner) | T C (sampling and the 2-error batch rule as data, not a new screen) |
| 30 | OG images | `app/api/og/[slug]`, `app/api/og/group/` | the same route code, registry brand | T B (typographic, no character art) |
| 31 | `/quizzes`, `/quizzes/popular-today`, `/quizzes/popular-this-week`, `/quizzes/popular-this-month` (CR-001) | `app/(site)/quizzes/page.tsx` (UX v1 branch `ux-page.tsx`) and its three subfolders | `components/quizzes/ux-v1/quizzes-page.tsx`, `controls.tsx` | T B V C F N |
| 32 | `/new`, `/most-liked`, `/trending` (CR-001) | `app/(site)/new/page.tsx`, `most-liked/page.tsx`, `trending/page.tsx` | `components/home/infinite-quiz-list.tsx` | T B V C N |
| 33 | `/trivia` (CR-001) | `app/(site)/trivia/page.tsx` | the twin's sections | T B V C N A7 |
| 34 | `/faq` (CR-001) | `app/(site)/faq/page.tsx` | the twin's sections | T B V C N |
| 35 | `/leaderboard` (CR-001) | `app/(site)/leaderboard/page.tsx`, `leaderboard-tabs.tsx` | `components/leaderboard/ux-v1/leaderboard.tsx` | T B V C F (no fandom war board) N; Team accounts excluded (rule 7) |
| 36 | `/dmca` (CR-001) | `app/(site)/dmca/page.tsx` | the twin's sections | T B C |
| 37 | technical routes without a screen: `/auth/arrive`, `/auth/authorize`, `/auth/land`, `/auth/passport/out`, `/auth/confirm` | none (redirects, or a page that renders no visible content) | none | exempt from the twins check, listed so a visible page there fails it |

## fanquiz.org

| # | Route | kpop twin (page file) | Shared components it must import | Allowed differences |
|---|---|---|---|---|
| H-0 | shell: nav, tab bar, footer | row 28's files, configured by the hub registry entry | the same files | Tn Bf C N |
| H-1 | `/` (network page) | `app/(site)/about/page.tsx` | `components/ux-v1/page.tsx`, `section-header.tsx`, `panel.tsx` | Tn Bf C N H1 H2 |
| H-2 | `/privacy` | `app/(site)/privacy/page.tsx` | the twin's sections | Tn Bf C (the network policy) |
| H-3 | `/passport` | `app/(site)/me/page.tsx` | `components/profile/ux-v1/passport.tsx`, `passport-band.tsx`, `passport-tabs.tsx`, `components/ux-v1/badge-medal.tsx` | Tn Bf C N H3 |
| H-4 | `/u/{username}` | `app/(site)/u/[username]/page.tsx` | `components/profile/ux-v1/passport.tsx` | Tn Bf C N H3 (visible worlds only; noindex) |
| H-5 | `/settings` | `app/(site)/settings/page.tsx` | `components/profile/ux-v1/settings.tsx`, `components/layout/ux-v1/ux-appearance-setting.tsx` | Tn Bf C N H4 |
| H-6 | `/login` | `app/(site)/login/page.tsx`, `components/ux-v1/sign-in-sheet.tsx` | `components/ux-v1/sign-in-sheet.tsx` | Tn Bf C (Google with the FanQuiz client, email link) |
| H-7 | `/directory` (optional) | `app/(site)/groups/page.tsx` | `components/group/ux-v1/groups-index.tsx` | Tn Bf C N (sites instead of groups) |
| H-8 | 404 | `app/(site)/not-found.tsx` | `components/ui/mascot.tsx` slot without a mascot | Tn Bf C |

## kpopquiz.org deltas (flagged, not twins)

Footer network line (B6, NET_FOOTER), Your sites menu block (B6, NET_MENU), settings Account row for multi-site users
(B6), song-row crossover tag and hub fact line (X1, NET_FACTS): each is a change of the kpop page itself, shown in D0
as before and after, and off by default.

## Surfaces without a kpop twin: REFUSED for O1 by the owner on 2026-10-18 (LEDGER CR-002 to CR-006), backlog after launch

CR-002 welcome card on the first signed-in arrival (P W5 cases A and C, D4); CR-003 "How I appear here" (P 8.2);
CR-004 "Keep anime in your passport? Yes, Not now" after the third play (P 3.2); CR-005 the post-result oshi row on
quiz results (S 2.5, row 8); CR-006 the kpopquiz.org welcome card for arrivals from OtakuQuiz (Q B09, flag
NET_WELCOME). Each is proposed as built only from shared components (Panel, Sheet, Button, Chip), placed in an
existing slot of its twin, with no new component. None is built before the owner says yes.

## Consequences for the backlog (ORCH, recorded in LEDGER D-018)

- O2 builds no `components/series/hub.tsx`: the series page renders the shared `components/group/ux-v1/hub.tsx`, whose
  owner adds slots for A1 to A4; O2 builds only the blocks.
- O1 builds no new home or shell: the anime registry entry configures the shared shell and home.
- P1 builds no new passport UI: anime /me, /u and /settings render the shared passport and settings components with
  props; the post-result oshi row on quiz results needs a CR (row 8).
- H1 builds the hub pages from rows H-1 to H-8, same kit, neutral theme.
