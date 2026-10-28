# Environment variables (run O1, FandomVerse)

Three Vercel projects serve the network from the same repository (`apps/quiz`):
- **kpopquiz**: kpopquiz.org (site `kpop`), exists today, stays as it is.
- **fandomverse**: the FandomVerse hub (site `hub`) at `https://fandomverse.org`. Renamed from `fanquiz` on 2026-10-28. It alone carries the domain.
- **otakuquiz**: OtakuQuiz (site `anime`) at `https://fandomverse.org/anime`, reached through the Microfrontends group `fandomverse` (RUNBOOK H7). No domain of its own.

One Supabase project serves all three. Sources: `docs/o1/contracts/flags-env.md`, the registry (`apps/quiz/src/lib/site/registry.ts`), and a grep of `process.env` in `apps/quiz/src`.
Variables that the sub-folder layout itself may add are listed by the code lanes in ARCHITECTURE-FANDOMVERSE.md (this folder, once merged); none is assumed here.
Values are never written in the repo, a log, a commit or the chat.

Legend for "value source" and "state":
- **copy kpopquiz**: the same value that the `kpopquiz` project already has.
- **public**: not a secret (it ends up in the browser), but still set per project.
- **secret, create**: a value created once (`openssl rand -base64 48 | pbcopy`, then paste, so it never shows in your scrollback). "Same on the 3" means one value in the three projects.
- **set 2026-10-28 by the integrator**: set today with the Vercel CLI (owner exception), Production environment. Confirmed by the integrator on 2026-10-28: the shared secrets were checked by length and fingerprint on the 3 projects, never by value.
- **owner, RUNBOOK Xn**: you set it at that step.

Environment: every variable below is for **Production**. Preview keeps the `o1-dev` values set for `o1/integration` (removed after launch, RUNBOOK "After launch"); never put a production secret in Preview.
Public variables (`NEXT_PUBLIC_*`) are baked in at build: changing one needs a redeploy of that project. Server variables are read at run time; redeploy anyway so the check in the runbook sees them.

## 1. Vercel projects

### 1.1 Needed to build and run

