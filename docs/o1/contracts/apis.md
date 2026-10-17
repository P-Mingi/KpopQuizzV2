# HTTP routes (o1-contract-v1)

Every HTTP route of BACKLOG 5.1 ("Jump and auth APIs", "Network"), the new crons, and the existing shared routes the
run extends. Formats of the ticket, the transaction cookie, the code and the outcomes: `cookies.md`. Functions the
routes call: `rpcs.md`. Bodies and constants in code: `lib/passport/types.ts` (sections 2 and 3) and
`lib/network/types.ts`. Flags: `flags-env.md` 3. The URL paths and the methods are frozen (5.1); a new route on
anime or hub is a CR (5.2); no other kpop route may be added (5.3). `contract.test.ts` checks that every route of
section 1 is in the kpop route list of `routes.md` 3 or is a cron of `manifest.md`.

## 1. Index

| route | method | sites | owner | flag | section |
|---|---|---|---|---|---|
| `/auth/passport/out` | GET | kpop, anime, hub | B4 | `PASSPORT_JUMP` | 2.1 |
| `/auth/arrive` | GET | kpop, anime, hub | B4 | `PASSPORT_JUMP` | 2.2 |
| `/auth/authorize` | GET | kpop, anime, hub | B4 | `PASSPORT_JUMP` | 2.3 |
| `/auth/land` | GET | kpop, anime, hub | B4 | `PASSPORT_JUMP` | 2.4 |
| `/api/passport/redeem` | POST | kpop, anime, hub | B4 | `PASSPORT_JUMP` | 2.5 |
| `/api/passport/after-signin` | POST | anime, hub | B4 | none | 3.1 |
| `/auth/confirm` | GET | anime, hub | B7 | none | 3.2 |
| `/api/passport/revalidate` | POST | kpop, anime, hub | B4 | none | 3.3 |
| `/api/passport/delete` | POST | hub | B7 | none | 3.4 |
| `/api/passport/cancel` | POST | hub | B7 | none | 3.5 |
| `/api/passport/leave` | POST | hub | B7 | none | 3.6 |
| `/api/n/me` | GET | kpop, anime, hub | B6 | none (its callers are flagged) | 4.1 |
| `/api/n/b` | POST | kpop, anime, hub | B6 | `NEXT_PUBLIC_NET_BEACON` | 4.2 |
| `/api/cron/passport-cleanup` | GET | hub | B4 | none | 5 |
| `/api/cron/passport-deletions` | GET | hub | B7 | none | 5 |
| `/api/cron/ensure-daily-opening` | GET | anime | O6 | none | 5 |
| `/admin/network` | GET (page) | kpop | L1 | none | 7 |

Reserved, 404 on every site in the run (no handler exists): `/auth/start`, `/auth/continue` (P2). kpop keeps
`/auth/callback` and has no `/auth/confirm`.

## 1.1 Rules for every route of this file

1. **Sites.** The three builds compile every route file. A route answers 404 on a site outside its "sites" column
   (it reads `SITE.id` first), and the same 404 when its flag is off where section 2 says so.
2. **Headers.** Every `/auth/*` and `/api/passport/*` response, and `/api/n/me`: `Cache-Control: no-store` (`/api/n/me`:
   `private, no-store`) and `Referrer-Policy: no-referrer`. `/auth/authorize` and `/auth/land` add
   `Content-Security-Policy` with `frame-ancestors 'none'` (and a script nonce on `/auth/land`). `/auth/` is
   disallowed in every robots.txt.
3. **POST routes** accept `application/json` only (`/api/n/b` also `text/plain` from `navigator.sendBeacon`), a body
   of at most 2 KB, and refuse a request whose `Origin` header is present and is not this site's own origin
   (`netOrigin(SITE.id)`): 403 `{"error":"origin"}`. Session cookies are SameSite=Lax.
4. **Errors** of JSON routes are `{"error": "<code>"}` (`PassportApiError`), codes from this file only, never a message
   holding personal data. 405 for another method.
5. **Never logged or returned:** a code, a verifier, a state, a ticket, an email, a token hash. Server logs carry the
   route, the outcome and the site.
6. **Redirect targets** come from the registry (`netOrigin(site)`), never from a query parameter; `next` always goes
   through `safeReturnTo(next, '/', site)` of the site that will serve it.

## 2. The jump (P S1; BACKLOG 5.1; B4)

### 2.1 `GET /auth/passport/out?to&next&via` (on the source site)

