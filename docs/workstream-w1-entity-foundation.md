# W1 - Verse entity foundation (schema + ingestion engine)

## Claude Code Implementation Prompt

---

Build the Verse data layer per docs/VERSE-MASTER-VISION.md, docs/VERSE-ROADMAP.md,
and the W0 verdict (docs/w0-report.md + scripts/spike-w0/ - read all three; the
six W0 findings below are REQUIREMENTS, not suggestions). No user-facing pages yet
(that is W2). This phase = schema, seed list, backfills, refresh cron, admin.

Hard rules: NO em dashes. Our DB is CANONICAL - open data fills around it, never
overwrites it. Living-persons policy enforced AT FETCH (property allowlist; the
excluded data is never requested, never stored). Official endpoints only, polite
rates (MusicBrainz 1 req/sec + proper User-Agent; Wikidata SPARQL per policy).
Commit per step, do NOT push. Migrations = owner stop-and-wait. check:routes green
(no new public routes expected; admin routes gated as usual).

## The six W0 findings as requirements

1. SEED LIST: entity resolution via a human-checked QID/MBID seed table, never
   live label search (the TXT vandalism / FIFTY FIFTY "1:1" traps).
2. CANONICAL PRECEDENCE: our names, slugs, fandom_names, rosters win. Ingested
   values live BESIDE ours with sources; a conflict never auto-overwrites.
3. FETCH ALLOWLIST: the exact Wikidata property whitelist from the W0 report;
   partners/family/residence/etc are never in any query.
4. NCT-style units: schema supports unit entities (parent group -> units).
5. Discography ingestion = FILTER: version/reissue/single-noise dedupe rules,
   KR/JP distinction, curator-facing review flags on ambiguous releases.
6. Title-cleanup matcher for songs (the 76%->~90% normalization from W0.2).

## Steps

### W1.1 - Schema migration (owner-run, stop-and-wait)

Extend existing tables as canonical; add (names indicative, worker refines):
- `idols` (id, group_id, unit_id nullable, canonical name from name-all roster,
  romanized/hangul name fields nullable, birth_date, nationality, positions[],
  photo_url from existing rosters, active bool, ord)
- `group_units` (id, parent_group_id, name, slug) for NCT-style structures
- `albums` (id, group_id, title, release_date, type album/ep/single, region
  kr/jp/other, cover_source note only - no image ingestion, mbid, review_flag)
- `album_tracks` (album_id, position, title, song_id nullable FK to our songs
  when matched, mbid)
- `entity_sources` (entity_type, entity_id, field, source wikidata/musicbrainz,
  source_ref, fetched_at) - every ingested fact attributable
- `entity_overrides` (same shape + value + author) - curator/owner corrections,
  ALWAYS outrank ingestion at read time
- `verse_seed_ids` (group_id, wikidata_qid, musicbrainz_mbid, checked_by,
  checked_at) - the human-checked seed list
RLS: public read on entity tables (public facts), writes service-role only.
One migration; number = check prod head.

### W1.2 - Seed list population

Generate the QID/MBID candidates for all groups from the spike scripts, then
produce a REVIEW TABLE for the owner: group -> proposed QID (label as fetched)
-> proposed MBID (name as fetched) -> confidence. Owner eyeballs the table
(catches any Tacos de asada), confirms; worker marks checked. Flagship 20 first,
long tail after. STOP for the owner review of the flagship 20 at minimum.

### W1.3 - Wikidata backfill

Resumable, rate-limited script: idols (birth dates, nationality, positions,
name variants where present), group fields (debut date, label, country,
website) - allowlist only. Writes with entity_sources rows. Cross-check idol
lists vs name-all rosters; mismatches -> review flags, never auto-adds of
unknown humans. Report coverage after: X idols, Y fields, Z flags.

### W1.4 - MusicBrainz backfill

Launch-first ordering (the 3 launch spaces, then flagship, then all). Release
groups -> filtered albums (dedupe rules from finding 5) -> tracklists ->
song-matching with the title-cleanup normalizer (finding 6). Ambiguity ->
review_flag, not a guess. Report per group: albums kept vs filtered out,
tracklist coverage, song-match rate.

### W1.5 - Refresh cron

Weekly delta sync (new releases, corrected dates), same allowlist, conflicts
with overrides NEVER overwrite (surface in admin instead), fail-soft + ops
Discord alert (existing pattern), vercel.json entry.

### W1.6 - Admin: Verse data dashboard

/admin/verse (gated, existing admin patterns): entity counts by type, source
coverage, review-flag queue (albums to keep/drop, idol mismatches), seed-list
status, manual re-run buttons per group, override editor (field-level corrections
writing entity_overrides). This dashboard is ALSO the future curator tooling's
skeleton - build it clean.

## Verify (end of phase)

- [ ] Living-persons proof: grep every query template; list every Wikidata
      property fetched; confirm none outside the allowlist. Show the list.
- [ ] Canonical precedence proof: set a deliberate override, re-run refresh,
      confirm the override survives and the conflict surfaces in admin.
- [ ] Seed-list integrity: zero entities ingested for unchecked groups.
- [ ] 3 launch-space groups fully seeded: idols complete vs rosters, albums
      filtered and flagged, tracklists matched (rates reported).
- [ ] Cron idempotent; backfill resumable mid-run (kill + resume test).
- [ ] Sources attributed on every ingested fact (spot-check 10).
- [ ] tsc, build, check:routes green; zero em dashes; no new npm dependency
      without loud justification; admin 307/401 gates verified.

/caveman report per step. W1.2's owner review table and W1.4's filter stats are
the key deliverables to show in full.
