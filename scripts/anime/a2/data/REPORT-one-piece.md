# One Piece daily game pool: cross-check report (after the gap review)

Reference point: the last arc finished in the anime is **Egghead** (anime season 21, episodes 1089 to 1155, aired 2024-01-07 to 2025-12-28, manga chapters 1058 to 1125); Fandom pages read as they were at 2024-09-15T00:00:00Z.
Gap review done (scripts/anime/a2/review.mjs): {"sea_of_origin_wikipedia":14,"debut_arc":9,"affiliation":13,"sea_of_origin":2,"bounty_no_bounty":16,"gender":1,"bounty":1}. A reviewed field has reviewed: true and the pages that state the value. height_cm was left aside for the owner.
Ranking: score = percentile rank of the Wikidata sitelinks count + percentile rank of the One Piece Fandom page size (page plus its subpages, in bytes), among the pages of the Fandom categories Male Characters and Female Characters; the Wikidata item is the one whose P6262 (Fandom article id) names the page.
height_cm: owner decision 2026-11-03: One Piece height_cm stays with a single Fandom source accepted.

Characters: 100 (in site data: 32, added: 68).

## Counts per field

| field | agree | single | conflict | none | single share |
|---|---:|---:|---:|---:|---:|
| gender | 91 | 9 | 0 | 0 | 9% |
| affiliation | 92 | 1 | 0 | 7 | 1% |
| devil_fruit_type | 100 | 0 | 0 | 0 | 0% |
| devil_fruit_name | 100 | 0 | 0 | 0 | 0% |
| haki | 100 | 0 | 0 | 0 | 0% |
| bounty | 55 | 30 | 0 | 15 | 35% |
| height_cm | 5 | 92 | 0 | 3 | 95% |
| sea_of_origin | 65 | 26 | 0 | 9 | 29% |
| debut_arc | 98 | 2 | 0 | 0 | 2% |
| debut_chapter | 99 | 1 | 0 | 0 | 1% |
| debut_episode | 99 | 1 | 0 | 0 | 1% |

## Source coverage (characters with a value, per field and source)

| field | source | values |
|---|---|---:|
| gender | fandom_category | 84 |
| gender | wikidata_P21 | 99 |
| gender | wikipedia | 66 |
| gender | review:fandom_category | 1 |
| gender | review:wikipedia | 1 |
| affiliation | fandom_infobox | 93 |
| affiliation | fandom_categories | 79 |
| affiliation | wikipedia | 8 |
| affiliation | review:fandom_character_page | 13 |
| affiliation | review:fandom_group_page | 13 |
| devil_fruit_type | fandom_infobox | 100 |
| devil_fruit_type | fandom_categories | 100 |
| devil_fruit_type | fandom_fruit_page | 60 |
| devil_fruit_type | wikipedia | 24 |
| devil_fruit_name | fandom_infobox | 100 |
| devil_fruit_name | fandom_categories | 40 |
| devil_fruit_name | fandom_fruit_page | 60 |
| devil_fruit_name | wikipedia | 29 |
| haki | fandom_categories | 100 |
| haki | fandom_haki_galleries | 100 |
| bounty | fandom_infobox | 65 |
| bounty | fandom_bounty_list | 60 |
| bounty | review:fandom_character_page | 16 |
| bounty | review:fandom_bounty_list | 1 |
| height_cm | fandom_infobox | 97 |
| height_cm | wikidata_P2048 | 5 |
| sea_of_origin | fandom_infobox | 91 |
| sea_of_origin | fandom_place_page | 20 |
| sea_of_origin | fandom_location_categories | 41 |
| sea_of_origin | review:fandom_infobox | 14 |
| sea_of_origin | review:wikipedia_characters_by_location | 14 |
| sea_of_origin | review:fandom_character_page | 2 |
| sea_of_origin | review:fandom_place_page | 2 |
| debut_arc | arc_of_debut_chapter | 99 |
| debut_arc | fandom_arc_navbox_of_debut_page | 97 |
| debut_arc | site_data_debut_arc_ord | 32 |
| debut_arc | review:arc_of_debut_chapter | 9 |
| debut_arc | review:fandom_arc_navbox_of_debut_page | 9 |
| debut_arc | arc_of_debut_episode | 1 |
| debut_chapter | fandom_infobox | 100 |
| debut_chapter | fandom_chapter_page | 99 |
| debut_episode | fandom_infobox | 100 |
| debut_episode | fandom_episode_page | 99 |

## Notes on the sources

- gender: Fandom category (Male/Female Characters) at the snapshot, Wikidata P21, Wikipedia (infobox gender, else the pronouns of the character section).
- affiliation: Fandom box at the snapshot (entries marked former/disbanded left out), then the Fandom categories of the page, then the Wikipedia infobox. Two sources agree when the main group of one is in the other.
- devil_fruit_type and devil_fruit_name: Fandom box, Fandom categories (type only), the page of the fruit itself (Devil Fruit Box), and Wikipedia (the type words and the English name in a nihongo template of the article infobox or of the character section; positive evidence only). none is a value; lists agree when they share a name.
- haki: Fandom categories of the page, and the Fandom gallery templates "Observation Haki Users Gallery", "Armament Haki Users Gallery", "Supreme King Haki Users Gallery" (read at the snapshot).
- bounty: Fandom box (newest entry up to the reference chapter, struck out or not) and the Fandom page Bounty/List at the snapshot. "no bounty" is a value when the page text says so, "unknown" when the box says Unknown; a box that says nothing is missing data (none).
- height_cm: Fandom box and Wikidata P2048 (rare). Most heights have a single source: no second public list exists.
- sea_of_origin: the sea written in the Fandom origin box; the sea reached from the place page it links to (categories "X Locations", box region, up to 3 levels); the seas of the page location categories ("X Characters"). No source at all gives unknown with status none. The Calm Belt is unknown (not one of the seas listed).
- debut_chapter and debut_episode: Fandom box, then the Characters list of the Fandom page Chapter N / Episode N (the character must be listed there). A character not found in the list gets no second value (single), never a conflict.
- debut_arc: the arc of the debut chapter (the debut episode when the debut is anime only) by the chapter and episode ranges of the arcs in one-piece.json; second value: the arc navbox of the Fandom page of that chapter or episode, mapped to the arcs by name; third: the debut_arc_ord already in one-piece.json (the 32 site characters).
- REVIEW: bounty "no bounty" for Marines, World Government agents and civilians (one page, the character page); affiliation (the page of the main group lists the character) and sea_of_origin (first paragraph of the character page plus the place page) settled with a second Fandom page; debut_arc conflicts: the chapter page and the character page agree, the debut_arc_ord of the site data is a later arc for those characters; gender: Yamato.

