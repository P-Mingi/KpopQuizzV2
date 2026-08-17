# W-CUSTOM - the per-space customization studio (one skeleton, infinite faces)

## Claude Code Implementation Prompt

---

Build the system that lets every Verse space look like a different website while
every space ships the SAME crawlable structure. Owner-approved design (prototype
validated 2026-07-30). Read first: VERSE-MASTER-VISION.md, VERSE-ROADMAP-V2.md,
LOOP-CHARTER.md, workstream-wnav.md, the W2/W3 space + editor codebase, and
migration 125 (verse_spaces.module_config exists but is unused; this workstream
gives it its real schema or supersedes it, worker decides and justifies).

Hard rules: NO em dashes. NO new npm dependencies (CSS + existing stack only;
TipTap was the one allowed family and it is already in). No user-facing AI.
Strict-legal images policy applies to every curator upload. Commit per step, do
NOT push. Migrations = owner stop-and-wait, ONE migration for the whole
workstream (next free number, CHECK prod, 139 expected). check:routes green.
Dual-skill /ui-ux-pro-max + /frontend-design on the studio and on every new
module. Three breakpoints, light + dark, on every surface.

## The design model (locked with owner, do not re-litigate)

- STRUCTURE is fixed and identical for every space: zones (hero banner, tab
  nav, main column, side rail, related-graph footer), URL scheme, head tags,
  JSON-LD, section semantics. PRESENTATION is curator-composed from an approved
  BLOCK REGISTRY. Curators never touch HTML/CSS/JS. Config is data, renderer is
  ours.
- Fixed zones, engineered to FEEL like full freedom: many placement points,
  full module reordering, per-module frames, sticker slots everywhere it is
  safe. The curator experiences "I placed this where I wanted"; the system
  experiences "a validated enum."
- SEO INVARIANT (the one law): every block in the registry is tagged
  seo_critical true/false. seo_critical blocks (overview, members, discography,
  timeline data, facts) can be RESTYLED and REORDERED but never removed; an
  attempt to remove one is rejected server-side. Decorative/feature blocks
  (music, countdown, poll, stickers...) toggle freely. Result: rich config and
  empty config emit the same set of indexable content. This gets PROVEN in
  verify, not asserted.
- READABILITY GUARDRAIL (owner-blessed, inviolable): server-side validation
  rejects any config whose text/background combination fails WCAG AA for body
  text. Accent colors auto-adjust shades like the fan card does. No curator
  can publish an unreadable page.

## Config model

- verse_spaces gains `presentation` jsonb (live) + `presentation_draft` jsonb.
  Versioned shape: { version: 1, preset, accent, banner, welcome, tabs[],
  modules[], stickers[], frames }. Zod-style schema validation server-side on
  every save AND publish; unknown block types rejected; human-readable errors.
- Draft/publish flow: the studio edits draft, preview renders draft
  (curator-only), Publish copies draft to live and writes a verse_revisions
  row (entity_type space_presentation) so customization has history and
  rollback like everything else.
- Empty/absent config MUST render the current default look pixel-identical.
  Step 1 proves this before anything else is built.

## Presets (the on-ramp)

6 one-click looks: Minimal, Neon, Soft, Retro, Y2K, Dark. Each preset sets
banner treatment, accent family, sticker pack, frame style, module density in
one tap; every individual control stays editable underneath. Presets are
config templates, not code paths: applying one just fills the same jsonb.

## Zones + modules

- Hero: banner image (curator upload, cropped/validated, aspect reserved so
  zero CLS) + space name + fandom line + optional welcome/intro block (short
  curator text, TipTap-constrained inline schema).
- Tab nav: curator composes 3 to 7 tabs from the allowed tab set (Home,
  Members, Music, Story/Eras, Timeline, Collections, Community, Awards,
  Tours...). MOBILE: first 3 shown inline + a "More" button opening a bottom
  sheet with the full list. NO horizontal-scroll nav anywhere. Hidden tabs do
  NOT hide pages: every entity URL stays live, in the sitemap, and reachable
  via the related-graph footer regardless of tab config.
- Main column: ordered module stack, full reorder + toggle (non-critical only).
- Side rail (desktop): second module stack; folds under main on mobile.
- Related-graph footer: fixed, never curator-controlled.

MODULE REGISTRY v1 (each min-gated, each themable with frames):
1. Existing W2 modules made composable: facts, members, discography, timeline,
   eras, game widgets, collections. (seo_critical where applicable)
2. MUSIC: curator picks one mode per instance: YouTube video embed · audio-only
   strip · small playlist (multiple official tracks) · signature sound (short
   audio on the hero, e.g. a fanchant). ALL click-to-play. Never autoplay.
   Official/allowlisted sources only. Click-to-load: zero third-party network
   requests until the user interacts (facade pattern: thumbnail + play button,
   iframe injected on click).
3. COUNTDOWN: next comeback/birthday/anniversary, computed from entity dates
   we already hold. No external calls.
4. POLL: curator-run space poll, REUSING the existing debate/vote engine
   (space-scoped). Real votes only, obviously.
5. QUOTE HIGHLIGHT: big pull-quote block, fan-written text, NO copyrighted
   lyrics (length cap + policy note in the editor UI).
6. SPOTLIGHT: featured photocard/collectible hero, rotates from the space
   collection.
7. SOCIAL EMBED: one official-account post. Allowlisted official handles only,
   click-to-load (no widgets.js on page load).
8. DISCORD (this IS W-DISCORD-lite, folded in): curator sets the space's
   Discord invite link + optional server widget. Widget is click-to-load
   iframe (Discord widget endpoint), link validated as discord.gg/discord.com.
   Full auto-provisioning stays parked post-launch.
