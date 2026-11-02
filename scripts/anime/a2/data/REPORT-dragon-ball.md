# Dragon Ball daily game pool: cross-check report (after the gap review)

Series order: DB 1, Z 2, GT 3, Super 4 (Daima 5). Gap review done (scripts/anime/a2/review.mjs): {"home_planet":53,"universe":33,"alignment_at_debut":61,"signature_none":37,"signature_technique":33,"affiliation":33,"debut_series":6,"home_planet_unstated":17,"race":10,"debut_saga":6}. A reviewed field has reviewed: true and the pages that state the value. height_cm was left aside for the owner.
Ranking: score = percentile rank of the Wikidata sitelinks count + percentile rank of the Dragon Ball Fandom page size (page plus its subpages, in bytes), among the pages of the Fandom categories DB, DBZ, DBGT, DBS and DBD Characters; the Wikidata item is the one whose P6262 (Fandom article id) names the page, else the one a Wikidata name search finds (same label, description naming Dragon Ball).
height_cm: owner decision 2026-11-03: Dragon Ball height_cm is dropped from the game; the column stays in the data but is not counted in the table below nor in any threshold.
voice_actor_ja: Japanese voice actor of the 70 characters (the 5-error hint), added from the all-series collection (Fandom infobox, Wikidata P725, Wikipedia list).

Characters: 70 (in site data: 30, added: 40).

## Counts per field

| field | agree | single | conflict | none | single share |
|---|---:|---:|---:|---:|---:|
| gender | 69 | 1 | 0 | 0 | 1% |
| race | 57 | 12 | 0 | 1 | 17% |
| affiliation | 58 | 7 | 0 | 5 | 11% |
| home_planet | 42 | 12 | 0 | 16 | 22% |
| universe | 55 | 15 | 0 | 0 | 21% |
| debut_series | 70 | 0 | 0 | 0 | 0% |
| debut_saga | 61 | 9 | 0 | 0 | 13% |
| alignment_at_debut | 34 | 36 | 0 | 0 | 51% |
| signature_technique | 32 | 1 | 0 | 37 | 3% |
| voice_actor_ja | 32 | 36 | 0 | 2 | 53% |

## Source coverage (characters with a value, per field and source)

| field | source | values |
|---|---|---:|
| gender | fandom_infobox | 63 |
| gender | fandom_category | 67 |
| gender | wikidata_P21 | 63 |
| gender | wikipedia | 43 |
| race | fandom_infobox | 68 |
| race | fandom_categories | 61 |
| race | wikipedia | 11 |
| race | review:fandom_character_page | 10 |
| race | review:wikipedia | 6 |
| race | review:fandom_race_page | 6 |
| affiliation | fandom_infobox | 65 |
| affiliation | fandom_categories | 25 |
| affiliation | review:fandom_character_page | 33 |
| affiliation | review:fandom_group_page | 33 |
| home_planet | fandom_character_page | 1 |
| home_planet | fandom_planet_pages | 32 |
| home_planet | wikipedia | 0 |
| home_planet | review:fandom_character_page | 51 |
| home_planet | review:fandom_planet_page | 44 |
| universe | fandom_categories | 70 |
| universe | fandom_allegiance_team_universe | 19 |
| universe | fandom_universe_pages | 12 |
| universe | review:fandom_categories | 32 |
| universe | review:fandom_universe_7_page | 32 |
| debut_series | series_of_manga_debut_saga | 61 |
| debut_series | series_of_anime_debut_episode | 70 |
| debut_series | fandom_infobox_appears_in | 70 |
| debut_series | review:series_of_anime_debut_episode | 6 |
| debut_series | review:fandom_character_page | 5 |
| debut_series | review:series_of_manga_debut_saga | 1 |
| debut_series | review:fandom_infobox_appears_in | 1 |
| debut_saga | fandom_manga_debut_chapter | 61 |
| debut_saga | fandom_anime_debut_episode | 70 |
| debut_saga | site_data_debut_arc_ord | 30 |
| debut_saga | review:fandom_manga_debut_chapter | 3 |
| debut_saga | review:fandom_anime_debut_episode | 3 |
| debut_saga | review:site_data_debut_arc_ord | 2 |
| alignment_at_debut | fandom_debut_saga_page | 14 |
| alignment_at_debut | fandom_categories | 22 |
| alignment_at_debut | wikipedia_antagonist_section | 10 |
| alignment_at_debut | review:fandom_character_page | 45 |
| alignment_at_debut | review:wikipedia | 23 |
| alignment_at_debut | review:fandom_debut_saga_page | 7 |
| alignment_at_debut | review:owner_rule_2026-11-03 | 15 |
| alignment_at_debut | review:fandom_categories | 1 |
| alignment_at_debut | review:wikipedia_antagonist_section | 1 |
| signature_technique | rule_fandom_listed_technique_most_named_by_wikipedia | 66 |
| signature_technique | wikipedia_text | 21 |
| signature_technique | review:fandom_character_page | 32 |
| signature_technique | review:wikipedia | 13 |
| signature_technique | review:fandom_technique_page | 33 |
| voice_actor_ja | a1_facts | 7 |
| voice_actor_ja | fandom_infobox | 0 |
| voice_actor_ja | wikidata_P725 | 21 |
| voice_actor_ja | wikipedia_list_section | 0 |
| voice_actor_ja | wikipedia_infobox | 19 |
| voice_actor_ja | review:fandom_voice_actor_pages | 67 |

