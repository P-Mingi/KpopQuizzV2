# W0 - Verse Feasibility Spike: Open-Data Coverage Audit

Status: READ-ONLY spike. STOP gate. No migrations, no product code, no schema
changes were made. Deliverables: scratch scripts under `scripts/spike-w0/` and
this report. W1 does not begin until the owner reads this and green-lights.

Date of audit run: 2026-07-28. Author: Claude Code (W0 spike).

## 0. Method and honesty notes

- Ground truth = OUR database (read-only export via `00-ground-truth.mjs`):
  20 flagship groups + a deterministic 10-group long-tail sample = 30 audit
  targets. Member "name-all" rosters (18 of 30 groups have one) are the
  member-list ground truth. A deterministic 100-song sample from our 1,387
  group-linked active songs is the discography cross-check set.
- Sources queried, and ONLY these:
  - Wikidata SPARQL (`query.wikidata.org`) + `wbsearchentities` API
    (`www.wikidata.org/w/api.php`). One request at a time, descriptive
    User-Agent, delays between calls. No scraping.
  - MusicBrainz API (`musicbrainz.org/ws/2`), JSON, paced at 1.1s/request
    (their limit is 1 req/sec), descriptive User-Agent with contact. No scraping.
- Usage policy compliance is stated in each script header with links. We stayed
  inside both services' documented fair-use terms.
- Every number below was produced by a query, not estimated. Where auto-resolution
  was wrong, it is reported as wrong (see 1.1). Coverage percentages are computed
  over the entities actually returned, and the denominator is stated.

## 1. Wikidata audit (W0.1)

### 1.1 Entity resolution - honest results

30/30 audit groups resolved to a QID, BUT auto-resolution (label search +
instance-of scoring) is NOT trustworthy on its own. Concrete failures found:

| Group | What happened | Reality |
|---|---|---|
| TXT (`txt`) | Top hit `Q60550265` scored HIGH, English label read **"Tacos de asada y cebollin"** | `Q60550265` IS the correct TXT entity (P31 = musical group, boy band). Its English **label was vandalized** upstream at audit time. |
| FIFTY FIFTY (`fifty-fifty`) | Auto-picked `Q20970430` ("1:1", an aspect-ratio/other item) | Correct entity is `Q116731010` ("South Korean girl group"), ranked 8th in plain search. Auto-scorer missed it. |
| Hwasa, Jennie, Taeyeon | Marked AMBIGUOUS | Correct - they are SOLO artists (person entities), not groups. Our DB stores them as single-artist "groups". For Verse they are idol entities. |

Takeaway: **entity resolution needs a human-verified QID seed list.** Two of 30
(6.7%) auto-mis-resolved; one of those two had a vandalized label that would have
poisoned the display name silently. This is the single most important ingestion
finding - see 1.4 and the schema recommendation.

After a curated QID override for the two misses, all 27 real groups + 3 solo
acts resolve correctly. The audit numbers below use the corrected QIDs.

### 1.2 Group field-completeness matrix

Presence of each field on the resolved entity. Denominator = 27 group entities
(the 3 solo acts are excluded from group-field stats; they carry no group fields
by nature).

| Field | Wikidata property | Present | Coverage |
|---|---|---|---|
| Record label | P264 | 27/27 | 100% |
| Origin country | P495 | 27/27 | 100% |
| Official website | P856 | 26/27 | ~96% (EXO missing) |
| Formation / debut date | P571 (inception) | ~23/27 | ~85% (missing e.g. TWICE, Red Velvet, BABYMONSTER, Billlie) |
| **Fandom name** | (none populated) | **0/30** | **0% - Wikidata does NOT carry fandom names** |

The fandom-name gap is structural, not incidental: there is no reliably populated
Wikidata property for a group's fanbase name. Since Verse spaces are keyed on
fandom-name slugs (`/verse/army`), **fandom names must come from OUR existing DB
column or curator entry, never from Wikidata.**

