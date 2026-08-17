# V-POLISH-2 - the reading system + the signature UI (one space, next level)

## Claude Code Implementation Prompt

---

Owner-validated direction (2026-07-31): the three signature moments are
APPROVED from the in-chat prototype (oversized vitals band, era spine,
citations as jewelry), and the mission widens: the WHOLE experience of one
group's fandom must be super good to read, super well organised, curators
must edit INSIDE that organisation (good structure = the default path, not
a fight), and the UI goes to the next level. Read: VAUDIT-REPORT.md (the
taste queue + polish leftovers), the V-POLISH commits, VERSE-PAGES-UNIVERSE
Part 3 (the locked canonical order), the V-TEXT fold system.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps. No
migrations expected (STOP if one appears). Dual-skill /ui-ux-pro-max +
/frontend-design at start and close. Play triple-proof every sweep. SEO
parity + contrast guardrail in force. No glow/gradient slop: boldness comes
from scale, color, imagery, rhythm.

## Part A - THE READING SYSTEM (one grammar for every page)

1. PAGE GRAMMAR, enforced everywhere: kicker (what kind of page) -> H1 ->
   one-line dek -> the content, with a "how to use this page" box on every
   complex surface (indexes, tools). Audit findings folded in: Members
   index gets its header block; /content gets an active tab + a real name;
   About gets its breadcrumb; every index states its scope honestly.
2. MEASURE LAW: --v-measure (66ch) actually enforced on every prose
   surface (wiki leafs currently run 95-100ch). Wide canvas stays; text
   never stretches.
3. SCAN PATHS: every entity page answers its top questions above the fold
   (idol page: birthday/position/debut visible without scrolling - the
   fact-hunt journey found Jin's birthday buried). Mobile: infobox facts
   render BEFORE the article on wiki leafs.
4. DENSITY + THE DEAD RAILS: the audit's dead-right-region list (space
   home rail exhaustion, awards source 900px from title, about's dead
   left) fixed by interleaving modules and sticky rails; no page shows a
   40% void at desktop.
5. REPETITION KILLS: quest board rows get the designed template (art +
   varied copy, not 16 identical stamps); timeline collapses story-less
   eras to compact rows (no repeated apology); auth pill server-renders.
6. ORIENTATION: breadcrumbs consistent; the mobile More sheet gets
   grouped sections, clean labels (no name+hangul concatenation), and a
   current-section marker; "members" vs "fans" naming resolved (idols =
   Members tab; people = Fans everywhere in community surfaces).

## Part B - EDITING INSIDE THE ORGANISATION (curators keep it readable)

1. The section templates (era-story, album-note, idol-lore, culture) are
   the DEFAULT insertion path in the editor per kind: right structure
   pre-filled, length hints live (the ~300-word guidance), fold choice
   per section surfaced at write time (inline / folded).
2. The studio gains a READING preview lens: alongside light/dark, a
   "reader view" toggle showing the page as a first-time visitor sees it
   (folds applied, min-gates applied) so curators see what readers see
   before publishing.
3. Editor deferred items from V-ROLES close, settled now: in-editor link
   preview distinguishes internal (chip style) vs external (cite style);
   role microcopy gets its box-law ruling (quiet unboxed line, consistent
   everywhere); roving-tabindex toolbar; tour Escape no longer steals
   from an open mention popup.
4. Curator guardrails stay warn-not-block: nothing here adds friction to
   publishing; it adds visibility of the reader's experience.

## Part C - THE SIGNATURE UI (approved moments, built)

1. OVERSIZED VITALS band on every space home: display-size tabular
   numerals, uppercase micro-labels, one accent rule, "every number
   sourced" line, real counts. V-HOME variant with network totals.
2. THE ERA SPINE: timeline page + mini-spine module on space home. Era
   colors curator-settable in the studio (contrast-clamped), current era
   full-weight with the "current chapter" badge (scale + color, NO glow),
   album art on chapters (Cover Art Archive), story excerpts from the
   seeded era stories, compact rows for story-less eras.
3. CITATIONS AS JEWELRY: the orbit chip replaces [SOURCE] and the wd/cur
   badges on every reader surface (inline superscript, outlet name,
   hover detail). Editor keeps its functional chips; readers get the
   jewelry. One shared component.
4. LIGHT-UP JOIN: member state takes the fandom accent on the join pill
   + member chip (contrast-clamped), with the member-count tick.
5. MEMBER WALL as the visual language: the portrait crop system reused
   on quest rows, era chapters, and the V-HOME collage consistently.
6. The queued taste items: wiki index retitle (leads with the fandom,
   not the emptiness), studio's Play-pink active states re-themed violet,
   nav "Comm" clipping fixed, [minor] auto badges hidden from visitors.

## Steps

1. Part A items 1-3 (grammar, measure, scan paths). Commit.
2. Part A items 4-6 (rails, repetition, orientation). Commit.
3. Part C items 1-2 (vitals, era spine). Commit.
4. Part C items 3-6 (citation jewelry, light-up join, member wall,
   queued items). Commit.
5. Part B (editor + studio reading lens + deferred rulings). Commit.
6. STOP: the one-space walkthrough matrix. Shoot the ENTIRE BTS space
   top to bottom as a first-time reader (home, members, one idol, one
   album, timeline, wiki index, one leaf, collections, community) at 3
   breakpoints x light/dark, plus one showcase space for contrast. The
   owner walks it as a fan. This is the "super good to read" gate.
7. After approval: closing sweep (dual-skill audit, a11y, SEO parity,
   Play triple-proof, full build, em-dash grep, check:routes, all gate
   suites). Commit.

## Permitted loops (per LOOP-CHARTER)

BUILD-VERIFY-FIX per step · GOAL tsc + full build + check:routes + suites
green · MAX 8 · STOP IF migration / design ambiguity / any change that
would remove indexable content.

## Verify

- [ ] Measure law proven (computed style probe on prose surfaces: 66ch)
- [ ] Fact-hunt journey re-run: Jin's birthday above the fold, 4 clicks
      or fewer from Play home
- [ ] No dead desktop regions on the audit's list (screenshot proof)
- [ ] Quest board: zero identical adjacent rows; timeline: zero repeated
      empty-state lines
- [ ] Reader-view lens matches the real logged-out render (probe)
- [ ] Citation jewelry consistent on every reader surface; editor chips
      unchanged; zero [SOURCE] brackets remain reader-visible
- [ ] Era spine: colors clamp, current-chapter correct, story-less eras
      compact; album art loads lazy + sized (no CLS)
- [ ] Signature moments match the approved prototype in spirit (owner
      judges at step 6)
- [ ] All suites green; Play triple-proof; SEO parity re-proven; tsc,
      full build, routes green; zero em dashes; no new deps

/caveman report per step; step 6 is the owner gate, walked as a fan.
