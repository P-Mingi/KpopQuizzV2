# KpopCards lot 7: group photos in 2 or 3 cards, and the panorama (report, ORCH, 2026-11-17)

Owner's request: on a group photo, every member shown must be in the cards; a pair that cuts someone becomes 3 cards; a player who holds
every part of a photo (3/3, and 2/2: the integrator's choice) gets, once, the whole landscape picture of that photo as a bonus card, the
panorama. Spec of the lanes: `LOT7-CONTRACT.md`. Owner's steps: `OWNER-LOT7.md`.

## The default rule (parts-rule.ts)

1. **The smallest window that keeps everyone.** 2 cards (window 11 x 8.5) when that window keeps every head of the people the photo shows
   whole, at its focal point or once the focal point moves as little as needed; else 3 cards (16.5 x 8.5) when that one does; else the
   photo goes to "To review" with 3 cards proposed (the owner decides in the admin). "Keeps a head": the head with a margin of half a head
   on the sides, a quarter above, half below the chin.
2. **The heads come from the thumbnail circuit, with lot 6's limits.**
   - 400 px Commons thumbnails, one request a second, the lot's User-Agent, in a private folder (mode 700) deleted once the verdicts were
     written.
   - Never a subject of CORTIS, Hearts2Hearts or BABYMONSTER, never a locked subject, never WayV or GFRIEND. Every photo had already passed
     the age rule on its date.
   - A thumbnail that seemed to show a person under 18 put its photo out and was deleted at once, with no further look.
   - The checkers counted heads on a 10 % grid and never identified anyone.
   - A second look checked every window the geometry placed, drawn on the thumbnail.
3. **Without a usable thumbnail, the ratio decides.** A photo no wider than 11 x 8.5 loses nothing on its sides in 2 cards. One no wider
   than 16.5 x 8.5 loses nothing in 3. A wider one waits for the owner.

## The group photos

The repository holds 255 group photos that can become cards: lots 3 and 6, every photo not out, 95 and 160. The integrator's 157 is a
subset I could not rebuild from the repository (the live group photos are 129 there, 144 with 116c). 118 applies each verdict by Commons
page, so whatever production holds gets its value, and the notice counts the pages it does not have.

| | Photos |
| --- | --- |
| 2 cards | 81 |
| 3 cards | 117 |
| To review (someone would be cut even in 3) | 37: 22 wider than 16.5 x 8.5 with the lineup across, 13 with heads at too many heights for the 16.5 x 8.5 window, 2 without a usable thumbnail and wider than 16.5 x 8.5 |
| Rejected (the thumbnail seemed to show a person under 18) | 20 |
| Focal point moved so the window keeps everyone | 90 |
| Decided by the ratio (no usable thumbnail) | 35 |
| Second look overruled the geometry (2 that cut someone became 3) | 3 |

Per photo: `docs/design/cards/data/lot7/parts.json` (geometry and the rule's line only) and `SUMMARY.md`.

## Cards and panoramas (the edition rule of the catalog on the repository data; pairs and thirds counted as cards)

| Case | Cards before lot 7 | After | Group photos in 2 / in 3 | Panoramas |
| --- | --- | --- | --- | --- |
| Auto photos only | 980 | 993 | 24 / 61 | 85 |
| With 116c | 1,188 | 1,188 | 26 / 66 | 92 |
| Every pending photo approved | 1,526 | 1,630 | 79 / 146 | 225 |

The model gives back lot 6's 980 and 1,188 exactly before lot 7. Groups that leave the packs (fewer than 2 live photos after the
rejections and the "To review"): DAY6, PENTAGON and STAYC with the auto photos only; GOT7 and ITZY too with 116c; NCT WISH, STAYC,
ZEROBASEONE and NewJeans when every pending photo is approved (rejections only). The real counts are the rebuild's message.

## What changed

- **SQL 118** (`118-group-parts.sql`, 147 KB, ONE DO block, 13 Verify lines, rollback, md5 guards on the four functions it replaces):
  the parts of a photo, the panorama tables, the catalog rule for 3 parts (consecutive numbers, 2x and Full Art per part, the missing part
  rule), the panorama given once in the transaction of the open or the craft that completes the set, the data of the 255 photos. It
  refuses once a pack, a card or a panorama is owned.
- **Server**: the catalog payload (parts 1 to 3, `-t` files, panoramas with their picture), the player's panoramas in the state, the open
  and craft answers, the admin action `parts` and its warning (`keepsEveryone` at the current focal point).
- **Pages** (v6 system): "1/3" on a part, the landscape panorama card, its pocket under its parts, the Panoramas section with its own
  completion (never counted in the card totals), the large view, a reveal of its own after the card or the craft that completes a set,
  the admin's choice 2 or 3 with the preview of the parts and of the panorama. Screenshots: `docs/o1/evidence/cards/lot7/`.
- **Owner's script**: thirds and panoramas cut and uploaded (2x per the 640 px rule), one PATCH with the file columns; the files of a
  photo that stays in 2 stay valid and only gain its `-p2` panorama.
- **ALL-verify**: knows the parts of a group photo, so `TOUT_OK` stays true after 118 and the rebuild (the owner's script needs it).

## Checks and notes

- Full unit suite under Node 22 (620 files, 11,449 tests) and `tsc --noEmit`: green. No em or en dash in the diff.
- `ALL-099-115.sql` and `ALL-rollback.sql` are byte for byte those of main; `ALL-verify.sql` answers TOUT_OK after the bundle, 116, 117,
  118 and each rebuild, and on a database without 118.
- The admin's disabled main button now reads dark on light grey on every admin page (it was faded to about 2.6:1).
- The fixture's panoramas and its photo in 3 cards show only with `CARDS_UI_FIXTURE_PANO=1` (the QA harness keeps comparing the
  prototype's card numbers box by box).
- Not changed: a locked group edition still shows "1/2, 2/2" pockets (the size of a photo that does not exist yet is unknown).
