# MISSION (W7c - close the orphan classes, unscope the gate). NO PUSH.

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W7b is Cowork-approved (348e9fc). Verse PAUSED. Nothing pushed.

## THE GOAL: DELETE THE SCOPE
You flagged it yourself and you were right - a scoped gate is a ratchet that can become
an excuse. The target of this mission is not "fewer orphans", it is `check:orphans`
passing with NO scope at all, so the flag can be removed rather than narrowed. If you
cannot get there honestly, leave the scope and say exactly what is left and why. Do not
shrink the assertion to manufacture a green.

## THE PRINCIPLE FOR EVERY ORPHAN
A sitemap URL with no inbound link is one of two things, and the fix differs:
  (a) genuinely under-linked -> link it from where it BELONGS, structurally.
  (b) not worth advertising -> remove it from the sitemap.
Both are honest. The dishonest third option is inventing a link from an unrelated page to
clear a counter. Do not take it. Where you are unsure which case applies, say so and
block rather than guess.

## PART 1 - /blindtest does not link its own children (53 orphans, the big one)
Confirmed by you, not guessed: `/blindtest` serves 45 links and ZERO point at any
`/blindtest/` playlist. An index that does not link what it indexes.
Fix it structurally: the index lists its playlists as real crawlable <a> in the SERVED
HTML, with descriptive anchors. If the current UI picks playlists through a client-side
selector, the links must still exist server-rendered - a selector is not a link.
Apply the same rule you already proved on the directory: every playlist appears once,
real counts only, no filler for sparse ones.

## PART 2 - the 5 name-all playlists
Siblings are linked, these five are not. Find why the five differ before touching
anything - if it is a data condition rather than a template gap, say so.

## PART 3 - the 6 landing pages, TRIAGE not reflex
/trending, /new, /most-liked, /kpop-quiz-2026, /guess-the-kpop-idol, /data/pulse/2026-07.
For each, decide (a) or (b) above and justify it in one line. Two are worth thinking about
rather than pattern-matching:
  - /data/pulse/2026-07 looks like a dated archive. An archive nobody links may simply not
    belong in the sitemap; that is fix (b), not a failure.
  - /guess-the-kpop-idol has an article pointing at it as a destination. If a real link
    exists and the crawl missed it, that is a crawl-boundary artefact and you should say
    so instead of adding a second link.

## PART 4 - remove the scope
Once the classes are closed, delete the scope flag from `check:orphans` and make the
unscoped run the gate. Keep everything you already got right: offenders listed by URL,
sample size printed, and the plain-words statement that a sampled result is a floor on
inbound links and not a proof of zero.

## HARD RULES
Real data only. No new URL unless PART 3 concludes a page must exist, and then say why.
Do NOT touch existing titles or meta descriptions - W1's July control set is inside its
window to 2026-08-24 and check:metadata-dupes must stay unchanged.
CWD: your own flag 1 says a cwd reset has twice nearly produced a false green. Print the
working directory and the full command output before summarising any gate result.

## VERIFY (proofs to docs/proofs/w7c-orphans/)
1. `/blindtest` served HTML listing its playlists as real <a>, counted against the SQL or
   registry that enumerates them.
2. Each of the 53 previously orphaned playlists now having an inbound link, read from
   served HTML.
3. The name-all five, with the reason they differed.
4. The triage table for the 6 landing pages, one line of justification each.
5. `check:orphans` UNSCOPED and green - or, if not, the exact remainder and why.
6. The gate still able to FAIL: injected orphan, named.
7. check:indexability 0 against a running server; check:metadata-dupes unchanged.

## REPORT
docs/loop/REPORT.md + docs/VERSE-LEDGER.md entry. BLOCKED.md for real owner decisions.
NOTHING PUSHED.
