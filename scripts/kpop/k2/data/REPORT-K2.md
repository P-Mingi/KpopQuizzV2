# Lot K2: report

Run of 2026-11-02 by scripts/kpop/k2 (fetch, build, sql). Adult cutoff: born on or before 2008-11-02. Sources: Wikidata, MusicBrainz, English Wikipedia. Nothing was read from or written to a database.

## Counts

- New idols (adult, complete, double-checked): **66** in 15 groups (target 110).
- 021b activations (the unreserved yes of K1): **11** of 12.
- Minors excluded: **6** in the included groups (7 counting every group read). Counted only: no name, no date is kept.
- Conflict list: data/k2-conflicts.json, 123 lines (36 conflicts, 79 single-source, 1 resolved by majority).

## Per group

| group | plays | status | idols added | excluded (reason: count) | nationality from Wikidata alone |
|---|---|---|---|---|---|
| loona | 200 | not inserted: no member passed the rules | 0 | status_conflict: 11 | 0 |
| got7 | 137 | included | 5 | debut_conflict: 2 | 0 |
| monsta-x | 214 | included | 6 | - | 0 |
| girls-generation | 564 | included | 7 | debut_conflict: 1 | 0 |
| zerobaseone | 32 | included | 3 | debut_conflict: 1, birth_unverified: 1 | 0 |
| mamamoo | 31 | included | 4 | - | 0 |
| bigbang | 239 | included | 3 | - | 0 |
| katseye | 802 | included | 4 | debut_conflict: 1, no_wikidata_item: 1 | 0 |
| illit | 3477 | included | 4 | nationality_conflict: 1 | 1 |
| treasure | 23 | included | 6 | gender_single: 1, birth_unverified: 2, debut_conflict: 1 | 1 |
| dreamcatcher | 14 | not inserted: no member passed the rules | 0 | debut_unknown: 4, debut_conflict: 3 | 0 |
| tws | 48 | included | 6 | - | 1 |
| p1harmony | 12 | included | 5 | birth_unverified: 1 | 1 |
| cortis | 3402 | included | 3 | -minors: 2 | 1 |
| hearts2hearts | 128 | included | 3 | nationality_conflict: 1, minors: 4 | 0 |
| kickflip | 124 | not inserted: no member passed the rules | 0 | no_wikidata_item: 7 | 0 |
| tuide | 124 | not inserted: no member passed the rules | 0 | birth_unverified: 7 | 0 |
| lngshot | 91 | not inserted: no member passed the rules | 0 | no_wikidata_item: 4 | 0 |
| artms | 77 | not inserted: no member passed the rules | 0 | debut_conflict: 5 | 0 |
| loossemble | 52 | not inserted: no member passed the rules | 0 | status_conflict: 4, no_wikidata_item: 1 | 0 |
| team | 48 | included | 3 | birth_unverified: 6 | 2 |
| kiiikiii | 21 | not inserted: no member passed the rules | 0 | birth_unverified: 4, minors: 1 | 0 |
| xikers | 19 | not inserted: no member passed the rules | 0 | no_wikidata_item: 10 | 0 |
| akmu | 17 | not inserted: no member passed the rules | 0 | debut_conflict: 2 | 0 |
| astro | 13 | included | 4 | - | 0 |

## Groups that gave no idol, and why

- loona: membership unclear: English Wikipedia lists 11 current members (by consensus, hiatus), but Wikidata gives the end of each membership and MusicBrainz marks each relation ended. Under the K1 rule a member a source calls former is reserved, so none is inserted.
- dreamcatcher: the group debut year is not agreed (Wikipedia 2014, Wikidata 2016, MusicBrainz 2017) and the members' own years disagree with it: a decision for the owner.
- kickflip: no Wikidata item for the members (MusicBrainz has them, Wikipedia names them): one source for each fact, nothing double-checked.
- tuide: neither Wikidata nor MusicBrainz gives a birth date: no age can be checked.
- lngshot: no Wikidata item for the members: one source for each fact.
- artms: each member's own debut year (Wikidata 2016 or 2017, from LOONA) disagrees with the group year 2023: a decision for the owner.
- loossemble: membership unclear for the same reason (Wikidata end dates and MusicBrainz ended relations against the Wikipedia list).
- kiiikiii: birth dates on Wikidata only (MusicBrainz has none): the age is not double-checked.
- xikers: no Wikidata item for the members: one source for each fact.
- akmu: Wikidata gives 2014 for each of the two, the group debut year and MusicBrainz give 2012: a decision for the owner.
- nct-127: not processed on purpose. Its members already have rows under NCT (K1); a second row for the same person would put a duplicate in the game.

## Conflicts by field

