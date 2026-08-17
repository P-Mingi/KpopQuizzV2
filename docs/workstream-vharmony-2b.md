# V-HARMONY-2B - one product (widget family, Play/Verse seam, one voice)

## Claude Code Implementation Prompt

---

Wave 2, dimensions 2-4 (owner-approved 2026-08-01, widget-shell prototype
validated). After 2A made the graph one connected thing, 2B makes the
CHROME feel like one product. Three convergences: the home-widgets share
one shell, the Play/Verse seam is walked and smoothed, and one microcopy
voice runs across every surface. Read: workstream-vharmony-1.md (the
primitives), workstream-wnav.md (the toggle), the widget + space-home +
community + profile code.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps. No
migration expected (STOP if one appears). Play triple-proof (the seam
work touches shared chrome: prove Play head byte-identical + layout probe
+ screenshot every step). The V-HARMONY-1 primitives + token gate +
min-gate + SEO invariant laws all hold. Dual-skill design.

## Step 1 - the widget family (one WidgetShell)

Audit found ZERO shared widget shell: verse-home-strip is a bare grid,
binder-widget a flex, shelf-widget a flex, my-spaces-strip a bordered
card. Build one <WidgetShell>: eyebrow header (the harmonized
SectionHeader) + optional action link + body, one frame (surface-2, 0.5px
border, 12px radius), one padding/spacing rhythm. Converge every home
widget onto it: verse-home-strip (In Numbers), binder-widget, shelf-widget,
my-spaces-strip, community-cross-promo, the featured-essay widget, the
atlas mini-map widget, countdown, this-day, completeness, contributor
spotlight, and any other space-home module rendered as a widget. Each
keeps its own body + accent (distinct identity); all share the shell
(global harmony). Grep-prove: no home widget rolls its own outer wrapper.
Min-gate unchanged. Commit.

## Step 2 - the Play/Verse seam (walk it, smooth it)

The "one passport, two worlds" join was built (W-NAV toggle, shared
community + profile) but never walked end to end as one journey. Do the
walk as a real user and fix the seams:
- The toggle: crossing Play <-> Verse is smooth, the current world is
  always legible, no jarring chrome flip beyond the intended world accent.
- SHARED surfaces (community hub, profile) read as belonging to BOTH,
  not as a Verse page wearing Play chrome or vice versa: consistent
  header/footer/nav treatment on the shared pages.
- Cross-links both directions resolve and feel intentional (a game
  result -> its Verse space; a space -> its quizzes; the profile spanning
  both worlds).
- Verse-side widgets and Play-side widgets that appear together (e.g. on
  the community hub) share the 2B widget shell so the two products look
  like one.
- Report every seam found + how it was smoothed. Play triple-proof: the
  Play world stays byte-identical where it should; only genuinely-shared
  chrome changes, documented.
- Commit. STOP if smoothing a seam would touch Play content/head tags
  (that is a design call, not a mechanical fix): report it.

## Step 3 - one microcopy voice

V-HARMONY-1 unified the EmptyState voice; extend that one voice to ALL
copy: buttons, CTAs, section labels, tooltips, errors, confirmations.
- The voice rule (same as 2A/1): warm, plain, fan-made, sentence case,
  active verb-first CTAs, no corporate filler (no "simply/just/easy/
  seamless/unlock"), no shouting exclamations, errors say what happened +
  what to do.
- Audit + converge: grep the Verse surface for CTA/button/label strings;
  fix off-voice copy to the rule; consolidate near-duplicate phrasings
  ("Save" vs "Save changes" vs "Update", etc.) to one consistent term per
  action.
- Deliver a before/after copy log (the strings changed).
- Commit.

## Step 4 - STOP: owner review

Matrix: a space home showing 5+ widgets in the unified shell (the family);
the Play/Verse toggle journey (Play page -> toggle -> Verse space ->
shared community -> profile spanning both); a before/after of the voice
pass on a few key surfaces. 3 breakpoints x light/dark.

## Step 5 - closing sweep after approval

Dual-skill consistency audit; grep-prove widget-shell coverage (no ad-hoc
widget wrappers); Play triple-proof (head byte-diff on the ranking pages
+ layout probe + screenshot); a11y (widget headers as landmarks, toggle
announced); SEO parity (shared-chrome changes do not alter indexable
content or Play head tags); full build; em-dash grep; check:routes; token
gate. Commit.

## Verify

- [ ] Every home widget wears the WidgetShell (grep: zero ad-hoc widget
      wrappers); each keeps distinct body + accent; min-gate intact
- [ ] Play/Verse seam walked: toggle smooth, shared surfaces consistent,
      cross-links both directions resolve; seams-found log delivered
- [ ] One voice: off-voice CTAs/labels/errors converged; before/after
      copy log delivered; near-duplicate action terms consolidated
- [ ] Play triple-proof holds (byte-identical where it should be; only
      documented shared chrome changed)
- [ ] tsc/build/routes/token-gate green; zero em dashes; no new deps; no
      migration

/caveman report per step; step 4 is the owner gate. 2A made the graph one
thing; 2B makes the product feel like one thing.
