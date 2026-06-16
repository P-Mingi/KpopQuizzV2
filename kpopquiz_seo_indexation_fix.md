# kpopquiz.org — SEO Indexation Fix (Cowork brief)

Google Search Console snapshot (29/05/2026): 61 pages indexed, 426 not indexed. Indexation has plateaued for ~20 days. This document explains why and what to do.

---

## Diagnosis — read this first

The plateau is not a bug. It is a crawl-budget / content-quality signal. Google has discovered the pages but is choosing not to index them. Fixing this is about making the pages worth indexing, not about forcing Google to crawl.

The 426 non-indexed pages break down into 3 reasons (GSC "motifs"):

| Reason (FR) | Pages | Severity | What it means |
|---|---|---|---|
| Détectée, actuellement non indexée | 422 | HIGH | Google found the URLs but declined to crawl/index them. Quality + crawl budget signal. |
| Page avec redirection | 3 | MEDIUM | `/group/aespa`, `/group/seventeen`, `/group/stray-kids` are redirecting. |
| Explorée, actuellement non indexée | 1 | IGNORE | A JS chunk file (`_next/static/...`). Should never be indexed. Normal. |
| Indexée malgré blocage robots.txt | 1 | LOW | `/login` is blocked by robots.txt but got indexed anyway. Needs noindex. |

The 422 "Détectée" pages are the entire problem. Everything below targets them.

---

## Why "Détectée, actuellement non indexée" happens on this site

This status appears when Google's algorithms predict a page is not worth the crawl. For a quiz site with many templated pages (`/q/{slug}`, `/u/{username}`, `/group/{name}`), the usual causes are:

1. **Template similarity** — every quiz page shares the same DOM structure, same headings, same surrounding text. Google sees hundreds of near-identical shells and indexes only a sample.
2. **Thin unique content** — if the indexable HTML of a quiz page is mostly UI chrome (nav, footer, buttons) with little unique text, Google deprioritizes it.
3. **Weak internal linking** — pages that are only reachable through JS-rendered carousels or that have few internal links pointing to them get low priority.
4. **Client-side rendering** — if quiz content is rendered client-side (Next.js without SSR/SSG on these routes), Googlebot may see an near-empty HTML shell on first pass and defer indexing.

This is a Next.js app (confirmed by the `_next/static/chunks/` URL in GSC), so cause #4 is the prime suspect, followed by #1 and #2.

---

## Fixes — in priority order

### Fix 1 — Server-render or statically generate all public content pages (HIGHEST IMPACT)

This is almost certainly the root cause. Verify how each public route is rendered:

- Quiz pages (`/q/{slug}`), group pages (`/group/{name}`), user pages (`/u/{username}`), the quizzes browse page (`/quizzes`), games page (`/games`), and the home page must return fully-rendered HTML on first request — not a JS shell that fills in after hydration.

How to verify per route:
```bash
curl -s https://kpopquiz.org/q/{some-quiz-slug} | grep -i "<h1\|quiz question\|specific quiz title"
```
If the unique quiz content (title, question text, answer options, fun facts) is NOT present in the raw curl output, the page is client-rendered and Google sees an empty shell.

What to implement (Next.js App Router):
- For quiz, group, and user pages, use `generateStaticParams` + static generation (SSG) or server components that render the full content server-side.
- For frequently-changing data, use ISR (incremental static regeneration) with a revalidate window (e.g. `export const revalidate = 3600`).
- The quiz question text, answer options, author, and fun facts must be in the server-rendered HTML.

This single fix typically moves "Détectée" pages into the index within 2-4 weeks.

### Fix 2 — Make each quiz page's content genuinely unique in the HTML

Even with SSR, if pages look templated, Google samples them. For each quiz/group page, ensure the server HTML includes:
- A unique `<title>` and meta description per page (not a generic template) — e.g. "BTS Ultimate Era Quiz - 8 questions | kpopquiz" not "Quiz | kpopquiz".
- A unique `<h1>` with the actual quiz title.
- At least a short unique intro paragraph (2-3 sentences) describing this specific quiz — can be generated from the quiz metadata (group, difficulty, question count, author).
- Structured data: add `Quiz` schema.org JSON-LD on quiz pages, `BreadcrumbList` on all pages. This helps Google understand and trust the page type.

