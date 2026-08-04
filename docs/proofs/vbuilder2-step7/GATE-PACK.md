# V-BUILDER-2 - OWNER GATE PACK

Everything the owner needs to review the edit-in-place page builder in one sitting. All six
build steps are closed and committed (nothing pushed). This pack re-runs every gate FRESH on
the current tree (HEAD = eeb6d7d) and points at every per-step proof.

- Feature: a chrome-less draft canvas + a curator-only edit-in-place builder at
  `/verse/<slug>/build`: select, reorder (drag + keyboard), duplicate, delete + undo, insert
  from a library (blocks + patterns) with honest data-source hints, a per-block style panel,
  and inline rich-text editing via the existing section editor. Desktop + phone.
- The published reader page is byte-identical to before the builder existed. The builder
  never invents a parallel render or a parallel save path.
- Walkthrough for the hands-on review: `WALKTHROUGH.md` (in this folder).

---

## Per-step summary + proof pointers

| Step | Commit | What shipped | Proofs (docs/proofs/) |
|------|--------|--------------|-----------------------|
| 1 | 4e9035f | chrome-less draft canvas `/build/<slug>` (the REAL render, noindex, 404-gated) | vbuilder2-step1/{byte-identical, chrome-less, draft-provenance, gate-404-noindex, check-routes, tsc}.txt |
| 2 | 79577c4 | `/verse/<slug>/build` shell + selection overlay (architecture B: iframe of the real render + parent overlay) | vbuilder2-step2/{measurements, gates, behavioral-and-screenshots}.txt |
| 3.0 | 837ac42 | persist + FREEZE stable block ids (the MUST fix; ids never positional) | vbuilder2-step3/{id-persistence, stable-id-source}.txt |
| 3 | 23a24ea | optimistic structural-edit engine: reorder / duplicate / delete / insert + undo/redo, background validated save, reconcile-on-reload | vbuilder2-step3/structural-edits.txt |
| 4 | 80f29d6 | library drawer: insert block or multi-block pattern, honest min-gate hints when a data source is empty | vbuilder2-step4/library-drawer.txt |
| 5 | 588e9ca | style panel + per-block style pipeline (frame / background / corners / density / accent / scale / divider), tokens only | vbuilder2-step5/style-panel.txt |
| 6 | b7ede35, f428c3a, eeb6d7d | inert a11y takeover + first-build tour; the phone layer (action sheet + bottom sheets); inline text via the existing section editor (L-044) | vbuilder2-step6/{inert-and-tour, phone-layer, inline-text}.txt |

Notable receipts: c0a3970 recorded the step-3 stable-id MUST violation (BLOCKED) BEFORE the
3.0 fix, per the loop contract (no guessing through a gate).

---

## FRESH RE-RUN (this step) - every gate green on HEAD

Static + type + route + token:

| Gate | Command | Result | File |
|------|---------|--------|------|
| tsc | `tsc --noEmit -p tsconfig.json` | exit 0, 0 errors (whole app) | tsc.txt |
| routes | `npm run check:routes` | 338 page routes reachable | check-routes.txt |
| token gate | `npm run check:verse-tokens` | no raw hex in Verse surfaces | check-verse-tokens.txt |
| em-dash ban | grep the diff | clean (0 em/en dashes) | (below) |

Regression harnesses (V-BUILDER-2 touched the shared renderer + convert.ts + shared chrome):

| Harness | Result | File |
|---------|--------|------|
| parity (`_vbuilder1-parity.mts`) | bts/stray-kids/ateez: render-parity=true, meta-lossless=true, stable-ids=true. ALL PASS | parity.txt |
| registry (`_vbuilder1-registry.mts`) | 29 module types / 31 specs; COMPLETE + ALL SPECS WELL-FORMED | registry.txt |
| vpages (`test-vpages-gates.mts`) | 55 passed, 0 failed | vpages.txt |
| templates (`test-vtemplates.mts`) | structure switches, nothing else moves | templates.txt |
| fold (`test-vtext-fold.mts`) | V-TEXT fold law holds | fold.txt |
| stable-id (`vb2-stable-id-verify.mts`) | ALL PASS (survives reorder, legacy ids freeze on save) | stable-id.txt |
| play-probe (`test-play-untouched.mts`) | 12 passed: PLAY LAYOUT LAW HOLDS, 720px, verse-page-free | play-untouched.txt |

Full build:

| Gate | Command | Result | File |
|------|---------|--------|------|
| production build | `npm run build` (check:routes + check:verse-tokens + next build) | BUILD_EXIT=0, full route manifest emitted | build.txt |

---

## Law re-proofs the owner cares most about

### SEO parity (law #1) - `seo-parity.txt`
The composed/built canvas emits the IDENTICAL indexable set as the default page.

| page | textLen | hrefs | headings | handles | signature |
|------|---------|-------|----------|---------|-----------|
| /verse/bts (default) | 1676 | 38 | 8 | 0 | bd7b7a1d |
| /build/bts (composed) | 1676 | 38 | 8 | 10 | bd7b7a1d |

Same text, same 38 `<a href>`s (incl. the one external citation), same 8 headings. The only
delta is 10 `data-block-id` wrapper handles, which carry no text / href / heading. One-H1 law
holds (`/verse/bts` has exactly one `<h1>`). Converter is lossless (parity.txt); registry is
complete (registry.txt).

### Play untouched (law #18, all three) - `play-triple-proof.txt`
Required because V-BUILDER-2 touched shared chrome (the builder-route chrome guards, step 1).
(a) head: no head-affecting file changed; Play head has ZERO builder/verse leak tokens.
(b) 720px probe: play-untouched 12 passed + live (main = 720px, no overflow, 0 .verse-page).
(c) screenshot: Play home at 800px, chrome intact, shown inline.

### Published byte-identity (SEO invariant, ongoing)
`/verse/bts` main column normalized outerHTML = 21312 (client-reconciled) == pre-step baseline;
the authoritative row-level proof for the step-6 inline edit is in vbuilder2-step6/inline-text.txt
(verse_content restored byte-for-byte; draft reset). The test space is left CLEAN.

---

## Ratchet law
No test, gate script, or proof was edited to go green. `_*.mts` / `check-*.mts` / `test-*.mts`
are untouched this step (only run). The two throwaway V-BUILDER-1 harnesses (`_vbuilder1-*.mts`)
are run as-is. New this step: `vb2-content-io.mts` (a dev dump/restore helper) + the step-7
proof files. No source code changed in step 7.
