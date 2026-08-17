# Time-sliced index pages (S2 steal #3: Sporcle's freshness play)

## Claude Code Implementation Prompt

---

Cheap SEO win from the S2 competitor analysis: self-updating "popular right now"
index pages built from real play data. Zero new content writing, adds freshness
signals + internal-link depth. Sporcle's version of this compounds for years.

Hard rules: NO em dashes. REAL DATA ONLY, honesty gates everywhere. Commit per
step, do NOT push. New public routes -> route allowlist, check:routes green.
Static/ISR everything, safeFetch, NANO-cheap queries only.

## The pages (3 sitewide, v1)

- `/quizzes/popular-today` - top quizzes by plays in the last 24h
- `/quizzes/popular-this-week` - last 7 days
- `/quizzes/popular-this-month` - last 30 days

Per-group variants: NOT in v1 (87 groups x 3 windows = 261 mostly-thin pages =
index bloat + crawl waste at current volume). Revisit when daily plays 10x.

## Honesty gates (the difference between fresh and fake)

- A page renders its list only when >= 6 quizzes have >= 3 plays in its window.
  Below that: the page shows the honest smaller list it has IF >= 3 qualify,
  else it falls back to a labeled all-time top list ("Not enough plays today
  yet - here are the all-time favorites") - never a padded or silently-swapped
  list. State which state each page is in at build time in the report.
- Play counts shown per row = window plays ("214 plays this week"), not
  all-time (freshness = the claim; numbers must match it).
- ISR: today = revalidate 1800 (30 min), week = 3600, month = 21600. Cheap
  grouped queries on the existing plays indexes - verify with EXPLAIN-level
  sanity (report rows scanned).

## Page anatomy (each)

- H1 phrased as the query: "The most played K-pop quizzes today" (/week/month).
- One-line dated blurb: "Updated every 30 minutes from real plays. As of {ts}."
- Ranked list: rank number + existing QuizCard (with M1.14 teaser riding along
  free) + window-play count chip.
- Cross-links: the other two windows + /quizzes + /stats (small nav row) =
  the internal-link mesh.
- Metadata: title/description per window, canonical self, ItemList JSON-LD
  (positions real), sitemap entries with honest lastmod = generation time.
  NOT noindex - these are the product.

## Entry points (the mesh matters as much as the pages)

- /quizzes browse: small "Popular today · this week · this month" link row
  under the filters.
- Home: the "Trending this week" section's "See all" now points to
  /quizzes/popular-this-week (it currently points at the generic sort param -
  verify and swap if so).
- Footer: one "Popular quizzes" link (week variant).
- /stats: link to the month variant from the most-played section.

## Steps
1. Queries (3 windows, one shared fn) + real-output verification (paste top-3
   rows per window vs hand-run SQL). Commit.
2. Pages + metadata + JSON-LD + sitemap + allowlist. Commit.
3. Entry-point mesh (browse row, home see-all, footer, stats). Commit.
4. Verify: honesty gates exercised (force a thin window, confirm the labeled
   fallback), logged-out 200 on all 3, ISR symbols, mobile/desktop light/dark,
   check:routes, tsc, build, zero em dashes. Commit.

/caveman report: per-page state (full list vs fallback) with real numbers, query
cost, screenshots.
