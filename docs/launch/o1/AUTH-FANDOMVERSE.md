# Sign-in on fandomverse.org (lane 3, 2026-10-28)

Owner decisions of 2026-10-28: the hub (`https://fandomverse.org`, site `hub`) and OtakuQuiz (`https://fandomverse.org/anime`,
site `anime`, its own Vercel project under the basePath `/anime`, same origin through Vercel Microfrontends) sign in with
**Google and Discord only**. No email link, no code, no password. kpopquiz.org (site `kpop`) does not change.
This replaces RUNBOOK H3 and H4 and the D-099 lines of ENV.md 2.2 for the new domain.

## Flows

1. **Google and Discord** (hub and anime). The button sends the browser to `/auth/start?provider&returnTo&via` of its build
   (`/anime/auth/start` on anime). That route (`lib/passport/signin.ts` handleOAuthStart) asks Supabase, on the server, for
   the provider URL (Supabase's OAuth redirect flow, the one kpopquiz.org already uses, with kpopquiz.org's own Google client
   and the Discord provider already on), with the EXACT callback of the build as `redirectTo` and no query string:
   `https://fandomverse.org/auth/callback` (hub) or `https://fandomverse.org/anime/auth/callback` (anime). The return path,
   the tab's `via` and the provider wait in a first-party cookie (`__Host-fv_oauth`: HttpOnly, Secure, SameSite=Lax, Path=/,
   600 s). The callback (handleWorldCallback) reads only `code` from the query, exchanges it, closes any session that no
   OAuth provider opened (`amr` must be `oauth`), signs out a banned profile, stamps the membership, clears the cookie and
   sends the visitor back: the username page on anime when there is no profile, the hub home on the hub, else the return
   path of the cookie re-checked with safeReturnTo, always inside the build's basePath.
2. **No email.** No email field on the hub and anime (sheet, `/login`, create funnel). `/auth/confirm` answers 404 on a
   production deployment of the hub and anime (outside production it stays for the O1 fixture tool `signin-link.sh`).
   An email link asked for by hand with a fandomverse.org callback is refused by the `amr` check above.
3. **One session for the hub and anime.** Same origin, and the Supabase cookies are written with `Path=/` and no `Domain`
   under a name that comes from the Supabase project: signing in on one signs in on both, signing out on one signs out of
   both ("Sign out of OtakuQuiz only" now also signs out of the hub: lane 2 copy). kpopquiz.org keeps its own cookies.
4. **Passport between kpopquiz.org and fandomverse.org.** Unchanged protocol (ticket 600 s, HMAC `PASSPORT_TICKET_SECRET`,
   `__Host-pp_tx` 300 s, PKCE S256, single-use code, revalidate HMAC `PASSPORT_REVALIDATE_SECRET`). Every leg uses the
   origin and basePath of its site: kpop to anime lands on `https://fandomverse.org/anime/auth/arrive`, anime's code goes to
   `https://fandomverse.org/anime/auth/land`. Between the hub and anime there is no hand-off (shared session).
   Origin checks are exact (`https://fandomverse.org.evil.com`, `https://evil.com/fandomverse.org`, `http:`, ports, `www.`
   are refused); every return path stays a same-origin path, inside `/anime` on anime.

## Owner lines

**Supabase, Authentication, URL Configuration.** Site URL stays `https://kpopquiz.org`. Add exactly these two Redirect URLs,
with no wildcard (GoTrue matches the raw `redirect_to` as a glob: `**` would also match `.../auth/callback/../../<any page>`,
which the browser normalises to any page of the shared origin; `?` is itself a glob wildcard, so `callback?**` is no fix):

```
https://fandomverse.org/auth/callback
https://fandomverse.org/anime/auth/callback
```

Remove `https://otakuquiz.org/**` and `https://fanquiz.org/**` if they were added (RUNBOOK H3): no site sends a visitor there
any more, and a redirect entry nothing uses is only attack surface.

**Google Cloud.** Authorized JavaScript origin to add: **none**. The sites use Supabase's OAuth redirect, not Google Identity
Services, so Google only ever talks to Supabase's callback. Authorized redirect URI changes: **none** (it stays
`https://<project-ref>.supabase.co/auth/v1/callback`). No new client: do not create the two clients of RUNBOOK H4, and do not
add client ids to Supabase's Google provider. (Only if One Tap is wanted one day: the origin would be exactly
`https://fandomverse.org`, no path, no trailing slash; it covers `/anime` too.) The Google consent screen shows the name of
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
| `NEXT_PUBLIC_NET_ORIGINS` | never in production | never in production | never in production | previews only: `kpop=<kpop preview origin>,hub=<fv preview origin>,anime=<fv preview origin>` (bare origins; anime gets `/anime` from code) |

Previews: the callback is built from the site's origin on that deployment (`NEXT_PUBLIC_NET_ORIGINS` outside production), never
from the request's Host, so a preview with no override sends the provider back to production and the sign-in fails closed there
(no verifier cookie). To sign in on a preview, give it a stable origin (the branch alias of the fandomverse project) in
`NEXT_PUBLIC_NET_ORIGINS`, and the owner adds its two exact callbacks, no wildcard, on the Supabase project the preview uses:
`<branch alias origin>/auth/callback` and `<branch alias origin>/anime/auth/callback`. A per-deployment URL needs its own pair.

## Merge notes

- `lib/auth/site-base.ts` `SITE_BASE_PATH` mirrors lane 1's basePath (`anime: '/anime'`); read it from lane 1's helper once merged.
- The registry urls of anime and hub still say otakuquiz.org and fanquiz.org on this branch (lane 1 moves them). The auth code
  takes origins from the registry and the basePath from `SITE_BASE_PATH`, so it is right whether the anime url is written
  `https://fandomverse.org` or `https://fandomverse.org/anime`.
