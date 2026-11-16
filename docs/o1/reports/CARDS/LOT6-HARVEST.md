# KpopCards lot 6, the photo harvest: report (ORCH, 2026-11-16)

Goal of the brief: at least 1,000 cards. **With the rules unchanged, the auto photos give 920 cards.** The owner's review of the pending
photos is what can take the count past 1,000; no rule was loosened to get there.

## Counts

| | |
| --- | --- |
| Subjects | 293: 228 people (the 218 Kpopdle idols of the integrator's export, and 10 members of groups with a minor), 65 groups |
| Locked pockets ("Carte à venir", no photo, no card) | 10: babymonster 2, cortis 3, hearts2hearts 5 |
| New photos | 1,150: 720 auto, 430 pending (the owner's review); 276 more were checked and left out |
| Cards | 182 before lot 6, 920 with the auto photos (pairs counted as two) |

Per subject and per reason: `docs/design/cards/data/lot6/SUMMARY.md` (generated, with the adult idols left with fewer than 2 usable
photos). Every verdict and credit: `docs/design/cards/data/lot6/photos.json`.

## The 1,000 cards

The edition rules (2 live photos to enter the packs, one edition a photo) give, from the same research:

| Case | Cards |
| --- | --- |
| Auto photos only (what 116 opens) | 920 |
| The owner also approves the 173 photos pending only for Commons' personality rights warning | 1,107 |
| The owner approves every pending photo | 1,502 |

36 of the 920 cards belong to groups whose database slug or name is not yet confirmed (2NE1 4, NCT 127 10, NCT Dream 6, NMIXX 10,
WayV 6). 116 finds a group by slug, then by its normalized name, and skips it with a notice when neither matches: the integrator's
read-only SELECT 3 settles it before the owner applies the file.

The pending photos keep their slot: 91 subjects have a further candidate that was left out as "six photos already" while a pending photo
holds a slot. A photo the owner refuses frees its slot only after a new run of `verify-harvest.mts` and a new SQL file.

## Decisions applied (integrator, 2026-11-16)

1. The exact Kpopdle list (218 idols, 40 groups, database group slugs) replaces the provisional one: 60 provisional idols outside Kpopdle
   are no longer subjects. Member slugs take the database group slug (`g-i-dle`, `nct`, `txt`); the existing subjects keep theirs.
2. Commons' personality rights warning on a file: pending (224 files outside the groups with a minor, 227 in all).
3. Moonbin's photos are left out (3 files).
4. Two sites agree on a birth day and a third differs: the latest day read is kept, as confirmed (the strictest). It settled one &TEAM
   member; &TEAM's group photos now go through the age rule like any group.
5. A locked pocket is for a minor only: an adult whose birth date has one source stays out of the cards, with no pocket, until a second
   source. (Exact test value changed and listed in the commit of 0121118: was locked `unknown_birth`, now not locked.)

## For the owner (rule 13)

1. Back up, then apply `docs/pending-migrations/cards/116-photos-harvest.sql` (one DO block, `-- Verify:` lines, additive: it never
   updates or deletes an existing photo or status). Never between 23:50 and 00:30 UTC.
2. Press "Reconstruire le catalogue" in the admin.
3. Run `pnpm --filter quiz owner:cards`.

The rollback is `116-photos-harvest.rollback.sql`. Both ran in full on the test database (the rollback restores the photo count).

## Tests (Node 22)

- Full suite: 11,295 tests, 3 failures, all three settled and rerun green:
  - `cards-layout.test.ts`: Commons titles with an en or em dash in `photos.json`. The file now writes them as JSON escapes (the same
    data once parsed), and a test proves it.
  - `catalog-sql.test.ts`: the exact file set gains `116-photos-harvest.sql` and its rollback. This exact value changed on the lot 6
    brief, as each earlier file did.
  - `admin-lock.refusal.test.ts`: a load timeout under the full suite. It passes alone.
- `tsc --noEmit`: clean.
- The real 116 and its rollback ran on the test database.

## Privacy

No birth date and no month of an 18th birthday is in the repository. The reports name no minor: a locked pocket's name is only in
`subjects.json` and 116, as the binder needs it. The opening months of the locked pockets are in the private `locked.md`, outside the
repository, and were given to the integrator in the chat.
