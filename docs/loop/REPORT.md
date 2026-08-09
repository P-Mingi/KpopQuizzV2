# MEGA-REPORT - F3 (non-idol fact rails) + F4 (home v2)

Two phases in one run, both shipped on the real BTS space. 8 commits this run, NOTHING
pushed (commit-not-push). No schema change anywhere (all data already in the DB; the
rails + widgets READ it). Verse stays admin-hidden; indexability rules unchanged.

FINAL GATES (at the tip): tsc 0 · check:routes pass · check:verse-tokens pass · full
`next build` compiled + 622 static pages (exit 0) · em-dash/en-dash scan of the whole
F3+F4 surface = 0.

============================================================
## F3 - FACT RAILS FOR RELEASE / TRACK / ERA / AWARD  (commits 5d62dd9, 2452204)
============================================================
(1) SHIPPED: lib/verse/tree/factrail.ts extended - buildFactRail dispatches on
    entity_kind (idol / album / track / era / award). FactRow gains href / links
    (linked rows are DATA, never free-text). EDITABLE_FACT_KEYS expanded; every
    computed + linked key deliberately excluded so clampFactOverrides drops an
    override aimed at them. railGrantsIndex (the per-kind is_stub exemption, live
    richness). data.ts createPage/savePage compute is_stub via railGrantsIndex.
    document-page renders href/links rows as real anchors. scripts/backfill-
    vfoundation-f3-isstub.mts (idempotent).
(2) RECEIPTS: docs/proofs/vfoundation-f3/rails.txt (26/26 PASS), isstub-backfill.txt,
    rail-{release,track,era,award}.png.
(3) NUMBERS - real BTS entities:
    RELEASE (MAP OF THE SOUL : PERSONA): Type EP, Released Apr 12 2019, Region South
      Korea, Tracks 7 (AUTO), Era + Primary artist LINKED. railGrantsIndex = TRUE.
    TRACK (Intro : Persona): Album LINKED, Track number 1, Released. = FALSE.
    ERA (O!RUL8,2?): Years 2013, Releases 1 (AUTO + linked list), Followed by LINKED.
      = TRUE.
    AWARD (Order of Cultural Merit): Year 2018, Result Won, Recipient LINKED. = FALSE.
    Fail-closed: an override on rel_tracks (AUTO) + rel_era (LINKED) is DROPPED, rel_type
      kept + marked Edited; the hack never reaches the rendered value.
    BACKFILL (applied, idempotent): 17 releases + 15 eras -> indexable; 197 tracks +
      21 awards stay noindex stubs. Proven live (era page "indexable", award "noindex").
(4) DEVIATIONS / the INDEXABILITY CALL (flagged for Cowork to rule): I granted the
    fact-rail exemption to RELEASE (with a tracklist) and ERA (with releases), and kept
    TRACK + AWARD as the conservative stub-until-body. Honest emptiness: release Label
    (not a column) and track duration/credits (not stored) are omitted, not invented.
    The era Releases row renders the LINKED list on the reader (the count is the list
    length + the AUTO badge); the editor shows the count.
(5) SCREENSHOTS: rail-release / rail-track / rail-era / rail-award (light).

============================================================
## F4 - HOME V2  (commits 564fc67, 64892c0, d992d89, 5e04a94, + this)
============================================================

