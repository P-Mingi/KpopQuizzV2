## What this PR does

Bunnyverse Cards, lot 2 (integrator brief of 2026-11-12, one PR, the owner merges). **Everything stays off**: the Cards flags stay off
and the hub stays behind PRIVATE_LAUNCH. Nothing is written to production by this PR: two SQL files the owner applies, and the owner's
file script.

1. **The age rule, stricter, first** (`lib/cards/age-rule.ts`, decision 32). A card exists only when every person in its photo is 18 or
   older today AND was 18 or older on the photo date (`group-photos.json`). For a group, the people in the photo are its lineup on that
   date; every current member must also be an adult today. Any doubt excludes:
   - a member whose join or leave date is unknown counts as in the photo;
   - an unsure birth date counts as its latest possible day;
   - a birth date held by one source only can show a minor, never keep a subject in (two agreeing sources: Wikidata and English Wikipedia).
   The research file (members, dates) stays on the ORCH machine: it holds birth dates of minors. The repository keeps the verdicts only:
   `docs/design/cards/data/age-check.json` (slug, in or out, reason). At apply time, file 102 also runs decision 17 again on `public.idols`.
2. **The group photo in two cards** (owner idea, decision 33). A group gives a pair per edition: 1/2 the left half and 2/2 the right half of
   the widest 11:8.5 window of its photo, with consecutive numbers (C 1/2, C 2/2, U 1/2, ..., UR 2/2: 8 numbers a group). One focal point
   per pair. A person keeps one card per edition.
   - **Binder:** the two halves sit side by side, flush, and read as one picture when both are owned. A page never cuts a pair (two cells of
     one row); the grid counts a pair as 2. Filters and sorts keep the pair together.
   - **Card page:** a half says which half it is, links its other half, and shows both side by side.
   - **Draw:** the subject first, then one of its halves, so a pair never makes a group come out more often (the plan's kind weights are
     unchanged). The drop rates now print the steps of the draw and the chance of one given card, computed from the catalog.
   - **small_2x per half:** 21 pairs have both halves under 640 px (no 2x file for them).
   - **Admin Cartes tab:** a group shows its pair window at the focal point and the two halves, each with its own 2x flag; one focal control.
   - **kpopquiz.org group block** (behind the bridge flags): a half renders as a half.
3. **File 099** (`099-idols-members.sql`, decision 36): the current members of the subjects that had no active `idols` row, from Wikidata
   with English Wikipedia as the second source. 15 subjects, 33 people, each with the birth date both sources give to the day. Only where
   the group has no active `idols` row when the owner applies it; the ten soloists of the brief in their own groups row; nothing for a
   subject the age rule leaves out, nothing for a disbanded group, nothing for the eight people who belong to another group.
4. **File 102** (`102-catalog-rebuild.sql`, decision 34): rebuilds `cards_entities`, `cards_photos` and `cards_catalog` with the age rule
   and the pairs. Refused, with nothing changed, while a card is owned, a pack was opened or a photo report is open. Adds
   `cards_catalog.part` (0, 1, 2) and `small_2x` (per card) and the key (entity, rarity, part). A person keeps its published files; a group
   keeps its focal point and gets its halves cut by the script; a photo the owner refused or removed stays out. The rollback leaves the
   catalog empty (101 predates the age rule and would bring back the subjects it leaves out).
5. **The owner's file script** (`publish-card-files.mjs`, decision 35): cuts the halves; no age verdict, no file; after the uploads it
   proposes to delete every file of the bucket `cards` that is not a current one (subjects left out, a group's old whole cards, an old
   focal point), matched by exact name, and deletes only when the owner types `delete`.

## The age rule: who is in, who is out (reasons only)

- **In (25):** the 18 people of the run (BIBI, Chungha, Heize, Hwasa, HyunA, IU, Jay Park, Jennie, JEON SOMI, Jimin, Jungkook, PSY, ROSE,
  Sunmi, Taeyang, Taeyeon, V, Zico) and 7 groups (Apink, ARTMS, BTOB, miss A, SISTAR, VIVIZ, WINNER).
- **Out, a person of the photo under 18 today (5):** Cortis, Hearts2Hearts, RESCENE, tripleS, Young posse.
- **Out, a person of the photo under 18 on the photo date (10):** AKMU, Billlie, fromis_9, ILLIT, KARA, LOONA, NCT (the 2018 photo), TWS;
  and FIFTY FIFTY and T-ARA, where it comes from a member whose join or leave date is unknown and who therefore counts as in the photo.
