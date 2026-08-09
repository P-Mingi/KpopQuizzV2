# WORKER MISSION (written by Cowork · 2026-08-09 · replaces previous)

TWO PHASES IN ONE RUN: F3 (fact rails for non-idol entity kinds) then
F4 (implement the OWNER-VALIDATED home v2 design). Same laws: per
phase commits, proofs as files, loop contract, ratchet, never push,
worker never touches schema (all data already in the DB), em-dash
scan as a gate. Report to docs/loop/REPORT.md. STOP after the report.

============================================================
## PHASE F3 - FACT RAILS FOR RELEASE / TRACK / ERA / AWARD
============================================================

lib/verse/tree/factrail.ts already builds the idol fact rail from the
bound entity, with auto (computed) vs editable (override) rows and
the A2 grammar. Extend the SAME module + buildFactRail so it
dispatches on entity_kind and produces a rail per kind below, from
REAL DB data only (covenant: sourced or honest emptiness, never
fabricated).

RELEASE (albums row): Type (album/ep), Release date, Region, Track
count (AUTO from album_tracks), Era if era_id set, Primary artist.
Cover via the moderated image rail only.
TRACK: Album(s) it appears on (can be several, list + link), Track
number, Duration if stored, Release date via its album. Honest
emptiness where a field is absent.
ERA: Year range, Releases in the era (AUTO count + list, linked),
Concept line if stored, Preceding/following era if derivable.
AWARD: Ceremony, Year, Category, Result (won/nominated), Recipient
(group or member), linked.

INDEXABILITY (conservative + flag): rich rail (release with full
tracklist, era with release list) MAY take the phase-G exemption; a
thin rail (bare track, 4-field award) stays NOINDEX STUB until it has
body prose. Implement per kind, default conservative for track +
award, FLAG your per-kind decision loudly in the report.

F3 ACCEPTANCE: one real page of each kind renders its rail on the
document canvas (screenshot each); AUTO rows computed + locked,
editable rows carry A2 Data/Edited grammar + revert, fail-closed
clamp on computed keys; receipt docs/proofs/vfoundation-f3/rails.txt
(rail rows dt/dd/auto + sourced values + is_stub decision per kind).

============================================================
## PHASE F4 - HOME V2: THE VALIDATED MINIMAL DESIGN, FOR REAL
============================================================

The owner VALIDATED prototypes/bts-home-v2.html (this file is in the
repo: open it, study it, it is the design contract). Direction:
white, Notion-calm minimalism. Implement it on the REAL Verse.

F4.1 TOKENS (Verse side only, quiz side untouched):
- Extend the verse token layer to the v2 palette: white paper,
  Notion grays (ink #1D1B17, body #37352F, muted #73726E, lines
  #E7E6E3/#F0EFED), ONE muted blue accent #2E6BD0, radii 18/12/8,
  the Data/Auto badge colors, plus the v2 dark theme (#191919 base).
- Fonts: Fraunces (display), Instrument Sans (UI/body), Spline Sans
  Mono (data/labels) via next/font so they are self-hosted at build.
- NO hard-coded hex in components; the verse-tokens gate must pass.
- Tokens apply Verse-wide: screenshot ONE document page (a member
  page) under the new tokens and FLAG anything that breaks; if the
  document canvas needs its own restyle pass beyond tokens, DO NOT
  do it here, report it as deferred.

F4.2 PAGE HEAD (portal canvas): cover band (moderated-rail image
when one exists; DEFAULT soft gradient when none, owner approved),
overlapping page icon, eyebrow, one H1 + hangul subtitle, lede,
two pill actions (Explore / Play a quiz), per the prototype.

F4.3 RIGHT DATA RAIL (portal canvas). These are the first real
widgets. Clean server components reading the DB, counts via COUNT
queries (1000-row law: never fetchAllRows for counting):
- FACT SHEET: the group entity rail through factrail.ts (A2
  Data/Auto grammar, revert, moderated photo slot), source line
  "Wikidata · MusicBrainz · CC0".
- IN NUMBERS: releases / tracks / eras / awards counted live for the
  space's group.
- COMING UP: next member birthday computed from idols.birth_date
  (verified populated for all 7 BTS members). If any needed value is
  NULL for a space, render nothing (honest emptiness), never invent.
- THIS SPACE: pages count, members covered, releases covered,
  written-prose bar = published non-stub share vs total (honest).
- PLAY: real published quiz count for the group + up to 3 real
  quizzes linked.
- CURATORS: real curator count for the space.
Mobile order per prototype: fact sheet directly after the page head,
the remaining widgets AFTER the document sections.

F4.4 ANTI-OVERFLOW FOLD (reader side): long prose sections on the
portal collapse behind "Read more": FULL text stays in the served
HTML (crawlable-collapse law), max-height + fade + aria-expanded
toggle, threshold per the prototype. If the fold util is generic,
fine, but SCOPE = portal home sections only. The editor-side budget
nudge ("section outgrows -> child page") is DEFERRED to a co-design
with Cowork: do NOT invent editor UX in this run.

F4.5 CONTENT: the page body still comes from pages.blocks. You do
NOT write prose (Cowork authors the vitrine content after this
ships). Wire the existing home page blocks into the new layout.
Accent stays SYSTEM-NEUTRAL; a per-space accent hook is FUTURE,
flag it, do not build it. Verse stays admin-hidden; indexability
rules unchanged.

F4 ACCEPTANCE + receipts docs/proofs/vfoundation-f4/:
- Screenshots of the REAL BTS portal page: desktop light, desktop
  dark, mobile (fact card first visible).
- rail.txt: per widget, the rows produced (dt/dd/auto) with the
  SQL-sourced values behind them.
- fold.txt: proof the collapsed section's full text is present in
  the served HTML (curl the page, grep a sentence from the hidden
  part).
- One member page screenshot under new tokens + flags.

GATES (both phases): tsc, check:routes, verse-tokens, full build,
em-dash scan. DEFERRED expected: editor budget nudge, per-space
accent, document-canvas restyle, unit/label pages, galleries (C8).
Report format as usual, deviations stated honestly. STOP after the
report.
