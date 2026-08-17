# V-AUDIT - the full Verse UX/UI audit (beauty + readability war)

## Claude Code Implementation Prompt

---

AUDIT ONLY. No design changes, no code fixes in this workstream (tiny
scratchpad tooling like screenshot scripts allowed, not committed to src).
The deliverable is a REPORT the owner acts on. Dual-skill MANDATORY and
central: run /ui-ux-pro-max AND /frontend-design at the start and audit
through both lenses on every page.

The owner's verdict driving this, verbatim in spirit: the Verse side looks
like an AI website. The homepage is boring and empty. The content pages
(group, members, entities) are minimalist but not beautiful, nothing
noticeable, no pull to read. The bar: incredibly beautiful, super easy to
navigate, and above all SUPER EASY TO READ information. Readability is the
number one criterion of this audit.

## Scope - explore EVERYTHING on the Verse side

Walk every page type at 3 breakpoints, light + dark, as three viewers
(logged-out, member/contributor via the dev accounts, curator/owner):

1. /verse (V-HOME) - the boring-and-empty complaint centers here
2. Space homes: bts (default face), stray-kids (neon), ateez (soft)
3. Entity pages: 2 idols, 2 albums, an era/story page, timeline
4. Wiki leafs: all 4 exemplars + a draft in the creator preview
5. Indexes: /wiki index, the Song Deck, /content router, /members
6. Collections + photocards surfaces
7. Community surfaces in the Verse world + a discussion page
8. The studio, the creator flow, the roles panel, the join/progression page
9. The 404, search, the More-sheet, nav journeys BETWEEN all of the above
   (count clicks, count dead ends, note every "where am I?" moment)

## The lenses (audit criteria, in priority order)

1. READABILITY (the owner's #1): type scale and hierarchy per page, line
   length, rhythm, contrast, scanning paths (can a fan find one fact in 5
   seconds?), fold behavior, information density (too sparse IS a
   readability failure: a page of min-gated voids reads as nothing).
2. BEAUTY / DISTINCTIVENESS (the anti-AI-slop test): would a designer
   screenshot this? Name what makes each page generic where it is:
   uniform card grids, timid accent use, absent imagery, identical
   rhythm everywhere. We hold REAL legal imagery (idol photos, album
   context, banners) and a violet identity: audit where imagery and
   boldness are underused. The current system is clean; clean is not the
   bar. Noticeable is the bar.
3. EMPTY-STATE HONESTY vs DESIGN FAILURE - CRITICAL DISTINCTION: for every
   weak page, classify the cause: (a) DESIGN (would still be weak with
   rich content) vs (b) EMPTINESS (the design is fine but data/prose is
   thin pre-curators) vs (c) BOTH. Do not propose redesigns for what is
   actually an empty-state problem: propose better empty states or
   content plans for those. The fresh-eyes QA already proved the shells
   outclass the content; do not re-learn that lesson as a design finding.
4. NAVIGATION EASE: orientation (do I always know which space/section?),
   wayfinding to the rabbit hole, click depth to any information, the
   world toggle clarity, mobile reachability.
5. CUSTOMIZATION INTERPLAY: the audit judges the DEFAULT face knowing
   curators re-skin per space. Flag where the default leans on future
   curator effort ("a curator could make this pretty") instead of being
   beautiful out of the box: the default IS the product for every
   recruit's first impression.

## Specific owner complaints to answer directly

- V-HOME: propose the CONTENT PLAN that makes it feel alive and full with
  ONLY honest data available today or cheaply computable: e.g. imagery-
  forward space cards (we hold idol/group imagery), a computed "today in
  K-pop" strip (dates we hold), newest wiki pages, gateway quizzes done
  tastefully, the recruitment block with visual weight, trending with
  real counts. Mock the recommended homepage as a wireframe-level
  description (sections in order with content sources), not code.
- The "nothing noticeable" problem: propose 3-5 SIGNATURE moments for the
  Verse side (the things a visitor remembers: e.g. a bold space-entry
  hero treatment, era-colored timeline spine, oversized vitals
  typography, image-led member walls). Each proposal: what, where, why
  it is ours (not a Fandom/Wikipedia clone), effort estimate.
- The "AI website" feel: name its causes page by page (uniformity,
  symmetric grids, equal-weight everything, no editorial voice in
  microcopy) and the cheapest counters.

## Deliverable format (the report)

1. Per-page scorecard: readability / beauty / navigation, each 1-5, with
   the single worst thing and single best thing named per page.
2. Ranked findings list: severity (blocker / major / polish) x cause
   (design / emptiness / both) x effort (S/M/L). Every finding concrete
   enough to act on without re-auditing.
3. The V-HOME content plan (the owner's direct ask).
4. The 3-5 signature-moment proposals.
5. TOP 10 FIXES: the ordered list the owner approves for a follow-up
   build workstream (V-POLISH). No fixes are built in this workstream.
6. Reference anchors: for each major proposal, name 1-2 real-world
   references (editorial/music sites, not other wikis) whose quality bar
   it borrows: the owner can veto tastes by name.

Report per the house style: /caveman summaries welcome per section, full
findings in clear prose, screenshots for every scorecard page. NO code
changes, NO push, nothing committed except the report file
(docs/VAUDIT-REPORT.md). No em dashes anywhere in it.
