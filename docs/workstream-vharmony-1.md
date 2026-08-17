# V-HARMONY-1 - the four primitives, made universal

## Claude Code Implementation Prompt

---

Owner-approved harmonization Wave 1 (2026-08-01), from the code-measured
audit. The platform is ten workstreams built fast; the primitives exist
but adoption drifted. This is CONVERGENCE, not redesign: extract the
canonical primitive, pull every Verse route onto it, delete the ad-hoc
copies. The good pages already look right; make that look universal. Nothing
about the visual language changes: only its consistency.

Hard rules: NO em dashes. Commit per primitive, do NOT push. No new deps.
No migration. Play byte-untouched (triple-proof). SEO parity: converging
a header or byline must not change indexable content or head tags. The
contrast/ink-floor law and min-gate law stay in force. Dual-skill design
on the canonical components.

## The four seams (measured)

1. SECTION HEADER: 13 files use the page-grammar eyebrow, ~78 hand-roll
   an uppercase label. Converge on ONE <SectionHeader> (kicker + optional
   action slot, e.g. "ALL 17"), token-driven.
2. EMPTY / GROWING STATE: ~10 phrasings ("being prepared" x5, "No X yet"
   in 4 variants, "Nothing here", "Start writing"). Converge on ONE
   <EmptyState> with a consistent structure (headline, one-line body,
   optional CTA) and ONE voice (see voice rule). Distinguish honestly:
   EMPTY (no data yet) vs GROWING (some data, more welcome) vs PRIVATE
   (opted out) vs LOADING: never the same copy for different truths.
3. BYLINE: the identity resolver is used in 5 files but ~27 render an
   author. Converge on ONE <Byline> that ALWAYS reads through the
   V-PROFILE-ONE resolver (honors block state + SYSTEM_AUTHOR_DISPLAY +
   role badge + profile link). This closes a latent correctness gap, not
   just a visual one: ad-hoc bylines may leak a blocked/system identity.
4. TOKENS: #7c5cfc hardcoded x34 (plus stray hexes and Play pink #E8457A
   bleeding into Verse). Replace every raw Verse-surface hex with its
   token (--verse-accent etc.) so the ink-floor clamp can reach it. This
   is the exact class that caused the "AI website" washout.

## Steps

1. THE CANONICAL SET: build/confirm the four components in
   components/verse (SectionHeader, EmptyState, Byline, and a token
   lint). Each on the V-DESIGN system, dual-skill reviewed, a11y-clean.
   Screenshot the canonical set. Commit.
2. SECTION HEADER convergence: replace all ~78 ad-hoc eyebrows with
   <SectionHeader>. Grep-prove zero ad-hoc uppercase-eyebrow patterns
   remain in app/verse. Commit.
3. EMPTY STATE convergence: replace all empty/growing/private renders
   with <EmptyState> at the right variant + the unified voice. Grep-prove
   the old phrasings are gone. Commit.
4. BYLINE convergence: route all ~27 author renders through <Byline> over
   the resolver. Grep-prove no ad-hoc name rendering remains; re-prove
   block-state + system-name honored on a sample. Commit.
5. TOKEN convergence: replace raw Verse hexes with tokens; add a check
   (grep gate) that fails on a raw hex in app/verse or components/verse.
   Re-prove the ink-floor clamp on a hostile-accent space. Commit.
6. STOP: owner review. Before/after screenshot matrix of 8-10 varied
   surfaces (space home, idol, album, wiki leaf, essays, binder, atlas,
   community, a deep entity page) showing the same primitives everywhere,
   3 breakpoints x light/dark.
7. Closing sweep after approval: dual-skill consistency audit, a11y,
   SEO parity (head + indexable content unchanged by convergence), Play
   triple-proof, full build, em-dash grep, check:routes, the new token
   grep-gate green. Commit.

## Voice rule (for EmptyState + any copy the components carry)

Warm, plain, fan-made, never corporate. Empty = an invitation, not an
apology ("No essays yet. Write the first one."). Growing = honest and
inviting ("This corner is still growing."). Private = respectful, not a
scold. No "simply/just/easy", no exclamation shouting, sentence case.

## Verify

- [ ] Grep gates green: zero ad-hoc eyebrows, zero old empty-state
      phrasings, zero ad-hoc bylines, zero raw hexes in Verse surfaces
- [ ] <Byline> everywhere honors block state + system name (sample proof)
- [ ] EmptyState variants correct (empty vs growing vs private vs loading
      never share copy)
- [ ] Before/after shows one consistent look; nothing redesigned, only
      converged
- [ ] SEO parity: head tags + indexable content byte-unchanged by the
      convergence (diff on 3 pages)
- [ ] Play triple-proof; contrast/ink-floor re-proven; tsc/build/routes
      green; zero em dashes; no new deps; no migration

/caveman report per step; step 6 is the owner gate. This is convergence:
if a surface's current look is GOOD, keep the look and swap the
implementation; if it is off-pattern, the canonical primitive fixes it.
