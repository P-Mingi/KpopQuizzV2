# /caveman report - V-BUILDER-3 step 1: the editorSchema foundation (invisible)

Phase 2 is closed. V-BUILDER-3 (block editors) step 1 is done: the schema foundation + the
component inventory + validator content clamps. NO UI (the content tab waits for co-design 7).
Committed. Nothing pushed.

## Built

- **src/lib/verse/composition/editor-schema.ts** (NEW): the typed field-def system
  (text, richtext, image, url, link, entityRef, enum, number, date, list-of-rows) with a
  `binding` (curator / entity / derived) that says where each field's value lives. Plus
  `EDITOR_SCHEMAS` - the nine wave-1 schemas the owner named (D1/D2): hero, vitals, members,
  image, youtube, stats (the DATA block), timeline, quote, doorway. Plus `clampPropsBySchema`,
  the schema-driven content clamp.
- **BlockSpec gains `editorSchema?`** (composition/registry.ts): attached to the six wave-1
  blocks that already have specs (vitals, members, stats, timeline, quote, doorway). The three
  not-yet-placeable blocks (hero, image, youtube) have schemas but NO spec, so the Phase-2
  library is unchanged (it reads BLOCK_SPECS).
- **Validator extended** (presentation/validate.ts): `validateProps` clamps a block's content
  payload through its schema when one exists (human sentences); blocks without a schema keep
  their legacy hand-clamp. The `quote` clamp moved to the schema and reproduces the old
  behavior exactly.
- **docs/vbuilder3-block-inventory.md**: the complete named audit - every visible component on
  a fandom space -> block -> data source -> editorSchema status (wave 1 / wave 2 / chrome /
  block-pending). Resolves the owner's two flagged cases (the `vitals` module vs the separate
  hero vitals line; "Latest releases" = the `discography` teaser).

## Proven (docs/proofs/vbuilder3-step1/)

- **schema-verify.txt** (`scripts/vb3-schema-verify.mts`): ALL PASS.
  (a) all 9 wave-1 schemas present + well-formed (every field has a valid kind + binding; lists
      + enums shaped). Coverage: 6/31 specs carry a schema + 3 schema-only pending blocks = the
      9 editors; the other 25 specs are dated deferrals (the inventory tracks each).
  (b) hostile payloads clamped with human sentences: quote over 280 (lyric guard), stats source
      not https, members row javascript: link, timeline over 60 rows, image EXTERNAL src
      (ingest-copy law), youtube non-https url. A valid uploaded image passes.
  (c) quote byte-parity: valid quote accepted, text trimmed + preserved, attribution clamped
      to 80 (matches the legacy clamp).
- **byte-identical.txt**: /verse/bts main column = 21312 == baseline. No render-path file
  changed; the validator change is a no-op on today's real configs.
- **gates.txt**: tsc 0; routes 338; tokens pass; parity ALL PASS; registry 29/31 COMPLETE +
  WELL-FORMED; vpages; templates; fold; stable-id ALL PASS. em-dash grep clean.

Note: docs/vbuilder3-block-inventory.md was under the docs/* default-ignore; negated in
.gitignore (same pattern as the vbuilder2 docs) so the deliverable tracks in git.

## STOP

Step 1 complete. STOP before step 2 (CONTENT TAB PLUMBING), which is [CO-DESIGN 7] gated: its
UI must NOT be built until the ledger records the co-design 7 lock. The next Cowork mission
carries that lock (or the next step). Nothing pushed.
