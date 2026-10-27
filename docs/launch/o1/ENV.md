# Environment variables (run O1, lane L1)

Three Vercel projects serve the network from the same repository (`apps/quiz`): **kpop** (kpopquiz.org, exists today),
**anime** (otakuquiz.org, new) and **hub** (fanquiz.org, new). One Supabase project serves all three. Sources: `docs/o1/contracts/flags-env.md`,
`registry.md`, and a grep of `process.env` in `apps/quiz/src`. Values are never written in the repo, a log, a commit or the chat.

Legend for "value source":
- **copy kpop**: the same value that the kpop project already has (Vercel: Settings, Environment Variables; copy it, do not retype).
- **public**: not a secret (it ends up in the browser), but still set per project.
- **secret, create**: you create the value once. Generate it so it never shows in your scrollback:
  `openssl rand -base64 48 | pbcopy`, then paste into Vercel. The same value goes into the 3 projects when the table says "same on the 3".
- **per site**: a different value for each site.

Set every variable for the **Production** environment of the project. Public variables (`NEXT_PUBLIC_*`) are baked in at build:
changing one needs a redeploy of that project. Server variables are read at run time; redeploy anyway so the check in the runbook sees them.

## 1. Vercel projects

### 1.1 Needed to build and run

| variable | kpop | anime | hub | value source |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_ID` | leave unset (means kpop) | `anime` | `hub` | public. Never set `SITE_ID` as well: two values that disagree stop the build. |
| `NEXT_PUBLIC_UX_V1` | `1` (already) | `1` | `1` | public. A non-kpop build without it fails at config load. |
| `NEXT_PUBLIC_UX_V12` | `1` (already) | `1` | `1` | public. Same. |
| `NEXT_PUBLIC_SUPABASE_URL` | already | same | same | copy kpop. One database for the network. `npm run check:env` fails the build without it. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | already | same | same | copy kpop. |
| `SUPABASE_SERVICE_ROLE_KEY` | already | same | same | copy kpop (secret). The anime and hub servers read with it (passport, hub member pages, crons). |
| `CRON_SECRET` | already | set | set | secret, create (one per project is fine, or copy kpop's). Vercel sends it as `Authorization: Bearer` to the cron routes; without it every cron answers 401 on that project. |
| `ADMIN_USER_IDS` | already | set | not needed | copy kpop. One person has one auth user id on the whole network, so your id works on anime for `/admin/review`. The hub has no admin. |

### 1.2 Flags (`flags-env.md` section 3). All off by default; every one is flipped by the runbook, never earlier.

| variable | kpop | anime | hub | value / when |
|---|---|---|---|---|
| `SITE_SCOPE` | `1` at P1 (RUNBOOK B6), after 002 is verified | `1` at project creation | `1` at project creation | `1`. Server and build. On anime and hub the scoped reads filter by site even if it is unset (fail closed); set it anyway so the three projects match. Must be on in kpop before any anime row exists. |
| `PASSPORT_JUMP` | `1` at the jump step | `1` | `1` | `1`, all three in the same batch of redeploys, after 006 and 007 are applied. |
| `NEXT_PUBLIC_NET_FOOTER` | `1` later | `1` | `1` | `1`; order in RUNBOOK step L3. Visible on kpopquiz.org. |
| `NEXT_PUBLIC_NET_MENU` | `1` later | `1` | `1` | `1`. Visible on kpopquiz.org. |
| `NEXT_PUBLIC_NET_BEACON` | `1` later | `1` | `1` | `1`. Counts clicks between sites (aggregate counters only, no identifier). |
| `NEXT_PUBLIC_NET_FACTS` | `1` later | `1` | not used | `1`, only when L11 (X1) has been applied. |
| `NET_INDEXING` | ignored (kpop is never closed) | `1` at RUNBOOK K10, last step of launch day | `1` at K10 | Server flag, read at build: unset, every page of the build answers `noindex, nofollow` (meta tag and `X-Robots-Tag` header, except `robots.txt` and `sitemap.xml`); `1` removes the header and lets each page speak for itself (`/settings`, `/me`, `/admin`, login, search, profiles keep their noindex). Redeploy after changing it. |
| `NET_LAUNCH_DATE` | ignored | `YYYY-MM-DD`, the launch date, set at RUNBOOK K10 before `NET_INDEXING` | the same date at K10 | Server value, read at build (`lib/site/indexing.ts`, kept out of the registry so the kpop bundle does not change): the network privacy policy prints "In force since <date>". With `NET_INDEXING=1` and no valid date the build fails with a message naming it, so set it first. |
| `NEXT_PUBLIC_NET_PRIVACY` | `1` at launch (kpop sign-in notice, footer "Legal notice", `/legal`) | always on (no effect) | always on (no effect) | Public, read at build: redeploy kpopquiz after setting it. Off: kpopquiz.org as today. The legal placeholders (form, SIREN, publication director) must be filled first. |
| `NEXT_PUBLIC_NET_DELETION` | `1` at launch, after SQL 18b, 016 and 19b (017) are applied and the hub cron runs | ignored | ignored | Public, read at build: KpopQuiz Settings, "Delete account" starts the passport deletion (7 days, quizzes kept unless asked). Needs no Resend sender: with no Resend key the "deletion scheduled" email is skipped (logged without any address) and the request, the cancel and the deletion still run, with the same success answer. Off: the part D contact-page text. |
| `QOTD_ROTATION_FIX` | already (kpop's own, untouched) | `1` (auto-scheduling of the anime daily, RUNBOOK J4) | leave unset | Server switch read by the cron `ensure-daily-quiz` (00:05 UTC) and by the bank `auto-schedule` route: with `1`, an empty day is filled from the next verified or scheduled bank row of the site, else a catalogue pick, and a day that stays empty makes the cron answer 500. |
| `PASSPORT_CONTINUE`, `PASSPORT_SEED` | never | never | never | Reserved for later work; they do nothing in this run. Reading one in code is a review finding, setting one is pointless. |

### 1.3 Passport secrets (same on the 3 projects)

| variable | value source | notes |
|---|---|---|
| `PASSPORT_TICKET_SECRET` | secret, create, **same on the 3** | MAC of the sign-in ticket and its cookie. 32 random bytes or more. |
| `PASSPORT_REVALIDATE_SECRET` | secret, create, **same on the 3** | HMAC header of `POST /api/passport/revalidate`. |
| `NET_IP_HASH_SALT` | secret, create, **same on the 3** | Salt for the hashed IP of rate limits and of the 90 day jump log. Changing it later only resets those limits. |

If the three values differ, the jump fails with an invalid ticket. After setting, check one value by length only (VERIFY V9).

### 1.4 Per site

| variable | kpop | anime | hub | value source |
|---|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | leave unset | set | set | public, **per site**: one Google OAuth client for each domain (RUNBOOK H4). Unset on kpop on purpose. |
| `NEXT_PUBLIC_SITE_URL` | already (kpop override) | **do not set** | **do not set** | Anime and hub take their canonical origin from the registry (`https://otakuquiz.org`, `https://fanquiz.org`). |

