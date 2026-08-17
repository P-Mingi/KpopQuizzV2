# VERSE BUILDER BLUEPRINT - the perfect editor, rethought from scratch

Founding document (owner directive 2026-08-02): rebase the whole editing,
content, and personalization system into ONE builder: every piece of a
fandom is a block or widget, arranged on a grid, edited live (desktop +
phone), from a full library with per-block personalization, like the best
website builders, with perfect SEO as unbreakable law. Plus the rethought
group-page UX, lean navigation, templates, the node map, and one full
admin surface for all of a fandom's admins.

---

## 1. THE ARCHITECTURE RULING (the one big decision, made honestly)

Research synthesis of the four reference systems:
- WIX/WIX STUDIO: free-form pixel placement, unlimited freedom. REJECTED
  as a model: absolute positioning breaks mobile, destroys reading flow,
  makes DOM order meaningless (SEO poison), and produces the messy pages
  fandom.com is hated for. Freedom without structure is the trap.
- SQUARESPACE FLUID ENGINE: drag-and-drop INSIDE a responsive grid of
  rows/columns per section. ADOPTED: this is the grid model: real
  building freedom, mobile-safe by construction.
- NOTION: everything is a block (id, type, properties, children), blocks
  nest, pages nest inside pages, databases are blocks with multiple
  views. ADOPTED as the data model: we already built most of it
  (V-PAGES nesting, the module registry, the doorway registry): this
  blueprint UNIFIES it.
- WORDPRESS GUTENBERG: the block INSERTER (library with categories +
  search) and PATTERNS (pre-composed multi-block sections you insert
  whole). ADOPTED for the library UX and the template system.

THE FORMULA: Notion's block model + Fluid Engine's constrained grid +
Gutenberg's library-and-patterns + our own SEO invariant and registry
laws. A builder that FEELS like Wix freedom but is structurally incapable
of producing a broken, unreadable, or SEO-damaged page.

## 2. PRECISE AUDIT OF TODAY (what exists, what fragments)

EXISTS (strong, reuse all of it):
- 22 placeable module types in the presentation registry (facts, members,
  discography, timeline, eras, game_widgets, collections, music,
  countdown, poll, quote, spotlight, social_embed, discord, live_now,
  masthead, stats, essays, atlas_mini, binder_widget, shelf_widget,
  and the doorway system).
- Prose editor (TipTap): StarterKit (paragraph, headings, lists, quote),
  Table, Image-by-policy, Link, mentions w/ hover previews, citation
  chips, widget embeds, section templates, autosave, conflict merge,
  revisions, suggest queue, first-edit tour.
- Text marks today: Bold, Italic, Color (limited).
- 8 frame styles; 6 sticker slots + transforms + packs + uploads; 6
  visual presets; 4 structure templates; doorway formats
  (link/button/card/feature + crawlable collapse).
- Draft/publish/rollback + reader lens + light/dark preview in the
  studio; Build mode toggle; per-world chrome.
- The four-door PageShell on all 42 page types; parent_page_id nesting.

THE GAPS (why it is not yet a builder):
1. SIX editing surfaces (studio, curate, create, patrol, quests,
   insights) + the prose editor = fragmentation. Layout is edited in one
   place, content in another, admin in a third.
2. NO GRID: layout is a fixed main-column + rail. No columns, no spans,
   no side-by-side blocks, no gallery rows.
3. NO edit-in-place: the studio previews; it does not let you click the
   real page and edit it.
4. NO per-block style panel: frames exist, but there is no unified
   "select block -> style it" model (background, radius, density,
   alignment, text options per block).
5. Text formatting is thin: no size steps, alignment, highlight,
   underline; color exists but not token-governed everywhere.
6. Entity pages (album/idol/tour/show/ost) have NO composition home: only
   the space home + wiki pages are truly arrangeable.
7. No PATTERNS: templates exist only at whole-space level, not as
   insertable pre-composed sections.
8. No true phone-editing mode; no per-breakpoint control.

## 3. THE BLOCK SYSTEM (the complete taxonomy)

Every block ships as a BlockSpec: { id, category, icon, name, one-line
description, dataSource (real-data law), seoCritical flag, allowedZones,
styleOptions, minGateRule, editorParityControl }. The registry is config
(the V3 niche-agnostic law); the library UI reads the registry.

### A. LAYOUT blocks
- SECTION: the top unit of every page. Width: text (66ch) / wide (grid) /
  full-bleed. Owns a background tint (token), padding density, divider.
- COLUMNS: 2 / 3 / 4, ratio presets (50-50, 60-40, 70-30, thirds). Auto
  stack on mobile (order preserved or per-block mobile order override).
