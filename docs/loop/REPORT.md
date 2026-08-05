# /caveman report - V-BUILDER-3 step 3 (image rail): BLOCKED on the owner migration 146

Step 3 (the image ingest rail, owner image law L-047) needs a schema change, and schema changes
are owner-run (law 17). I recon'd the existing infra, wrote the migration, and STOP for the owner
to run it. Nothing pushed. See docs/loop/BLOCKED.md.

## Recon (what already exists - the rail is ~80% reusable)

- STORAGE: bucket `verse-space-assets` + table `verse_space_assets` (migration 139) already hold
  sticker/banner uploads with the exact service-role-write, public-read-when-active pattern. The
  mission's "extend/reuse the sticker rail" = extend THIS.
- EXIF strip + SVG-reject + resize: `api/verse/sticker/route.ts` via `sharp` (reuse verbatim).
- Fetch-a-URL + copy-into-bucket: `api/quiz/upload-image/route.ts` `external_url` branch (reuse,
  but its SSRF guard is a naive substring - I will harden it, and it does not strip EXIF).
- Role gate `canCurateSpace`, rate limiter `underRateCap` (verse/moderation.ts) - both ready.
- `isConfiguredImageHost` allows the `.supabase.co` suffix, so OUR ingested storage URLs pass the
  image allowlist automatically - which is exactly why ingest-COPY (not hotlink) is the right call.
- `/dmca` has a clean template (`/terms` page + `footer.tsx` Support column + `KNOWN_ROUTES` +
  sitemap). Content-hash dedupe is the one utility to BUILD (Node crypto).

## Migration written (owner-run): docs/pending-migrations/146_verse_block_images.sql

Extends `verse_space_assets` (NO new table, NO new bucket):
- `kind` enum gains `'image'`; `status` enum gains `'hidden'` (a takedown that keeps the object).
- new columns: `hash` (sha256, dedupe), `mime`, `source` ('upload'|'url'), `source_url` (the
  ORIGINAL external URL - record only, never rendered), `reviewed_by`, `reviewed_at`.
- a partial-unique index `(space_id, hash)` for live rows (same image twice = one object) + a
  moderation-queue index. Idempotent (IF NOT EXISTS / DROP-then-add).

## Why blocked (not thrash)

The ingest API, the live content-tab image field, the queue, and the fail-closed renderer all
read/write those new columns; building against an un-applied schema would be guessing through a
gate. The BLOCKED.md carries the full post-migration build plan so the next pass is a straight
build with zero re-discovery.

## STOP

Owner runs migration 146, then re-invoke the loop. I then build the ingest rail (grep-proof that
the rendered HTML carries only our storage URL, EXIF strip + dedupe + GIF proofs, the queue with
fail-closed hide/remove, /dmca + footer, role gate + rate cap), prove it, commit step 3, and STOP
before step 4 (members editor, waits for co-design 8). Nothing pushed.
