# KpopQuiz SEO Strategy - Master Index

Single source of truth for all SEO work: traditional SEO, AI-SEO (GEO), content,
and off-site promotion. Detailed sub-docs are linked where relevant.

Rule for all execution: no em dashes anywhere (titles, meta, alt, copy, JSON-LD,
commits). Plain hyphens, colons, middots only.

Companion docs:
- [content-plan-articles.md](content-plan-articles.md) - the 20 original articles (Track B)
- [promotion-plan.md](promotion-plan.md) - off-site / backlink outreach checklist

Status legend: DONE - shipped | PENDING - prompt ready, not yet run |
DEFERRED - intentionally paused | ONGOING - manual, no end state

---

## Status dashboard

| # | Workstream | Status |
|---|---|---|
| 1 | Blindtest consolidation (Option B) + content + schema + internal links | DONE |
| 2 | Site-wide SEO + AI-SEO (robots AI bots, llms.txt, schema, links) | DONE |
| 3 | News aggregator page (RSS, noindex funnel, footer-only) | DONE |
| 4 | News photos + UI upgrade | PENDING |
| 5 | /stats page (original, dated, AI-citable data) | PENDING |
| 6 | Image SEO + Core Web Vitals finish | PENDING |
| 7 | AI-visibility admin tracker (manual log) | DONE |
| 8 | Articles system + weekly roundup (Track B home) | DONE |
| 9 | Comparison / listicle landing pages | DEFERRED |
| 10 | Indexation: clean /q prerender + GSC re-validate | PENDING (needs healthy DB) |
| 11 | Off-site promotion / backlinks | ONGOING (manual) |
| 12 | Internationalization: pt-BR LIVE (reviewed, indexed, hreflang, 14 pages); es + id next | DONE (pt-BR) |

Run-before-build reminder: confirm the Supabase DB is healthy (pages refilled,
Disk IO banner cleared) before any deploy. Each prompt triggers a build.

---

## Baseline (where the site stands)

Strong foundations: dynamic sitemap with thin-page gating, clean robots.txt,
per-page canonicals, title template, JSON-LD on quiz/group/trivia/FAQ/profile/
ranking pages. Quiz pages serve as fast static/ISR HTML. PageSpeed mobile 81,
CLS 0.001, SEO 100, Best Practices 100, Accessibility 92. GSC baseline
(2026-06-12): ~65 indexed, 422 not indexed (410 "Discovered, not indexed"),
impressions ~90/day and rising.

The strategy attacks: the blindtest section (done), schema breadth (done),
AI-SEO (done), original content (pending), and off-site presence (ongoing).

---

## 1. Blindtest consolidation - DONE

Chose Option B (consolidate). Shipped: /blind-test 301 -> /blindtest; mode pages
re-parented to /blindtest/[mode]; mode picker folded into /blindtest; below-the-
fold content (one h1, intro, how-it-works, stats strip, internal links, 7-Q FAQ);
FAQPage + WebApplication + BreadcrumbList JSON-LD; group quiz pages link to the
group blind test; sitemap + KNOWN_ROUTES updated.

## 2. Site-wide SEO + AI-SEO (GEO) - DONE

AI is cited, not ranked: the goal is kpopquiz.org being named by ChatGPT /
Perplexity / Gemini for "best kpop quiz", "kpop blind test online", "[group] quiz".

Shipped:
- robots.txt: explicit Allow for GPTBot, ChatGPT-User, Google-Extended,
  anthropic-ai, ClaudeBot, PerplexityBot, Bytespider, cohere-ai (disallow
  /admin, /settings, /onboarding; keep /api, /auth disallowed).
- /llms.txt: live DB stats (3964 songs, 87 groups, 331 quizzes), site sections,
  game types, group coverage. 24h cache.
- Schema: SiteNavigationElement (layout), CollectionPage + ItemList (games),
  verified WebSite + SearchAction (home), plus existing quiz/trivia/name-all schema.
- Internal links: quiz result -> /blindtest; group quiz -> group blind test;
  blindtest hub -> This or That / Quizzes / Name All.

