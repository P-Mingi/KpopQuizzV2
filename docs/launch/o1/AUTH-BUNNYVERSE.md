# Sign-in on bunnyverse.org (lane 3, 2026-10-28)

Owner decisions of 2026-10-28: the hub (`https://bunnyverse.org`, site `hub`) and OtakuQuiz (`https://bunnyverse.org/anime`,
site `anime`, its own Vercel project under the basePath `/anime`, same origin through Vercel Microfrontends) sign in with
**Google and Discord only**. No email link, no code, no password. kpopquiz.org (site `kpop`) does not change.
RUNBOOK H4 (Supabase redirect URLs) and H5 (Google and Discord) and ENV.md 2.2 follow this file; it replaces the D-099 lines
(two Google clients, wildcard redirect URLs on the old anime and hub domains).

## Flows

1. **Google and Discord** (hub and anime). The button sends the browser to `/auth/start?provider&returnTo&via` of its build
   (`/anime/auth/start` on anime). That route (`lib/passport/signin.ts` handleOAuthStart) asks Supabase, on the server, for
   the provider URL (Supabase's OAuth redirect flow, the one kpopquiz.org already uses, with kpopquiz.org's own Google client
   and the Discord provider already on), with the EXACT callback of the build as `redirectTo` and no query string:
   `https://bunnyverse.org/auth/callback` (hub) or `https://bunnyverse.org/anime/auth/callback` (anime). The return path,
   the tab's `via` and the provider wait in a first-party cookie (`__Host-fv_oauth`: HttpOnly, Secure, SameSite=Lax, Path=/,
   600 s). The callback (handleWorldCallback) reads only `code` from the query, exchanges it, closes any session that no
   OAuth provider opened (`amr` must be `oauth`) or that another OAuth provider of the shared project opened (the provider
   started must be Google or Discord and the account must hold that identity; without the cookie every OAuth identity of
   the account must be Google or Discord), signs out a banned profile, stamps the membership, clears the cookie and
   sends the visitor back: the username page on anime when there is no profile, the hub home on the hub, else the return
   path of the cookie re-checked with safeReturnTo, always inside the build's basePath.
   It also refuses a session whose user Supabase cannot name: local sign-out, session cookies deleted, return cookie cleared,
   back to the login page of the build. A banned profile is signed out everywhere, and its session cookies are deleted even
   if the sign-out call fails.
   The client code of the old Google ID-token path is deleted (`signInWithGoogle`, `afterSignin`): `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   stays unread and must not be set. The route `/api/passport/after-signin` still exists, but nothing in the UI calls it.
2. **No email.** No email field on the hub and anime (sheet, `/login`, create funnel). `/auth/confirm` of the hub and anime
   answers 404 except on a development server or on a preview that sets `AUTH_FIXTURE_CONFIRM=1` (the fixture links of
   `signin-link.sh --vercel`, now under `/anime` for anime); never on `VERCEL_ENV=production`.
   An email link asked for by hand with a bunnyverse.org callback is refused by the `amr` check above.
3. **One session for the hub and anime.** Same origin, and the Supabase cookies are written with `Path=/` and no `Domain`
   under a name that comes from the Supabase project: signing in on one signs in on both, signing out on one signs out of
   both ("Sign out of OtakuQuiz only" now also signs out of the hub: lane 2 copy). kpopquiz.org keeps its own cookies.
4. **Passport between kpopquiz.org and bunnyverse.org.** Unchanged protocol (ticket 600 s, HMAC `PASSPORT_TICKET_SECRET`,
   `__Host-pp_tx` 300 s, PKCE S256, single-use code, revalidate HMAC `PASSPORT_REVALIDATE_SECRET`). Every leg uses the
   origin and basePath of its site: kpop to anime lands on `https://bunnyverse.org/anime/auth/arrive`, anime's code goes to
   `https://bunnyverse.org/anime/auth/land`. Between the hub and anime there is no hand-off (shared session).
   Origin checks are exact (`https://bunnyverse.org.evil.com`, `https://evil.com/bunnyverse.org`, `http:`, ports, `www.`
   are refused); every return path stays a same-origin path, inside `/anime` on anime.

## Residuals (accepted)

- **Passport sessions.** A session that arrives from kpopquiz.org through the passport is accepted on bunnyverse.org whatever
  opened it on kpopquiz.org, an email link included (owner decision: the passport stays). The OAuth-only checks apply to
  `/auth/callback` of the hub and anime, not to the passport and not to every request (no middleware-wide session audit).
- **Self-service email session.** Supabase's anon key is public: a person can ask Supabase for their own email sign-in by hand
  and plant the resulting session in their own browser with the developer tools. It signs in only themselves, on their own
  account (no victim, no other account reachable); the sites never offer it.

## Owner lines

