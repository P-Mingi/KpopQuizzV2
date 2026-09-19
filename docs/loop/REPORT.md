# REPORT - REFONTE P1: the code cut (features removed, DB untouched)

Branch `refonte/p1-kill-code` off main (585a740). CODE ONLY - zero DB writes, no DROP, no bucket
change, no migration. The database cleanup (dropping the killed tables + deleting the Pinterest
buckets) is the SEPARATE next mission, gated behind this deploy: prod still renders killed assets and
Pinterest-background URLs until this kill ships, so the code goes first.

Executed the KILL-MAP (`docs/refonte/KILL-MAP.md`) feature by feature. Full proofs:
`apps/quiz/docs/proofs/refonte-p1/` (301 matrix, bundle grep, route table, sitemap count, screenshots,
build summary).

## What was removed (per the map)

- **Games hub + all mini games**: /games (+ /pt/games), sort-it, match-up, name-them-all, name-all,
  this-or-that. Routes, players, `lib/games/*`, the game-of-the-day + games-teaser home promos, the
  admin game-image tool, `/api/debug-games`.
- **Rankings / duel votes**: /rankings hub + /rankings/[group]/[type], `/api/duels/*`, `/api/rankings/*`,
  the duel-reconcile cron, the community `hot-matchups` module, the stats "fan duel verdicts" block.