9. LIVE NOW: feasibility spike FIRST. If a quota-cheap YouTube live check is
   not feasible within existing API budget, fall back to a curator manual
   "we are live" toggle with mandatory auto-expiry (max 12h). Report which
   path was taken and why. Do not burn quota to be clever.

## Sticker system (slots, not free-position)

- Sticker SLOTS at safe anchor points: banner corners, between-module seams,
  section-header ends, module frame corners. Per-sticker transforms: scale
  0.5-2x, rotate -30 to 30 degrees, flip. Feels free, breaks nothing.
- Responsive by construction: slots defined per breakpoint; on small screens
  stickers scale down; a slot that would collide with content hides.
- HOUSE PACKS: ship themed sticker packs per preset (hearts, sparkles, retro
  shapes, lightstick motifs... original art, no copyrighted logos).
- CURATOR UPLOADS: allowed with hard constraints: png/webp only (NO svg, XSS
  vector), max 512KB, max 512x512, metadata stripped, per-space cap (20),
  ownership attestation checkbox on upload, reportable via existing flags,
  admin takedown. Storage bucket with RLS.
- Page cap: max 12 placed stickers per page (clutter + perf guard).
- All stickers aria-hidden decorative, lazy-loaded, width/height set (no CLS).

## Themed frames + dividers

Modules can wear a frame style (none, rounded, sharp, sticker-border, soft
shadow) and section dividers come in themed variants. Pure CSS, driven by the
same config, zero JS cost.

## The studio

- /verse/{space}/studio, curator+ only (space_members role check), desktop-
  first, mobile-functional. Left: controls (preset picker on top, then banner,
  accent, tabs, modules with drag-reorder + toggles, stickers, frames).
  Right: LIVE PREVIEW rendering the draft, with breakpoint switcher
  (mobile/tablet/desktop) so curators SEE the More-sheet behavior.
- Every save validates; errors are plain human sentences ("This text would be
  unreadable on that background, pick a darker shade").
- Publish button = the gate; confirm dialog shows a before/after strip.

## Migration (ONE, owner-run, STOP AND WAIT)

Expected 139, CHECK prod first: presentation + presentation_draft on
verse_spaces; verse_space_assets (id, space_id, kind sticker|banner,
storage_path, width, height, bytes, uploaded_by, status active|removed,
created_at); storage bucket + RLS; whatever the space-scoped poll needs IF the
debate engine requires schema (fold it in, do not create a second migration).
If module_config from 125 is superseded, handle it in the same migration and
say so.

## Build order (commit each, NO push)

1. Registry types + config schema + server validation + renderer skeleton.
   Empty config renders today's look pixel-identical (screenshot proof). Commit.
2. Migration spec -> STOP, owner runs -> bucket + tables live. Commit.
3. Presets + accent/banner + contrast enforcement engine. Commit.
4. Composable existing modules + frames/dividers + reorder/toggle with
   seo_critical enforcement. Commit.
5. New modules cluster A: countdown, quote, spotlight, poll. Commit.
6. New modules cluster B: music (all four modes), social embed, Discord
   module (W-DISCORD-lite). All click-to-load proven. Commit.
7. LIVE NOW spike -> verdict -> chosen path built. Commit.
8. Sticker system: packs, uploads, slots, transforms, caps. Commit.
9. Tab composer + mobile More sheet. Commit.
10. The studio (preview, draft/publish, revisions). Commit.
11. TWO SHOWCASE SPACES: configure two real spaces radically differently from
    one skeleton (the proof artifact). Screenshots all breakpoints. Commit.
12. Verify sweep. Commit.

## Permitted loops (per LOOP-CHARTER)

- BUILD-VERIFY-FIX per step: GOAL tsc + build + check:routes + step tests
  green · MAX 8 · STOP IF second migration needed / policy touch / design
  ambiguity.
- QA SWEEP at end: contrast fuzzing (adversarial configs), upload abuse cases,
  em-dash grep, a11y pass, click-to-load network audit · MAX 5 · REPORT
  iterations used.

## Verify (phase end, prove everything)

- [ ] SEO parity proof: one space rendered with empty config vs rich config;
      extract title/meta/H1/JSON-LD + all seo_critical section text; identical
      sets. This is the headline proof, show the diff output.
- [ ] Removing a seo_critical block via direct API call -> rejected.
- [ ] Adversarial config (white text on white, 1px banner, 50 stickers,
      unknown block type, svg upload, 8 tabs) -> every one rejected with a
      human-readable error.
- [ ] Zero third-party requests on page load for music/social/discord modules;
      requests appear only after click (network log proof).
- [ ] 7-tab config on mobile: 3 inline + More sheet, all tabs reachable,
      keyboard + focus-trap correct, no horizontal-scroll nav.
- [ ] Draft invisible to public until publish; publish writes a revision;
      rollback restores the previous look.
- [ ] Hidden tab's pages still in sitemap + reachable via footer graph.
- [ ] Perf: LCP/CLS on both showcase spaces within noise of baseline; stickers
      lazy + sized.
- [ ] Empty-config space still pixel-identical to pre-W-CUSTOM (regression
      screenshot).
- [ ] tsc, build, check:routes green; zero em dashes; NO new dependencies;
      touched pages keep their static/ISR symbols.

/caveman report per step: screenshots (studio + both showcase spaces, 3
breakpoints, light/dark), the SEO parity diff, the click-to-load network log,
the LIVE NOW verdict, loop iterations used, deviations + why. If any step
risks the SEO invariant or needs a second migration, STOP and report.