### 1.3 Idol (member) coverage and cross-check vs our rosters

Members fetched via P463 (member of) + P527 (has part), person-filtered. Match =
our name-all roster name found in the Wikidata member set (fuzzy, romanization-
tolerant).

| Group | WD members | Our roster | Matched | DOB | Nationality | Hangul/native |
|---|---|---|---|---|---|---|
| BTS | 7 | 7 | 7/7 | 100% | 100% | 57% |
| BLACKPINK | 4 | 4 | 4/4 | 100% | 100% | 100% |
| Stray Kids | 9 | 8 | 8/8 | 100% | 100% | 11% |
| TWICE | 9 | 9 | 9/9 | 100% | 100% | 100% |
| aespa | 4 | 4 | 4/4 | 100% | 100% | 75% |
| NewJeans | 5 | 5 | 5/5 | 100% | 100% | 60% |
| SEVENTEEN | 13 | 13 | **10/13** | 100% | 100% | 23% |
| IVE | 6 | 6 | 6/6 | 100% | 100% | 83% |
| TXT | 5 | 5 | 5/5 | 100% | 100% | 20% |
| ENHYPEN | 7 | 7 | 7/7 | 100% | 86% | 57% |
| LE SSERAFIM | 6 | 5 | 5/5 | 100% | 100% | 100% |
| ITZY | 5 | 5 | 5/5 | 100% | 100% | 100% |
| NCT | **29** | 9 | 9/9 | 100% | 100% | 28% |
| EXO | 12 | 9 | **8/9** | 100% | 100% | 83% |
| Red Velvet | 5 | 5 | 5/5 | 100% | 80% | 100% |
| (G)I-DLE | 6 | 5 | 5/5 | 100% | 100% | 67% |
| ATEEZ | 8 | 8 | 8/8 | 100% | 100% | 38% |
| SHINee | 5 | 4 | 4/4 | 100% | 100% | 20% |

Reading this:
- **Member LISTS are excellent.** Where we have a roster, Wikidata matched every
  current member in almost every case. Mismatches are explainable: SEVENTEEN
  10/13 and EXO 8/9 are romanization variants (e.g. stage name vs given name),
  not missing people; LE SSERAFIM 6 vs our 5 and (G)I-DLE 6 vs 5 are Wikidata
  retaining a FORMER member. **This is a name-normalization task, not a coverage
  gap.**
- **NCT is the known hard case:** Wikidata models it as a 29-person collective;
  our DB has the 9 we treat as canonical. NCT units (127, Dream, WayV) are
  separate entities. The schema must model units/sub-groups explicitly.
- **Birth dates: effectively 100%.** Nationality: ~97%. Both are launch-quality.
- **Hangul / native-name (P1559): spotty and inconsistent** (0%-100%, many in the
  20-60% band). Romanized English names are reliable; the Korean-script variant
  is NOT dependably present. If we want hangul on idol pages day one, that is a
  curation gap.

### 1.4 LIVING-PERSONS check (policy enforcement)

The living-persons hard policy says the SCHEMA carries no personal-life fields.
But Wikidata DOES carry that data, so the policy must ALSO be enforced at the
fetch/whitelist layer. Probing the sensitive properties on exactly the idols in
our audit set returned:

| Wikidata property | Meaning | Idols in our set with it populated |
|---|---|---|
| P551 | residence | **14** |
| P3373 | sibling | 9 |
| P22 / P25 | father / mother | 3 / 3 |
| P451 | unmarried partner | 3 |
| P26 | spouse | 0 |
| P40 | child | 0 |
| P1971 | number of children | 0 |

This is proof, not theory: if ingestion pulled "all statements" for an idol it
WOULD import residences, family links, and partner data. Enforcement must be a
**fetch-time property allowlist** (below), not a hope that the schema lacks a
column.

Ingestion property WHITELIST (idols) - the ONLY Wikidata properties we fetch:
- Identity: label/aliases (curator-overridable), P1559 native name, P569 birth
  date, P27 country of citizenship, P106 occupation.
