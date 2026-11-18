# LAUNCH-PREP lane REFILL: new photos for the cards 119 took out of the packs (2026-11-18)

Integrator brief of 2026-11-18. After 119-photocheck.sql (lane PHOTOCHECK, commit 0419cba) the packs hold 892 cards once the publish workflow has run: 371 numbered cards have no photo (136 subjects lost editions, 11 lost every card). The owner wants at least 1,000. This lane looked for new Commons photos for those 136 subjects and took a new look at the 178 pending photos, with the rules and thresholds of 119 (docs/o1/reports/CARDS/LAUNCH-PREP-PHOTOCHECK.md), unchanged. Data: the export of production of 2026-11-17 (about 20:25 UTC) with the units of 119 applied. Who is in a photo comes only from its Commons title, description and categories; the eyes judged the composition only. No birth date is written anywhere: Wikidata was read in memory by the age check and never cached. The full table (every file looked at, its verdict, rank and edition) is `out/launch-prep/refill.csv`, the contact sheet `out/launch-prep/refill.html` (both out of git).

## Result

| | cards in the packs |
|---|---|
| today (export) | 1,263 |
| after 119, right after the file / once the publish workflow has run | 886 / 892 |
| after 119 + 123, right after the file (the workflow has not run since 119) | 886 |
| after 119 + 123, right after the file, the workflow having run after 119 | 892 |
| **after 119 + 123, once the publish workflow has cut the new photos** | **1,050** |

The target of 1,000 is reached with 50 to spare. 158 numbered cards come back (371 out after 119, 213 still out), on 139 new Commons photos in 88 subjects; 76 of the 136 subjects have all their editions again. No pending photo is approved (see below). Right after the file the count does not move (886): by the owner's rule a new photo usually ranks below the photos of 119 of the same look, so it takes the commonest edition and the older photos move up to the rarer ones; a card on a new photo waits for its files, a card that comes back on an older photo is in the packs at once. Cards with another photo: 225 (each keeps its number). Panoramas that follow their cards: 17. Lock reasons of a returning edition removed: 88 subjects.

## Method (same thresholds as 119)

1. **Harvest.** The Commons category tree of each subject (its Wikidata P373 for a person, the group's category; depth 2, the subject's own subcategories), and for the sparse ones a Commons file search kept only when the title, description or categories name the subject (and its group for a common name): 11,160 files.
2. **Automatic checks** (cands.json, every file): a free licence (CC0, public domain, CC BY, CC BY-SA, KOGL Type 1) with a named author, no deletion request, no open licence review, an image file, a day date (the file's date, and the title's date when it has one, must agree), not already a photo of the game (page or sha1, any status), not left out by lot 3 or lot 6 for the minors rule, no KPop Demon Hunters text, a card window (or a group part) at least 300 px wide, not the day of a live photo of the subject, and the **age rule on the photo date** (Wikidata P569; a group: its P527 and P463 lineup with the membership dates, a doubt counting as in the photo; a video still: 90 days before its upload date). 6,395 files passed, 4,661 were out (licence review open 522, too small 892, already in the game 877, a minor at the photo date 677, dates disagreeing 449, same day as a live photo 898, no day date 239, other). No photo was downloaded before its subject passed the age rule on its date.
3. **Viewing** (contact sheets of the card as cut, the window drawn; a group cut in the parts of its edition with the part lines drawn, alternative focal points and zooms when a line came near a face): 464 new files and 66 pending photos viewed. The best candidates of distinct days first, as many as the editions lost plus one or two.
4. **Verdicts**: OK with a look (5 professional or posed, 4 good event or stage, 3 acceptable) or REPLACE with the reason of 119 (another clearly visible person not named on Commons, two people side by side, one member on a group card, a part line entering a face, too small, blurry, poor look, not the subject, same occasion as a photo of the subject, dates disagreeing).
5. **The rule** (`planSubject` of 119, unchanged): the good photos of the subject best looking first (the order of 119 kept; a new photo goes after the photos of its look), keep the lowest editions the photos allow, Stage keeps an on-stage photo when one can go there, the best photo on the rarest edition kept, Full Art only with an honest 2x, a group edition only with a photo in its number of parts. A subject takes at most as many new photos as the editions it lost (an older good photo is never pushed off its card): 31 photos that pass stay unused.