**Supabase, Authentication, URL Configuration.** Site URL stays `https://kpopquiz.org`. Add exactly these two Redirect URLs,
with no wildcard (GoTrue matches the raw `redirect_to` as a glob: `**` would also match `.../auth/callback/../../<any page>`,
which the browser normalises to any page of the shared origin; `?` is itself a glob wildcard, so `callback?**` is no fix):

```
https://bunnyverse.org/auth/callback
https://bunnyverse.org/anime/auth/callback
```

Never a wider `https://bunnyverse.org/**`. Remove the two wildcard entries of the old anime and hub domains if they were added
(RUNBOOK H4): no site sends a visitor there any more, and a redirect entry nothing uses is only attack surface.

**Google Cloud.** Authorized JavaScript origin to add: **none**. The sites use Supabase's OAuth redirect, not Google Identity
Services, so Google only ever talks to Supabase's callback. Authorized redirect URI changes: **none** (it stays
`https://<project-ref>.supabase.co/auth/v1/callback`). No new client: do not create a Google client for bunnyverse.org, and do not
add client ids to Supabase's Google provider. (Not part of this launch: only if One Tap is wanted one day would an origin be
added, exactly `https://bunnyverse.org`, no path, no trailing slash; it would cover `/anime` too.) The Google consent screen shows the name of
kpopquiz.org's client: rename it in Google Cloud if a neutral name is wanted (optional).

**Discord Developer Portal.** Changes: **none**. The app's redirect stays Supabase's callback
`https://<project-ref>.supabase.co/auth/v1/callback`; check it is listed under OAuth2, Redirects (it is, if kpopquiz.org's
Discord sign-in works). Scopes stay Supabase's default (`identify email`), as on kpopquiz.org.

**Vercel variables** (no new variable; values are never written here):

| variable | kpop project | hub project (fandomverse) | anime project (otakuquiz) | kind, value source |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_ID` | unset | `hub` | `anime` | public (lane 1 sets the basePath from it) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | already | same as kpop | same as kpop | public, copy kpop |
| `SUPABASE_SERVICE_ROLE_KEY` | already | same as kpop | same as kpop | secret, copy kpop (callback stamp, passport) |
| `PASSPORT_TICKET_SECRET`, `PASSPORT_REVALIDATE_SECRET`, `NET_IP_HASH_SALT` | set | same value | same value | secret, one value each for the three projects (ENV 1.3) |
| `PASSPORT_JUMP` | `1` | `1` | `1` | server flag, the three together (ENV 1.2) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | unset | **do not set** | **do not set** | unread now (no Google Identity Services) |
| `AUTH_FIXTURE_CONFIRM` | unset | Preview only, `1`, if the fixture tool is used | Preview only, likewise | test switch, **never in production** (ENV 1.6) |
| `NEXT_PUBLIC_NET_ORIGINS` | never in production | never in production | never in production | previews only: `kpop=<kpop preview origin>,hub=<fv preview origin>,anime=<fv preview origin>` (bare origins; anime gets `/anime` from code) |

Staging mail (the `send-email` function, never in production): `SEND_EMAIL_ORIGINS` takes bare origins, like
`NEXT_PUBLIC_NET_ORIGINS`, for example `anime=<fandomverse preview origin>,hub=<fandomverse preview origin>`; the `/anime` folder of
anime comes from the code, and an entry with a path is ignored. On the shared origin, hub and anime mails keep their own brand
and colours.

Previews: the callback is built from the site's origin on that deployment (`NEXT_PUBLIC_NET_ORIGINS` outside production), never
from the request's Host, so a preview with no override sends the provider back to production and the sign-in fails closed there
(no verifier cookie). A preview also runs on the O1 dev Supabase project (`o1-dev`, the Preview variables of `o1/integration`),
whose own provider callback (`https://<o1-dev ref>.supabase.co/auth/v1/callback`) is not an authorized redirect URI of the
kpopquiz.org Google client: Google refuses it, so Google sign-in cannot complete on a preview (Discord only shows its own page).
Nothing is added to the Google client or to the Discord app for previews. End-to-end Google sign-in is checked only in
production, by the owner's live proof with a real account (RUNBOOK K6, OWNER-NOW step 49). A signed-in check on a preview uses
the fixture links of `scripts/o1-tools/signin-link.sh --vercel` instead (`/auth/confirm` with `AUTH_FIXTURE_CONFIRM=1`, Preview
only), which go through no provider and no redirect URL.

## Merge notes

- `lib/auth/site-base.ts` `SITE_BASE_PATH` mirrors lane 1's basePath (`anime: '/anime'`); read it from lane 1's helper once merged.
- The registry urls are `https://bunnyverse.org` (hub) and `https://bunnyverse.org/anime` (anime) since the lanes were merged into
  `o1/fv-int`. The auth code takes origins from the registry and the basePath from `SITE_BASE_PATH`, which a test keeps equal to the
  base paths `lib/site/base-path.ts` reads from the registry.