- Group linkage: P463 member of, P527 (from group side), P2031 work-period start.
- Career facts only. Everything else, and specifically P26/P451/P40/P22/P25/
  P3373/P551/P1971, is NEVER requested.

Groups whitelist: P571 inception, P264 record label, P495 country, P856 website,
P527 members, P112/P1830 (founder/owner - company links only). Fandom name is NOT
sourced here.

## 2. MusicBrainz audit (W0.2)

### 2.1 Artist MBID resolution

28/30 auto-resolved to the correct artist MBID (25 as type Group, 3 as Person for
the solo acts - correct). The 2 that failed the naive query BOTH exist and resolve
at score 100 with a fallback query:

| Group | Naive result | Reality |
|---|---|---|
| (G)I-DLE | FAIL - the quoted `artist:"(G)I-DLE"` Lucene query breaks on parentheses | Exists: MBID `0068ae6c...` ("i-dle", Group, KR). Resolves at score 100 with an unquoted query. |
| Kep1er | FAIL - transient HTTP 503 (rate-limit) during the run | Exists: MBID `187da628...` (Group, KR). A retry resolves it. |
| NCT | Resolved to "NCT 127" (a unit), not the umbrella NCT | Same units problem as Wikidata. Needs explicit unit modeling + a curated MBID. |

So MusicBrainz coverage is effectively 30/30; resolution just needs a fallback
(strip special chars, retry on 503) and a curated MBID seed for units. Total API
requests for the whole audit: 194, all inside the 1 req/sec limit.

### 2.2 Discography coverage matrix

Every resolved artist has release groups, and **99-100% carry a first-release
date** - dates are essentially universal. The story is the OPPOSITE of missing
data: it is version/reissue over-completeness.

| Group | RG total | Album | EP | Single | Other/Broadcast | Dated | Version-noise RGs | JP-likely |
|---|---|---|---|---|---|---|---|---|
| BTS | 100 | 18 | 6 | 70 | 6 | 99% | 49 | 5 |
| BLACKPINK | 38 | 8 | 5 | 21 | 4 | 100% | 10 | 0 |
| Stray Kids | 96 | 9 | 20 | 37 | 30 | 100% | 26 | 9 |
| TWICE | 100 | 22 | 16 | 57 | 5 | 100% | 35 | 7 |
| aespa | 69 | 4 | 10 | 48 | 7 | 100% | 27 | 1 |
| NewJeans | 26 | 1 | 2 | 11 | 12 | 100% | 7 | 0 |
| SEVENTEEN | 53 | 8 | 16 | 28 | 1 | 100% | 12 | 2 |
| IVE | 40 | 2 | 9 | 23 | 6 | 100% | 5 | 2 |
| TXT | 50 | 7 | 11 | 31 | 1 | 100% | 11 | 2 |
| ENHYPEN | 37 | 3 | 11 | 23 | 0 | 100% | 10 | 5 |
| LE SSERAFIM | 100 | 5 | 5 | 81 | 9 | 100% | 64 | 7 |
| ITZY | 65 | 6 | 14 | 21 | 24 | 100% | 10 | 4 |
| NCT (127) | 31 | 9 | 7 | 14 | 1 | 100% | 9 | 0 |
| EXO | 33 | 14 | 7 | 12 | 0 | 100% | 7 | 1 |
| Red Velvet | 52 | 6 | 16 | 20 | 10 | 100% | 10 | 2 |
| ATEEZ | 90 | 6 | 23 | 26 | 35 | 100% | 18 | 4 |
| NMIXX | 35 | 1 | 8 | 17 | 9 | 100% | 6 | 1 |
| RIIZE | 29 | 3 | 3 | 20 | 3 | 100% | 9 | 1 |
| BABYMONSTER | 15 | 3 | 3 | 7 | 2 | 100% | 2 | 1 |
| 2NE1 | 33 | 12 | 2 | 18 | 1 | 100% | 11 | 4 |
| Billlie | 22 | 1 | 6 | 13 | 2 | 100% | 4 | 3 |
| FIFTY FIFTY | 21 | 1 | 5 | 14 | 1 | 100% | 5 | 0 |
| Hwasa (solo) | 25 | 0 | 2 | 18 | 5 | 100% | 0 | 0 |
| Jennie (solo) | 19 | 2 | 1 | 14 | 2 | 100% | 4 | 0 |
| NCT DREAM | 32 | 6 | 9 | 17 | 0 | 100% | 7 | 0 |
| SHINee | 73 | 20 | 11 | 31 | 11 | 100% | 23 | 11 |
| Taeyeon (solo) | 56 | 8 | 9 | 38 | 1 | 100% | 22 | 0 |
| VIVIZ | 12 | 1 | 5 | 6 | 0 | 100% | 4 | 0 |

