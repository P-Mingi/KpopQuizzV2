# VERSE V4 DIRECTIVES - the owner's walkthrough verdict (2026-07-31)

The owner walked the full BTS space (the V-POLISH-2 step-6 matrix) and
issued the largest design directive of the project. This document captures
EVERY point, organizes it into workstreams, and records the three laws that
now govern all Verse UI work. Nothing here is optional; details matter.

## THE THREE LAWS (standing, all future work)

1. EDITOR PARITY LAW: every UI/UX capability we build ships WITH its
   curator/editor control in the same workstream. If we can decorate,
   arrange, or configure something, users can too. No admin-only beauty.
2. WIDGET DUALITY LAW: every big nav tool exists in two forms: its FULL
   PAGE (the nav destination) and its HOME/EMBED WIDGET version (placeable
   on the space home or inside any deep page via the registry). Each
   widget has its OWN visual identity, instantly recognizable, distinct
   from its neighbors, inside the global harmony.
3. INFINITE DEPTH LAW (re-affirmed): first look = clean, never
   overwhelming. Every click opens more. Every topic can have a page, every
   page can contain pages ("a 2017 concert in Dallas is a page inside a
   page"). Writers can go infinitely deep; readers never drown.

## PART 1 - PAGE-BY-PAGE VERDICTS (the step-6 iteration list)

1. SPACE HOME: not easy to read: the separations and titles fail. Section
   titles need real hierarchy (not identical small-caps eyebrows on
   identical cards); separation needs rhythm variation (alternating
   treatments, not a stack of same-weight boxes).
2. IDOL PAGE (RM): weirdly organized. The left column dies after FACTS
   (huge void under it), What-ARMY-Know floats, games buttons sit mid-page,
   other-members strip is fine but placement arbitrary. Reorganize: facts
   rail that stays useful (sticky, more facts, positions/debut visible),
   content column with real order (identity -> lore -> stats -> games ->
   siblings -> discussion).
3. DISCOGRAPHY: cards are bare text boxes: needs COVER ART (we have it),
   era grouping or visual timeline flavor, and the JP/type chips designed.
4. SONG DECK: add per-album cover art (partially there) AND a PLAY
   affordance per track: click-to-play using an already-legal audio source
   (see question Q3), never autoplay, never full streaming we are not
   licensed for.
5. SONG PAGE: "so ugly": full redesign on the album-template standard
   (cover-led tinted header, credits, story link, play affordance, related
   exits).
6. TIMELINE: better than the current dots+lines: the era spine deserves
   art, era color fields, chapter presence (the approved prototype spirit,
   pushed further).
7. AWARDS: "twice better": visual upgrade with icon/badge design, year
   grouping with weight, trophy iconography, and (per the parity law)
   curator decoration: images, icons, borders, colors: available here and
   on ALL pages via the presentation system.
8. PHOTOCARDS + COLLECTIBLES: not a grid page: a FLAGSHIP TOOL and a
   differentiator (this is what makes a specialized K-pop platform).
   Think deeply; see V-CARDS-MAX below.
9. WIKI TAB: wrong mental model. The whole fandom IS the wiki: every page
   (idol, choreography, dance, concert) is a node of one graph. The Wiki
   tab becomes the ATLAS: see V-ATLAS below.
10. ESSAYS: push to the max: a whole blog platform; see V-ESSAYS-MAX.
11. QUESTS: should not sit in the public reader nav; see V-MODES.
12. COMMUNITY: acceptable for now: gets its own future workstream
    (V-COMM-3, already queued) to rethink properly.

## PART 2 - THE NEW SYSTEMS (specced workstreams)

### V-MODES: reader nav vs BUILD mode
The 14-tab nav is builder clutter shown to readers. Split the experience:
- READER NAV (default, everyone): the clean tab set (Home, Members,
  Discography, Timeline, Songs, Photocards, Collectibles, Wiki/Atlas,
  Community, About: exact set owner-tunable per template).
- BUILD MODE: a role-aware toggle next to the space identity for signed-in
  members with rights. Activating it reveals the builder layer: Quests,
  essay management, drafts, the studio, roles panel, review queue:
  exactly what the viewer's role unlocks, nothing more. The UI shifts
  subtly (an "editing" accent) so you always know which mode you are in.
- SEO invariant: hidden-from-reader-nav pages keep their URLs, sitemap
  presence per existing law; quest board and builder surfaces get noindex
  (they were never SEO content).
- Open: Q1 (who sees quests), Q2 (toggle mechanics).

### V-ESSAYS-MAX: the fan blog platform
Essays become a first-class publishing platform:
- The WRITING TOOL: the existing editor pushed further for long-form:
  cover block, pull quotes, image-by-policy, embeds (click-to-load),
  stickers/widgets INSIDE essays (registry blocks in essay bodies),
  chapters/TOC for long essays.
- ORGANIZATION: essays belong to collections/series (curator- or
  author-made groups); the essays tab becomes a designed magazine index
  (featured + series shelves + latest), not a list.
- SOCIAL LAYER: per-essay comments (the discussion rails), reactions,
  linking between essays and to any wiki node (mentions work everywhere).
- PROFILE INTEGRATION: every essay logs to the author's profile (the fan
  resume); curator-featured essays get the home-page preview module
  (widget duality: featured-essay widget for the space home).
