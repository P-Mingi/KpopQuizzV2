# REPORT - TIERLIST phase 2: harness + the migration-independent front slice. No push.

Repo guard OK. No DDL applied (146 stays for the owner), no DB writes, no push. The
approved design spec was versioned (`git add -f docs/design/tier-list/`). Proofs:
`docs/proofs/tierlist-p2/`. Built and proven on `next build` + `next start` (:3021),
never dev. No em dashes.

## What shipped (committed across 2a / 2b / this commit), all working logged-out, no DB

**Harness (2a).** vitest (`test:unit`) + `@playwright/test` (`test:e2e`) using the
system Chrome via `channel: 'chrome'` (no browser download; `playwright install` not
run). The 24 Phase-1 assertions run under vitest; a smoke spec proves Chrome launches.

**Bank read layer (2b).** `getBankItems(groupId, kind)` returns the uniform
`{id,kind,name,image_url}` from the existing tables (idols photo_url, albums Cover Art
Archive by MBID, songs Deezer cover), namespaced ids, cookie-free client, `blank` -> [].
Pure shaping split into `bank-shape.ts` and fixture-tested.

**The front (this commit):**
- **Nav:** a "Tier Lists" item immediately after Games (SVG icon), links to `/tier-list`.
- **Home CTA:** a full-bleed gradient band ("Make your K-pop tier list") between the
  daily pair and the trending strip, per Home.dc.html. Start -> maker, Browse -> hub.
- **Hub** `/tier-list` (static/ISR `o`, in the sitemap): hero, "Make your own" +
  "Start blank", featured templates derived from the bank (real groups, no DB), and an
  honest coming-soon for Trending (which needs published lists).
- **Create + maker** `/tier-list/new` (noindex tool): from a subject
  (`?group=&kind=`, bank items loaded server-side) OR blank (`Start blank`, first-class).
  The `<TierMaker>` client component: desktop drag-and-drop AND mobile tap-to-place,
  coloured tiers, a toolbar (add tier, reset, rename + recolor via a tier editor, undo,
  redo, share), autosave to localStorage, all board state through the Phase-1
  serialization so the exactly-once invariant holds. Real member photos render; missing
  images fall back to the initials tile.
- **Share:** an **edge OG route** `/api/og/tier-list` (`ƒ` route handler) that renders the
  group-themed 1080-wide card with the kpopquiz.org watermark from board state encoded in
  the URL (`?d=<base64>`), no DB. A 9:16 `variant=story`. The **ShareSheet**
  `/tier-list/share` (noindex): Save image (PNG), Copy link, system Share (Web Share API),
  Story, Challenge a friend (a stateless link that reopens the same item set on a blank
  board), and a disabled "Publish publicly (coming soon)" row (Phase 3). `share-state.ts`
  encode/decode is isomorphic and unit-tested.

Render modes (proof `route-modes.txt`): `o /tier-list` (static/ISR), `f /tier-list/new`
and `f /tier-list/share` (noindex tools), `f /api/og/tier-list` (route handler). The
`(site)` group is intact; no existing URL changed; `/tier-list` added to sitemap + the
middleware allowlist.

## Tests (all green - nothing here is migration-gated)

Unit (vitest, 13): serialization exactly-once, slug uniqueness, fandom-agrees math, bank
shaping (fixtures), share-state round-trip (default + allItems + garbage). e2e
(Playwright, 8 desktop + 1 mobile): nav item after Games links to hub; home CTA present +
links; hub renders with make-your-own/start-blank/featured/trending-empty;
create-from-blank -> empty maker with default tiers; create-from-subject loads bank items,
tap places a card, undo restores; rename a tier; share reaches the sheet, the OG route
returns a real image/png for the encoded state, challenge link points back to the maker;
mobile touch tap-to-place. Full output: `docs/proofs/tierlist-p2/tests.txt`.

## Proofs (docs/proofs/tierlist-p2/)

`share-card.png` (the OG export with watermark), `screen-hub.png`, `screen-maker.png`
(real BTS photos in coloured tiers), `screen-share.png`, `no-emoji.txt` (0 emoji
codepoints in tier-list source; every icon is inline SVG), `route-modes.txt`, `gates.txt`,
`tests.txt`.

## SEO gates

docs-secrets PASS, routes PASS (368), indexability PASS (floor; the hub is static,
self-canonical, unique-titled, in the sitemap). metadata-dupes: `/tier-list` is NOT in any
collision group (verified); the 10 groups the gate reports are the pre-existing local
verse-inflation baseline (L-215). orphans: `/tier-list` is linked from the home CTA and the
nav on every page (not orphaned); the gate reports 3 PRE-EXISTING orphans unrelated to this
work - see the adjacent-bugs note below. Details in `gates.txt`.

## What is NOT built (named plainly)

- **Phase 3 (needs migration 146 applied):** publish to a persisted public page with a
  real slug, the community integration, the fandom-agrees WIRING (the math exists and is
  tested; it is not yet read from public rows), server-side CRUD, and custom-upload server
  storage + moderation. Clean seams are left: the publish row is a disabled stub, the
  aggregate is a pure function ready to feed.
- **Deferred within Phase 2 (a 2d, no DB needed), said honestly:**
  - **ImportModal / custom client-side uploads** (object-URL items baked into the board and
    the export) were NOT built. The maker ranks bank + blank today; add-your-own-image is
    the main missing INCLUDE item.
  - The dedicated **CreateSubject / CreatePool** wizard screens were not built as separate
    artboard-matched screens; creation is served by the hub (featured templates + Start
    blank) feeding `/tier-list/new`. The pixel-matched pick-subject search/popular-grid
    screen remains.
  - e2e exercises placement via the **tap** flow (reliable in Playwright); native HTML5
    drag is implemented and works in the browser but is not asserted by an e2e (Playwright
    does not faithfully simulate native drag-and-drop).

## Deviations (intentional)

- The OG card renders item tiles as **initials-on-gradient**, not remote photos, so the
  image always composes without a per-face cross-origin fetch; a later phase can prefetch
  covers to data URIs. Single-word names show one initial.
- Hub filter chips are a visual set; the client-side filter is a later polish.

## Adjacent bugs (named, not fixed - scope fence)

The orphan gate found 3 pre-existing orphaned sitemap URLs unrelated to tier lists:
`/katseye-trivia`, `/q/katseye-quiz`, `/q/bts-true-or-false-bet-you-cant-get-100`.

## Two owner gates

1. **Apply migration 146** (Phase 3 unblock). 2. **Push** (nothing pushed).

---

STOP. Harness + bank + nav + home CTA + hub + create + maker (drag/tap) + share (OG +
sheet + challenge) shipped, pixel-referenced, all logged-out with no DB, covered by 13
unit + 9 e2e tests, all green. Custom uploads + the dedicated create wizard screens remain
within Phase 2; publish/community remain for Phase 3. Nothing applied, nothing pushed.