### 1.5 kpop only: already set, leave alone, do not copy to the new projects

`NEXT_PUBLIC_BT_TRACKING`, `VERSE_PUBLIC`, `COMMUNITY_FEATURES_ENABLED` (defaults on when unset; anime community works with it unset),
`SONGS_IS_CURATED`, `DISCORD_FLEX_WEBHOOK_URL`, `DISCORD_ALERT_WEBHOOK_URL`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN` (no Discord on the new domains, D-099), `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET`, `YOUTUBE_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_BOT_USERNAME`, `REDDIT_BOT_PASSWORD`,
`UX_P4_CHALLENGE_SECRET`, `INDEXNOW_TRIGGER_TOKEN`, `ACTIVITY_MIN_PER_HOUR` (untouched by the run). `QOTD_ROTATION_FIX` stays as it is on kpop; its meaning for kpop does not change, and the anime project sets it (1.2).
`NEXT_PUBLIC_KDRAMA` belongs to another mission and is never set by this run.

To confirm with the code lanes before launch: an anime or hub route that reads one of the kpop only variables above (for example the
anime blind test and `SPOTIFY_*` or `YOUTUBE_API_KEY`, O6 and Mission U part B). The build log and `VERIFY.md` V9 catch a missing one.

### 1.6 Must never exist in a production project

| variable | why |
|---|---|
| `DEV_LOGIN_ENABLED`, `DEV_LOGIN_EMAIL`, `DEV_LOGIN_CONTRIBUTOR_EMAIL` | development sign-in route; it also refuses when `NODE_ENV` is production, but never set it in a deployed environment |
| `NEXT_PUBLIC_NET_ORIGINS` | maps sites to localhost or staging origins; it is ignored when `VERCEL_ENV=production`, so setting it only hides a mistake |
| `SITE_ID` | alias of `NEXT_PUBLIC_SITE_ID`; two values must agree, so set only the public one |
| `NEXT_PUBLIC_NET_WELCOME` | not a flag of this run (the welcome cards were refused, D-027) |
| any `O1_*` variable (`O1_ENV`, `O1_KPQ`, `O1_BRANCH_REF`, `O1_DB_URL`, `O1_MIGRATION_LOG`, `O1_WRITE_TREE`) | run scripts and test switches; app code never reads them |
| `RECORD_BASELINE`, `PLAYLIST_TRACE` | test and trace switches |
| the dev or branch Supabase keys (`o1-dev`, `o1-scratch`) | a production project must only hold production keys; check the URL ends with the production ref |

### 1.7 IndexNow keys and organization mailboxes (decided 2026-10-23; no environment variable)

An IndexNow key is a public value (it is served as `/<key>.txt`), so it lives in the repository, not in a variable. One key of 32 hex characters per new site, generated on 2026-10-23:

| site | domain | key file (the file holds the key, no newline) | registry field |
|---|---|---|---|
| anime | otakuquiz.org | `apps/quiz/public/760f9a9459d4db0bd8a08f13a0f1ec6e.txt`, served at `https://otakuquiz.org/760f9a9459d4db0bd8a08f13a0f1ec6e.txt` | `seo.indexNowKey` of `anime` in `apps/quiz/src/lib/site/registry.ts` (set, lane L1) |
| hub | fanquiz.org | `apps/quiz/public/339dab142e51883ae3a2c7e4737254e4.txt`, served at `https://fanquiz.org/339dab142e51883ae3a2c7e4737254e4.txt` | `seo.indexNowKey` of `hub` (set, lane L1) |
| kpop | kpopquiz.org | `apps/quiz/public/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt` (as before) | `seo.indexNowKey` of `kpop` and `INDEXNOW_KEY` in `apps/quiz/src/lib/indexnow.ts` |

