## What this PR does

KpopCards lot 6, the photo harvest (integrator brief of 2026-11-16): every Kpopdle idol becomes a card subject, the groups get up to six
photos, and the groups with a member under 18 show locked "Carte à venir" pockets instead of a photo. **Nothing is written to production
by this PR**: the database changes are SQL files the owner applies, in the order of `docs/o1/reports/CARDS/OWNER-ONE-SHOT.md`.

**Owner page, one pass:** backup, 116, 116b (from the owner's private folder, never in the repository), 116c (optional), the Verify lines,
this merge, "Reconstruire le catalogue", `pnpm --filter quiz owner:cards`, the first real pack.

## Numbers

| | |
| --- | --- |
| Subjects | 293: the 218 Kpopdle idols, 10 members of CORTIS, Hearts2Hearts and BABYMONSTER, 65 groups |
| Locked pockets | 10 (babymonster 2, cortis 3, hearts2hearts 5): no photo, no card, no date shown, never counted or put forward |
| New photos | 1,115: 771 auto, 344 to review |
| Cards | 182 today; 980 with the auto photos; 1,188 if the owner applies 116c; 1,442 if every pending photo is approved |

1,000 cards are not reached with the auto photos alone: the report says so with the numbers, and no rule was loosened
(`docs/o1/reports/CARDS/LOT6-HARVEST.md`).

## The SQL files (`docs/pending-migrations/cards/`)

- `116-photos-harvest.sql` (one DO block, `-- Verify:` lines, additive, rollback): the entities and photos of the lot, the age lock
  computed at read time from `public.idols` (the public API sends a boolean, the opening month is admin only), a `public.idols` row
  for the 7 people with none (inactive, flagged, no birth date, out of Kpopdle), a trigger that keeps those rows inactive while the person
  is under 18 or has no date, and the type of the groups it brings in from 111's list. It never changes an existing photo, status or
  `public.idols` row. Kpopdle idols resolve by `public.idols` id, the others by Wikidata id.
- `116c-approve-personality-rights.sql` (optional, the owner decides): approves the 187 photos pending only for Commons' personality
  rights warning; refuses unless exactly those 187 qualify and no pack was opened. Rollback included.
- `ALL-verify.sql`: two exact-set rows leave out what 116's log added, so `owner:cards` keeps `TOUT_OK` true after lot 6.
  `ALL-099-115.sql` and `ALL-rollback.sql` are byte for byte the files run in production.

## Code

- `apps/quiz/scripts/cards/verify-harvest.mts`, `src/lib/cards/harvest-checks.ts`: the lot's rules on top of lot 3's checks and the age
  rule (two agreeing sources, any doubt excludes; the integrator's decisions of 2026-11-16).
- `src/lib/cards/harvest-sql.ts`, `approve-sql.ts` and their generators.
- The binder's locked pockets, the admin's opening months, the owner script reading lot 3 and lot 6 photos (lanes C and D of this lot).

## Privacy

No birth date and no month of an 18th birthday is in the repository, a commit or a report (a test scans the lot's files). Minors' photos
were never fetched or viewed; the private research and the dates file stay on the owner's machine.

## Checks

- Full unit suite under Node 22 and `tsc --noEmit`: green.
- 116 on PGlite and on a real Postgres; 116 then a rebuild on the production-like fixture: `ALL-verify` `TOUT_OK`.
- Exact test values changed only on the integrator's rules, each listed in its test and in the commits.

Not merged: the owner merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
