# Lot K2: report

Run of 2026-11-02 by scripts/kpop/k2 (fetch, build, sql). Adult cutoff: born on or before 2008-11-02. Sources: Wikidata, MusicBrainz, English Wikipedia. Nothing was read from or written to a database.

## Counts

- New idols (adult, complete, double-checked): **91** in 18 groups (target 110).
- 021b activations (the unreserved yes of K1): **11** of 12.
- Minors excluded: **6** in the included groups (7 counting every group read). Counted only: no name, no date is kept.
- Conflict list: data/k2-conflicts.json, 133 lines (8 conflicts, 79 single-source, 1 resolved by majority, 38 applied under the owner decisions of 2026-11-03).

## Per group

| group | plays | status | idols added | excluded (reason: count) | nationality from Wikidata alone |
|---|---|---|---|---|---|
| loona | 200 | included | 10 | nationality_conflict: 1 | 0 |
| got7 | 137 | included | 7 | - | 0 |
| monsta-x | 214 | included | 6 | - | 0 |
| girls-generation | 564 | included | 8 | - | 0 |
| zerobaseone | 32 | included | 4 | birth_unverified: 1 | 0 |
| mamamoo | 31 | included | 4 | - | 0 |
| bigbang | 239 | included | 3 | - | 0 |
| katseye | 802 | included | 5 | no_wikidata_item: 1 | 0 |
| illit | 3477 | included | 4 | nationality_conflict: 1 | 1 |
| treasure | 23 | included | 7 | gender_single: 1, birth_unverified: 2 | 1 |
| dreamcatcher | 14 | included | 7 | - | 0 |
| tws | 48 | included | 6 | - | 1 |
| p1harmony | 12 | included | 5 | birth_unverified: 1 | 1 |
| cortis | 3402 | included | 3 | minors: 2 | 1 |
| hearts2hearts | 128 | included | 3 | nationality_conflict: 1, minors: 4 | 0 |
| kickflip | 124 | not inserted: no member passed the rules | 0 | no_wikidata_item: 7 | 0 |
| tuide | 124 | not inserted: no member passed the rules | 0 | birth_unverified: 7 | 0 |
| lngshot | 91 | not inserted: no member passed the rules | 0 | no_wikidata_item: 4 | 0 |
| artms | 77 | members carried by another group | 0 | duplicate_in_k2: 5 | 0 |
| loossemble | 52 | members carried by another group | 0 | nationality_conflict: 1, no_wikidata_item: 1, duplicate_in_k2: 3 | 0 |
| team | 48 | included | 3 | birth_unverified: 6 | 2 |
| kiiikiii | 21 | not inserted: no member passed the rules | 0 | birth_unverified: 4, minors: 1 | 0 |
| xikers | 19 | not inserted: no member passed the rules | 0 | no_wikidata_item: 10 | 0 |
| akmu | 17 | included | 2 | - | 0 |
| astro | 13 | included | 4 | - | 0 |

## Groups that gave no idol, and why

- kickflip: no Wikidata item for the members (MusicBrainz has them, Wikipedia names them): one source for each fact, nothing double-checked.
- tuide: neither Wikidata nor MusicBrainz gives a birth date: no age can be checked.
- lngshot: no Wikidata item for the members: one source for each fact.
- kiiikiii: birth dates on Wikidata only (MusicBrainz has none): the age is not double-checked.
- xikers: no Wikidata item for the members: one source for each fact.
- artms: its current members are LOONA members; each keeps one row in LOONA and carries artms in the group column (idol_other_groups), no second row.
- loossemble: its current members are LOONA members; each keeps one row in LOONA and carries loossemble in the group column (idol_other_groups), no second row.
- nct-127: not processed on purpose. Its members already have rows under NCT (K1); a second row for the same person would put a duplicate in the game.

## Conflicts by field