- GRID GALLERY: N-up card/image grid with gutter presets.
- SPACER (height steps), DIVIDER (the themed styles).
- TOGGLE/ACCORDION: the crawlable <details> pattern (content always in
  HTML - the collapse law).
- TABS-IN-PAGE: REJECTED v1 (hidden-content-at-load hurts SEO scan +
  streams badly); accordion covers the need honestly.

### B. TEXT blocks
- HEADING (h2/h3 only: h1 is the page title, the one-H1 law).
- PARAGRAPH, LIST (bullet/numbered), QUOTE, PULL-QUOTE (editorial serif),
  CALLOUT (info/tip/warning variants on token tints), TABLE,
  AUTO-TOC (from headings, the existing system).
- Marks (all token-governed): bold, italic, underline, strike, highlight
  (token tints), text color (TOKEN PALETTE ONLY, contrast-clamped: the
  ink law: never raw hex), size steps (S/M/L on the type scale, not
  free px), alignment (left/center), inline mention, citation chip, link.

### C. MEDIA blocks
- IMAGE (policy-legal sources only: entity/space assets, Cover Art
  Archive), GALLERY, COVER-ART block.
- VIDEO EMBED (official YouTube, click-to-load facade: the law).
- AUDIO PREVIEW (the blindtest 30s legal clip player), MUSIC PLAYLIST
  (curated official tracks), SIGNATURE SOUND.
- SOCIAL EMBED (official accounts, click-to-load), DISCORD widget.
- NO raw uploads beyond the existing sticker/banner policy (W5.4 stays
  the gate for anything more).

### D. LIVE/DATA widgets (the 22 modules, now placeable anywhere allowed)
Facts/infobox, members grid, member wall, discography, song deck teaser,
timeline / era spine, era chapter, countdown, poll, stats band (In
Numbers), spotlight, binder, shelf, atlas mini-map, featured essay,
featured thread, this-day, coverage meter, masthead/curators, live-now,
game widgets, quiz embed, badge showcase, contribution graph.
Each keeps: real data only, min-gate, its distinct identity inside the
WidgetShell harmony.

### E. DOORWAY/NAV blocks
Doorway (link/button/card/feature), pages-inside (children), what-links-
here, CTA button (internal targets), jump-anchor row, breadcrumb (auto,
not placeable: it is shell law).

### F. FAN/CULTURE blocks
Sticker (slot-anchored, transforms), fanchant, glossary term, welcome/
intro (seoCritical), fan-written badge callout.

## 4. THE STYLE SYSTEM (per-block personalization, all clamped)

Select any block -> the STYLE PANEL shows exactly its options:
- Frame (the 8 styles), background (token tint set), corner radius
  (3 steps), padding density (3 steps), divider above/below.
- Accent override per block (contrast-clamped by the ink floor: the
  guardrail that already exists).
- Text options where the block carries text (size step, weight, align,
  token color).
- Sticker attach points on framed blocks.
- Per-block visibility: never for seoCritical blocks (they can move and
  restyle, never vanish: the W-CUSTOM law); crawlable collapse instead.
EVERYTHING is registry config -> validated server-side -> rendered from
tokens. No raw CSS, no raw hex (the token gate already enforces it in
the build). A hostile config CANNOT produce an unreadable or broken page:
the clamps make it structurally impossible.

## 5. THE GRID (freedom without the Wix trap)

- 12-column responsive grid INSIDE sections. Blocks span columns (drag
  the handle: 12 / 6+6 / 4+4+4 / 8+4...). Sections stack vertically.
- READING-ORDER LAW: DOM order = semantic reading order = SEO order,
  always. The grid changes VISUAL placement via CSS only; the builder
  shows a "reading order" strip so the author sees what a crawler and a
  screen reader read. Free x/y positioning does not exist.
- Breakpoints: desktop (12-col), tablet (auto 8), phone (stack). Per-
  block mobile overrides are LIMITED to: order within section + full/half
  span + hide-on-phone ONLY for non-seoCritical decorative blocks
  (a crawlable-collapse variant, never display:none on content).
- Caps: max blocks per section, max columns nesting depth 1 (a column
  cannot contain columns), the volume caps from the doors law.

## 6. THE BUILDER ENVIRONMENT (one surface, edit-in-place)

/verse/{slug}/build: ONE builder replacing the studio+curate+create
fragmentation:
- THE CANVAS is the real page (same renderer as readers see), in Edit
  mode: click a block to select, drag to reorder, grid handles to span,
  type directly into text blocks (edit-in-place). Preview toggle = exact
  reader view (the proven reader lens). Device switcher: desktop /
  tablet / phone, real breakpoints.
