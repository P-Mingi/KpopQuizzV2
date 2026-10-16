# Naming (o1-contract-v1)

Frozen by BACKLOG 5.1 unless marked "F0 decision". Code: `apps/quiz/src/lib/site/types.ts`.

## Sites

| id (`SiteId`) | kind | letter | brand | domain | url | dev host |
|---|---|---|---|---|---|---|
| `kpop` | world | `k` | KpopQuiz | kpopquiz.org | https://kpopquiz.org | kpop.localhost:3000 |
| `anime` | world | `a` | OtakuQuiz | otakuquiz.org | https://otakuquiz.org | anime.localhost:3001 |
| `hub` | hub | `f` | FanQuiz | fanquiz.org | https://fanquiz.org | hub.localhost:3002 |

- `NETWORK = { name: 'FanQuiz', url: 'https://fanquiz.org' }`.
- The order kpop, anime, hub is the display order everywhere (`SITE_IDS`).
- `SiteId` values are never extendable inside the run (BACKLOG 5.3).
- Lane ports for dev servers come from `docs/o1/ports.tsv`, not from the dev hosts above (those are the
  `dev:multi` defaults of Q0a).

## Naming traps (BACKLOG 0, invariant 5; R-ARCH greps every diff)

| never | always | note |
|---|---|---|
| a `World` type, prefix or file (`WorldId`, `currentWorld`) | `SiteId`, `SITE`, `site` | the word "world" survives only as a value: `SiteKind = 'world'`, and the frozen SQL names `world_memberships`, `world_follows`, `world_progress`, `award_world_xp`, `bump_world_counter`, `passport_leave_world` |
| `BRIDGE_*` constants, a `lib/bridge*` path, a `Bridge*` type | `lib/network/`, the `Net` prefix (`NetMe`, `NetLink`, `NetFooterLine`, `NetSitesMenu`) | "bridge" survives only inside the frozen names `NetBridgeId`, `bridge_daily`, `net_bridge_bump`, `bridgeHref` and the `bridge` field of `POST /api/n/b`. The existing `lib/personality/bridge.ts` is kpop code and is not renamed |
| a hub id spelled as the two letters of research A | `hub` | the id research A proposed is refused by `resolveSiteId` |
| `show_on_other_worlds`, `site_preferences`, `network_settings` | `show_elsewhere`, one `passport_prefs` table | BACKLOG 8, rows 9 and 10 |
| `/auth/passport/callback` | `/auth/arrive`, `/auth/authorize`, `/auth/land` (P mechanics), `/auth/passport/out` (click endpoint) | BACKLOG 8, row 17 |
| "Verser", `verser.gg`, `passport.verser.gg` | FanQuiz, fanquiz.org; every site is its own identity provider | BACKLOG 8, rows 7 and 30 |

## Codes and identifiers

- `via` code: `^[kaf]\.[a-z]{2,8}$` (site letter, a dot, 2 to 8 lowercase letters), e.g. `k.menu`, `a.ch`, `k.wl`.
- `NetBridgeId`: Q's list (frozen in `lib/network/types.ts`, F0 slice 3).
- Series slug: `groups.slug` of the anime topic row, `^[a-z0-9-]{1,60}$`, unique across sites (routes.md).
- Username: unchanged, `^[a-z0-9_]{3,20}$` (`lib/ux-v1/p5/funnel.ts` USERNAME_RE), unique across the network.
- SQL: `site_id text not null default 'kpop' references public.sites(id)` on every scoped table; the passport schema
  is `passport` (not exposed to the Data API); network functions start with `net_`, passport functions with
  `passport_`; triggers `trg_<table>_<purpose>` (schema.sql).
- Analytics: no new event name without a CR; `beforeSend` (B6) strips identifiers.

## Folders and files (F0 decision where not in BACKLOG)

| what | where |
|---|---|
| registry, routing, site types | `apps/quiz/src/lib/site/` |
| network client layer | `apps/quiz/src/lib/network/` (B6), types in `lib/network/types.ts` (F0) |
| passport types and helpers | `apps/quiz/src/lib/passport/` (types F0, code B3 and B4) |
| anime domain types and helpers | `apps/quiz/src/lib/anime/` (types F0, code K1, O2 to O6) |
| anime and hub pages | `apps/quiz/src/app/sites/[site]/...` only (routes.md); never a page under `app/(site)/` |
| per-site CSS | `apps/quiz/src/styles/sites/<site>/<lane>.css` (B1 includes them by site; tokens.md) |
| per-site, per-lane copy | `apps/quiz/src/copy/<site>/<lane>.ts` (copy-keys.md); never `lib/i18n` |
| per-site brand assets | `apps/quiz/public/brand/<site>/` (never under `public/sites/`, which would shadow the internal `/sites` prefix) |
| SQL | `docs/pending-migrations/multisite/NNN-<topic>.sql` and `NNN-<topic>.rollback.sql`; launch rows `docs/pending-migrations/multisite/launch/LNN-<lane>-<topic>.sql` (manifest.md) |
| run gate scripts | `apps/quiz/scripts/o1/` (never `apps/quiz/scripts/check-*.mts`) |
| contract fixtures and schemas | `docs/o1/contracts/fixtures/`, `docs/o1/contracts/schemas/` |
