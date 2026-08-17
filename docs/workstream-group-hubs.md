# Workstream G2 - group hubs (enrich /X-quiz in place)

## Claude Code Implementation Prompt

---

Upgrade every group's /X-quiz page from a quiz list into the group's ecosystem hub.
Owner decisions locked: SAME URL enriched in place (never a new route - these pages
carry the site's ranking equity, e.g. seventeen-quiz 842 impressions); ALL 87 groups
programmatically; fandom names added via a new column, owner-curated.

Hard rules: NO em dashes. REAL DATA ONLY, every section data-gated and hiding when
thin (a small group renders hero + play row + quiz list and still looks intentional).
Commit per step, do NOT push. check:routes green. Dual-skill /ui-ux-pro-max +
/frontend-design. Mobile-first 430px, dark/light parity. The page's revalidate/render
mode must NOT regress (read the current [slug]/page.tsx notes about cookie reads
before touching anything; do not break the trivia sibling route).

CRITICAL SEO GUARD: the existing <title>, meta description (CTR-sprint versions),
H1, SEO intro text, quiz list markup, and JSON-LD on these pages are RANKING ASSETS.
Additive enrichment only. Diff-check that existing head tags are byte-identical
after the rebuild unless a change is explicitly listed here.

## Migration (next free number - CHECK prod head first)

`groups.fandom_name TEXT NULL`. Seed the ~20 owner-known fandoms (BTS=ARMY,
Stray Kids=STAY, BLACKPINK=BLINK, TWICE=ONCE, SEVENTEEN=CARAT, ATEEZ=ATINY,
TXT=MOA, ENHYPEN=ENGENE, aespa=MY, IVE=DIVE, ITZY=MIDZY, NMIXX=NSWER,
LE SSERAFIM=FEARNOT, NewJeans=Bunnies, (G)I-DLE=Neverland, Red Velvet=ReVeluv,
EXO=EXO-L, NCT=NCTzen, RIIZE=BRIIZE, BABYMONSTER=MONSTIEZ). These are widely
documented fan-club names; verify each against the site's own data or general
canon, flag any you are unsure of rather than guessing. Others stay NULL (hero
simply omits the fandom line). OWNER RUNS the migration; stop-and-wait.

## Hub sections (order; each = one component, gated)

1. HERO (upgrade existing header): logo (real asset), name, generation, member
   count (from name-all roster when present), quiz count + total plays (real),
   fandom line when fandom_name set ("Home of ARMY"), and the war-map line when
   the group charted this week ("#2 fandom this week" linking to the community
   war map anchor). No rank = line hides.
2. PLAY ROW (new, the hub's heart): grid of every REAL play surface this group
   has - quiz CTA (always), blindtest playlist (only if the group qualifies in
   blind-test-modes), Name All Members (only if roster exists), Which Member Are
   You (only if personality profile exists - 15 groups). 2-4 tiles, real counts
   on each. Gen-level Sort It / Match-Up links do NOT appear here (they are
   gen-scoped, not group-scoped - keep the hub honest).
3. QUIZ LIST (existing - keep markup, keep order logic).
4. MEMBERS STRIP (new): roster faces from the name_all data (real photos),
   name under each, linking to the name-all game for now (idol pages later).
   No roster = section hides.
5. FAN KNOWLEDGE (new): "N fans mastered {group}" (player_group_mastery,
   min 3 to show) + avg accuracy (min 30 tracked plays) + top 3 fans
   (PersonCard mini, min-gated, reuse the by-fandom query). Any sub-stat below
   its gate hides individually; all below = section hides.
6. MV PULSE (new, tracked groups only): views gained this week for the group's
   tracked MVs (mv_snapshots delta), "tracked since Jul 2026" label. Not
   tracked = hides.
7. COMEBACK BANNER (new): when the comebacks table has an ACTIVE comeback for
   this group (status + first 14 days), a banner at the TOP (above hero):
   comeback title + play CTAs. The T2 radar surface, finally live. No active
   comeback = nothing.
8. TRIVIA + CREATE (upgrade existing links): trivia link (when eligible) + a
   "Make your own {group} quiz" CTA into the Q funnel with the group
   preselected (verify the funnel accepts a ?group= param; add if trivial).

## SEO additions (additive only)

- Extend the existing JSON-LD with an ItemList of the play surfaces.
- Internal links OUT: war map anchor, personality page, blindtest playlist,
  name-all game, gen-level popular pages. Internal links IN already exist
  (war map tiles, articles, games). Verify both directions render as real <a>.
- Sitemap/lastmod behavior unchanged.

## Steps
1. Migration written -> OWNER RUNS -> verify + seeded fandom names spot-check.
   Commit.
2. Hero upgrade + play row + members strip (the visible transformation).
   Commit.
3. Fan knowledge + MV pulse + comeback banner (the data sections). Commit.
4. Trivia/create upgrades + JSON-LD + link mesh. Commit.
5. Verify: byte-diff of head tags on 3 top pages (seventeen, cortis, bts) vs
   before - identical except listed additions; render 5 hubs across the
   spectrum (BTS = everything, a mid group, a thin group = graceful minimum);
   dark/light + 430px screenshots; render mode unchanged; tsc + build +
   check:routes; zero em dashes. Commit.

/caveman report per step: per-section gate results on the 5 test groups
(which sections showed/hid and why), screenshots, head-tag diff proof.
