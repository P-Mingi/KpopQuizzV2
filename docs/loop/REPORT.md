# REPORT - TIERLIST phase 2.5: real photos in the share card + the create wizard + ImportModal. No push.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). No DDL applied (146 stays for the owner), no DB
writes, no push. Built and proven on `next build` + `next start` (:3021), never dev. Proofs:
`docs/proofs/tierlist-p2.5/`. No em dashes. The phase closed the two owner-validated gaps and
nothing else.

## FIX 1 - REAL PHOTOS IN THE SHARE CARD (the headline fix)

The OG route (`src/app/api/og/tier-list/route.tsx`) now renders each placed bank item as its
real photo, not a grey initials tile.

- New isomorphic helper `src/lib/tier-list/og-faces.ts` `fetchFaceImages(faces, opts)`: prefetches
  only the faces the card actually draws (sliced to 7 per tier, 9 for story), in parallel with
  `Promise.allSettled` and a per-image 2500ms `AbortSignal.timeout`, converts each to a data URI,
  and returns id -> data URI. It dedups by URL (two tracks sharing an album cover fetch once),
  caps total fetches (49 normal / 63 story), guards content-type + a 3MB size ceiling, and
  resolves local `/idols/...` paths against the request origin (idol photos are served from
  /public, so a relative path must be made absolute before fetch). It never throws.
- The route embeds the data URI as the face `<img>` (rounded square, object-fit cover). A face
  whose fetch fails, times out, is off the image-host allowlist, or is a client-only blob URL
  (custom uploads) falls back to the initials tile. So the common case is all photos, the degraded
  case is a few initials, NEVER an all-grey card and never a 500 (the reason the worker avoided
  remote images before: a slow/broken remote `<img>` inside satori 500s the whole response; the
  data-URI prefetch is the same technique the group OG route already uses).
- Response now carries `Cache-Control: public, max-age=3600, s-maxage=86400,
  stale-while-revalidate=604800` (the card is deterministic from ?d=), mirroring the passport OG
  route. "Save image" (share-sheet `savePng`) pulls this same PNG, so the download shows faces too.
- Proof: `share-card.png` (BTS members, seven real faces in coloured tiers, 248KB vs the old
  ~137KB initials card), `share-card-story.png` (9:16), `share-card-fallback.png` (three real
  photos + one "MB" initials tile for an unreachable custom face, proving graceful degradation).

## FIX 2 - THE CREATE WIZARD + IMPORT MODAL

A guided funnel, pixel-referenced to CreateSubject / CreatePool / ImportModal, all client-side,
no DB. New route `/tier-list/create` (server shell, noindex, dynamic `f`) + one client component
`src/components/tier-list/tier-list-creator.tsx`.

- **Step 1 - CreateSubject:** bank search (client filter over a lean group projection), a popular
  group grid with real logos + generation labels, "Start blank" as a first-class equal chip, and
  a selected-group card with the members / title tracks / albums / all tiles. Picking a subject
  navigates to `/tier-list/create?group=&kind=` so the server loads that pool.
- **Step 2 - CreatePool:** the resolved bank pool as photo tiles, each with a drop/re-add toggle;
  an Official-bank / My-uploads segment with a live count; the "Add your own image" card; a
  "Tiers & title" card (title input + S-D / S-F / Top 3 presets seeding the board). "Open the tier
  board" moves to the maker.
- **ImportModal:** client upload -> validate (image type, 8MB cap) -> square crop on a 400x400
  canvas (cover-fit + centre zoom slider) -> name -> `URL.createObjectURL(croppedBlob)`. The item
  appears in the pool and, on "Open the tier board", in the maker tray like a bank item. Object
  URLs are revoked on unmount and when a custom item is dropped.
- **One mounted client tree on purpose:** the pool step and the board are the same component, so a
  custom upload (a client-only object URL) survives from pool to maker with NO navigation that
  would invalidate the blob. The only navigation is subject -> pool, before any custom item exists;
  the shell is `key`ed by the subject params so that soft navigation remounts the wizard and its
  step re-initialises from the new props.
- **Routing kept intact:** `/tier-list/new?group=&kind=` and `?d=` still go straight to the maker
  (hub featured tiles, Start blank, Challenge links unchanged). The hub "Make your own" now opens
  `/tier-list/create`; "Start blank" still opens the blank maker. `TierMaker` gained an optional
  `initialTiers` prop for the preset; nothing else changed.
- Proof: `screen-wizard-subject.png`, `screen-wizard-pool.png`, `screen-wizard-import.png`,
  `screen-maker-custom.png` (the custom "Jung Kook (solo)" item in the tray beside the 7 bank
  members).

## Nav nit (fixed, in scope)

The nav "Tier Lists" label no longer wraps: `top-nav-links.tsx` sets the label span to
`white-space: nowrap`, matching Home.dc.html.

