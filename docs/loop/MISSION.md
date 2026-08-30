# MISSION (SEO-IDX v2 - the GSC 432, now with the real URL lists. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**`cat` this file.** This replaces the earlier SEO-IDX draft: the owner exported the
per-reason URL lists from GSC and Cowork has already classified them. **The input is
`docs/proofs/seo-idx/gsc-432.csv`** (bucket,url for all 432). Work from it; do not
re-derive the buckets.

## WHAT COWORK ALREADY ESTABLISHED (do not re-litigate, verify where told)
The trajectory is healthy (59 -> 399 indexed in 82 days, impressions x10). Most buckets
are our own architecture echoing back:
- **redirect (11)**: all old-scheme URLs (`/group/<slug>`, `/blind-test/*`,
  `/games/this-or-that/<type>`). Our own SEO consolidation: next.config.ts:20 308s
  `/group/:slug`, middleware.ts:59 301s `/blind-test/*`. EXPECTED, provided none of these
  old URLs is in today's sitemap.
- **robots (5)**: `/api/og/*` and `/login`. Deliberate. EXPECTED.
- **canonical (4)**: query-string variants (`?daily=game`, `?group=...`) canonicalising
  to the clean URL. Working as designed. EXPECTED.
- **discovered-not-indexed (344)**: the crawl queue, and its composition is the strategic
  finding: **187 /q quiz pages, 53 /blindtest playlists, 29 /games, 19 /rankings, 8 /pt.
  ZERO verse URLs anywhere in any bucket.** Google has not even processed most of the
  2,341 verse URLs the sitemap advertises. No technical fix exists for this bucket.
- **noindex (18)**: mostly deliberate (`/battle`, `/battle?quiz=...` x8, `/u/*` x5,
  `/create`, `/news`). EXPECTED, minus the two suspects below.
- **crawled-not-indexed (48)**: 18 are `/_next/static/*` hashed chunks/fonts with `?dpl=`
  params (ephemeral per-deploy noise, standard advice is to leave JS/CSS crawlable, no
  action unless you find otherwise); the rest are 17 real /q pages, 2 articles, 3 old
  `/blind-test/group-*` and a few landing pages.

## PART 1 - the four real suspects, one by one
1. **`/q/pick-out-the-odd-artms-picture` reported noindex.** There is no noindex logic
   greppable in `src/app/q/[slug]/page.tsx`. Establish WHY Google saw noindex: quiz
   unpublished? A robots field in a metadata helper? Serve the URL from a production
   build and read the actual meta. If a published quiz page can emit noindex, that is a
   class bug, find the rule. If the quiz is simply unpublished/gone, say so and close.
2. **`/rankings/stray-kids/members` reported noindex** while 19 other /rankings URLs sit
   in the ordinary queue (so rankings are indexable). Same treatment: find the rule
   (threshold gating?) or the bug.
3. **Two redirect ERRORS**: `/blind-test/4th-gen-gg` and `/group/stray-kids`. Trace the
   full chain with curl -IL against the live domain: loop, chain length, or broken hop.
   Fix the chain if it is ours (a redirect should land on a 200 in one hop).
4. **Old `/blind-test/group-{zico,mamamoo,jennie}` show as CRAWLED not redirect**: check
   what those URLs serve today after the middleware 301, and what the TARGET serves
   (zico is a solo act: does /blindtest/group-zico 200 with a thin/empty page, 404, or
   redirect?). A 200 on an unplayable playlist would contradict W7d's advertisable rule.

## PART 2 - the sitemap cross-check (the contradiction test)
Cross `gsc-432.csv` against the live sitemap: which of the 432 are IN the sitemap?
Expected: the discovered/crawled buckets yes (they are our real pages), the redirect /
noindex / robots / canonical buckets NO. Any old-scheme, noindexed or robots-blocked URL
that IS in the sitemap is a real defect: fix smallest-diff. Report the counts per bucket.

## PART 3 - the verse decision, prepared with numbers
The queue is 344 deep in core quiz pages while the sitemap advertises 2,341 verse URLs
for a PAUSED product Google is not even processing. Quantify: sitemap composition
(verse vs non-verse), and what pulling verse from the sitemap while paused would change
(URLs advertised, nothing deleted, fully reversible; verse pages stay live and linked).
Lay out keep vs pull with trade-offs. **Do not act. Owner decision.**

## PART 4 - carried over from SEO-IDX v1
1. Commit 7290675 restyled `answer-first.tsx` (W8 SEO component) and the group FAQ, and
   no proof covered group pages. Extract the served answer-first text on two group pages
   and diff against the strings the d7103b1 version produced. Content changes = finding.
2. Upgrade `check:indexability` to a complete crawl by default (the W7c orphan-gate
   pattern): `INDEXCHECK_SAMPLE` stays as the fast local cap, output says complete vs
   floor, proven red on an injected contradiction then green. The 37-of-708 sample is how
   a noindexed quiz page went unnoticed.
3. The 17 real /q pages in crawled-not-indexed: pull their lifetime plays and question
   counts from the DB (read-only) alongside the thin-page inventory (<50 plays, <10
   plays, <=5 questions across published quizzes). Counts only, no unpublishing.

## STANDING RULES
- A mission is not finished until docs/loop/REPORT.md describes it. Skips named loudly.
- Every number carries its command and denominator. Recompute before prose.
- Live-domain requests throttled, custom user-agent.
- No DDL, no DB writes, no push, no title/meta edits.
- Proofs in docs/proofs/seo-idx/.