## Notes on the sources

- gender: Fandom infobox, Fandom category (Males/Females), Wikidata P21, Wikipedia (infobox gender, else the pronouns of the text).
- race: Fandom infobox race (the first known race in the order Saiyan, Namekian, Frieza Race, Majin, Android, Angel, God, Human, Demon, Dragon), Fandom categories, Wikipedia infobox species.
- affiliation: Fandom allegiance box (entries marked former left out), confirmed by the categories of the page. Two sources agree when they share a group.
- home_planet: the planet linked after "born/native ..." in the Fandom page text, the Fandom planet pages whose inhabitants list the character, and a "born ... planet X" phrase in Wikipedia. The homeworld of the race page (Saiyan to Planet Vegeta, Namekian to Namek) is a consistency check only, kept as race_check on the field: {"n/a":54,"differs":10,"ok":6}.
- universe: the Fandom categories "Universe N Characters" (a character with categories but none of another universe is of Universe 7, the category list being the evidence), "Team Universe N" in the allegiance box, and the resident lists of the Fandom pages Universe 1 to 12.
- debut_saga and debut_series: the debut chapter page and the debut episode page of the Fandom infobox each name a saga (mapped to the sagas of the site data by the first episode of the saga page, or by the episode number and series), and for the site characters the debut_arc_ord already in dragon-ball.json. When manga and anime differ the earlier saga is kept (the conflict stays listed).
- height_cm: Fandom infobox (adult height when given) and Wikidata P2048 (rare); no other public list. 29 of 70 characters have a height, 11 of them with a guidebook cited in the Fandom box (Daizenshuu 7; Dragon Ball Z; Dragon Ball: Adventure Special; Dragon Ball: Super Exciting Guide); 41 have none.
- alignment_at_debut: the lead of the debut saga page (antagonist or ally sentences), the Villains / Antagonists / Heroes categories of the character page (a character with both Villains and Heroes marks is left out), and the Antagonists section of the Wikipedia list. 35 characters stay unknown.
- signature_technique: rule = among the techniques listed in the abilities section of the Fandom page (else linked anywhere in it), those the Wikipedia entry also names are preferred (a technique named in the Fandom text and in the Wikipedia text), the one Wikipedia names most wins, then the one the Fandom page links most; the second value is the technique the Wikipedia text names most overall (a conflict when it differs). The least reliable field.
- REVIEW: race, debut_series, debut_saga, universe, home_planet (a planet page plus the character page), affiliation (the page of the group), alignment_at_debut (judged from the debut, pages tested for fitting wording), signature_technique (judged, tested on the character page, the Wikipedia entry and the technique page).

## Conflicts (0)

Value kept = the largest group of agreeing sources (first source on a tie). Each line: character, field, kept value, then every source value with its URL.


## Characters added (not in the site data)