| variable | kpopquiz | fandomverse | otakuquiz | value source |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_ID` | leave unset (means kpop) | `hub`, set 2026-10-28 by the integrator | `anime`, set 2026-10-28 by the integrator | public. Never set `SITE_ID` as well: two values that disagree stop the build. |
| `NEXT_PUBLIC_UX_V1` | `1` (already) | `1`, set 2026-10-28 by the integrator | `1`, set 2026-10-28 by the integrator | public. A non-kpop build without it fails at config load. |
| `NEXT_PUBLIC_UX_V12` | `1` (already) | `1`, set 2026-10-28 by the integrator | `1`, set 2026-10-28 by the integrator | public. Same. |
| `NEXT_PUBLIC_SUPABASE_URL` | already | same, set 2026-10-28 by the integrator | same, set 2026-10-28 by the integrator | copy kpopquiz. One database for the network. `npm run check:env` fails the build without it. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | already | same, set 2026-10-28 by the integrator | same, set 2026-10-28 by the integrator | copy kpopquiz. |
| `SUPABASE_SERVICE_ROLE_KEY` | already (its own project variable) | team shared variable, owner, RUNBOOK H3 | team shared variable, owner, RUNBOOK H3 | secret: Supabase, Project Settings, API Keys, `service_role`. One team shared variable, Sensitive, Production only, linked to the three projects; if Vercel refuses `kpopquiz` because it has its own (same value), kpopquiz keeps its own. The hub and anime servers read with it (passport, hub member pages, crons). |
| `CRON_SECRET` | already | set 2026-10-28 by the integrator | set 2026-10-28 by the integrator | secret, create. Vercel sends it as `Authorization: Bearer` to the cron routes; without it every cron answers 401 on that project. You do not need its value: a cron is run by hand from Vercel, the project, Settings, Cron Jobs, Run. |
| `ADMIN_USER_IDS` | already | not needed (the hub has no admin) | set 2026-10-28 by the integrator | copy kpopquiz. One person has one auth user id on the whole network, so your id works on `/anime/admin`. |

### 1.2 Flags (`flags-env.md` section 3). All off by default; the runbook turns each on at its step, never earlier.

| variable | kpopquiz | fandomverse | otakuquiz | value / when |
|---|---|---|---|---|
| `SITE_SCOPE` | `1`, owner, RUNBOOK B6, after 002 is verified | `1`, set 2026-10-28 by the integrator | `1`, set 2026-10-28 by the integrator | `1`. Server and build. On anime and hub the scoped reads filter by site even if it is unset (fail closed); it is set anyway so the three projects match. Must be on in kpopquiz before any anime row exists. |
| `PASSPORT_JUMP` | `1`, owner, RUNBOOK K7 | `1`, K7 | `1`, K7 | `1`, all three in the same batch of redeploys, after 006 and 007 are applied and the domain is live. |
| `NEXT_PUBLIC_NET_FOOTER` | `1`, owner, RUNBOOK L3 step 1 | `1`, L3 | `1`, L3 | `1`. Visible on kpopquiz.org. |
| `NEXT_PUBLIC_NET_MENU` | `1`, L3 step 2 | `1` | `1` | `1`. Visible on kpopquiz.org. |
| `NEXT_PUBLIC_NET_BEACON` | `1`, L3 step 3 | `1` | `1` | `1`. Counts clicks between sites (aggregate counters only, no identifier). |
| `NEXT_PUBLIC_NET_FACTS` | `1` later | not used | `1` later | `1`, only when L11 (X1) has been applied (after launch). |
| `NET_INDEXING` | ignored (kpop is never closed) | `1`, owner, RUNBOOK K10, last step of launch day | `1`, K10 | Server flag, read at build: unset, every page of the build answers `noindex, nofollow` (meta tag and `X-Robots-Tag` header, except `robots.txt` and `sitemap.xml`); `1` removes the header and lets each page speak for itself (`/settings`, `/me`, `/admin`, login, search, profiles keep their noindex). Redeploy after changing it. |
| `NET_LAUNCH_DATE` | ignored | `YYYY-MM-DD`, the launch date, owner, K10, before `NET_INDEXING` | the same date, K10 | Server value, read at build (`apps/quiz/src/lib/site/indexing.ts`): the network privacy policy prints "In force since <date>". With `NET_INDEXING=1` and no valid date the build fails with a message naming it, so set it first. |
| `NEXT_PUBLIC_NET_PRIVACY` | `1`, owner, RUNBOOK L3b | always on (no effect) | always on (no effect) | Public, read at build: redeploy kpopquiz after setting it. Off: kpopquiz.org as today. |
| `NEXT_PUBLIC_NET_DELETION` | `1`, owner, RUNBOOK L3b, after SQL 18b, 016 and 19b (017) are applied and the `passport-deletions` cron runs on `fandomverse` | ignored | ignored | Public, read at build: KpopQuiz Settings, "Delete account" starts the passport deletion (7 days, quizzes kept unless asked). Needs no Resend sender: with no Resend key the "deletion scheduled" email is skipped (logged without any address) and the request, the cancel and the deletion still run. Off: the part D contact-page text. |
| `QOTD_ROTATION_FIX` | already (kpop's own, untouched) | leave unset | `1`, set 2026-10-28 by the integrator | Server switch read by the cron `ensure-daily-quiz` (00:05 UTC) and by the bank `auto-schedule` route: with `1`, an empty day is filled from the next verified or scheduled bank row of the site, else a catalogue pick, and a day that stays empty makes the cron answer 500 (RUNBOOK J4). |
| `PASSPORT_CONTINUE`, `PASSPORT_SEED` | never | never | never | Reserved for later work; they do nothing in this run. |

### 1.3 Passport secrets (same on the 3 projects): set 2026-10-28 by the integrator

| variable | value source | notes |
|---|---|---|
| `PASSPORT_TICKET_SECRET` | secret, create, **same on the 3**; set 2026-10-28 by the integrator in Production of `kpopquiz`, `fandomverse`, `otakuquiz` | MAC of the sign-in ticket and its cookie. 32 random bytes or more. |
| `PASSPORT_REVALIDATE_SECRET` | the same, **same on the 3** | HMAC header of `POST /api/passport/revalidate`. |
| `NET_IP_HASH_SALT` | the same, **same on the 3** | Salt for the hashed IP of rate limits and of the 90 day jump log. Changing it later only resets those limits. |

If the three values differ, the jump fails with an invalid ticket. Check by length only (VERIFY V9); when Vercel hides the value (Sensitive), the jump test of RUNBOOK K7 is the check.
The hub and `/anime` share one origin, so they share the session cookie directly; the ticket is only for the jump between kpopquiz.org and fandomverse.org.

### 1.4 Per site

| variable | kpopquiz | fandomverse | otakuquiz | value source |
|---|---|---|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | leave unset | **do not set** | **do not set** | unread: fandomverse.org signs in through Supabase's Google redirect with the kpopquiz.org client (AUTH-FANDOMVERSE.md). |
| `NEXT_PUBLIC_SITE_URL` | already (kpop override) | **never set** | **never set** | The hub and OtakuQuiz take their canonical origin from the registry (`https://fandomverse.org`, and `/anime` for OtakuQuiz). |