- **Out, a birth date unknown or held by one source only (17):** ASTRO, DAY6, Dreamcatcher, iKON, KATSEYE, KISS OF LIFE, Loossemble,
  MONSTA X, NCT WISH, P1Harmony, PENTAGON, PURPLE KISS, STAYC, &TEAM, THE BOYZ, TUIDE, ZEROBASEONE.
- **Out, the lineup is not in the sources (2):** KickFlip, XIKERS.

**Two choices for the owner or the integrator** (the code does the strict thing until then):
- **miss A and SISTAR** pass the age rule, but both disbanded in 2017: they have no current member, so 099 adds none, and 102 leaves them
  out (`no_active_member`) unless `public.idols` already has active members for them.
- **The 17 groups out for a single source** could come back with a second source for the missing birth dates (an official agency profile
  is an allowed source); no other source was searched.

## Steps for the owner, in this order (after a backup, no build running, never between 23:50 and 00:30 UTC)

1. `099-idols-members.sql`, then its Verify lines (the notices list the rows added per subject).
2. `102-catalog-rebuild.sql`, then its Verify lines (the notices give the people and groups in, the cards per part, every subject left out
   and why).
3. `CARDS_SUPABASE_URL=https://<project>.supabase.co node apps/quiz/scripts/cards/publish-card-files.mjs` for the preview, then the same
   with `--publish`: it cuts the groups' halves, then lists the files to delete (the subjects left out among the 23 already sent, the old
   whole cards of the groups) and deletes them only if you type `delete`.
4. Admin Cartes tab: check the pair window of each group (one focal point per pair), then run the script again for the groups you move.

## What changes for kpopquiz.org

- The group block of the bridge (flags off) reads `cards_catalog` with `*` and draws a half as a half.
- **File 099 adds rows to `public.idols`, which kpopquiz.org reads too:** the Name them all game and the quiz entity matching of those groups,
  and the member count list of the article on the groups hardest to memorize (active rows per group). The Verse pages stay hidden. The groups
  it can complete: Apink, ARTMS, BTOB, VIVIZ, WINNER (only those without an active row today), and the ten soloists' own groups rows.
- No page, title, sitemap entry or redirect changes in this PR.

## Checks

- `tsc --noEmit` clean. Cards tests: 22 pglite proofs of 099 and 102 (the guard, the numbering, the pairs, small_2x per half, what a person
  keeps, a refused photo, a second run, the rollbacks), the age rule (18 cases: today, the photo date, lineups, a single source), the exact
  odds of the draw with pairs, the binder pairs, the card page, the drop rates, the file script's geometry and its cleanup matcher, the admin
  halves.
- Full suite: 10,164 tests, 10,161 passed in the run; the 3 others: the pinned file list (updated, see below) and two load timeouts
  (`admin-lock.refusal`, the Kpopdle bank sizes), which pass alone.
- Hub production build (`NEXT_PUBLIC_SITE_ID=hub NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1`, offline database): green, 228 pages.
- kpopquiz.org parity, main 65c0210 against 47c15ab, 70 pages: 69 identical. `/groups` differs only by the order of the `IconMark` client
  reference in the Flight data (renumbered ids, the known noise); the base build had 7 live reads over the 5 s cap, the head none.
- Checked on screen with a development fixture of pairs (`CARDS_UI_FIXTURE_PAIRS=1`, off by default): the binder pages and grid, the card
  page of a half.

## Exact values changed

- `src/lib/cards/catalog-sql.test.ts` (lot 1, review 1 finding 15): the exact list of the Cards SQL files gains `099-idols-members` and
  `102-catalog-rebuild`, each with its rollback (integrator brief, points 1 and 4). Still no file 100, still a rollback for every file.
- `src/lib/cards/card-files.test.ts` (written in this lot): `ageOk({})` is now `false`. A subject with no age verdict gets no file (fails
  closed), like 102, which writes no card without one. No other test from before this lot was changed.

## Not in this PR

- The essays/reactions counter of the Verse (backlog, integrator 2026-11-12).
- The pack opening's accessible names do not say "left half" (the card itself says 1/2).