| rank | name | slug | score |
|---:|---|---|---:|
| 5 | Android 17 | android-17 | 1.972 |
| 8 | Bardock | bardock | 1.967 |
| 9 | Pan | pan | 1.967 |
| 12 | Cooler | cooler | 1.953 |
| 13 | Vegito | vegito | 1.948 |
| 14 | Nappa | nappa | 1.944 |
| 16 | Gogeta | gogeta | 1.935 |
| 17 | Gotenks | gotenks | 1.933 |
| 18 | Dr. Gero | dr-gero | 1.930 |
| 20 | Chiaotzu | chiaotzu | 1.930 |
| 21 | Baby | baby | 1.928 |
| 25 | Captain Ginyu | captain-ginyu | 1.921 |
| 26 | Mercenary Tao | mercenary-tao | 1.919 |
| 28 | Shin | shin | 1.915 |
| 29 | Shenron | shenron | 1.913 |
| 30 | Android 16 | android-16 | 1.908 |
| 31 | Goku Black | goku-black | 1.897 |
| 32 | Uub | uub | 1.889 |
| 33 | Launch | launch | 1.889 |
| 35 | Babidi | babidi | 1.886 |
| 36 | Dabura | dabura | 1.885 |
| 37 | Syn Shenron | syn-shenron | 1.885 |
| 38 | Zarbon | zarbon | 1.884 |
| 39 | Yajirobe | yajirobe | 1.877 |
| 41 | Mr. Popo | mr-popo | 1.873 |
| 44 | Caulifla | caulifla | 1.871 |
| 46 | Dodoria | dodoria | 1.866 |
| 47 | Kale | kale | 1.864 |
| 49 | King Vegeta | king-vegeta | 1.861 |
| 50 | King Cold | king-cold | 1.859 |
| 51 | King Kai | king-kai | 1.856 |
| 52 | Puar | puar | 1.855 |
| 53 | Grandpa Gohan | grandpa-gohan | 1.845 |
| 54 | Mai | mai | 1.841 |
| 55 | Ox-King | ox-king | 1.840 |
| 56 | Recoome | recoome | 1.838 |
| 58 | Korin | korin | 1.834 |
| 59 | General Blue | general-blue | 1.833 |
| 62 | Master Shen | master-shen | 1.823 |
| 64 | Porunga | porunga | 1.809 |

## Sources unreachable

None.

## alignment_at_debut: unknown or single-source values (36)

Review list: the value, the page and the sentence that supports it (15 words at most). "unknown" has no page that states it.