## Counts

- Files examined: 11,160 (136 subjects). Viewed: 464 new files (OK 170: 139 placed, 31 not needed; REPLACE 294) and 66 pending photos (1 passes, 65 refused or kept back, see below).
- New photos: 126 of people, 13 of groups (SHINee 3, EXO 2, BTS 2, WINNER 2, ARTMS 1, 2NE1 1, Kiss of Life 1, miss A 1).
- New photos by look: 23 look 5, 86 look 4, 30 look 3. Their edition: mostly C, then R, U, SR (the older photos move up).

### The 11 subjects that lost every card (looked at first)

| subject | out after 119 | back with 123 | still out |
|---|---|---|---|
| group:bts | C U | C U | - |
| group:exo | C U | C U | - |
| group:shinee | C U R | C U R | - |
| idol:tiffany-girls-generation | C U | C U | - |
| group:2ne1 | C U | C | U |
| group:artms | C U R SR UR | C | U R SR UR |
| group:txt | C U R SR UR L | - | all: every group photo of 2024 and 2025 has a part line in a face or a member cut at the window edge; 2019 photos fail the age rule |
| group:day6 | C U R | - | all: Commons has no group photo of Day6 beyond the 7 files 119 refused (the search finds book fair days named "Day6") |
| group:fromis-9 | C U R | - | all: the 2025 Seattle photos cut members or faces; the 2022 Marie Claire photo has both lines in faces |
| group:viviz | C U | - | all: three members in two cards, the line falls on the middle member at every focal point |
| group:team | C U | - | all: no candidate passes the automatic checks (licence review open, a member without a Wikidata birth date, deletion requests) |

### Pending photos (178)

- 97 are never accepted: their lot 6 note says a person in the frame is not identified (rule of 119).
- 14 were refused by 119 with the same rules; their verdicts stand.
- 11 pass visually but their Commons licence review is still open (checked on 2026-11-18): EJ 405, Nicholas 905, Jungwon 697, Sunghoon 1115, Wonhee 1227, Wooyoung 1244, Yeosang 1275, Hyunsuk 548, Jongho 668, Minju 854, Yunah 1325. They stay pending; once Commons closes the review, the owner can approve them in the admin.
- 1 passes (GOT7 469, two members at a year-end show) but GOT7 has no numbered card: it stays pending.
- 54 refused after viewing (one member alone on a group photo, a part line in a face, another clearly visible person, a far stage, poor look), and 1 not viewed (Nicholas 904, licence review open).

## Subjects still without photos

Still out after 123: 213 cards. Subjects with nothing found (48): group:ateez, group:btob, group:day6, group:dreamcatcher, group:enhypen, group:fromis-9, group:girls-generation, group:ikon, group:kara, group:monsta-x, group:nct-127, group:nct-dream, group:nmixx, group:sistar, group:team, group:treasure, group:txt, group:viviz, idol:asa-babymonster, idol:beomgyu-txt, idol:dino-seventeen, idol:ej-team, idol:eunchae-le-sserafim, idol:gahyun-dreamcatcher, idol:hyungwon-monsta-x, idol:jiwoong-zerobaseone, idol:joohoney-monsta-x, idol:jungwon-enhypen, idol:k-team, idol:kihyun-monsta-x, idol:kim-lip-loona, idol:lara-katseye, idol:megan-katseye, idol:mingi-ateez, idol:mj-astro, idol:nicholas-team, idol:seonghwa-ateez, idol:shownu-monsta-x, idol:siyeon-dreamcatcher, idol:suhyun-akmu, idol:sunghoon-enhypen, idol:taeyang, idol:wonhee-illit, idol:yeosang-ateez, idol:yoohyeon-dreamcatcher, idol:yuha-hearts2hearts, idol:yunho-ateez, idol:yves-loona. Partly back (12): group:2ne1, group:artms, group:kiss-of-life, group:miss-a, idol:i-m-monsta-x, idol:jinsoul-loona, idol:jiu-dreamcatcher, idol:joshua-seventeen, idol:sakura-le-sserafim, idol:tzuyu-twice, idol:vernon-seventeen, idol:wooyoung-ateez. The table at the end gives every subject. Group photos are the hard part: a 3-card edition needs a wide photo whose two part lines both fall between members, with no unnamed person and no crowd.