Each key file is a static file in `public/`, which the three builds share, so a plain build would answer all three keys on every domain. Each site answers only its own: on anime and hub `routing.ts` (`keyFileBlocksFor`, inside `rewritesFor`) sends the two foreign key files to the site's 404; on kpop the same rewrites need the small patch of `next.config.ts` in `docs/o1/requests/L1.md` (request 1), which ORCH applies before the merge. Until that patch is on `main`, kpopquiz.org also answers the two new keys (harmless: a key proves control of the host that lists it).
The only IndexNow variable is `INDEXNOW_TRIGGER_TOKEN` (kpop, 1.5). The two new keys are not secrets and need nothing in Vercel.
Organization mailbox (public value, `MAILBOX` in the registry, owner decision 2026-10-25): `hello@kpopquiz.org` for all three sites (`seo.organization.email`). It is the one routed mailbox and must receive mail before launch (RUNBOOK H5). The Team addresses `<username>@team.otakuquiz.org` must not receive mail: no MX record and no mailbox for `team.otakuquiz.org`.

## 2. Supabase

### 2.1 Edge Function `send-email` (lane B7, merged)

Postponed (owner, 2026-10-25): Resend is not configured and the Send Email hook stays off at launch, so none of the variables below is needed at launch; sign-in emails use Supabase's default sender. Keep the table for later.

| variable | value source | notes |
|---|---|---|
| `SEND_EMAIL_HOOK_SECRET` | the secret Supabase shows when you create the Send Email hook (secret) | signature check of the hook; the function refuses unsigned calls |
| `RESEND_API_KEY` | secret, from your Resend account (a key limited to sending) | sending the branded emails |
| `SEND_EMAIL_FROM_KPOP` | the sender kpopquiz.org mail uses today (required) | the function refuses kpop mail without it, so a missing sender never sends from a wrong address |
| `SEND_EMAIL_FROM_ANIME`, `SEND_EMAIL_FROM_HUB` | optional | default `OtakuQuiz <no-reply@otakuquiz.org>` and `FanQuiz <no-reply@fanquiz.org>` |
| `SEND_EMAIL_ORIGINS` | **never in production** | same syntax as `NEXT_PUBLIC_NET_ORIGINS`; staging projects only |

The deploy note is `docs/o1/b7/send-email-hook.md` (RUNBOOK section I). The `fanquiz` Vercel project may also take `RESEND_API_KEY` (and optionally
`SEND_EMAIL_FROM_HUB`) for the "your passport will be deleted" notice, later; it is not required: without them the notice is skipped (logged without any address) and the deletion still goes ahead.

### 2.2 Auth settings (dashboard, no variable)

Site URL stays `https://kpopquiz.org`. Redirect URLs gain `https://otakuquiz.org/**` and `https://fanquiz.org/**` (RUNBOOK H3). The
Send Email hook is switched on at P6. The Google provider keeps its client and gains the two new client ids in its "Client IDs" list (H4).
The Data API's exposed schemas must **not** contain `passport` (006 revokes every grant, but the setting is the second wall).
No Discord for the new domains (D-099): the Discord provider and its client stay as they are for kpopquiz.org, nothing is added for otakuquiz.org or fanquiz.org.

## 3. Owner's shell only (not a project)

| variable | use |
|---|---|
| `PROD_DB_URL` | psql connection string for the SQL steps; typed with `read -rs`, never saved |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | only for `apps/quiz/e2e/o1/L1/team-auth.mjs`, one run; `unset` them afterwards |
| `CRON_SECRET` | typed with `read -rs` for the one manual call of `/api/cron/ensure-daily-quiz` on launch day (RUNBOOK K9); `unset` it afterwards |

## 4. Checklist to print

For each of the three projects, tick: project name, Root Directory `apps/quiz` (same as kpop), same Node version and install and build
commands as kpop, region `dub1` (from `apps/quiz/vercel.json`), Production branch `main`, the variables of 1.1 to 1.4, none of 1.6,
Deployment Protection on for previews, domain attached only at launch (RUNBOOK K6).
