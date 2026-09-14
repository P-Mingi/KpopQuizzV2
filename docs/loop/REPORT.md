# REPORT - TIERLIST prod hotfix: three launch bugs fixed, verified on the LIVE domain, shipped to production.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). The owner hit three real bugs on the live tier list.
Each root cause was VERIFIED against production (the auditor could not reach it), fixed, covered by
tests, and re-verified on the live domain. CI green on the branch (PR #22). The owner then authorised
production, so `main` was fast-forwarded and the prod deploy is READY. No migration, no env file, no
em dashes, zero emoji.

## BUG 1 - share card showed grey initials / the shared link unfurled with a generic image

Verified on production: every members board's photos are LOCAL `/idols/*` paths, and the OG route
resolved them against `request.nextUrl.origin`. That origin is the host the route is reached on; on
the SSO-protected deployment alias (`*.vercel.app`, `all_except_custom_domains`) a fetch 401s and
every face falls back to initials, and because the response is cached a single such render poisons
the card. Separately, the share page set no `og:image`, so a shared link unfurled with the site
default `og-default.png` (the "grey card" the owner saw when sharing).

Fix: the OG route resolves local paths against a STABLE public base (`og-faces.publicImageBase`:
`NEXT_PUBLIC_SITE_URL` when it is an absolute https origin, else the production domain), NEVER the
request origin, so the card is independent of the host it is reached on. And `share/page.tsx` now
sets `og:image` (via `generateMetadata`) to the board's OWN card, absolute on the public domain.

Live proof (kpopquiz.org): the OG card returns `image/png` 197239 bytes with REAL photos
(`prod-og-photos.png`), and `/tier-list/share?d=` carries
`og:image = https://kpopquiz.org/api/og/tier-list?d=<board>`, not og-default.

## BUG 2 - "Save to private" appeared to save nothing

Verified against the 146 RLS (`visibility in ('public','unlisted') or creator_id = auth.uid()`):
UNLISTED was never broken (anon can read it), but a PRIVATE row is readable only by its creator via
`auth.uid()`, and the public `/tier-list/l/[slug]` page is ISR and reads with the cookie-free client,
so `auth.uid()` is null and the creator's own private list 404s.

Fix: a new DYNAMIC, noindex owner-view route `/tier-list/mine/[slug]` reads the row with the service
role and authorizes with the pure `canViewOwned` helper (session user, or the anon cookie id for a
logged-out creator); a non-owner gets `notFound()`. The public ISR page is UNTOUCHED (still `●` ISR,
crawl posture preserved). `save` returns the owner the working link (private -> `/mine/`, else
`/l/`), and the share sheet now confirms "Saved (private)". No migration - works on the applied
146/147; a submitted idol stays a moderated user asset, never a write to `idols`.

Live proof: `/tier-list/mine/<unknown>` -> 404 on kpopquiz.org. The full round-trip (owner 200 /
stranger 404 / public `/l/` 404) was proven on the local build against live Supabase
(`bug2-private-roundtrip.txt`, `bug2-owner-private-view.png`), because an anon private save needs the
service role, which CI does not carry; the test row was torn down.

## BUG 3 - logging in on the Play home bounced the user to /verse

Confirmed in code: `WorldHomeRedirect` ran on "/" and client-side `router.replace('/verse')` on a
`world=verse` cookie. With the desktop world toggle retired in phase 3.2, a stuck cookie turned every
landing on "/" - including right after login - into a bounce to Verse.

Fix: the auto-forward is removed; "/" now lands and STAYS on Play. SEO-safe: the redirect was already
browser-only (no server 3xx), so the "/" HTML served to Googlebot is unchanged - this is a pure
deletion of a client effect and the home stays static/ISR. Verse remains reachable via the footer
Fandoms link, the mobile top-bar toggle, and the Verse topbar toggle.

Live proof: with `document.cookie='world=verse'` set on kpopquiz.org, loading "/" keeps
`location.pathname === '/'`, renders the Play home, and shows the footer `/verse` link - no bounce.

## Tests + CI

Unit 63 (+8: `canViewOwned` x5, `publicImageBase` x3). e2e 38 passed / 8 skipped (added: bug 3 no
bounce with a verse cookie; bug 1 share unfurl og:image is the card; bug 2 owner-view 404s an unknown
slug). One pre-existing hub test was made data-agnostic (production now has public lists, so
`trending-empty` is no longer guaranteed). CI on PR #22 (branch `hotfix/tierlist-prod`) conclusion
**success**: unit + e2e green on a real runner.

## Production

The owner authorised production. `main` was fast-forwarded `750d724..ba1aaf1` (1 commit). Production
deploy **dpl_B1ACQUfy5SYgmLdqiCr1H4ESPj3E** = **READY** on kpopquiz.org, no `check:env` failure, and
all three fixes were re-verified on the live domain (above). Render modes unchanged: `/tier-list/l/`
stays `●` ISR, `/tier-list/mine/` is `ƒ` noindex, the OG route stays a handler.

## Still open

- The two SEO defects named in the prior push report are NOT part of this hotfix and remain: the
  `/tier-list` hub is missing from the sitemap (in CATALOG_PATHS, not the emitted staticPages array),
  and (now fixed here) the share `og:image`. The sitemap-hub omission is still a one-line follow-up.
- Signed-in publish/upload/moderation/mobile smoke checks remain the owner's, per POST-PUSH-SMOKE.md.

---

DONE. Share card renders real photos and shared links unfurl to the card; a private save now shows
the owner their list (stranger 404s); logging in stays on Play. Verified on kpopquiz.org, shipped to
production (main ba1aaf1, deploy READY).
