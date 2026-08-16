# MISSION (W7b - fix the CLASS of orphans, not the 11 instances). NO PUSH.

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W7 audit + W9 are Cowork-approved (dcfac2a). Verse PAUSED. Nothing pushed.

## THE RULING, AND WHY IT OVERRIDES YOUR RECOMMENDATION
You recommended extending RELATED_GROUPS so each of the 11 orphans neighbours a group it
genuinely resembles. That is a good instinct and Cowork rejected it anyway, for a reason
you could not see from the audit: it treats 11 instances, not the class.

Cowork found the cause. There is NO all-groups directory page anywhere, and the only
global surface that lists groups is capped: `home-group-rail.tsx` `slice(0, 10)` and
`home-group-pills.tsx` `slice(0, 13)`. There are 37 groups with quizzes. So 27 appear on
no global surface at all and depend entirely on a hand-curated map. **Group number 38
will be born an orphan too.** Curation does not scale; structure does.

## PART 1 - THE A-Z GROUP DIRECTORY (one new URL, deliberately)
Cowork's own "no new URLs" rule from the last mission is SUSPENDED for this one page, and
the reason matters: that rule exists to stop us minting pages for crawlers. This is not
that. It is an index a human actually wants (browse every K-pop group), and it makes
orphanhood structurally impossible.

- One page listing EVERY group that has at least one published quiz, each linked once.
- Organise it so it is genuinely usable, not a wall: A-Z, and by generation where the
  generation is known. Groups with no generation go under a plainly labelled group, not
  a guessed one.
- Real counts per row from the DB (quizzes, and whatever else is already free to read).
  No invented numbers, no floors, no rounding.
- It must be indexable and IN the sitemap. It is a real page, not a doorway.
- Honest title and description, not keyword stuffing. Do NOT touch any other page's
  metadata: W1's July control set is still inside its window to 2026-08-24, and
  check:metadata-dupes must stay unchanged apart from this page's own new entry.

## PART 2 - IRRIGATE IT
A directory nobody links to is itself an orphan. Add a plain "see all groups" link from
the home group rail (and the pills, if it fits without clutter). Descriptive anchor, not
"click here".

## PART 3 - THE ORPHAN GATE (the part that makes this permanent)
Extend the CI guard family we already have. Same shape as `check:indexability`, which
already catches the sitemap-vs-noindex contradiction:
- Crawl the served HTML of a production build, build the internal link graph.
- FAIL when a URL that is IN the sitemap has ZERO internal inbound links.
- Report the offenders by URL, never a bare count.
- Be honest about the crawl boundary in the output, the way your audit was: if the crawl
  samples rather than covers, the result is a floor on inbound links, not a proof of
  zero. State the sample size in the failure message.
- Prove it RED then GREEN, like the indexability guard: show it failing on a real orphan
  before the directory exists (or on an injected one), then passing after.

## HARD RULES
Real data only. No invented links. No page exists to hold a link. If the directory would
be thin for a group, it shows fewer facts for that group, never a filler.

## GUARDRAILS
Scope: the new directory route, the home rail link, the new CI script, sitemap
registration, route allowlist. Do NOT touch /verse. NO DDL. tsc 0, build green,
check:routes / check:indexability / check:metadata-dupes must not regress.

## VERIFY (proofs to docs/proofs/w7b-directory/)
1. The directory rendering from a PRODUCTION build's served HTML, with every group that
   has quizzes present - counted against the SQL that lists them.
2. The 11 previously orphaned hubs each now having an inbound link, read from the served
   HTML, not from source.
3. The home rail linking to the directory.
4. The orphan gate RED (real or injected orphan, named) then GREEN, with the crawl
   boundary stated in its output.
5. check:indexability 0, run against a RUNNING server (your own flag from last run).
6. check:metadata-dupes unchanged apart from the new page.

## REPORT
docs/loop/REPORT.md + docs/VERSE-LEDGER.md entry. BLOCKED.md for real owner decisions.
NOTHING PUSHED.