- **Tier lists (all)**: the whole /tier-list tree, `/api/tier-list/*`, the OG route, the admin asset
  queue, the home TierListHomeCta, the community Recent-tier-lists box (PR #25) + its query.
- **Battle / duel 1v1**: /battle + `/api/battle/*` (11 routes), the home BattleCta, the quiz-result
  "challenge a fan" button, the `/battle?open=...` blocks on group + quiz pages, the weekly-challenge
  cron, the `battle-beaten` notification, the `battle-reveal` discord kind.
- **Personality ("which member are you")**: /personality routes, `/api/personality/result`, OG,
  `lib/personality/*`, the group-hub personality tiles, the profile personality flair reads on /me + /u.
- **Avatar studio**: /avatar-studio, `/api/avatar/save`, `lib/avatar/*` (was already 301-to-home via
  allowlist absence).
- **Pinterest pipeline**: `/admin/pinterest` + 14 `/api/admin/pinterest/*`, `/pinterest-feed.xml`,
  `lib/pinterest/*`, the scripts, the dead `pinterest-post` cron entry.

185 files deleted, 35 kept files edited (unpicked, never deleted), 2 files added (the 301 e2e spec + the
tier-list resolver route). Collectibles/photocards STAY (wired in Verse). `personality_results` Verse
reads STAY dormant. The `games` table's blind-test rows STAY (kept `/g/[slug]`).

## Shared modules unpicked by EDITING the kept file (never deleted)

- `lib/constants.ts` now owns `RANKING_UNLOCK_VOTES` (relocated from the retired duels module; it gates
  the KEPT quiz score display, so it is a kept threshold, not a ranking artifact). Consumers repointed:
  `q/[slug]/page.tsx`, `quiz-stats-block.tsx`.
- `sitemap.ts`: removed the games / name-all / rankings / personality / tier-list blocks + the
  `/pt/games` and CATALOG_PATHS entries.
- `analytics.ts`: pruned the killed members from `GameType` (now `quiz|blindtest`) and `CrossPromoTarget`.
- `api/game/[id]/play/route.ts`: dropped the `name_all_members` branch, kept `blind_test`.
- `lib/db/queries/games.ts`: kept `getGameBySlug` (blind test) + the blind-test queries; removed the
  orphaned games-hub browse + name-all queries.
- `community.ts`: removed `getHotMatchups`; the historical `duel_voted` / `battle_won` feed events now
  point at the fan's group hub instead of the dead /games routes.
- `result-loop.tsx`: the blind-test finisher (the only non-quiz result left) now loops into quiz-of-the-day
  + the quiz browse, not the removed games.
- Nav/footer/JSON-LD/allowlist/middleware/next.config as listed below.

## 301s (next.config redirects, `permanent: true` = 308, SEO-equivalent to 301) - PROVEN LIVE

Group-scoped URLs carry their fandom intent to `/{group}-quiz`; everything else to `/quizzes`, never to
home. The one dynamic resolver is `/tier-list/l/[slug]` (a cookie-free route handler that reads the
list's subject group and 308s to that hub, fallback /quizzes). Full matrix with Location headers:
`docs/proofs/refonte-p1/redirect-matrix.txt`. Highlights (all verified on `next start`, never dev):

```
308  /games, /games/sort-it, /games/name-all/bts-members, ...  ->  /quizzes
308  /pt/games                                                 ->  /pt/quizzes  (locale preserved)
308  /rankings/bts/best-song                                   ->  /bts-quiz
308  /tier-list/subject/bts/visual                             ->  /bts-quiz
308  /tier-list/l/<slug>                                       ->  /{group}-quiz (or /quizzes)
308  /personality/bts, /which-bts-member-are-you               ->  /bts-quiz
308  /which-le-sserafim-member-are-you/r/chaewon               ->  /le-sserafim-quiz  (multi-hyphen OK)
301  /pinterest-feed.xml, /avatar-studio, /zzz-unknown         ->  /  (middleware unknown-route)
```

## Middleware + the matcher subset property

Removed the `/battle-preview` redirect and the `/which-*-member-are-you` rewrite; the killed prefixes
(`games`, `tier-list`, `rankings`, `battle`, `personality`) left the matcher exclusion AND the allowlist
together, so the subset invariant holds (a path is only skipped when the allowlist knows it). `g/` stays
excluded (kept blind-test route). `/tier-list/l/` is the one narrow allowlist entry kept, for the
resolver. Proven in `middleware-matcher.test.ts` (118 cases incl. an explicit subset-property matrix).

## Freed-slot re-route (energy, not empty space)

- **Home**: the retired tier-list launch band + the game-of-the-day + battle-of-the-day rows freed the
  top content slot; the daily pair (Quiz of the Day + Blindtest of the Day) rises into it. The mid-page
  games teaser slot collapses onto the kept Verse strip + Browse-by-group (group hubs). No new read.
- **/pt home**: same, minus the game-of-the-day half of its two-up; the daily quiz + the blindtest CTA
  remain.
- **Community**: the Recent-tier-lists + hot-matchups boxes are gone; the page keeps the Daily Ritual
  (quiz + blindtest of the day), the Fandom War map (group hubs) and Fresh Quizzes. No new read.
- **Stats internal links**: the "Games hub" card repoints to the group directory (/groups).

## Owner request folded in (2026-09-19): hide the Verse on the public Play surfaces

While the Verse is pre-launch (`VERSE_PUBLIC` not `'true'`, which is prod today), no Verse entry point
shows on the Play site. Gated on the existing `verseHidden()` switch so it is fully reversible - flip
`VERSE_PUBLIC=true` at relaunch and every strip returns untouched, no code change:
- Home: the "Fandom Spaces on Verse" strip (`VerseHomeStrip`) returns null.
- Community: the Verse cross-promo (`CommunityCrossPromo`) is not rendered.
- Footer: the "Fandoms" -> /verse link is dropped from the Discover column.
Proven in the prod-like build (VERSE_PUBLIC unset): home + community render with no Verse (screenshots),
and the /verse footer link is absent from the served HTML. The Fandom War map on Community is a Play
feature, not Verse, and stays.

## Deviations from the map (named)

1. **`/api/og/quiz-card` killed, not kept.** The map said "keep the route, drop the pinterest read", but
   the route is 100% Pinterest-card templates with zero inbound refs, so it was removed with the pipeline.
2. **`/g/` stays in the allowlist + matcher exclusion.** The map's allowlist line listed `/g/` for
   removal; that conflicts with its own "kept /g/[slug] (blind test)" note. `/g/` is kept.
3. **`open-runs` pair deleted** (`lib/db/queries/open-runs.ts` + `open-runs-block.tsx`): not named in the
   map, but they read only `battles`/`battle_results` and render only the `/battle?open=` CTA - pure
   battle-serving files, fully orphaned by the battle kill.
4. **`notifyRunBeaten`** removed from `notifications.ts` (battle-only helper, orphaned by the API kill).
5. **`/pt/games` -> `/pt/quizzes`** (map said `/quizzes`); the locale-preserving target is the better
   redirect and keeps the hreflang pair intact.
6. **Members strip de-linked, not removed**: the group-hub roster (member faces + names) is kept content
   and stays, but each cell is now a plain display cell instead of a link into the removed name-all game.

## Verification

- **tsc**: 0 source errors (the only tsc noise was stale `.next/dev` generated route types from a prior
  dev server, cleared on rebuild).
- **Unit**: 118 passed (the games unit tests died with the feature; the matcher test is the survivor,
  now with the subset-property matrix).
- **e2e**: 48 passed (desktop + mobile) - the new `refonte-301.spec.ts` matrix + the smoke spec; the
  killed `games-hub` / `tier-list` specs were removed.
- **Build**: `next build` green, 777 static pages, "Compiled successfully". Killed routes absent from the
  route table (305 app routes after); `/tier-list/l/[slug]` resolver + `/g/[slug]` blind test present.
- **Bundle grep**: 0 killed-feature chunks in `.next/static/chunks`; kept BlindTest/QuizCard chunks present.
- **Sitemap**: 738 -> 645 URLs (prod-like build, Verse hidden = prod); 0 killed-feature URLs.
- **Gates**: `check:routes` (allowlist guard) passes - 302 page routes reachable. `check:tier-list`
  removed (script + npm entry) since it dies with the feature.
- No em dashes, zero emoji. No Verse/blindtest/quizzes/articles/news/pulse feature restructured (only
  the Verse entry-point hide the owner asked for). /pt keeps working. Zero DB writes / bucket ops /
  migrations.

## Owner gates (remaining)

1. Review + merge `refonte/p1-kill-code` to main (owner-gated; branch push done, CI on branch head).
2. After deploy, the killed URLs 301/308 live and the Games/Tier Lists chrome is gone.
3. THEN run the SEPARATE DB-cleanup mission (`docs/refonte/DB-CLEANUP-PLAN.md`): pg_dump, then drop the
   killed tables + delete the Pinterest/game/tier buckets (each owner-gated). Storage 749 MB -> ~79 MB.
