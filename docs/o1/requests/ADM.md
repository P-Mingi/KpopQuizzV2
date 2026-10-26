# Requests of ADM back (admin images on otakuquiz.org, owner 2026-10-26)

ADM back added `docs/pending-migrations/multisite/018-entity-images.sql` (+ rollback), `apps/quiz/src/lib/entity-images/**`,
`apps/quiz/src/app/api/admin/images/**`, `scripts/anime/images/promote.mjs` (+ test) and this file. No client module of kpopquiz.org changed
(server files only; the routes answer 404 on every build but the anime one). Nothing in docs/o1/contracts or docs/launch was edited.

1. SQL-ORDER (`docs/launch/o1/SQL-ORDER.md`). New row after 011 (014 stays the openings file; the numbering of the rows below does not move):
   `| 14b | M/018-entity-images.sql (ADM back) | P5, after 14 (011); must be applied before K5 step 3c | single | 001 | table entity_images with RLS on; anon has no insert and no update, may select only the display columns; bucket entity-images public, 4 MB, image/webp | M/018-entity-images.rollback.sql (refused while a row or a file exists) | V6 |`
   Applied twice on o1-scratch, rolled back once (and once more: idempotent), applied again, then applied on o1-dev. Checks run on scratch: anon cannot insert, authenticated
   cannot insert, `select *` is denied to anon (column grants), `select slug, path, focal_x` works. VERIFY.md (V6): the four queries of the file header, expected `entity_images t`;
   `f, f, f, t`; `entity-images, t, 4194304`; `0`.
2. RUNBOOK (`docs/launch/o1/RUNBOOK.md`), section K5, new step after 3b. Text for ORCH to paste:

   > 3c. **K5.3c** Promote the admin images (only if you uploaded images on o1-dev, from /admin on the preview of otakuquiz.org). Needs `M/018-entity-images.sql` (SQL-ORDER row 14b).
   > It copies the files of the bucket `entity-images` and the rows of `public.entity_images` from o1-dev to production; it never deletes anything there and a second run changes nothing.
   > Run it before you delete the o1-dev branch (After launch). The production key is typed into your shell, never saved:
   >
   >     read -rs PROMOTE_TARGET_SERVICE_KEY; export PROMOTE_TARGET_SERVICE_KEY      # production service role key (Settings, API)
   >     export PROMOTE_TARGET_URL=https://<the 20 character production project ref>.supabase.co
   >     scripts/o1/env.sh dev -- node scripts/anime/images/promote.mjs              # dry run: prints the plan, writes nothing
   >     scripts/o1/env.sh dev -- node scripts/anime/images/promote.mjs --apply      # writes the files first, then the rows
   >     unset PROMOTE_TARGET_SERVICE_KEY PROMOTE_TARGET_URL
   >
   > Without `scripts/o1/env.sh`, export `PROMOTE_SOURCE_URL` and `PROMOTE_SOURCE_SERVICE_KEY` (o1-dev's) instead. The dry run prints three lines of counts
   > (`rows: N insert, N update, N identical`, `files: N copy, N overwrite, N identical`). It refuses when source and target are the same project and when the source is production.
   > Check: dashboard, Storage, `entity-images`: the folder `anime/` exists; `q "select kind, count(*) from public.entity_images group by 1"` matches the dry run.
   > Back: `delete` the rows you do not want from the admin page of otakuquiz.org (it removes the files too), or run `M/018-entity-images.rollback.sql` after emptying the bucket and the table.

3. Contract for ADM front (the routes, all under `/api/admin/images`, anime build only, 404 for anyone who is not in `ADMIN_USER_IDS` and on every other build; writes also refuse
   a foreign `Origin` with 403). Answers: `{ ok: true, ... }` or `{ error: "plain words", code: "<machine code>" }`.
   - `GET list?site=anime` -> `{ ok, site, counts: { series, seriesWithImage, seriesWithUpload, characters, charactersWithImage }, series: [{ slug, name, published, image, bundled: { url, alt } | null, source: 'upload' | 'bundled' | 'none', characterCount, characterImageCount, characters: [{ slug, name, role, status, image }] }] }`
   - `POST upload` multipart: `kind`, `slug`, `file`, `meta` (a JSON string `{ source_url, author, license, license_note }`; the four fields may also be sent as separate form fields) -> `{ ok, image }`
   - `POST import` json `{ kind, slug, url, meta }` -> `{ ok, image }`
   - `PATCH focal` json `{ kind, slug, x, y }` (0 to 100) -> `{ ok, image }`
   - `DELETE` at `/api/admin/images` or `/api/admin/images/delete`, json `{ kind, slug }` (or `?kind=&slug=`) -> `{ ok, image }` (the row that was removed)
   - `image` = `{ kind, slug, url, url2x, width, height, focalX, focalY, license, author, sourceUrl, licenseNote, updatedAt }`; `license` is one of `cc0`, `public_domain`, `cc_by`, `cc_by_sa`, `own_photo`, `licensed`, `other`.
   - The slug of a character is `<series slug>/<character slug>` (997 distinct character slugs for 1000 characters: a slug is unique per series only). A series slug is the `groups.slug`.
   - Status codes: 400 validation (`bad_kind`, `bad_slug`, `bad_meta`, `bad_focal`, `bad_url`, `blocked_address`, `too_many_redirects`, `bad_request`), 404 `unknown_entity` or `no_image` (a focal point or a delete on a series that only has the bundled photo), 413 `too_large`, 415 `unsupported_type`, 422 `invalid_image` or `image_too_small`, 502 `storage_failed` or `fetch_failed` or `dns_failed`, 504 `timeout`.
   - Display (server): `getSeriesImage(slug)` and `getCharacterImage('<series>/<character>')` of `@/lib/entity-images/display` return `DisplayImage | null` (owner image, else the bundled series photo, else null); `url`/`url2x` are
     public bucket URLs (`next.config.ts` already allows `*.supabase.co/storage/v1/object/public/**` for next/image), `focalX`/`focalY` are percents for `object-position`, `attribution` is set for CC BY and CC BY-SA.
     Reads are cached one hour under the tag `entity-image:anime:<kind>:<slug>`; every write revalidates it at once.
4. `docs/o1/OWNERSHIP.json` and `docs/o1/lanes.json`: a lane `ADM` (back and front) owning the paths above, and `apps/quiz/e2e/o1/ADM/images-api.o1.ts` as its spec (it skips itself unless `O1_ADM_URL` is set,
   so gate-checks.sh does not fail on it; run it with the line at the top of the file).
5. Production env of the otakuquiz project: `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_USER_IDS` must be set (the routes use the first to write, the second to gate). Nothing else is new.
