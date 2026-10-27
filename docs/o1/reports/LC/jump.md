# Lot (c) part 2, lane B3: the passport jump, end to end on o1-scratch

Spec: `apps/quiz/e2e/o1/B3/jump.o1.ts` (Playwright, project `lanes`). Branch o1/B3. Database: o1-scratch only.
No secret, ticket, code, state, verifier, email or URL with a query or fragment appears below.

## Setup

- Two `next dev` servers from `scripts/o1/dev-multi.sh scratch --sites kpop,anime`: kpop on `http://kpop.localhost:3103`,
  anime on `http://anime.localhost:3104` (lane B3 ports). Both built from the same tree, `NEXT_PUBLIC_SITE_ID` per site.
- Flags and secrets set for the run only, in the shell that started the servers: `PASSPORT_JUMP=1`, a random
  `PASSPORT_TICKET_SECRET` (same value on both servers), a random `NET_IP_HASH_SALT`, and `NEXT_PUBLIC_NET_ORIGINS`
  naming the two local origins. Nothing was written to a file or to git; the servers were stopped afterwards.
- Fixture account: a fresh confirmed user (`o1-b3-jump-<stamp>@example.com`) with a profile, made with the service role
  of o1-scratch; the profile trigger gave it its kpop membership. Signed in on the kpop server by writing the session
  cookies `@supabase/ssr` produces, on the kpop host only. It has no anime membership before the jump (checked).

## Outcome

Test 1 (signed in on kpop): passed. The browser followed `/auth/passport/out?to=anime&next=/&via=k.menu` on the kpop
server and ended on the anime home, signed in there (`/api/auth/me` on the anime server returns the fixture's username).

Chain of requests the browser made to the two servers, query and fragment stripped:

```
GET  kpop.localhost:3103   /auth/passport/out       302 to the anime /auth/arrive (ticket in the query)
GET  anime.localhost:3104  /auth/arrive             302 to the kpop /auth/authorize (sets the transaction cookie)
GET  kpop.localhost:3103   /auth/authorize          302 to the anime /auth/land#code=...&state=... (fragment)
GET  anime.localhost:3104  /auth/land               200 tiny page, nonce CSP, posts the fragment
POST anime.localhost:3104  /api/passport/redeem     200 {next}, session cookie set, transaction cookie cleared
```

No request line ever held `code=` (checked on every request of the page).

Test 2 (signed out on kpop): passed. The same link goes straight to the anime home with `via` in the address; no arrive,
authorize, land or redeem request; no session or transaction cookie on either host; `/api/auth/me` on anime returns no profile.

## Rows after the jump (world_memberships of the fixture)

| site_id | joined_via | via_code | activated_at | xp |
|---|---|---|---|---|
| anime | jump | k.menu | null (a stamp is activated by the first counted action) | null |
| kpop | signup | null | set | null (kpop progression stays on profiles) |

A second jump by the same, already signed-in user created no second row (arrive sends a signed-in visitor to `next`).

## Event log (passport.handoff_events of the fixture)

| outcome | from | to | via_code | ua_family | ip hashed |
|---|---|---|---|---|---|
| issued | kpop | anime | none | chrome | yes |
| redeemed | kpop | anime | k.menu | chrome | yes |

The one-time code was consumed (`used_at` set). Rows hold sites, via, a salted address hash and a browser family only.

## Cookies seen on the wire (values removed)

```
anime  pp_tx=<v>; Path=/; Expires=<now+300 s>; Max-Age=300; HttpOnly; SameSite=lax            (set by arrive)
anime  pp_tx=<v>; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=lax       (cleared by redeem)
anime  sb-<ref>-auth-token=<v>; Path=/; Expires=<+400 days>; Max-Age=34560000; SameSite=lax    (the anime session)
```

No `Domain` attribute on any Set-Cookie of the two servers; every cookie in the browser jar belongs to exactly one of
`kpop.localhost` or `anime.localhost`; the anime session cookie exists only on the anime host; `pp_tx` is gone after redeem.
Name per protocol: `pp_tx` here because the requests are http on a `*.localhost` host (`__Host-pp_tx` with Secure on https,
proved by the unit tests).

## Findings during the run (fixed in the code, then green)

1. The clearing cookie lost its `Max-Age=0` on the wire: when a response also carries the session cookies that
   `@supabase/ssr` writes through `next/headers`, Next re-serialises the cookies and drops a zero `Max-Age`. The cookie then
   stayed in the jar as an empty value. The clearing cookie now carries an `Expires` in 1970 as well (`txCookieAttributes`
   with `maxAge` 0), which deletes it. The header on the wire is `Expires=Thu, 01 Jan 1970`, without `Max-Age=0`.
2. A same-site redirect built from `request.url` went to `http://localhost:3104/` on the dev server (Next dev does not
   put the Host header into `request.url`). The redirects that end on `next` are now a relative `Location: /path`, which the
   browser resolves against the address it asked. Cross-site redirects use `netOrigin(site)` and were never affected.

## Not done in this lot

- The redeem-side `rate_limited` (429, apis.md 2.5): no function counts redeem attempts per address hash; the identity
  site's limit (60 codes per address hash per hour, inside `passport_issue_code`) is the only one in force.
- `other_user` (409) is answered but not logged: it is not a `passport.handoff_events` outcome (a new outcome is a CR).