Principles applied (from the ai-seo skill): 40-60 word extractable answer blocks,
FAQPage schema, original data, freshness dates, write for people not AI, never
chunk or fabricate.

## 3. News aggregator - DONE (funnel, not a ranking page)

/news aggregates allkpop / Soompi / Koreaboo via RSS (title + 1-sentence excerpt
+ link out), noindex + follow, footer-only (not in nav, not in sitemap). Group
detection adds tag pills + funnel CTAs into quizzes/blind tests. 1h ISR, 8s fetch
timeout, graceful fallback. This is a funnel: it cannot and should not rank;
its SEO job is to pass users + link equity into indexable content.

## 4. News photos + UI upgrade - PENDING

Add feed images (media:content / media:thumbnail / enclosure / first img),
HOTLINKED (do not rehost - licensing), mascot fallback. Featured hero + image-card
grid, source badges, group tag pills, funnel CTAs, skeletons, zero CLS. Stays
noindex,follow. Built with ui-ux-pro-max + frontend-design. (Prompt delivered.)

## 5. /stats page - PENDING

Indexable, footer-linked, in sitemap. Real cached DB numbers (songs, quizzes,
plays, top quiz per group), visible "Last updated" (weekly TTL), 40-60 word
extractable summary, Dataset + BreadcrumbList schema. Beautiful on-brand stats
dashboard (ui-ux-pro-max + frontend-design). Original data is the most AI-cited
content type. (Prompt delivered.)

## 6. Image SEO + CWV finish - PENDING

Descriptive alt text everywhere (group logos, quiz images), next/image with
dimensions (keep CLS 0). Trim unused CSS (~25KiB, split globals.css), unused JS
(~26KiB, dynamic imports), confirm browserslist dropped legacy JS (~14KiB). Target
mobile PSI ~90. (Prompt delivered.)

## 7. AI-visibility admin tracker - DONE

Admin-only manual log (table ai_visibility_checks + /admin/ai-visibility page):
record monthly checks of "best kpop quiz", "kpop blind test online", "bts quiz"
etc. across ChatGPT / Perplexity / Gemini / Google AI Overviews. Manual only - do
not auto-query LLMs (cost/brittleness). (Prompt delivered.)

## 8. Articles system + weekly roundup - DONE

Indexable /articles/[slug] section (sitemap + footer), Article + BreadcrumbList
schema, byline, "Last updated", breadcrumbs, beautiful reading template
(ui-ux-pro-max + frontend-design), 2-4 internal quiz links each. Hosts the 20
articles in [content-plan-articles.md](content-plan-articles.md) + the weekly
"K-pop This Week" roundup (original one-line takes + quiz tie-ins; the only
news-shaped content that should be indexed). (Prompt delivered.)

Two content tracks, never mixed: /news = aggregated noindex funnel;
/articles = original indexed content that ranks + gets AI-cited.

## 9. Comparison / listicle landing pages - DEFERRED

Same programmatic pattern as /easy-kpop-quizzes etc. ("bts vs blackpink quiz",
"hardest kpop quizzes", "best kpop quiz site"). Paused by owner for now; several
overlap with the articles in [content-plan-articles.md](content-plan-articles.md).

## 10. Indexation backlog (the 410) - PENDING

Needs a healthy DB: ship a cheap generateStaticParams (top ~200 slugs, no heavy
join, own short timeout) so the build prerenders quiz pages without self-saturating
the DB. Then owner re-runs GSC "Validate Fix" + resubmits the sitemap. Fix the 5
old /group/[slug] redirect rows (single-hop 301 to /[slug]-quiz). Do NOT re-trigger
GSC crawls until quiz pages prerender cleanly.

## 11. Off-site promotion - ONGOING (manual)

See [promotion-plan.md](promotion-plan.md). Highest-ROI lever left: communities
(r/Kpop_Verse, r/kpop, Amino, Discord hubs), Q&A (Quora/Reddit), launch directories
(Product Hunt + alternatives), and visual/short-form (Pinterest - you have the
integration; TikTok/Shorts/Reels blind-test clips). Code support: share buttons +
UTMs, dynamic OG cards, /about + /stats for directory submissions.

