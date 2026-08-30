# REPORT - SEO-IDX v2: the GSC 432, worked from the real URL lists. No push.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd`
printed before the work. No DDL, no DB writes (anon key, reads only), no push, no
title/meta edits. Live-domain requests used a custom user-agent, throttled.
Input: `docs/proofs/seo-idx/gsc-432.csv` (432 URLs). Proofs: `docs/proofs/seo-idx/`.

Bucket tally confirmed: 344 discovered, 48 crawled, 18 noindex, 11 redirect, 5
robots, 4 canonical, 2 redirect-error.

---

## PART 1 - the four suspects: all non-bugs or stale GSC

1. **`/q/pick-out-the-odd-artms-picture` noindex.** Live: HTTP 200 but the body is
   the **not-found page** (default title, site chrome, no quiz content) and it emits
   `<meta name="robots" content="noindex">`. Cause: the quiz query filters
   `.eq('status','published')` (`q/[slug]/page.tsx:52`); an unpublished/removed slug
   returns null, the page calls `notFound()` (lines 79, 148), and Next auto-noindexes
   the 404. This is CORRECT, not a class bug: no published quiz can reach that noindex.
   Closed.

2. **`/rankings/stray-kids/members` noindex.** Live now: HTTP 200, self-canonical, NO
   noindex. Cause found: `rankings/[group]/[type]/page.tsx:55` returns
   `robots: { index: false }` when `!r.public`, i.e. a ranking below
   `RANKING_UNLOCK_VOTES`. The page has since crossed the threshold and self-healed to
   indexable. GSC's label is stale. Working as designed. Closed.

3. **The two redirect ERRORS.** Both now resolve cleanly in ONE hop to a 200:
   `/blind-test/4th-gen-gg` -> 301 -> `/blindtest/4th-gen-gg` (200);
   `/group/stray-kids` -> 308 -> `/stray-kids-quiz` (200). No loop, no broken hop. The
   "error" was transient at crawl time (target not yet built). Healthy now. Closed.

4. **Old `/blind-test/group-{zico,mamamoo,jennie}`.** Each 301s to `/blindtest/group-*`,
   which serves a REAL playable playlist: Zico (a solo act) 10 songs, Mamamoo 10 songs,
   all indexable and self-canonical. No thin/empty 200, so no contradiction with W7d's
   advertisable rule. Closed.

**Net: zero code defects in Part 1.** Three of four are stale GSC snapshots of pages
that are now correct; one is correct-by-design (notFound noindex).

## PART 2 - the sitemap cross-check: no defects

Crossed all 432 against the live sitemap (708 URLs). Table in `crossref.txt`:

    bucket           total  in-sitemap  expected
    discovered        344      344      IN   OK
    crawled            48       21      IN   OK (the 27 absent are /_next/static chunks + old URLs)
    noindex            18        1      NOT  see below
    redirect           11        0      NOT  OK
    robots              5        0      NOT  OK
    canonical           4        0      NOT  OK
    redirect-error      2        0      NOT  OK

The single cross-bucket hit is `/rankings/stray-kids/members` (GSC-noindex yet in the
sitemap). That is suspect 2: it was noindex below the vote threshold, is now public,
and is therefore correctly in the sitemap AND correctly indexable. Not a defect, and
the Part 4.2 complete crawl (below) confirms zero live noindex-in-sitemap
contradictions across all 708. No old-scheme, robots-blocked or canonical-variant URL
is in the sitemap.

## PART 3 - the verse decision: the premise does not hold, so the decision is already made

The mission said the sitemap advertises 2,341 verse URLs. **The live sitemap advertises
2** (`/verse` teaser + `/verse/promises` covenant); 706 non-verse. See
`sitemap-composition.txt`.

Cause: `sitemap.ts` PUSH-GATE-1. `verseHidden()` returns `VERSE_PUBLIC !== 'true'`
(`lib/verse/visibility.ts:8`); with verse paused it is true, so `if (!verseHidden())`
is false and the entire bulk verse block (per-space pages, members, albums, songs) is
skipped. Only the two static pushes remain, both deliberate (the covenant is a real
indexed trust page). The 2,341 figure is the theoretical count if `VERSE_PUBLIC=true`.

