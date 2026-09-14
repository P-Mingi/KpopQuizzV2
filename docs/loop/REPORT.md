# REPORT - TIERLIST PUSH: decision trail committed, main fast-forwarded, production live. Two defects found, not fixed (scope).

Repo guard OK (origin = P-Mingi/KpopQuizzV2). The owner authorised the production push; the ordered
steps ran without improvising on main. Production is LIVE and healthy on the headline path; STEP 4
surfaced two SEO/social defects that are named here and left for a follow-up (this mission changes no
code). No migration, no env file, no rollback. No em dashes.

## STEP 1 - decision trail committed

`check:docs-secrets` PASSED (705 tracked docs, no credential-shaped value). The three modified docs
(VERSE-LEDGER.md L-218..L-228, loop/BLOCKED.md, loop/MISSION.md) were committed docs-only as 750d724
and pushed to preview/verse-stack. No code changed.

## STEP 2 - main fast-forwarded (the production push)

`origin/main` (75dcabb) was re-confirmed a clean-fast-forward ancestor of the branch head. Pushed:
`75dcabb..750d724 -> main`. **15 commits** landed (the 14 tier-list phase commits + the docs commit).
New `main` sha: **750d72417562cec1376e75045afd70289a74e240**.

## STEP 3 - production deploy

Vercel production deployment **dpl_4f6aFaWdNukxwpdh7qs3URUBYdwX** (commit 750d724, target production)
reached **READY**, aliased to kpopquiz.org + www.kpopquiz.org. No `check:env` failure appeared (the
build ran it before next build and passed). Build ~4 min, region dub1.

## STEP 4 - the three live-domain checks (kpopquiz.org)

**CHECK 1 - share card photos (HEADLINE): PASS.** `/api/og/tier-list?d=<BTS board>` returns
`image/png`, 197239 bytes, rendering the real member photos (RM, V, Jin, Jungkook); an initials-only
card is 121615 bytes. The photo card is 62% larger and visibly shows faces
(`docs/proofs/tierlist-push/prod-share-card-photos.png`). The Vercel-SSO 401 that forced initials on
the preview is gone on the live domain, exactly as predicted.

**CHECK 2 - the unfurl: FAIL (defect, reported not fixed).** `/tier-list/share?d=<board>` carries
`og:image = https://kpopquiz.org/og-default.png` - absolute and on the production domain, but the
SITE DEFAULT, not the per-board card. `share/page.tsx` exports only a static `title` + `robots`; it
has no `generateMetadata` pointing `openGraph.images` at `/api/og/tier-list?d=`. So a shared link
unfurls with the generic image. The card itself is correct (CHECK 1); it is simply not referenced by
the share page. Follow-up: add `generateMetadata` to the share page.

**CHECK 3 - canonical, noindex, routes: MOSTLY PASS, one defect.**
- `/tier-list` canonical = `https://kpopquiz.org/tier-list` (self, production). PASS
- `/tier-list/new`, `/tier-list/create`, `/tier-list/share` emit `noindex, follow`. PASS
- `/tier-list`, `/tier-list/new`, `/tier-list/create` return 200. PASS
- Home: exactly ONE `home-tier-cta`, `home-cta-start -> /tier-list/new`, zero `pq-banner`. PASS
- General board: `?group=general-kpop&kind=members` renders "K-pop idols (all groups)" + "118 items
  loaded". PASS
- Sitemap: `/tier-list/new`, `/create`, `/share` ABSENT from `/sitemap.xml`. PASS
- **SITEMAP DEFECT:** the indexable `/tier-list` HUB is ALSO absent from `/sitemap.xml` (734 URLs).
  This is a genuine code gap, not stale cache: `sitemap.ts` line 41 adds `/tier-list` to
  `CATALOG_PATHS` (which only bumps lastmod) but it was never added to the emitted `staticPages`
  array (lines 91-148); only `/tier-list/l/<slug>` (published lists, none yet) and
  `/tier-list/subject/...` are emitted. `check:indexability`/`check:orphans` never flagged it because
  they only inspect URLs that ARE in the sitemap. Follow-up: add a `{ url: SITE_URL + '/tier-list' }`
  entry to `staticPages`.

## Is production healthy?

**Yes on the headline and on function.** The deploy is READY, the share card renders real photos on
the live domain (the whole reason the push was needed), every tier-list route resolves 200, the tool
pages are correctly noindex and out of the sitemap, the home page shows one strong CTA and no stale
banner, and the general board loads its 118 idols. Migrations 146 + 147 are applied and additive.

**Two defects to fix next (neither breaks production, both are discoverability):**
1. The share page's `og:image` is the site default, not the per-board card - shared links unfurl with
   the generic image.
2. The `/tier-list` hub is missing from the sitemap (in CATALOG_PATHS, not in the emitted staticPages
   array), so the indexable hub is not advertised to crawlers.

Both are single-line additions but out of THIS mission's scope (no code change), so they are named,
not fixed. Nothing else could not be verified: the signed-in publish/upload/moderation/mobile checks
are deliberately the owner's, per `docs/loop/POST-PUSH-SMOKE.md`.

## Owner gates

1. Decide whether to spin a short follow-up for the two SEO/social defects above (both one-line).
2. The signed-in smoke checks in `docs/loop/POST-PUSH-SMOKE.md` remain yours.
Rollback target if ever needed: dpl_7PF9HwCDF48hykBnudTMJkZCX3LC (75dcabb), rollback-capable; 146/147
are inert for it, so no DB action.

---

DONE. main = 750d724 (15 commits), production dpl_4f6aFaWdNukxwpdh7qs3URUBYdwX READY on kpopquiz.org.
Share card renders real photos live (headline PASS). Two named defects: the share-page og:image
default, and the /tier-list hub missing from the sitemap. No code changed, no rollback, main pushed
exactly once as authorised.
