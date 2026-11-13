## What this PR does

Bunnyverse Cards, lot 2 (integrator brief of 2026-11-12 and its review the same day; one PR, the owner merges). **Everything stays off**:
the Cards flags stay off and the hub stays behind PRIVATE_LAUNCH. Nothing is written to production by this PR: two SQL files the owner
applies, and the owner's file script.

1. **The age rule, stricter, first** (`lib/cards/age-rule.ts`, decision 32). A card exists only when every person in its photo is 18 or
   older today AND was 18 or older on the photo date (`group-photos.json`). For a group, the people in the photo are its lineup on that
   date; every current member must also be an adult today. Any doubt excludes:
   - a member whose join or leave date is unknown counts as in the photo;
   - an unsure birth date counts as its latest possible day;
   - a birth date counts only when two permitted sources give it to the day (Wikidata, Korean or English Wikipedia, MusicBrainz, the
     agency's page; never a fan wiki). One source alone can show a minor, never keep a subject in.
   The research file (members, dates) stays on the ORCH machine: it holds birth dates of minors. The repository keeps the verdicts only:
   `docs/design/cards/data/age-check.json` (slug, in or out, reason). At apply time, file 102 also runs decision 17 again on `public.idols`.
2. **The group photo in two cards** (owner idea, decision 33). A group gives a pair per edition: 1/2 the left half and 2/2 the right half of
   the widest 11:8.5 window of its photo, with consecutive numbers (C 1/2, C 2/2, U 1/2, ..., UR 2/2: 8 numbers a group). One focal point
   per pair. A person keeps one card per edition.
   - **Binder:** the two halves sit side by side, flush, and read as one picture when both are owned. A page never cuts a pair (two cells of
     one row); the grid counts a pair as 2. Filters and sorts keep the pair together.
   - **Card page:** a half says which half it is, links its other half, and shows both side by side.
   - **Draw** (owner decision 2026-11-13, decision 38): after the rarity, one subject at random among all the subjects of that rarity, a
     soloist, a member or a group with the same chance, then for a group one of its two halves. The plan's kind weights (idol 75, group
     15, event 10) apply again only once the catalog has the plan's form (cards of the three kinds and of the six rarities, read from the
     pool). The drop rates print these steps, the share of each type and the chance of one given card, computed from the catalog.
   - **Admin Cartes tab:** a group shows its pair window at the focal point and the two halves, each with its own 2x flag; one focal control.
   - **kpopquiz.org group block** (behind the bridge flags): a half renders as a half.
3. **Disbanded groups** (owner decision 2026-11-12, decision 37): miss A and SISTAR stay. All adults on the photo date; their members enter
   `idols` as former members (active false), 102 checks them without asking for an active member, and the card says it: "Disbanded 2017"
   on the card, both years on its page (`cards_entities.end_year`). PURPLE KISS (2025) and Loossemble (2024) get the same treatment (owner,
   2026-11-13: kept): they passed the age rule once their second sources were found, and they disbanded. Every year comes from two sources
   (`docs/design/cards/data/disbanded.json`); Wikidata has no dissolution date for miss A, the English and Korean Wikipedias agree on 2017.
4. **File 099** (`099-idols-members.sql`, decision 36): the members of the subjects that had no active `idols` row. 31 subjects, 120 people,
   every birth date from two sources. Only where the group has no active `idols` row when the owner applies it; the ten soloists of the
   brief in their own groups row; the four disbanded groups as former members; nothing for a subject the age rule leaves out, nothing for
   the eight people who belong to another group.
5. **Kpopdle** (integrator review, point 1): **the active rows of 099 stay out of Kpopdle until their clues are filled.** Gender,
   nationality, debut year and the leader or maknae role are not in Wikidata in a form the game can trust (the role has no source at all),
   and an empty or "none" role would be a wrong clue. So 099 writes them with `needs_review` true and the reason "Kpopdle clues not filled
   yet (gender, nationality, debut year, leader or maknae)": the Kpopdle source view reads only rows without `needs_review`. They show in
   the admin list of flagged idols; the owner clears the flag once the columns are filled. They still count as members for the cards, Name
   them all, the quiz entities and the member counts. 099 counts the Kpopdle source view before and after and refuses, with nothing
   written, if it moved.
