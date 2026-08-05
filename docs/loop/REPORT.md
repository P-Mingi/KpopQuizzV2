# /caveman report - V-BUILDER-3 step 3 (the image rail, L-047): DONE

Owner applied migration 146; I built the full image rail on top of the existing sticker
storage (no new table, no new bucket), proved every acceptance item, committed step 3.
Nothing pushed. STOP before step 4 (members editor, waits for co-design 8).

THE LAW held: any source allowed, but every image is ingest-COPIED into our storage
(never hotlinked), EXIF stripped, hash-deduped; post-hoc moderation with one-click
takedown; a hidden/removed image renders nothing (never a broken img); DMCA page + process.

## What shipped

- INGEST API `POST /api/verse/space-image` (+ PATCH hide/unhide, DELETE remove).
  Security core in `src/lib/verse/image-ingest.ts`: SSRF-hardened server fetch (https only,
  DNS-resolved private/link-local/IPv6 block, manual-redirect reject, timeout, size cap) +
  `reEncode` (sharp) that rejects SVG/non-image, allows JPG/PNG/WebP/GIF (animated GIF kept),
  strips EXIF by re-encode, returns a sha256 for dedupe.
- CONTENT-TAB image field is LIVE (`content-tab.tsx` `case 'image'` -> `ImageField`): upload
  from computer OR paste any URL + Fetch, live preview thumb, Replace, Remove. Threaded
  `groupId` through style-panel -> content-tab. Stores only our storage_path in block props.
- FAIL-CLOSED render gate `src/lib/verse/space-image.ts` `resolveSpaceImage`: returns a URL
  only for an `active` `image`; hidden/removed/unknown/external -> null. The one sanctioned
  path from a stored image to a URL (emits getPublicUrl on our bucket only).
- MODERATION QUEUE `/admin/space-images` (admin-gated, noindex, design-exemption): plain dense
  rows thumbnail|space|uploader|source|date|status|actions; one-click Hide (keeps object) /
  Unhide / Remove (deletes object). `space-image-queue.tsx`.
- DMCA: `/dmca` (indexable, one H1, allowlisted, in sitemap). Linked from BOTH footers -
  Play footer Support column ('DMCA'), Verse footer covenant column ('Image takedown').

## Acceptance receipts (proofs in docs/proofs/vbuilder3-step3/)

1. URL ingest -> our storage, only our URL rendered, EXIF stripped, dedupe:
   ingest-e2e.txt (pasted an i.ytimg.com URL -> id 25 copied to our storage, source_url kept as
   provenance only), render-only-our-url.txt (grep: source_url read only by the noindex queue;
   resolveSpaceImage emits our bucket only; LIVE DOM: previewIsOurStorage=true,
   anyExternalYtimgInPanel=false), ingest-core.txt (EXIF marker gone after re-encode; same bytes
   twice = same hash/one object).
2. Upload + GIF proven; non-image/oversize/SVG rejected with human sentences:
   ingest-core.txt (GIF via animated:true; SVG/non-image/oversize rejected) + route + image-ingest
   human messages ("That URL is not an image." / "That image is too large (max 10MB)." / "SVG is
   not allowed. Use JPG, PNG, WebP, or GIF." / redirect -> "Paste the direct image URL instead.").
3. Queue: new image appears; Hide removes it from the rendered page immediately (fail-closed);
   Remove deletes object + usage: render-gate.txt (active->url, hidden/removed->null),
   ingest-e2e.txt (PATCH hide 200 status=hidden object KEPT; DELETE 200 object verified GONE).
4. /dmca live, linked, allowlisted, one-H1; check:routes green: gates.txt (h1=1, index:true,
   both footers, allowlist + sitemap, routes 338).
5. Role gate + rate cap + privacy fail-closed: ingest-e2e.txt (unauth ingest -> 403; rate cap
   underRateCap 100/user/day -> 429 "Daily image limit reached."; uploaded_by recorded; reader
   fail-closed).
6. Published parity + gates + screenshots: gates.txt (no published module/block renderer touched;
   resolveSpaceImage has 0 render importers; only intended render diff = the two footer links;
   /verse/bts live 200, one H1, Members intact, zero external/storage image urls). Gates all
   green: tsc 0, routes 338, verse-tokens clean, vbuilder1-parity lossless, vpages 55/0,
   vtemplates, vtext-fold, vb2-stable-id, vb3-content, vb3-schema. Em-dash scan clean on the whole
   diff. Screenshots verified live in-session: the content-tab Photo field with a fetched preview
   (thumb + Replace/Remove) and the dense moderation queue with Hide/Remove.

## Notes / honest scope

- Block-image RENDERING on published pages is wired in later steps (image block = step 6, members
  editor = step 4); step 3 delivers the RAIL (ingest, live field + preview, moderation, DMCA) and
  the render gate, proven fail-closed and ready to consume. That is why no published page carries a
  block image today - the grep proof is trivially green now and enforced by construction later.
- Migration 146 applied by the owner (schema owner-run, law 17). No SQL run by the worker.
- Test artifacts (image ids 21/22/24/25) cleaned up: 0 image rows remain, bts storage clean.

## STOP

Step 3 committed (source + proofs + REPORT + cleared BLOCKED). Nothing pushed. Stopping before
step 4 (members editor) which waits for co-design 8.
