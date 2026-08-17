# W-SEED - starter collection catalogs for the launch spaces

## Claude Code Implementation Prompt

---

The Collections feature (photocards migration 136, collectibles migration 138)
min-gates itself invisible when empty, and every launch space is empty. Seed a
STARTER catalog per launch space so the feature is alive on day one and the
founding curators inherit a base to extend, not a blank wall. Read first:
VERSE-MASTER-VISION.md, the collections schema (136/138), the spotlight module
(W-CUSTOM step 5), the min-gate thresholds.

Hard rules: NO em dashes. NO scraping, ever: not pca-style photocard sites,
not fan wikis, not shops. NO images: text-first entries only (strict-legal
images v1; photocard scans are copyrighted, period). Commit per step, do NOT
push. NO migration expected; if the seed reveals a schema gap, STOP and report
instead of migrating. No new deps.

## The honesty law of this workstream (the TXT-vandalism lesson)

A catalog entry may ONLY be seeded when its facts are confirmed by a citable
source: official artist/label store listings, official album announcements,
label press releases, MusicBrainz release data for album versions. Every entry
carries source_url. If a version's inclusion list cannot be confirmed from
such a source, DO NOT seed it. A smaller true catalog beats a bigger guessed
one; NOTHING is generated from memory. Report per space what was skipped for
lack of a source, honestly.

## Scope (deliberately small)

- The launch spaces in prod (check the DB for which spaces exist; seed all).
- Per space: the last 2-3 major album releases. Per release: the official
  versions, and per version the photocard inclusion set (member x set matrix)
  ONLY where sourced. Plus flagship collectibles: the official lightstick
  (name, generation) and 3-5 major official merch items if sourceable.
- Target: enough rows that the Collections tab and the spotlight module pass
  their min-gates on every launch space. Report the exact counts per space.
- Entries seed as published ONLY when sourced; anything uncertain stays out
  (not draft-spam, OUT).

## Amendment (owner decision, 2026-07-30, after the honest zero-seed report)

- Photocards and merch: stay EMPTY at launch by design. They become the
  founding curators' first quests (the computed quest board should surface
  "add the first photocards" as a gap once curators exist).
- Lightsticks ONLY: allowed sources widen to major music press (Billboard,
  NME, Soompi, Rolling Stone and peers). One entry per launch space (official
  lightstick name + generation where stated), each cited with the press URL,
  worker-verified from the fetched article text, never from memory. If a name
  cannot be confirmed in fetched press text, that space's lightstick stays
  out too.
- Everything else in this spec stands unchanged.

## Mechanics

- Seed as a re-runnable, idempotent script (same pattern as the showcase
  seed): checks existence before insert, safe to re-run, attributed to the
  system/owner account, not a fake user.
- Respect the schema exactly as shipped in 136/138; entries must render in
  the existing checklist + spotlight UIs without UI changes.
- After seeding: exercise the reader path per space (Collections tab renders,
  checklist toggling works on a real entry, spotlight rotates when >=1 card).

## Verify

- [ ] Every seeded row has a source_url; spot-check output lists 5 random
      entries per space with their sources for owner review
- [ ] Zero external hosts fetched beyond the citable sources listed in the
      report (name every host contacted)
- [ ] Min-gates pass on all launch spaces; counts reported per space
- [ ] Skipped-for-no-source list reported per space
- [ ] Script idempotent (second run = zero new rows)
- [ ] tsc, build, check:routes green; zero em dashes; no new deps; no
      migration

/caveman report: counts per space, the 5-entry source spot-check per space,
the skipped list, hosts contacted, screenshots of Collections + spotlight
live on each launch space.