6. **File 102** (`102-catalog-rebuild.sql`, decision 34): rebuilds `cards_entities`, `cards_photos` and `cards_catalog` with the age rule,
   the pairs and the disbanded groups. Refused, with nothing changed, while a card is owned, a pack was opened or a photo report is open.
   Adds `cards_catalog.part` (0, 1, 2), `cards_catalog.small_2x` (per card), the key (entity, rarity, part) and `cards_entities.end_year`. A
   person keeps its published files; a group keeps its focal point and gets its halves cut by the script; a photo the owner refused or
   removed stays out. The rollback leaves the catalog empty (101 predates the age rule and would bring back the subjects it leaves out).
7. **The owner's file script** (`publish-card-files.mjs`, decision 35): cuts the halves; no age verdict, no file; after the uploads it
   proposes to delete every file of the bucket `cards` that is not a current one (subjects left out, a group's old whole cards, an old
   focal point), matched by exact name, and deletes only when the owner types `delete`.

## The final catalog

- **39 subjects in (age rule):** the 18 people of the run (BIBI, Chungha, Heize, Hwasa, HyunA, IU, Jay Park, Jennie, JEON SOMI, Jimin,
  Jungkook, PSY, ROSE, Sunmi, Taeyang, Taeyeon, V, Zico) and 21 groups (Apink, ARTMS, ASTRO, BTOB, DAY6, Dreamcatcher, iKON, KATSEYE,
  KISS OF LIFE, MONSTA X, NCT WISH, P1Harmony, PENTAGON, STAYC, VIVIZ, WINNER, ZEROBASEONE; disbanded: Loossemble 2024, miss A 2017,
  PURPLE KISS 2025, SISTAR 2017).
- **Cards: 240 at most** (18 x 4 + 21 x 8); the exact count is the notice of 102 (a subject whose `idols` rows fail the apply-time check is
  left out and named).
- **Odds** (computed by the game's own code over that catalog): each card Common 63.03%, Uncommon 25.21%, Rare 10.50%, Ultra Rare 1.26%;
  the fifth card Uncommon 88.24%, Rare 10.50%, Ultra Rare 1.26% (no Super Rare or Legendary card exists). Inside a rarity each of the 39
  subjects has the same chance (1 in 39): soloists and members 46.15%, groups 53.85%. One given card: Common 1.62% for a person, 0.81% for
  a half of a group; Uncommon 0.65% and 0.32%; Rare 0.27% and 0.13%; Ultra Rare 0.03% and 0.02%.
- **No 2x file:** both halves of BTOB, DAY6, iKON, KISS OF LIFE, MONSTA X, NCT WISH, PENTAGON, SISTAR and WINNER; the cards of Heize,
  Jimin and Taeyang.
- **Out (20), reasons only:**
  - a person of the photo under 18 today (6): Cortis, Hearts2Hearts, RESCENE, tripleS, TUIDE, Young posse;
  - a person of the photo under 18 on the photo date (10): AKMU, Billlie, FIFTY FIFTY (two members who joined before the photo), fromis_9,
    ILLIT, KARA, LOONA, NCT (the 2018 photo), TWS, and T-ARA (a planned member announced in 2012 has no membership date in any source,
    so counts as in the photo, and would have been under 18 then);
  - two sources disagree on a birth date (2): &TEAM, THE BOYZ;
  - the lineup is not in the sources (2): KickFlip, XIKERS.

## What changes for Kpopdle

Nothing until the owner fills the clues. On PGlite, the real Kpopdle files (011 to 021e, the production state of
`lib/dle/kpopdle-fixture.ts`, then L20) with the subjects' groups rows, before and after 099 and a refresh of the pool: 217 entities in the
pool, 212 possible answers, 5 guessable entities with an empty clue (all already there), the same numbers after; 86 rows added to `idols`
(66 active and waiting, 20 former members; the other 34 rows of the file skipped because the replayed database already has members for
those groups), none in the pool. Clearing the wait too
early would add those 66 to the pool with empty clues: the test shows it, then puts the wait back.

## Steps for the owner, in this order (after a backup, no build running, never between 23:50 and 00:30 UTC)

1. `099-idols-members.sql`, then its Verify lines (the notices list the rows added per subject, and the Kpopdle source count before and
   after).
2. `102-catalog-rebuild.sql`, then its Verify lines (the notices give the people and groups in, the cards per part, the disbanded groups,
   every subject left out and why).
3. `CARDS_SUPABASE_URL=https://<project>.supabase.co node apps/quiz/scripts/cards/publish-card-files.mjs` for the preview, then the same
   with `--publish`: it cuts the groups' halves, then lists the files to delete (the subjects left out among the 23 already sent, the old
   whole cards of the groups) and deletes them only if you type `delete`.
