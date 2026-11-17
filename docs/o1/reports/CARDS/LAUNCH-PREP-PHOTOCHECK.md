# LAUNCH-PREP lane PHOTOCHECK: the check of every live card photo (2026-11-17)

Integrator brief of 2026-11-17 and the owner's rule relayed by ORCH the same day ("the best looking pictures of one idol should be the rarest ... just take the good looking pictures, even if it means less rarity"). Data: the export of production read by ORCH on 2026-11-17 about 20:25 UTC (1,300 rows of cards_photos, 1,263 numbered cards, 116 panoramas). Who is in a photo comes only from its Commons title, description and categories; the eyes judged the composition only. No birth date is written anywhere. The full table (one line per photo, with the rank and the edition) is `out/launch-prep/photocheck.csv`, the contact sheet `out/launch-prep/photocheck.html` (both out of git).

## Thresholds (applied to every photo)

1. **Scope.** The 1,100 live photos with files: the published crop (a person: the card; a group: each part and the panorama, part lines drawn) next to the Commons thumbnail with the current window drawn, one block per subject. Pending photos were looked at only as replacement candidates, only for a subject that lacks good photos, only when every named person passes the age rule (photos.json `age.ok`), and never one whose review note says a person in the frame is not identified, the licence review is still open, or the dates disagree.
2. **Not viewed.** A file excluded in photos.json for another subject by the lot 6 thumbnail check (a person who seems under 18) is REPLACE without being opened (photos 426 and 1039). No photo of a subject that fails the age rule or has no verdict was opened.
3. **Another person (minors rule).** A second face that is clearly visible in the published window (in focus and readable at card size) and is not named on Commons, or is named but has no age check in the project's data, gives REPLACE. Not "clearly visible": a blurred background, a head cut by the frame without its face, an arm, a hand, a shoulder.
4. **The subject.** A person's card shows that person as the one main person: two people of comparable size side by side give REPLACE. A group's card shows the group (two members or more, together): one member alone on a group photo gives REPLACE. An object, a logo, an album cover or another person named on Commons gives REPLACE.
5. **Too small.** The subject's face under about 1/12 of the card height (a stage seen from far, a crowd shot).
6. **Blurry or low resolution.** Soft at card size, or a card cut from a window under 280 px wide in the original (the 1x card is 320 px).
7. **A cut face.** A person: the window cuts the face. A group: a part line enters a face (a line that runs along the edge of a face without entering it is tolerated). RECROP when a focal point keeps every face whole, proved by rendering that window from the thumbnail with card-geometry.mjs (windowBox, splitParts, same ratio) and looking at it (part lines zoomed for a group); else REPLACE.
8. **Look (the owner's rule).** Each photo got a look score: 5 a professional or posed photo (photoshoot, teaser, press call, red carpet), sharp, clean; 4 a good event or stage photo, sharp, face large; 3 acceptable; 2 poor (amateur fan capture, low light, colour cast, cluttered foreground, face turned away or covered, watermark); 1 fails a hard rule. 2 and 1 are REPLACE. The photos that pass are ranked per subject (rank 1 = best).
9. **One occasion per edition** (lot 3 rule, verify-photos sameOccasion): two live photos of one subject from the same day and set keep the better one.
10. **KPop Demon Hunters.** No checked file names the film, HUNTR/X or the Saja Boys on Commons, and no image of the film was seen.

## Counts

- Live photos checked: 1100. OK 820, RECROP 20 (10 with a new focal point, 10 with the same window and their files cut again because they were published rotated), REPLACE 260.
- Pending candidates looked at: 17; accepted 3 (159 Apink, 943 and 944 RIIZE, 944 at the focal point 82/50), refused 14 (they stay pending, untouched).
- Not checked: photo 609 (idol:jeongwoo-treasure), live but without files and behind no card.
- Cards: all 1,263 keep their number. 564 get another photo (the owner's order: the best photo on the rarest edition kept), 371 leave the packs with no photo (the rarest editions of 136 subjects; 11 subjects lose every card). Cards in the packs: 886 right after the file, 892 once the publish workflow has cut the 3 approved photos (1,263 today).
- Panoramas: 94 follow their edition (72 left with no photo because their edition left).

REPLACE by reason (live photos):

| reason | photos |
|---|---|
| subject too small (a stage seen from far, a crowd) | 50 |
| another clearly visible person, not named on Commons (minors rule) | 46 |
| poor look (amateur, low light, colour cast, face hidden or turned away, watermark) | 37 |
| a part line crosses a face and no focal point clears it | 32 |
| not the subject at all (an object, a logo, an album cover, another person named on Commons) | 27 |
| blurry or low resolution | 24 |
| the subject is not the main person (one member on a group photo, two people side by side) | 24 |
| same occasion as a better photo of the subject (lot 3 rule: one edition, one occasion) | 18 |
| not viewed: the same file is left out for another subject by the lot 6 thumbnail check | 2 |

## The rule of the editions (owner, 2026-11-17) and the conflicts

Read from cards_build_catalog (103, 117, 118): the ladder is C, U, R, SR, UR, L (L the rarest); a group edition is one photo in 2 or 3 consecutive cards; Full Art needs every part 640 px wide; Stage takes an on-stage photo when there is one. The check keeps every number and moves only photo_id (src/lib/cards/photocheck-plan.ts, tested): keep as many editions as the good photos allow, the lowest ones (the rarest leave), Stage keeps an on-stage photo when one can go there, then the best ranked photo on the rarest edition kept, ties by the fewest changes. A group photo keeps its number of parts (changing it would need a new lot 7 verdict and a recut), so a group edition only takes a photo in as many parts as it has cards.

- Stage without an on-stage photo (57 subjects; Stage keeps an off-stage photo, as cards_build_catalog already does): group:enhypen, group:nct-dream, group:riize, group:winner, idol:anton-riize, idol:bambam-got7, idol:bang-chan-stray-kids, idol:beomgyu-txt, idol:changbin-stray-kids, idol:dohoon-tws, idol:eunseok-riize, idol:eunwoo-astro, idol:felix-stray-kids, idol:gaeul-ive, idol:han-stray-kids, idol:hongjoong-ateez, idol:huening-kai-txt, idol:hyoyeon-girls-generation, idol:hyungwon-monsta-x, idol:hyunjin-stray-kids, idol:hyunsuk-treasure, idol:i-m-monsta-x, idol:i-n-stray-kids, idol:jackson-got7, idol:james-cortis, idol:jinyoung-got7, idol:jiwoo-hearts2hearts, idol:joohoney-monsta-x, idol:joy-red-velvet, idol:jungwon-enhypen, idol:kazuha-le-sserafim, idol:keena-fifty-fifty, idol:lara-katseye, idol:lee-know-stray-kids, idol:leeseo-ive, idol:mingi-ateez, idol:minju-illit, idol:moonbyul-mamamoo, idol:rei-ive, idol:san-ateez, idol:seohyun-girls-generation, idol:seungmin-stray-kids, idol:sophia-katseye, idol:suhyun-akmu, idol:taehyun-txt, idol:the8-seventeen, idol:vernon-seventeen, idol:wonbin-riize, idol:wonyoung-ive, idol:wooyoung-ateez, idol:yeosang-ateez, idol:yeri-red-velvet, idol:yoona-girls-generation, idol:youngjae-got7, idol:yujin-ive, idol:yunah-illit, idol:yuri-girls-generation.
- The best photo is the on-stage one, so it stays on Stage and the rarest edition gets the second best (6 subjects): group:kara, idol:chaeyoung-twice, idol:choerry-loona, idol:wendy-red-velvet, idol:wheein-mamamoo, idol:wonwoo-seventeen.
- Full Art: no subject keeps enough photos and lacks a 2x photo; when Full Art leaves, it is because the subject has fewer good photos than editions.
- The parts of a group decide (4 subjects keep a rarer edition and lose a lower one, because the photos left do not have the parts of the lower one): group:btob keeps U SR, loses C R; group:enhypen keeps C U R UR, loses SR L; group:girls-generation keeps U, loses C; group:sistar keeps C SR, loses U R UR L.

Owned cards touched (owned copies follow their number; a card out of the packs is out of the binders too, as for any refused photo, until a new photo comes):

- BV1-0071 (idol:suhyun-akmu, C): a new photo
- BV1-0086 (group:artms, C): leaves the packs
- BV1-0107 (idol:mj-astro, C): a new photo
- BV1-0123 (idol:mingi-ateez, C): a new photo
- BV1-0134 (idol:seonghwa-ateez, U): leaves the packs
- BV1-0188 (idol:jisoo-blackpink, U): leaves the packs
- BV1-0273 (idol:handong-dreamcatcher, U): a new photo
- BV1-0282 (idol:siyeon-dreamcatcher, U): a new photo
- BV1-0311 (idol:jungwon-enhypen, U): a new photo
- BV1-0353 (idol:d-o-exo, U): a new photo
- BV1-0488 (idol:yuha-hearts2hearts, U): leaves the packs
- BV1-0503 (group:ikon, U): leaves the packs
- BV1-0535 (idol:yeji-itzy, C): a new photo
- BV1-0768 (idol:joohoney-monsta-x, C): a new photo
- BV1-0785 (group:monsta-x, U): leaves the packs
- BV1-0946 (group:riize, C): a new photo
- BV1-0956 (idol:dino-seventeen, U): leaves the packs
- BV1-1025 (idol:key-shinee, R): leaves the packs
- BV1-1053 (group:sistar, C): a new photo
- BV1-1055 (group:sistar, U): leaves the packs
- BV1-1087 (idol:hyunjin-stray-kids, C): a new photo
- BV1-1108 (idol:seungmin-stray-kids, SR): a new photo
- BV1-1205 (idol:soobin-txt, SR): a new photo

## Editions kept and dropped, per subject (only the subjects that lose editions)

| subject | editions | kept | dropped |
|---|---|---|---|
| group:2ne1 | 2 | 0 | C U |
| group:artms | 5 | 0 | C U R SR UR |
| group:ateez | 3 | 1 | U R |
| group:btob | 4 | 2 | C R |
| group:bts | 2 | 0 | C U |
| group:day6 | 3 | 0 | C U R |
| group:dreamcatcher | 4 | 2 | R SR |
| group:enhypen | 6 | 4 | SR L |
| group:exo | 2 | 0 | C U |
| group:fromis-9 | 3 | 0 | C U R |
| group:girls-generation | 2 | 1 | C |
| group:ikon | 3 | 1 | U R |
| group:kara | 5 | 3 | SR UR |
| group:kiss-of-life | 6 | 2 | R SR UR L |
| group:miss-a | 4 | 2 | R SR |
| group:monsta-x | 5 | 1 | U R SR UR |
| group:nct-127 | 5 | 1 | U R SR UR |
| group:nct-dream | 4 | 2 | R SR |
| group:nmixx | 5 | 1 | U R SR UR |
| group:shinee | 3 | 0 | C U R |
| group:sistar | 6 | 2 | U R UR L |
| group:team | 2 | 0 | C U |
| group:treasure | 5 | 2 | R SR UR |
| group:txt | 6 | 0 | C U R SR UR L |
| group:viviz | 2 | 0 | C U |
| group:winner | 5 | 3 | SR UR |
| idol:ahyeon-babymonster | 2 | 1 | U |
| idol:asa-babymonster | 2 | 1 | U |
| idol:bambam-got7 | 6 | 5 | L |
| idol:bang-chan-stray-kids | 6 | 5 | L |
| idol:beomgyu-txt | 5 | 4 | UR |
| idol:chaeryeong-itzy | 6 | 5 | L |
| idol:chaewon-le-sserafim | 6 | 5 | L |
| idol:chaeyoung-twice | 6 | 4 | UR L |
| idol:dahyun-twice | 6 | 3 | SR UR L |
| idol:daniela-katseye | 3 | 2 | R |
| idol:dino-seventeen | 2 | 1 | U |
| idol:dk-seventeen | 6 | 4 | UR L |
| idol:doyoung-nct | 6 | 5 | L |
| idol:ej-team | 2 | 1 | U |
| idol:eunchae-le-sserafim | 3 | 2 | R |
| idol:eunwoo-astro | 6 | 5 | L |
| idol:g-dragon-bigbang | 5 | 1 | U R SR UR |
| idol:gaeul-ive | 6 | 4 | UR L |
| idol:gahyun-dreamcatcher | 3 | 2 | R |
| idol:haseul-loona | 6 | 4 | UR L |
| idol:hongjoong-ateez | 3 | 2 | R |
| idol:hoshi-seventeen | 6 | 2 | R SR UR L |
| idol:hyoyeon-girls-generation | 6 | 3 | SR UR L |
| idol:hyungwon-monsta-x | 5 | 4 | UR |
| idol:i-m-monsta-x | 6 | 4 | UR L |
| idol:irene-red-velvet | 6 | 4 | UR L |
| idol:jackson-got7 | 6 | 2 | R SR UR L |
| idol:jay-b-got7 | 6 | 5 | L |
| idol:jay-park | 6 | 5 | L |
| idol:jeonghan-seventeen | 6 | 5 | L |
| idol:jeongyeon-twice | 6 | 5 | L |
| idol:jin-bts | 5 | 4 | UR |
| idol:jinsoul-loona | 6 | 4 | UR L |
| idol:jisoo-blackpink | 3 | 1 | U R |
| idol:jiu-dreamcatcher | 6 | 4 | UR L |
| idol:jiwoong-zerobaseone | 5 | 4 | UR |
| idol:joohoney-monsta-x | 6 | 5 | L |
| idol:joshua-seventeen | 6 | 3 | SR UR L |
| idol:joy-red-velvet | 6 | 5 | L |
| idol:jun-seventeen | 6 | 4 | UR L |
| idol:jungwon-enhypen | 3 | 2 | R |
| idol:k-team | 6 | 1 | U R SR UR L |
| idol:kazuha-le-sserafim | 6 | 4 | UR L |
| idol:key-shinee | 5 | 2 | R SR UR |
| idol:kihyun-monsta-x | 2 | 1 | U |
| idol:kim-lip-loona | 5 | 4 | UR |
| idol:lara-katseye | 3 | 2 | R |
| idol:lay-exo | 3 | 2 | R |
| idol:lia-itzy | 5 | 4 | UR |
| idol:liz-ive | 6 | 3 | SR UR L |
| idol:manon-katseye | 3 | 2 | R |
| idol:mark-nct | 6 | 5 | L |
| idol:megan-katseye | 3 | 2 | R |
| idol:mina-twice | 6 | 4 | UR L |
| idol:mingi-ateez | 4 | 2 | R SR |
| idol:mingyu-seventeen | 6 | 5 | L |
| idol:minho-shinee | 6 | 4 | UR L |
| idol:mj-astro | 6 | 5 | L |
| idol:momo-twice | 6 | 5 | L |
| idol:moonbyul-mamamoo | 6 | 4 | UR L |
| idol:nayeon-twice | 6 | 5 | L |
| idol:nicholas-team | 2 | 1 | U |
| idol:onew-shinee | 5 | 3 | SR UR |
| idol:rei-ive | 6 | 5 | L |
| idol:rora-babymonster | 2 | 1 | U |
| idol:sakura-le-sserafim | 6 | 4 | UR L |
| idol:san-ateez | 6 | 3 | SR UR L |
| idol:seohyun-girls-generation | 4 | 3 | SR |
| idol:seonghwa-ateez | 3 | 1 | U R |
| idol:seulgi-red-velvet | 3 | 1 | U R |
| idol:seungmin-stray-kids | 6 | 5 | L |
| idol:shownu-monsta-x | 4 | 2 | R SR |
| idol:siyeon-dreamcatcher | 5 | 4 | UR |
| idol:sooyoung-girls-generation | 6 | 5 | L |
| idol:soyeon-g-i-dle | 6 | 5 | L |
| idol:sua-dreamcatcher | 6 | 4 | UR L |
| idol:suho-exo | 5 | 4 | UR |
| idol:suhyun-akmu | 6 | 4 | UR L |
| idol:sunghoon-enhypen | 5 | 4 | UR |
| idol:sunny-girls-generation | 6 | 5 | L |
| idol:taeil-nct | 6 | 5 | L |
| idol:taeyang | 6 | 3 | SR UR L |
| idol:taeyong-nct | 6 | 4 | UR L |
| idol:ten-nct | 6 | 5 | L |
| idol:the8-seventeen | 3 | 2 | R |
| idol:tiffany-girls-generation | 2 | 0 | C U |
| idol:tzuyu-twice | 5 | 2 | R SR UR |
| idol:vernon-seventeen | 6 | 2 | R SR UR L |
| idol:wendy-red-velvet | 6 | 3 | SR UR L |
| idol:wheein-mamamoo | 6 | 4 | UR L |
| idol:winter-aespa | 6 | 5 | L |
| idol:wonhee-illit | 3 | 1 | U R |
| idol:wonwoo-seventeen | 6 | 4 | UR L |
| idol:wooyoung-ateez | 4 | 2 | R SR |
| idol:woozi-seventeen | 6 | 5 | L |
| idol:xiumin-exo | 6 | 5 | L |
| idol:yeonjun-txt | 6 | 5 | L |
| idol:yeosang-ateez | 4 | 3 | SR |
| idol:yeri-red-velvet | 6 | 3 | SR UR L |
| idol:yoohyeon-dreamcatcher | 6 | 4 | UR L |
| idol:yoona-girls-generation | 6 | 5 | L |
| idol:youngjae-got7 | 6 | 5 | L |
| idol:yugyeom-got7 | 6 | 5 | L |
| idol:yuha-hearts2hearts | 2 | 1 | U |
| idol:yujin-ive | 6 | 5 | L |
| idol:yunho-ateez | 6 | 5 | L |
| idol:yunjin-le-sserafim | 6 | 5 | L |
| idol:yuqi-g-i-dle | 5 | 4 | UR |
| idol:yuri-girls-generation | 6 | 4 | UR L |
| idol:yves-loona | 6 | 5 | L |

## RECROP

| photo | subject | cards today | focal | what |
|---|---|---|---|---|
| 257 | group:aespa | BV1-0069 BV1-0070 | 50/24 | files cut again: they were published rotated |
| 173 | group:btob | BV1-0204 BV1-0205 | 72/50 | new focal point |
| 175 | group:btob | BV1-0209 BV1-0210 | 100/50 | new focal point |
| 761 | group:le-sserafim | BV1-0680 BV1-0681 | 0/50 | new focal point |
| 944 | group:riize | - | 82/50 | candidate approved at this focal point |
| 242 | group:winner | BV1-1244 BV1-1245 | 0/50 | new focal point |
| 356 | idol:choerry-loona | BV1-0683 | 50/30 | files cut again: they were published rotated |
| 392 | idol:dk-seventeen | BV1-0959 | 80/30 | new focal point |
| 96 | idol:jay-park | BV1-0588 | 34/30 | new focal point |
| 629 | idol:jinsoul-loona | BV1-0704 | 50/30 | files cut again: they were published rotated |
| 858 | idol:miyeon-g-i-dle | BV1-0006 | 50/30 | files cut again: they were published rotated |
| 862 | idol:miyeon-g-i-dle | BV1-0001 | 64/30 | new focal point |
| 959 | idol:ryujin-itzy | BV1-0534 | 50/30 | files cut again: they were published rotated |
| 997 | idol:sehun-exo | BV1-0365 | 66/30 | new focal point |
| 998 | idol:sehun-exo | BV1-0363 | 32/30 | new focal point |
| 1052 | idol:siyeon-dreamcatcher | BV1-0282 | 50/8 | new focal point |
| 1282 | idol:yoohyeon-dreamcatcher | BV1-0297 | 50/30 | files cut again: they were published rotated |
| 1316 | idol:yuna-itzy | BV1-0544 | 50/30 | files cut again: they were published rotated |
| 1338 | idol:yuqi-g-i-dle | BV1-0023 | 50/30 | files cut again: they were published rotated |
| 1357 | idol:yves-loona | BV1-0718 | 50/30 | files cut again: they were published rotated |
| 156 | idol:zico | BV1-1263 | 50/30 | files cut again: they were published rotated |

The rotated files: 26 published crops did not match their window (their Commons originals carry an EXIF Orientation tag; the database and every viewer read them upright, the cutter read the raw pixels). 10 of them pass and get their files cut again (file_focal cleared); the others are REPLACE for other reasons. scripts/cards/card-cut.mjs now reads the photo upright (sharp autoOrient), tested in card-cut.test.ts; a photo without the tag is cut byte for byte as before. **The publish workflow must run with this fix**, else the files are cut rotated again.

## REPLACE (live photos)

| photo | subject | cards today | reason |
|---|---|---|---|
| 247 | group:2ne1 | BV1-0039 BV1-0040 | not the group: one member alone (studio portrait) on a group photo, and a part line crosses her face at any focal point |
| 252 | group:2ne1 | BV1-0041 BV1-0042 | too small: hologram concert stage seen from far, the figures fill a small part of the card and their faces are tiny and soft |
| 160 | group:apink | BV1-0083 BV1-0084 BV1-0085 | part line 1 crosses a member's face (mid-face), and the window already spans the whole photo width: no focal point moves the lines |
| 165 | group:artms | BV1-0098 BV1-0099 BV1-0100 | part line 1 crosses a member's face; the window spans the whole photo width, no focal point moves the lines |
| 167 | group:artms | BV1-0095 BV1-0096 BV1-0097 | part lines 1 and 2 each cross a member's face; the window spans the whole photo width |
| 168 | group:artms | BV1-0086 BV1-0087 BV1-0088 | part line 1 crosses a member's face; the window can move 1% at most, not enough to clear it |
| 169 | group:artms | BV1-0092 BV1-0093 BV1-0094 | part line 1 crosses a member's face; the window spans the whole photo width |
| 170 | group:artms | BV1-0089 BV1-0090 BV1-0091 | stage seen from far (faces about 1/20 of the card height), and part line 2 crosses a member's face |
| 267 | group:ateez | BV1-0154 BV1-0155 | not the group: a plush keychain toy on a bag, no member in the photo |
| 268 | group:ateez | BV1-0152 BV1-0153 | too small: stage seen from far, 8 members tiny under the lighting truss |
| 306 | group:blackpink | - | dark and soft concert capture with a fan watermark at the bottom; low light look |
| 172 | group:btob | BV1-0201 BV1-0202 BV1-0203 | part line 1 crosses a member's face (line 2 grazes another); the window spans the whole photo width |
| 174 | group:btob | BV1-0206 BV1-0207 BV1-0208 | professional photoshoot, but part line 2 crosses a member's face and the window spans the whole photo width |
| 312 | group:bts | BV1-0243 BV1-0244 | too small: stage seen from far, faces tiny |
| 314 | group:bts | BV1-0245 BV1-0246 | busy stage cluster with motion, the members overlap and the part line crosses a face at any focal point |
| 177 | group:day6 | BV1-0258 BV1-0259 BV1-0260 | part line 1 clips a member's profile and line 2 grazes another face; busy hands, the window spans the whole photo width |
| 178 | group:day6 | BV1-0261 BV1-0262 BV1-0263 | part line 1 crosses a member's face; the window spans the whole photo width |
| 179 | group:day6 | BV1-0255 BV1-0256 BV1-0257 | part lines 1 and 2 cross members' faces; the window spans the whole photo width |
| 182 | group:dreamcatcher | BV1-0298 BV1-0299 BV1-0300 | part line 1 crosses a member's face; the window spans the whole photo width |
| 183 | group:dreamcatcher | BV1-0301 BV1-0302 BV1-0303 | too small: concert stage seen from far, faces tiny |
| 408 | group:enhypen | BV1-0330 BV1-0331 | not the group: a photo of photocards and merchandise on a pegboard, with a hand; no member in person |
| 411 | group:enhypen | BV1-0324 BV1-0325 BV1-0326 | not a photo: phone screenshots of an app page, no member in it |
| 426 | group:exo | BV1-0380 BV1-0381 BV1-0382 | not viewed: the same Commons file is left out in photos.json for another subject by the lot 6 thumbnail check (minors rule, fail closed) |
| 428 | group:exo | BV1-0383 BV1-0384 BV1-0385 | part line 2 crosses a member's face; the window spans the whole photo width |
| 185 | group:fromis-9 | BV1-0394 BV1-0395 BV1-0396 | part line 2 crosses a member's face; the window spans the whole photo width |
| 186 | group:fromis-9 | BV1-0388 BV1-0389 BV1-0390 | part line 2 crosses a member's face; the window spans the whole photo width |
| 188 | group:fromis-9 | BV1-0391 BV1-0392 BV1-0393 | stage seen from far with small faces, and both part lines cross faces |
| 455 | group:girls-generation | BV1-0439 BV1-0440 | professional photoshoot, but the part line crosses a member's face at every focal point the window allows |
| 189 | group:ikon | BV1-0502 BV1-0503 BV1-0504 | part line 1 crosses a member's face; the window spans the whole photo width |
| 191 | group:ikon | BV1-0499 BV1-0500 BV1-0501 | part line 1 crosses a member's face; the window can move 1.5% at most, not enough |
| 194 | group:kara | BV1-0606 BV1-0607 BV1-0608 | part line 2 crosses a member's face; the window spans the whole photo width |
| 197 | group:kara | BV1-0601 BV1-0602 BV1-0603 | too small: festival stage seen from behind the crowd, members tiny |
| 198 | group:katseye | - | part line 2 crosses a member's face; the window spans the whole photo width |
| 199 | group:kiss-of-life | BV1-0636 BV1-0637 BV1-0638 | clearly visible fans behind the barrier, not named on Commons (minors rule), busy background |
| 200 | group:kiss-of-life | BV1-0648 BV1-0649 | part line crosses a member's face (zoomed); the window spans the whole photo width |
| 202 | group:kiss-of-life | BV1-0645 BV1-0646 BV1-0647 | part line 2 crosses a member's face; the window spans the whole photo width |
| 204 | group:kiss-of-life | BV1-0639 BV1-0640 BV1-0641 | part line 1 crosses a member's face; the window spans the whole photo width |
| 206 | group:loona | - | too small: concert stage seen from the crowd, twelve tiny members |
| 795 | group:mamamoo | - | not the group: one member alone fills the frame (another only as an edge), and the part line crosses her face |
| 210 | group:miss-a | BV1-0752 BV1-0753 BV1-0754 | part line 2 crosses a member's face (line 1 grazes another); the window spans the whole photo width |
| 856 | group:miss-a | BV1-0747 BV1-0748 | soft at card size: a blurry capture, each card cut from 283 px of the photo |
| 213 | group:monsta-x | BV1-0786 BV1-0787 BV1-0788 | low resolution video still: each card is cut from 314 px of the photo, soft at card size |
| 214 | group:monsta-x | BV1-0792 BV1-0793 | too small: arena stage seen from far, members tiny |
| 216 | group:monsta-x | BV1-0780 BV1-0781 BV1-0782 | concert seen from the crowd: members small and soft, audience heads in front |
| 217 | group:monsta-x | BV1-0783 BV1-0784 BV1-0785 | busy, soft stage capture (each card from 341 px), and part line 1 touches a member's face |
| 888 | group:nct-127 | BV1-0805 BV1-0806 BV1-0807 | parade float with clearly visible spectators (children among them) and a worker in front, none named on Commons (minors rule) |
| 889 | group:nct-127 | BV1-0794 BV1-0795 BV1-0796 | part line 2 crosses a member's face; the window spans the whole photo width |
| 892 | group:nct-127 | BV1-0803 BV1-0804 | not the group: one member alone, and the part line crosses his face |
| 893 | group:nct-127 | BV1-0797 BV1-0798 BV1-0799 | part line 2 crosses a member's face; the window spans the whole photo width |
| 894 | group:nct-dream | BV1-0817 BV1-0818 BV1-0819 | radio studio: the guest DJ is clearly visible (named on Commons, but no verified age in the project's data), and the members sit behind desks and equipment (cluttered) |
| 898 | group:nct-dream | BV1-0808 BV1-0809 BV1-0810 | same occasion as photo 897 of the same subject (Melon Music Awards 2023 red carpet, same day; lot 3 rule: one edition, one occasion) |
| 913 | group:nmixx | BV1-0899 BV1-0900 BV1-0901 | concert stage seen from the audience: members small and soft |
| 914 | group:nmixx | BV1-0902 BV1-0903 | not the group: one member close-up (another half hidden), and the part line crosses her face |
| 915 | group:nmixx | BV1-0896 BV1-0897 BV1-0898 | concert hall wide shot: the screen and the audience, the members are not visible |
| 916 | group:nmixx | BV1-0893 BV1-0894 BV1-0895 | concert seen from the audience: members small, audience heads in front |
| 945 | group:riize | BV1-0949 BV1-0950 BV1-0951 | part line 1 crosses a member's face; the window spans the whole photo width |
| 948 | group:riize | BV1-0946 BV1-0947 BV1-0948 | not a photo of the group: a show logo graphic (BOSS RIIZE), no member in it |
| 1031 | group:shinee | BV1-1047 BV1-1048 BV1-1049 | not the group: two members pressed together, one face hidden by a hand, and a part line crosses a face |
| 1032 | group:shinee | BV1-1045 BV1-1046 | not the group: one member alone, and the part line crosses his face |
| 1033 | group:shinee | BV1-1050 BV1-1051 | not the group: one member alone (a magazine photoshoot) on a group photo |
| 229 | group:sistar | BV1-1064 BV1-1065 BV1-1066 | too small: arena stage, the members fill a small part of the window with tiny faces |
| 231 | group:sistar | BV1-1054 BV1-1055 | fan site watermark printed on the photo, soft stage light |
| 232 | group:sistar | BV1-1052 BV1-1053 | members small at full length, an out of focus head and camera in the foreground |
| 1050 | group:sistar | BV1-1061 BV1-1062 BV1-1063 | two members seen from below, a third cut at the edge, faces turned; not a group shot |
| 235 | group:stayc | - | part line 1 crosses a member's face; the window spans the whole photo width |
| 1082 | group:stray-kids | - | not the group: one member alone, and the part line crosses his face |
| 1148 | group:team | BV1-0037 BV1-0038 | not the group: two members at a fan sign table with a staff member standing behind them |
| 1153 | group:team | BV1-0034 BV1-0035 BV1-0036 | too small: nine members at full length on an event stage, tiny faces, soft |
| 1172 | group:treasure | BV1-1130 BV1-1131 BV1-1132 | not the group: a photo of a temple building, no member in it |
| 1175 | group:treasure | BV1-1122 BV1-1123 BV1-1124 | not the group: a photo of a carved religious artefact, no member in it |
| 1176 | group:treasure | BV1-1133 BV1-1134 BV1-1135 | cluttered radio studio, members behind desks and microphones, and part line 1 crosses a member's face |
| 1179 | group:twice | - | arena seen from the stands: members tiny, a screen image instead |
| 1183 | group:txt | BV1-1229 BV1-1230 | not the group: a mobile phone on a table, no member in it |
| 1184 | group:txt | BV1-1226 BV1-1227 BV1-1228 | not the group: an airliner on a runway, no member in it |
| 1185 | group:txt | BV1-1231 BV1-1232 BV1-1233 | not the group: a car licence plate reading DONT TXT, no member in it |
| 1186 | group:txt | BV1-1223 BV1-1224 BV1-1225 | not the group: a motorcycle on display, no member in it |
| 1187 | group:txt | BV1-1220 BV1-1221 BV1-1222 | red carpet photo, but part line 2 crosses a member's face; the window spans the whole photo width |
| 1188 | group:txt | BV1-1217 BV1-1218 BV1-1219 | not the group: an airliner in flight, no member in it |
| 1201 | group:viviz | BV1-1236 BV1-1237 | the members are seen from behind, no face visible |
| 1202 | group:viviz | BV1-1234 BV1-1235 | the members are seen from behind in the dark, no face visible |
| 239 | group:winner | BV1-1241 BV1-1242 BV1-1243 | awards show seats: other attendees clearly visible behind the members, not named on Commons (minors rule) |
| 243 | group:winner | BV1-1238 BV1-1239 BV1-1240 | magazine photoshoot, but part line 2 crosses a member's face; the window spans the whole photo width |
| 258 | idol:ahyeon-babymonster | BV1-0156 | another member's face is clearly visible in the card and not named on Commons (minors rule) |
| 264 | idol:asa-babymonster | BV1-0158 | airport crowd: masked staff and photographers clearly visible behind her, not named on Commons (minors rule) |
| 282 | idol:bambam-got7 | BV1-0445 | soft video still with a strong green cast |
| 289 | idol:bang-chan-stray-kids | BV1-1068 | tight soft frame: the top of the head is cut and no focal point can bring it back (the window already spans the full height) |
| 295 | idol:beomgyu-txt | BV1-1195 | soft low resolution candid (414 px wide window) |
| 323 | idol:chaeryeong-itzy | BV1-0518 | same occasion as photo 322 of the same subject (same day, same outing; lot 3 rule: one edition, one occasion) |
| 325 | idol:chaewon-le-sserafim | BV1-0653 | another person's face is large and clear in the card (on the stage screen) and not named on Commons (minors rule) |
| 331 | idol:chaeyoung-twice | BV1-1137 | stage seen from far in the dark, the subject tiny |
| 333 | idol:chaeyoung-twice | BV1-1139 | face turned away and hidden by hands and hair |
| 364 | idol:daesung-bigbang | - | two men side by side (Commons names Seungri and Daesung) and the card cuts one of them in half: the subject is not clearly the main person |
| 368 | idol:dahyun-twice | BV1-1146 | stage seen from far in a spotlight, the subject small in the card with a tiny face |
| 370 | idol:dahyun-twice | BV1-1143 | a piano on a dark stage, the subject barely visible |
| 373 | idol:dahyun-twice | BV1-1145 | the subject is small behind the backs of people in the foreground: not clearly the main person |
| 379 | idol:daniela-katseye | BV1-0614 | crowded stage: other performers clearly visible next to her, not named individually on Commons (minors rule) |
| 385 | idol:dino-seventeen | BV1-0955 | dance video still: another dancer clearly visible behind him, not named on Commons (minors rule) |
| 388 | idol:dk-seventeen | BV1-0962 | another performer clearly visible beside him in the card, not named individually on Commons (minors rule); not clearly the main person |
| 390 | idol:dk-seventeen | BV1-0961 | high school graduation ceremony: other students in the frame, not named on Commons (minors rule, fail closed) |
| 401 | idol:doyoung-nct | BV1-0820 | profile half hidden by out-of-focus light bulbs, soft |
| 406 | idol:ej-team | BV1-0025 | two members side by side at an airport, the card shows both: the subject is not clearly the main person |
| 414 | idol:eunchae-le-sserafim | BV1-0658 | concert stage with another member clearly visible in the card, not named individually on Commons (minors rule); the subject small |
| 420 | idol:eunwoo-astro | BV1-0105 | full length on a staircase with a small face, and another man standing in the photo, not named on Commons |
| 438 | idol:g-dragon-bigbang | BV1-0174 | not a photo of the subject: an album cover graphic (peace sign and title), no person |
| 439 | idol:g-dragon-bigbang | BV1-0173 | not a photo of the subject: an album cover graphic, no person |
| 440 | idol:g-dragon-bigbang | BV1-0171 | seen from behind, the face not visible |
| 441 | idol:g-dragon-bigbang | BV1-0170 | not a photo of the subject: a white mask sculpture (album artwork) |
| 446 | idol:gaeul-ive | BV1-0557 | fan concert photo with phone silhouettes in front, subject small (published files are also rotated) |
| 447 | idol:gaeul-ive | BV1-0553 | fan concert photo with dark phone silhouettes in the foreground (published files are also rotated) |
| 454 | idol:gahyun-dreamcatcher | BV1-0269 | two other members clearly visible beside her in the card, not named individually on Commons (minors rule) |
| 502 | idol:haseul-loona | BV1-0687 | two members side by side at full length, the card shows both: the subject is not clearly the main person |
| 503 | idol:haseul-loona | BV1-0690 | fan sign with the back of a fan's head and hat filling the foreground (cluttered) |
| 511 | idol:hongjoong-ateez | BV1-0118 | dark green-lit fan concert photo, subject small, a lamp in the foreground |
| 514 | idol:hoshi-seventeen | BV1-0967 | festival stage behind blurred audience heads, the subject small |
| 515 | idol:hoshi-seventeen | BV1-0963 | three named members side by side, the card cuts the two others: the subject is not clearly the main person |
| 517 | idol:hoshi-seventeen | BV1-0965 | three named members side by side, the card cuts the two others: the subject is not clearly the main person |
| 519 | idol:hoshi-seventeen | BV1-0964 | another performer clearly visible beside him, not named on Commons (minors rule) |
| 525 | idol:hyoyeon-girls-generation | BV1-0397 | same occasion as photo 528 of the same subject (same day, same set; lot 3 rule: one edition, one occasion), other people at the card edges |
| 526 | idol:hyoyeon-girls-generation | BV1-0401 | same occasion as photo 528 of the same subject (same day, same set; lot 3 rule: one edition, one occasion), and face turned down |
| 527 | idol:hyoyeon-girls-generation | BV1-0400 | same occasion as photo 528 of the same subject (same day, same set; lot 3 rule: one edition, one occasion) |
| 531 | idol:hyungwon-monsta-x | BV1-0759 | two named members side by side, the card shows both: the subject is not clearly the main person |
| 552 | idol:i-m-monsta-x | BV1-0764 | two named members side by side, the card shows both: the subject is not clearly the main person |
| 553 | idol:i-m-monsta-x | BV1-0762 | stage photo from below, face tilted up and away, subject small in the card |
| 562 | idol:irene-red-velvet | BV1-0913 | stage at full length from the crowd, face small, fans' phones and hands in the foreground |
| 565 | idol:irene-red-velvet | BV1-0915 | arena stage seen from far, the subject tiny with fans' hands in front |
| 580 | idol:jackson-got7 | BV1-0453 | KCON final stage (curtain call): other performers clearly visible around him, soft low light (same case as the integrator's KCON example) |
| 581 | idol:jackson-got7 | BV1-0455 | arena light show seen from far, the subject not visible |
| 582 | idol:jackson-got7 | BV1-0454 | an out-of-focus face of another person fills the left of the card (not named on Commons), low light |
| 583 | idol:jackson-got7 | BV1-0451 | dark stage, face turned down, other people at the bottom of the card not named on Commons |
| 597 | idol:jay-b-got7 | BV1-0460 | concert stage with another member clearly visible against him, fans' hands in front, subject small |
| 100 | idol:jay-park | BV1-0587 | sunglasses and cap, subject small at the edge of a dark stage |
| 603 | idol:jeonghan-seventeen | BV1-0974 | festival stage seen from the crowd with a fan's raised hand and finger filling the card, the subject tiny |
| 613 | idol:jeongyeon-twice | BV1-1149 | same occasion as photo 612 of the same subject (TWICE debut showcase, same outfit and pose; lot 3 rule: one edition, one occasion) |
| 627 | idol:jin-bts | BV1-0224 | arena stage seen from far, the subject tiny |
| 630 | idol:jinsoul-loona | BV1-0703 | soft stage video still: the face is cut by the top of the card, and at 50/0 another performer's face shows behind her |
| 633 | idol:jinsoul-loona | BV1-0701 | two members side by side (the other one not named on Commons) at full length: not clearly the main person |
| 641 | idol:jisoo-blackpink | BV1-0187 | concert seen from far, the subject small and soft in a spotlight |
| 643 | idol:jisoo-blackpink | BV1-0188 | fan concert photo: subject small at full length with a mascot mask held at her face (published files are also rotated) |
| 646 | idol:jiu-dreamcatcher | BV1-0278 | strong green-yellow light cast, soft stage photo |
| 649 | idol:jiu-dreamcatcher | BV1-0275 | another member clearly visible beside her in the card, not named on Commons (minors rule) |
| 658 | idol:jiwoong-zerobaseone | BV1-1252 | low resolution: the card is cut from a 248 px wide window (under the 280 px floor), soft at card size |
| 674 | idol:joohoney-monsta-x | BV1-0768 | soft fan sign photo with a green cast, face turned down |
| 675 | idol:joshua-seventeen | BV1-0979 | stage seen from far with other performers, the subject small |
| 676 | idol:joshua-seventeen | BV1-0980 | another member's face clearly visible behind his shoulder in the card, not named on Commons (minors rule) |
| 677 | idol:joshua-seventeen | BV1-0978 | lying down video still: the card shows only part of a sideways face (eyes cut), no focal point fixes it in a vertical card |
| 681 | idol:joy-red-velvet | BV1-0917 | concert seen from the crowd: subject small in a spotlight, dark audience silhouettes in front |
| 689 | idol:jun-seventeen | BV1-0983 | soft video still with a burned-in caption beside his face |
| 692 | idol:jun-seventeen | BV1-0982 | dance video still: face half hidden by his hands and other dancers' hands around him |
| 695 | idol:jungwon-enhypen | BV1-0310 | not a photo of the subject: his autograph on paper, no person |
| 705 | idol:k-team | BV1-0031 | wrong subject: a 1998 polo team (Commons names other people), not K of &TEAM |
| 706 | idol:k-team | BV1-0029 | wrong subject: a museum credits board, no person |
| 707 | idol:k-team | BV1-0028 | wrong subject: two cosplayers at a convention (not named), not K of &TEAM |
| 708 | idol:k-team | BV1-0026 | wrong subject: a professional cycling team in training, not K of &TEAM |
| 709 | idol:k-team | BV1-0027 | wrong subject: a navy parachute team at night, not K of &TEAM |
| 723 | idol:kazuha-le-sserafim | BV1-0660 | black and white action shot, face turned away and blurred by motion |
| 727 | idol:kazuha-le-sserafim | BV1-0662 | face half covered by a mask |
| 735 | idol:key-shinee | BV1-1026 | KCON16LA curtain call: other performers clearly visible, not named on Commons (integrator's example, minors rule) |
| 736 | idol:key-shinee | BV1-1027 | two named members side by side with heads down, audience heads in the foreground: the subject is not clearly the main person |
| 740 | idol:key-shinee | BV1-1023 | fans clearly visible around him, not named on Commons (minors rule) |
| 741 | idol:kihyun-monsta-x | BV1-0775 | another member clearly visible beside him (not named on Commons) and fans' phones in the corner (minors rule) |
| 747 | idol:kim-lip-loona | BV1-0705 | not a photo: a social media screenshot of two video stills, the card cuts a face in half |
| 754 | idol:lara-katseye | BV1-0615 | a group photo of the members, the card shows two of them: the subject is not clearly the main person |
| 757 | idol:lay-exo | BV1-0360 | another performer's face clearly visible behind him in the card, not named on Commons (minors rule) |
| 774 | idol:lia-itzy | BV1-0528 | wrong subject in the card: a street alley in Macau, no person visible |
| 786 | idol:liz-ive | BV1-0567 | fan concert photo from the crowd, subject small at full length (published files are also rotated) |
| 787 | idol:liz-ive | BV1-0566 | fan concert photo with a phone silhouette in front of her, same concert as 788 (published files are also rotated) |
| 788 | idol:liz-ive | BV1-0565 | fan concert photo with hand silhouettes in front, same concert as 786 and 787 (published files are also rotated) |
| 801 | idol:manon-katseye | BV1-0620 | same occasion as photo 802 (same outfit, one day apart; lot 3 rule: one edition, one occasion), and a spectator's face behind her shoulder |
| 809 | idol:mark-nct | BV1-0855 | group ceremony photo: the card shows only hands and a shirt (no face), and the other members around him are not all named on Commons |
| 817 | idol:megan-katseye | BV1-0621 | same occasion as photo 816 (same outfit and place, one day apart; lot 3 rule: one edition, one occasion), a wink |
| 820 | idol:mina-twice | BV1-1162 | KCON fan engagement: fans and other people clearly visible around her, not named on Commons (minors rule) |
| 823 | idol:mina-twice | BV1-1161 | concert at full length seen from far, the face too small (under 1/12 of the card height) |
| 826 | idol:mingi-ateez | BV1-0125 | dark concert seen from far, the subject small in a spotlight |
| 827 | idol:mingi-ateez | BV1-0123 | low resolution: the card is cut from a 150 px wide window (under the 280 px floor), soft at card size |
| 830 | idol:mingyu-seventeen | BV1-0992 | festival stage at full length seen from the side, the face too small |
| 837 | idol:minho-shinee | BV1-1030 | stage photo with the face covered by his hand |
| 839 | idol:minho-shinee | BV1-1032 | KCON stage with other performers clearly visible behind him (faces cut or turned), not named on Commons (minors rule) |
| 866 | idol:mj-astro | BV1-0112 | wrong subject: Commons names a stock market analyst (Mahesh Jalan), not MJ of ASTRO (published files are also rotated) |
| 872 | idol:momo-twice | BV1-1166 | black and white stage shot: the subject high on a pole, face small, dancers in the card not named on Commons |
| 879 | idol:moonbyul-mamamoo | BV1-0730 | backup dancers clearly visible behind her, not named on Commons (minors rule) |
| 880 | idol:moonbyul-mamamoo | BV1-0729 | outdoor stage seen from below, the face turned away and small, a musician cut at the edge |
| 883 | idol:nayeon-twice | BV1-1176 | KCON fan event: staff and a cameraman clearly visible in the card, audience heads in the foreground, not named on Commons (minors rule) |
| 903 | idol:nicholas-team | BV1-0033 | wrong subject: Commons describes US Navy officers meeting a NASCAR racer, not Nicholas of &TEAM |
| 922 | idol:onew-shinee | BV1-1034 | stage photo with the face turned down, a soft busy capture |
| 927 | idol:onew-shinee | BV1-1037 | concert photo with the face turned down and away, a blurred head in the foreground |
| 937 | idol:rei-ive | BV1-0573 | fan concert photo: the face is under 1/12 of the card height, audience heads in front (published files are also rotated) |
| 955 | idol:rora-babymonster | BV1-0162 | another member's face clearly visible behind her in the card at any focal point, not named on Commons (minors rule) |
| 971 | idol:sakura-le-sserafim | BV1-0669 | three other members clearly visible beside her in the card, not named on Commons (no category) (minors rule) |
| 976 | idol:sakura-le-sserafim | BV1-0665 | same occasion as photo 973 of the same subject (same day, same outfit and place; lot 3 rule: one edition, one occasion) |
| 977 | idol:san-ateez | BV1-0132 | fashion show crowd: photographers and guests clearly visible around him, not named on Commons (minors rule) |
| 978 | idol:san-ateez | BV1-0130 | face covered by his hand, bodyguards and photographers clearly visible, not named on Commons (minors rule) |
| 981 | idol:san-ateez | BV1-0129 | another person's face clearly visible at the bottom left of the card (awards show), not named on Commons (minors rule) |
| 1000 | idol:seohyun-girls-generation | BV1-0404 | two named members side by side, the card shows both: the subject is not clearly the main person |
| 1005 | idol:seonghwa-ateez | BV1-0134 | dark fan concert photo at full length, the face about 1/11 of the card height, blurred hands in the corner |
| 1006 | idol:seonghwa-ateez | BV1-0135 | soft dark concert capture, the face blurred |
| 1009 | idol:seulgi-red-velvet | BV1-0924 | fan concert photo at full length, a stage monitor in front, the face small: amateur and cluttered |
| 1010 | idol:seulgi-red-velvet | BV1-0923 | concert seen from the crowd, the subject small, a phone and hands in the foreground |
| 1025 | idol:seungmin-stray-kids | BV1-1105 | same occasion as photo 1021 of the same subject (Chanel event, same day and outfit; lot 3 rule: one edition, one occasion) |
| 1039 | idol:shownu-monsta-x | BV1-0778 | not viewed: the same Commons file is left out in photos.json for another subject by the lot 6 thumbnail check (minors rule, fail closed) |
| 1040 | idol:shownu-monsta-x | BV1-0779 | dark scene with sunglasses, another person clearly visible next to him, not named on Commons (minors rule) |
| 1053 | idol:siyeon-dreamcatcher | BV1-0283 | another member's face clearly visible beside her in the card, not named on Commons (minors rule) |
| 1073 | idol:sooyoung-girls-generation | BV1-0407 | profile at full length under a heavy orange cast, the face small and turned away |
| 1081 | idol:soyeon-g-i-dle | BV1-0013 | airport crowd: another person's face clearly visible at the left edge of the card, not named on Commons (minors rule) |
| 1088 | idol:sua-dreamcatcher | BV1-0289 | same occasion as photo 1089 of the same subject (same fan meeting, same moment; lot 3 rule: one edition, one occasion) |
| 1090 | idol:sua-dreamcatcher | BV1-0288 | fan sign: another person's face clearly visible at the left edge of the card, not named on Commons (minors rule) |
| 1103 | idol:suho-exo | BV1-0369 | crowd behind him with another man's face clearly visible in the card, not named on Commons (minors rule) |
| 1108 | idol:suhyun-akmu | BV1-0072 | same occasion as photo 1106 of the same subject (JTBC Super Band event, same day and outfit; lot 3 rule: one edition, one occasion) |
| 1109 | idol:suhyun-akmu | BV1-0071 | same occasion as photo 1107 of the same subject (Golden Disc Awards, same day and outfit; lot 3 rule: one edition, one occasion) |
| 1112 | idol:sunghoon-enhypen | BV1-0316 | radio booth with a face mask over half the face, a microphone in front |
| 1119 | idol:sunny-girls-generation | BV1-0414 | same occasion as photo 1120 of the same subject (Party showcase, same day and outfit; lot 3 rule: one edition, one occasion) |
| 1131 | idol:taeil-nct | BV1-0860 | low resolution: the card is cut from a 258 px wide window (under the 280 px floor), soft at card size |
| 141 | idol:taeyang | BV1-0178 | the same picture as photo 1139 (a crop of the same Commons file of the MADE premiere; lot 3 rule: one edition, one occasion), 1139 is kept for its larger window |
| 1140 | idol:taeyang | BV1-0175 | not a photo of the subject: an album cover logo (RISE), no person |
| 1141 | idol:taeyang | BV1-0177 | not a photo of the subject: an album cover graphic (a coin with a profile) |
| 1143 | idol:taeyong-nct | BV1-0869 | stage profile with another member's face cut at the left edge of the card (not named on Commons), hair over the eyes |
| 1145 | idol:taeyong-nct | BV1-0868 | signing a football with the face turned down, a staff member's arm and shoulder at the top |
| 1156 | idol:ten-nct | BV1-0875 | radio video still with a microphone cable across his chest, soft |
| 1160 | idol:the8-seventeen | BV1-1003 | festival stage: another member's face clearly visible below him in the card (named on Commons, but the card is not about him), arm cut |
| 1166 | idol:tiffany-girls-generation | BV1-0426 | seated event photo with the face turned down, other people's legs and bodies around her (not named on Commons), warm cast |
| 1168 | idol:tiffany-girls-generation | BV1-0425 | close-up with the face turned down, hair over the eyes |
| 1190 | idol:tzuyu-twice | BV1-1184 | not a photo of the subject: a rice ball package held in a hand, her printed face on the label |
| 1191 | idol:tzuyu-twice | BV1-1182 | not a photo of the subject: a station concourse with advertising posters (published files are also rotated) |
| 1192 | idol:tzuyu-twice | BV1-1181 | concert seen from far, the subject tiny under a hat |
| 1195 | idol:vernon-seventeen | BV1-1010 | festival stage cluster: three other members around him (not named individually on Commons), not clearly the main person |
| 1196 | idol:vernon-seventeen | BV1-1009 | washed out stage at full length, the face small and blown out by the light |
| 1198 | idol:vernon-seventeen | BV1-1006 | profile with the people behind clearly visible on both sides (not named on Commons), a hand at his shoulder (minors rule) |
| 1200 | idol:vernon-seventeen | BV1-1005 | concept photo with the face half in shadow and cut at the top, mostly the shirt |
| 1203 | idol:wendy-red-velvet | BV1-0926 | fan concert photo at full length with audience heads in front, the face small (published files are also rotated) |
| 1205 | idol:wendy-red-velvet | BV1-0930 | concert seen from far: the subject is small on a large dark stage, face about 1/20 of the card height |
| 1206 | idol:wendy-red-velvet | BV1-0929 | concert seen from far, same moment as 1205: the subject small, face about 1/20 of the card height |
| 1209 | idol:wheein-mamamoo | BV1-0742 | concert stage with two dancers beside her, not named on Commons (minors rule); faces small |
| 1212 | idol:wheein-mamamoo | BV1-0744 | face covered by her hand, a fan site watermark |
| 1220 | idol:winter-aespa | BV1-0063 | same concert and day as photo 1215 (lot 3 rule: one edition, one occasion), and a backup dancer's face clearly visible behind her, not named on Commons |
| 1225 | idol:wonhee-illit | BV1-0513 | same occasion as photo 1224 of the same subject (the same Chanel photo call; lot 3 rule: one edition, one occasion) |
| 1226 | idol:wonhee-illit | BV1-0512 | airport crowd: people with phones clearly visible behind her, not named on Commons (minors rule) |
| 1228 | idol:wonwoo-seventeen | BV1-1012 | festival stage with another member clearly visible beside him in the card (not named on Commons), same festival as 1229 |
| 1229 | idol:wonwoo-seventeen | BV1-1015 | festival stage with two other members clearly visible in the card (not named on Commons), the subject small |
| 1240 | idol:wooyoung-ateez | BV1-0137 | dark fan concert photo at full length, the face small |
| 1241 | idol:wooyoung-ateez | BV1-0139 | concert at full length under a heavy red light, the face small (about 1/14 of the card height) |
| 1248 | idol:woozi-seventeen | BV1-1020 | magazine video still cropped too tight: the card shows half a face (one eye), no focal point shows it whole |
| 1255 | idol:xiumin-exo | BV1-0375 | another performer's face clearly visible behind him in the card, not named on Commons (minors rule) |
| 1264 | idol:yeojin-loona | - | seated far on a stage in a light beam, the face about 1/14 of the card height (published files are also rotated) |
| 1266 | idol:yeonjun-txt | BV1-1215 | not a photo of the subject: a packaged pair of shorts (merchandise), no person |
| 1271 | idol:yeosang-ateez | BV1-0141 | concert stage with backup dancers clearly visible around him, not named on Commons (minors rule) |
| 1276 | idol:yeri-red-velvet | BV1-0935 | concert seen from the crowd: audience heads in the foreground, the subject at full length with a small face |
| 1279 | idol:yeri-red-velvet | BV1-0932 | another member's face clearly visible behind her in the card, not named on Commons (minors rule) |
| 1281 | idol:yeri-red-velvet | BV1-0931 | another member clearly visible at the left of the card (face cut by the frame), not named on Commons |
| 1284 | idol:yoohyeon-dreamcatcher | BV1-0294 | two other members clearly visible beside her in the card, not named on Commons (minors rule) |
| 1286 | idol:yoohyeon-dreamcatcher | BV1-0295 | profile with the face hidden by hair, soft |
| 1290 | idol:yoona-girls-generation | BV1-0430 | same occasion as photo 1289 of the same subject (the same pop-up opening, same day and outfit; lot 3 rule: one edition, one occasion) |
| 1297 | idol:youngjae-got7 | BV1-0473 | same occasion as photo 1298 of the same subject (the same Dive Studios session; lot 3 rule: one edition, one occasion), an awkward expression |
| 1303 | idol:yugyeom-got7 | BV1-0483 | airport: another person's face (glasses) clearly visible behind him in the card at every focal point, not named on Commons (minors rule) |
| 1308 | idol:yuha-hearts2hearts | BV1-0488 | stage photo: another member's face partly visible behind her at every focal point, not named on Commons (minors rule), fan site watermark |
| 1310 | idol:yujin-ive | BV1-0581 | fan concert photo at full length, the face small, audience silhouettes in front (published files are also rotated) |
| 1327 | idol:yunho-ateez | BV1-0149 | concert jump with a backup dancer below him, not named on Commons (minors rule), audience lights in front |
| 1335 | idol:yunjin-le-sserafim | BV1-0673 | another person (masked) clearly visible behind her at the left of the card, not named on Commons (minors rule) |
| 1340 | idol:yuqi-g-i-dle | BV1-0019 | airport candid pointing at the camera, face half hidden by a beanie, glasses and her hand |
| 1347 | idol:yuri-girls-generation | BV1-0435 | outdoor candid with another person clearly visible behind her in the card, not named on Commons (minors rule) |
| 1349 | idol:yuri-girls-generation | BV1-0434 | a man's face clearly visible behind her in the card (a guard), not named on Commons (minors rule) |
| 1356 | idol:yves-loona | BV1-0716 | black and white stage move, bent backwards: no face visible in the card |

## What 119-photocheck.sql does

One DO block, one unit per subject (216). A unit is applied only when every row it reads is still the one of the export (status and focal point of its photos, photo and in_packs of its cards, photo of its panoramas, lock reasons); else it is left alone with a notice. Order inside a unit: the cards first (new photo_id, small_2x of the new photo by the rule of 118, in_packs as the trigger cards_photos_ready computes it; a dropped card: photo_id null, in_packs false), then the panoramas, then the photos (REPLACE: status rejected and a review note; a chosen pending photo: approved; RECROP: focal_x / focal_y, or file_focal cleared), then the lock reason "photo" of each dropped edition. The triggers of 002 and 103 then find no card to change. What a unit changed is kept in cards_photocheck_log (RLS on, service_role only): a second run says "already applied" and changes nothing; the rollback gives every row back and drops the table. Checks after the writes (a card in the packs on a photo that is not live, a card in the packs with no photo, a photo on two editions, a card on a photo of another subject, a panorama that does not follow its cards) roll the whole file back. Refused between 23:50 and 00:30 UTC and without 118. No XP, level, streak or badge is read or written; cards_owned is not touched. After it: run the publish workflow (it cuts the 3 approved photos, the 10 new focal points and the 10 files cleared).

Proofs: src/lib/cards/photocheck-sql.test.ts on PGlite (the rule; the file runs; numbers and owned copies kept; the best ranked photo on the rarest edition kept; a second run changes nothing; a changed subject is left alone; the time window; the rollback), and the committed file on the rows of the export (every Verify line answers what it expects, idempotent, the rollback gives the export back; runs only where the export is).