### F4.1 tokens + fonts (commit 564fc67)
SHIPPED: 3 self-hosted faces via next/font/local (Fraunces / Instrument Sans / Spline
Sans Mono; Pretendard falls back; quiz untouched). The v2 Notion-neutral palette on a
`.verse-v2` scope (the /verse layout wrapper, display:contents). One SYSTEM-NEUTRAL blue
accent (#2E6BD0 / dark #6FA0EE); the scope re-asserts --verse-* on .verse-scope so the
neutral accent beats the per-space --brand. No hex in components; verse-tokens passes.
PROOF f41-tokens.txt + member-tokens-{light,dark}.png: /verse/bts/rm renders under the
new tokens (Fraunces h1, Spline Mono labels, one H1, layout intact).

### F4.2 page head (commit 64892c0)
SHIPPED: home-head.tsx - cover band (soft-gradient default + moderated-rail tag),
overlapping page icon (group initial), eyebrow (fandom / generation / inception year),
the page's ONE H1, lede (verse_spaces.welcome_line), two pills. The home suppresses the
shared space hero + tabs via :has(.vh2-home). PROOF f42-head.txt + home-head-{light,
dark}.png: one H1 ("BTS"), real eyebrow/lede, both pills, shared chrome hidden.

### F4.3 data rail - six real widgets (commit d992d89)
SHIPPED: home-rail.tsx - Fact sheet (buildGroupFactRail, A2 Data/Auto + moderated photo
slot), In numbers, Coming up (next member birthday), This space (coverage), Play, Curators.
Server components, HEAD COUNT queries (1000-row law), fail-closed. PROOF f43-rail.txt +
home-rail-{light,dark}.png. LIVE on /verse/bts: Members 7 / Active 13y; 17/197/15/21;
Jungkook's birthday in 23 days; 263 pages / 7-7 / 17-17 / 15% filled; 27 quizzes (top-3
real /quiz links); 1 curator. A NULL value renders nothing (honest emptiness).

### F4.4 anti-overflow fold (commit 5e04a94)
SHIPPED: fold.tsx (SSR renders content EXPANDED - crawlers + no-JS get everything; JS
collapses only the overflow with a max-height clip + fade + Read more, aria-expanded) +
home-overview.tsx (portal pages.blocks prose in the fold; self-hides until Cowork writes
it). PROOF fold.txt + fold-collapsed.png (a long TEST passage temporarily written to the
portal page, then reverted): served HTML CONTAINS the marker sentence from the clipped
part = true (crawlable); client foldbody clientHeight 220 < scrollHeight 939 (clipped,
not display:none), the marker still in the DOM.

### F4.5 wire + mobile order + this report (this commit)
SHIPPED: the rail split into two groups (first = fact sheet + numbers; rest = the others)
so on MOBILE the fact card sits right after the head and the rest fall below the document
sections (CSS order on a dissolved rail). The document column is the existing Composition,
v2-tokenized (its ad-hoc structure reconciliation stays with the Composition system).
PROOF: mobile order measured - fact top 615 < doc top 1492 < rest top 7865 (factBeforeDoc
+ restAfterDoc both true). Screenshots home-full-{light,dark}.png (desktop) + home-mobile
.png (fact card first).

F4 DEVIATIONS / flags (honest):
- GROUP HANGUL subtitle: no groups column, so OMITTED (never invented); needs an owner
  source. PER-SPACE ACCENT: kept SYSTEM-NEUTRAL as instructed; the per-space hook is
  future (not built), flagged. FACT-SHEET PHOTO: a moderated-rail slot placeholder (no
  group photo field yet).
- The rail loader uses the service-role client for server-side aggregate COUNTS only
  (numbers + public quiz titles + a curator COUNT); no private identity/fields reach the
  client (privacy law: redact from props). Reads fail-closed.
- The document column is still the Composition (with its own section styling); a fuller
  doc-canvas restyle to the v2 language + wiring richer pages.blocks into it is a Cowork
  co-design, not invented here.

## DEFERRED (consciously not done)
- Editor budget nudge (section outgrows -> child page), per-space accent hook, the
  document-canvas restyle pass, unit / company-label entity pages, galleries (C8).
- F3: track + award indexability await Cowork's ruling; release Label + track duration/
  credits await either a column or curator prose.

## STOP
F3 + F4 complete: the four non-idol rails render on the document canvas with the per-kind
is_stub rule (backfilled), and the BTS portal home is the validated v2 design - white
Notion-calm tokens + self-hosted fonts, the page head, the six live data widgets, the
crawlable fold, and the mobile fact-first order. 8 commits, nothing pushed. Next: owner
review + the Cowork vitrine content pass (prose into pages.blocks, which the fold + doc
column already render).