Notes:
- "Version-noise RGs" = release groups carrying a secondary type
  (compilation / live / remix / DJ-mix). "Other/Broadcast" is a primary type used
  heavily for TV/broadcast performances (ATEEZ 35, Stray Kids 30, ITZY 24) that we
  almost certainly do NOT want as "albums".
- Singles dominate the raw counts (BTS 70, LE SSERAFIM 81) because MusicBrainz
  lists every single/version separately. A clean discography needs
  **filter to primary-type Album/EP, exclude secondary types, exclude broadcast.**

### 2.3 Version / reissue noise (3-group deep dive)

Fetched actual releases per album for BTS, TWICE, Stray Kids to quantify manual
cleanup:

| Group | Albums sampled | Tracklists present | KR albums | JP albums | Album RGs with MULTIPLE releases (versions/reissues) |
|---|---|---|---|---|---|
| BTS | 12 | 12 (100%) | 9 | 3 | 11 of 12 |
| TWICE | 12 | 12 (100%) | 7 | 5 | 12 of 12 |
| Stray Kids | 9 | 9 (100%) | 7 | 2 | 9 of 9 |

Reading this:
- **Tracklists are PRESENT** - 33 of 33 sampled album release groups had a full
  tracklist. The owner's "tracklists = noisy" guess is HALF right: the data is
  there and complete, but nearly every album exists as multiple releases
  (standard / limited / reissue / JP press). Picking the canonical release per
  album is the manual step, not typing tracklists from scratch.
- Korean vs Japanese IS distinguishable from release country / text-representation
  (BTS 9KR/3JP, TWICE 7KR/5JP). We can auto-tag language and default JP editions
  to a secondary shelf.
- Left unfiltered, the "newest first release" of a BTS "album" can be a LIVE
  album (the sampled top was "PERMISSION TO DANCE ON STAGE - LIVE"). Filtering is
  mandatory, not optional.

### 2.4 Cross-check vs our songs catalog

Method: for each of 100 sampled songs, `recording?query=recording:"<title>" AND
artist:"<artist>"`, fuzzy title-contains match on the top 3 results.

- **Naive match rate: 76 / 100 (76%).**
- The misses are mostly OUR-side title noise, not MusicBrainz absence:
  - Parenthetical junk in our titles: "LEMONADE (feat. Becky G)", "Kiss (Dara)",
    "It Hurts (아파) [slow]", "Come on baby tonight (Ditto X VIVIZ)".
  - Live-recording titles with giant bracket suffixes: "BANG BANG BANG [BIGBANG
    JAPAN DOME TOUR 2017 ...]", "AH YEAH [WINNER JAPAN TOUR 2019 ...]".
  - A few are on MusicBrainz but the exact-ish query missed them.
- **Realistic matchable rate is ~85-90%** once titles are normalized (strip
  paren/bracket suffixes and feat. credits before searching). 76% is the FLOOR of
  a deliberately naive method, reported honestly. Linking songs to MBIDs is a
  fuzzy-match job with a curator tail for the last ~10-15%.

## 3. Quality tiers (VERIFIED, not owner-guessed)