### Fix 3 — Strengthen internal linking to orphan pages

The 422 detected-but-not-indexed pages likely have few internal links. Add crawlable `<a href>` links (not JS onClick navigation) so Googlebot can follow them:
- The `/quizzes` page must link to every quiz with a real anchor tag, paginated with crawlable `?page=N` links or a "load more" that also exposes links in a `<noscript>` or paginated URL.
- Group pages should link to all quizzes for that group.
- Add a related-quizzes section at the bottom of each quiz page linking to 4-6 other quizzes.
- Ensure the sitemap is linked and current (see Fix 5).

### Fix 4 — Fix the 3 redirecting group pages

`/group/aespa`, `/group/seventeen`, `/group/stray-kids` are returning redirects. Determine intent:
- If group pages should exist: remove the redirect, make them return 200 with real content, and include them in the sitemap.
- If group pages are deprecated: that's fine, but remove them from the sitemap so Google stops trying to index them, and make sure nothing internally links to them.

Given the redesign keeps group filtering (see main redesign doc Section 2e / 3b), group pages should probably resolve to `/quizzes?group={name}` with a 200 response, OR become real indexable landing pages. Decide and make them consistent.

### Fix 5 — Clean up robots.txt and noindex

- `/login` is indexed despite robots.txt. robots.txt blocks crawling but not indexing. To remove it from the index: REMOVE the robots.txt disallow for `/login`, and instead add `<meta name="robots" content="noindex">` to the login page. Google must be able to crawl the page to see the noindex tag. Same for any other auth/account/admin pages.
- Add `noindex` to: `/login`, `/signup`, `/create` (the editor itself), `/admin/*`, and any user settings pages.
- Do NOT noindex: quiz pages, group pages, user profile pages, `/quizzes`, `/games`, `/blindtest`, home.

### Fix 6 — Verify and resubmit the sitemap

- Confirm `sitemap.xml` exists, is current, and lists all canonical indexable URLs (quiz pages, group pages, user pages, static pages).
- It must NOT include: redirecting URLs, noindexed URLs, JS chunk files.
- Each entry should have an accurate `<lastmod>`.
- After Fixes 1-5 are deployed, resubmit the sitemap in GSC and use "Validate Fix" on the "Détectée, actuellement non indexée" report.

### Fix 7 — Canonical tags

Ensure every page has a self-referencing canonical tag (`<link rel="canonical" href="https://kpopquiz.org/q/{slug}">`) in the server-rendered HTML. This prevents Google from treating similar quiz pages as duplicates of each other.

---

## Verification checklist (run after deploy)

```bash
# 1. Quiz page returns full content server-side (should show quiz title + questions)
curl -s https://kpopquiz.org/q/{slug} | grep -i "quiz-title\|question"

# 2. Unique title per page
curl -s https://kpopquiz.org/q/{slug-A} | grep "<title>"
curl -s https://kpopquiz.org/q/{slug-B} | grep "<title>"
# → must differ

# 3. Canonical present
curl -s https://kpopquiz.org/q/{slug} | grep "canonical"

# 4. Login is noindex (not robots-blocked)
curl -s https://kpopquiz.org/login | grep -i "noindex"

# 5. Group pages return 200, not 301/302
curl -sI https://kpopquiz.org/group/aespa | head -1

# 6. Sitemap is reachable and current
curl -sI https://kpopquiz.org/sitemap.xml | head -1
```

---

## Expected timeline

- After deploying Fix 1 (SSR/SSG): Google needs 2-4 weeks to re-crawl and re-evaluate. Indexation should climb as pages move from "Détectée" to "Indexée".
- Use GSC "Validate Fix" on the Détectée report after deploy — this signals Google to re-prioritize the crawl.
- Do not expect instant results. The plateau will break once Google re-crawls and sees real server-rendered, unique, well-linked content.

## What NOT to do

- Do not mass-request indexing via the URL Inspection tool for 422 pages — it won't help and Google rate-limits it. Fix the root cause instead.
- Do not add more pages until the existing ones index. More templated thin pages will worsen the ratio.
- Do not block the non-indexed pages in robots.txt to "clean up" the report — that hides the problem, it doesn't solve it.