So **verse is already pulled from the sitemap.** This is consistent with Cowork's own
observation that ZERO verse URLs appear in any GSC bucket: Google is not re-discovering
verse because it is not advertised. The "keep vs pull" decision is therefore already
resolved in code; the only residual choice is whether to also drop the 2 intentional
URLs, which the code keeps on purpose (teaser + covenant). No action taken. If the owner
wants zero verse in the sitemap, remove the two `push()` calls at `sitemap.ts:422-423`;
fully reversible, nothing deleted, pages stay live.

## PART 4 - carried over

**4.1 Group answer-first content intact.** Commit `7290675`'s diff of `answer-first.tsx`
is className-only (`answer-first-*` -> `af-*`) plus dropping a redundant
`chunks.length > 0` guard; every rendered value (`{answer}`, `{seoIntro}`,
`{c.question}`, `{c.answer}`) is an unchanged data binding. Live extraction on two group
pages confirms it: `/bts-quiz` and `/seventeen-quiz` each serve the lead paragraph plus
7 real Q&A pairs (headings + answers). No content change. No finding.

**4.2 `check:indexability` upgraded to a complete crawl by default.** The old gate
sampled one URL per route type (37 of 708), which is how a noindexed page slid through.
Now:
- COMPLETE by default (every sitemap URL), concurrency-limited (`INDEXCHECK_CONCURRENCY`,
  default 10) so 708 URLs finish quickly.
- `INDEXCHECK_SAMPLE` drops to the fast FLOOR (1 per type + all articles) for local smoke.
- The run announces its coverage: "COMPLETE crawl (all 708)" vs "FLOOR sample (37 of 708)".
- `INDEXCHECK_EXTRA` force-checks paths not in the sitemap, to prove the detector bites.

Proven both ways:
- RED: `INDEXCHECK_EXTRA=/battle` -> `FAILED (2): /battle emits robots NOINDEX ...`.
- GREEN: complete crawl of all 708 against production -> `passed: COMPLETE crawl (all 708)
  - 708 pages index-consistent`. This also empirically confirms Part 2: no live
  noindex-in-sitemap contradiction exists.

**4.3 Thin-page inventory (read-only, anon key).** `thin-inventory.txt`:
- The 17 crawled-not-indexed /q pages are all published, spanning 5 to 211 lifetime
  plays and 5 to 10 questions. The bucket is a MIX: genuinely thin ones
  (`mamamoo-the-curtain-call-era` 5 plays, `are-u-a-real-bunnie` 9 plays/5 q) sit next
  to substantial ones Google simply has not indexed yet (`blackpink-solo-careers-deep-dive`
  211, `itzy-discography-deep-dive` 207, `stray-kids-discography-challenge` 189). So
  "crawled not indexed" is not a single story; for the strong pages it is Google's
  discretionary queue, not a page defect.
- Across 406 published quizzes (complete, under the 1000-row cap): play_count < 50 = 177,
  play_count < 10 = 80, questions <= 5 = 85. Counts only, no unpublishing.

## Deviations and flags (loud)

1. **The mission's Part 3 premise was wrong and I recomputed rather than repeating it.**
   The sitemap does not advertise 2,341 verse URLs; it advertises 2. Verse was already
   pulled via PUSH-GATE-1. The mission (and the Cowork brief it quotes) carried a stale
   figure; the "ZERO verse in any bucket" line in the same brief already implied it.
2. **Every Part 1 suspect resolved to a non-defect.** That is the honest outcome. The
   only work products are the upgraded gate (4.2) and the inventories (4.3).
3. **One code change shipped: `check-indexability.mts`.** Committed, not pushed. It adds
   ~708 live requests when run complete, which is why FLOOR stays available for local use
   and the nightly is the right place for the complete run.

## Standing rules

Every number carries its command/denominator (see the proof files). No DDL, no writes,
no push, no title/meta edits. Live requests throttled with a custom UA. Skips: none in
Parts 1-3; Part 4 done in full.

---

STOP. Four suspects triaged (all non-defects), sitemap clean, verse already pulled (2 of
708), indexability gate upgraded to complete-by-default and proven red then green, thin
inventory pulled. Nothing pushed. Report ready.
