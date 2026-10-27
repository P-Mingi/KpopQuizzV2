# Admin images on otakuquiz.org, part 1: SQL, storage, server routes, display data, promotion script (owner, 2026-10-26)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-admback, branch o1/admback (= o1/integration). Q = apps/quiz/src,
M = docs/pending-migrations/multisite, S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1. Part 2 (the UI)
runs in parallel against the API below; keep its shapes exactly. Read this brief, Q/lib/admin.ts (ADMIN_USER_IDS), M/016 and 017
(header, idempotence, rollback style), Q/lib/anime/series-images.generated.ts and how it is read, the character tiles
(Q/components/anime/character-tiles.tsx), and the code you change.
## Rules
No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets; never print a key, URL with a key or
password (S/env.sh masks). SQL: o1-scratch first, then o1-dev (S/env.sh <target> -- psql -v ON_ERROR_STOP=1). Never `git add -A`.
No en or em dash, no emoji. kpopquiz.org unchanged (two kpop chunk scripts, parity).
## Do
1. M/018-entity-images.sql (+ rollback): table public.entity_images (id, site_id, kind 'series'|'character', slug, path, width,
   height, focal_x, focal_y (0 to 100), source_url, author, license (cc0, public_domain, cc_by, cc_by_sa, own_photo, licensed,
   other), license_note, created_by, created_at, updated_at; unique (site_id, kind, slug)); RLS on; no write policy (service role
   only); anon and authenticated may select only the display columns (column grants: slug, kind, site_id, path, width, height,
   focal_x, focal_y, license, author, source_url, license_note, updated_at). A Storage bucket 'entity-images' public read, no
   insert/update/delete policy for anon or authenticated. Apply on scratch twice and rolled back once, then on o1-dev. Give the
   SQL-ORDER line (after 011) in docs/o1/requests/ADM.md.
2. Server routes under Q/app/api/admin/images/ (each checks the signed-in user is in ADMIN_USER_IDS on the server; else 404):
   GET list?site=anime (series and characters with current state and counts), POST upload (multipart: kind, slug, file, meta),
   POST import (json: kind, slug, url, meta), PATCH focal (kind, slug, x, y), DELETE (kind, slug). meta = { source_url, author,
   license, license_note }: required before saving (license_note required for 'other'). Answers { ok, image } or { error }.
3. Processing: sharp re-encode to WebP, EXIF stripped, fixed sizes: cover = the series photo box (736x981) and 2x (1472x1962);
   portrait = the character tile box (find it; 3:4 if none) and 2x; input max 8 MB; image MIME only, checked from bytes (magic
   numbers), not from the name. Import by URL: https only; refuse localhost, private, loopback, link-local, multicast and reserved
   IPv4 and IPv6 after DNS resolution and again after each redirect (max 3); 10 s timeout; 8 MB cap while streaming; content must
   decode as an image. Nothing from the URL is stored for display: the bytes are copied into the bucket.
4. Display data: one server function per kind returns the image for a slug in this order: entity_images row, else the bundled
   series photo (series only), else null (the neutral placeholder). Cached with a tag per slug; every write revalidates it.
5. scripts/anime/images/promote.mjs: copies the bucket files and the entity_images rows from o1-dev to production, idempotent
   (upsert on site_id, kind, slug; skip identical files by hash), --dry-run by default printing the plan, --apply to write;
   production credentials come only from the owner's environment at run time (never a file of ours); refuses if source and target
   are the same project. Add the RUNBOOK step text for K5 in docs/o1/requests/ADM.md (ORCH writes the RUNBOOK).
## Checks
Unit tests: admin gate (non admin 404), validation, MIME sniffing, size caps, SSRF cases (private IPs, IPv6, redirect to a private
host, too many redirects, non https), WebP output and EXIF absent, order of display fallback, revalidation; promote dry run on a
fixture. tsc 0, full vitest green (--testTimeout=30000), check.sh ok, three builds, two kpop chunk scripts. One e2e on o1-dev with
the dual fixture (only if it is an admin in o1-dev's ADMIN_USER_IDS, else a test admin id set for the run): upload, import, focal,
delete. Commits on o1/admback ("o1: ADM back ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 8 lines: sha, SQL path, routes, sizes chosen, SSRF tests, promote script, checks.