| field | conflict | single source | resolved by majority | owner decision | stored from one source |
|---|---|---|---|---|---|
| activation (021b) | 1 | 0 | 0 | 0 | 0 |
| birth_date | 0 | 21 | 1 | 0 | 0 |
| debut_year | 0 | 0 | 0 | 23 | 0 |
| gender | 0 | 1 | 0 | 0 | 0 |
| identity | 0 | 23 | 0 | 0 | 0 |
| leader | 1 | 15 | 0 | 0 | 0 |
| maknae | 0 | 12 | 0 | 0 | 0 |
| membership | 0 | 0 | 0 | 15 | 0 |
| name | 0 | 7 | 0 | 0 | 0 |
| nationality | 4 | 0 | 0 | 0 | 7 |
| record_label | 2 | 0 | 0 | 0 | 0 |

## What would add idols, by decision

- Debut-year conflicts left: 0 people, members who joined after their group's debut with no agreed own year (data/k2-conflicts.json).
- Birth date on one source only (Wikidata, MusicBrainz silent): not inserted, because the age would not be double-checked. Listed as "single" in the conflicts file.

## Members of more than one group

- 8 people carry 8 other-group links (public.idol_other_groups, created in 020): artms, loossemble. One idol row each, in the first group; the game's group cell holds both groups.

## Pool arithmetic

- Kpopdle pool in production today (caller's read-only query): 112. Plus 91 new plus 11 activated = **214**, against 200 wanted (150 at the very least). Short of 200 by 0.
- The local rehearsal base holds no idol of production, only the fixture rows of the 12 021b ids: its own count is the K2 contribution alone (see docs/proofs/k2-idols/).

## Group rows the SQL fills when empty

| group | debut year (sources) | record label | generation | inception date |
|---|---|---|---|---|
| loona | 2018 (wikipedia 2018, wikidata 2018, musicbrainz 2016) | Blockberry Creative | 4th generation | - |
| got7 | 2014 (wikipedia 2014, wikidata 2014, musicbrainz 2014) | JYP Entertainment | 3rd generation | - |
| monsta-x | 2015 (wikipedia 2015, wikidata 2015, musicbrainz 2015) | Starship Entertainment | 3rd generation | - |
| girls-generation | 2007 (wikipedia 2007, wikidata 2007, musicbrainz 2007) | SM Entertainment | 2nd generation | - |
| zerobaseone | 2023 (wikipedia 2023, wikidata -, musicbrainz 2023) | WakeOne | 5th generation | - |
| mamamoo | 2014 (wikipedia 2014, wikidata 2014, musicbrainz 2014) | Rainbow Bridge World | 3rd generation | 2014-06-18 |
| bigbang | 2006 (wikipedia 2006, wikidata 2006, musicbrainz 2006) | YG Entertainment | 2nd generation | - |
| katseye | 2024 (wikipedia 2024, wikidata -, musicbrainz 2024) | Hybe UMG | 5th generation | - |
| illit | 2024 (wikipedia 2024, wikidata 2024, musicbrainz 2024) | Belift Lab | 5th generation | 2024-03-25 |
| treasure | 2020 (wikipedia 2020, wikidata -, musicbrainz 2020) | YG Entertainment | 4th generation | - |
| dreamcatcher | 2017 (wikipedia 2017, wikidata 2016, musicbrainz 2017) | Dreamcatcher Company | 3rd generation | - |
| tws | 2024 (wikipedia 2024, wikidata 2024, musicbrainz 2024) | Pledis Entertainment | 5th generation | 2024-01-22 |
| p1harmony | 2020 (wikipedia 2020, wikidata -, musicbrainz 2020) | FNC Entertainment | 4th generation | - |
| cortis | 2025 (wikipedia 2025, wikidata 2025, musicbrainz 2025) | BigHit Music | 5th generation | 2025-08-18 |
| hearts2hearts | 2025 (wikipedia 2025, wikidata 2025, musicbrainz 2025) | SM Entertainment | 5th generation | 2025-02-24 |
| team | 2022 (wikipedia 2022, wikidata 2022, musicbrainz 2022) | YX LABELS | 4th generation | 2022-09-03 |
| akmu | 2014 (wikipedia 2014, wikidata 2014, musicbrainz 2012) | YG Entertainment | 3rd generation | - |
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
