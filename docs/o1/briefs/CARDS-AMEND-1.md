# Cards, amendment 1: the photos (owner decision, 2026-11-12)

This amendment WINS over the contract and the briefs wherever they differ. Everything else stays.

1. The data run and the photo census are stopped. Their findings are parked outside the repository and are not used.
2. Photos: EXACTLY the 59 free photos found in October, nothing else, no new search:
   `docs/design/growth-v12/run/group-photos.json` and `apps/quiz/src/lib/ux-v1/a0/group-photo-credits.ts`: 59 Wikimedia
   Commons files (41 groups, 18 soloists or members), CC BY or CC BY-SA, checked by eye, already in the public bucket
   `images` at `group-photos/<slug>.jpg` (at most 1,200 px wide, not cropped), with author, licence, licence link, Commons
   page and date. Never the photos of `apps/quiz/public/idols` (their source is not recorded), never any other image.
   The 18 soloists or members: bibi, chungha, heize, hwasa, hyuna, iu, jay-park, jennie, jeon-somi, jimin, jungkook, psy,
   rose, sunmi, taeyang, taeyeon, v-bts, zico. The 41 others are groups.
3. Catalog: 1 photo per subject, so 4 editions per subject, groups included: Standard (C), Stage (U), Holo (R),
   Gold (UR). Era (SR) and Full Art (L) are locked pockets with the plan's sentence for `one`:
   "Only one free photo of this idol exists so far." (for a group the same reason applies; the sentence stays the plan's).
   No event cards. About 236 cards, BV1-0001 to about BV1-0236. Names: the official name from the `groups` table (and the
   `idols` row of the person for a soloist or member). Debut year: from the database. Adult subjects only.
   The catalog SQL resolves names, debut years and ages AT APPLY TIME from the `groups` and `idols` tables by slug, and
   numbers the included subjects contiguously in a fixed order (decision 2: sections A to Z by section name; inside a
   section the people, then the group card; 4 numbers per subject in the order C, U, R, UR). Its `-- Verify` lines show
   the real counts and every excluded slug with the reason.
   Adult rule (decision 17): a soloist or member is in when the person's `idols.birth_date` is known and at least 18 years
   before the apply date; a group is in when ALL its active `idols` rows have a known birth date at least 18 years before.
   Anything unknown is left out (fail closed).
4. Odds: an edition with no card can never come out. The odds shown are those of the REAL catalog, recomputed from the
   plan's: the plan's weights of the rarities that have at least one card in packs, renormalised to 100. With C, U, R and
   UR only: C 60/95.2 = 63.03 %, U 24/95.2 = 25.21 %, R 10/95.2 = 10.50 %, UR 1.2/95.2 = 1.26 %. The fifth card: a Common
   becomes an Uncommon, so U (24 + 60)/95.2 = 88.24 %, R 10.50 %, UR 1.26 %. The page writes both lines and this
   calculation in plain words; the numbers are computed from the catalog, never typed. Kind weights (idol 75, group 15)
   apply among the kinds that have a card of the drawn rarity. Test: an absent edition is never drawn.
5. Crop: card format 5.5:8.5 (the K-pop photocard, owner decision; the prototype drew 63:88), around a focal point the
   owner sets in the images admin (default 50/30 for a person, 50/50 for a group). The credit says "cropped". A photo
   whose 5.5:8.5 crop is narrower than 640 px (twice a 320 px card, the largest the site shows) is flagged "too small for
   2x" in the admin and in the report.
6. The credit is displayed in the four places of the plan (plan v3 replaces the decision of 2026-10-06 not to show it).
   `group-photo-credits.ts` keeps its own job; the cards read the same facts from the catalog rows.
7. Card files: the owner's script `out/cards-tool/publish.mjs` (local) reads the focal points (with the key he types),
   crops the bucket source `images/group-photos/<slug>.jpg` to 5.5:8.5 at 1x (320 x 495) and 2x (640 x 989) WebP, shows a
   preview contact sheet, and with `--publish` uploads to the public bucket `cards` and records which focal point each
   file was cut at. Until a file exists for the current focal point, the site shows the source photo cropped in CSS
   (`object-fit: cover`, `object-position` from the focal point), so nothing is ever broken.

## After adversarial review 1 (ORCH, 2026-11-12)

- SQL files for the owner, in this order: `001-schema.sql`, `002-functions.sql`, `003-rls.sql`, `101-catalog.sql` (undo in
  reverse with each `.rollback.sql`). The `100-bucket-cards.sql` of lane D's second brief is deleted: 003 creates the
  bucket `cards` (public, WebP only, 2 MB a file). 001 now creates a ninth table, `cards_bonus_earned`, and 002 a tenth
  function, `cards_bonus_record` (decision 28).
- Bonus packs come from Kpopdle wins only (decision 28); rewarded ad tickets open a pack from 10 seconds to 1 hour after
  issue (decision 29).
- The owner's card file script is tracked at `apps/quiz/scripts/cards/publish-card-files.mjs` (out/ is git-ignored, so a script
  there would never reach the owner's checkout). It writes its preview under `out/cards-tool/preview/` (ignored). The project
  address comes from `CARDS_SUPABASE_URL`, else `NEXT_PUBLIC_SUPABASE_URL`, else `apps/quiz/.env.local`; the service key is typed
  at the prompt for `--publish` only. `cards_photos.file_url` is the Commons address of the original file (no project host in the
  repository); the site shows the bucket copy through `source_path`.
