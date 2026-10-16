# Cookies, tickets, codes and client storage (o1-contract-v1)

The cookie and ticket formats are never extendable inside the run (BACKLOG 5.3); new `handoff_events` outcomes are
(5.2). Sources: BACKLOG 5.1 ("Jump and auth APIs"), lane card B4; P 6.2, 6.3, 6.4 (S1, S5, S7), 6.6; Q 2.5 and D0.
The routes that use these formats are in `apis.md`; the tables and functions in `schema.sql` and `rpcs.md`.

Common encoding: `b64u(x)` is base64url without padding (RFC 4648 section 5). `HMAC(k, m)` is HMAC-SHA256.
`SHA256(x)` is over the UTF-8 bytes of the string. Every comparison of a MAC, a hash or a state is constant-time.
Every random value comes from a CSPRNG (`crypto.getRandomValues` or `crypto.randomBytes`).

## 1. The jump ticket (non-secret, no identity)

```
ticket  = p + "." + s
p       = b64u(JSON {"v":1,"from":<SiteId>,"to":<SiteId>,"next":<path>,"exp":<unix seconds>})
s       = b64u(HMAC(PASSPORT_TICKET_SECRET, "pp-ticket.v1." + p))
```

- Minted by the source site's `/auth/passport/out` at click time, server side, only for a signed-in viewer. It is
  never rendered in HTML, never in a page URL of the source site, never in analytics (Q 2.5).
