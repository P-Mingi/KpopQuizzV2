# v12-g2-01-groups: RESCENE and NCT WISH (dry-run report)

SQL: `docs/pending-migrations/v12-g2-01-groups.sql`. Nothing was written to the database. Checked against the
live catalogue with the anon key on 2026-10-02: neither `rescene` nor `nct-wish` exists in `groups` (92 rows),
so the file adds 2 rows. Sources opened on 2026-10-02.

Rule applied: a fact goes in only when two sources state it, A = official site, label, or a major outlet
quoting the label, B = a reference wiki (or Wikidata / MusicBrainz for identifiers). Otherwise the column is
left NULL and the fact is listed under "Left out".

## RESCENE

| Column | Value | Source A | Source B |
|---|---|---|---|
| name | RESCENE | [The Muze Entertainment, group page](https://themuze.kr/rescene): "걸그룹 RESCENE(리센느)는 원이, 미나미, 리브, 메이, 그리고 제나로 이루어진 다섯 멤버가" | [Wikipedia, Rescene](https://en.wikipedia.org/wiki/Rescene): "Rescene (stylized in all caps) is a South Korean girl group formed by The Muze Entertainment." |
| fandom_name | REMINE | [Soompi, 2024-07-10](https://www.soompi.com/article/1674005wpp/rescene-announces-official-fandom-name): "has announced that their fandom name will be REMINE." | [Kpop Wiki, RESCENE](https://kpop.fandom.com/wiki/RESCENE): "fandom = REMINE (리마인)" |
| inception_date | 2024-03-26 | [Soompi](https://www.soompi.com/article/1651280wpp/watch-rescene-blooms-in-captivating-debut-mv-for-uhuh): "On March 26 at 6 p.m. KST, the girl group released their debut single album Re:Scene" | [Wikipedia, Re:Scene](https://en.wikipedia.org/wiki/Re:Scene): "It was released by The Muze Entertainment on March 26, 2024" |
| record_label | The Muze Entertainment | [Korea JoongAng Daily](https://www.koreajoongangdaily.com/entertainment/rescene-reveals-members-ahead-of-debut-month/10362446): "Rescene is the first girl group to debut under The Muze Entertainment's label." | Wikipedia, Rescene: "label = The Muze" |
| wikidata_qid | Q124856415 | Wikidata item "Rescene" | MusicBrainz artist (same Wikidata link) |
| musicbrainz_mbid | a54fd8e2-d319-44a6-aa60-21adf17751bf | MusicBrainz artist RESCENE (KR, group) | Wikidata P434, same value |
| spotify_artist_id | 5deOsjuFTKrNMJW3rKuL8S | Wikidata P1902 | MusicBrainz; Spotify oEmbed for the id answers "RESCENE" |
| deezer_artist_id | 256312822 | Deezer public API, exact name match, 5,624 fans | Wikidata P2722 and MusicBrainz, same id |

Left out (NULL in the file):
- generation: "5th generation" appears in two articles of one outlet (Sports Kyunghyang) only. No label statement, no wiki.
- origin_country: Wikipedia, Kpop Wiki and MusicBrainz say Seoul, South Korea; no official or outlet page that was opened states it.
- official_website: no dedicated site confirmed. `https://themuze.kr/rescene` (the label's group page) loads; the address Kpop Wiki lists (`rescene.bstage.in`) answers 404.

## NCT WISH

| Column | Value | Source A | Source B |
|---|---|---|---|
| name | NCT WISH | SM Entertainment press release, 2024-01-19 (newsroom): "NCT의 마지막 팀 NCT WISH(엔시티 위시, 에스엠엔터테인먼트 소속)" | [Wikipedia, NCT Wish](https://en.wikipedia.org/wiki/NCT_Wish) (official logo "NCT WISH"); [Kpop Wiki](https://kpop.fandom.com/wiki/NCT_WISH): "name = NCT WISH" |
| fandom_name | NCTzen | [Official Japan fan club](https://nctzenwish-japan.smtown-fc.jp/): "NCTzen WISH-JAPAN JAPAN OFFICIAL FANCLUB" | Kpop Wiki, NCT WISH: "fandom = NCTzen (엔시티즌)" |
| inception_date | 2024-02-21 | SM press release, 2024-01-19: "NCT WISH ... 가 2월 21일 도쿄돔에서 화려하게 데뷔한다."; [avex NCT Japan site](https://nct-jp.net/profile/): "2024年2月21日「WISH」で日韓同時デビュー。" | Wikipedia, NCT Wish: "They officially debuted on February 21, 2024, with the single Wish" |
| record_label | SM Entertainment | SM press release, 2024-01-19: "에스엠엔터테인먼트 소속" | Wikipedia, NCT Wish: "formed and managed by SM Entertainment and Avex Trax" |
| wikidata_qid | Q122575981 | Wikidata item "NCT Wish" | MusicBrainz artist (same Wikidata link) |
| musicbrainz_mbid | fb175979-152f-4f32-bf8b-08aa86c24fe3 | MusicBrainz artist NCT WISH (JP, group) | Wikidata P434, same value |
| spotify_artist_id | 4FqmqIspLaUGtxAFFLsZxc | Wikidata P1902 | MusicBrainz; Spotify oEmbed for the id answers "NCT WISH" |
| deezer_artist_id | 250913622 | Deezer public API, exact name match, 10,369 fans | MusicBrainz, same id |

Notes on two values:
- fandom_name: NCTzen is the fandom of every NCT unit (the catalogue's NCT, NCT 127 and NCT DREAM rows carry it). The unit's own fan club is "NCTzen WISH". No source gives a separate fandom name.
- inception_date: the debut stage was 2024-02-21 (SMTOWN LIVE, Tokyo Dome); the debut single "WISH" was released 2024-02-28. SM, avex and both wikis give 02-21 as the debut date, so the file uses it.

Left out (NULL in the file):
- generation: no label, outlet or wiki source that was opened states one.
- origin_country: the sources do not agree on one country. SM: "한국과 일본을 기반으로" (based in Korea and Japan); Wikipedia: "origin = Tokyo, Japan".
- official_website: no dedicated site. The SM artist page and the shared avex NCT Japan site load; the address Wikipedia lists redirects to a generic index.

## Not in this file (owner decisions)

- `groups.generation` for both groups. The catalogue tags every 2023 and later debut "5th Gen" (ILLIT, TWS, BOYNEXTDOOR, tripleS) and the songs of both groups are stored in the `5th` bucket, but no two sources state it. One line each if the owner wants the label shown: `update groups set generation = '5th Gen' where slug in ('rescene', 'nct-wish') and generation is null;`
- Hearts2Hearts and KickFlip already exist as fan-created rows (`hearts2hearts`, id 91, name stored as "Hearts2hearts", `needs_review = true`; `kickflip`, id 65). This file does not touch them. Once v12-g2-02 links their songs, both get a group playlist under the stored name. The official spelling is "Hearts2Hearts" (SM press releases, Wikipedia); the fix is one line and is the owner's call because it renames a fan-created row: `update groups set name = 'Hearts2Hearts' where slug = 'hearts2hearts' and name = 'Hearts2hearts';`
