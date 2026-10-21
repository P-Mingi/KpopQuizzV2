# C1: visual and accessibility check of the three sites on o1-dev

Branch o1/C1 (from o1/integration 0d0d8aa), run on o1-dev through `scripts/o1-tools/dev-up.sh` (built from this checkout, rebuilt after
each fix). Chromium of the installed Playwright, phone 375 x 812 and desktop 1280 x 800, axe-core 4.11.1 injected (the repo has no
`@axe-core/playwright`). Final run of the spec: 10 passed (5 tests x 2 viewports). Screenshots: `docs/o1/reports/C1/shots/` (44 PNG,
phone and desktop, signed out except /me, /settings and /u which show the fixture names o1_dual and o1_anime_new only). Raw per-page
results of the last run: `docs/o1/reports/C1/results/*.json` (findings and the Tab order seen).

Rerun (the owner):

    scripts/o1-tools/dev-up.sh
    cd apps/quiz && O1_C1_ANIME_URL=http://anime.localhost:3191 O1_C1_HUB_URL=http://hub.localhost:3192 O1_C1_KPOP_URL=http://kpop.localhost:3190 \
      pnpm exec playwright test -c playwright.o1.config.ts e2e/o1/C1/a11y.o1.ts --project=lanes

Per page the spec checks: axe violations (serious and critical block; moderate and minor are listed), horizontal scroll at 375 px,
images without alt, `role=img` without a name, K-pop words (text, title, description) and kpop links on anime and hub, K-pop art
(mascot, idol photo, kpop logo) in `img` sources, dead same-origin links of the header, nav, footer and main, failed css, js, font and
image requests, missing styles, the contrast of the site tokens (18 `--ux-*` pairs, light and dark), the first 14 Tab stops (visible
focus, order jumping back, positive tabindex). Dark mode axe on /, /login (anime) and hub / and /login. Not checked by the spec:
the hub name KpopQuiz and its link to the kpop site on the hub home are allowed (the "The sites" list of the network page, by design).

## Blockers found and fixed (commit 9cfa722)

| # | blocker | where | fix |
|---|---|---|---|
| B1 | Every quiz read failed on o1-dev with "Could not embed because more than one relationship was found for 'quizzes' and 'profiles'" (PGRST201). Hubs listed quizzes but `/q/<slug>` answered 404 (the build baked the 404 in), home lists, search, community and the kpop home failed soft and showed nothing. Root cause: `spoiler_reports` (docs/o1/contracts/schema.sql, 015-spoilers) has a primary key made of its two foreign keys (quiz_id to quizzes, reporter_id to profiles), so PostgREST sees a many-to-many path quizzes to profiles next to `quizzes.creator_id`. It hits kpopquiz.org too the day that migration reaches production. | `profiles!inner` on quizzes in 10 files | every embed now names the foreign key: `profiles!quizzes_creator_id_fkey!inner` (the name is already used by the admin queries on production). Same rows on kpop. Proof: after the change quizzes list and `/q/<slug>` answer 200 on anime and the log has no PGRST201. |
| B2 | The played quiz result screen on otakuquiz showed "KpopQuiz", the Korean stamp, the kpop Discord line, the KpopQuiz bunny, "K-pop blindtest"; the share image said KPOPQUIZ and kpopquiz.org; the share link was `https://kpopquiz.org/q/<slug>` (NEXT_PUBLIC_SITE_URL stays unset on anime, flags-env.md) | components/quiz/ux-v1/results.tsx, story.ts, quiz-run.tsx, components/ux-v1/story-image.ts | read the registry (`SITE`): brand name, `SITE.url`, domain; Korean stamp, Discord block, bunny and "K-pop blindtest" only when `SITE.id === 'kpop'` |
| B3 | The brand mark of every anime and hub page (header and footer) was the KpopQuiz rabbit | components/ux-v1/brand.tsx | letter tile of the wordmark (O, F) on other sites; kpop keeps the rabbit. The real logo is still owed (left 1). |
| B4 | Dead nav: the mobile tab bar sent "You" to `/profile` (404 on anime) and, on the hub, Quizzes, Blindtest, Community and You (404); the hub header had Search and Create (404); the hub login linked `/terms` (404); anime home had a "Blindtest of the day" band (songs, `/blindtest/leaderboard` 404) although anime has no daily blindtest | lib/ux-v1/a0/nav.ts (`tabItemsFor`), ux-tab-bar.tsx, ux-nav-actions.tsx, login-body.tsx, passport-ui/words.ts, home/ux-v1/ux-home.tsx | tab bar shows the doors the site has (anime: Home, Quizzes, Blindtest, Community, You to /me; hub: Home, You to /passport), Search and Create only where the route exists, hub login names the privacy policy only, the band only when `features.dailyBlindTest`. kpop returns TAB_ITEMS itself and the same markup. |
| B5 | `/me` listed the member's quizzes with Edit links to `/quiz/<id>/edit` (404 on anime, no such route) | profile/ux-v1/own-quiz-row.tsx, quiz/quiz-owner-actions.tsx | the Edit link only on kpop (left 2) |
| B6 | Text contrast (serious): `/series` 31 nodes at 2.67 to 2.83, `/login` (anime and hub, light 2.83, dark 3.36), the 404 (2.67, pink links 3.56) | legacy grey and pink classes | new world-only sheets `styles/sites/anime/c1.css` and `hub/c1.css` (classes `anime-c1-*`, `hub-c1-*`, tokens `--ux-muted`, `--ux-pink-ink`, light and dark) put on the elements; the contract test of the site sheets passes |
| B7 | 404 page: the KpopQuiz bunny mascot, no h1 | sites/[site]/not-found.tsx | mascot only on kpop, "404" is the h1 |