- `exp` = mint time + 600 (10 minutes). `from` is the minting site, `to` the target, `from !== to`.
- `next` is the target path after `safeReturnTo(next, to)` on the source; at most 2048 characters (the bound of
  today's `safeReturnTo`). The key order of the JSON is the one above; the verifier never re-serialises, it MACs
  the received `p`.
- Verified by the target's `/auth/arrive`: MAC valid, `v === 1`, `to === SITE.id`, `from` a SiteId, `exp > now`,
  and `next` equal to the `next` query parameter. Any failure: no bounce, the visitor goes to `next` signed out, and
  an invalid ticket (not a missing one) is logged as `bad_ticket`.
- The same `PASSPORT_TICKET_SECRET` value is set in the three projects (a ticket crosses sites).
- `via` is not in the ticket: it travels as its own query parameter (`^[kaf]\.[a-z]{2,8}$`).

## 2. The transaction cookie of the relying party

| | production (https) | dev hosts (http `*.localhost`) |
|---|---|---|
| name | `__Host-pp_tx` | `pp_tx` |
| attributes | `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`, no `Domain` | `HttpOnly; SameSite=Lax; Path=/; Max-Age=300`, no `Domain` |

- The name follows the request: `__Host-pp_tx` whenever the request is https (and always when
  `VERCEL_ENV=production`), `pp_tx` only on http requests to a `localhost` or `*.localhost` host. A server never
  reads `pp_tx` on an https request (no downgrade).
- Value: `p + "." + s` with `p = b64u(JSON {"state","verifier","next","from","via","iat"})` and
  `s = b64u(HMAC(PASSPORT_TICKET_SECRET, "pp-tx.v1." + p))` (the label separates it from a ticket).
  - `state`: 16 random bytes, `b64u` (22 characters).
  - `verifier`: the PKCE code verifier, 32 random bytes, `b64u` (43 characters, RFC 7636 section 4.1).
  - `next`: the validated target path; `from`: the IdP site; `via`: the code or `null`; `iat`: unix seconds.
- Valid for 300 s from `iat`. Cleared (Max-Age=0, same name and attributes) by `/api/passport/redeem` on success
  and on every failure, and by `/auth/land` on `error=login_required`.
- One transaction at a time per browser and site: a new jump overwrites it.

## 3. PKCE and the one-time code

- `code_challenge = b64u(SHA256(verifier))` (43 characters), `method=S256` only; any other method is a 400.
- Code: 32 random bytes, `b64u` (43 characters, `^[A-Za-z0-9_-]{43}$`), minted by the IdP's `/auth/authorize`.
- Stored: `code_hash = lowercase hex of SHA256(code)` (64 characters) in `passport.handoff_codes`, with `from_site`,
  `to_site`, the `code_challenge`, `expires_at = now() + 60 s` and `used_at` null. The code itself is never stored,
  never logged, never in a server request line (it travels only in the URL fragment).
- Single use: `passport_redeem_code` consumes it with one `UPDATE ... SET used_at = now() WHERE code_hash = $1 AND
  used_at IS NULL AND expires_at > now() AND to_site = $2 RETURNING ...`; a second attempt is `replay`.
- Refused at issue time (no code minted, the RP receives `error=login_required`): no session, email not
  confirmed, `profiles.banned_at` set, a pending deletion request, rate limit reached (30 per user per hour,
  60 per IP hash per hour; default, pending G15), unknown `client`.

## 4. The landing fragment

`https://<to origin>/auth/land#code=<code>&state=<state>` on success, `#error=login_required&state=<state>` for every
refusal (the RP never learns why; the IdP logs the real outcome). The land page strips the fragment with
`history.replaceState(null, '', '/auth/land')` before any other script and POSTs `{code, state}` to
`/api/passport/redeem`. Headers of `/auth/land` and the 302 that leads to it: `Cache-Control: no-store`,
`Referrer-Policy: no-referrer`, `Content-Security-Policy` with a nonce and `frame-ancestors 'none'`; no analytics, no
third-party script.

## 5. Outcomes (`passport.handoff_events.outcome`)

| outcome | logged by | when |
|---|---|---|
| `issued` | IdP | a code was minted |
| `redeemed` | RP | a code was consumed, state and PKCE matched, the session was created |
| `login_required` | IdP | no session on the IdP |
| `state_mismatch` | RP | `state` of the POST differs from the cookie's, or the cookie is missing or its MAC fails |
| `pkce_fail` | RP | `b64u(SHA256(verifier))` differs from the stored challenge |
| `expired` | RP | the code exists, unused, past `expires_at` (or the cookie is past 300 s) |
| `replay` | RP | the code was already used (alert row for the owner) |
| `banned` | IdP | `profiles.banned_at` is set |
| `rate_limited` | IdP or RP | a limit of section 3 refused the request |
| `unconfirmed` | IdP | the account's email is not confirmed (F0 addition, BACKLOG 5.2) |
| `deletion_pending` | IdP | a passport deletion request is pending (F0 addition, B7 hook into B4) |
| `bad_ticket` | RP | `/auth/arrive` got a ticket that fails section 1 (F0 addition; a missing ticket is not logged) |

Events never hold the code, the verifier, the state, a ticket or an email: user id (when known), from and to sites,
outcome, `via`, an IP hash (`NET_IP_HASH_SALT`) and the user-agent family. Kept 90 days (hub cleanup cron).

## 6. Cookies and storage that exist today (kpop, untouched)

| name | kind | owner today | note |
|---|---|---|---|
| `sb-<project ref>-auth-token` (and its chunks) | cookie, per host | `@supabase/ssr` | each site has its own session cookies on its own domain; the three projects share one Supabase project |
| `nq_anon` | cookie | `lib/anon-claim.ts` | guest id, per host |
| `kq_sl` | cookie | `lib/creators/link-plays.ts` | share link attribution, kpop |
| `preferred_locale` | cookie | locale switcher | kpop localized landings |
| `verse_nav` | cookie | Verse nav | kpop Verse |
| `world` | cookie | `lib/world.ts` (`play` or `verse`) | kpop's own Play or Verse choice; unrelated to the network and never renamed |
| `theme` | localStorage | root layout `THEME_SCRIPT` | light, dark or system; each site keeps its own (per origin) |

No new cookie is added on kpopquiz.org outside `/auth/*` responses: the network layer uses no cookie (Q D0:
`via-catcher` keeps the value in the tab only).

## 7. New cookies and client storage of the run

| name | kind | owner | content and life |
|---|---|---|---|
| `__Host-pp_tx` / `pp_tx` | cookie | B4 | section 2 |
| `pp_seeded` | cookie | B4, reserved (P3a, PASSPORT_SEED) | never set in the run |
| `fq.net.caps.v1` | localStorage | B6 | cross-site link impression counters and dismissals (Q 2.4), JSON, try/catch on every access |
| `fq.net.via` | sessionStorage | B6 (`via-catcher`) | the validated `via` of this tab, read by the sign-in `redirectTo`; removed after sign-in |
| `anime.spoiler.v1` | localStorage | O3 (`SpoilerShield`) | guest progress per series `{[seriesSlug]: {arc: number, scope: string}}`, claimed into `series_progress` at sign-in |
| `anime.oshi.pending.v1` | localStorage | P1 | a guest's oshi choice per series, claimed at sign-in; pending CR-005 (the post-result oshi row of TWINS row 8, the owner decides): unused before it is approved |

Keys of localStorage and sessionStorage are per origin, so the same key on two sites never collides. Every access is
wrapped in try/catch (private modes throw). No storage holds a token, a code, an email or a user id.