## Conflicts (0)

Value kept = the largest group of agreeing sources (first source on a tie). Each line: character, field, kept value, then every source value with its URL.


## Characters added (not in the site data)

| rank | name | slug | score |
|---:|---|---|---:|
| 10 | Jinbe | jinbe | 1.982 |
| 21 | Bartholomew Kuma | bartholomew-kuma | 1.970 |
| 23 | Marshall D. Teach | marshall-d-teach | 1.970 |
| 26 | Monkey D. Garp | monkey-d-garp | 1.963 |
| 27 | Kuzan | kuzan | 1.962 |
| 30 | Borsalino | borsalino | 1.955 |
| 33 | Jewelry Bonney | jewelry-bonney | 1.953 |
| 35 | Caesar Clown | caesar-clown | 1.951 |
| 36 | Gecko Moria | gecko-moria | 1.950 |
| 37 | Arlong | arlong | 1.948 |
| 38 | Kozuki Oden | kozuki-oden | 1.947 |
| 40 | Silvers Rayleigh | silvers-rayleigh | 1.939 |
| 41 | Charlotte Katakuri | charlotte-katakuri | 1.936 |
| 42 | Sengoku | sengoku | 1.933 |
| 43 | Capone Bege | capone-bege | 1.931 |
| 45 | Carrot | carrot | 1.928 |
| 46 | Nerona Imu | nerona-imu | 1.928 |
| 48 | Wapol | wapol | 1.927 |
| 49 | Issho | issho | 1.923 |
| 50 | Hody Jones | hody-jones | 1.922 |
| 51 | Vegapunk | vegapunk | 1.921 |
| 52 | Marco | marco | 1.919 |
| 53 | Bellamy | bellamy | 1.917 |
| 54 | Kin'emon | kin-emon | 1.916 |
| 55 | Basil Hawkins | basil-hawkins | 1.912 |
| 56 | Galdino | galdino | 1.908 |
| 57 | Hatchan | hatchan | 1.907 |
| 58 | Foxy | foxy | 1.905 |
| 59 | Don Krieg | don-krieg | 1.905 |
| 60 | Perona | perona | 1.903 |
| 61 | Kuro | kuro | 1.903 |
| 62 | Shirahoshi | shirahoshi | 1.900 |
| 63 | Magellan | magellan | 1.899 |
| 64 | Charlotte Perospero | charlotte-perospero | 1.899 |
| 65 | Cavendish | cavendish | 1.898 |
| 66 | Vinsmoke Judge | vinsmoke-judge | 1.893 |
| 67 | Charlotte Pudding | charlotte-pudding | 1.890 |
| 68 | Tashigi | tashigi | 1.889 |
| 70 | Bartolomeo | bartolomeo | 1.887 |
| 71 | Kaku | kaku | 1.884 |
| 72 | Kyros | kyros | 1.881 |
| 73 | Inuarashi | inuarashi | 1.879 |
| 74 | Helmeppo | helmeppo | 1.879 |
| 75 | Vinsmoke Reiju | vinsmoke-reiju | 1.879 |
| 76 | Caribou | caribou | 1.878 |
| 77 | X Drake | x-drake | 1.874 |
| 78 | Jesus Burgess | jesus-burgess | 1.874 |
| 79 | Rebecca | rebecca | 1.874 |
| 80 | Nekomamushi | nekomamushi | 1.873 |
| 81 | Hajrudin | hajrudin | 1.871 |
| 82 | Shiki | shiki | 1.869 |
| 83 | Kozuki Hiyori | kozuki-hiyori | 1.868 |
| 84 | Killer | killer | 1.867 |
| 85 | Neptune | neptune | 1.863 |
| 86 | Scratchmen Apoo | scratchmen-apoo | 1.862 |
| 87 | Vinsmoke Niji | vinsmoke-niji | 1.858 |
| 88 | Jack | jack | 1.856 |
| 89 | Vinsmoke Yonji | vinsmoke-yonji | 1.855 |
| 90 | Vinsmoke Ichiji | vinsmoke-ichiji | 1.854 |
| 91 | Alvida | alvida | 1.853 |
| 92 | Trebol | trebol | 1.849 |
| 93 | Uta | uta | 1.849 |
| 94 | Daz Bonez | daz-bonez | 1.845 |
| 95 | Diamante | diamante | 1.843 |
| 96 | Pica | pica | 1.843 |
| 97 | Viola | viola | 1.841 |
| 98 | Aramaki | aramaki | 1.838 |
| 99 | Charlotte Cracker | charlotte-cracker | 1.837 |

## Sources unreachable

None.