### 1.5 kpopquiz only: already set, leave alone, do not copy to the new projects

`NEXT_PUBLIC_BT_TRACKING`, `VERSE_PUBLIC`, `COMMUNITY_FEATURES_ENABLED` (defaults on when unset; anime community works with it unset),
`SONGS_IS_CURATED`, `DISCORD_FLEX_WEBHOOK_URL`, `DISCORD_ALERT_WEBHOOK_URL`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN` (the kpop Discord bot and webhooks; Discord sign-in needs none of them), `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET`, `YOUTUBE_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_BOT_USERNAME`, `REDDIT_BOT_PASSWORD`,
`UX_P4_CHALLENGE_SECRET`, `INDEXNOW_TRIGGER_TOKEN`, `ACTIVITY_MIN_PER_HOUR` (untouched by the run). `QOTD_ROTATION_FIX` stays as it is on kpopquiz; its meaning for kpop does not change, and `otakuquiz` sets its own (1.2).
`NEXT_PUBLIC_KDRAMA` belongs to another mission and is never set by this run.

To confirm with the code lanes before launch: a hub or anime route that reads one of the kpop only variables above (for example the
anime blind test and `SPOTIFY_*` or `YOUTUBE_API_KEY`, O6 and Mission U part B). The build log and `VERIFY.md` V9 catch a missing one.

### 1.6 Must never exist in a production project

| variable | why |
|---|---|
| `DEV_LOGIN_ENABLED`, `DEV_LOGIN_EMAIL`, `DEV_LOGIN_CONTRIBUTOR_EMAIL` | development sign-in route; it also refuses when `NODE_ENV` is production, but never set it in a deployed environment |
| `NEXT_PUBLIC_NET_ORIGINS` | maps sites to localhost or staging origins; it is ignored when `VERCEL_ENV=production`, so setting it only hides a mistake |
| `NEXT_PUBLIC_SITE_URL` on `fandomverse` or `otakuquiz` | the canonical comes from the registry; an override would send canonicals, sitemaps and JSON-LD to another origin |
| `SITE_ID` | alias of `NEXT_PUBLIC_SITE_ID`; two values must agree, so set only the public one |
| `NEXT_PUBLIC_NET_WELCOME` | not a flag of this run (the welcome cards were refused, D-027) |
| any `O1_*` variable (`O1_ENV`, `O1_KPQ`, `O1_BRANCH_REF`, `O1_DB_URL`, `O1_MIGRATION_LOG`, `O1_WRITE_TREE`) | run scripts and test switches; app code never reads them |
| `RECORD_BASELINE`, `PLAYLIST_TRACE` | test and trace switches |
| `AUTH_FIXTURE_CONFIRM` | test switch (lane 3, 2026-10-28): opens `/auth/confirm` of the hub and anime on a preview for the fixture links of `scripts/o1-tools/signin-link.sh --vercel`; set it on the Preview environment only. The route refuses on `VERCEL_ENV=production` anyway, and stays closed on a deployed preview without it |
| the dev or branch Supabase keys (`o1-dev`, `o1-scratch`) | a production project must only hold production keys; check the URL ends with the production ref |

### 1.7 IndexNow keys, mailboxes, Team addresses (no environment variable)

An IndexNow key is a public value served as `/<key>.txt` at the root of a host, so it lives in the repository, not in a variable.
fandomverse.org is one host for the hub and `/anime`, so one key serves both. Two keys were generated on 2026-10-23 for the old two domains; their files exist:
`apps/quiz/public/760f9a9459d4db0bd8a08f13a0f1ec6e.txt` (was anime's) and `apps/quiz/public/339dab142e51883ae3a2c7e4737254e4.txt` (was the hub's). Which key fandomverse.org serves is the code lanes' choice (ARCHITECTURE-FANDOMVERSE.md).

| host | key | registry field |
|---|---|---|
| kpopquiz.org | `apps/quiz/public/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt` (as before) | `seo.indexNowKey` of `kpop` and `INDEXNOW_KEY` in `apps/quiz/src/lib/indexnow.ts` |
| fandomverse.org (hub and `/anime`) | `<<FROM INTEGRATOR>>` | `seo.indexNowKey` of `hub` and `anime` in `apps/quiz/src/lib/site/registry.ts` |

Each key file is a static file in `public/`, which the three builds share. Each host must answer only its own key: the hub and anime builds block foreign key files in `apps/quiz/src/lib/site/routing.ts` (`keyFileBlocksFor`, inside `rewritesFor`); kpop needs the small patch of `next.config.ts` in `docs/o1/requests/L1.md` (request 1). RUNBOOK K10 checks it.
The only IndexNow variable is `INDEXNOW_TRIGGER_TOKEN` (kpopquiz, 1.5).
Organization mailbox (public value, `MAILBOX` in the registry, owner decision 2026-10-25): `hello@kpopquiz.org` for all three sites (`seo.organization.email`). It is the one routed mailbox (RUNBOOK H6).
Team accounts: `<username>@team.fandomverse.org` (owner, 2026-10-28). That sub-domain must not receive mail: no MX record and no mailbox for `team.fandomverse.org`.

## 2. Supabase

### 2.1 Edge Function `send-email` (lane B7, merged)

Postponed (owner, 2026-10-25): Resend is not configured and the Send Email hook stays off at launch, so none of the variables below is needed at launch; sign-in emails use Supabase's default sender.
fandomverse.org offers no email sign-in (owner, 2026-10-28): the hook would serve kpopquiz.org mail and the hub's deletion notice. Keep the table for later.

| variable | value source | notes |
|---|---|---|
| `SEND_EMAIL_HOOK_SECRET` | the secret Supabase shows when you create the Send Email hook (secret) | signature check of the hook; the function refuses unsigned calls |
| `RESEND_API_KEY` | secret, from your Resend account (a key limited to sending) | sending the branded emails |
| `SEND_EMAIL_FROM_KPOP` | the sender kpopquiz.org mail uses today (required) | the function refuses kpop mail without it, so a missing sender never sends from a wrong address |
| `SEND_EMAIL_FROM_ANIME`, `SEND_EMAIL_FROM_HUB` | a fandomverse.org sender, when you enable the hook | on 2026-10-28 the built-in defaults name the old domains (`otakuquiz.org`, `fanquiz.org`); set both so no mail names a domain you do not own |
| `SEND_EMAIL_ORIGINS` | **never in production** | same syntax as `NEXT_PUBLIC_NET_ORIGINS`; staging projects only |

The deploy note is `docs/o1/b7/send-email-hook.md` (RUNBOOK section I). The `fandomverse` Vercel project may also take `RESEND_API_KEY` (and `SEND_EMAIL_FROM_HUB`) for the "your passport will be deleted" notice, later; it is not required: without them the notice is skipped (logged without any address) and the deletion still goes ahead.

### 2.2 Auth settings (dashboard, no variable)

Site URL stays `https://kpopquiz.org`. Redirect URLs gain exactly `https://fandomverse.org/auth/callback**` and `https://fandomverse.org/anime/auth/callback**` (RUNBOOK H4), never a wider `https://fandomverse.org/**` (AUTH-FANDOMVERSE.md: only the callbacks may receive a session); `https://otakuquiz.org/**` and `https://fanquiz.org/**` are not needed (remove them if you added them).
Google provider: the kpopquiz.org client serves fandomverse.org too; nothing is added to its "Client IDs" list (RUNBOOK H5). Discord provider: as it is for kpopquiz.org; nothing is added.
Email sign-in is not offered on fandomverse.org (code, lane 3); the email provider stays on for kpopquiz.org. The Send Email hook stays off (2.1).
The Data API's exposed schemas must **not** contain `passport` (006 revokes every grant, but the setting is the second wall).