## The 10 most doubtful calls

1. **BTS at the White House (2022-05-31), C and U of group:bts**, 2 cards at 23/50: the members stand in two overlapping rows, so the part line runs through RM's hair and along the edge of Jin's cheek without entering a face. Accepted (look 5, official photo); a stricter reading refuses it.
2. **EXO-M at the Nature Republic press call (2014-03-01)**, 3 cards at 0/50: both part lines run along the edge of a member's hair, the faces whole.
3. **ARTMS on stage in Tacoma (2025-04-18)**, 3 cards: part line 1 runs along the edge of a member's bangs.
4. **2NE1 on stage at Clarke Quay (2012-11-02)**, 2 cards: the part line runs along a member's hair; a concert photo (look 4) on the common edition.
5. **WINNER at the Kiehl's event (2018-05-15)**, 3 cards: a video still that looks smoothed; kept at look 3 (the lines fall between members).
6. **Partial lineups on group cards** (119's "two members or more"): miss A at the 2014 Gaon red carpet (two members, 2 cards at 0/50, a sliver of a third member's shoulder at the left edge, no face), WINNER at the 2014 Melon Music Awards (three of five), BTS at KCON New York 2016 (four of seven), SHINee at the Dong Fang awards (three of five).
7. **Small files kept at look 3**: Taeil's 2016 fan signing (a 304 px window), Vernon at an Estee Lauder event (340 px), Jinsoul at a 2017 fan signing (388 px): above the 280 px floor of 119, soft at 2x.
8. **Video stills dated by their upload**: many new photos are stills of event or interview videos; the age rule was applied 90 days before the upload date (every such subject was an adult long before).
9. **Refusals by caution** (another reading could accept them): NCT Dream's "Top Ten Awards, 2022" still (the title says 2022, the file 2023-04-06: dates disagree, although at 58/50 both lines pass between members); Tzuyu in Seattle and Megan at Music Bank (a day apart from a live photo: same tour stop, same promotion week); Seungmin at the Tasaki photo call and Wonhee at the Chanel photo call (the same events as live photos, the files dated a day apart).
10. **Ties go to the photos of 119**: a new photo ranks after the older photos of the same look, so a look-5 new photo can sit below a look-5 photo of 119; the rule then moves only one older card per new photo (fewest changes). The 31 passing photos left unused (Tiffany has 7, the subjects that lost one edition one each) could replace weaker photos later, if the owner wants the best looking ones on the rarest editions everywhere.

## Owned cards touched (owned copies follow their number)

- BV1-0086 (group:artms, C): comes back with a photo
- BV1-0188 (idol:jisoo-blackpink, U): comes back with a photo
- BV1-1025 (idol:key-shinee, R): comes back with a photo
- BV1-0277 (idol:jiu-dreamcatcher, R): a new photo
- BV1-1108 (idol:seungmin-stray-kids, SR): a new photo
- BV1-0635 (group:kiss-of-life, C): a new photo

## What 123-refill.sql does

One DO block, one unit per subject (88). A unit is applied only when every row of the subject is still the one 119 left: every photo (status, slot, focal point, and no photo more or less), every card and panorama (its photo), the lock reasons, and none of its new photos already in cards_photos (page or sha1); else it is left alone with a notice. In a unit: the new photos are inserted (status approved, no file, in a slot no live photo holds, preferring a slot no pending photo holds and a file stem no older photo used; parts 2 or 3 for a group), then the cards take their photo (small_2x by the rule of 118, in_packs as cards_photos_ready computes it: false until the files exist), then the panoramas, then the lock reasons of the returning editions are removed. The rows before are kept in cards_refill_log (RLS on, service_role only): a second run says "already applied" and changes nothing; the rollback gives the cards, panoramas and lock reasons back and deletes the photos 123 added (it also gives an approved pending photo its status and file columns back). Checks after the writes roll the whole file back: a card in the packs on a photo that is not live or has no file, a card in the packs with no photo, a photo on two editions, a card on a photo of another subject, a panorama that does not follow its cards, two live photos in one slot. Refused between 23:50 and 00:30 UTC and when 119 is not applied (no cards_photocheck_log). No XP, level, streak or badge is read or written; cards_owned is not touched.

