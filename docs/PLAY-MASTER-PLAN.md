# PLAY MASTER PLAN - every QUIZ workstream, ranked by ROI (2026-08-15, Cowork)

Owner ruling: Verse ON PAUSE. Full focus on the quiz side. Every validated idea
becomes its own workstream, worked point by point. This doc is the single ranked
index. Existing docs are folded in, not duplicated.

Ranking logic: (a) uses demand we ALREADY measured, (b) needs no third party,
(c) cheapest first, (d) compounding beats one-shot. Evidence is DB-measured or
code-verified; no vibes.

## TIER 1 - HARVEST WHAT WE ALREADY EARNED (weeks, no new content)

W1. CTR SPRINT  [PRIORITY 1, owner ordered]
    Evidence: ~571K Bing impressions, ~4.9K clicks = 0.86% CTR. Academy click
    curve: pos1 27%, pos5 6%, pos10 ~2%. We sit BELOW pos10 expectation while
    ranking widely. Biggest single win on the site, zero new content.
    Do: pull queries at positions 5-15 with 200+ impressions, rewrite title
    (<60 chars, keyword-led, specific) + meta (~150 chars, benefit-led, unique,
    number or reason to click). Never blank, never duplicated, never stuffed.
    Folds in: docs/workstream-ctr-sprint.md, docs/ctr-sprint-baseline.md.

W2. BATTLE TRIGGER (R0)  [PRIORITY 2]
    Evidence: 1,420 battles started, 1,002 finished, 0 EVER had 2 players.
    Demand exists, loop dead. See PLAY-BATTLE-AUDIT.md (R0 + trigger ideas).
    Do: challenge born on the quiz RESULT screen, friend or random opponent,
    random = queue of open runs (async, no concurrency needed).

W3. CLAIM THIS RUN (guest -> account)  [PRIORITY 3]
    Evidence: 36,091 of 58,936 plays are guest (61%). Only 167 accounts, 138
    signed players. Battle results only 5.8% signed.
    Do: the four conversion moments already researched in
    docs/PLAY-GUEST-CONVERSION.md. Doctrine: never gate play, gate IDENTITY.
    Pairs with W2: the win is what you claim.

## TIER 2 - AUTHORITY / DR (months, compounding, no spam)

W4. EMBED WIDGET  [spec exists, NEVER BUILT]
    docs/WIDGET-EMBED-SPEC.md, 260 lines, ready. Critical detail already in it:
    an iframe passes ~no link equity, so the paste snippet MUST render a visible
    <a> outside the iframe. Every partner = 1 real backlink + referral + a new
    acquisition surface. Also carries a battle challenge link back (see W2).

W5. K-POP KNOWLEDGE REPORT (data PR)
    Our unfair advantage, unused. Raw material we own and nobody else has:
    59,508 fan-duel votes / 870 voters / ~68 per voter; 58,936 plays over 399
    quizzes and 88 groups; real average scores; hardest and easiest quizzes by
    measured score; girl-group 68% over 65 quizzes vs boy-group 70% over 77.
    Academy: "original data, research nobody else has" is the #1 coverage driver,
    one study beats months of one-by-one outreach. Every finding also becomes a
    spoke page for W7.

W6. MENTION RECLAMATION + REDDIT
    Unlinked mentions convert far better than cold outreach: we have 571K
    impressions, we are likely already named without a link. Then Reddit, as
    ourselves, honestly. Rule: never fake, planted posts backfire.
    Folds in: docs/SEO-OUTREACH-PLAYBOOK.md (templates already written).

W7. TOPICAL CLUSTERS
    The only authority lever needing nobody's permission. Hub per group, spokes
    per member / era / discography / fandom, all interlinked. Academy: "owning
    one topic completely beats being shallow across ten."
    Folds in: docs/workstream-group-hubs.md, docs/workstream-t-data-hub.md.

## TIER 3 - GEO / AEO ON-PAGE (cheap, fast, compounding)

W8. ANSWER-FIRST + QUERY FAN-OUT on programmatic pages
    40-60 word direct answer near the top; headings as literal questions; each
    group page answers the fan-out (members, debut, discography, fandom name,
    lightstick, era) as self-contained chunks = 6-10 citation shots per page
    instead of 1. See PLAY-GEO-AEO-AUDIT.md G2.

W9. GEO PLUMBING
    llms.txt (cheap experiment, the course itself demotes it), visible freshness
    + dateModified on group pages, Bing Webmaster Tools submission (our biggest
    and least contested impression pool). See PLAY-GEO-AEO-AUDIT.md G3/G4/G6.

## TIER 4 - THE RETENTION PRODUCT (Learn -> Test -> Measure)

Owner validated these four from the external AI proposal. They all capture
IDENTITY, which is the hole every measurement in this doc points at.

W10. K-POP WRAPPED - end-of-period recap from REAL gameplay data. Naturally
     viral, share is a RESULT not a profile (easier to post). Cheapest of tier 4.
W11. WEAKNESS TRAINING - score by category, then 5-minute targeted sessions.
     The Duolingo loop. Needs W12's category model.
W12. KNOWLEDGE SCORE - a standardised measure across categories/generations.
     Turns a one-off score into something that means something.
W13. CERTIFICATIONS - fun fandom certification, shareable result.
     Acquisition loop that does not require sharing a profile.

## TIER 5 - NEW FORMATS (we are BEHIND here)

W14. RECOGNITION FORMATS: video / blurred image / audio.
     Competitor reality (docs/PLAY-COMPETITOR-RESEARCH.md): kpopdle already ships
     MV-frame guessing, kpopless ships album-cover reveal, kpopless/heardle ship
     audio heardles. We have blindtest but no visual-recognition ladder.
     Folds in: docs/workstream-v-new-formats.md (Sort It / Match-Up / Name Them
     All already shipped), docs/PLAY-BLINDTEST-X.md.

## REJECTED FOR NOW (Cowork verdict, owner agreed)

- Public API + B2B "powered by" engine: nobody buys infrastructure from a DR-1
  domain with 167 accounts. Revisit only after Tier 2 moves DR and Tier 4 proves
  a product.
- Live real-time multiplayer + 128-player tournaments: need CONCURRENT players.
  We have 870 unique voters over 2 months and 138 signed players. Would be empty
  rooms. Revisit after W2/W3 prove a two-sided loop.
- More articles / more news: content treadmill, already flagged by the external
  AI itself, and our 19 articles are not the bottleneck. CTR is.

## STANDING RULES

Covenant: real data only, honest emptiness over invented numbers, no fake
activity, no dark patterns, zero orphan pages. No automated or paid backlinks,
ever. Nothing pushed without the owner gate. Cowork audits every worker REPORT
against the DB before the gate lifts.
