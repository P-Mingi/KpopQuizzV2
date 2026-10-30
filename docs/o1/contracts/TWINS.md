# Twins (o1-contract-v1): every anime and FanQuiz page and its kpop twin

Rule 18 (COMMON.md, owner, 16 October 2026): OtakuQuiz is kpopquiz.org with small changes, not a new design, and
fanquiz.org uses the same kit with a neutral theme. Every anime and FanQuiz page starts from its kpop twin and keeps
its layout, components, interactions and copy structure. It imports the shared components (`components/ux-v1/**` and
the components of each area) and never forks, copies (even in part) or rewrites them, and never makes an "anime
version" of one. When a shared component needs a difference, its owner adds a prop or a theme token, on request
(`docs/o1/requests/<lane>.md`).

Source: ORCH's draft `briefs/TWINS-draft.md` (rows 1 to 37, H-0 to H-8, CR-001 and CR-007 approved in `LEDGER.md`).
Machine form: `twins.json` (same rows, same columns, repository paths), read by Q0a's `apps/quiz/scripts/o1/twins.mts`
through `scripts/o1/check.sh` on every gate. `contract.test.ts` proves that this table and `twins.json` say the same
thing, that every twin path and every `mustImport` module exists, and that every `mustImport` module is really
imported by the twin (its file or a module of its folder), so the list is what the kpop page renders with
`NEXT_PUBLIC_UX_V1=1` and `NEXT_PUBLIC_UX_V12=1`.

## 1. How to read a row

| column | meaning |
|---|---|
| id | the draft's row number; a letter suffix (`23b`, `26b`, `31b`) splits a draft row that covers several page files, one row per file |
| route | the public path on the site |
| file | the page file of the site, under `apps/quiz/src/app/sites/[site]/` (routes.md section 3); `(none)` for a shared route that has no file there |
| kpop twin | the kpop file whose UX v1 and v12 render the row copies, under `apps/quiz/src/` |
| mustImport | the modules the twin itself imports to render the row (static or dynamic `import()`), written as module specifiers; the site's file imports every one of them, directly or through a module of its own folder (twins.mts check b) |
| renders | what those modules render (for D0 and R; not machine-checked) |
| allowed | the closed list of differences (section 2); `none` means none |
| owner | the lane that builds the site's page |
| body | `shared`: the twin renders shared components, import them; `local`: the twin's body is page-local markup with kpop text, so its owner first moves it into a shared component with props (request F0-9) and the new module joins `mustImport`; `none`: no screen |
| notes | the draft's remarks, corrections and pointers |

Rules that go with the table:

1. A page file under `app/sites/` that no row lists is an invented screen: twins.mts fails it (check a), R fails it.
2. A difference outside the row's `allowed` list needs a CR approved in `LEDGER.md` before it is built. Adding a module
   to a row's `mustImport` (for example the shared component a `local` twin's body moves into) tightens the check and
   adds no difference: no CR, ORCH records it. Removing one is a CR.
3. A file listed by several rows (`page.tsx` for rows 1 and H-1, `[slug]/page.tsx` for rows 3 to 5, `q/[slug]/page.tsx`
   for rows 6 to 8, the shell, the 404, `/privacy`, `/u`, `/settings`, `/login`) dispatches on the site or on the
   path as the twin does, and reaches the `mustImport` of every row it carries. A file serves only the sites of its
   rows: on any other site it calls `notFound()` (the hub build compiles the anime pages too).
4. The spike pages of `o1/F0s` (`app/sites/[site]/layout.tsx`, `page.tsx`, `not-found.tsx`) are routing
   placeholders: they prove the guard, the static params, the metadata reset and the rewrites. They render no shell
   and are never a template. O1 and H1 build the real pages from the twins of this table, never from the spike;
   `[...rest]/page.tsx` (row 27b) and the root file handlers keep the spike's routing code.
5. Copy follows the twin: the copy keys of a row are the slots its twin renders, in the twin's order (copy-keys.md
   section 3); a key with no twin slot needs one of the row's codes or an approved CR.
6. A site sheet restyles nothing of the shared kit: it sets token values and styles only the classes of the blocks
   its rows list (tokens.md 3.3 rule 6, checked by contract.test.ts).

## 2. Difference codes (closed list)

Anime rows: **T** theme tokens (Persimmon values of the frozen `--ux-*` names, M PLUS Rounded 1c for display text);
**B** brand (OtakuQuiz wordmark, the Fuki mascot where kpop shows its mascot, the OG template); **V** vocabulary
(series for group, character for member, oshi with a star for bias with a heart); **C** copy text from per-site,
per-lane files, same slots and same structure as the twin; **F** features off on otakuquiz.org (image quizzes, fandom
war, MV pulse, live rooms, Verse, Discord, cover art; news, articles, data pages `/stats` and `/data/*`, and ranked
by CR-001; the footer locale switcher by CR-007: the slot is absent, nothing replaces it); **N** no K-pop text or link
(artist credits excepted).