| field | conflict | single source | resolved by majority | stored from one source |
|---|---|---|---|---|
| activation (021b) | 1 | 0 | 0 | 0 |
| birth_date | 0 | 21 | 1 | 0 |
| debut_year | 16 | 4 | 0 | 0 |
| gender | 0 | 1 | 0 | 0 |
| identity | 0 | 23 | 0 | 0 |
| leader | 0 | 11 | 0 | 0 |
| maknae | 0 | 12 | 0 | 0 |
| membership | 15 | 0 | 0 | 0 |
| name | 0 | 7 | 0 | 0 |
| nationality | 2 | 0 | 0 | 7 |
| record_label | 2 | 0 | 0 | 0 |

## What would add idols, by decision

- Debut-year conflicts: 16 people, each with the years in data/k2-conflicts.json. A person who debuted earlier in another debuted group (K1's rule counts it) or whose Wikidata year is a survival show or a pre-debut release (K1's rule does not) needs a human choice; one line per group would settle them.
- Birth date on one source only (Wikidata, MusicBrainz silent): not inserted, because the age would not be double-checked. Listed as "single" in the conflicts file.

## Pool arithmetic

- Kpopdle pool in production today (caller's read-only query): 112. Plus 66 new plus 11 activated = **189**, against 200 wanted (150 at the very least). Short of 200 by 11.
- The local rehearsal base holds no idol of production, only the fixture rows of the 12 021b ids: its own count is the K2 contribution alone (see docs/proofs/k2-idols/).

## Group rows the SQL fills when empty

| group | debut year (sources) | record label | generation | inception date |
|---|---|---|---|---|
| got7 | 2014 (wikipedia 2014, wikidata 2014, musicbrainz 2014) | JYP Entertainment | 3rd generation | - |
| monsta-x | 2015 (wikipedia 2015, wikidata 2015, musicbrainz 2015) | Starship Entertainment | 3rd generation | - |
| girls-generation | 2007 (wikipedia 2007, wikidata 2007, musicbrainz 2007) | SM Entertainment | 2nd generation | - |
| zerobaseone | 2023 (wikipedia 2023, wikidata -, musicbrainz 2023) | WakeOne | 5th generation | - |
| mamamoo | 2014 (wikipedia 2014, wikidata 2014, musicbrainz 2014) | Rainbow Bridge World | 3rd generation | 2014-06-18 |
| bigbang | 2006 (wikipedia 2006, wikidata 2006, musicbrainz 2006) | YG Entertainment | 2nd generation | - |
| katseye | 2024 (wikipedia 2024, wikidata -, musicbrainz 2024) | Hybe UMG | 5th generation | - |
| illit | 2024 (wikipedia 2024, wikidata 2024, musicbrainz 2024) | Belift Lab | 5th generation | 2024-03-25 |
| treasure | 2020 (wikipedia 2020, wikidata -, musicbrainz 2020) | YG Entertainment | 4th generation | - |
| tws | 2024 (wikipedia 2024, wikidata 2024, musicbrainz 2024) | Pledis Entertainment | 5th generation | 2024-01-22 |
| p1harmony | 2020 (wikipedia 2020, wikidata -, musicbrainz 2020) | FNC Entertainment | 4th generation | - |
| cortis | 2025 (wikipedia 2025, wikidata 2025, musicbrainz 2025) | BigHit Music | 5th generation | 2025-08-18 |
| hearts2hearts | 2025 (wikipedia 2025, wikidata 2025, musicbrainz 2025) | SM Entertainment | 5th generation | 2025-02-24 |
| team | 2022 (wikipedia 2022, wikidata 2022, musicbrainz 2022) | YX LABELS | 4th generation | 2022-09-03 |
| astro | 2016 (wikipedia 2016, wikidata 2016, musicbrainz 2016) | Fantagio | 3rd generation | 2016-01-01 |

## 021b: the unreserved yes, re-checked today

| id | name | result | checks |
|---|---|---|---|
| 82 | Ten | activate | adult, birth date agreed by wikidata + musicbrainz + wikipedia; Wikidata: member, no end date; Wikipedia: in the current list |
| 89 | Qian Kun | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 133 | Kim Chae-hyun | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 143 | Pharita | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 144 | Asa | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 145 | Rami | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 146 | Rora | HELD BACK | birth date not agreed (conflict); Wikidata: member, no end date; Wikipedia: in the current list |
| 148 | Ahyeon | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 151 | Anton Lee | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 152 | Song Eun-seok | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 153 | Park Won-bin | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
| 163 | Keena | activate | adult, birth date agreed by wikidata + musicbrainz; Wikidata: member, no end date; Wikipedia: in the current list |
