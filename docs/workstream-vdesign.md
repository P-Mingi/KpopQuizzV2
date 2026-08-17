# V-DESIGN - kill the boxes (Verse visual system v2)

## Claude Code Implementation Prompt

---

First workstream of VERSE-ROADMAP-V3 (read it, section V-DESIGN, plus the
owner verdict that triggered it: "wtf are those boxes"). The current space
rendering is border-box soup: every module in a visible bordered rectangle,
dotted dividers as default, cards inside cards, an admin-dashboard feel. The
target: a fan-made magazine, not a dashboard. Dual-skill /ui-ux-pro-max +
/frontend-design MANDATORY at start AND as a closing audit.

Hard rules: NO em dashes. Presentation/CSS only: no migrations, no schema, no
new deps, no route changes, no head-tag changes. The W-CUSTOM SEO parity law
and the contrast guardrail stay fully in force. Play world untouched. Commit
per step, do NOT push. Verse is unshipped so Verse-page visual regression
rules are RETIRED (the byte-identical constraint applied to the old default;
we are deliberately replacing that default). Three breakpoints, light + dark.

## Design principles (the new default)

1. INVISIBLE CHROME: module separation comes from whitespace + typographic
   hierarchy (spacing rhythm, small-caps section labels, type scale), NOT
   from borders. The default module has no border, no card background, no
   divider. Frames/borders/dividers become OPT-IN curator choices in the
   existing frame system (which stays, redesigned to be worth opting into).
2. EDITORIAL TYPE SCALE: real hierarchy (display for the hero, generous
   section headers, comfortable body measure). Line lengths capped for
   reading. The dotted divider dies as a default everywhere.
3. FULL-BLEED HERO: banner/identity area bleeds to the container edge,
   masthead quote integrated INTO the hero (not a boxed quote below it),
   countdown and vitals as quiet overlays or a single clean strip, not
   stacked bordered widgets.
4. ONE ACCENT AT A TIME: max 1-2 accent-colored surfaces per viewport. The
   current look paints every border in accent; the new look spends accent
   on ONE hero moment and links/actions.
5. THE SIDE RAIL CALMS DOWN: rail modules (In Numbers, Countdown) become
   quiet typographic blocks, not outlined cards. Numbers big, chrome none.
6. DENSITY BREATHES: at least 1.5x current vertical spacing between
   sections; grids get gutters that read as air, not table cells.
7. THE WIDE CANVAS (owner directive): desktop pages must USE the screen,
   not sit in a ~50% column. Container widens to ~1300-1400px. Mixed widths
   per module type, magazine-style: hero full-bleed; VISUAL modules
   (members, releases, collections, photocards) span wide grids (4-6
   columns on large screens); the side rail carries real weight; PROSE
   modules (lore, era stories, about) stay capped at a comfortable reading
   measure (~70ch) INSIDE the wide canvas, so text never stretches. The
   page fills; the text breathes. A wide canvas of stretched text is a
   failure equal to the boxes.

## Steps

1. TOKEN PASS: Verse design tokens v2 (type scale, spacing rhythm, radii,
   borders, shadows) as CSS variables layered on the existing theme system.
   Commit.
2. MODULE CHROME SYSTEM: default invisible chrome; frame options redesigned
   (each opt-in style must look intentional, magazine-grade); dividers
   opt-in only. The studio's frame picker previews the new styles. Commit.
3. HERO + RAIL REDESIGN: full-bleed hero with integrated masthead/quote,
   quiet rail typography. Commit.
4. THE 6 PRESETS REDESIGNED on the new system (Minimal, Neon, Soft, Retro,
   Y2K, Dark), each a genuinely different mood using type + color + texture,
   never boxes. Commit.
5. BOTH SHOWCASES RECONFIGURED (STAY neon, ATINY soft) + the default
   no-config space. Full screenshot matrix (3 breakpoints x light/dark x
   3 spaces). Commit, then STOP: owner reviews screenshots before this
   workstream closes.
6. After owner approval: closing dual-skill audit sweep (spacing/contrast/
   a11y consistency across every Verse template: space home, entity pages,
   collections, community, studio preview parity). Fix mechanical findings.
   Commit.

## Permitted loops (per LOOP-CHARTER)

- BUILD-VERIFY-FIX per step: GOAL tsc + build + check:routes green + zero
  contrast-guardrail violations · MAX 8 · STOP IF design ambiguity (this is
  a design workstream: when a principle conflict arises, STOP and show
  options rather than guessing).

## Verify

- [ ] Screenshot matrix delivered at step 5; owner approved before close
- [ ] Default space: the approved soft-surface box default (clean, defined boxes
      on info modules; photo grids open; box background optional via 'outline').
      ZERO heavy legacy borders / dotted-divider noise (DOM audit: no legacy
      `rounded-xl border` card wrappers, no dotted divider as a default)
- [ ] Frames still work when opted in; studio preview matches live render
- [ ] SEO parity re-proven after redesign (rich vs empty config, same
      indexable set)
- [ ] Contrast guardrail passes on all 6 redesigned presets, light + dark
- [ ] Play world byte-untouched (diff proof on one Play page's HTML)
- [ ] tsc, build, check:routes green; zero em dashes; no new deps

/caveman report per step; the step-5 screenshot matrix is the deliverable
that matters. The exit bar is written in the roadmap: the owner does not say
"wtf are those boxes".
