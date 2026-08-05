# V-BUILDER-3 - fandom space component inventory (D1 "complete named registry audit")

Every visible component on a fandom group space, NAMED, mapped to its block, with its
editorSchema status. The goal (owner D1): "recreate every existing component from scratch in
the editor." A component is EDITOR-READY when its block has an `editorSchema` (this step's
foundation) and its content tab is built (later steps). Status legend:

- **wave 1** - editorSchema authored this step (step 1). Content tab: step 2+.
- **wave 2** - editorSchema deferred to a later V-BUILDER-3 wave (step 6 unless noted).
- **chrome** - page header/footer, not a placeable block (hero/identity editor is step 5; the
  footer navbox + backlinks are intentionally fixed, never curator-controlled).
- **block pending** - schema authored, but no placeable block/renderer yet (image/youtube/hero).

## How the page assembles

`layout.tsx` renders the CHROME (hero + tabs); `page.tsx` renders the MODULE STACKS:
`presentationToComposition -> CompositionRenderer -> SpaceHomeRenderer -> two Stacks (main +
side) -> ALL_MODULES[type]` (module-registry.tsx). `BLOCK_REGISTRY` (29 module types) supplies
default zone/order/seoCritical; `resolvePlacements` builds the default layout when there is no
saved presentation.

## Page chrome (hero / header / footer)

| Component | Renders in | Block / part | Data | editorSchema status |
|-----------|------------|--------------|------|---------------------|
| Hero band (whole header) | space-hero.tsx `SpaceHero` | **hero** (identity editor) | mixed | **wave 1** (block pending, editor step 5) |
| - Banner image / gradient / solid | SpaceHero | hero.banner | curator | wave 1 (field) |
| - Profile picture / logo | SpaceHero `GroupLogo` | hero.avatar | entity | wave 1 (field) |
| - Kicker ("Home of {group} fans") | SpaceHero | hero (derived) | entity | wave 1 (derived) |
| - Display name (fandom wordmark) | SpaceHero | hero.displayName (the page H1) | entity | wave 1 (derived override) |
| - Hero vitals line ("Est. 2013 · 5th gen · 7 members · 20 releases") | SpaceHero | hero.chips (chrome vitals, distinct from the `vitals` MODULE) | entity | wave 1 (derived chips) |
| - Tagline / welcome line | SpaceHero | hero.tagline | curator | wave 1 (field) |
| - Actions (Join / Build toggle / Curate / SNS) | SpaceHero | chrome | community/curator | chrome |
| - Hero NOW signals (comeback skin, live-now, countdown, anniversary, birthday) | SpaceHero `verse-hero-now` | chrome (overlaps `countdown` module + reserved `live_now`) | entity+curator | wave 2 (a "Now / events" block is the clearest gap - see candidates) |
| Breadcrumbs | page.tsx `Breadcrumbs` | chrome | derived | chrome |
| Space tab bar | space-tabs.tsx `SpaceTabs` | chrome (tab visibility = presentation.tabs) | derived | chrome |
| Related groups navbox (footer) | related-navbox.tsx | chrome (never curator-controlled) | derived | chrome (fixed) |
| "Mentioned by" backlinks (footer) | space-home-renderer.tsx | chrome | derived | chrome (fixed) |

## Placeable modules - MAIN column (default)

| Component | Block type | Data | seoCritical | editorSchema status |
|-----------|-----------|------|-------------|---------------------|
| Intro lede | `intro` | curator | yes | wave 2 (rich-text; inline editor generalizes SECTION_FOR) |
| **Vitals bar** ("Debut 2013 · 7 members · Columbia Records · ARMY") | `vitals` | entity | yes | **wave 1** |
| **Members grid** | `members` | entity | yes | **wave 1** (flagship, editor step 4) |
| "The story so far" | `story` | curator | no | wave 2 (rich-text) |
| **"Latest releases" (discography teaser: title + <=6 links + "All N")** | `discography` | entity | yes | wave 2 (entity teaser: pick/limit/label) |
| "Now" (current era + next date) | `countdown` | entity | no | wave 2 |
| "Go deeper" | `go_deeper` | entity | no | wave 2 |
| "Collections" teaser | `collections` | community | no | wave 2 |
| "Community" | `community` | community | no | wave 2 |
| "Play" (games shelf, last block) | `game_widgets` | community | no | wave 2 |

