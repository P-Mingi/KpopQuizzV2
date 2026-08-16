# MISSION (W7 - topical clusters + W9 plumbing). NO PUSH.

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W8 is Cowork-approved (78810a4). Verse PAUSED. Nothing pushed.
NOTE: Cowork could NOT re-derive your DB coverage numbers this run - the Supabase MCP
refused access. Your field-coverage figures stand on your report alone until Cowork can
recount. Keep stating the SQL beside every number so that recount stays possible.

## W7 - THE INTERNAL LINK MESH (the authority lever nobody has to approve)
From docs/PLAY-GEO-AEO-AUDIT.md A5: "owning one topic completely beats being shallow
across ten". This is the only authority work that needs no third party, no outreach and
no deploy to build. We already rank on relevance; what is missing is depth signal.

Build the mesh between pages that ALREADY EXIST. Do NOT create URLs.
7a. HUB: each group page links to its own spokes - its quizzes, its trivia page, its
    blind test playlist, its games - with descriptive anchor text, never "click here"
    and never the bare slug.
7b. SPOKE -> HUB: every quiz page links back to its group hub. Check whether this
    already exists before adding a second one; a duplicated link is not a stronger one.
7c. SPOKE -> SIBLING: a quiz links to closely related quizzes of the SAME group before
    reaching outside it. Related-quizzes already exists - audit what it actually links to
    today and report it before changing anything.
7d. ORPHANS: find any page with ZERO internal inbound links and report the list. Do not
    invent links to fix them; report first, we decide together.
Anchor text rule: descriptive and varied, never exact-match repeated site-wide - that
reads as manipulation, not structure.

## W9 - THE CHEAP PLUMBING (small, do it after W7)
9a. `llms.txt` at the root. Honest calibration, recorded so you do not overinvest: the
    academy itself calls it "a cheap experiment, not a core ranking lever". Ship it,
    expect nothing, spend an hour not a day.
9b. FRESHNESS: a visible "Updated <month year>" plus a correct `dateModified` on group
    pages, driven by REAL data (the newest quiz/content date for that group), never
    today's date, never a build timestamp. K-pop churns, and a stale-looking page is a
    weak citation candidate.
NOT in scope: Bing Webmaster Tools submission is the owner's action, not code.

## HARD RULES
- No new URLs. This is structure over existing pages.
- Real data only. A freshness date that is not derived from real content is a lie.
- Do NOT touch titles or meta descriptions: W1's July control set is inside its
  measurement window until 2026-08-24, and `check:metadata-dupes` must stay unchanged.
- Report BEFORE changing anything on 7c and 7d - Cowork wants the audit, not a silent
  rewrite of the link graph.

## GUARDRAILS
Scope: group pages, quiz pages, related-quizzes, a root llms.txt route. Do NOT touch
/verse. NO DDL. tsc 0, build green, check:routes / check:indexability /
check:metadata-dupes must not regress.

## VERIFY (proofs to docs/proofs/w7-clusters/)
1. The current link graph BEFORE changes: what links to what, and the orphan list.
2. The mesh after: a group hub's outbound links and a quiz's inbound path to its hub,
   read from the SERVED HTML of a production build, not from source.
3. Anchor text sample showing variety, not one repeated phrase.
4. llms.txt served, and its content.
5. A freshness date next to the SQL that produced it, plus a group where the newest
   content is old and the date says so honestly.
6. check:metadata-dupes unchanged.

## REPORT
docs/loop/REPORT.md + docs/VERSE-LEDGER.md entry. BLOCKED.md for real owner decisions.
NOTHING PUSHED.
