# Flags, environment and secret names (o1-contract-v1)

Code: `O1_FLAGS`, `UNTOUCHED_FLAGS`, `O1_SECRET_NAMES`, `flagOn`, `resolveSiteId`, `parseNetOrigins`, `netOrigin`
and `siteForOrigin` in `apps/quiz/src/lib/site/registry.ts`. Tests: `registry.test.ts` (parsing),
`contract.test.ts` (the three tables below equal the three code lists). New flag names are a 5.2 extension (CR);
the names below are frozen (5.1).

## 1. The site of a build

| variable | values | read by |
|---|---|---|
| `NEXT_PUBLIC_SITE_ID` | `kpop`, `anime`, `hub`; unset or empty = `kpop` | `lib/site` only (`SITE_ID`, `SITE`) |
| `SITE_ID` | server alias of the same values | `lib/site` only |

Two values that disagree, or an unknown value, throw at module load (registry.md). No code outside `lib/site/`
reads either variable. A non-kpop build also inlines its id through `next.config.ts` `env` (ORCH's wiring).

## 2. Build requirements of a non-kpop build (F0 decision)

- `NEXT_PUBLIC_UX_V1=1` and `NEXT_PUBLIC_UX_V12=1`: the anime and hub designs exist only on the UX v1 shell and its
  v12 parts (tokens.md 3.1). A non-kpop build without both fails at config load (ORCH adds the check to
  `next.config.ts` with the routing wiring, request F0-3). kpop builds are unchanged (production runs both on).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (today's `check:env`), the same Supabase project as
  kpop (one database for the network).

## 3. Flags

Convention (today's, `flagOn`): `'1'` or `'true'` is on; unset, empty, `'0'`, `'false'` and anything else is off.
Every flag is off by default on every site, means the same thing on every site, and is flipped per Vercel project by
L1's launch runbook (owner-run). Public flags are inlined at build: a change needs a redeploy. With every flag off,
kpopquiz.org is byte-identical (parity).

| flag | scope | lane | when on | when off |
|---|---|---|---|---|
| `SITE_SCOPE` | server | B2 | `forSite(query)` filters scoped reads by `site_id` on the kpop build | `forSite` is a no-op on the kpop build. On anime and hub builds `forSite` always filters, whatever the flag (F0 decision: fail closed, an anime page never reads kpop rows) |
| `NEXT_PUBLIC_NET_BEACON` | public | B6 | `NetLink` sends `shown` and `click` beacons, `via-catcher` sends `land` (`POST /api/n/b`) | no beacon; `/api/n/b` answers 204 and counts nothing |
| `NEXT_PUBLIC_NET_FOOTER` | public | B6 | the network footer line, `Organization.parentOrganization`, the llms.txt network line | none of them |
| `NEXT_PUBLIC_NET_MENU` | public | B6 | "Your sites" in the account menu (2 or more sites, or a "yes" preference) and the kpop settings Account row for multi-site users | today's menu and settings |
| `NEXT_PUBLIC_NET_FACTS` | public | X1 | crossover fact lines and links (`CrossoverFact`, `CrossoverLink`) | nothing rendered |
| `PASSPORT_JUMP` | server | B4 | the jump of P S1 (`/auth/passport/out` mints a ticket, `/auth/arrive` bounces, `/auth/authorize` issues codes) | `/auth/passport/out` sends a 302 to the target page signed out, with `via`; `/auth/arrive` sends a 302 to `next` with no bounce; `/auth/authorize`, `/auth/land` and `/api/passport/redeem` answer 404 |
| `PASSPORT_CONTINUE` | server | B4 | reserved for P2 (`/auth/start`, `/auth/continue`); inert in the run | the routes answer 404 whatever the value |
| `PASSPORT_SEED` | server | B4 | reserved for P3a (`mode=seed`, `pp_seeded`); inert in the run | `mode=seed` is refused whatever the value |
| `NET_INDEXING` | server | L1 | anime and hub builds let each page speak for itself: the indexable pages say index, follow; login, settings, search, profiles and thin series hubs keep their noindex; no `X-Robots-Tag` (C3, `lib/site/indexing.ts`) | every page of the build answers `noindex, nofollow` (meta and `X-Robots-Tag`, except /robots.txt and /sitemap.xml). Default. kpop is never closed by it |
| `NEXT_PUBLIC_NET_PRIVACY` | public | H1 | the short passport notice on the kpop sign-in sheet and login page (the same lines as the other sites, link https://fanquiz.org/privacy), the "Legal notice" footer link of kpopquiz.org and the kpop `/legal` route | none of them; `/legal` answers 404 on the kpop build. OtakuQuiz and FanQuiz always have the notice and `/legal` |
| `NEXT_PUBLIC_NET_DELETION` | public | B7 | kpopquiz.org: Settings, "Delete account" starts the passport deletion (confirm with @username, fresh sign-in of 10 minutes, signed out everywhere, "deletion scheduled" email, 7 days to cancel, then everything is deleted; published quizzes stay under "deleted user" unless the member asks to remove them). `POST /api/passport/delete`, `POST /api/passport/cancel` and `GET /api/passport/delete` (the pending request, for the cancel action) answer on the kpop build (owner decision of 2026-10-24). Needs 016, 017 and Mission U part D applied | the row and the sheet keep today's text (by hand, contact page, 30 days); those three routes answer 404 on kpop |

Reading a reserved flag in code is a review finding (R-SEC).

`NEXT_PUBLIC_NET_WELCOME` (BACKLOG 5.1) is not a flag of the run: it gated the welcome cards of CR-002 and CR-006,
which the owner refused for O1 on 18 October 2026 (LEDGER D-027), backlog after launch. The name is not reserved;
reading it in code is a review finding.

### Untouched

| flag | note |
|---|---|
| `NEXT_PUBLIC_UX_V1` | production on; required on non-kpop builds (section 2) |
| `NEXT_PUBLIC_UX_V12` | production on; required on non-kpop builds |
| `QOTD_ROTATION_FIX` | server switch of the quiz of the day rotation; B5's daily v2 keeps its meaning for kpop |
| `NEXT_PUBLIC_KDRAMA` | N3's flag (main); the run never sets it |

Every other variable the app reads today (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BT_TRACKING`, `VERSE_PUBLIC`,
`COMMUNITY_FEATURES_ENABLED`, `SONGS_IS_CURATED`, `CRON_SECRET`, `ADMIN_USER_IDS`, `DEV_LOGIN_*`, the Discord,
Spotify, YouTube and Reddit keys, `UX_P4_CHALLENGE_SECRET`, `INDEXNOW_TRIGGER_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`)
keeps its meaning on kpop. The anime and hub projects set only what their routes read (L1 lists them per project).
`NEXT_PUBLIC_SITE_URL` stays a kpop override: anime and hub take their canonical origin from the registry.

## 4. Origins outside production (F0 decision)

`SiteConfig.url` is the canonical origin on every deployment (canonical links, Open Graph, JSON-LD, sitemaps,
robots, editorial links): staging pages point at the production domains, which robots and protection keep out of
search. Where a browser must actually go, code calls `netOrigin(id, env)`:

| variable | scope | format | read |
|---|---|---|---|
| `NEXT_PUBLIC_NET_ORIGINS` | public | `<site>=<origin>` entries separated by commas or spaces | dev servers and staging projects; ignored when `VERCEL_ENV=production` |

- Example (dev:multi): `kpop=http://kpop.localhost:3000,anime=http://anime.localhost:3001,hub=http://hub.localhost:3002`.
- An origin is `http(s)://host[:port]` with no path and no trailing slash; `http:` only for `localhost` and
  `*.localhost`; a malformed entry throws. A site without an entry keeps its registry url.
- Users: the 302 of `/auth/passport/out`, the `client` check and redirect target of `/auth/authorize`
  (`netOrigin(client) + '/auth/land'`), signed-in cross-site links and the Open buttons of the hub, and the brand of an
  email link (`siteForOrigin(origin of redirect_to)`). The email hook runs outside Next: B7 gives it the same map in
  its own function env (`NET_ORIGINS`, same format) on branches only.
- Dev hosts must be distinct names (`kpop.localhost`, `anime.localhost`, `hub.localhost`), never one `localhost`
  with three ports: cookies ignore ports, so three sites on one host name would share their Supabase session.

## 5. Secret names

Values never enter the repo, a commit, a log, a report, a URL or the chat (rule 2). Dev values live in
`KPQ/secrets/<target>.env`, written by the owner's `fill-dev-env.sh` and sourced by `scripts/o1/env.sh`; production
values are set by the owner at launch. Unit tests use obviously fake literals built in the test.

| secret | where | same value on the three projects | use |
|---|---|---|---|
| `PASSPORT_TICKET_SECRET` | the three Vercel projects (server) | yes | MAC of the ticket and of the transaction cookie (cookies.md 1 and 2); 32 random bytes or more |
| `PASSPORT_REVALIDATE_SECRET` | the three Vercel projects (server) | yes | HMAC header of `POST /api/passport/revalidate` (apis.md) |
| `SEND_EMAIL_HOOK_SECRET` | Supabase Edge Function `send-email` (and the Auth hook setting) | n/a | signature check of the Send Email Hook (B7) |
| `RESEND_API_KEY` | Supabase Edge Function `send-email`; X1's waitlist script, owner-run | n/a | sending branded emails |
| `NET_IP_HASH_SALT` | the three Vercel projects (server) | yes | IP hash of rate limits (`/api/n/b`, authorize, redeem) and of `handoff_events` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | the anime and hub projects (public, not a secret value) | no: one Google project per site | Google Identity Services button of that site; unset on kpop (`googleClientIdEnv: null`) |

## 6. Dev hosts, ports and run variables

- `dev:multi` defaults (Q0a): kpop.localhost:3000, anime.localhost:3001, hub.localhost:3002. Lane dev servers use the
  ports of `docs/o1/ports.tsv` instead. Browsers resolve `*.localhost`; Node on macOS may not, so server-side
  scripts connect to 127.0.0.1 with a `Host` header.
- `scripts/o1/env.sh offline|scratch|dev -- <command>` sets the Supabase variables (offline: an unreachable
  127.0.0.1:9). Run variables `O1_ENV`, `O1_KPQ`, `O1_BRANCH_REF`, `O1_DB_URL`, `O1_MIGRATION_LOG` belong to the run's
  scripts: app code never reads an `O1_*` variable.
- No lane worktree has an `.env.local`.
