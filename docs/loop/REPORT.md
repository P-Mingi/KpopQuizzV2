# /caveman report - V-BUILDER-2 step 8: CLOSING SWEEP (phase 2 ready to close)

Owner gave GO on the gate pack. Step 8 is the closing sweep. Done + committed. Nothing pushed.
PHASE 2 CLOSES on Cowork's read of this report.

## 1. A11Y RE-PASS (docs/proofs/vbuilder2-step8/a11y-repass.txt)

Full read-only audit of everything the phase added, then FIXED the real barriers and verified
each live on :3021:
- H1 (functional + a11y): the shell's window keydown stole Tab/Enter/Esc even while an overlay
  owned the keyboard - in the inline editor, Enter ran a block-grab instead of a newline. FIX:
  the shell yields keys while (drawer || styleOpen || editing). LIVE: Enter no longer grabs;
  typing reaches the editor.
- H2/H3/H4 (focus management): the style panel, the inline editor, and the phone BottomSheet
  now move focus IN on open, trap Tab, handle Esc, and restore focus on close. LIVE: focus lands
  in each dialog; Esc closes the editor and restores focus.
- M1/M2 (44px law): the library + style PHONE sheets had sub-44px controls. FIX: sheet-scoped
  44px (with !important where an inline min-width fought it). LIVE: every control on both phone
  sheets is >= 44px, zero under.
- L2 (robustness): the inert cleanup no longer clobbers a sibling's pre-existing aria-hidden.
CLEAN (no change): all icon buttons labeled; dialogs + toolbar roles + live regions correct;
the builder animates nothing (no reduced-motion rule needed); the inert layer inerts only
ancestor siblings so the drawers/sheets/editor stay interactive.
Deferred (LOW polish, in docs/vbuilder2-deferred.md): library tab aria-controls association; tour
focus-to-primary on open.

## 2. FULL GATE SUITE on the final HEAD (docs/proofs/vbuilder2-step8/gates.txt)

tsc exit 0; check:routes 338; check:verse-tokens pass; parity ALL PASS; registry 29/31 COMPLETE
+ WELL-FORMED; vpages hold; templates; fold; stable-id ALL PASS; play-untouched 12 (720px,
verse-page-free). em-dash grep over the changed source + docs: clean.

## 3. SITEMAP UNCHANGED (docs/proofs/vbuilder2-step8/sitemap-unchanged.txt)

/sitemap.xml = 2793 URLs, ZERO build routes; no /verse/<slug>/build. sitemap.ts + robots.ts are
byte-unchanged across the whole phase. Both builder routes are noindex (source robots
index:false + live meta on /build/bts) AND curator-gated (404) AND absent from the sitemap.

## 4. DEFERRED ITEMS handoff (docs/vbuilder2-deferred.md)

Width/column-span (Phase 3 grid); inline text on the other text blocks; doorwayFormat per-door
editor; per-source library hint copy; native publish-confirm; the two LOW a11y notes. Each with
its target workstream.

## 5. TASK BOARD (docs/workstream-vbuilder-2.md)

Every step 1-8 marked DONE with its commit hash; the Verify checklist is all checked.

Tracking note: docs/vbuilder2-deferred.md + docs/workstream-vbuilder-2.md were under the
`docs/*` default-ignore. I negated them in .gitignore (mirroring how verse-project.md /
VERSE-LEDGER.md are tracked) so these step-8 deliverables land in git for Cowork + Phase 3. If
you'd rather keep either local-only, `git rm --cached <file>` + drop the negation.

## Handover state

Test space bts CLEAN: presentation_draft {}; verse_content byte-identical; section drafts
cleared. Dev server on :3021.

## STOP

PHASE 2 (V-BUILDER-2) is complete pending Cowork's read of this report. STOP holds: the
V-BUILDER-3 (block editors) spec comes from Cowork next; I start nothing until then.