---

## 12. Internationalization (i18n) - Phase 0 + Phase 1 DONE

Decisions locked: subdirectories; English at root (no prefix, no URL changes);
pilot pt-BR, then es, then id; translate chrome + indexable pages only (NOT quiz
UGC, NOT blindtest answer-matching); AI first pass + native review; keyword-
localized (not literal); reciprocal hreflang + x-default; phased one language at
a time.

THE KEY SAFEGUARD (against AI-translation indexation penalties): translated pages
ship NOINDEX and are flipped to INDEX (and only then added to the sitemap +
hreflang) AFTER native human review. Google never sees raw machine translation, so
there is no machine-translated-content quality risk. This is non-negotiable.

### Phase 0 - Infrastructure (English completely unaffected)
1. Subdirectory routing: English stays at the ROOT (no prefix, no URL changes);
   /pt/ for Portuguese. Middleware reads locale from the path prefix; default
   (no prefix) = English. NO IP auto-redirect (it traps Googlebot); a manual
   switcher + cookie only.
2. Dictionary system: per-locale JSON string files + a typed t() helper; the
   English dictionary is the source of truth.
3. Locale switcher UI (ui-ux-pro-max + frontend-design): on-brand, accessible,
   sets cookie + navigates to the same page in the chosen locale.
4. hreflang + canonical scaffolding: a helper that emits reciprocal alternates
   ONLY for locales where the page is reviewed + live, plus x-default to English;
   each locale self-canonicals.
5. Ship Phase 0 with ZERO behavior change for English. Verify no English URL moved
   or 301'd.

### Phase 1 - Portuguese (BR) content (shipped NOINDEX)
6. Page set: chrome strings + home, /blindtest intro copy, /faq, /about, /stats,
   the programmatic landing pages, /articles. NOT quiz UGC. Leave blindtest
   answer-matching logic 100% untouched.
7. Keyword research (searchfit-seo:content-translation): real pt-BR search terms
   ("quiz kpop", "teste de kpop", etc.). Localize H1s/titles/meta to those, not
   literal translations.
8. AI first-pass translation of chrome + indexable copy; every translated
   indexable string flagged needsReview.
9. Deploy pt-BR pages as NOINDEX, NOT in the sitemap, NO hreflang yet. Live for
   user preview, invisible to Google until reviewed.
10. Native review: a Brazilian reviewer polishes the indexable copy; mark each
    reviewed page approved.

### Phase 2 - Go live for Portuguese
11. Flip reviewed pages to INDEX, add them to the sitemap, enable hreflang
    (en <-> pt-BR + x-default) ONLY on reviewed pages.
12. Resubmit the sitemap in GSC; confirm hreflang via URL inspection.

### Phase 3 - Measure (4-8 weeks)
13. GSC: track impressions/clicks from Brazil + pt-BR indexation. Log pt queries
    in the AI-visibility tracker too.

### Phase 4 - Scale (es, then id)
14. Same pipeline per language: new dictionary -> keyword-localized AI first pass
    -> deploy NOINDEX -> native review -> flip to INDEX + sitemap + hreflang. No
    rearchitecting; just dictionary + reviewed-translation drops.

Guardrails: never index unreviewed MT; never translate quiz UGC or blindtest
answer-matching; keyword-localize not literal; hreflang only to existing+reviewed
versions; no bot auto-redirect; no em dashes in any language.

---

## Measurement loop

- GSC: indexed count climbing (from ~65), impressions trend (~90/day rising).
- AI visibility: monthly manual checks logged in the admin tracker (#7).
- Watch the consolidated /blindtest win the head term after the changes settle.
- Re-run the searchfit-seo audit monthly against the live site.

## Priority order for the pending work

5 (stats) + 6 (image/CWV) quick wins -> 4 (news photos) -> 7 (AI tracker) ->
8 (articles) -> 10 (indexation, once DB healthy) -> 11 (promotion, continuous).