Verify lines (expected on production with 119 applied): cards_refill_log 88; catalog 1263, 1, 1263; out of the packs with no photo 213; in the packs 886 now (892 when the workflow ran after 119), 1050 once the workflow has cut the new photos; cards on a live photo 1050; panoramas with no photo 59; photos approved 351, auto 632, pending 178, rejected 278; live photos to cut 163 now, 0 once the workflow has run; every other line 0 or no row.

After it: run the publish workflow (Cards publish). It finds each new photo's Commons original through `docs/design/cards/data/lot8/photos.json` (139 entries, by source page: url, sha1, author, licence, date, focal point, slot, parts), read by publish-card-files.mjs after lot 3 and lot 6.

## Proofs

- `src/lib/cards/refill-sql.test.ts` (PGlite): the file's shape (one DO block, header, no dash, no write to cards_owned); refuses untrusted data; the slot choice; on a database with 119 applied: new and approved photos, the dropped cards back by the rule, numbers and owned copies kept, the cards of a new photo enter the packs once its files are cut (trigger of 103), a second run changes nothing, a subject changed since 119 or whose new photo is already in is left alone, a database where 119 applied nothing, refusal without 119, the time window, the rollback gives the state after 119 back exactly (also after the workflow cut the new photos). On the rows of the export: the committed 119 then the committed 123, every Verify line, idempotent, the rollback gives the state after 119 back exactly, and 1,050 cards in the packs once every live photo has its files. lot8/photos.json holds every new photo of 123 and mergePhotoFiles finds it by page.
- `src/lib/cards/refill-publish.test.ts`: the real publish script, without a terminal, against a local Commons and project: a row found only in lot8/photos.json is cut and uploaded (a person, a group in 3 parts with its panorama), one PATCH each; without lot8/photos.json the same rows are "not in photos.json".
- Neighbours run: safeupdate.test.ts, card-files.test.ts, photocheck-sql.test.ts, publish-noninteractive.test.ts, card-cut.test.ts, harvest-privacy.test.ts, cards-layout.test.ts, crlf-sql.test.ts green. catalog-sql.test.ts "review 1 finding 15" fails only because 123-refill.sql and its rollback are not in its file list yet (ORCH adds the 119 to 124 block when merging o1/photocheck).

## Every subject that lost editions in 119

