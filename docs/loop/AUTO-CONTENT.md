# AUTO-CONTENT - the content-engine autopilot (self-contained run-doc)

A fresh, scheduled Claude session executes THIS FILE start to finish with no prior context, and ships
ONE fact-checked AEO article as a CI-green PR. **It never merges and never pushes to main** - a human
merges every article. Cowork owns the schedule + the owner email; this doc owns the machinery.

If anything here is ambiguous or a gate fails and cannot be fixed in-run, stop and write one line to
`docs/loop/BLOCKED.md` with the reason, leave the branch/PR as-is, and emit the email payload with a
`"status": "blocked"` field. Do not guess past a failure.

## 0. Preconditions (verify first, in order)
1. **Repo guard**: `git remote -v` must be `https://github.com/P-Mingi/KpopQuizzV2.git`. Else stop,
   one line in `docs/loop/BLOCKED.md`.
2. **Sync main**: `git fetch origin main && git checkout main && git reset --hard origin/main`.
   (Untracked files from other work are left alone; never commit files you did not create.)
3. **Read the machinery**: `docs/seo/CONTENT-ENGINE.md` (the v1 pipeline + the exact 3-file wire-up),
   `docs/seo/KPOP-SOURCES.md` (grounding + fact-check rules), `docs/seo/CONTENT-BACKLOG.md` (the queue),
   `docs/seo/GSC-21SEP.md` (real queries), `docs/seo/STRATEGY.md` (W3). Everything needed is in-repo.

## 1. Pick the next topic
- Default: the **top unblocked row of `docs/seo/CONTENT-BACKLOG.md`** that is not already shipped
  (check `src/lib/articles/registry.ts` slugs - skip any already present).
- **Freshness override**: if a major comeback/debut is live in the Tier B sources
  (`KPOP-SOURCES.md`: Soompi / allkpop / official SNS), prefer an article on that instead - freshness
  is the strategy's #1 weapon (`STRATEGY.md`).
- **Non-cannibalization**: reject anything whose target query is already owned by a hub/quiz/article
  (a bare "{group} quiz" head term belongs to the `/{group}-quiz` hub; only take the explainer /
  long-tail / synonym surface). See CONTENT-ENGINE.md step 1.
- Record the pick + a one-line data rationale (GSC impressions/position, or the freshness event).

## 2. Research + fact-check (the grounding step)
For every group/member/generation/date/song claim the article will make, verify against
`KPOP-SOURCES.md`:
- Roster + debut + fandom name from Tier A (kprofiles + Kpop Wiki / official), cross-checked.
- Generation: only label uncontested buckets; boundary/post-2023 groups get a neutral phrase.
- Counts/titles: only assert what you can source; stay qualitative on anything unconfirmed.
Keep a short **fact-check note** (what you verified + what you hedged and why) - it goes in the email
payload. If a load-bearing fact cannot be verified, reframe the article so it does not depend on it.

## 3. Draft the article (v1 pipeline, exactly)
Follow `docs/seo/CONTENT-ENGINE.md` steps 3-4:
- Body file `src/lib/articles/content/{slug}.tsx`: `export function ArticleBody()` returning a
  fragment. Answer-first `art-lead`; question-style `<h2 id>` only (route owns the `<h1>`);
  `art-cta-inline` with `art-cta-btn` / `art-cta-secondary` `Link`s to the internal-link targets;
  `art-highlight` for a real tip; ordered lists only for real sequences.
- Voice: confident, concrete, no fluff, no hype, **no emoji, no em dashes** (house rule).
- Internal links (exact-match anchors) to the right hub/quiz/blindtest - the article's SEO job is to
  pass authority into a money page.

## 4. Wire it up (the deterministic 3-file edit)
1. `src/lib/articles/registry.ts` - add the `ArticleMeta` at the TOP of `ARTICLES` (newest-first):
   `slug`, `title` (lead with the target query; MUST NOT contain "KpopQuiz" - root adds
   `%s | KpopQuiz`), `description` (~150-160 chars, query once, no doubled brand), `category`,
   `publishedAt`/`updatedAt` (today), `coverAlt`, `tags`, `relatedLinks[]`, `faq[]` (each faq -> a
   FAQPage Q/A; keep answers fact-safe).
2. `src/lib/articles/content/index.ts` - add `'{slug}': () => import('./{slug}')` to `CONTENT_MAP`.
3. **Anti-orphan**: add one `relatedLink` FROM an existing live article TO the new slug, so it is
   contextually linked from a ranking page (not just the `/articles` index).
Sitemap + Article/FAQPage/BreadcrumbList JSON-LD are automatic from
`src/app/(site)/articles/[slug]/page.tsx`. No manual sitemap edit.

## 5. Self-check + branch + PR (CI-green, never merge)
Gates (all must pass before the PR is considered done):
- Start the dev server (Bash, NOT preview_start which is blind to this repo):
  `pnpm --filter quiz dev` - the script already pins `-p 3021`; do NOT pass `-- -p 3021`.
- Render: `curl -s localhost:3021/articles/{slug}` returns 200; title is single-brand; grep the HTML
  for `"@type":"Article"` + `"FAQPage"` + `"BreadcrumbList"` and confirm each ld+json block parses.
- In sitemap: `curl -s localhost:3021/sitemap.xml | grep -c {slug}` >= 1.
- Dedup (the crawl gate is too slow vs a dev server): assert the new title + description are unique
  across `ARTICLES` (a 6-line tsx script over the registry). The full `check-metadata-dupes` crawl
  runs green in CI.
- Dash/emoji sweep: 0 em dashes (U+2014), 0 en dashes (U+2013), 0 emoji in the body + registry entry.
- Build gates: `npx tsc --noEmit`, `pnpm --filter quiz test:unit`, `pnpm --filter quiz build` (exit 0).
- Stop the dev server when done (`lsof -ti:3021 | xargs kill -9`).
Then:
- Branch `content/auto-{slug}` from main. Stage ONLY the files you created/edited (by explicit path;
  `git add -f` the `docs/seo/*` docs - `docs/*` is gitignored except loop/proofs/data/loop-seo).
- Commit (end message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`), push, and
  `gh pr create --base main` with a clear title. Wait for CI; it must be green. **DO NOT MERGE.**

## 6. Emit the email payload (Cowork sends it, not you)
Write `docs/proofs/auto-content/EMAIL-{slug}.json`:
```json
{
  "status": "ready_for_review",
  "slug": "{slug}",
  "articleTitle": "...",
  "targetQuery": "...",
  "gsc": "impressions + position, or the freshness event",
  "prUrl": "https://github.com/P-Mingi/KpopQuizzV2/pull/N",
  "summary": ["line 1", "line 2", "line 3"],
  "factCheckNotes": "what was verified against which sources; what was hedged and why",
  "seoCheck": "render 200 / schema valid / in sitemap / inbound-linked / no dupes / 0 emdash",
  "internalLinks": ["/blindtest", "..."],
  "ciRunUrl": "https://github.com/P-Mingi/KpopQuizzV2/actions/runs/..."
}
```
**Cowork** reads this JSON and sends the email to the owner via Resend (Cowork-side). This session
does NOT send email and does NOT merge.

## What is automatic vs needs a human
- **Automatic (a scheduled session does all of this unattended):** topic pick, fact-check research,
  draft, the 3-file wire-up, all self-check gates, branch + commit + push + open PR, the email payload.
- **Human only:** the final PR **merge** (the quality gate), and Cowork pressing send on the Resend
  email + owning the schedule. No step here writes to the DB or pushes to main.
