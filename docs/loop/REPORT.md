# /caveman report - V-BUILDER-3 step 2: content tab plumbing (co-design 7), re-applied on merged main

Step 2 was BUILT + fully proven earlier this session, then its uncommitted edits were clobbered
by the shared-clone collision. Re-applied verbatim from `scratchpad/vb3-step2-recovery/` onto the
merged main (which now carries the G-HUB v2 merge) and re-verified. Committed. Nothing pushed.
English labels (owner ruling: the locked French copy is anglicized to match the `lang="en"` app).

## Built (co-design 7, L-057)

- **content-tab.tsx** (new): a GENERIC field renderer from `editorSchema` (text with live counter,
  url with inline validation, enum segmented, number/date native, list-of-rows with add/reorder/
  remove). BOUND-DATA badges: an entity/derived field shows "Data" (follows source), flips to
  "Edited" (accent) with a one-tap "Revert to data" on a curator override.
- **style-panel.tsx**: refactored into the tabbed **Content | Style** block panel (Content default;
  shared header + Delete; retarget + Esc/X identical to Phase 2).
- **use-builder-composition**: `setProps`/`propsOf` op - content rides the SAME optimistic +
  validated + reconcile draft rail as every structural/style op (422 reverts via hardReset).
- **builder-shell**: wires blockId/initialProps/onCommitProps + the `--vb-danger` token.
- **editor-schema**: `validateField` per-field helper (inline errors).

## Proven (docs/proofs/vbuilder3-step2/) - live on merged main

- Fields render from the schema (vitals chips, stats rows with counters); retarget swaps both tabs.
- Hostile non-https source -> "Source must be a valid https link." under the field; siblings save;
  bad value not saved.
- Bound-badge round-trip persisted in the draft jsonb: add+fill a vitals chip -> "Edited" +
  `vitals.props = { chips: [{label:"Debut", value:"2013"}] }`; "Revert to data" -> override removed.
- content-verify ALL PASS; gates green ON MERGED MAIN (tsc, routes 335, tokens, parity, registry,
  vpages, templates, fold, stable-id); em-dash clean. Test space bts left clean.

## Byte-identity + RE-BASELINE (mission #1)

Step 2 touches ONLY builder + save-time files (zero reader/render/shared-chrome), so `/verse/bts`
cannot change (it never renders builder code). The G-HUB merge moved `/verse/bts`'s client-DOM main
column from 21312 (pre-merge, 44dda93) to ~21638 (merged main) via shared chrome - that is the
G-HUB re-baseline, not step 2. Noted: from now, "Play byte-untouched" for Verse work references the
merged HEAD (test-play-untouched already pins by selector, not a commit, so no harness edit needed).

## ROUTES QUESTION (mission #2): 338 (44dda93) -> 335 (merged)

Not a G-HUB removal. The COMMITTED route surface is byte-identical between 44dda93 and the merged
HEAD: page.tsx 143 == 143 and route.ts 180 == 180 (zero added/removed; G-HUB only MODIFIED games
pages). check-route-allowlist.mts walks the WORKING TREE, so the 338 counted three UNTRACKED spike
routes present at step-1 - `/verse/[slug]/spike-build`, `/verse/[slug]/spike-draft`, and
`/pinterest-feed.xml` - which the play-ghub checkout cleaned from the working tree during the merge
surgery. None was ever committed; the reachable committed route surface is unchanged.

## STOP

Step 2 done + committed. STOP before step 3 (image rail; its migration, if any, goes to
docs/pending-migrations/ for the owner). Nothing pushed.