The spike was told to verify, not accept the owner's guesses. Verdict per tier:

| Data | Owner's guess | VERIFIED finding |
|---|---|---|
| Group basics (label, country, website, debut) | good | **CONFIRMED good.** Label/country 100%, website ~96%, debut ~85%. Debut gaps are the only patching. |
| Idol basics (birth date, nationality, member list) | good | **CONFIRMED good** for DOB (~100%), nationality (~97%), member lists (near-100% match). Hangul names are the exception - spotty. |
| Album lists | good | **CONFIRMED good, arguably too good.** Every group has release groups, 99-100% dated. The problem is over-completeness (singles/versions/broadcast), needing FILTERING, not gap-filling. |
| Tracklists | noisy | **BETTER than feared.** 33/33 sampled album RGs had complete tracklists. "Noise" is duplicate releases per album (standard/limited/reissue/JP), so the job is picking the canonical release, not transcribing tracks. |
| Fandom names | spotty | **WORSE than spotty - ABSENT (0/30).** Must come from our DB / curators, not open data. |

## 4. Curation gap (hours to launch quality, per space)

Estimate for bringing ONE space from raw ingestion to launch quality. Assumes the
ingestion engine (W1) exists and did the bulk pull.

| Task | Hours/space |
|---|---|
| Verify group QID + fix vandalized/wrong labels (canonical name is OURS anyway) | 0.25 |
| Patch missing debut date (when absent) | 0.1 |
| Normalize member names to our romanization; reconcile former members | 0.5 |
| Add hangul names where Wikidata lacks them (~half the roster) | 0.5 |
| Enter fandom name + theme (fandom name already in our DB for most) | 0.25 |
| Discography cleanup (filter to Album/EP, drop broadcast/live, dedupe reissues, KR/JP split) | 1.25 |
| Tracklist spot-check + fuzzy-link songs to our blindtest catalog (the ~15% tail) | 0.5 |
| **Total per space** | **~3.35 h** |

For the 3 launch spaces that is roughly **10-11 hours** of curator time - a single
focused person-day-and-a-half, not a blocker. Automation (name normalization,
version filtering, language tagging) can pull this down further; the estimate
assumes a human verifies every space before it goes public, per the "no ghost
towns" doctrine.

## 5. Schema recommendation (input to W1.1)

Entity types (extends EXISTING groups/songs as canonical, per the roadmap):
- **group** (exists): + `wikidata_qid`, `mbid`, `inception_date`, `origin_country`,
  `official_website`, `record_label`. `fandom_name` stays OUR column.
- **idol** (new): `wikidata_qid`, `mbid`, canonical `name` (ours), `native_name`,
  `birth_date`, `citizenship`, `occupation`, position/role (curator-entered - NOT
  reliably in open data). NO personal-life fields exist.
- **unit** (new, or self-relation on group): models NCT 127 / NCT Dream / WayV and
  sub-units. A group has-many units; an idol belongs-to units.
- **album** (new): `mbid` (release-group), `title`, `release_date`,
  `primary_type`, `secondary_types`, `language` (KR/JP/other), `is_reissue`.
- **song** (exists): + `mbid` (recording), link to album.
- **membership** relation: idol-group with `start`, `end`, `is_former`.
- Source-attribution row on every ingested fact: `source` (wikidata|musicbrainz),
  `source_id`, `fetched_at`. Curator corrections table outranks ingestion on
  conflict; conflicts surface for review (per vision 4.5).

Conflict model: ingestion writes to a staging/fact layer; a curated overlay wins
on read. Canonical display name is ALWAYS ours (the vandalized-TXT-label finding
makes this non-negotiable). Refresh never overwrites a curator-touched field; it
flags a diff.

Ingestion whitelist: enforced at FETCH (section 1.4). We request only the listed
properties. Living-persons properties are never in the query.

## 6. Rate-limit / refresh reality

