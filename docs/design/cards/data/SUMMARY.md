# Bunnyverse Cards, the catalog data (lane DATA, second brief)

Source: the 59 October Commons photos (`docs/design/growth-v12/run/group-photos.json`, checked against
`apps/quiz/src/lib/ux-v1/a0/group-photo-credits.ts`: 59 slugs, same author, licence, licence url and Commons page, no mismatch).
Nothing else is used (amendment 1).

- Candidates: 59 = 41 groups + 18 people (soloists or members).
- Cards: at most 236 (4 per subject: Standard C, Stage U, Holo R, Gold UR), BV1-0001 to at most BV1-0236.
- The final count after the adult rule (decision 17) is the Verify output of `docs/pending-migrations/cards/101-catalog.sql`
  ("N subjects in", cards per edition, the highest number, each left-out slug with its reason). It is read from `groups` and `idols` at apply time.
- Focal point: 50/30 for a person, 50/50 for a group (`subjects.json`, `101-catalog.sql`).
- Apply order after 001 to 003: `100-bucket-cards.sql`, `101-catalog.sql`.

## small_2x (41 of 59): the widest 5.5:8.5 crop of the 1,200 px file is under 640 px

jay-park, sunmi, apink, artms, astro, billlie, btob, cortis, day6, dreamcatcher, fifty-fifty, fromis-9, hearts2hearts, ikon, illit, kara, katseye, kickflip, kiss-of-life, loona, loossemble, miss-a, monsta-x, nct, nct-wish, p1harmony, pentagon, purple-kiss, rescene, stayc, t-ara, team, the-boyz, triples, tuide, tws, viviz, winner, xikers, young-posse, zerobaseone

## Fine for 2x (18): crop width in px

bibi (776), chungha (776), heize (652), hwasa (776), hyuna (776), iu (776), jennie (776), jeon-somi (776), jimin (776), jungkook (776), psy (693), rose (776), taeyang (776), taeyeon (776), v-bts (776), zico (748), akmu (651), sistar (673)

Files: `subjects.json` (written by `apps/quiz/scripts/cards/gen-subjects.mts`), `100` and `101` SQL (written by `gen-catalog-sql.mts`).
