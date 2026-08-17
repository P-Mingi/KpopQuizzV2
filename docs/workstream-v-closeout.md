# V closeout - honest rankings unlock + new-games SEO pass

## Claude Code Implementation Prompt

---

Two final tasks closing Workstream V. NO em dashes. Real data only. Commit per
step, do NOT push. check:routes green.

## Task 1 - Rankings: threshold 30 + provisional display (owner-approved)

The "0/500 votes" walls look dead. Owner decision: NO simulated votes ever
(hard rule); instead make the real votes visible sooner.

1. Unlock threshold: 500 -> 30 votes. Wherever the threshold constant lives
   (rankings page + games teaser + anywhere else it gates), one source of truth.
2. Provisional mode BELOW threshold: instead of a locked "vote to unlock" card,
   show the CURRENT standings computed from existing votes, clearly labeled:
   "Early results · {N} votes · still moving" with the top 3 visible and a
   prominent "Vote to shape this ranking" CTA into the duel. Zero votes = keep
   the current locked state (nothing to show is nothing to show).
3. Vote counts displayed everywhere = real counts, always ("ranked by 47 fans").
4. Verify: a ranking with ~5 real votes renders provisional with honest label;
   one at 30+ renders as live; zero-vote renders locked. Screenshots of all
   three states.

## Task 2 - New-games SEO maximization

Every V playlist page + mode index becomes a real search asset:

1. Titles/metas per playlist against the query patterns (sentence-case, <= 60
   chars where possible, real counts): "K-pop Quiz: Boy Group or Girl Group?
   59 Groups to Sort" / "Match the K-pop Song to the Group - Free Game" /
   "Name All 79 K-pop Groups - How Many Can You Get?" etc. Every number real
   and derived from the playlist data at build.
2. Each playlist page: one crawlable intro paragraph (2-3 sentences, honest,
   query-phrased H1), breadcrumbs, WebPage JSON-LD, canonical.
3. OG image per MODE (not per playlist v1): reuse the OG-route pattern, mode
   name + one-line hook + brand.
4. Internal-link mesh INTO the games: group pages link relevant playlists
   ("Sort {gen} groups", "Match songs to groups"); articles that mention games
   link the modes; time-sliced pages footer-link the games hub; /stats links
   nothing new (keep it data-pure).
5. Sitemap: all mode indexes + playlists with honest lastmod. llms.txt gains
   one line for the games section.
6. Verify: all pages 200 logged-out, titles SSR-rendered, zero em dashes,
   sitemap valid, tsc + build + check:routes green.

/caveman report per task with screenshots (the three ranking states + 3 sample
playlist SERP-preview snippets).
