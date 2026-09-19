# KILL-MAP - complete inventory of the kill list (READ ONLY audit, 19 Sep 2026)

Source of truth for what dies: the owner's recorded kill list in `docs/loop/MISSION.md`. This
document inventories it. Nothing here is executed; every path is named so the execution mission
can act. Inventory gathered by three read-only code sweeps (logged in the proofs). Render modes
read from the route pages' exports, not a build.

## Three corrections the sweep forced (read these first)

1. This or That AND rankings ARE on the kill list, so the whole vote/ranking machinery dies
   with them: `components/duel/*` (duel-game, ranking-list, vs-badge), `api/duels/{next,vote}`,
   `api/cron/duel-reconcile`, `lib/db/queries/duels.ts`, `/rankings*`, `hot-matchups`,
   `components/game/this-or-that-game.tsx`. WARNING: `lib/db/queries/duels.ts` also exports
   `RANKING_UNLOCK_VOTES` and `getRanking`, imported by KEPT pages (`q/[slug]/page.tsx`,
   `quiz-stats-block.tsx`, `stats/page.tsx`). Those imports feed a "vote to unlock the ranking"
   cross-promo that dies with rankings; the execution mission removes the imports and the
   cross-promo block, it does not keep the file.
2. Collectibles / photocards are WIRED (live inside Verse: space tabs, content-page cards,
   canonical Collections module, badges, sitemap). The mission kills them only "if unwired". They
   are NOT unwired, and Verse is frozen and untouched, so they STAY. Removed from the kill.
3. There is no "K-pop Idle" game. The games hub had a non-interactive "Coming soon" card; no
   route, component or data exists. Nothing to kill there beyond the card markup in games-hub.tsx.

## Shared modules that must be EDITED, not deleted (they also serve a kept surface)

- `src/lib/db/queries/games.ts` - `blind_test` queries (kept `/g/[slug]`) coexist with name-all.
- `src/app/api/game/[id]/play/route.ts` - the `blind_test` branch (kept) coexists with the
  `name_all_members` branch (killed).
- `src/lib/name-all-utils.ts` - `getInitials` is imported by the kept group hub sections.
- `src/lib/analytics.ts:19,33,34` - `GameType` / `CrossPromoTarget` unions list killed and kept
  values together (prune the union members, keep the file).
- `src/app/api/og/page/route.tsx` - shared OG endpoint used by many kept pages.
- `src/app/api/og/quiz-card/route.tsx` - reads the `pinterest_background_image_url` quiz column;
  drop that read when the Pinterest columns go, keep the route.
- `packages/shared/src/social-links.ts` `SOCIAL_LINKS.pinterest` (brand profile in the home
  schema.org `sameAs`) - a social link, NOT the Pinterest pipeline; keep or drop by choice, it is
  not part of the kill.

---

## 1. GAMES HUB + ALL MINI GAMES (Sort It, Match-Up, Name Them All, name-all)

Routes (all ISR unless noted):
- `/games` (site/games/page.tsx, ISR 3600) and `/pt/games` (ISR 3600) - the hub + PT mirror.
- `/games/sort-it` + `/games/sort-it/[slug]` (ISR 3600).
- `/games/match-up` + `/games/match-up/[slug]` (ISR 3600).
- `/games/name-them-all` + `/games/name-them-all/[slug]` (ISR 3600). Client-only, saves nothing.
- `/games/name-all` + `/games/name-all/[slug]` (ISR 600). DB-backed (name_all_member_results).
- API: `/api/game/[id]/play` (name_all_members branch), `/api/debug-games`, admin `/api/admin/game-image*`, `/admin/game-images` page.
- OG: none dedicated; reuses `/api/og/page` via `lib/games/game-seo.ts`.

