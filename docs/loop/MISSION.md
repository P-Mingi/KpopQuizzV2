# MISSION (W5 PART 1 - the report landing page. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**The 47 commits are PUSHED.** `origin/main` is at `fab3911`, working tree ahead by 0. So
from here every commit is one push away from production - the standing "nothing is live"
assumption no longer holds. Still no push from you.

## WHAT THIS IS
The K-pop Knowledge Report needs somewhere to land before anyone is pitched. Four Tier 1
journalists can be approached exactly once each, and a pitch that arrives before the page
exists is spent. `docs/PLAY-W5-DISTRIBUTION.md` has the targets and the sequence.

## THE CONTENT IS WRITTEN. DO NOT WRITE MORE.
The text is `docs/PLAY-W5-REPORT-DRAFT.md`, v3, and it is the output of four rounds of
testing that killed three findings. **Ship it verbatim.**

- **Do not add a number, a percentage, a ranking or an example.** Every figure in that draft
  is traceable to `docs/data/w5-dataset.md`, and one invented number destroys the only thing
  this report is trading on.
- Do not soften the "What we cannot say" section, do not shorten it, and do not move it
  below the fold. It is the credibility of the piece, not an appendix to it.
- If you believe a figure in the draft is wrong, **BLOCK and say which**. Do not fix it.
  Two of the three findings in v2 were killed by exactly that kind of check.

Layout, typography and structure are yours.

## HARD CONSTRAINTS, because our own gates will catch you
1. **The page must not be an orphan.** `check:orphans` runs unscoped over every non-verse
   sitemap URL. A new sitemap entry with no inbound link turns it red. Link it from
   surfaces where it genuinely belongs - `/data` indexes data work, and the report is about
   our own play data. Follow the W7c principle: link it where it belongs structurally, or
   leave it out of the sitemap. Do not mint a link from an unrelated page to clear a gate.
2. **Unique title and meta description.** `check:metadata-dupes` is already red on one known
   collision; do not add a second.
3. **The dataset ships beside the report.** "Full figures, queries and sample sizes are
   published alongside" is a sentence in the draft, so it has to be true. A reachable,
   readable page or file carrying `w5-dataset.md` in full. That offer is what separates
   this from a brand doing PR, and a Tier 1 journalist will click it.
4. **Run all four gates before you report**, including `check:docs-secrets`, and print the
   cwd before each.

## THE NUMBER THAT WILL BE CHECKED AGAINST US
The report says 17,425 attempts. `/stats` publishes roughly 59,000 total plays, in prose, in
its meta description and in JSON-LD as a schema.org `PropertyValue`. **The owner has ruled
that `/stats` is not being changed**, so the two numbers will coexist on one domain and a
careful reader will find both.

The draft already defuses this: its method section states the window and says most of the
history is deliberately excluded, with the reason. Make sure that paragraph is visible on
the page and not collapsed behind anything. Do not add a caveat to `/stats`, and do not
"reconcile" the two numbers with any sentence not already in the draft.

## SCHEMA
JSON-LD describing what this actually is: a report, with an author, a date, and a dataset
attached to it. Get the type right rather than stuffing properties - a wrong `Dataset` shape
is worse than none, because this page is aimed at exactly the machines that read it.

## WHAT I AM NOT ASKING FOR
No charts. No interactive explorer. No newsletter capture. No share widgets. Those are all
reasons this ships late, and the pitch window is the constraint. A plain, fast, readable
page with correct markup beats a designed one that arrives next week.

## STANDING RULES
- Print `pwd` before every gate run.
- Prove the page against the SERVED HTML of a production build, not against what renders in
  dev - the anchors, the JSON-LD and the metadata all have to be in the response body.
- Recompute before writing any number in prose. It has caught four assertions in this
  workstream, one inside the dataset file and two inside the report itself.
- An incident report names locations, never values.
- No DDL, no writes to the database, no push.
- Proofs in `docs/proofs/w5-part1/`.
