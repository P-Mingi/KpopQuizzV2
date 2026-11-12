# Lane D (DATA): the data run, the photo census and the catalog

Read first: `docs/o1/briefs/CARDS-CONTRACT.md`, `docs/o1/briefs/CARDS-DECISIONS.md`, `docs/design/cards/CARDS-PLAN-v3.md`
(sections "Rarity and photos", "Catalog at launch", "Credits", "Where the free photos come from").
Worktree `.claude/worktrees/o1-carddata`, branch `o1/carddata`. Commit with `git -c o1.agent=CARDS` (the id of all four card lanes in OWNERSHIP.json). Never push.

## Network rules (hard)

- Only these hosts: `query.wikidata.org` (SPARQL), `www.wikidata.org/w/api.php`, `commons.wikimedia.org/w/api.php`,
  `upload.wikimedia.org` (thumbnails only, for the preview sample). Nothing else: never Fandom, kprofiles, AniList, Pinterest,
  YouTube, Unsplash, Pexels, Pixabay, Google Images. Flickr and DVIDS only through the files already on Commons.
- Every request sends `User-Agent: BunnyverseCards/1.0 (https://bunnyverse.org; hello@kpopquiz.org)` (the owner asked for
  this address). One request at a time, at least 1 second apart, `maxlag=5` on the APIs, back off on 429 or 503
  (Retry-After, then doubling). SPARQL queries kept small (batch by group). Cache every answer under `out/cards-data/cache/`
  so a rerun costs nothing.
- No write anywhere outside this worktree and `out/`. No database, no connector, no secret.

## Step 1: the data run (`apps/quiz/scripts/cards/data-run.mts`)

About 1,200 idols, the high case of the plan. An idol enters when ALL hold, read from Wikidata:
- a human (P31 Q5) who is a CURRENT member (P463 statement without an end time P582, and not deprecated) of a K-pop group
  (a musical group with genre K-pop, or a South Korean boy band or girl group); list the group classes you use and why;
- born (P569) at least 18 years before 2026-11-12, with day precision or year precision clearly before 2008; an idol whose
  birth date is missing or ambiguous is left out and listed (never guessed);
- at least one free photo, decided by step 2 (keep the candidates, filter after the census).
Keep per idol: QID, stage name (the English label, else the label Wikipedia uses), group QID and name, membership start
(P580) if any, Commons category (P373), image (P18). Groups: QID, name, debut (P571 inception or P2031 work period start),
Commons category, image. The birth date is kept ONLY in `out/cards-data/` (local, git-ignored): the site and the repository
show none.

Write `out/cards-data/VERIFY-MEMBERS.md` (local only, never committed: the repository is public) for the owner: one line
per idol with the Wikidata membership statement link and the English Wikipedia article link for checking the membership;
and a second list, the conviction check: an idol appears in it only when Wikidata records "convicted of" (P1399), with the
statement link and its references. Nothing else about anyone's life, no allegation, no news search, no opinion. Say at the
top how many lines there are and an honest time estimate.

## Step 2: the photo census (`apps/quiz/scripts/cards/census.mts`)

For every idol, group and event candidate, read the files of its Commons category (depth 1, plus the subcategory named after
the person if the category is a group's) and its P18, with `prop=imageinfo&iiprop=url|size|extmetadata|timestamp` and
`prop=categories|templates`. Per file record: source page, file URL, width, height, author (Artist, HTML stripped), author
URL if any, LicenseShortName, LicenseUrl, the date taken (DateTimeOriginal) or the event date from its categories, the event
name from its categories, the original source (Flickr, Korea.net, DVIDS, YouTube, own work) from the Credit field and
templates.

Licence rules (plan): auto-approved when ALL hold: licence is CC0, public domain (incl. PD-USGov for DVIDS), CC BY or
CC BY-SA (any version), or KOGL Type 1; a named author (not empty, not "unknown"); no deletion request (no "Deletion
requests" category, no delete/copyvio template); for a file from YouTube or Flickr, the Commons licence review passed
(the reviewed template or category); not "news only" in a Korea.net caption; short side at least 600 px (decision 14).
Everything else that is still free goes to the review queue (status `pending` with a short reason); NC, ND, fair use and
non-free files are dropped. Expect about 15 to 20 percent pending (the plan); report the real number.

Selection per idol: photo 1 the best solo portrait (largest, portrait or square, the person's own category); photo 2 from
ANOTHER event or date; photo 3 from a third, at least 1,000 px on the short side (Full Art). Editions per the photo rule
(1 = 4 cards, 2 = 5, 3 = 6). Lock reasons for missing editions: `one`, `sameday`, `crop` (only in group shots), `newg`
(debut in the last 24 months, decision 3). Never `hiatus` (decision 4). Groups: 1 photo, 4 editions. Events: about 100
K-pop events (award shows, music shows, festivals, concerts) whose Commons category holds a free stage or venue photo,
1 photo, 3 editions. Default crop: focal point 50/30 for portraits, 50/50 otherwise.

Outputs: `out/cards-data/census.json` (everything, local), and the committed `docs/design/cards/data/catalog.json`: the
entities, the selected photos with their credits, the lock reasons, the card list with numbers (decision 2 for the order),
no birth date. A `docs/design/cards/data/SUMMARY.md` with the real counts: idols, groups, events, cards, photos
auto-approved and pending, idols left out and why (counts only).

## Step 3: the catalog SQL and the owner's upload script

- `apps/quiz/scripts/cards/build-catalog-sql.mts` writes `docs/pending-migrations/cards/101-catalog-entities.sql`,
  `102-catalog-photos-part-K.sql`, `103-catalog-cards-part-K.sql` (+ rollbacks), at most 1,000 rows each, ONE
  `do $cNNN$ ... end $cNNN$;` block each with `-- Verify` lines, idempotent upserts into the tables of the contract
  (lane C writes the schema 0NN files; use its column names exactly). Pending photos are written with status `pending`
  and their cards with `in_packs = false`.
- `out/cards-tool/publish.mjs` (local, git-ignored, run by the owner on this Mac): reads `catalog.json`, downloads each
  approved photo as a Commons thumbnail (1,200 px), crops to the card ratio around the focal point with `sharp` (already in
  node_modules), writes WebP card and thumbnail files; with no flag a preview into `out/cards-tool/preview/` plus an
  `index.html` contact sheet; with `--publish` it asks for the service key on stdin (not echoed, never written, never
  printed) and uploads to the public bucket `cards` at the paths of the catalog. A bucket SQL file
  `docs/pending-migrations/cards/100-bucket.sql` creates the bucket (public read, 2 MB, webp only). Run the preview
  yourself on a sample of 20 photos and say so.
- Tests (vitest, no network): the licence classifier on real extmetadata samples saved as fixtures, the selection and
  lock-reason rules, the SQL files (one DO block, Verify lines, row caps), the 18+ rule on edge dates.

## Report (to ORCH, in English, short)

Commits; the real counts; the pending percentage; the group classes used; anything left out and why; the time the runs took;
what you could not do.