- THE LIBRARY (left panel, the Gutenberg inserter model): tabs =
  Blocks (categorized A-F, searchable, drag or click-to-insert) and
  PATTERNS (pre-composed sections: "Hero + vitals", "Era spotlight",
  "Meet the members", "Comeback countdown", "Collector corner", "New fan
  start here"...), each pattern = data, inserted then fully editable.
- THE STYLE PANEL (right, contextual): the selected block's options
  (section 4) + the page-level settings (preset, accent, tabs) that the
  studio holds today.
- SAFETY RAILS (all existing, now unified): autosave to draft, publish
  with before/after confirm, rollback, revision history, reader lens,
  edit-conflict guard (extend to section-level locks: two admins editing
  different sections simultaneously is fine; same section = the guided
  merge), role-aware (curator+ builds; contributors edit prose per the
  affordance law).
- PHONE BUILDING: the builder itself works on a phone for the short
  tasks (insert a block, reorder, edit text, style tweak); complex grid
  work stays desktop-first (the honest mobile law).
- ONBOARDING: the first-build tour (3 steps: library, canvas, publish),
  same pattern as the first-edit tour.

## 7. PAGE UX + THE NODE MAP (the lean rethink)

- LEAN NAVBAR LAW: the reader navbar shows at most 5 tabs + More:
  default set HOME · MEMBERS · MUSIC · STORY · COMMUNITY. Everything
  else (wiki/atlas, collections, essays, awards, tours, songs...) is
  reached through HOME DOORWAYS, the atlas, and search: the node map is
  the navigation, the navbar is just the spine. (Today's 12+ tabs
  violate this; templates re-tune.)
- THE NODE MAP (the ideal fandom structure):
  HOME -> five hubs -> entities -> infinite wiki depth:
  1. PEOPLE (members wall -> idol -> solo work/credits -> wiki pages)
  2. MUSIC (discography -> album -> songs -> MV/choreo/versions pages)
  3. STORY (era spine -> era -> comebacks/tours/awards -> concert pages)
  4. CULTURE (wiki/atlas -> glossary, guides, fanchants, lore)
  5. COLLECT + PLAY (binder, shelf, quizzes, blindtest)
  Every node reachable in <= 3 clicks from home; the atlas mirrors this
  tree; the four-door shell keeps every leaf connected.
- THE HOME: composed of SECTIONS (built in the builder) following the
  proven canonical order as the default pattern set: hero, intro,
  vitals, members, story trailer, releases, now, go-deeper, collections,
  community, play, footer. Curators recompose freely; seoCritical spine
  persists.
- TEMPLATES 2.0: full-page templates (the 4 structure templates,
  recomposed as block documents) + section PATTERNS + per-block styles:
  three levels of one-tap starting points, all data, loss-free to
  switch (the proven law).

## 8. THE ADMIN HUB (one door for every admin)

/verse/{slug}/admin: ONE role-aware surface with tabs (each an existing
surface, consolidated, not rebuilt):
- BUILD -> the builder (section 6)
- CONTENT -> pages, drafts, review queue, suggestions (curate today)
- PEOPLE -> the roles panel (exists) + member directory admin
- GROWTH -> insights (exists) + coverage/quests overview
- MODERATION -> patrol, flags, banned terms (exists)
- SETTINGS -> space config, feed opt-in, discord, charter link
Each admin/curator sees the tabs their role unlocks (the affordance
truth law). The Build-mode toggle's builder layer points here. The six
scattered surfaces become redirects into their tab.

## 9. THE SEO LAWS (unbreakable, restated for this system)

1. Server-rendered semantic HTML for every block; the canvas edits the
   same components readers get.
2. DOM order = reading order; grid is CSS-visual only.
3. One H1 per page; heading hierarchy comes from block structure.
4. seoCritical blocks: restyle and move, never remove, never hide
   (crawlable collapse at most).
5. Links are real <a href> with true titles regardless of skin (the
   doorway law). Images sized + alt (no CLS). Embeds click-to-load.
6. Min-gate everywhere; no dead doors; no fabricated content.
7. JSON-LD per page type, escaped at the sink; canonical rules for any
   mirrored surface; sitemap = canonical URLs only.
8. THE PARITY PROOF METHOD: any config vs default must emit the same
   indexable set (text, hrefs, headings). Proven per phase, as always.

## 10. ARCHITECTURE + MIGRATION NOTES

- Storage: a page COMPOSITION document (sections -> blocks -> props) in
  jsonb, versioned via the existing revision rails. The space home
  extends verse_spaces.presentation; wiki pages extend their existing
  document; ENTITY pages need a composition home: THIS is the moment the
  deferred per-page jsonb migration becomes justified (one migration,
  owner-run, when phase 3 reaches entity pages).
- The renderer is ONE component tree reading compositions; the 22
  modules become block implementations behind the registry (mostly
  adapters, not rewrites).
- Validation: one composition validator (zod-style, like presentation):
  unknown block rejected, caps enforced, seoCritical presence enforced,
  clamps applied.
- No new deps expected except possibly a drag-and-drop utility: evaluate
  hand-rolled (HTML5 DnD + keyboard) FIRST per the no-new-deps law; a
  dep needs the loud-justification gate.

## 11. PHASED ROADMAP (each phase prototype-first with the owner)

- PHASE 1 - THE UNIFIED BLOCK MODEL: composition schema + validator +
  one renderer; the 22 modules + prose blocks become registry blocks;
  the style panel options defined per block. (Foundation, mostly
  invisible.)
- PHASE 2 - THE BUILDER CANVAS: /build with edit-in-place canvas,
  library, style panel, device preview, autosave/publish: for the SPACE
  HOME first (it already has composition storage).
- PHASE 3 - THE GRID + PATTERNS: sections/columns/spans, the pattern
  library, templates 2.0; extend building to wiki pages, then entity
  pages (the one migration).
- PHASE 4 - THE ADMIN HUB: consolidate the six surfaces into
  /admin tabs; retire the fragments as redirects.
- PHASE 5 - THE LEAN NAV + NODE MAP: navbar law applied via templates,
  home patterns tuned, atlas aligned to the five-hub tree.
Each phase: owner prototype gate before build, the standing rules
(commit-not-push, migrations owner-run, Play triple-proof, parity
proofs, dual-skill design), and a closing sweep.

## 12. Owner rulings LOCKED (2026-08-02)

Q1 GRID: the constrained 12-column grid (Fluid Engine model) with the
   reading-order law is CONFIRMED. Free x/y placement does not exist in
   this system, ever.
Q2 LEAN NAVBAR: max 5 reader tabs + More is CONFIRMED as the default
   law; existing templates re-tune in Phase 5.
Q3 ADMIN HUB: consolidation of the six surfaces into /admin tabs is
   CONFIRMED (old routes become redirects).
Q4 ENTITY-PAGE BUILDING: approved IN PRINCIPLE; the per-page composition
   migration is written at the Phase 3 gate and owner-run as always.

## 13. Spike verdict + locked co-designs (2026-08-02)

SPIKE VERDICT (V-BUILDER-0, approved): Phase 2 architecture = B: same-
origin iframe of the REAL render (zero drift, proven by diff) + client
overlay + optimistic same-origin DOM updates (structural edits instant,
0.8ms) + background validated save; inline text via native
contentEditable in the iframe. Phase 2 MUST: same-origin iframe
(mandatory), a chrome-less draft-render route (route group), STABLE
BLOCK IDS in the composition (never array index), the
optimistic + iframe-truth + reconcile-on-reload pattern. Spike files
kept as reference (spike-* routes, curator-gated, noindex).

LOCKED CO-DESIGN 1 - THE BUILDER CHROME (owner: "looks perfect, letsgo"):
- Canvas = the REAL page, full width, edit-in-place. Nothing permanently
  shrinks the view.
- Library (left) + style panel (right) are FLOATING drawers over the
  canvas; Esc dismisses; they never dock permanently.
- Slim top bar only: world/space name, device switcher (desktop/tablet/
  phone), undo/redo, draft state ("saved Xs ago"), Preview, Publish.
- Selected block: accent outline + name tag + grip/duplicate handles;
  "+ add block" seams between blocks.
- Library tabs: Blocks (6 categories) / Patterns; searchable.
- Style panel is contextual to the selected block (frame, background,
  density, width span, duplicate/collapse/delete).
- PHONE: panels become bottom sheets; select by tap; actions via action
  sheet; no drag on phone (tap-first law); grid/span work desktop-first.

LOCKED CO-DESIGN 2 - THE BLOCK LIBRARY INTERIOR (owner validated
2026-08-04):
- Blocks tab: search on top; a FREQUENT quick-row (last-used blocks,
  one tap); then the 6 categories as 2-up compact cards (icon + name +
  one honest plain line each).
- HONEST-HINT CARDS: a block whose data source is empty says so on the
  card ("needs a poll first") instead of inserting a ghost that
  min-gates invisibly. The honesty laws reach into the builder itself.
- Patterns tab: visual mini-previews of the actual composed section;
  a pattern inserts WHOLE at the marked seam, then every block inside
  is individually editable. Card shows name + block count.
- Insert lands at the marked "+ add block" seam on the canvas.

CO-DESIGN QUEUE (prototype owner+assistant in chat, lock, then build):
1 builder chrome LOCKED. 2 block library LOCKED. Next = the style panel
detail, then the mobile edit sheet, then patterns, then the admin hub
layout.
