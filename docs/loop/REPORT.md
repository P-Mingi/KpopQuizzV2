# REPORT - Verse bulk wave: de-stub 184 track pages (Task B) + Dynamite migration (Task A)

DB writes only. Nothing pushed to git. Covenant kept: DB-true minimum, nothing invented.

## TASK B - de-stub the non-title track pages (DONE, applied to the DB)
Idempotent seeder: apps/quiz/scripts/verse/seed-track-stubs.ts (service role, --apply flag).

COUNTS (apply run):
- track pages total: 197 (is_stub=false already: 13 - the title tracks Cowork enriched)
- stubs scanned (excl. skip-list): 184
- ENRICHED (changed): 184
- skipped-unchanged (byte-identical): 0
- skipped-title-track (skip-list still is_stub=true): 0  (none - the 13 are already is_stub=false)
- no matching album page (link dropped -> plain text): 0  (100% linked - every album has a release page)
- no entity/album resolvable: 0
- earliest-album diverged from own album: 4  (all LEGITIMATE re-releases, verified: "Make It Right",
  "Dionysus", "Intro : Persona", "Jamais vu" each appear on MAP OF THE SOUL : PERSONA (2019-04-12)
  AND MAP OF THE SOUL : 7 (2020-02-21); the earliest-by-title rule correctly picks PERSONA.)

Each enriched page now has: heading "Overview" + one DB-true paragraph
("<Title> is a track on <album linked to its release page>, released <Month D, YYYY>.") +
a divider + the bold-lead source note. Every enriched page got exactly one new page_revisions
row (rev = prior max + 1, author 00000000-0000-4000-8000-000000005eed). is_stub set false,
updated_at bumped. slug/type/parent_id/status/created_by untouched.

SAMPLE ENRICHED SLUGS:
- jamais-vu -> MAP OF THE SOUL : PERSONA [map-of-the-soul-persona] (April 12, 2019)
- aliens / swim / they-don-t-know-bout-us -> ARIRANG [arirang] (March 20, 2026)
- intro-skool-luv-affair / bts-cypher-pt-2-triptych -> Skool Luv Affair [skool-luv-affair] (Feb 12, 2014)

RENDER VERIFIED LIVE (/verse/bts/jamais-vu): one H1; the 3 empty headings gone; the paragraph
renders with a WORKING internal link to /verse/bts/map-of-the-soul-persona; the source note shows.

IDEMPOTENT: a dry re-run now scans 0 stubs (all are is_stub=false) -> 0 changes, 0 duplicate
revisions. Re-applying is a safe no-op.

## HARD GATE - ZERO ORPHANS: PASS
  select count(*) from pages where space_id=1 and status='published'
    and type not in ('index','portal') and parent_id is null;  =>  0
Also asserted: all 197 track pages keep parent_id = 23 (distinct parent set = {23}); the 13
skip-list pages are all still is_stub=false (untouched).

## TASK A - Dynamite data model (GATED - migration PREPARED, NOT applied)
FINDINGS (schema investigation):
- Releases are `albums` rows (observed type set: 'ep','album' only - NO 'single' type) with
  tracks in `album_tracks`. There is NO singles / releases / release_types table.
- BTS "Dynamite" = album_tracks id 2815 on albums id 7 "BE" (release_date 2020-11-20). The Verse
  "dynamite" page (id 133) binds to entity_id 2815. It is already is_stub=false (Cowork's prose
  states the single truth). Truth: standalone digital single released 2020-08-21, later added to BE.
- RIPPLE:
  - Verse: release-date derivations (fact rail / did-you-know / the track-stub prose) take the
    EARLIEST album by title. Today that is BE (2020-11-20). After the migration adds the single
    (2020-08-21), the earliest becomes the single -> the Verse derives the correct date. Positive.
  - Discography count: adding a release row moves BTS albums 17 -> 18; whether it gets its own
    release PAGE is a separate re-seed decision (owner's call), not part of this migration.
  - Play side: quizzes / questions / games are self-contained jsonb; NONE read Dynamite's
    album/date live (0 quizzes even reference it by title), so no runtime break. Any quiz PROSE
    that says "Dynamite (BE, 2020)" is a content inconsistency to fix later, not a data break.
  - Code that switches on albums.type (ep vs album) should be audited to handle a new 'single'
    value gracefully (flagged for the owner).
- PREPARED MIGRATION: docs/pending-migrations/151_dynamite_single.sql (BEGIN/COMMIT, idempotent
  guards). It (1) adds a 'single' release row for Dynamite (2020-08-21), (2) links the recording
  to it (keeping the BE track - Dynamite is genuinely on both), and (3) leaves an OPTIONAL,
  commented page-repoint. It also documents an OWNER PRE-STEP: if a CHECK constraint restricts
  albums.type, widen it to include 'single' before running. NOT self-applied (owner SQL gate).

## STOP
Task B complete + verified (184 enriched, zero orphans, idempotent, renders). Task A migration
prepared for the owner. Nothing pushed.