Anime blocks, allowed only on the rows that list them: **A1** series header facts with "Sources (i)", "Now airing" only
with a verified record; **A2** arcs (story map, quizzes grouped by arc); **A3** characters list (monogram and
role-shape tiles, never an image; oshi star; counts shown from 30); **A4** openings and endings table (crossover credit
slot, blind test link at 15 or more playable previews); **A5** spoiler protection (progress setting, "Safe for you" and
"Covers {arc}" labels, interstitial, spoiler-tagged questions absent from HTML and JSON-LD, spoiler tag and source per
question in create, thread spoiler flair); **A6** fan-made notice in the footer; **A7** typographic title card SVG where
kpop shows a group logo or photo; **A8** Surprise me on the home (owner, 2026-10-29 and 2026-10-30): under the hero buttons,
the hub's component (`components/hub/home/home-surprise.tsx`) with the anime-h2 class prefix, drawing from the published,
listable anime quizzes only (the hub's pool rules on one site); absent with no pool.

FanQuiz rows: **Tn** the neutral FanQuiz theme (same token names); **Bf** FanQuiz wordmark, no mascot; **C**; **N** (no
quiz, playlist or series content on the hub). Hub blocks: **H1** one card per site with real counts above 30; **H2**
"What your passport shares" (word for word the policy); **H3** world stamps, the private passport level, world filters
on the activity feed, the "Other worlds" card; **H4** the four settings tabs of W4 (worlds and visibility, profile, sign-in
and security, your data) with Leave a world and Delete my passport (S6 steps).

## 3. otakuquiz.org

| id | route | file | kpop twin | mustImport | renders | allowed | owner | body | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | / | `app/sites/[site]/page.tsx` | `app/(site)/page.tsx` | `@/components/home/ux-v1/ux-home` | components/home/ux-v1/ux-home.tsx, home-header.tsx, qotd-row.tsx, continue-playing.tsx, groups-rail.tsx, quiz-rows.tsx, blindtest-band.tsx, community-rows.tsx, components/ux-v1/page.tsx, section-header.tsx, quiz-card.tsx | T B V C F N A7 A8 | O1 | shared | The series rail shows title cards (A7); the blind test band becomes the openings band through V. No A5 on the home (D-020). The community section renders as the shared component does with zero rows (D-020). The file is shared with row H-1 and dispatches on the site. Surprise me (A8) sits under the hero buttons, before the quiz of the day (UxHome's afterHeader slot; kpop passes none). |
| 2 | /series | `app/sites/[site]/(anime)/series/page.tsx` | `app/(site)/groups/page.tsx` | `@/components/group/ux-v1/groups-index` | components/group/ux-v1/groups-index.tsx, groups-browser.tsx, group-avatar.tsx | T B V C N A7 | O2 | shared | One filter field, as the twin (no tier or type filter without a CR). |
| 3 | /{series}-quiz | `app/sites/[site]/(anime)/[slug]/page.tsx` | `app/(site)/[slug]/page.tsx` | `@/components/group/ux-v1/hub` | components/group/ux-v1/hub.tsx, hub-quizzes.tsx, hub-growth.tsx, hub-notify.tsx, components/ux-v1/page.tsx, section-header.tsx, panel.tsx, button.tsx, person-name.tsx | T B V C F N A1 A2 A3 A4 A5 A7 | O2 | shared | F: no Fans picked. The anime blocks go into slots of the shared hub (props added by its owner on request); no separate series hub component. The file is shared with rows 4 and 5 and dispatches on the suffix, as the twin. |
| 4 | /anime-mix-quiz | `app/sites/[site]/(anime)/[slug]/page.tsx` | `app/(site)/[slug]/page.tsx` | `@/components/group/ux-v1/hub` | as row 3 (the general K-pop hub branch of the twin) | T B V C F N A7 | O2 | shared | No A1 to A4: not a series. |
| 5 | /{series}-trivia | `app/sites/[site]/(anime)/[slug]/page.tsx` | `app/(site)/[slug]/group-trivia-page.tsx` | `@/components/group/answer-first`, `@/components/trivia/trivia-share-button`, `@/components/ui/breadcrumbs` | components/group/answer-first.tsx, components/trivia/trivia-share-button.tsx, components/ui/breadcrumbs.tsx | T B V C N A5 A7 | O2 | local | The body of the twin is the page-local GroupTriviaPage with K-pop text: its owner moves it into a shared component with props (request F0-9) and that module joins mustImport. The group logo of the twin becomes the A7 title card. |
| 6 | /q/{slug} | `app/sites/[site]/(anime)/q/[slug]/page.tsx` | `app/(site)/q/[slug]/ux-page.tsx` | `@/components/quiz/ux-v1/quiz-page` | components/quiz/ux-v1/quiz-page.tsx, intro-islands.tsx, comments.tsx, report.tsx, run-context.tsx, components/ux-v1/text-card.tsx, panel.tsx, person-name.tsx | T B V C F N A5 | O3 | shared | The twin page.tsx renders ux-page.tsx when UX v1 is on. |
| 7 | play (inside /q/{slug}) | `app/sites/[site]/(anime)/q/[slug]/page.tsx` | `app/(site)/q/[slug]/ux-page.tsx` | `@/components/quiz/ux-v1/quiz-page` | components/quiz/ux-v1/game.tsx, quiz-run.tsx, components/ux-v1/answer-tiles.tsx | T B V C F | O3 | shared | F: no image question. Rendered by the quiz page of row 6. |
| 8 | results (inside /q/{slug}) | `app/sites/[site]/(anime)/q/[slug]/page.tsx` | `app/(site)/q/[slug]/ux-page.tsx` | `@/components/quiz/ux-v1/quiz-page` | components/quiz/ux-v1/results.tsx, story.ts, components/ux-v1/result-card.tsx, story-image.ts, share-sheet.tsx, components/this-or-that/bonus.tsx (text pairs) | T B V C F N | O3 (O5: the This or that bonus) | shared | No post-result oshi row: it has no kpop twin, and CR-005 was refused for O1 (owner, 2026-10-18). |
| 9 | /create | `app/sites/[site]/(anime)/create/page.tsx` | `app/(site)/create/page.tsx` | `@/components/ux-v1/page`, `@/components/create/ux-v1/loader` | components/create/ux-v1/loader.tsx, create.tsx, details.tsx, questions.tsx, publish.tsx, done.tsx, group-field.tsx (series picker through V, aliases as data) | T B V C F N A5 | O4 | shared | A5: a spoiler tag and a source per question, the anime rule codes. The details fields stay the twin ones (title, about, type, series, difficulty, language; cover is F). |
| 10 | /daily | `app/sites/[site]/(anime)/daily/route.ts` | `app/(site)/daily/route.ts` | (none) | the same redirect to /q/{slug}?daily=quiz | none | O1 | none | A route handler, no screen. The daily is the anime one through getQuizOfTheDay(site). |
| 11 | /blindtest | `app/sites/[site]/(anime)/blindtest/page.tsx` | `app/(site)/blindtest/page.tsx` | `@/components/blindtest/ux-v1/hub` | components/blindtest/ux-v1/hub.tsx, hub-v12.tsx, the Deezer kit of Mission U | T B V C F N A4 | O6 | shared | F: no cover. A4: series playlists. |
| 12 | /{series}-openings-quiz (rewrite to /blindtest/series-{series}) | `app/sites/[site]/(anime)/blindtest/[mode]/page.tsx` | `app/(site)/blindtest/[mode]/page.tsx` | `@/components/blindtest/ux-v1/group-page` | components/blindtest/ux-v1/group-page.tsx, game.tsx, setup.tsx, results.tsx, use-run.ts, the Deezer kit | T B V C F N A4 | O6 | shared | The group playlist branch of the twin. F: no cover. The internal folder keeps the twin name [mode]. |
| 13 | /opening-of-the-day | `app/sites/[site]/(anime)/opening-of-the-day/page.tsx` | `app/(site)/daily/route.ts` | (none) | components/blindtest/ux-v1/mode-page.tsx, game.tsx, results.tsx, the Deezer kit | T B V C F N A4 | O6 | shared | D-048: redirect to /blindtest, where the daily band starts the daily run (kpop has no daily mode page) |
| 14 | /which-{series}-character-are-you | `app/sites/[site]/(anime)/which-character/[group]/page.tsx` | `app/(site)/personality/[group]/page.tsx` | `@/components/personality/quiz`, `@/components/personality/about`, `@/components/ux-v1/page`, `@/components/ux-v1/section-header`, `@/components/ux-v1/ways-tile` | components/personality/quiz.tsx, about.tsx, components/ux-v1/page.tsx, section-header.tsx, ways-tile.tsx | T B V C F N | O5 | shared | F: no image. The "set as bias" offer becomes "set as oshi" through V. No A5 (not in the row). |
| 15 | /name-all/{series}/{set} | `app/sites/[site]/(anime)/name-all/[group]/page.tsx` | `app/(site)/name-all/[group]/page.tsx` | `@/components/name-all/game`, `@/components/name-all/about`, `@/components/ux-v1/page` | components/name-all/game.tsx, about.tsx, components/ux-v1/page.tsx | T B V C F N A5 | O5 | shared | A5: sets of spoiler level 0. The {set} level selects a set by URL only: the twin has no set picker and none is added without a CR. |
| 16 | /me | `app/sites/[site]/(anime)/me/page.tsx` | `app/(site)/me/page.tsx` | `@/components/profile/ux-v1/passport`, `@/components/profile/ux-v1/passport-guest` | components/profile/ux-v1/passport.tsx, passport-band.tsx, passport-tabs.tsx, passport-actions.tsx, rows.tsx, own-quiz-row.tsx, passport-guest.tsx, components/ux-v1/badge-medal.tsx, team.tsx | T B V C F N | P1 | shared | F: no Verse cards, no fandom war. One "See your whole FanQuiz passport" link for multi-site users (link allowlist). The twin imports both modules dynamically. |
| 17 | /u/{username} (incl. Team creator profiles) | `app/sites/[site]/u/[username]/page.tsx` | `app/(site)/u/[username]/page.tsx` | `@/components/profile/ux-v1/passport` | components/profile/ux-v1/passport.tsx, components/ux-v1/team.tsx | T B V C F N | P1 | shared | The file is shared with row H-4. The stamp chip (u.alsoOn) is not in this row: pending a CR (copy-keys.md). |
| 18 | /settings | `app/sites/[site]/settings/page.tsx` | `app/(site)/settings/page.tsx` | `@/components/profile/ux-v1/settings` | components/profile/ux-v1/settings.tsx, header-picker.tsx, header-actions.tsx, components/ux-v1/sheet.tsx, confirm-sheet.tsx, form.tsx, segmented.tsx | T B V C F N | P1 | shared | The bias and groups section becomes Your series, Oshi, Watching since through V; Account gets "FanQuiz passport", "Sign out everywhere", "Sign out of OtakuQuiz only" in the existing sign-out row. With UX v1 on the twin renders UxSettings only (UxAppearanceSetting is in its legacy branch). The file is shared with row H-5. |
| 19 | /login and the sign-in sheet | `app/sites/[site]/login/page.tsx` | `app/(site)/login/page.tsx` | (none) | the page-local sign-in page of the twin; the sign-in sheet (components/ux-v1/sign-in-sheet.tsx, sheet.tsx, button.tsx) comes with the shell of row 28 | T B C F | P1 | local | F: no Discord, no passport button before P2. The body of the twin is page-local: its owner moves it into a shared component with props (request F0-9) and that module joins mustImport. The file is shared with row H-6. |
| 20 | /onboarding | `app/sites/[site]/(anime)/onboarding/page.tsx` | `app/(site)/onboarding/page.tsx` | `@/app/(site)/onboarding/onboarding-form` | app/(site)/onboarding/onboarding-form.tsx (imported, not copied) | T B V C | P1 | shared |  |
| 21 | /notifications | `app/sites/[site]/(anime)/notifications/page.tsx` | `app/(site)/notifications/page.tsx` | `@/components/ux-v1/page`, `@/components/notifications/ux-v1/notifications-page` | components/notifications/ux-v1/notifications-page.tsx, components/ux-v1/page.tsx | T B V C | O1 | shared | With UX v1 on the twin renders UxNotifications inside UxPage (notifications-center.tsx is its legacy branch). |
| 22 | /search | `app/sites/[site]/(anime)/search/page.tsx` | `app/(site)/search/page.tsx` | `@/components/ui/user-avatar`, `@/components/ui/quiz-card`, `@/components/ui/mascot`, `@/components/profile/follow-button`, `@/components/ux-v1/team`, `@/app/(site)/search/search-form` | the twin page body, search-form.tsx, components/ui/quiz-card.tsx, user-avatar.tsx, mascot.tsx, components/profile/follow-button.tsx, components/ux-v1/team.tsx | T B V C N | O1 | local | The body of the twin is page-local with K-pop text: its owner moves it into a shared component with props (request F0-9). The search overlay of the shell (ux-search.tsx) belongs to row 28. |
| 23 | /community | `app/sites/[site]/(anime)/community/page.tsx` | `app/(site)/community/page.tsx` | `@/components/ux-v1/page`, `@/components/community/ux-v1/feed`, `@/components/community/ux-v1/rail`, `@/components/community/ux-v1/debate-panel`, `@/components/community/ux-v1/editor`, `@/components/community/ux-v1/viewer` | components/community/ux-v1/feed.tsx, feed-card.tsx, rail.tsx, debate-panel.tsx, editor.tsx, viewer.tsx | T B V C F N A5 | O1 (O3: the spoiler flair) | shared | F: no war strip (war-strip.tsx is not imported). A5: the thread spoiler flair. |
| 23b | /community/{kind}/{id} | `app/sites/[site]/(anime)/community/[kind]/[id]/page.tsx` | `app/(site)/community/[kind]/[id]/page.tsx` | `@/components/ux-v1/page`, `@/components/community/ux-v1/post-view`, `@/components/community/ux-v1/viewer` | components/community/ux-v1/post-view.tsx, replies.tsx, viewer.tsx | T B V C F N A5 | O1 (O3: the spoiler flair) | shared | Row 23 of the draft ("and its routes"). |
| 24 | /about | `app/sites/[site]/(anime)/about/page.tsx` | `app/(site)/about/page.tsx` | (none) | the sections of the twin page | T B V C F N | O1 | local | F: no Discord block. The twin imports no shared component (its Discord block is F) and its body is page-local with K-pop text: its owner moves it into a shared component with props (request F0-9). |
| 25 | /editorial-policy | `app/sites/[site]/(anime)/editorial-policy/page.tsx` | `app/(site)/editorial-policy/page.tsx` | (none) | the sections of the twin page, corrections.ts (the corrections log, data) | T B V C N A5 | O1 | local | A5: the spoiler policy section. The body is page-local with K-pop text (request F0-9); the anime corrections log is its own data, in the twin shape. |
| 26 | /privacy | `app/sites/[site]/privacy/page.tsx` | `app/(site)/privacy/page.tsx` | (none) | the sections of the twin page | T B C | O1 | local | Legal text per site (G16). Page-local body (request F0-9). The file is shared with row H-2. |
| 26b | /terms | `app/sites/[site]/(anime)/terms/page.tsx` | `app/(site)/terms/page.tsx` | (none) | the sections of the twin page | T B C | O1 | local | Legal text per site (G16). Page-local body (request F0-9). |
| 26c | /contact | `app/sites/[site]/(anime)/contact/page.tsx` | `app/(site)/contact/page.tsx` | (none) | the sections of the twin page | T B C | O1 | local | Page-local body (request F0-9). |
| 26d | /legal | `app/sites/[site]/legal/page.tsx` | `app/(site)/legal/page.tsx` | `@/app/(site)/legal/page` | the sections of the twin page | T B C | H1 | shared | The legal notice (mentions légales). The file re-exports the kpop page, which reads its site from the registry. The file is shared with row H-10. |
| 27 | 404 | `app/sites/[site]/not-found.tsx` | `app/(site)/not-found.tsx` | `@/components/ui/mascot` | components/ui/mascot.tsx (think pose), the 404 numeral, title, body, search form, popular quizzes heading and list, the Home, Browse all quizzes and Create a quiz links of the twin | T B C F | O1 | local | F: no Discord line. The twin lists hard-coded K-pop groups: its owner moves the body into a shared component with props (request F0-9). The spike not-found.tsx is a routing placeholder, never a source. The file is shared with row H-8. |
| 27b | any other path | `app/sites/[site]/[...rest]/page.tsx` | (none) | (none) | nothing: calls notFound(), which renders row 27 | none | O1 | none | Routing only (routes.md 1 item 6). The kpop twin of an unmatched path is the 404 of row 27. Shared with the hub. |
| 28 | shell: nav, tab bar, footer | `app/sites/[site]/layout.tsx` | `app/(site)/layout.tsx` | `@/components/layout/ux-v1/ux-shell` | components/layout/ux-v1/ux-shell.tsx, ux-client-shell.tsx, ux-footer.tsx, ux-nav-links.tsx, ux-tab-bar.tsx, ux-nav-actions.tsx, ux-search.tsx, ux-providers.tsx (the sign-in sheet), components/ux-v1/brand.tsx, lib/ux-v1/a0/nav.ts, the Organization and SiteNavigationElement JSON-LD | T B V C F N A6 | O1 | shared | The same files, configured by the anime registry entry. The layout also keeps the guard, the static params and the metadata reset of the spike (routing). F: Verse footer, Discord and Reddit links, Ranked, the data, article and news links, the locale switcher (CR-007). The file is shared with row H-0. Link targets (R F0 r1 m3): the twin shell links the groups item to /groups (lib/ux-v1/a0/nav.ts NAV_ITEMS), the You tab to /profile (TAB_ITEMS) and the account menu's Passport and See your passport to /profile (ux-nav-actions.tsx); on anime /groups and /profile are 404s (routing.ts KPOP_ONLY_SAMPLES), so the series item goes to /series and the You tab and both menu links to /me. The shell's owners give the shell those targets as a prop (B1 for nav.ts and ux-tab-bar.tsx, B4 for ux-nav-actions.tsx; request F0-20), the anime layout passes them, and O1 imports the shell unchanged; until the prop exists this row cannot be built without a copy, and the targets are no difference of its own (the labels are V, the items N). |
| 29 | /admin/review | `app/sites/[site]/(anime)/admin/review/page.tsx` | `app/(site)/admin/editorial/page.tsx` | `@/app/(site)/admin/editorial/editorial-admin` | app/(site)/admin/editorial/editorial-admin.tsx (kind quiz added by its owner) | T C | E1b | shared | Sampling and the 2-error batch rule as data, not a new screen. |
| 30 | OG image of a quiz | (none) | `app/api/og/[slug]/route.tsx` | (none) | the same route code, registry brand | T B | O1 | none | Shared route, no file under app/sites: it reads SITE.brand (typographic, no character art). No new OG route. |
| 30b | OG image of a series hub | (none) | `app/api/og/group/[slug]/route.tsx` | (none) | the same route code, registry brand | T B | O1 | none | Shared route, as row 30. |
| 31 | /quizzes (CR-001) | `app/sites/[site]/(anime)/quizzes/page.tsx` | `app/(site)/quizzes/ux-page.tsx` | `@/components/quizzes/ux-v1/quizzes-page` | components/quizzes/ux-v1/quizzes-page.tsx, controls.tsx, islands.tsx, components/ux-v1/quiz-card.tsx, the FAQ of the twin (faq.tsx) | T B V C F N | O2 | shared | The twin page.tsx renders ux-page.tsx when UX v1 is on. |
| 31b | /quizzes/popular-today (CR-001) | `app/sites/[site]/(anime)/quizzes/popular-today/page.tsx` | `app/(site)/quizzes/popular-today/page.tsx` | `@/components/quiz/popular-page` | components/quiz/popular-page.tsx, components/ui/quiz-card.tsx | T B V C F N | O2 | shared | The draft named quizzes-page.tsx for the three lists; the twin renders popular-page.tsx. |
| 31c | /quizzes/popular-this-week (CR-001) | `app/sites/[site]/(anime)/quizzes/popular-this-week/page.tsx` | `app/(site)/quizzes/popular-this-week/page.tsx` | `@/components/quiz/popular-page` | components/quiz/popular-page.tsx, components/ui/quiz-card.tsx | T B V C F N | O2 | shared | The draft named quizzes-page.tsx for the three lists; the twin renders popular-page.tsx. |
| 31d | /quizzes/popular-this-month (CR-001) | `app/sites/[site]/(anime)/quizzes/popular-this-month/page.tsx` | `app/(site)/quizzes/popular-this-month/page.tsx` | `@/components/quiz/popular-page` | components/quiz/popular-page.tsx, components/ui/quiz-card.tsx | T B V C F N | O2 | shared | The draft named quizzes-page.tsx for the three lists; the twin renders popular-page.tsx. |
| 32 | /new (CR-001) | `app/sites/[site]/(anime)/new/page.tsx` | `app/(site)/new/page.tsx` | `@/components/home/infinite-quiz-list` | components/home/infinite-quiz-list.tsx, components/quiz/quiz-card.tsx | T B V C N | O2 | shared |  |
| 32b | /most-liked (CR-001) | `app/sites/[site]/(anime)/most-liked/page.tsx` | `app/(site)/most-liked/page.tsx` | `@/components/home/infinite-quiz-list` | components/home/infinite-quiz-list.tsx, components/quiz/quiz-card.tsx | T B V C N | O2 | shared |  |
| 32c | /trending (CR-001) | `app/sites/[site]/(anime)/trending/page.tsx` | `app/(site)/trending/page.tsx` | `@/components/home/infinite-quiz-list` | components/home/infinite-quiz-list.tsx, components/quiz/quiz-card.tsx | T B V C N | O2 | shared |  |
| 33 | /trivia (CR-001) | `app/sites/[site]/(anime)/trivia/page.tsx` | `app/(site)/trivia/page.tsx` | `@/components/ui/breadcrumbs` | the sections of the twin page, components/ui/breadcrumbs.tsx | T B V C N A7 | O2 | local | The group logos of the twin become A7 title cards. Page-local body with K-pop text (request F0-9). |
| 34 | /faq (CR-001) | `app/sites/[site]/(anime)/faq/page.tsx` | `app/(site)/faq/page.tsx` | (none) | the sections of the twin page | T B V C N | O1 | local | Page-local body with K-pop text (request F0-9). |
| 35 | /leaderboard (CR-001) | `app/sites/[site]/(anime)/leaderboard/page.tsx` | `app/(site)/leaderboard/page.tsx` | `@/components/leaderboard/ux-v1/leaderboard` | components/leaderboard/ux-v1/leaderboard.tsx, panes.tsx, points.tsx, around.tsx, islands.tsx | T B V C F N | O1 | shared | F: no fandom war board. Team accounts excluded (rule 7). With UX v1 on the twin renders LeaderboardV11 (leaderboard-tabs.tsx is its legacy branch). |
| 36 | /dmca (CR-001) | `app/sites/[site]/(anime)/dmca/page.tsx` | `app/(site)/dmca/page.tsx` | (none) | the sections of the twin page | T B C | O1 | local | Page-local body with K-pop text (request F0-9). |
| 37 | /auth/arrive, /auth/authorize, /auth/land, /auth/passport/out, /auth/confirm | (none) | (none) | (none) | nothing visible: redirects, or a page that renders no visible content | none | B4, B7 | none | Technical routes, shared handlers under app/(site)/auth (no rewrite reaches app/sites for /auth). Exempt from the twins check; a page file for them under app/sites is unlisted and fails it. |
| 38 | site guard of the (anime) route group (D-048) | `app/sites/[site]/(anime)/layout.tsx` | (none) | (none) | nothing visible: a site guard that renders its children, or a 404 on any other build | none | O1 | none | Technical: a 404 on any other build, renders nothing of its own |
| 39 | /admin | `app/sites/[site]/(anime)/admin/page.tsx` | `app/(site)/admin/page.tsx` | (none) | app/(site)/admin/page.tsx, admin-dashboard.tsx | T C | O1 | shared | Thin re-export of the kpop page (lot e part 2): its quizzes, reports and groups reads go through forSite. Admin only, never indexed. |
| 40 | /admin/quiz/search | `app/sites/[site]/(anime)/admin/quiz/search/page.tsx` | `app/(site)/admin/quiz/search/page.tsx` | (none) | app/(site)/admin/quiz/search/page.tsx, quiz-search-list.tsx | T C | O1 | shared | Thin re-export of the kpop page (lot e part 2): the read goes through forSite. |
| 41 | /admin/quiz/{id}/edit | `app/sites/[site]/(anime)/admin/quiz/[id]/edit/page.tsx` | `app/(site)/admin/quiz/[id]/edit/page.tsx` | (none) | app/(site)/admin/quiz/[id]/edit/page.tsx, components/quiz/quiz-editor.tsx | T C | O1 | shared | Thin re-export of the kpop page (lot e part 2): the read goes through forSite, so a quiz of another site is a 404. |
| 42 | /credits | `app/sites/[site]/(anime)/[slug]/page.tsx` | `app/(site)/[slug]/page.tsx` | (none) | components/anime/credits-page.tsx, components/ux-v1/page.tsx | T B C | O1 | local | The series photo credits (IMG, owner rules 2026-10-26): OtakuQuiz only, no kpop twin page, so the twin is the kpop [slug] page of rows 3 to 5, whose file serves it (it dispatches on the slug credits). Page-local body, plain English text, no K-pop text. Links the footer of row 28. |

## 4. fanquiz.org

| id | route | file | kpop twin | mustImport | renders | allowed | owner | body | notes |
|---|---|---|---|---|---|---|---|---|---|
| H-0 | shell: nav, tab bar, footer | `app/sites/[site]/layout.tsx` | `app/(site)/layout.tsx` | `@/components/layout/ux-v1/ux-shell` | the files of row 28, configured by the hub registry entry | Tn Bf C N | H1 | shared | CR-001. The file is shared with row 28. Link targets as in row 28 (request F0-20): the You tab and the account menu's passport links go to /passport, the home item to /; the hub has no /profile, /me or /groups. |
| H-1 | / (network page) | `app/sites/[site]/page.tsx` | `app/(site)/about/page.tsx` | (none) | the sections of the twin page; H1 and H2 are built from components/ux-v1/page.tsx, section-header.tsx, panel.tsx | Tn Bf C N H1 H2 | H1 | local | The twin imports no shared component and its body is page-local (request F0-9). The file is shared with row 1. |
| H-2 | /privacy | `app/sites/[site]/privacy/page.tsx` | `app/(site)/privacy/page.tsx` | (none) | the sections of the twin page | Tn Bf C | H1 | local | The network policy (G16). The file is shared with row 26. |
| H-3 | /passport | `app/sites/[site]/(hub)/passport/page.tsx` | `app/(site)/me/page.tsx` | (none) | nothing visible: a redirect to the member home site (D-080) | Tn Bf C N H3 | H1 | none | The passport tabs are the twin ones (overview, quizzes, history, badges). |
| H-4 | /u/{username} | `app/sites/[site]/u/[username]/page.tsx` | `app/(site)/u/[username]/page.tsx` | `@/components/profile/ux-v1/passport` | components/profile/ux-v1/passport.tsx | Tn Bf C N H3 | H1 | shared | Visible worlds only; always noindex. The file is shared with row 17. |
| H-5 | /settings | `app/sites/[site]/settings/page.tsx` | `app/(site)/settings/page.tsx` | (none) | nothing visible: a redirect to the member home site (D-080) | Tn Bf C N H4 | H1 | none | The file is shared with row 18. |
| H-6 | /login | `app/sites/[site]/login/page.tsx` | `app/(site)/login/page.tsx` | (none) | the page-local sign-in page of the twin; the sign-in sheet comes with the shell | Tn Bf C | H1 | local | Google with the FanQuiz client, email link. Page-local body (request F0-9). The file is shared with row 19. |
| H-7 | /directory (optional) | `app/sites/[site]/(hub)/directory/page.tsx` | `app/(site)/groups/page.tsx` | `@/components/group/ux-v1/groups-index` | components/group/ux-v1/groups-index.tsx | Tn Bf C N | H1 | shared | Sites instead of groups. |
| H-8 | 404 | `app/sites/[site]/not-found.tsx` | `app/(site)/not-found.tsx` | (none) | the structure of the twin 404; the mascot slot renders nothing (Bf) | Tn Bf C | H1 | local | The file is shared with row 27 (which imports the mascot for anime). Page-local body (request F0-9). |
| H-9 | site guard of the (hub) route group (D-048) | `app/sites/[site]/(hub)/layout.tsx` | (none) | (none) | nothing visible: a site guard that renders its children, or a 404 on any other build | none | O1 | none | Technical: a 404 on any other build, renders nothing of its own |
| H-10 | /legal | `app/sites/[site]/legal/page.tsx` | `app/(site)/legal/page.tsx` | `@/app/(site)/legal/page` | the sections of the twin page | Tn Bf C | H1 | shared | The legal notice (mentions légales), the same file as row 26d. |

## 5. kpopquiz.org deltas (flagged, not twins)

Footer network line (B6, `NET_FOOTER`), Your sites menu block (B6, `NET_MENU`), settings Account row for multi-site
users (B6), song-row crossover tag and hub fact line (X1, `NET_FACTS`): each is a change of the kpop page itself,
shown in D0 as before and after, off by default.

## 6. Surfaces without a kpop twin (CR-002 to CR-006 refused for O1)

CR-002 welcome card on the first signed-in arrival; CR-003 "How I appear here"; CR-004 "Keep anime in your passport?
Yes, Not now" after the third play; CR-005 the post-result oshi row on quiz results (row 8); CR-006 the kpopquiz.org
welcome card for arrivals from OtakuQuiz (`NET_WELCOME`). The owner refused all five for O1 on 18 October 2026 (LEDGER
D-027): backlog after launch. None has a row, a frame (D-020) or a build in the run, and the contract reserves no copy
key, flag or storage key for them (copy-keys.md 3, flags-env.md 3, cookies.md 7). Building one needs a new CR approved
in LEDGER.md. Still pending a row or a CR: the B4 land page copy (row 37 says the land page renders no visible
content) and the kpop `/admin/network` dashboard (request F0-8).

## 7. Corrections to the draft (paths and components checked against the tree, 16 October 2026)

No difference was added or removed. Every page path and every component path of the draft exists. Changes:

1. `mustImport` is the twin's own imports (what twins.mts can check), the draft's component lists moved to `renders`.
2. Row 18 and H-5: with UX v1 on, the twin renders `UxSettings` only; `ux-appearance-setting.tsx` is in its legacy
   branch, so it is not a `mustImport`.
3. Row 21: the twin renders `components/notifications/ux-v1/notifications-page.tsx` inside `UxPage`;
   `notifications-center.tsx` is the legacy branch.
4. Row 22: the twin search page imports `components/ui/quiz-card.tsx` (not `ux-v1/quiz-card.tsx`), `user-avatar`,
   `mascot`, `follow-button`, `ux-v1/team` and its page-local `search-form.tsx`; `ux-search.tsx` is the shell's search
   overlay (row 28).
5. Row 24 and H-1: the twin about page imports neither `components/ux-v1/page.tsx` nor `section-header.tsx`; its only
   shared import is the Discord block (F).
6. Rows 31b to 31d: the three popular lists render `components/quiz/popular-page.tsx`, not `quizzes-page.tsx`.
7. Row 35: with UX v1 on, the twin renders `LeaderboardV11`; `leaderboard-tabs.tsx` is the legacy branch.
8. Row 5: the twin also imports `components/ui/breadcrumbs.tsx`.
9. Row 12: the internal folder is `blindtest/[mode]`, the twin's name (was `[playlist]` in routes.md).
10. Rows 23, 26, 30, 31, 32 are split per page file (`23b`, `26b`, `26c`, `30b`, `31b` to `31d`, `32b`, `32c`); row
    27b is the catch-all page of the spike, listed so check a covers every page file.


## Amendment D-120 (owner, 2026-10-26: OtakuQuiz orange, no blind test on OtakuQuiz)

These points supersede the lines they name above.

3. `docs/o1/contracts/TWINS.md` and `twins.json`: row 11 (`/blindtest`, anime) is withdrawn as a route. Its page file stays but answers 404 (it calls
   `notFound()` when `SITE.features.blindTest` is off) and nothing reaches it: deleting it moved the client chunk grouping of kpopquiz.org's `/blindtest`
   and `/pt/blindtest` (7 to 6 and 8 to 7 chunk files, `e2e/o1/O2/kpop-chunk-count.sh`), because those chunks were grouped by the routes that share a module.
   Delete the file, and drop the row, when the kpop chunk baseline is re-cut. Row 12 keeps its file (the internal file the openings quiz rewrite reaches);
   row 13 note: "redirects to /series". Row 14 (which-character) keeps its `ways-tile` and `section-header` mustImports: its "Also on" block now holds two real doors (the series hub and /series). The O6 lane card (`briefs/O6.md`) loses the blind test hub, the Deezer playlist hub
   and the daily band.
