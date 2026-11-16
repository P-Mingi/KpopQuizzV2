# KpopCards lot 6, the photo harvest: report (ORCH, 2026-11-16)

Goal of the brief: at least 1,000 cards. **With the rules unchanged, the auto photos give 980 cards**, 20 short. The owner's review of
the pending photos is what takes the count past 1,000 (1,188 if the owner approves the photos pending only for Commons' personality rights
warning). No rule was loosened to get there.

## Counts

| | |
| --- | --- |
| Subjects | 293: 228 people (the 218 Kpopdle idols of the integrator's export, and 10 members of groups with a minor), 65 groups |
| Locked pockets ("Carte à venir", no photo, no card) | 10: babymonster 2, cortis 3, hearts2hearts 5 |
| New photos | 1,115: 771 auto, 344 pending (the owner's review); 311 more were checked and left out |
| Cards | 182 before lot 6, 980 with the auto photos (pairs counted as two) |

Per subject and per reason: `docs/design/cards/data/lot6/SUMMARY.md` (generated, with the 46 adult idols left with fewer than 2 usable
photos). Every verdict and credit: `docs/design/cards/data/lot6/photos.json`.

## The 1,000 cards

The edition rules (2 live photos to enter the packs, one edition a photo) give, from the same research:

| Case | Cards |
| --- | --- |
| Auto photos only (what 116 opens) | 980 |
| The owner also approves the 187 photos pending only for the personality rights warning | 1,188 |
| The owner approves every pending photo | 1,442 |

The pending photos keep their slot: 78 subjects have a further candidate that was left out as "six photos already" while a pending photo
holds a slot. A photo the owner refuses frees its slot only after a new run of `verify-harvest.mts` and a new SQL file.

## The thumbnails (integrator's yes, 2026-11-16)

226 pending photos of adult subjects were checked on a 400 px thumbnail from the Commons API, kept outside the repository and deleted
once the verdicts were written. Never a subject of CORTIS, Hearts2Hearts or BABYMONSTER, never a locked subject, never WayV or GFRIEND.
The checkers counted people and never identified anyone.

- 43 photos are out: the thumbnail shows a person who seems under 18 (the integrator's added limit). Each thumbnail was deleted at once,
  with no further look. The checkers leaned towards "seems under 18" whenever in doubt, so some of these photos show adults.
- 44 idol photos show the subject alone and 19 group photos the whole lineup of that date: that reason is gone. Many still wait for
  another reason (most often the personality rights warning).
- 108 photos show another count and 12 were unclear: they stay pending.
- Effect: 914 cards before the thumbnails (920 less WayV's 6), 980 after.

## Decisions applied (integrator, 2026-11-16)

1. **Resolution in 116:** the 218 Kpopdle idols by their `public.idols` id (the export), the 10 other people by Wikidata id. No card
   depends on `idols.active` (Rora and Ruka have an inactive row).
2. **The 7 Wikidata ids with no row** (Carmen and 6 minors): 116 adds a `public.idols` row for each, `active = false`,
   `needs_review = true`, no birth date, `review_reason` starting with `116-photos-harvest`. The Kpopdle source reads none of them
   (Verify line, as 099). Without a date a pocket stays locked; an adult's photos wait as pending ("no birth date yet").
   - **Carmen** (adult): 0 card waits for her date. She has one photo, pending for the personality rights warning; she needs a second.
   - **How the owner fills the dates**, without them entering the repository: ORCH generated, outside the repository, a one DO block SQL
     file that sets the date of these 7 rows only (rows of 116 still without a date), from two agreeing sources each. The owner applies
     it after 116, like any file of rule 13. The other way is the admin's Idols tab, one row at a time. ORCH recommends the file: no
     typing, and the minors' pockets get their opening month at once.
3. **Duplicates for the owner (data cleanup, not in lot 6):** Kai (EXO), DK, The8 and S.Coups (SEVENTEEN) each have two `public.idols`
   rows in the same group. 116 does not depend on them (Kpopdle idols resolve by id).
4. **WayV and GFRIEND:** no `public.groups` row, and no new group row in lot 6. Their group photos are out for now
   (`docs/design/cards/data/lot6/db-groups.json` lists the 63 lot 6 groups the database has). That removes 6 auto cards (WayV); GFRIEND had
   no auto photo (its 6 pending photos could have given up to 12 cards). 2NE1, NCT 127, NCT DREAM and NMIXX are found by slug.
5. Commons' personality rights warning on a file: pending. Moonbin's photos are out (3 files).
6. Two sites agree on a birth day and a third differs: the latest day read is kept, as confirmed (the strictest).
7. A locked pocket is for a minor only: an adult whose birth date has one source stays out of the cards, with no pocket, until a second
   source.
8. The exact Kpopdle list replaces the provisional one: 60 provisional idols outside Kpopdle are no longer subjects; member slugs take the
   database group slug (`g-i-dle`, `nct`, `txt`).

## After the integrator's go (2026-11-16)

1. **The dates file (116b)** is handed to the owner by its path on the owner's Mac, outside the repository
   (`OWNER-ONE-SHOT.md`, step 3). In production the policy `idols_public_read` shows active rows only and `dle_src_kpop_idol` is not
   readable by `anon`: the dates stay private while the 7 rows stay inactive. 116 now adds a trigger, `cards_116_idols_guard`, that refuses
   `active = true` on a row of its log while the person is under 18 or has no birth date (the flagged rows show in the admin queue of
   idols to review, whose "approve" sets `active = true`). A Verify line checks that no such row is active, and a test proves that a
   pocket opens at read time, through a rebuild, without ever making the row active.
2. **116c** (`docs/pending-migrations/cards/116c-approve-personality-rights.sql`, optional, the owner decides): one DO block that approves
   the 187 photos pending for the personality rights warning alone. It refuses with nothing changed unless exactly those 187 qualify
   (pending, added by 116, that reason alone; Carmen's photo once her date is filled) and no pack was ever opened. Verify lines and a
   rollback.
3. **The owner's script still runs:** after 116 and the rebuild, `ALL-verify.sql` would have answered `TOUT_OK` false, so
   `owner:cards` would have refused. Two of its rows checked exact sets (the subjects 102's age rule leaves out, the photos of 103 and no
   other): they now leave out what 116's log added (lot 6 checks those with its own rules). The third was a real gap: 111 typed only
   the groups that had an entity, so 116 now gives the groups it brings in their type from 111's list (two sources each; 34 of the lot's
   groups are in that list, the others stay without a type, as 111 decided). `ALL-099-115.sql` and `ALL-rollback.sql` are byte for byte the
   files run in production; only `ALL-verify.sql` changes. A test runs the bundle, 116, the rebuild, approvals and a rebuild again on the
   production-like fixture: `TOUT_OK` true each time.
4. **main:** `origin/main` (00eb85a) is already in `o1/cards-harvest`.

## For the owner

The page is `docs/o1/reports/CARDS/OWNER-ONE-SHOT.md`, one pass in this order: backup, 116, 116b from the private folder, 116c (optional),
the Verify lines, the merge, "Reconstruire le catalogue", the terminal script, the first real pack. 116 and 116b ran in full on the test
database, with the rollback of 116. The guard and the rollback of 116c are proven on PGlite with invented photos: the real file only
qualifies on the production photos, and refuses anywhere else.

## New tests of this pass

- `approve-sql.test.ts`: 116c's guard (exactly N, a held photo once its person has a date, no pack, the time window), its Verify lines, a
  second run refused, its rollback, and the committed file equal to what `photos.json` gives.
- `harvest-allverify.test.ts`: `ALL-verify.sql` answers `TOUT_OK` after the bundle, 116 and a rebuild, and after approvals and a rebuild.
- `harvest-sql.test.ts`: a pocket opens at read time without making its row active; the trigger refuses `active = true` under 18 or
  without a date; the lock functions only read; 111's types for the groups of the lot, none invented, removed by the rollback.

## Tests (Node 22)

- Exact test values changed on the integrator's rules of 2026-11-16, each listed in its test:
  - `harvest-sql.test.ts` and `harvest-sql-postgres.test.ts`: 116 now adds a flagged `public.idols` row for a person with none (was:
    never writes `public.idols`; a person without a row was skipped); the log and photo counts of the fixture follow;
  - `catalog-sql.test.ts`: the exact file set gains `116-photos-harvest.sql` and its rollback;
  - `harvest-checks.test.ts`: an adult whose date has one source has no pocket (was: locked `unknown_birth`).
- The test fixture's `public.idols` gains the columns and the key of the real table (124), and a Kpopdle view that reads no flagged row.
- `cards-layout.test.ts`: `photos.json` writes the en and em dashes of Commons titles as JSON escapes (the same data once parsed).

## Privacy

No birth date and no month of an 18th birthday is in the repository. The reports name no minor: a locked pocket's name is only in
`subjects.json` and 116, as the binder needs it. The opening months of the locked pockets are in the private `locked.md`, outside the
repository, and were given to the integrator in the chat.