Files:
- Components `src/components/game/*` (games-hub, games-filter, games-countdown, games-streak,
  games-daily-strip, game-mode-rail, game-card, hub-last-played, sort-it-player, match-up-player,
  name-them-all-player, name-all-player, name-all-landing, tot-category-picker) and
  `src/components/games/*` (adapters, game-group-filter, game-hero-card, name-all-card,
  name-all-grid, tot-category-card).
- Home promo: `src/components/home/home-games-teaser.tsx`, `game-of-the-day.tsx`.
- lib: all of `src/lib/games/*`; `src/lib/db/queries/{games.ts(edit), match-up, name-them-all,
  sort-it, game-of-the-day}.ts`; `src/lib/name-all-utils.ts` (edit - keep getInitials).
- Tests: `src/lib/games/{daily-rotation,hub-filters,reset-countdown}.test.ts`. E2E `e2e/games-hub.spec.ts`.
- CSS in globals.css: the `.gh-*`, `.games-*`, `.game-*`, `.nam-*`, `.games-row`, sort-it,
  match-up, this-or-that blocks (line ranges ~1979 to ~4024, listed in the proof).
- Proofs: `docs/proofs/games-hub/**`, `docs/proofs/ghub-v2/**`.

DB objects (name, do not touch): tables `games`, `game_plays`, `name_all_member_results`;
storage bucket `game-images`.

Render mode note for the route table: the game pages are `Static`/ISR (revalidate 3600 or 600),
so they are indexed. Killing them removes indexed URLs (see KILL-SEO).

