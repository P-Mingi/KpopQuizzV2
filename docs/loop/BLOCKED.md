# BLOCKED (message bus)

The worker writes here ONLY when it hits a real blocker (ambiguity it cannot
resolve from the spec/code, a gate it cannot pass honestly, or a decision that
belongs to the owner) and then STOPS. It never guesses through a gate.

Format for an entry:

```
## <step-id> - <one-line blocker>
- What is blocked: ...
- Why (the specific gate / ambiguity / owner decision): ...
- Options (each with its trade-off): 1) ...  2) ...  3) ...
- Recommendation: ...
- Proof / context: docs/proofs/<step-id>/ (if any)
```

When resolved, the worker clears the entry and continues.

---

## vbuilder3-step3 - image rail needs migration 146 (owner-run)

- What is blocked: the whole image ingest rail (ingest-copy into our storage + the
  moderation queue). It reads/writes new columns on `verse_space_assets` that do not exist
  yet: `hash`, `mime`, `source`, `source_url`, `reviewed_by`, `reviewed_at`, plus the extended
  `kind` ('image') and `status` ('hidden') enums and a dedupe index.
- Why (owner decision / gate): schema changes are OWNER-RUN (law 17); the worker never writes
  `supabase/migrations/` and never runs SQL. The migration must be applied before the ingest
  API, the content-tab live image field, the queue, and the fail-closed renderer can be built.
- The migration (written, ready for the owner): **docs/pending-migrations/146_verse_block_images.sql**.
  It EXTENDS the existing sticker/banner rail (`verse_space_assets` + the `verse-space-assets`
  bucket, migration 139) exactly as the mission directs - NO new table, NO new bucket. Cowork
  reviews every line.
- Recommendation: owner runs 146 (idempotent: `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF
  EXISTS` then re-add, `CREATE ... IF NOT EXISTS`), then re-invoke the loop. Everything else is
  app code and reuses what already exists (recon confirmed).

BUILD PLAN once 146 is applied (all reuse; infra confirmed by recon):
  1. INGEST API `POST /api/verse/space-image` (curator-gated via `canCurateSpace`, rate-capped
     via `underRateCap`): (a) file upload OR (b) paste-a-URL where the SERVER fetches + copies.
     Reuse the sticker route's `sharp` re-encode (STRIPS EXIF) + SVG-reject + magic-byte check;
     add sha256 dedupe (Node crypto) against `(space_id, hash)`; HARDEN the SSRF guard (reject
     private/link-local IPs, not just a substring) since the quiz `external_url` branch is naive;
     write bytes to `verse-space-assets` at `images/{spaceId}/{uuid}.{ext}`, insert a
     `verse_space_assets` row (kind='image', source, source_url, hash, status='active'). GIF ok,
     bigger cap than stickers. Return a `.supabase.co` URL that passes `isConfiguredImageHost`.
     The rendered page NEVER carries `source_url`.
  2. CONTENT TAB image field goes live (content-tab.tsx `image` case): preview thumb + replace +
     remove, calling the ingest API. Store only our storage_path in the block props.
  3. QUEUE at /admin-side (documented design-exemption: plain dense bordered rows: thumb, space,
     uploader, date, Hide, Remove) reading `verse_space_assets WHERE kind='image'`.
  4. TAKEDOWN fail-closed: Hide -> status='hidden' (renderer renders nothing for non-active, not a
     broken img); Remove -> delete storage object + clear the block-prop usages. `/dmca` page
     (template: `/terms`) + footer link (`footer.tsx` Support column) + `KNOWN_ROUTES` + sitemap.
  5. PRIVACY/SAFETY: `uploaded_by` recorded; curator+ gate; per-user/day rate cap; fail-closed on
     any read error.

Proof / context: docs/proofs/vbuilder3-step3/ (created when the build runs). Recon map in the
step-3 REPORT.
