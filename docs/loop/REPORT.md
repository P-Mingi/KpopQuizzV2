# REPORT - TIERLIST phase 3.4: blank board can add items, General K-pop loads the whole bank, wider maker. Preview push only.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). Three functional defects from the owner's preview
playtest, all fixed. Built and proven on `next build` + `next start` (:3021), never dev; CI green on
a real runner. No push to main, no change to og-faces/OG route, no new migration, no env file
touched, no em dashes, zero emoji. Proofs: `docs/proofs/tierlist-p3.4/`.

Context confirmed, not "fixed": on the preview the share card shows initials because Vercel SSO
(all_except_custom_domains) 401s the edge route's fetch of its own /idols assets; it will render
photos on the production domain. og-faces and the OG route are untouched.

## ITEM 1 - the blank board is no longer a dead end

- Extracted `ImportModal` to a shared component (`src/components/tier-list/import-modal.tsx`) so the
  wizard AND the maker use ONE uploader, reusing the existing `/api/tier-list/asset` path (upload to
  the moderated `tier_list_assets` store, pending; client object-URL fallback on failure).
- Added an "Add images" control to the maker toolbar (`tier-maker.tsx`). It works on ANY board
  (blank or a subject board). Multi-select: several files chosen at once are processed as a queue,
  each cropped square + named, each landing in the Unranked tray. Runtime uploads merge into the
  board via `extraItems` and are placed into unranked; their blob URLs are revoked on unmount.
- The empty tray stopped lying: a board with nothing shows an invite that opens the importer
  instead of "Everything is ranked." (which now only shows when items exist and are all ranked).
- e2e regression lock: from Start blank, the toolbar exposes Add images, adding one lands it in the
  tray, and it can be placed on a tier.

## ITEM 2 - "General K-pop members" now means the whole bank

- New `getAllBankMembers` (`bank.ts`): members across every real group, photo-only, ordered so the
  best-known groups come first (the `getAllGroups` quiz_count ranking), capped at
  `GENERAL_MEMBERS_CAP = 120`. Pure order/cap logic is `orderAndCapMembers` in bank-shape (unit
  tested). The live board loads 118 idols with real photos.
- The hub drops the catch-all from the auto featured loop (it would open empty) and offers it as an
  explicit "K-pop idols (all groups)" tile; `/tier-list/new?group=general-kpop` resolves to the
  all-bank pool. Any OTHER named subject that resolves to zero items now shows an honest state
  (`data-testid=empty-subject`) rather than a silently blank board wearing the subject title.
- Challenge link on a large pool: `encodeBoard` caps carried items at `CARRY_CAP = 80` in BOTH the
  default (ranked-first) and the allItems (challenge) paths, so even a 120-idol general board
  produces a link well under URL limits (unit test: a 200-item allItems board encodes to 80 items
  and under 8000 chars). Decision stated: cap the carried set, not fall back to a subject reload, so
  one rule covers every board.
- Submit a missing idol reuses the EXISTING custom-asset flow: it is a moderated user asset
  (`tier_list_assets`, pending -> approved), shown on the submitter's own board immediately and only
  reaching a PUBLIC list once approved. It is NEVER a write to the official `idols` table, and no
  migration is added.
- e2e: the general template opens a non-empty pool; a featured template never opens an empty board.

## ITEM 3 - the board is no longer too narrow

Root cause: the `(site)` layout caps `<main>` at `max-w-[720px]`, so `.tl-wrap`'s max-width never
applied. The maker surface now opts into `.tl-wide`, which breaks OUT of the 720 parent and centres
on the viewport at `min(1440px, calc(100vw - 32px))` (the -32 so a vertical scrollbar never forces
horizontal scroll; verified scrollWidth == innerWidth at 1440), with a 240px tray (was 300). Only
the maker opts in; the hub, create and share pages keep the 720 column. Mobile (<=820px) keeps the
stacked tray and tap-to-place unchanged.

Measured 84px faces per tier row (proof `faces-per-row.txt`):
- 1280: BEFORE 2, AFTER 8.
- 1440: BEFORE 2, AFTER 10.

## Tests + CI

Local: 55 unit + 32 e2e / 8 skipped, all green. CI (the real gate, run
https://github.com/P-Mingi/KpopQuizzV2/actions/runs/34846953602 on preview/verse-stack, commit
a6c84b0) conclusion **success**: unit 55 passed, e2e 40 -> 32 passed / 8 skipped. Test-created
pending assets were torn down (DB rows deleted; 0 left).

Five SEO gates (`gates.txt`): docs-secrets + routes PASS; indexability / metadata-dupes / orphans
NONZERO but every offender is the pre-existing katseye/bts/seventeen quiz flip and the verse-inflation
dupes - no tier-list, general-kpop, or /verse URL appears in any failure (verse orphan hits: 0), so
this phase adds no new orphan and no new dupe. Render modes unchanged (hub o static; new/create/share
f noindex tools; OG a route handler). Zero emoji, zero em dashes.

## Owner gate

1. **Push main** for production, when you choose. Local main is ahead of origin; nothing on main was
   pushed. preview/verse-stack was fast-forwarded to a6c84b0 for the playtest.

---

STOP. Blank boards can add images (regression locked by e2e), "General K-pop" loads 118 real idols
with a bounded challenge link and a moderated submit-an-idol path, and the maker fits 8-10 faces per
row instead of 2. 55 unit + 32 e2e green in CI on preview. main not pushed.
