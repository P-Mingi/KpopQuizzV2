# REPORT - W5 PART 1: the report page is built and shipped verbatim. Two figures BLOCKED.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every gate run. No DDL, no database writes, **nothing pushed**. I am treating every
commit from here as one push away from production, per your note.

Proofs: `docs/proofs/w5-part1/`.

---

## BLOCKED: two figures in the draft do not match the report's own window

Filed as `w5-report-figures`. I did not fix either one.

**1. The perfect-score and zero-score shares are all-history, not the window.**

    Draft: "Across the whole window, one attempt in five is a perfect score, and 2.1%
            score zero."

    Recomputed against the live table:
      May-Aug (the report's window, n=17,435):  perfect 35.9%   zero 0.6%
      All history (n=59,417):                   perfect 20.6%   zero 2.1%

20.6% and 2.1% are the all-history figures from dataset section G5. The method section three
scroll-lengths above explains why 70.7% of that history is excluded, so the report currently
excludes a period and then quotes a statistic computed on it. In-window, one in five is
closer to one in three.

**2. "published quizzes per group run from 3 to 27" cannot be true of 21 groups.**

Across the 21 compared groups the range is **3 to 152**; the maximum is `general-kpop`, the
catch-all bucket, at 152 published quizzes. It is 3 to 27 only if you exclude it, and then
it is 20 groups, not 21. The sentence is right about the numbers or right about the count,
not both. Dataset section Q lists all 21 rows.

Both are one-line edits in the draft and both are yours. **This is the reason not to pitch
yet**: the report hands the journalist the dataset that contradicts it.

## What is built

`/data/knowledge-report-2026`, prose verbatim from v3. No number, ranking or example added,
nothing softened, nothing moved below the fold, no charts, no explorer, no capture, no share
widgets.

## The four hard constraints

**1. Not an orphan.** `check:orphans` green, unscoped, complete crawl of **706** non-verse
URLs (705 + this page). Its inbound links are structural, not minted: the **footer** already
indexes data work and now lists Knowledge Report beside Pulse, and the **`/data/pulse`
index** links its sibling first-party report in the citation footer where it already points
readers at our data.

**2. Unique metadata.** `check:metadata-dupes` still **8 collision groups**, unchanged, and
`knowledge-report` appears in **0** of them. Title is `The K-pop Knowledge Report 2026`
(root layout appends the suffix, so it is not doubled).

**3. The dataset ships beside it.** `/data/knowledge-report-2026/dataset` serves
`docs/data/w5-dataset.md` **byte-identical**, 52,416 bytes, all 16 sections including the
discarded findings. Read at build time from the single copy in the repo, so the page cannot
drift from the doc. Two links to it on the page, one in the header line and one on the
closing sentence that promises it.

**4. All four gates, cwd printed before each:** `check:docs-secrets` **0** ·
`check:routes` **0** · `check:indexability` **0** · `check:orphans` **0** ·
`check:metadata-dupes` unchanged.

## The 59,000 problem

`/stats` untouched, no caveat added, no reconciling sentence invented. The defusing
paragraph is in the served HTML, in full, in normal body type: "17,425 completed attempts
across 76 quizzes" and "at a cost of 70.7% of our raw volume" both present, and there are
**zero `<details>` elements on the page**, so nothing is collapsed behind anything.

## Schema

`Report`, not `Article` and not a bare `Dataset`. `headline`, `datePublished`, `inLanguage`,
`author` and `publisher` as `Organization`, and the dataset attached via `isBasedOn` as a
real `Dataset` carrying `temporalCoverage: 2026-05-01/2026-08-17`, a CC-BY `license`, and a
`DataDownload` distribution with `encodingFormat: text/markdown` pointing at the live route.
Parsed out of the served HTML rather than eyeballed.

## Decisions worth your veto

1. **The dataset route is deliberately not in the sitemap** and carries
   `X-Robots-Tag: noindex, follow`. It is a raw markdown file, not a page competing for a
   query, and keeping it out means it can never become an orphan-gate or duplicate-metadata
   problem. It is reachable, which is what the report promises. Verified: 0 occurrences in
   the sitemap, the report itself 1.
2. **`text/markdown`, not a rendered HTML page.** A journalist gets the raw file with the
   SQL in it, which is the point of the offer, and it costs no renderer and no second design.
3. **Footer placement.** A footer link is a weak link, but the footer is where this site
   already indexes its data work, and the mission's rule is to link where it belongs rather
   than where it would rank. The Pulse index link is the stronger one.

## Deviations and flags (loud)

1. **I built the page while blocking on its content.** The alternative readings were to stop
   entirely, or to fix two numbers I was explicitly told not to touch. Building means the
   page is ready the moment you rule; blocking means it should not be pushed or pitched
   until you do. If you would rather it did not exist on disk until the figures are settled,
   say so and I will revert the route in one commit.
2. **The live table has moved since the dataset snapshot**: 17,435 usable in-window plays
   now against 17,425 in the file. That is people playing, not an error, and the report
   cites a snapshot. Worth knowing before anyone re-runs a figure and gets a different last
   digit.
3. **`Report` is a thin schema.org type.** I used it because it is the accurate one; a
   richer `Dataset`-first shape would describe the wrong primary object. If a Tier 1 target
   turns out to need `Article` for their CMS, that is a one-line change.

## Covenant

The prose is the draft, unaltered. Every figure I checked was recomputed against the live
table rather than read back from the file, which is what surfaced both blocked items. Every
claim in this report is verified against the served HTML of a production build.

## Next

`w5-report-figures` is the one thing standing between this page and a pitch.

---

STOP. **Nothing was pushed.** report pret.
