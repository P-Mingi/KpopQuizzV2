# V-IDENTITY + V-HOME - Verse becomes its own product, with its own front door

## Claude Code Implementation Prompt

---

V3 step 2 (read VERSE-ROADMAP-V3.md sections V-IDENTITY and V-HOME, plus
VERSE-APPLICATION-BLUEPRINT.md sections 6-8 for modules V-HOME uses). Builds
ON the V-DESIGN system (tokens, box foundation, wide canvas, presets).

Hard rules: NO em dashes. No new deps. No migrations expected (STOP if one
appears needed). Commit per step, do NOT push. check:routes green. Dual-skill
/ui-ux-pro-max + /frontend-design on every surface. Three breakpoints,
light + dark. PLAY WORLD BYTE-UNTOUCHED (diff proof again). Verse pages are
unshipped, so Verse head tags MAY change in this workstream (deliberately,
documented); Play head tags may not change by a single byte.

## Step 0 - V-DESIGN debt (mechanical, from the closing audit)

prefers-reduced-motion guard on the member-photo hover-scale; body reading
text 16px on mobile; the sub-44px secondary links brought to target size.
Commit.

## Step 1 - Verse wordmark: 3 directions, then STOP

- Design THREE distinct Verse wordmark/logo directions as house-drawn SVG
  (no AI-slop, no stock, no new fonts; Pretendard lettering + custom SVG
  marks allowed). Each direction shown on a static internal route
  (/verse/dev/brand, allowlisted, noindex): light + dark, at header size,
  favicon size, and OG-card size, next to the existing kpopquiz logo for
  contrast.
- Directions should differ in CONCEPT (e.g. a V-mark/portal motif, a
  wordmark-only editorial cut, an orbit/verse motif), not just color. All
  must harmonize with the violet world identity and sit quietly beside the
  Play brand in the toggle.
- STOP: owner picks a direction (or asks for iteration). Do not proceed on
  a guess.

## Step 2 - Identity rollout (after the pick)

- Verse header: the chosen mark replaces the kpopquiz logo in Verse world
  chrome; the Play|Verse toggle stays exactly as W-NAV built it (it is the
  bridge; do not redesign it here).
- Verse FOOTER, its own: Verse voice and links (Fandoms directory,
  Community, the charter placeholder link "our promises" pointing to the
  V-TRUST page slug reserved now, curator recruitment line) + the soft
  network line: "part of the kpopquiz.org network" in quiet small text +
  the world toggle. No Play link farm.
- Verse 404: on-brand, helpful (search + fandom directory links).
- Per-world favicon + OG identity: Verse routes get the Verse mark favicon
  and a Verse OG template (violet system, group imagery where legal);
  document the mechanism (route metadata) and prove Play routes still emit
  the Play favicon/OG.
- Verse meta title pattern becomes "{Group} Verse · the {fandom} home"
  style across space pages (document every pattern changed, before/after,
  in the report; these pages are unshipped so this is free now and
  expensive later).
- Commit per surface.

## Step 3 - V-HOME: the Verse front door (build, then STOP for review)

Replace the current /verse directory page with the real home. Modules, all
min-gated, all on the V-DESIGN system, wide canvas:

1. HERO: what Verse is, in fan language ("Fans build their fandom's home
   here"), search-first (entity-aware autocomplete), the violet identity
   moment, the chosen wordmark.
2. TRENDING SPACES: real views/plays ranked, card grid with counts (the
   trust currency), min-gated below a floor.
3. FEATURED SPACE: curator-credited spotlight; until real curators exist,
   min-gate hides it (NO fake "featured by" attribution, ever).
4. NEWEST IN THE VERSE: latest published revisions/pages strip (real
   activity only; hides when quiet).
5. THE NUMBERS: spaces · pages · contributors, real counts, min-gated
   until they are impressive enough to state (owner picks the floor at
   review).
6. CLAIM YOUR FANDOM: the recruitment block (owner-approved copy comes at
   review; draft it honestly: what curators get, what they own).
7. START HERE: newcomer doorway (links the fandom directory now; wires to
   ladders/newcomer portal when those ship; min-gate the unbuilt).
8. ONE games funnel module, tasteful, last before footer.
- SEO: /verse title/meta/JSON-LD (CollectionPage + SearchAction), static/
  ISR preserved, sitemap correct.
- STOP: screenshot matrix (3 breakpoints x light/dark) for owner review.

## Step 4 - closing sweep (after owner approves Step 3)

Dual-skill audit on the new surfaces; a11y pass (search combobox keyboard
path especially); byte-diff proof Play world untouched (one Play page +
/quizzes head tags); full build green; em-dash grep; check:routes.
Commit.

## Permitted loops (per LOOP-CHARTER)

BUILD-VERIFY-FIX per step · GOAL tsc + build + check:routes + step tests
green · MAX 8 · STOP IF design ambiguity (brand and home layout decisions
belong to the owner: prototype, stop, ask).

## Verify (workstream end)

- [ ] Owner picked the wordmark from real alternatives; choice recorded
- [ ] Verse chrome (header/footer/404/favicon/OG) fully distinct; the
      kpopquiz link reduced to the soft network line + toggle
- [ ] Every changed Verse head-tag pattern documented before/after
- [ ] Play world byte-untouched (diff proof)
- [ ] V-HOME modules all min-gated: zero fake/empty content anywhere,
      no "featured" without a real curator
- [ ] Search works keyboard-only; 44px targets; reduced-motion respected
- [ ] tsc, full build, check:routes green; zero em dashes; no new deps;
      static/ISR symbols intact
- [ ] /verse/dev/brand removed or noindex-allowlisted after the pick

/caveman report per step: the brand directions page link at Step 1 STOP,
head-tag change table at Step 2, screenshot matrix at Step 3 STOP,
final checklist at Step 4.
