# Lane D, second brief: the catalog of the 59 photos and the owner's file script

Read first: `docs/o1/briefs/CARDS-AMEND-1.md` (it wins), then `CARDS-CONTRACT.md` section 2, `CARDS-DECISIONS.md`
(2, 16, 17, 18). The first brief (data run, census) is cancelled: do none of it, no network to Wikidata or Commons.
Worktree `.claude/worktrees/o1-carddata`, branch `o1/carddata`. Commit with `git -c o1.agent=CARDS`. Never push.

## Inputs (the only ones)

`docs/design/growth-v12/run/group-photos.json` (59 rows: slug, name, bucket url, width, height, Commons page, file,
author, licence, licence url, date) and `apps/quiz/src/lib/ux-v1/a0/group-photo-credits.ts`. Check they agree (59 slugs,
same author, licence and page); any mismatch is reported, not fixed silently.

## Work

1. `docs/design/cards/data/subjects.json`: the 59 subjects in the amendment's order: slug, kind (`idol` for the 18 listed
   in the amendment, `group` for the 41 others), the photo (source `commons`, bucket path `group-photos/<slug>.jpg`,
   width, height, Commons page, file, author, licence, licence url, share_alike, date), the default focal point
   (50/30 person, 50/50 group), `small_2x` (the widest 5.5:8.5 crop of the bucket file narrower than 640 px). A
   generator script in `apps/quiz/scripts/cards/` writes it from the two inputs.
2. `docs/pending-migrations/cards/100-bucket-cards.sql` (+ rollback): the public bucket `cards` (WebP only, 2 MB).
3. `docs/pending-migrations/cards/101-catalog.sql` (+ rollback), generated from `subjects.json`, ONE `do $c101$ ... end
   $c101$;` block, additive and idempotent, `-- Verify` lines at the end. At apply time it resolves, by slug, the
   `groups` row (official name; debut year from the database: a debut year column if the table has one, else the year
   of `inception_date`), and for a person the `idols` row (the active row of that group with the lowest `ord`, else the
   active idol of another group whose name equals the group's name; decision 18 for the group line). It applies the adult
   rule of decision 17 with `current_date - interval '18 years'`, leaves out what fails or is unknown, numbers the
   included subjects contiguously (decision 2: sections A to Z by section name, the people of a section before its group
   card, four numbers per subject in the order C, U, R, UR, `BV1-0001` onward), and writes `cards_entities`,
   `cards_photos` (status `approved`: checked by eye in October), `cards_catalog` (`in_packs` true) and the lock reasons
   `{"SR":"one","L":"one"}`. Verify lines: subjects in, cards per edition, the highest number, and each left-out slug with
   its reason. Use lane C's table and column names exactly: merge `o1/cardcore` (`git merge --no-edit o1/cardcore`) and
   read its `docs/pending-migrations/cards/0NN-*.sql`; lane C is adding the photo columns of the amendment (source path,
   width, height, focal, file focal, small_2x): merge again before you finalise.
4. A pglite proof (`apps/quiz/src/lib/dle/pglite-harness.ts` shows how; `@electric-sql/pglite` is installed) that runs
   lane C's schema files then `101-catalog.sql` on fixture `groups` and `idols` rows: an adult soloist in, a member of
   another group with the right group line, a group with one minor member out, a group with an unknown birth date out,
   a missing slug out, contiguous numbers, 4 cards per subject, the Verify counts. Plus a test that `subjects.json` has a
   complete credit for all 59 (author, licence, licence url, Commons page).
5. `out/cards-tool/publish.mjs` (local, git-ignored, the owner runs it): with no flag it reads `subjects.json`, downloads
   the 59 bucket files from the public URL, crops each to 5.5:8.5 around the focal point with `sharp` (already in
   node_modules), writes 1x 320x495 and 2x 640x989 WebP plus an `index.html` contact sheet under
   `out/cards-tool/preview/`; with `--publish` it asks for the service key on stdin (not echoed, never printed, never
   written), reads the current focal points from `cards_photos`, uploads to the bucket `cards` at
   `<slug>-<fx>-<fy>@1x.webp` and `@2x.webp`, and sets `file_focal_x`, `file_focal_y` on the row. Run the preview
   yourself (it only reads the public bucket) and say so; never run `--publish`. A short `out/cards-tool/README.md`.
6. `docs/design/cards/data/SUMMARY.md`: 59 candidates (41 groups, 18 people), cards at most 236 (4 per subject), the
   small_2x list, and a line saying the final count after the adult rule is the Verify output of `101-catalog.sql`.

## Rules

No network except the public bucket files for the preview. No database other than pglite or a throwaway local
Postgres. No connector or CLI (supabase, vercel, gh). No secret. No new dependency. No dash. Ratchet law. Tools from
`apps/quiz`: `../../scripts/o1/env.sh offline -- ./node_modules/.bin/tsc --noEmit -p tsconfig.json`,
`../../scripts/o1/env.sh offline -- ./node_modules/.bin/vitest run <files>`, `../../node_modules/.bin/tsx <script>`.
No `next build`, no full suite.

## Report (to ORCH, English, short)

Commits, the SQL files in apply order, the proofs and what they prove, the small_2x count, mismatches found, anything
not done.
