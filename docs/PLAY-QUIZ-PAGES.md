# PLAY-QUIZ-PAGES - make every quiz page substantial + unique
(2026-08-08) · owner P5 vision + Cowork additions

Owner overruled "accept partial indexing". The real problem: a new
quiz that is not indexed gets no clicks, so only big quizzes get
traffic and good new quizzes die from no visibility. Owner's vision:
every quiz auto-gets a page wrapped in REAL facts, so SEO stops being
peccable. Cowork agrees and engineers it honestly below.

## The honest frame (no overselling)

We cannot DECLARE a page indexable - Google decides. But two levers
we fully control move the needle hard:
1. SUBSTANCE: wrap each quiz in REAL sourced context so the page
   MERITS indexing (not thin, not near-duplicate).
2. DISCOVERY: surface every new quiz internally so users find it
   BEFORE Google - this alone fixes "new quizzes get no views".
Together they raise the indexed fraction a lot AND solve the traffic
problem regardless of Google. That is the honest promise.

## Owner's ideas (assessed)

O1 A TRIVIA DATABASE per group/artist, so when a new group/artist is
   created for a quiz, a trivia base already exists and the site
   auto-links it. VERDICT: STRONG and it is our moat. We already hold
   structured group/idol/release data (Wikidata/MusicBrainz, CC0).
   Extend it with a curated TRIVIA table (sourced facts per entity):
   then every quiz about that entity auto-pulls real context. Build:
   a `trivia` store keyed by entity, seeded from our data + curator
   additions, covenant-bound (sourced or nothing).
O2 ALWAYS link to existing trivia + quizzes of the SAME group/artist.
   VERDICT: yes - this is the internal-link web that both helps SEO
   and drives discovery. Every quiz page gets a "more [group] quizzes"
   rail + a "[group] facts" panel.
O3 "DID YOU KNOW?" - one group/artist fact per quiz, DIFFERENT for
   each quiz. VERDICT: excellent and it directly fights the
   thin/duplicate problem: rotate a distinct sourced fact per quiz so
   no two pages read the same. Pull from the O1 trivia base, dealt out
   so each quiz shows a different card.

## Cowork additions - more ways to make each page unique

(the goal: Google must never see two quiz pages as near-duplicates)

U1 REAL STATS BLOCK per quiz, computed live: play count, average
   score, hardest question (the one most missed), completion rate,
   fastest time. Every quiz has different numbers -> every page is
   literally unique, and the data is real (no fabrication).
U2 A DYNAMIC INTRO sentence generated from the quiz's own shape: "This
   [difficulty] quiz has [N] questions about [group]'s [topic]; [X]
   players have tried it, averaging [score]." Templated but filled
   with per-quiz real values -> unique text, honest.
U3 TOP PLAYERS / recent scores strip (threshold-30 respected): shows
   real leaderboard for THIS quiz. Different per quiz, real, and it is
   community proof.
U4 RELATED-BY-ENTITY, not generic: "quizzes about the same era /
   album / member", derived from the quiz's tags, so the related rail
   differs per quiz instead of a site-wide block.
U5 THE ANSWER-KEY / RECAP page value: after playing, a spoiler-safe
   "what this quiz covers" summary (the real songs/members/facts it
   tests) - genuine content Google can read, unique per quiz.
U6 CREATOR CONTEXT: the creator's blurb + their other quizzes -> ties
   into the identity/passport work; unique per creator.
U7 FRESHNESS SIGNALS: a "new this week" feed per group, updated
   lastmod in the sitemap when a quiz changes, and internal links
   from the group hub to the newest quizzes -> Google recrawls, users
   discover. Freshness is a real ranking + discovery lever for UGC.
U8 QUESTION-LEVEL SEO (careful): the quiz's questions ARE unique text
   already; render them crawlably (not locked behind JS) with the
   answers appropriately handled, so the page has real indexable body
   without spoiling play. This is the biggest untapped unique-content
   source: every quiz's questions are one-of-a-kind.
U9 STRUCTURED DATA: Quiz JSON-LD per page (real Q count, topic, group
   as MusicGroup). CORRECTED 2026-08-09: Google DEPRECATED the
   practice-problem (Quiz) rich result (docs removed, not shown in
   Search since January 2026) and dropped FAQ rich results too. So
   this buys NO rich results. Kept anyway, reframed honestly: JSON-LD
   still tells crawlers and AI answer engines what the page IS, which
   is the real 2026 payoff. Never add FAQPage over quiz questions.

## The anti-thin test (the bar every quiz page must pass)

A quiz page ships as substantial when it has: a dynamic real intro
(U2) + the questions rendered crawlably (U8) + a group facts panel
(O1) + a rotating did-you-know (O3) + real stats (U1) + entity-related
rail (U4) + creator context (U6). No two pages share more than the
template chrome; the FILLED content is per-quiz real data. That is how
Google stops seeing them as thin duplicates.

## The moat point (why this is powerful)

The Verse and the quiz side share ONE structured, sourced K-pop data
engine. The Verse fact rails and the quiz-page facts pull from the
same base. Every group we document deepens BOTH sides. A generic quiz
site cannot copy this - they have quizzes, not a sourced knowledge
graph. This is the single biggest reason to build the trivia base
(O1): it compounds across the whole product.

## Sequencing (parallel, prototype-first)

- Runs PARALLEL to the Verse showcase (own worktree, likely the SEO
  fork or a new Play slot; single-writer law).
- Prototype-first: design the new quiz page (all blocks above) as a
  mockup -> owner validates -> build.
- Phase 1: the trivia base (O1) seeded from our data + the group
  facts panel + rotating did-you-know (O3) + entity-related links
  (O2/U4) - the substance layer.
- Phase 2: the dynamic intro (U2) + real stats (U1) + crawlable
  questions (U8) + JSON-LD (U9) - the uniqueness layer.
- Phase 3: discovery - newest feeds + freshness + hub links (U7) +
  top players (U3).
- Measure in GSC after each phase; this is where the indexed fraction
  should climb.

Covenant throughout: every fact sourced or honest emptiness, never
fabricated; stats are real computed values, never invented.