## 3. Owner's shell only (not a project)

| variable | use |
|---|---|
| `PROD_DB_URL` | psql connection string for the SQL steps; typed with `read -rs`, never saved |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | only for `apps/quiz/e2e/o1/L1/team-auth.mjs`, one run (RUNBOOK K4); the key is read with `read -rs`; `unset` both afterwards |
| `PROMOTE_TARGET_SERVICE_KEY`, `PROMOTE_TARGET_URL` | only for `scripts/anime/images/promote.mjs` (RUNBOOK K5.3c); the key is read with `read -rs`; `unset` both afterwards |
| `CRON_SECRET` | only if you call a cron with `curl` instead of the Vercel "Run" button (RUNBOOK K9); read with `read -rs`; `unset` it afterwards |

## 4. Checklist to print

For each of the three projects (`kpopquiz`, `fandomverse`, `otakuquiz`), tick: project name, Root Directory `apps/quiz`, same Node version and install and build
commands as `kpopquiz`, region `dub1` (from `apps/quiz/vercel.json`), Production branch `main`, the variables of 1.1 to 1.4 in Production, none of 1.6,
Deployment Protection on for previews.
For `fandomverse` and `otakuquiz`: both in the Microfrontends group `fandomverse`, `fandomverse` as default application (RUNBOOK H7).
Domains: `fandomverse.org` and `www.fandomverse.org` (redirect to the apex) on `fandomverse` only, attached on launch day (RUNBOOK K6); `otakuquiz` never has a domain; `kpopquiz` keeps `kpopquiz.org`.