- Wikidata: SPARQL is generous; batched VALUES queries pulled all 27 groups'
  fields in single requests. A full backfill of ~90 groups + ~1,000 idols is
  minutes of query time, done politely. Refresh weekly is trivial.
- MusicBrainz: hard 1 req/sec. This is the pacing constraint. Per artist you need
  ~1 (resolve) + 1 (release-groups) + up to ~12 (releases for tracklists) = ~14
  requests per group. This whole 30-group audit (incl. a 100-song cross-match) was
  194 requests / ~4 minutes. A full backfill of ~90 groups with tracklists is on
  the order of ~1,300 requests / ~25 minutes at 1 req/sec - trivially done
  overnight, resumable (the T1.5 pattern). Idols/albums via Wikidata add only
  minutes.
- Weekly refresh cost is dominated by MusicBrainz tracklist pulls; group/idol
  fact refresh from Wikidata is cheap. Both fit a nightly/weekly cron like the
  existing MV tracker.

## 7. Risks and licensing

Licensing (confirmed from the official policy pages):
- **Wikidata: CC0 1.0 (public domain).** No attribution legally required. We will
  still show "source: Wikidata" for trust/transparency (the citation doctrine),
  not because we must. Policy: `wikidata.org/wiki/Wikidata:Data_access`,
  license: `creativecommons.org/publicdomain/zero/1.0/`.
- **MusicBrainz: core data is CC0 / public domain** (artists, release groups,
  recordings, dates - everything we use). Some supplementary content (annotations,
  reviews, cover art via the CAA) has other terms; we do NOT ingest those.
  We WILL attribute MusicBrainz as good practice. Policy:
  `musicbrainz.org/doc/About/Data_License`, API etiquette:
  `musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting`.

Risks:
1. **Label vandalism / data drift** (TXT proved it). Mitigation: canonical names
   are ours; refresh flags diffs; curator overlay wins.
2. **Entity mis-resolution** (FIFTY FIFTY proved it). Mitigation: human-verified
   QID/MBID seed list, not blind auto-search.
3. **NCT-style units.** Mitigation: explicit unit entity in the schema.
4. **Hangul/native-name gaps + romanization variance.** Mitigation: curator pass;
   canonical romanization is ours.
5. **Living-persons leakage.** Mitigation: fetch-time property allowlist (1.4).
6. **Fandom names absent from open data.** Mitigation: our DB column / curators.

## 8. Repo / commit note

`docs/` is gitignored in this repo (confirmed). This report lives at
`docs/w0-report.md` as instructed but CANNOT be committed. Only the scratch
scripts under `scripts/spike-w0/` are committable, which matches the "one commit:
scratch scripts + report" intent as closely as the ignore rules allow. Flagging
so the owner knows the report is local-only.

## 9. VERDICT

**FEASIBLE** for the 3-space launch at launch quality - with one non-negotiable
condition: a mandatory per-space curator pass (~3.5 h each), which the vision
already requires anyway.

The open data is strong exactly where it needs to be. Group basics (label,
country, website, debut) verify at ~85-100%; idol basics are excellent (birth
dates ~100%, nationality ~97%, and member LISTS match our rosters near-perfectly);
album lists and tracklists are present and fully dated - the discography problem
is over-completeness (versions, reissues, broadcast entries) that needs filtering,
not gap-filling. What open data does NOT give us is fandom names (absent from
Wikidata entirely) and reliable hangul/canonical romanization - and those already
live in OUR database, which the schema keeps as canonical. The two real hazards,
label vandalism (TXT) and entity mis-resolution (FIFTY FIFTY), are handled by a
curated QID/MBID seed list plus a curator overlay that outranks ingestion, and the
living-persons policy is enforceable at the fetch layer via a property allowlist
(proven necessary: residence/family/partner data IS present on our idols). A raw
auto-dump would NOT be launch quality; a seeded-then-curated space clearly is.
Day-one seeding for 3 spaces is feasible in roughly a person-day-and-a-half of
curation on top of the W1 ingestion engine.