- Moderation stays: reviewed and featured by curators (W4.12 law).

### V-CARDS-MAX: the photocard + collectible flagship
The specialized-platform differentiator. Not a checklist grid: a collector
tool:
- THE BINDER: visual binder view (pages/pockets metaphor), drag to
  arrange, sets and completion rings per album/version/member.
- THE CARD: each card gets a detail page (set, version, rarity notes,
  sourced info, who else owns/wants it: counts only).
- PERSONALIZATION: binder themes (the preset system applied), favorite
  card showcase, profile shelf (top cards on the fan resume), per-space
  collection stats.
- HONESTY LINES: no market prices v1, no trading/marketplace (standing:
  never), images remain policy-gated (text-first cards until the W5.4
  media decision; design must be beautiful even imageless: typographic
  card faces, member colors, set patterns).
- Collectibles (lightsticks, merch) get the same treatment with their own
  identity.

### V-ATLAS: the wiki as the visible universe
- The Wiki tab becomes THE ATLAS: a visual, explorable map of the whole
  space's page graph: the arborescence from group -> members -> idol ->
  choreography -> dance -> concert -> venue-year pages, rendered
  beautifully (tree/constellation view on the orbit brand language),
  plus powerful search that finds ANY page ("2017 concert in Dallas").
- Every node is a page; every page shows where it lives (breadcrumbs +
  its neighbors) and what links here; red links (wanted pages) appear on
  the map as unlit nodes: the growth invitation made visual.
- The atlas has its home-widget version (mini-map module) per duality.
- This REPLACES the "wiki index" framing: the wiki is not a section, it
  is the fabric; the atlas is how you see it.

### V-DECOR-EVERYWHERE (folds the parity law into the system)
Extend the presentation/registry system so curators can decorate EVERY
page type: page-level accent/banner/border/icon choices, sticker slots on
content pages, per-page frame styles: same guardrails (contrast clamp,
registry-only, SEO parity). Awards, indexes, tools: all of it themable.

## PART 3 - SEQUENCING PROPOSAL (owner confirms)

1. V-POLISH-2 step-6 verdict = ITERATE: build Part 1 items 1-7 now (the
   page redesigns) inside the open workstream, then re-shoot the
   walkthrough for re-review. (Items with open questions wait for
   answers: song play affordance.)
2. Then V-MODES (small, high leverage: fixes the nav for every later
   screenshot).
3. Then V-CARDS-MAX, V-ESSAYS-MAX, V-ATLAS (each spec-first, each with an
   owner design gate, order owner-tunable).
4. V-DECOR-EVERYWHERE rides along inside each (parity law per workstream).
5. Then V-COMM-3 + V-PROFILE-ONE (profile absorbs essay logs + card
   shelves), V-TRUST, QA re-run, push conversation.

## Owner decisions LOCKED (2026-07-31)

Q1: Quests = members+ inside Build mode. Visitors see nothing; the board
    left the reader nav (interim: hidden from logged-out until V-MODES).
Q2: Build mode = ONE role-aware toggle next to the space identity,
    revealing exactly what the viewer's role unlocks, with a subtle
    editing accent. No separate admin area.
Q3: Song audio = curator-curated per track from SAFE sources only:
    official YouTube embed (click-to-load) or the blindtest's legal 30s
    preview (the default). NO audio uploads, ever: hosting commercial
    recordings is the one legal line that threatens the whole domain
    (label DMCA). Fan-recorded non-commercial audio (chants) stays on the
    signature-sound path with attestation.
Q4: Sequencing confirmed: V-POLISH-2 iteration -> V-MODES -> V-CARDS-MAX /
    V-ESSAYS-MAX / V-ATLAS (spec-first, owner gates) -> V-COMM-3 +
    V-PROFILE-ONE -> V-TRUST -> QA re-run -> push conversation.
