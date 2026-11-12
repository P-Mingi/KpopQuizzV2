# Bunnyverse Cards, the catalog data

Source: the 59 October Commons photos (`docs/design/growth-v12/run/group-photos.json`, checked against
`apps/quiz/src/lib/ux-v1/a0/group-photo-credits.ts`: 59 slugs, same author, licence, licence url and Commons page, no mismatch).
Nothing else is used (amendment 1).

- Candidates: 59 = 41 groups + 18 people (soloists or members).
- Cards: at most 236 (4 per subject: Standard C, Stage U, Holo R, Gold UR), BV1-0001 to at most BV1-0236.
- The final count after the adult rule (decision 17) is the Verify output of `docs/pending-migrations/cards/101-catalog.sql`
  ("N subjects in", cards per edition, the highest number, each left-out slug with its reason). It is read from `groups` and `idols` at apply time.
- Focal point: 50/30 for a person, 50/50 for a group (`subjects.json`, `101-catalog.sql`), set by the owner in the images admin.
- Apply order: `001-schema.sql`, `002-functions.sql`, `003-rls.sql`, `101-catalog.sql`.

## The card files are cut from the Commons originals (integrator review, 2026-11-12)

`originals.json` (written by `apps/quiz/scripts/cards/fetch-originals.mts` from the Commons API): for each of the same 59
photos, the same Commons page, the full-size original, its size, its sha1, and its licence on Commons today (all 59 still
match the recorded licence). `apps/quiz/scripts/cards/publish-card-files.mjs` cuts every card file from that original and
refuses a file whose sha1 changed. The bucket copies (`images/group-photos/<slug>.jpg`, at most 1,200 px wide) stay only the
site's fallback until the files are published. 13 of those copies are larger than their original (they were enlarged
in October): heize, hwasa, jimin, rose, taeyang, akmu, btob, loona, monsta-x, pentagon, sistar, team, the-boyz.

## small_2x (24 of 59): the widest 5.5:8.5 crop of the Commons original is under 640 px

heize (580), jimin (465), taeyang (618), akmu (430), billlie (319), btob (317), cortis (504), day6 (383), fromis-9 (583), hearts2hearts (500), ikon (465), illit (628), kickflip (543), kiss-of-life (559), loona (446), monsta-x (440), nct-wish (315), pentagon (444), sistar (511), team (209), the-boyz (347), triples (504), tuide (518), winner (581)

## Fine for 2x (35): crop width in px

bibi (1378), chungha (2795), hwasa (680), hyuna (814), iu (873), jay-park (2299), jennie (931), jeon-somi (1222), jungkook (1300), psy (1387), rose (672), sunmi (698), taeyeon (1194), v-bts (1110), zico (2259), apink (1279), artms (1294), astro (862), dreamcatcher (1725), fifty-fifty (1261), kara (833), katseye (1733), loossemble (1224), miss-a (708), nct (1431), p1harmony (774), purple-kiss (1190), rescene (745), stayc (1588), t-ara (668), tws (1241), viviz (1807), xikers (1897), young-posse (1266), zerobaseone (706)

Files: `originals.json` (`fetch-originals.mts`), `subjects.json` (`gen-subjects.mts`), `101-catalog.sql` (`gen-catalog-sql.mts`).
