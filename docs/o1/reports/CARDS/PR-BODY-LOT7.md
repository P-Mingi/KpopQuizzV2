## What this PR does

Builds on #233, whose head is merged in here: until #233 is merged into main, this diff also shows its commits.

KpopCards lot 7 (owner, 2026-11-17): a group photo gives 2 OR 3 cards, the smallest window that keeps everyone, and a player who holds
every part of a photo (2/2 or 3/3) gets, once, the whole landscape picture as a panorama. Report: `docs/o1/reports/CARDS/LOT7-PANORAMA.md`;
the owner's page: `docs/o1/reports/CARDS/OWNER-LOT7.md`; the lanes' spec: `LOT7-CONTRACT.md`.

1. **The rule** (`lib/cards/parts-rule.ts`, geometry in `scripts/cards/card-geometry.mjs`): 2 cards (11 x 8.5) when that window keeps
   every head, else 3 cards (16.5 x 8.5), else "To review" with 3 proposed; without a usable thumbnail, the ratio of the photo. On the 255
   group photos of lots 3 and 6 (thumbnails checked with lot 6's limits, geometry only, deleted once read): 81 in 2, 117 in 3, 37 to
   review, 20 rejected (the thumbnail seemed to show a person under 18). Data: `docs/design/cards/data/lot7/parts.json`.
2. **SQL 118** (`docs/pending-migrations/cards/118-group-parts.sql`, 147 KB, ONE DO block, 13 Verify lines, rollback): the parts columns
   of `cards_photos`, the part check 0 to 3, `cards_panoramas` (P-0001 and up, one per group edition, the edition of its parts),
   `cards_panoramas_owned`, `cards_parts_log`; `cards_build_catalog` and `cards_catalog_append` (3 parts, consecutive numbers, 2x and Full
   Art per part), `cards_open` (the missing part rule; the panorama given once, in the same transaction) and `cards_craft` (the same grant),
   each behind an md5 guard on the version it replaces; the data of the 255 photos by Commons page. Refuses once a pack, a card or a
   panorama is owned, and between 23:50 and 00:30 UTC. The catalog is rebuilt afterwards from the admin.
3. **Server**: the catalog payload (parts 1 to 3, `-t` files, panoramas with their picture, none for an age-locked group), the player's
   panoramas, the open and craft answers, the admin action `parts` with the rule's warning. Works before and after 118.
4. **Pages** (v6 system): "1/3" on a part, the landscape panorama card, its pocket under its parts, a Panoramas section with its own
   completion (never in the card totals), the large view, a reveal of its own when a set completes (pack and craft), the admin's choice 2
   or 3 with the preview of the parts and of the panorama, the hub's group block and the friends' wishlist with parts 1 to 3.
5. **Owner's script**: thirds (2x when each third is at least 640 px) and panoramas (2x when every part has it), one PATCH of the file
   columns; a photo that stays in 2 keeps its files and only gains its panorama.
6. **ALL-verify** knows the parts of a group photo: `TOUT_OK` stays true after 118 and the rebuild (the owner's script checks it).
   `ALL-099-115.sql` and `ALL-rollback.sql` unchanged.
7. **117 corrected** (integrator): the 117 of #233 was refused in production (a paste from Windows gives CRLF line endings, so the md5 of
   the new body did not match; nothing changed). Every md5 guard of 117, 118 and their rollbacks ignores spaces and line endings now:
   `md5(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g'))`, fingerprints recomputed; `crlf-sql.test.ts` applies them with CRLF.
8. **Locked pockets** of a group edition that cannot exist yet: "1/3, 2/3, 3/3" for a group whose issued editions are in 3 cards.

Screenshots (desktop 1440 x 860 and mobile 390 x 844, the fixture's neutral pictures): `docs/o1/evidence/cards/lot7/`.

## For the owner

`docs/o1/reports/CARDS/OWNER-LOT7.md`, in one pass: backup; the corrected 117 (this PR: its md5 guards ignore spaces and line endings, so a
paste from Windows works; the 117 of #233 was refused in production for that reason, with nothing changed); 118 and its Verify lines;
merge; "Reconstruire le catalogue"; the "To review" photos of the five groups that leave the packs (DAY6, PENTAGON, STAYC, GOT7, ITZY:
listed photo by photo on the owner's page) if you want them back; `pnpm --filter quiz owner:cards`; the first real pack. 116c is already
applied in production.

## Checks

- Full unit suite under Node 22 (620 files, 11,449 tests) and `tsc --noEmit`: green. No em or en dash in the diff.
- 118 on PGlite on the production-like state: guards, data, parts, panoramas, append, open, craft, recycle, rollback, Verify lines,
  safeupdate scan.
- One admin style changed for every page of the admin: a disabled main button now reads dark on light grey (it was faded to 45 %,
  about 2.6:1, now about 6:1).
- Exact test values changed on the lot 7 rule (listed in the commits): `catalog-sql.test.ts`'s file set gains the two 118 files; the
  ALL-verify line of 102 counts parts 0 to 3.

Not merged: the owner merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