The click endpoint of every signed-in cross-site link (`bridgeHref`). Same-origin, so no token ever sits in HTML.

| input | rule |
|---|---|
| `to` | a `SiteId` other than `SITE.id`, else 400 `bad_request` |
| `next` | `safeReturnTo(next, '/', to)` |
| `via` | kept when it matches `VIA_RE` and starts with this site's letter, else dropped |

| case | answer |
|---|---|
| `PASSPORT_JUMP` off, or the viewer is signed out here | 302 to `netOrigin(to) + next`, with `via` added as a query parameter when kept (the target's via-catcher removes it) |
| `PASSPORT_JUMP` on, viewer signed in | mint the ticket (cookies.md 1); 302 to `netOrigin(to)/auth/arrive?from=<SITE.id>&next=<next>&t=<ticket>` plus `&via=<via>` when kept |

It counts nothing (the `click` beacon of NetLink is the only click counter; F0 decision 62) and logs nothing.

### 2.2 `GET /auth/arrive?from&next&t[&via]` (on the target, the relying party)

`next` is first checked with `safeReturnTo(next, '/')`; every case below that does not bounce ends with a 302 to it,
signed out, with no error screen.

| case | answer | logged |
|---|---|---|
| `PASSPORT_JUMP` off | 302 to `next` | nothing |
| a `mode` parameter (P3a `seed` is reserved) | 302 to `next` | `bad_ticket` |
| the viewer is already signed in here (any user) | 302 to `next`; never switches account | nothing |
| no `t` | 302 to `next` (crawlers write nothing) | nothing |
| `t` fails cookies.md 1 (MAC, `v`, `to === SITE.id`, `from` equal to the `from` parameter, `exp`, `next` equal to the parameter) | 302 to `next` | `bad_ticket` |
| valid | set the transaction cookie (cookies.md 2: state, verifier, next, from, via, iat); 302 to `netOrigin(from)/auth/authorize?client=<SITE.id>&state=<state>&code_challenge=<b64u(SHA256(verifier))>&method=S256&prompt=none` | nothing |

### 2.3 `GET /auth/authorize?client&state&code_challenge&method=S256&prompt=none` (on the identity provider)

| case | answer | logged by |
|---|---|---|
| `PASSPORT_JUMP` off | 404 | |
| `prompt` other than `none` (`select` is reserved for P2), `method` other than `S256`, `code_challenge` not `B64U_32_RE`, `state` not `B64U_16_RE`, `client` not a `SiteId` other than `SITE.id` | 400 (plain text, no redirect) | |
| no session here | 302 to `<target>#error=login_required&state=<state>` | route: `login_required` |
| the IP hash is over its limit | 302 to `<target>#error=login_required&state=<state>` | route: `rate_limited` |
| session | code = 32 random bytes; `passport_issue_code(user, SITE.id, client, sha256hex(code), code_challenge, null, ip_hash, ua_family)`; `issued`: 302 to `<target>#code=<code>&state=<state>`; any refusal: 302 to `<target>#error=login_required&state=<state>` | the function |

`<target>` is always `netOrigin(client) + '/auth/land'`. The relying party never learns why a code was refused.

### 2.4 `GET /auth/land` (on the relying party)

`PASSPORT_JUMP` off: 404. Otherwise 200, a tiny static HTML page: no layout, no analytics, no third-party script, a
CSP nonce, `frame-ancestors 'none'`, `no-store`, `no-referrer`. Its only script, before anything else:

1. reads `location.hash`, then `history.replaceState(null, '', '/auth/land')`;
2. with `code` and `state`: `POST /api/passport/redeem {code, state}`; with `error=login_required` and `state`:
   `POST /api/passport/redeem {error: "login_required", state}` (so the server clears the cookie); with neither:
   `location.replace('/')`;
3. `location.replace(body.next)` with the `next` of the answer, whatever its status (`'/'` if the request failed).

### 2.5 `POST /api/passport/redeem` (on the relying party)

Body `RedeemRequest`: `{code, state}`, or `{error: "login_required", state}` from the land page. Answers 200
`RedeemResponse {next}` after a sign-in, and `RedeemFailure {error, next}` with status 400 (429 for a rate limit)
otherwise; `next` is the cookie's `next`, or `'/'` without a valid cookie. The transaction cookie is cleared
(Max-Age=0) on every answer.

| step | failure answer | logged |
|---|---|---|
| `PASSPORT_JUMP` on (else 404); Origin rule 1.1.3 | 404, 403 | |
| the cookie exists, its MAC is valid, `iat + 300 > now`, its `state` equals the body's | 400 `state_mismatch` (past 300 s: `expired`) | `state_mismatch` or `expired` |
| the body is the land page's error | 400 `login_required` | nothing (the identity provider logged it) |
| the IP hash is under its limit | 429 `rate_limited` | `rate_limited` |
| `code` matches `B64U_32_RE` | 400 `expired` | `expired` |
| `passport_redeem_code(sha256hex(code), SITE.id, b64u(SHA256(cookie.verifier)), cookie.via, ip_hash, ua_family)` | 400 with the outcome (`pkce_fail`, `replay`, `expired`) | the function |
| `redeemed`, and a session already exists here: same user, 200 `{next}`; another user, 409 `other_user` (never a silent switch) | 409 `other_user` | |
| `redeemed`: `auth.admin.generateLink({type: 'magiclink', email})` (no email is sent), then `verifyOtp({type: 'email', token_hash})` with the server client, which sets this site's session cookies | 400 `expired` on an Auth error | |
| `ensure_membership(SITE.id, 'jump', cookie.via)` with the new session; a `join` counter when it created the row with a `via` | (a failure here keeps the session and still answers 200) | |

## 3. Sign-in, confirmation, account (B4, B7)

### 3.1 `POST /api/passport/after-signin` (anime, hub; 404 on kpop)

Called by the sign-in UI of anime and hub after a native sign-in in the browser (Google ID token, P S3). Body
`AfterSigninRequest {next, via}`; 401 `unauthenticated` without a session. `next` through `safeReturnTo`; `via` kept
when it matches `VIA_RE`. Without a profile: 200 `{next, needsUsername: true}` (the client goes to
`/onboarding?returnTo=<next>`, where `create_profile_for_site` creates the profile and the membership with the
`via`). With one: `ensure_membership(SITE.id, 'signup', via)` (a `join` counter when created with a `via`), then
200 `{next, needsUsername: false}`. A banned profile: the session is signed out and 403 `banned`.

### 3.2 `GET /auth/confirm?token_hash&type&next` (anime, hub; 404 on kpop, which keeps `/auth/callback`)

The landing of every email link of anime and hub (P S4; registry `auth.emailLanding`). `type` in `email`,
`magiclink`, `signup`, `email_change`; `next` through `safeReturnTo(next, '/')`. `verifyOtp({token_hash, type})`; on
success the same branches as today's `/auth/callback`: no profile, 302 `/onboarding?returnTo=<next>`; banned, sign
out and 302 `/login`; else `ensure_membership(SITE.id, 'signup', null)` and 302 to `next`. Any failure (missing
parameter, unknown type, expired or used link): 302 `/login`. The URL holds no session after the redirect.

### 3.3 `POST /api/passport/revalidate` (every site)

Purges this site's cached `/u/{username}` page (its internal path on anime and hub) after a visibility change, a
rename or a deletion. Server to server: the site where the change happened posts to `netOrigin(s) +
'/api/passport/revalidate'` for every `s` in `sites` (itself included), with a 3 s timeout, and never waits for it
in a user request.

- Body `RevalidateRequest {username, sites}`; header `x-passport-signature: b64u(HMAC(PASSPORT_REVALIDATE_SECRET,
  "pp-revalidate.v1." + raw body))`, compared in constant time on the raw body.
- 401 `signature` on a missing or wrong signature; 400 `bad_request` on a bad body (username not
  `^[a-z0-9_]{3,20}$`, unknown site); 204 after the purge, or when `SITE.id` is not in `sites`.
- A replay only purges a cache again; no timestamp is part of the body (5.1 freezes it).

### 3.4 `POST /api/passport/delete` (hub)

"Delete my passport" (P S6, W4). Body `DeleteRequest {keepQuizzes, confirm}`. 401 `unauthenticated`; 403 `reauth`
when the last sign-in is older than `PASSPORT_SECONDS.freshSignIn` (600 s); 400 `confirm` when `confirm` is not
`@<username>`. Then `passport_request_deletion(user, SITE.id, keepQuizzes)`, a global sign-out of the user, the
neutral notice email (B7), revalidate (3.3) on every site of the member; 200 `DeleteResponse {runAfter}`.

### 3.5 `POST /api/passport/cancel` (hub)

No body. 401 `unauthenticated`; then `passport_cancel_deletion(user)`; 200 `CancelResponse {cancelled}` (false when
nothing was pending).

### 3.6 `POST /api/passport/leave` (hub)

"Leave a world" (P S6). Body `LeaveRequest {site, keepQuizzes, confirm}`, `site` a world site other than kpop where
the viewer is a member. 401 `unauthenticated`; 403 `reauth` (as 3.4); 400 `confirm`; 409 `last_world` when no other
world membership would remain. Then `passport_leave_world(user, site, false, keepQuizzes)` and revalidate on every
site of the member; 200 `LeaveResponse {counts}`.

Sign-out has no route: the sign-out library of anime and hub (B7) calls `supabase.auth.signOut({scope})` with the
scopes of the registry's `auth.signOutModes`; kpop's button is untouched.

## 4. Network (Q D0; B6)

### 4.1 `GET /api/n/me` (every site)

200 `NetMe` (lib/network/types.ts) for the signed-in viewer, built from `my_passport()` and the viewer's
`passport_prefs` row (defaults when there is none); `Cache-Control: private, no-store`. 401 `unauthenticated` for a
guest. Called only by client islands, after hydration, so the server HTML of every page stays the same for every
visitor; never called by server code that renders a public page.

### 4.2 `POST /api/n/b` (every site)

Body `NetBeacon {dst, bridge, step}` (JSON, or the text body of `navigator.sendBeacon`), `step` in
`NET_BEACON_STEPS`. Always 204 except 400 `bad_request` on an invalid body and 403 `origin`. With
`NEXT_PUBLIC_NET_BEACON` off, or over the per-IP-hash limit (B6 sets the value; a change needs no CR), it counts
nothing. Otherwise `net_bridge_bump(src, dst, bridge, step, signed_in)` with `(src, dst)` as `NetBeacon` says (the
other site of the pair is `dst`; for `land` the row is `(dst, SITE.id)`), `signed_in` from the session. No user id,
anon id or IP is stored.

## 5. Crons (`manifest.md`, cron table)

Every cron route: `GET`, `isCronAuthorized` (Bearer `CRON_SECRET`, today's `lib/cron-auth.ts`) else 401; then
`cronForSite([...])`, which answers 200 `{"skipped": true}` on a site outside the list; then the work and 200 with
counts only.

| route | sites | work | 200 body |
|---|---|---|---|
| `/api/cron/passport-cleanup` | hub | `passport_cleanup()` | `{codesDeleted, eventsDeleted}` |
| `/api/cron/passport-deletions` | hub | for each due request (`run_after` passed, not cancelled, not completed): `passport_run_deletion(user, false)`, then `auth.admin.deleteUser(user)`, then revalidate (3.3) | `{processed, failed}` |
| `/api/cron/ensure-daily-opening` | anime | `ensure_daily_opening(<UTC date>, 'anime')` | `{themeId}` (null when no theme qualifies) |
| `/api/cron/ensure-daily-quiz` (exists) | kpop, anime | B5: `ensure_daily_quiz_v2(<date>, SITE.id)`; the kpop answer stays today's | today's |
| `/api/cron/editorial-publish` (exists) | kpop, anime | E1b: per-site cadence; kpop unchanged | today's |

## 6. Existing shared routes the run extends (kpop answers unchanged)

The anime and hub twins of today's pages call today's API routes (rule 18: the twin's own route, never a new one).
These four routes need a non-kpop branch and have no owner in `OWNERSHIP.json` yet (request F0-12). F0 decision 67.

| route | non-kpop branch |
|---|---|
| `POST /api/auth/create-profile` | on anime and hub: `create_profile_for_site(username, SITE.id, avatar_bg, avatar_text, 'signup', via)`; the body gains an optional `via` (`VIA_RE`, else ignored); kpop's insert is unchanged |
| `POST /api/passport/merge-anon` | passes `p_site: SITE.id` to `merge_anon_passport` on anime; kpop's call is unchanged (no `p_site`) |
| `POST /api/follow` | on anime: `world_follows` (site `anime`) instead of today's follows, refusing a Team account as the followed or the follower (RUN-4); kpop unchanged |
| `POST /api/quiz/[id]/report` | on anime: the reason `spoiler` is accepted and goes to `report_spoiler(quiz id)`; the other reasons as today; kpop's reason list unchanged |

## 7. Pages in the kpop route set

`/admin/network` (L1): the network dashboard of Q 8.4 (`docs/network/dashboard.sql`), behind today's admin check
(`ADMIN_USER_IDS`), noindex, counts under 5 shown as "under 5". It is a kpop page under today's `/admin` prefix
(routes.md 3).