## Placeable modules - SIDE rail (default)

| Component | Block type | Data | editorSchema status |
|-----------|-----------|------|---------------------|
| "On this day" | `on_this_day` | entity | wave 2 |
| **"In numbers" stats band (the DATA block)** | `stats` | entity today; curator rows in the DATA editor | **wave 1** (renamed DATA: label + value + source per row) |
| "Curators" invite | `masthead` | community | wave 2 |
| "Coverage" meter | `completeness` | entity | wave 2 |
| Photocard binder widget | `binder_widget` | community | wave 2 |
| Collectibles shelf widget | `shelf_widget` | community | wave 2 |
| "Featured essay" | `featured_essay` | community | wave 2 |
| "Atlas" mini-map | `atlas_mini` | entity | wave 2 (D4 atlas index redesign is separate) |
| "Talk of the space" featured thread | `featured_thread` | community | wave 2 |

## Placeable but OFF by default (library-only today)

| Component | Block type | Data | editorSchema status |
|-----------|-----------|------|---------------------|
| Music (YouTube/audio/playlist/signature) | `music` | entity/curator | wave 2 (legacy props clamp stands until then) |
| Poll | `poll` | community | wave 2 |
| **Quote highlight** | `quote` | curator | **wave 1** |
| Spotlight (featured photocard) | `spotlight` | entity | wave 2 (legacy props clamp) |
| Social post embed | `social_embed` | curator | wave 2 (legacy props clamp; youtube split-out) |
| Discord widget | `discord` | curator | wave 2 (legacy props clamp) |

## Registered blocks with no renderer yet

| Block type | Data | seoCritical | editorSchema status |
|-----------|------|-------------|---------------------|
| **`timeline`** | entity | yes | **wave 1** (schema authored; renderer + editor later) |
| `facts` (infobox) | entity | yes | wave 2 |
| `eras` | entity | yes | wave 2 |
| `live_now` | curator | no | wave 2 (folds into the NOW/events block) |

## Composition-only specs (not in BLOCK_REGISTRY, no home renderer)

| Spec | editorSchema status |
|------|---------------------|
| **`doorway`** (link/button/card/feature door) | **wave 1** (config in presentation.doorways; per-door editor is a deferred V-BUILDER-2 item, now step 6) |
| `prose` (generic rich-text block) | wave 2 (rich-text via the inline editor) |

## Blocks needing a NEW definition (schema authored this step, block pending)

- **hero / identity** (D2) - banner, profile picture, display name, tagline, vitals chips.
  Schema authored (wave 1); the block + editor are step 5. Today these are hero CHROME fields.
- **image** (D1) - a single image with alt (required), caption, link, size. Ingest-copied to
  our storage (L-047), never an external URL. Schema authored (wave 1); block + rail step 3/6.
- **youtube** (D1) - a click-to-load YouTube facade. Schema authored (wave 1); block step 6.
- **Now / events** (candidate) - the hero NOW signals + reserved `live_now` have no unified
  placeable block. Flagged for a future wave; not in wave 1.

## The two flagged cases (owner)

- **Vitals bar** = the `vitals` MODULE (`VitalsStrip`), a placeable, seoCritical, default
  main-column block - NOT the hero. TRAP: the hero renders its OWN vitals line too
  ("Est. 2013 · 5th gen · ..."), which is chrome (a `hero.chips` field). Two distinct vitals
  lines, both visible on the home.
- **"Latest releases"** = the `discography` teaser (`Discography`, registry label literally
  "Latest releases"): title + up to 6 release links + an "All {N}" link to the sub-page.
  Placeable + seoCritical; editor wave 2.

## Coverage

6 of 31 BLOCK_SPECS carry an editorSchema after step 1 (doorway, members, quote, stats,
timeline, vitals) + 3 schema-only blocks pending a definition (hero, image, youtube) = the
nine wave-1 editors. The remaining 25 specs are dated deferrals to later V-BUILDER-3 waves
(mostly step 6), tracked in the table above. Verify item satisfied: "every registry block has
an editorSchema or a dated deferral."
