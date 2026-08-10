# REPORT - iteration 6 PART C: per-type page templates (mission complete)

PART C of the validated design system, from prototypes/verse-child-templates.html. Parts A (shell,
6d45206) and B (index, c161ee7) are committed. Scoped to /verse; Play untouched. tsc 0; next build
green. Nothing pushed. This completes the 3-part mission.

## What changed
apps/quiz/src/app/verse/[slug]/[pageSlug]/page.tsx now branches on page.type and passes per-type
slots (topSlot, bodyExtras, variant, suppressHeadings) to DocumentPage, which gained those slots.
New presentational components: apps/quiz/src/components/verse/tree/type-templates.tsx. All data is
DB-derived; nothing is fabricated (a track links only if its page exists; awards ship an empty shell).

- release (type='release'): the fact rail already carries release date · type · track count · era
  link. Added a real, structured TRACKLIST from album_tracks (numbered, each track a link to its
  track page). The release prose's now-redundant static "Tracklist" section is suppressed
  (suppressHeadings=['tracklist']) so it renders once, linked, and the TOC stays honest. (Lead-
  single marking is omitted: album_tracks has no reliable flag, and the real-data law forbids
  guessing.)
- era (type='era'): a "Chapter · <years>" band eyebrow above the title, the Overview prose, a
  "Releases in this chapter" COVER GRID (the era's real albums, each linked to its release page),
  and a previous/next CHAPTER nav (the neighbouring eras by date, linked).
- award (type='award'): the data-template SHELL - a year/category/result table header + an honest
  empty state. Awards are stubs; no rows are invented (the page stays noindex until it has data).
- member (type='member'): unchanged - it already has the photo + fact rail + solo-work structure;
  it inherits the new shell + tokens from PART A.
- BU pages (any page under bu-index): a violet 'lore' accent variant (--v2-bu #6D4AA6 light /
  #A98BD6 dark) applied via .vdoc-bu (re-scopes --v2-accent), plus a violet "BTS Universe · lore"
  eyebrow. Same white system, violet accent only.
- track / tour / show: keep the DocumentPage shell (compact prose + fact rail), inheriting the new
  tokens; their fact rails already carry the album/date and years/seasons.

## VERIFY C (docs/proofs/v3nav-iter6c/)
- release-tracklist.png : MAP OF THE SOUL : PERSONA - fact rail + Overview + the single linked
  7-track tracklist (prose duplicate suppressed).
- era-chapter.png       : Love Yourself - chapter band, Overview, the 2-album cover grid, and the
  previous (HYYH & WINGS) / next (Map of the Soul) chapter nav.
- bu-violet.png         : The Notes - the BU violet 'lore' eyebrow + accent.
- member.png            : Jungkook - the member shell on the new tokens (unchanged structure).

## FILES
- apps/quiz/src/components/verse/tree/type-templates.tsx   (NEW - Tracklist / EraReleases / EraNav / AwardShell / TypeEyebrow)
- apps/quiz/src/components/verse/tree/document-page.tsx     (topSlot / bodyExtras / variant / suppressHeadings)
- apps/quiz/src/app/verse/[slug]/[pageSlug]/page.tsx        (per-type branching + DB reads)
- apps/quiz/src/styles/globals.css                          (--v2-bu token; .vtpl-* + .vdoc-bu CSS)

## GATES
tsc 0; next build PASS. Play outside /verse byte-identical. Every fact/tracklist/cover DB-derived
(real-data law); tracks + covers + chapter nav are crawlable <a>; awards invent no rows. Nothing pushed.

## MISSION COMPLETE
PART A (shell: grey/white separation + light top block + full-bleed) - 6d45206.
PART B (redesigned auto-list index with rich hover cards) - c161ee7.
PART C (per-type page templates) - this commit.
One content follow-up for Cowork (not code): a few release pages carry a static tracklist in their
prose that the structured tracklist now supersedes; the render suppresses it, but trimming it from
the source prose would be tidier.