| subject | out after 119 | back with 123 | still out | new photos | cards back |
|---|---|---|---|---|---|
| group:2ne1 | C U | C | U | 1 | 2 |
| group:artms | C U R SR UR | C | U R SR UR | 1 | 3 |
| group:ateez | U R | - | U R | 0 | 0 |
| group:btob | C R | - | C R | 0 | 0 |
| group:bts | C U | C U | - | 2 | 4 |
| group:day6 | C U R | - | C U R | 0 | 0 |
| group:dreamcatcher | R SR | - | R SR | 0 | 0 |
| group:enhypen | SR L | - | SR L | 0 | 0 |
| group:exo | C U | C U | - | 2 | 6 |
| group:fromis-9 | C U R | - | C U R | 0 | 0 |
| group:girls-generation | C | - | C | 0 | 0 |
| group:ikon | U R | - | U R | 0 | 0 |
| group:kara | SR UR | - | SR UR | 0 | 0 |
| group:kiss-of-life | R SR UR L | L | R SR UR | 1 | 2 |
| group:miss-a | R SR | SR | R | 1 | 2 |
| group:monsta-x | U R SR UR | - | U R SR UR | 0 | 0 |
| group:nct-127 | U R SR UR | - | U R SR UR | 0 | 0 |
| group:nct-dream | R SR | - | R SR | 0 | 0 |
| group:nmixx | U R SR UR | - | U R SR UR | 0 | 0 |
| group:shinee | C U R | C U R | - | 3 | 7 |
| group:sistar | U R UR L | - | U R UR L | 0 | 0 |
| group:team | C U | - | C U | 0 | 0 |
| group:treasure | R SR UR | - | R SR UR | 0 | 0 |
| group:txt | C U R SR UR L | - | C U R SR UR L | 0 | 0 |
| group:viviz | C U | - | C U | 0 | 0 |
| group:winner | SR UR | SR UR | - | 2 | 6 |
| idol:ahyeon-babymonster | U | U | - | 1 | 1 |
| idol:asa-babymonster | U | - | U | 0 | 0 |
| idol:bambam-got7 | L | L | - | 1 | 1 |
| idol:bang-chan-stray-kids | L | L | - | 1 | 1 |
| idol:beomgyu-txt | UR | - | UR | 0 | 0 |
| idol:chaeryeong-itzy | L | L | - | 1 | 1 |
| idol:chaewon-le-sserafim | L | L | - | 1 | 1 |
| idol:chaeyoung-twice | UR L | UR L | - | 2 | 2 |
| idol:dahyun-twice | SR UR L | SR UR L | - | 3 | 3 |
| idol:daniela-katseye | R | R | - | 1 | 1 |
| idol:dino-seventeen | U | - | U | 0 | 0 |
| idol:dk-seventeen | UR L | UR L | - | 2 | 2 |
| idol:doyoung-nct | L | L | - | 1 | 1 |
| idol:ej-team | U | - | U | 0 | 0 |
| idol:eunchae-le-sserafim | R | - | R | 0 | 0 |
| idol:eunwoo-astro | L | L | - | 1 | 1 |
| idol:g-dragon-bigbang | U R SR UR | U R SR UR | - | 4 | 4 |
| idol:gaeul-ive | UR L | UR L | - | 2 | 2 |
| idol:gahyun-dreamcatcher | R | - | R | 0 | 0 |
| idol:haseul-loona | UR L | UR L | - | 2 | 2 |
| idol:hongjoong-ateez | R | R | - | 1 | 1 |
| idol:hoshi-seventeen | R SR UR L | R SR UR L | - | 4 | 4 |
| idol:hyoyeon-girls-generation | SR UR L | SR UR L | - | 3 | 3 |
| idol:hyungwon-monsta-x | UR | - | UR | 0 | 0 |
| idol:i-m-monsta-x | UR L | UR | L | 1 | 1 |
| idol:irene-red-velvet | UR L | UR L | - | 2 | 2 |
| idol:jackson-got7 | R SR UR L | R SR UR L | - | 4 | 4 |
| idol:jay-b-got7 | L | L | - | 1 | 1 |
| idol:jay-park | L | L | - | 1 | 1 |
| idol:jeonghan-seventeen | L | L | - | 1 | 1 |
| idol:jeongyeon-twice | L | L | - | 1 | 1 |
| idol:jin-bts | UR | UR | - | 1 | 1 |
| idol:jinsoul-loona | UR L | UR | L | 1 | 1 |
| idol:jisoo-blackpink | U R | U R | - | 2 | 2 |
| idol:jiu-dreamcatcher | UR L | UR | L | 1 | 1 |
| idol:jiwoong-zerobaseone | UR | - | UR | 0 | 0 |
| idol:joohoney-monsta-x | L | - | L | 0 | 0 |
| idol:joshua-seventeen | SR UR L | SR UR | L | 2 | 2 |
| idol:joy-red-velvet | L | L | - | 1 | 1 |
| idol:jun-seventeen | UR L | UR L | - | 2 | 2 |
| idol:jungwon-enhypen | R | - | R | 0 | 0 |
| idol:k-team | U R SR UR L | - | U R SR UR L | 0 | 0 |
| idol:kazuha-le-sserafim | UR L | UR L | - | 2 | 2 |
| idol:key-shinee | R SR UR | R SR UR | - | 3 | 3 |
| idol:kihyun-monsta-x | U | - | U | 0 | 0 |
| idol:kim-lip-loona | UR | - | UR | 0 | 0 |
| idol:lara-katseye | R | - | R | 0 | 0 |
| idol:lay-exo | R | R | - | 1 | 1 |
| idol:lia-itzy | UR | UR | - | 1 | 1 |
| idol:liz-ive | SR UR L | SR UR L | - | 3 | 3 |
| idol:manon-katseye | R | R | - | 1 | 1 |
| idol:mark-nct | L | L | - | 1 | 1 |
| idol:megan-katseye | R | - | R | 0 | 0 |
| idol:mina-twice | UR L | UR L | - | 2 | 2 |
| idol:mingi-ateez | R SR | - | R SR | 0 | 0 |
| idol:mingyu-seventeen | L | L | - | 1 | 1 |
| idol:minho-shinee | UR L | UR L | - | 2 | 2 |
| idol:mj-astro | L | - | L | 0 | 0 |
| idol:momo-twice | L | L | - | 1 | 1 |
| idol:moonbyul-mamamoo | UR L | UR L | - | 2 | 2 |
| idol:nayeon-twice | L | L | - | 1 | 1 |
| idol:nicholas-team | U | - | U | 0 | 0 |
| idol:onew-shinee | SR UR | SR UR | - | 2 | 2 |
| idol:rei-ive | L | L | - | 1 | 1 |
| idol:rora-babymonster | U | U | - | 1 | 1 |
| idol:sakura-le-sserafim | UR L | UR | L | 1 | 1 |
| idol:san-ateez | SR UR L | SR UR L | - | 3 | 3 |
| idol:seohyun-girls-generation | SR | SR | - | 1 | 1 |
| idol:seonghwa-ateez | U R | - | U R | 0 | 0 |
| idol:seulgi-red-velvet | U R | U R | - | 2 | 2 |
| idol:seungmin-stray-kids | L | L | - | 1 | 1 |
| idol:shownu-monsta-x | R SR | - | R SR | 0 | 0 |
| idol:siyeon-dreamcatcher | UR | - | UR | 0 | 0 |
| idol:sooyoung-girls-generation | L | L | - | 1 | 1 |
| idol:soyeon-g-i-dle | L | L | - | 1 | 1 |
| idol:sua-dreamcatcher | UR L | UR L | - | 2 | 2 |
| idol:suho-exo | UR | UR | - | 1 | 1 |
| idol:suhyun-akmu | UR L | - | UR L | 0 | 0 |
| idol:sunghoon-enhypen | UR | - | UR | 0 | 0 |
| idol:sunny-girls-generation | L | L | - | 1 | 1 |
| idol:taeil-nct | L | L | - | 1 | 1 |
| idol:taeyang | SR UR L | - | SR UR L | 0 | 0 |
| idol:taeyong-nct | UR L | UR L | - | 2 | 2 |
| idol:ten-nct | L | L | - | 1 | 1 |
| idol:the8-seventeen | R | R | - | 1 | 1 |
| idol:tiffany-girls-generation | C U | C U | - | 2 | 2 |
| idol:tzuyu-twice | R SR UR | R SR | UR | 2 | 2 |
| idol:vernon-seventeen | R SR UR L | R SR UR | L | 3 | 3 |
| idol:wendy-red-velvet | SR UR L | SR UR L | - | 3 | 3 |
| idol:wheein-mamamoo | UR L | UR L | - | 2 | 2 |
| idol:winter-aespa | L | L | - | 1 | 1 |
| idol:wonhee-illit | U R | - | U R | 0 | 0 |
| idol:wonwoo-seventeen | UR L | UR L | - | 2 | 2 |
| idol:wooyoung-ateez | R SR | R | SR | 1 | 1 |
| idol:woozi-seventeen | L | L | - | 1 | 1 |
| idol:xiumin-exo | L | L | - | 1 | 1 |
| idol:yeonjun-txt | L | L | - | 1 | 1 |
| idol:yeosang-ateez | SR | - | SR | 0 | 0 |
| idol:yeri-red-velvet | SR UR L | SR UR L | - | 3 | 3 |
| idol:yoohyeon-dreamcatcher | UR L | - | UR L | 0 | 0 |
| idol:yoona-girls-generation | L | L | - | 1 | 1 |
| idol:youngjae-got7 | L | L | - | 1 | 1 |
| idol:yugyeom-got7 | L | L | - | 1 | 1 |
| idol:yuha-hearts2hearts | U | - | U | 0 | 0 |
| idol:yujin-ive | L | L | - | 1 | 1 |
| idol:yunho-ateez | L | - | L | 0 | 0 |
| idol:yunjin-le-sserafim | L | L | - | 1 | 1 |
| idol:yuqi-g-i-dle | UR | UR | - | 1 | 1 |
| idol:yuri-girls-generation | UR L | UR L | - | 2 | 2 |
| idol:yves-loona | L | - | L | 0 | 0 |