4. Admin Cartes tab: check the pair window of each group (one focal point per pair), then run the script again for the groups you move.
5. Later, for Kpopdle: fill gender, nationality, debut year and positions of the flagged rows, then clear `needs_review`.

## What changes for kpopquiz.org

- The group block of the bridge (flags off) reads `cards_catalog` with `*` and draws a half as a half.
- **File 099 adds active rows to `public.idols`, which kpopquiz.org reads too:** the Name them all game and the quiz entity matching of
  those groups, and the member count list of the article on the groups hardest to memorize (active rows per group). Only groups without an
  active row today get any. The former members of the disbanded groups are invisible to every public read (active false). The Verse pages
  stay hidden.
- No page, title, sitemap entry or redirect changes in this PR.

## Checks

- `tsc --noEmit` clean. Cards tests: the pglite proofs of 099 and 102 (the guard, the numbering, the pairs, small_2x per half, what a
  person keeps, a refused photo, the disbanded groups, a second run, the rollbacks), the Kpopdle pool before and after 099, the age rule
  (18 cases: today, the photo date, lineups, a single source), the exact odds of the draw with pairs, the binder pairs, the card page, the
  card line of a disbanded group, the drop rates, the file script's geometry and its cleanup matcher, the admin halves.
- Full suite (no offline wrapper), on 0db172a: 10,177 tests, 10,175 passed in the run; the 2 others are load timeouts
  (`admin-lock.refusal`, the Kpopdle bank sizes), which pass alone (2,194 of 2,194).
- Hub production build (`NEXT_PUBLIC_SITE_ID=hub NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1`, offline database), on 0db172a: green, 228 pages.
- kpopquiz.org parity, main 65c0210 against 687c973, 70 pages: 67 identical. The 3 others come from the base
  build, which had 26 live reads over the 5 s cap (the head none): `/` (the home groups, community and band reads timed out), one quiz page
  (its extra stats and hall of fame timed out) and `/leaderboard` ("1h ago" against "2h ago"). An earlier run on 47c15ab, with 7 base
  timeouts, gave 69 of 70 (the `IconMark` Flight order on `/groups`, the known noise). The commits after 687c973 change only the hub's
  draw, its drop rates and docs: kpopquiz.org reads one constant of `rules.ts` (`CAP`, unchanged), so no new parity run.
- Checked on screen with a development fixture of pairs (`CARDS_UI_FIXTURE_PAIRS=1`, off by default): the binder pages and grid, the card
  page of a half, the card of a disbanded group (with both years on the card the year was cut: it now reads "Disbanded 2023" in the
  fixture).

## Exact values changed

- `src/lib/cards/catalog-sql.test.ts` (lot 1, review 1 finding 15): the exact list of the Cards SQL files gains `099-idols-members` and
  `102-catalog-rebuild`, each with its rollback (integrator brief, points 1 and 4). Still no file 100, still a rollback for every file.
- Owner decision 2026-11-13 (every subject the same chance until the plan's form): `src/lib/cards/draw.test.ts` "idol 75 and group 15
  among the kinds present" (a pool of 40 idols and 12 groups a rarity) now expects idols 40 of 52; `src/lib/cards/rules.test.ts` "kinds:
  idol 75 and group 15" now expects the share of the subjects (75 and 25 for 3 idols and 1 group) and `kindWeights` false. The large draw
  over a pool in the plan's form keeps its 75/15/10. `src/lib/cards/rules-pairs.test.ts` (written in this lot) pins the new draw and a
  pool in the plan's form.
- `src/lib/cards/card-files.test.ts` (written in this lot): `ageOk({})` is now `false`. A subject with no age verdict gets no file (fails
  closed), like 102, which writes no card without one. No other test from before this lot was changed.

## Not in this PR

- The Kpopdle clues of the 099 rows (the owner fills them; the rows wait out of the game until then).
- The essays/reactions counter of the Verse (backlog, integrator 2026-11-12).
- The pack opening's accessible names do not say "left half" (the card itself says 1/2).