| character | value | status | page | supporting sentence |
|---|---|---|---|---|
| Android 17 | evil | single | https://dragonball.fandom.com/wiki/Android_17 | on, Android 17 takes it upon himself to kill Dr. Gero, who is uncooperative with |
| Beerus | neutral | single | https://dragonball.fandom.com/wiki/Beerus | owner rule: how the character is presented at the first appearance |
| Bardock | evil | single | https://dragonball.fandom.com/wiki/Bardock | owner rule: how the character is presented at the first appearance |
| Vegito | good | single | https://dragonball.fandom.com/wiki/Vegito | ather) Gine (half-mother) Chi-Chi (half-wife) Bulma (half-wife) Raditz (half-brother |
| Gogeta | good | single | https://dragonball.fandom.com/wiki/Gogeta | ather) Gine (half-mother) Chi-Chi (half-wife) Bulma (half-wife) Raditz (half-brother |
| Gotenks | good | single | https://dragonball.fandom.com/wiki/Gotenks | ame = Gotenkusu |AltName = Trunkten The Hero of Justice Mack Daddy of Justice Grim |
| Dr. Gero | evil | single | https://dragonball.fandom.com/wiki/Dr._Gero | bio-organic Cell. Dr. Gero is the main antagonist of the Androids Saga, overarching antag |
| Baby | evil | single | https://dragonball.fandom.com/wiki/Baby | aby 2 |Appears in = |manga debut = "The Evil Janemba Baby!!" |anime debut = |
| Oolong | evil | single | https://dragonball.fandom.com/wiki/Oolong | owner rule: how the character is presented at the first appearance |
| Captain Ginyu | evil | single | https://dragonball.fandom.com/wiki/Captain_Ginyu | swap bodies. Captain Ginyu is the main antagonist of the Captain Ginyu Saga and the |
| Mercenary Tao | evil | single | https://dragonball.fandom.com/wiki/Mercenary_Tao | ears in = |manga debut = "Taopaipai the Assassin" |anime debut = "The Land of |
| Shin | good | single | https://dragonball.fandom.com/wiki/Shin | of the universe should be, he is calm, wise, humble and thinks rationally at critic |
| Shenron | neutral | single | https://dragonball.fandom.com/wiki/Shenron | owner rule: how the character is presented at the first appearance |
| Android 16 | evil | single | https://dragonball.fandom.com/wiki/Android_16 | owner rule: how the character is presented at the first appearance |
| Goku Black | evil | single | https://dragonball.fandom.com/wiki/Goku_Black | ebut = "SOS from the Future: A Dark New Enemy Appears!" |game debut = Dragon |
| Uub | good | single | https://dragonball.fandom.com/wiki/Uub | |Address = Uub's village |Occupation = Martial Artist |Allegiance = Dragon Team (Age 784-790) |
| Launch | good | single | https://dragonball.fandom.com/wiki/Launch | owner rule: how the character is presented at the first appearance |
| Syn Shenron | evil | single | https://dragonball.fandom.com/wiki/Syn_Shenron | tar |Appears in = |manga debut = "Seven Evil Dragons" |anime debut = "The One-Star |
| Zarbon | evil | single | https://dragonball.fandom.com/wiki/Zarbon | Cold and Dark" |anime debut = "Brood of Evil" |movie debut = Dragon Ball Z: |
| Yajirobe | good | single | https://dragonball.fandom.com/wiki/Yajirobe | ounterpart. In Dragon Ball Super: Super Hero, Yajirobe is shown dawning this style. |
| Mr. Popo | neutral | single | https://dragonball.fandom.com/wiki/Mr._Popo | owner rule: how the character is presented at the first appearance |
| Caulifla | neutral | single | https://dragonball.fandom.com/wiki/Caulifla | owner rule: how the character is presented at the first appearance |
| Dodoria | evil | single | https://dragonball.fandom.com/wiki/Dodoria | Cold and Dark" |anime debut = "Brood of Evil" |movie debut = Bardock - The |
| Kale | neutral | single | https://dragonball.fandom.com/wiki/Kale | owner rule: how the character is presented at the first appearance |
| King Cold | evil | single | https://dragonball.fandom.com/wiki/King_Cold | r of Kuriza. King Cold is the secondary antagonist of the Trunks Saga. ==Appearance== King |
| King Kai | good | single | https://dragonball.fandom.com/wiki/King_Kai | mentor, he acts as Goku's Martial Arts teacher and instructs him in using the Kaio-ken |
| Puar | evil | single | https://dragonball.fandom.com/wiki/Puar | owner rule: how the character is presented at the first appearance |
| Recoome | evil | single | https://dragonball.fandom.com/wiki/Recoome | iced ballet as a child. In spite of his cruelty, he do |
| Master Shen | evil | single | https://dragonball.fandom.com/wiki/Master_Shen | Villains |
| Porunga | neutral | single | https://dragonball.fandom.com/wiki/Porunga | owner rule: how the character is presented at the first appearance |
| Jiren | neutral | single | https://dragonball.fandom.com/wiki/Jiren | owner rule: how the character is presented at the first appearance |
| Tien Shinhan | evil | single | https://dragonball.fandom.com/wiki/Tien_Shinhan | Home Tien-Shin Style Dojo |Occupation = Assassin (former) Martial Artist Farmer Martial |
| Goten | good | single | https://dragonball.fandom.com/wiki/Goten | Infobox |RefName = Goten |image = Super Hero - Goten artwork.jpg|Anime Teen Goten (D |
| Hit | neutral | single | https://dragonball.fandom.com/wiki/Hit | owner rule: how the character is presented at the first appearance |
| Glorio | neutral | single | https://dragonball.fandom.com/wiki/Glorio | owner rule: how the character is presented at the first appearance |
| Whis | neutral | single | https://dragonball.fandom.com/wiki/Whis | owner rule: how the character is presented at the first appearance |