Proof that kpopquiz.org did not change: `apps/quiz/e2e/o1/P1/kpop-chunks.sh` on two kpop builds with the same flags (base 0d0d8aa, head
with the changes, `env.sh dev`, SITE_SCOPE=1): 163 kpop page manifests compared, 0 pages reach other client modules (`RESULT: every
kpop page reaches the same client modules as base`; q/[slug], [slug], blindtest/[mode] and home: same graph, only chunk hashes differ
because of the added branches). The kpop markup snapshots (`__o1_kpop_nav__`, account menu, nav actions, footer) pass in vitest. No
optional prop was needed: each change reads the registry and keeps today's value on kpop.

## Per page (375 px and 1280 px; "before" = first run, "after" = final run)

| page | before | after |
|---|---|---|
| otakuquiz / | dead link /blindtest/leaderboard, /profile (tab bar); kpop-song wording in the daily band | clean (axe, scroll, K-pop, links, focus) |
| /series | contrast x31, /profile | clean |
| series hubs: attack-on-titan (tier A), bleach (B), vinland-saga (C) | quiz links 404 (B1), /profile | clean |
| quiz page with the spoiler gate (attack-on-titan, "Show anyway" and "Set my progress", shield drawer) | 404 (B1) | clean; gate readable at 375 px, no overlap |
| quiz played to the result (bleach, 10 answers) | kpop leaks (B2) | clean |
| /daily | lands on /quizzes: there is no quiz of the day on o1-dev (ensure_daily_quiz_v2 cron not run); moderate heading-order (h3 after h1 on the quiz cards) | same (data, shared card markup, left 5 and 6) |
| /me, /settings, /u/o1_dual (dual); /me, /u/o1_anime_new (anime_new) | /me edit links 404 (B5) | clean, no K-pop word |
| /login | contrast light and dark | clean |
| 404 (`/bts-quiz`) | contrast, mascot, no h1 | clean |
| fanquiz / and /privacy | 4 dead tab links, Search, Create (B4) | clean (KpopQuiz listed by design) |
| fanquiz /login | contrast, /terms 404 | clean |
| kpopquiz / (reference) | dead links to the kpop group hubs: o1-dev has no kpop groups or quizzes (data) | no axe, scroll or focus finding; a kpop quiz page was not audited (none on the database; set O1_C1_KPOP_QUIZ) |

Across all pages: no horizontal scroll at 375 px, no image without alt, no failed asset (the `/_vercel/insights/script.js` 404 of a
local server is ignored), focus is visible on every Tab stop seen, no positive tabindex, token contrast of anime and hub (the registry
tokens are still the kpop placeholder palette) passes in light and dark for the 18 pairs.

## Left (not fixed), with the file to change

1. Brand files missing, blocker for launch (owner assets): `public/brand/anime/` has only `creators/` and `public/brand/hub/` does not
   exist, while the registry points `brand.logo`, `brand.favicon`, `brand.ogTemplate` and the manifest icons there
   (lib/site/registry.ts, lines 139 to 143 and 225 to 227). Tab icon, OG image and the logo of the JSON-LD will 404 on both sites until
   the files exist (routes.md: O1 provides anime, H1 hub). The letter tile (B3) is only a stand-in.
2. Anime has no owner edit page: `/quiz/{id}/edit` is a kpop route and routes.md lists none for anime, so a fan cannot edit their own
   quiz (the links are hidden, B5). Not a launch blocker while creators are Team accounts; lane O4 needs a route row and a page.
3. Hardening of B1 at the source: give `spoiler_reports` a surrogate `id` primary key (and a unique index on quiz_id, reporter_id) in
   docs/o1/contracts/schema.sql 015-spoilers, so no future embed `profiles` from quizzes can become ambiguous. The app is safe without it.
4. Kpop literals on features anime has, outside the pages of this brief (found by grep, not exercised): `components/name-all/game.tsx`
   (host `kpopquiz.org`), `components/personality/quiz.tsx` and `components/share-kit/share-kit.tsx` ("Play at kpopquiz.org"),
   `components/blind-test/*` and `components/game/blind-test-player.tsx` (share texts with kpopquiz.org and "K-pop"),
   `components/quiz/level-up-overlay.tsx` (Korean title, shown on a level-up), `components/profile/ux-v1/settings.tsx` line 384
   (the username hint, used if that component is served on a world site). Same pattern as B2: read `SITE`, keep kpop's literal.
5. Shared legacy tokens stay as they are because they also colour kpopquiz.org: `--txt3` (2.83 on white), `--text-ghost` (the
   placeholder of the search box on the 404 and other forms, about 1.7), `.text-accent` pink text (3.56). Fixing them for everyone is a
   token change in `src/styles/globals.css` (a kpop change, owner decision); the per-element swaps of B6 cover the anime and hub pages
   audited here only.
6. Moderate axe items, shared markup: heading order on the quiz cards (`.ux-qcard h3` after the h1 on /quizzes and /daily); the
   mobile tab bar lights "Quizzes" on a 404 whose path looks like a series hub (`isHub` in lib/ux-v1/a0/nav.ts).
7. Data on o1-dev, not code: no quiz of the day (so /daily goes to /quizzes), no kpop groups or quizzes.
8. Inherited known limit (Q0b tools.md): an unknown path answers 500 instead of the 404 page under `next start -H 127.0.0.1`; a real
   404 such as `/bts-quiz` is fine and is what the spec uses.

## Checks

`pnpm -C apps/quiz exec tsc --noEmit` 0; `vitest run src/components src/lib src/app --testTimeout=120000`: 224 files, 3253 tests
green; `check.sh` twins ok; dash and emoji grep of the diff empty; `apps/quiz/.next` and the dev-up builds deleted; sites stopped.