## Tests (all green - nothing here is migration-gated)

Unit (vitest, 22 = 13 prior + 9 for og-faces + relative-path): the OG face prefetch embeds a real
photo as a data URI on success; falls back (omits the id) on a rejected fetch, on a timeout/abort,
and on a non-image response, all without throwing; skips non-http/off-allowlist/blob urls without
fetching; fetches a shared url once and maps both ids; caps distinct fetches; resolves a local
`/...` path against the origin, and skips it when no origin is given. A `@/` alias was added to
`vitest.config.ts` so an isomorphic lib module importing `@/lib/...` resolves under vitest.

e2e (Playwright, 26 runs = 19 passed + 7 skipped): the `discovery` and `wizard` describes assert
desktop chrome/layout so they skip on the mobile project; the `maker` describe (the responsive
core, including the touch tap) runs on BOTH desktop and mobile. New: make-your-own opens the
wizard subject step with Start blank first-class; pick a subject -> pool step loads real bank items
-> open the board seeds the tray; Start blank reaches an empty maker; the import modal adds a
cropped, named custom item that reaches the tray; and the OG card for a bank board is materially
larger than an initials-fallback board (proving real photos are embedded at the route level, where
ImageResponse actually runs). The prior nav/home/hub/maker/share specs still pass; the hub
assertion was updated (make-your-own now points at `/tier-list/create`). Full output:
`docs/proofs/tierlist-p2.5/tests.txt`.

## Render modes + SEO (unchanged crawl posture)

`route-modes.txt`: `o /tier-list` (static hub), `f /tier-list/create` (NEW noindex wizard, not in
sitemap), `f /tier-list/new`, `f /tier-list/share`, `f /api/og/tier-list`. No existing URL changed;
only `/tier-list/create` is added, and it is already covered by the `/tier-list` allowlist prefix.
Five gates (`gates.txt`): docs-secrets PASS, routes PASS (369 reachable). indexability /
metadata-dupes / orphans report the SAME pre-existing, non-tier-list offenders as phase 2
(/q/bts-true-or-false-bet-you-cant-get-100, /katseye-trivia, /q/katseye-quiz, /verse/bts/* verse
inflation). `/tier-list/create` is noindex and out of the sitemap, so it appears in none of them:
this work adds no new dupe, orphan, or indexability break.

## The custom-upload seam (why full fidelity in the shared image waits for Phase 3)

A custom upload is a client-only blob/object URL. It renders in the maker (client) and on the
pool tiles, but the edge OG route cannot reach a blob URL, and a full-size photo data URI is far
too large to travel in the share URL. So THIS phase: the maker and pool show the real custom photo;
the downloaded / link-preview OG card shows real photos for BANK items and falls back to the
initials/name tile for a custom face (visible in `share-card-fallback.png`). Persisting a custom
asset to a fetchable, moderated URL so it appears in the shared image is Phase 3 (needs migration
146 + storage + moderation). No big data URIs are stuffed into the share URL.

## What is NOT built (named plainly)

- **Phase 3 (needs migration 146 applied):** publish to a persisted public page, the community
  integration, the fandom-agrees WIRING (the math exists and is unit-tested; not yet read from
  public rows), server-side CRUD, and custom-upload server storage + moderation. Clean seams are
  left: the publish row is a disabled stub; the aggregate is a pure function ready to feed.
- **Intentional simplifications inside this phase (stated honestly):**
  - The ImportModal is Upload-only. The artboard shows an "Upload / Search bank" tab pair; re-adding
    a bank item is instead handled inline in the pool (each tile toggles keep/drop and can be
    re-added), so a second modal tab would be redundant. Named as a deviation, not a gap.
  - Step 1 shows each group's generation label, not a "7 members" count. The group row carries no
    member count and querying one per group would be an N+1; the exact per-kind counts appear in
    step 2, where the real pool is loaded. Honest over fabricated.
  - Native HTML5 drag is implemented and works in the browser but is asserted by e2e via the tap
    flow (Playwright does not faithfully simulate native drag-and-drop), as before.

## Two owner gates (unchanged)

1. **Apply migration 146** (Phase 3 unblock). 2. **Push** (nothing pushed; local main is ahead of
   origin).

---

STOP. Real photos in the share card (with a robust initials fallback, cached), the create wizard
(CreateSubject -> CreatePool -> maker) and the ImportModal (upload -> square crop -> name, custom
item reaches the tray) shipped, pixel-referenced, all logged-out with no DB, covered by 22 unit +
19 e2e tests (incl. the mobile project), all green. Custom-upload fidelity in the shared image and
everything publish/community/CRUD remain Phase 3 and need migration 146 applied. Nothing applied,
nothing pushed.
