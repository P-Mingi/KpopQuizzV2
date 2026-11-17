# KpopCards lot 7: group photos in 2 or 3 cards, and the panorama (ORCH contract, 2026-11-17)

The one page every lane of lot 7 reads. Base: `o1/cards-panorama` (the head of PR #233, which main has not merged yet). Lanes: DB (SQL 118 and
the server), FILES (the owner's script), UI (the pages and the admin panel), DATA (ORCH: the thumbnails and the defaults).

## The brief (integrator, 2026-11-17), in short

1. A group photo gives 2 cards (window 11:8.5) or 3 cards (16.5:8.5). Default: the smallest window that keeps everyone. The admin has a choice
   2 or 3 per photo, with a preview of the parts and of the panorama. A photo where someone would be cut even in 3 goes to "To review".
2. Catalog: the parts of a photo have consecutive numbers (1/3, 2/3, 3/3). The missing half rule becomes the missing part rule. The odds per
   edition do not change.
3. The panorama: one per group photo, the edition of its parts. Given by the server, once, idempotent, in the same transaction as the open or
   the craft that completes the set (every part; 2/2 too). Never in packs, no craft, no recycle; it stays if the player then recycles a part.
   Its own numbers (P-0001) so card numbers and odds do not move. The binder has a Panoramas section with its own completion.
4. Display in the prototype v6 system: the card in landscape, a reveal of its own when a set completes, the panorama pocket under its parts.
   Screenshots before any push.
5. Files: publish-card-files cuts the thirds (5.5 x 8.5; 2x when each third is at least 640 px wide) and the panorama (the whole window; 2x
   when wide enough). The files of a photo that stays in 2 stay valid.
6. SQL 118: additive, ONE DO block, Verify lines, rollback, guard "no pack opened", under 400 KB.
7. Age: a panorama shows the people of its parts, same rules; a locked group has neither parts nor panorama.

## Geometry (scripts/cards/card-geometry.mjs, done by ORCH)

- `groupRatio(parts)`: 11/8.5 for 2, 16.5/8.5 for 3. `groupBox(w, h, parts, fx, fy)`: the widest window of that ratio, placed by the focal
  point exactly as `windowBox` (left = (w - cw) * fx / 100).
- `splitParts(box, n)`: part i spans [floor(W*(i-1)/n), floor(W*i/n)). With n = 2 it is exactly `halves()` (the lot 2 files stay valid).
- `partSuffix(part, parts = 2)`: `-h1`/`-h2` for 2 cards (unchanged), `-t1`/`-t2`/`-t3` for 3. `panoSuffix(parts)`: `-p2` / `-p3`.
  `panoSizes(parts)`: 1x `320*parts x 495`, 2x `640*parts x 989`.
- File names: part `<stem>-t2-1x.webp`, panorama `<stem>-p3-1x.webp` and `-2x.webp`. Stem unchanged (`stemOf`).
- A part has its 2x when it is at least 640 px wide in the original; the panorama has its 2x when every part has it.

## The rule (apps/quiz/src/lib/cards/parts-rule.ts, done by ORCH)

`decideParts(w, h, fx, fy, verdict)`: 2 when the 11:8.5 window keeps every head (with margins) at the current focal point or once moved;
else 3 when the 16.5:8.5 window does; else 3 proposed and "To review". No usable verdict: by ratio (r = w / h): r <= 11/8.5 gives 2,
r <= 16.5/8.5 gives 3, wider gives 3 and "To review". The admin reads the same module to warn when the owner's choice cuts someone.

## Database: 118-group-parts.sql (lane DB)

Additive, ONE DO block, `-- Verify:` lines, its rollback, under 400 KB. Refuses between 23:50 and 00:30 UTC, when a pack was opened
(`cards_packs`), when a card is owned, when a panorama is owned, and when a function it replaces is not the expected version (md5 of the
body, as 117 does: `cards_build_catalog` must be 117's, `cards_catalog_append` 114's, `cards_open` and `cards_craft` 110's).

Columns of `cards_photos` (all nullable or defaulted):
- `parts smallint` check `parts is null or parts in (2, 3)`: the cards of a group photo; null reads as 2.
- `file_parts smallint` same check: the parts the owner's files were cut for; null reads as 2 (every file of lots 2 to 6 is a pair).
- `file_pano boolean not null default false`: the panorama file `<storage_path>-p<file_parts>-1x.webp` exists.
- `heads_box jsonb` (null or an object `{x0, x1, y0, y1, hw}` in percent of the photo): the thumbnail verdict, geometry only.
- `parts_note text`: the rule's line for the admin ("3 cards: the 11:8.5 window would cut someone ...").

`cards_catalog.part` check widened to 0..3 (constraint `cards_catalog_part_check`).

New tables, RLS on, no grant to anon or authenticated, all to service_role:
- `cards_panoramas (pano_no integer primary key check > 0, num text unique check '^P-[0-9]{4,}$', entity_id text not null references
  cards_entities on delete cascade, rarity text not null, edition text not null, photo_id bigint references cards_photos on delete set
  null, parts smallint not null check in (2, 3), first_card integer not null references cards_catalog(card_no) on delete cascade,
  unique (entity_id, rarity))`.
- `cards_panoramas_owned (user_id uuid references auth.users on delete cascade, pano_no integer references cards_panoramas on delete
  cascade, granted_at timestamptz not null default now(), source text not null check in ('pack', 'craft'), pack_id uuid null references
  cards_packs(id) on delete set null, seen boolean not null default false, primary key (user_id, pano_no))`.
- `cards_parts_log (photo_id bigint primary key, status text, review_note text, focal_x integer, focal_y integer)`: what 118 changed on a
  photo row, for the rollback.

Functions replaced (same signatures, security definer, `set search_path = public`, service_role only, every DELETE and UPDATE with a WHERE,
`where true` when it means every row: safeupdate.test.ts must stay green):
- `cards_build_catalog()`: a group photo of `coalesce(parts, 2)` cards: window `parts * 5.5 / 8.5`, ranked by the width of ONE card
  (`floor(cw / parts)`), Full Art needs every part >= 640 px, `small_2x` per part from `splitParts`, parts consecutive. Then
  `cards_panoramas` is rebuilt (`delete ... where true`), one per (group, edition) in catalog order: P-0001, P-0002, ... Refuses also when
  `cards_panoramas_owned` has a row. Its answer gains `panoramas`.
- `cards_catalog_append(p_dry_run)`: the same parts rule for the cards it appends, and a panorama after max(pano_no) for each group edition
  it appends.
- `cards_open(...)`: the missing part rule: a drawn part that the player owns while another part of the same (entity, rarity) in packs is
  missing becomes the lowest-numbered missing part. `completesPair` = new and every other part owned. A card that completes its set gives the
  panorama (insert `on conflict do nothing`, `source 'pack'`, `pack_id` of its pack): the card entry gains `pano` (pano_no), the pack
  entry gains `panoramas` (array of pano_no). The idempotent replay returns the same answer.
- `cards_craft(...)`: same grant after the insert (`source 'craft'`); its answer gains `pano` (pano_no or null).
- `cards_recycle` is NOT changed: it never deletes the last copy, and a panorama lives in its own table.

Data of 118 (generated from `docs/design/cards/data/lot7/parts.json` by ORCH's DATA lane, keyed by `source_page`, group photos only): for
each page, `parts`, `heads_box`, `parts_note`; the focal point only when the row's current focal point is still the one the verdict was
read at (else a notice: the owner's focal point is kept, the admin warns); "To review" (status auto/approved to pending, note) when
someone would be cut even in 3; "rejected" with a note when the thumbnail seems to show a person under 18 (lot 6 limit). Old values go to
`cards_parts_log` first. Pages not in the database change nothing (counted in a notice).

Rollback: gives back the four functions (text of 117, 114, 110 extracted from those files, md5 checked like 117), restores the logged rows,
drops the two panorama tables, `cards_parts_log` and the five columns, puts the part check back to 0..2; refused once a pack was opened.

## Server (lane DB)

- `lib/cards/types.ts` and `lib/kpopcards/contract.ts` hold the new shapes (ORCH wrote them; extend, do not rename): `CatalogPanorama`,
  `PanoImage`, `CatalogCard.parts/setNs/pano`, `OpenedCard.pano`, `OpenResult.pack.panoramas`, `WalletState.panoramas`; `PanoRef`,
  `PanoItem`, `OpenedCardV.pano`, `OpenedPack.panoramas`, `OpenSummary.panoramas`, `CraftResponse.pano`, `CollectionItem.parts/pano`,
  `CollectionState.panoramas`.
- `lib/cards/catalog.ts`: cards of 3 parts (`-t` files, `parts`, `setNs`, `pano`), the image is cut only when `coalesce(file_parts, 2)`
  equals `coalesce(parts, 2)` and the focal points match; `panoramas` in the payload (only those whose parts are in packs and whose
  entity is not age-locked) with `PanoImage` (the `-p` file when `file_pano`, else the parts' 1x files, else the source photo).
- `lib/kpopcards/*` (server, model, mock-api, sql-twin, http-api): the panoramas through open, craft, state and collection; the twin and the
  mock follow the SQL.
- `lib/cards/rules.ts`: the draw already gives a lacking part (pickCard); keep it for 3 parts, test it.
- `lib/cards/admin-photos.ts`: an action `parts` `{ photo, parts: 2 | 3 }` that sets `cards_photos.parts` (refused with the database's own
  message when a pack was opened and the photo is on a catalog card); the admin's photo list returns `parts`, `heads_box`, `parts_note`,
  `file_parts`, `file_pano` and the rule's warning (parts-rule.ts `keepsEveryone` at the current focal point).

## Owner's script (lane FILES)

`card-files.mjs` `cutPlan(group, w, h, fx, fy, parts = 2)` gives the parts and the panorama; `cardFileRegex` and `planRemovals` know `-t1..3`
and `-p2/-p3` (a photo in 3 keeps its thirds and `-p3`, a photo in 2 its halves and `-p2`); `publish-card-files.mjs` reads `parts` and
`file_parts`, cuts and uploads the parts and the panorama, then sets `storage_path`, `file_focal_x/y`, `file_parts`, `file_pano` in one
PATCH. A photo whose files match its focal point and parts is skipped; a photo cut in 2 before lot 7 that stays in 2 only gains its `-p2`
panorama file (its halves are kept, not re-uploaded). The preview contact sheet shows the parts and the panorama.

## Pages (lane UI)

Prototype v6 system (`docs/design/cards/kpopcards-prototype-v6.html`, `styles/cards/kpopcards.css`): a part shows "1/3"; the panorama is a
landscape card (the parts' frame, one edition, its P number); a reveal of its own after the card that completed the set (pack opening and
craft); in the binder, the panorama pocket under its parts in the group's page, and a Panoramas section with its own owned/total. The
admin's photos panel: a choice 2 or 3 per group photo, the preview of the parts and of the panorama, the rule's note and its warning. The
UI fixture (`ui-fixture.ts`) gains a photo in 3 and panoramas so every screen can be shot with CARDS_UI_FIXTURE=1.

## Common rules

No em or en dash anywhere (write `–` and `—` in a regex, then check the file: the Write tool turns them into real dashes). No new
npm dependency. Ratchet law: an exact test value changes only on a rule of the owner or the integrator, and each change is listed in the
commit. Never `--no-verify`. No push, no connector, no production write. Commits use the worktree's agent (CARDS).
