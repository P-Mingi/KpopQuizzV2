# CONTENT ENGINE v1 - the repeatable AEO-article pipeline

This is the concrete, re-runnable process for shipping one SEO/AEO article on KpopQuiz.
Articles are TSX files in the repo. There is **zero DB / DDL** in this pipeline: an article is
code, so it is PR-gated and reviewable like any other change. This doc is written so the next
article is a repeat of the last, and so a cron can later automate the mechanical steps (flagged
`[CRON]` below).

Proof that this format ranks: `/articles/guess-the-kpop-idol-guide` (53 clicks) and
`/articles/hardest-kpop-quizzes` (29 clicks) are both this exact pattern (see `docs/seo/AUDIT.md`).

---

## The 5 steps

### 1. Keyword selection (from real GSC data)
Source of truth is `docs/seo/GSC-21SEP.md` (the owner's 6-month export), read against
`docs/seo/STRATEGY.md` W3 (the intent gaps) and `docs/seo/AUDIT.md`.

Pick a query that satisfies **all** of:
- **Proven intent**: it already appears in GSC with impressions (people search it), OR it is a
  named strategy gap ("open field", low competition).
- **Non-cannibalizing**: it does NOT duplicate the primary target of an existing hub, quiz, or
  article. An article that would compete with `/blindtest`, `/quizzes`, a `/{group}-quiz` hub, or a
  live article for the *same* head term is rejected. The article must widen the query surface (a
  new long-tail, a dated variant, a synonym cluster), not fight our own page for one term.
- **Fit for an article, not a page**: the query wants an explainer/answer, not a tool. "how to",
  "what is", "best", "vs", "2026", "guide", "name all" = article. A bare group name or "quiz" = a
  hub/quiz page already owns it.

Record the pick with a one-line data rationale (impressions + position if it appears in GSC).

### 2. Brief (write it before drafting)
A five-line brief locks scope:
- **Target query** (+ GSC impressions/position, or the strategy note that names it).
- **Search intent** (informational / comparison / how-to / localized).
- **Internal-link target**: the ONE hub/quiz/blindtest page this article must funnel to with an
  exact-match anchor (plus 1-2 secondary links). This is the whole SEO point of the article: it
  passes authority to a money page.
- **Angle**: the specific, non-generic take that makes it non-cannibalizing.
- **Schema type**: `Article` always; add `FAQPage` when the piece answers discrete questions
  (it almost always should for AEO); `BreadcrumbList` is automatic from the route.

### 3. Draft (site voice, answer-first, factually correct)
Write the body as `src/lib/articles/content/{slug}.tsx` - a single `export function ArticleBody()`
returning a fragment. Rules, matching the ranking articles:
- **BLUF lead**: open with `<p className="art-lead">` that answers the query in the first two
  sentences. AEO engines lift the first direct answer; bury it and you lose the snippet.
- **Question-style H2s** with `id`s (`<h2 id="how-to-win">How do you win a K-pop blind test?</h2>`).
  Each H2 is a question a user actually asks; the paragraph under it answers immediately. The route
  supplies the single `<h1>`, so the body uses `<h2>`/`<h3>` only.
- **Voice**: confident, concrete, no fluff, no hype, no emoji, and **no em dashes** (house rule).
- **Facts**: verify every K-pop fact against the site's own `kpop-generations-explained` article
  and known reality. **Never fabricate** members, debut dates, song titles, counts, or a group's
  generation. When a number is unconfirmed (e.g. the blindtest song count, currently 300-vs-4000
  and unresolved), state the fact qualitatively ("hundreds of songs across every generation")
  rather than asserting a figure. A wrong fact is a worse outcome than a vaguer sentence.
- **Structure devices** (`art-highlight` tip callouts, ordered lists) only when the content is
  genuinely a tip or a real sequence, never as decoration.
- **CTAs**: `<div className="art-cta-inline">` with `art-cta-btn` (primary) + `art-cta-secondary`
  (secondary) `Link`s to the brief's internal-link targets. At least one CTA above the fold and one
  at the end.

### 4. Wire-up (metadata + schema + links + sitemap)
Three edits register the article; the route does the rest automatically.
- **`src/lib/articles/registry.ts`** - add an `ArticleMeta` at the **top** of `ARTICLES`
  (newest-first): `slug`, `title`, `description`, `category`, `publishedAt`/`updatedAt`,
  `coverAlt`, `tags`, `relatedLinks[]`, `faq[]`.
  - **Title**: lead with the target query; keep it a clean name. Do NOT append the brand - the root
    layout adds `%s | KpopQuiz`, so a title containing "KpopQuiz" would double the brand.
  - **Description**: ~150-160 chars, benefit-first, contains the query once, no doubled brand.
  - **`faq[]`**: each entry becomes a `FAQPage` Q/A in JSON-LD. Keep answers self-contained and
    fact-safe (no unconfirmed counts).
  - **`relatedLinks[]`**: the on-page outbound links (hub/quiz/blindtest + a sibling article).
- **`src/lib/articles/content/index.ts`** - add `'{slug}': () => import('./{slug}')` to
  `CONTENT_MAP` so `loadArticleContent` can resolve the body.
- **Anti-orphan**: add a `relatedLink` **from at least one existing live article** to the new one,
  so it is internally linked from a ranking page, not just from the `/articles` index. (The
  `/articles` index + sitemap already list it via the registry; this adds a contextual link.)
- **Sitemap + schema are automatic**: `src/app/(site)/articles/[slug]/page.tsx` emits
  `Article` + `FAQPage` + `BreadcrumbList` JSON-LD from the `ArticleMeta`, and `sitemap.ts`
  includes every non-`noindex` article. No manual sitemap edit.

### 5. Self-check (before the PR)
Run the project's SEO gates against a running dev server (`:3021`) - they are the concrete
seo-check for this repo:
- `pnpm --filter quiz dev -- -p 3021` (server up).
- `npx tsx scripts/check-metadata-dupes.mts` - no duplicate title/description across the sitemap.
- `npx tsx scripts/check-orphans.mts` - the new article is reachable (not orphaned).
- `npx tsx scripts/check-indexability.mts` - the article is indexable + in the sitemap.
- `curl -s localhost:3021/articles/{slug}` - renders 200; grep the HTML for the `Article` and
  `FAQPage` JSON-LD blocks and validate them (paste into a schema validator, or assert the
  `@type` fields are present and well-formed).
- `npx tsc --noEmit`, `pnpm --filter quiz test:unit`, and `next build` (exit 0) before opening the PR.

Manual AEO pass (30 seconds, eyeball): lead answers the query in sentence one; every H2 is a real
question; the internal-link anchors are exact-match; title/description carry the query once with no
doubled brand; zero em dashes; zero emoji; no fabricated fact.

---

## What a cron would automate later (v2)

The pipeline splits cleanly into judgement (stays human/Claude) and mechanics (`[CRON]`):

- **Step 1 keyword selection** - semi-automatable. `[CRON]` can pull the GSC API weekly, diff
  against the registry's existing `slug`/`title`/target-query set, and surface a ranked candidate
  list (impressions x position, minus anything that overlaps an existing page). The final
  non-cannibalization call stays human.
- **Step 2 brief** - `[CRON]` can pre-fill target query, impressions/position, and the likely
  internal-link target (by matching the query to an existing hub/quiz slug). Angle stays human.
- **Step 3 draft** - Claude writes it. A `[CRON]` can trigger the draft from a brief, but the fact
  verification gate must stay enforced (a fact-check step that fails the run on an unverifiable
  member/date/count claim).
- **Step 4 wire-up** - fully `[CRON]`-automatable: appending the `ArticleMeta`, the `CONTENT_MAP`
  entry, and one anti-orphan `relatedLink` are deterministic edits from the brief + body.
- **Step 5 self-check** - fully `[CRON]`: the four gate scripts + tsc + unit + build already run
  headless; wire them as required checks. The cron opens the PR and stops. **A human still merges**
  (per the hard fence: no push to main; Cowork audits, owner merges).

Backlog to feed the engine: `docs/seo/CONTENT-BACKLOG.md` (the ranked queue of the next ~10).
