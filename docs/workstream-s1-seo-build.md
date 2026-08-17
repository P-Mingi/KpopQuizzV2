# Workstream S1 - SEO build phase 1 (stats page, indexation, image/CWV, news photos)

## Claude Code Implementation Prompt

---

S1 = the build phase of Workstream S (strategy: docs/workstream-seo-geo-strategy.md - read
it first, especially the Bing numbers: 571K impressions at 0.86% CTR, ~1 backlink, trust
2/100). Four sub-workstreams in leverage order: stats page (#5), indexation (#10),
image/CWV (#6), news photos (#4). The 20-articles track (#8) is SEPARATE, not this prompt.

Hard rules: NO em dashes. Real assets only. REAL DATA ONLY - the stats page especially:
every number from a real query, never fabricated or inflated. Git commit per step, do NOT
push. New public routes -> route allowlist, check:routes green. All new pages static/ISR,
NANO-safe queries, safeFetch everywhere. Dual-skill audit: /ui-ux-pro-max +
/frontend-design + searchfit-seo skills where fitting.

---

## S1.1 - /stats page (SEO #5: original, dated, AI-citable data)

The GEO play: LLMs + journalists cite pages with unique first-party data. We sit on data
nobody else has. One page, updated automatically, quotable line by line.

**Route:** `/stats` (public, allowlist, ISR revalidate 3600).

**Content (all real queries, all with visible "as of {date}" stamps):**
- Hero: total quizzes, total plays, groups covered, songs in the blindtest catalog.
- "State of the fandoms": top 10 groups by all-time plays + the week's war-map top 5
  (reuse getFandomWarMap). This is the citable centerpiece: "According to kpopquiz.org,
  {group} is the most-played fandom of the week."
- Hardest quizzes: 5 published quizzes with lowest avg score (min 30 plays; title + group +
  avg). Easiest same. Real avgs.
- Blindtest facts: hardest generation to guess (lowest accuracy by generation), average
  score across all daily blindtests.
- Duel verdicts: top 3 most-voted duel results with vote counts ("fans voted X over Y,
  1.7K votes") - reuse the F2b matchups query.
- Every section = crawlable server HTML, h2 per section, one-sentence plain-language
  takeaway under each heading (LLM-quotable phrasing).
- Metadata: title "K-pop Quiz Statistics {year} - Fan Data from kpopquiz.org"; Dataset +
  WebPage JSON-LD; canonical; og image via existing OG route pattern.
- Footer line: "Free to cite with a link to kpopquiz.org/stats" (the backlink ask, polite).
- Add /stats to llms.txt and the sitemap. Internal links: footer + about page + community
  page pulse section link to it.
- Any section with insufficient data (mins not met) hides. Never pad.

## S1.2 - Indexation backlog (SEO #10: the /q 410 cleanup + prerender)

DB is healthy now (dub1 + fail-open + trimmed middleware). Finish what the incident
paused. Read docs/seo-strategy.md section 10 for the history first.

- Audit current state: how many /q/{slug} URLs does the sitemap emit vs how many are
  prerendered vs what GSC reports (owner will paste GSC numbers if needed - ask).
- Restore sane generateStaticParams for /q: top-N by plays (N sized so the build stays
  under the NANO budget - the build self-saturation lesson: cheap query, short timeout,
  fail-soft to []). The long tail stays ISR-on-demand.
- Verify deleted/unpublished quizzes return 410 (or 404) consistently, not soft-200s.
- Sitemap: confirm honest lastmod still holds, thin-page gating still applies, and the
  sitemap excludes anything noindexed. Ping IndexNow after deploy (existing wiring).
- Deliverable note for owner: exact list of what to re-validate in GSC (the redirect-fix
  validation + sitemap resubmit), as a short checklist in the report.

## S1.3 - Image SEO + CWV finish (SEO #6)

- Audit every image surface: group logos, quiz covers, news photos, mascot, badge coins,
  avatars. Check: next/image everywhere (no raw <img> except satori routes), width/height
  or fill (no CLS), lazy below fold, priority only above fold, descriptive alt text
  (group/quiz names, not "image"), remotePatterns tight.
- The known raw-img spots: blindtest result covers (bt-row-cover uses <img> with
  eslint-disable) - convert or justify (Deezer covers are remote + transient; if kept raw,
  add width/height + loading=lazy + alt already present).
- Run a Lighthouse pass (mobile) on: home, /quizzes, a /q page, /blindtest, /stats,
  /leaderboard. Report LCP/CLS/INP per page before + after. Fix what's cheap: preload the
  LCP image where static, font-display swap check, defer non-critical third-party.
- Target: CLS < 0.05 and LCP < 2.5s on all six, mobile throttled.

## S1.4 - News photos + UI upgrade (SEO #4)

Read the news page implementation first (app/news). Current state: text-heavy cards.

- Add photos to news items: og-image of the linked source when available (fetch at
  ingest/build time, store URL, hotlink-check), else a branded fallback card (group logo +
  colored band - real logo assets). Never fabricate imagery; no stock photos.
- Card upgrade: image top, headline, source + date line, group chip linking to the group
  page. Keep the page static/ISR.
- NewsArticle JSON-LD per item (headline, datePublished, image, publisher kpopquiz).
- Internal links: each news item's group chip -> group page; group pages' news section
  (if exists) links back. News page in sitemap with honest lastmod.
- Alt text = headline. Lazy-load below fold.

## Build order (commit each, do NOT push)

1. S1.1 stats page (queries first, verify real output, then page). Commit.
2. S1.2 indexation (audit report FIRST in /caveman, then changes). Commit.
3. S1.3 image/CWV (before-numbers first, then fixes, then after-numbers). Commit.
4. S1.4 news photos. Commit.
5. Final: check:routes, tsc, build, sitemap sanity, zero em dashes. Commit.

## Verification

- [ ] /stats: every number traceable to a query; sections hide on thin data; "as of" dates
      render; JSON-LD valid; page static
- [ ] /q prerender restored top-N without build saturation (report build time + prerender
      count); 410/404 consistent; sitemap honest
- [ ] Lighthouse before/after table for the six pages; CLS < 0.05, LCP < 2.5s mobile
- [ ] News: photos or branded fallback on every item, NewsArticle JSON-LD, no fabricated
      imagery
- [ ] GSC re-validation checklist delivered for owner
- [ ] check:routes green, tsc clean, build green, zero em dashes, no new npm dependency

/caveman report per step: what shipped, real numbers (query outputs, Lighthouse scores,
prerender counts), deviations + why.