301 target per pattern:
- `/games` hub and `/pt/games` -> `/quizzes` (the kept browse hub). Same "play a kpop quiz" intent.
- `/games/sort-it`, `/games/match-up`, `/games/name-them-all` (indexes) -> `/quizzes`.
- `/games/name-all/[slug]` and `/games/name-them-all/[slug]` (group-specific, "name all BTS
  members") -> the group's kept hub `/{group}-quiz` when the slug maps to a group, else `/quizzes`.
  Reason: the group hub is the nearest kept surface carrying the same fandom intent.

Effect on kept surfaces: removes the Games nav tab (desktop `top-nav-links.tsx:14`, mobile
`mobile-tab-bar.tsx:15`), the footer Games link (`footer.tsx:38`), the home GOTD + HomeGamesTeaser
sections (`page.tsx` and `pt/page.tsx`), the sitemap games block (see KILL-SEO), the games JSON-LD
ItemList on the now-deleted /games page, and the `games` entry from the home SiteNavigation JSON-LD.

## 2. THIS OR THAT + RANKINGS

Routes:
- `/games/this-or-that`, `/games/this-or-that/all`, `/games/this-or-that/[slug]` (ISR 600; the
  [slug] variant already 301s).
- `/rankings` (ISR 3600) and `/rankings/[group]/[type]` (ISR 3600). No PT mirror.
- API: `/api/duels/next`, `/api/duels/vote`, `/api/rankings/index`, `/api/rankings/[group]/[type]`,
  cron `/api/cron/duel-reconcile`. Admin `/admin/this-or-that`, `/api/admin/tot-upload`.

Files: `src/components/duel/*` (duel-game, ranking-list, vs-badge - vs-badge also used by battle,
both killed), `src/components/game/trending-rankings-strip.tsx`, `this-or-that-game.tsx`,
`tot-category-picker.tsx`, `src/components/games/tot-category-card.tsx`,
`src/components/community/hot-matchups.tsx` (rendered by kept community-content.tsx:19 - remove the
render), `src/components/admin/tot-admin-panel.tsx`; `src/lib/db/queries/duels.ts` (edit-out the
kept `RANKING_UNLOCK_VOTES`/`getRanking` consumers first: `q/[slug]/page.tsx:8`,
`quiz-stats-block.tsx:1`, `stats/page.tsx:6`). CSS: rankings + duel-vote blocks in globals.css.

DB objects: tables `duel_votes` (75,120 rows, 19 MB - the heaviest killed table), `tot_plays`,
`tot_categories`. No dedicated bucket.

301 target:
- `/rankings` hub -> `/quizzes`. `/rankings/[group]/[type]` -> `/{group}-quiz` (group intent).
- `/games/this-or-that*` -> `/{group}-quiz` when group-scoped, else `/quizzes`.

Effect: removes the footer Rankings link (`footer.tsx:42`), the community `hot-matchups` module
(community stays, the module goes), the rankings sitemap block (21 URLs), and the `rankings` entry
from the home SiteNavigation JSON-LD. The `RANKING_UNLOCK_VOTES` cross-promo on kept quiz pages
(the "vote to unlock the ranking" block) is removed with it.

## 3. TIER LISTS (everything)

Routes: `/tier-list`, `/tier-list/new`, `/tier-list/create`, `/tier-list/share`,
`/tier-list/l/[slug]`, `/tier-list/mine/[slug]`, `/tier-list/subject/[group]/[kind]` (shared
layout + `tier-list.css`). OG `/api/og/tier-list`. API `/api/tier-list/{asset,like,save,view}`,
admin `/admin/tier-list-assets` + `/api/admin/tier-list-assets/action`.

Files: all of `src/lib/tier-list/*` and `src/components/tier-list/*`;
`src/components/community/recent-tier-lists.tsx` + `getRecentTierListsForCommunity` in
`lib/tier-list/db.ts` + its wiring in `community-content.tsx` (imports L26-27, plumbing L80/96/99/106,
render L152) + the `.rtl-*` CSS block (globals.css 7508-7533); `src/components/home/tier-list-home-cta.tsx`
+ `.tlcta-*` CSS (globals.css 3402-3427); `src/components/admin/tier-list-asset-queue.tsx`. Tests
`src/lib/tier-list/*.test.ts` (7 files) + `e2e/tier-list.spec.ts` + `scripts/check-tier-list.mts`
gate. Proofs `docs/proofs/tierlist*/**` and `docs/design/tier-list/`.

DB objects: tables `tier_lists` (4 rows), `tier_list_assets` (11); bucket `tier-list-assets`
(189 kB). Migration 146.

301 target: `/tier-list`, `/tier-list/new`, `/tier-list/create`, `/tier-list/share`,
`/tier-list/mine/*` -> `/quizzes`. `/tier-list/l/[slug]` (published user lists, 2 live + in sitemap)
-> the subject group hub `/{group}-quiz` (resolve subject_group_id to its slug), per the mission.
`/tier-list/subject/[group]/[kind]` -> `/{group}-quiz`.

Effect: removes Tier Lists nav tab (`top-nav-links.tsx:15`), footer link (`footer.tsx:39`), home
`TierListHomeCta` (`page.tsx:286`), the community Recent-tier-lists box just shipped
(`community-content.tsx:152`), the tier-list JSON-LD ItemList entry on the /games page (dies with
that page), and the `check:tier-list` gate.

## 4. BATTLE / DUEL 1v1

Routes: `/battle` (force-dynamic, noindex, absent from sitemap). API `src/app/api/battle/*` (11
routes). No OG. `/battle-preview` 301 to `/battle` lives in middleware (L65-68).

Files: `src/lib/battle/{select-questions,weekly-challenge}.ts`; `src/components/battle/battle-game.tsx`,
`src/components/home/home-battle-cta.tsx`, `src/components/quiz/result-challenge.tsx` (the "challenge
a fan" button on quiz results - posts /api/battle/challenge). `.bc-*`/`.bp-*` CSS in globals.css.
Cron `/api/cron/weekly-challenge` (imports lib/battle). Proofs `docs/proofs/w2-battle/`.

DB objects: tables `battles` (2,569), `battle_results` (3,043). No bucket. (Migration 064
`battle_rooms` does NOT exist as a live table - abandoned; nothing to drop there.)

301 target: `/battle` -> `/quizzes` (internal redirect; SEO-neutral, it was noindex). Remove the
`/battle-preview` redirect from middleware too.

Effect: removes the home BattleCta on both `/` and `/pt` (`page.tsx:302`, `pt/page.tsx:106` - both
home pages need a replacement CTA, since HomeBattleCta was the fallback slot), the quiz-result
"challenge a fan" button (`quiz-player.tsx:1161`), the `/battle?open=...` links on group and quiz
pages, the weekly-challenge cron + notification, the `battle-reveal` discord kind, and the Duel
JSON-LD ItemList entry on the /games page.

## 5. PERSONALITY (which member are you)

Routes: `/personality` (ISR 3600), `/personality/[group]`, `/personality/[group]/r/[member]`. The
pretty URL `/which-{group}-member-are-you[/r/{member}]` has NO page file - it is produced by the
middleware rewrite (L69-77). OG `/api/og/personality`. API `/api/personality/result`.

Files: `src/lib/personality/{data,engine}.ts`, `src/components/personality/{personality-entry,
personality-quiz}.tsx`, `.pq-*` CSS (globals.css 3324-3432).

DB objects: table `personality_results` (1,251). Also referenced by Verse (`personality_profiles`,
idol personalityRank) - Verse is frozen; the KILL removes the Play personality product, NOT the
Verse reads. The profile "personality flair" (`show_personality_flair`, `getLatestPersonalityMatch`)
on `/me`, `/u/[username]`, settings, and the `personality` badge also read this - the execution
mission decides whether to keep the flair reading dormant or remove it; note it, do not touch it.

MIDDLEWARE IMPACT (the kill WILL touch middleware): remove the rewrite block L69-77. The pretty
`/which-*-member-are-you` URLs (21, in the sitemap, indexed) then have no handler - the execution
mission must add a next.config redirect `/which-:group-member-are-you` -> `/:group-quiz` (a 301 at
the edge) so the equity moves to the group hub. `which` is NOT in the matcher exclusion list today
precisely because it needs the function; once the rewrite is a config redirect, `personality` and
`which` both leave the runtime.

301 target: `/personality`, `/personality/[group]`, `/which-{group}-member-are-you` ->
`/{group}-quiz`. Reason: the pretty URLs carry group intent ("which BTS member are you"); the group
`-quiz` hub is the kept surface with the same fandom and the strongest SEO (the hubs are 54% of
clicks). Sending them there conserves the group equity better than /quizzes or home.

Effect: removes personality from the games hub (dies with /games), the GOTD rotation
(`game-of-the-day.ts` - GOTD dies with games anyway), the group hub `hasPersonality` tiles
(`group-quiz-page.tsx`, `group-hub-sections.tsx`), the `/which-*` sitemap block (21 URLs), the
personality JSON-LD ItemList entry on /games, and the search entry.

## 6. AVATAR STUDIO

Route `/avatar-studio` (page.tsx, noindex, deliberately ABSENT from KNOWN_ROUTES so it already
301s to home). Component `src/components/avatar/avatar-studio.tsx`, lib `src/lib/avatar/{compositor,
manifest}.ts`, API `/api/avatar/save` (bucket `avatars`), migration 103, assets `public/avatar/` +
`avatar-assets/`. No inbound links anywhere (frozen). DB: `avatars` bucket (empty or near-empty -
not in the storage list, so 0 files), profile columns `avatar_ref`/`avatar_config`/`avatar_kind`.

301 target: none needed (already 301s to home via allowlist absence). Cleanest kill of the list:
delete the route + lib + component + API + assets; the DB objects (avatars bucket, avatar_config
column) are dormant and owner-gated for drop.

## 7. PINTEREST PIPELINE

Not a user route - an admin tool + a feed. Files: `src/lib/pinterest/*` (question-pin, batch,
templates), `src/components/admin/pinterest/*` (6 tabs), `/admin/pinterest` page, 14 API routes
under `/api/admin/pinterest/*`, the feed `/pinterest-feed.xml/route.ts`, script
`scripts/generate-question-pins.mts`, output dirs `pinterest-output/`, root `pinterest-worker/`,
`pinterest-pins/`. Migrations 021/022/023/065.

DB objects: tables `quiz_pinterest_cards` (195), `pinterest_pins` (217), `pinterest_scraped` (600),
`pinterest_auth`, `pinterest_boards`, `pinterest_originals`, `pinterest_scrape_jobs`. Buckets
`pinterest-question-pins` (455 MB), `pinterest-pins` (109 MB), `quiz-pinterest-cards` (74 MB),
`pinterest-brand-pins` (18 MB), and `quiz-backgrounds` (065, frozen). THIS IS THE STORAGE HOG:
666 MB, the one thing that blocks the Free downgrade (see DB-CLEANUP-PLAN).

Shared coupling to edit: `/api/og/quiz-card` reads `pinterest_background_image_url`;
`lib/db/types.ts:441-443` has `pinterest_status/posted_at/pin_id` on the quiz type. Keep the
`SOCIAL_LINKS.pinterest` brand link (separate). Stale cron anomaly: `apps/quiz/vercel.json:6-9`
schedules `/api/cron/pinterest-post`, a route that does NOT exist - dead entry to remove.

301 target: `/pinterest-feed.xml` -> remove (410 or delete the route; a feed is not an indexed
page). No user-facing URLs.

Effect: removes the `/admin/pinterest` admin link (`admin/layout.tsx:27`), the
`/pinterest-feed.xml` from route-allowlist (L34). The quiz OG card loses its Pinterest-background
option (falls back to the default card).

---

## Consolidated shared-surface edit list (what the execution mission changes)

- Desktop nav `top-nav-links.tsx`: remove Games (L14, icon L50-56) and Tier Lists (L15, icon L63-68).
  The nav becomes Home / Quizzes / Blindtest / (Verse tabs). State what fills the gap: nothing new
  needed, the nav shrinks to the two products.
- Mobile nav `mobile-tab-bar.tsx`: remove Games tab (L15, icon L137-143) and the `/games/*` hide
  rules (L47-48); `mobile-top-bar.tsx` hide rules (L18-19).
- Footer `footer.tsx`: remove Games (L38), Tier Lists (L39), Rankings (L42).
- Home `page.tsx` and `pt/page.tsx`: remove GOTD, HomeGamesTeaser, HomeBattleCta, TierListHomeCta
  imports + skeletons + renders; replace the removed CTAs with blindtest / quiz-browse CTAs so the
  home does not go empty.
- Sitemap `sitemap.ts`: remove the games (L115-142, 337-350), rankings (L363-395), personality
  (L178-190, 571), and tier-list (L538-566) blocks and the `/pt/games` (L158) + CATALOG_PATHS
  (L40-42) entries. 738 -> about 639 URLs.
- Route allowlist `route-allowlist.ts`: remove `/games`, `/g/`, `/tier-list` (L23), `/rankings`
  (L25), `/which-`, `/personality` (L30), `/pinterest-feed.xml` (L34), `/battle` (L57). Keep the
  guard green by removing the app routes at the same time (the guard walks app/ and fails on an
  unreachable page).
- Middleware `middleware.ts`: remove the `/battle-preview` redirect (L65-68) and the personality
  rewrite (L69-77); in the matcher L121 drop the now-dead exclusions `g/`, `games`, `tier-list`,
  `rankings`, `battle`, `personality`. Update `middleware-matcher.test.ts`.
- Home SiteNavigation JSON-LD (`(site)/layout.tsx`): remove the Games and Rankings entries.
- `analytics.ts` unions: prune `sort-it`, `match-up`, `name-them-all`, `duel`, `battle`,
  `personality`, `this-or-that`, `name-all` from `GameType`/`CrossPromoTarget`.
