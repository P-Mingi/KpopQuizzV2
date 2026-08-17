# VERSE V6 DIRECTIVES (owner walkthrough 2026-08-04, evening)

Captured VERBATIM-complete from the owner's 7-point directive. Nothing
dropped. Each point = a workstream. Cowork analysis + open questions
inline. Sequencing proposal at the end. All UI goes through
prototype-first co-design before any worker build.

## D1 - PER-BLOCK EDITORS (every widget gets its own editor mode)

Owner ask: every block/widget editable in depth, not just styled.
Named examples, all captured:
- MEMBERS widget: reorder each image, change each image, edit each
  name individually, edit each link; adding a member AUTO-CREATES the
  member page (and the link stays editable afterwards).
- IMAGE block: one unified image editor: choose image from URL
  (Pinterest, Imgur, Google, etc.), from computer, GIF support.
- YOUTUBE EMBED block: paste the video link, more options.
- H2 / TEXT block: size, font, color options.
- ATLAS block: its own editor options.
- IN NUMBERS block (rename: DATA block): its own editor options,
  Cowork to propose the option set.
- TIMELINE block: its own editor.
- STICKERS: placement system to design deeply: free, semi-free, or
  the owner's micro-grid idea (a sticker = e.g. 4x4 small squares on
  a fine-grained square lattice covering the canvas, much finer than
  the 12-col grid). Cowork to think hard here.
- FULL COMPONENT INVENTORY: every component currently displayed on a
  fandom space must be identified, NAMED, given a block definition
  and an editor. Example the owner flagged: the vitals bar
  "Debut 2013 · 7 members · Columbia Records · ARMY" - is it a block?
  (Cowork answer: yes, VITALS BAR block, chips editable per-item.)
  Also the "screenshot block" question (Latest releases card = the
  DISCOGRAPHY TEASER block: title + N release links + ALL count).
  Deliverable: a complete named registry audit: every visible
  component -> block name -> editor mode -> recreate-from-scratch
  possible in the builder. "Like an entire website builder."

COWORK ANALYSIS (honest):
- This is the EDITOR PARITY law finally applied per-block. Natural
  next workstream after Phase 2 closes: V-BUILDER-3 "BLOCK EDITORS".
  BlockSpec gains an editorSchema (fields, kinds, constraints);
  the panel gains a CONTENT tab next to Style; each field maps to
  the real data source (members widget edits entity data via the
  existing entity rails, with provenance).
- LEGAL WALL, must be ruled by owner: "image from Pinterest / Google
  URL" = hotlinking + unlicensed copyrighted images. Current image
  policy law: policy-legal sources only (entity/space assets, Cover
  Art Archive); W5.4 is the standing gate for fan uploads. Options:
  (a) keep policy sources + computer upload INTO our storage with the
  W5.4 moderation gate (recommended) (b) allow arbitrary URLs =
  copyright exposure + dead-link rot + hotlink bans (Pinterest blocks
  it). Cowork strongly recommends (a); GIFs OK via upload within
  policy. OWNER RULING NEEDED.
- Stickers: free x/y is banned for BLOCKS, but stickers are
  decoration, not content. Proposal to co-design: sticker layer per
  block-frame, anchored on a FINE MICRO-LATTICE (the owner's idea:
  canvas divided in small squares, a sticker occupies e.g. 4x4),
  which gives near-free placement while staying serializable,
  responsive (lattice scales with the block), collision-capped, and
  SEO-invisible (aria-hidden decorative layer, never in reading
  order). Caps per block + per page. Feels free, cannot break a page.

## D2 - HEADER / IDENTITY EDITING

Owner ask: the header must take an IMAGE input (banner). The group
profile picture must be editable. EVERY component of the header
editable (name display, tagline, badges, colors already themable).
Cowork: becomes the HERO/IDENTITY block editor in V-BUILDER-3; image
inputs follow the D1 image-policy ruling. Auto-derived elements
(member count, fandom name) stay data-driven with per-field override.

## D3 - THE PERFECT FANDOM GROUP PAGE (BTS showcase rebuild)

Owner ask: think deeply about the ideal structure of a fandom group
space: home composition, most important components first, text vs
blocks, order, links/buttons, tables, tool widgets (quiz, atlas,
timeline). Inspiration: k-pop.fandom.com/fr/wiki/BTS: explore fully,
same COMPLETENESS, not same structure. More VISUAL than text; long
text allowed behind TOGGLES (crawlable collapse) to stay clean. Full
atlas index included. 100% complete AND beautiful. New blocks/widgets
allowed freely IF built through the editor. Components to consider
(owner list, all captured): photo library/gallery, citation block,
indentation block, photo-next-to-text, ROW layouts (different block
types side by side, each with a precise size), separator bars
(multiple formats), a REFERENCE mode collecting all useful links,
every link form (image link, buttons in several formats/colors,
plain text link), and more.
Fandom research digest: docs/PLAY... no: appended below (F-RESEARCH).
Cowork: two-part delivery: (a) Phase 3 absorbs rows/columns + new
layout blocks (gallery, quote, callout, columns, separator formats,
references) already in the blueprint taxonomy sections A-F; (b) a
CONTENT workstream (V-SHOWCASE-BTS) that uses the finished builder to
compose the flagship BTS space at fandom-level completeness, sourced
facts only (real-data law: every fact carries a source; no fabricated
content). Structure proposal to co-design from the research skeleton:
hero -> intro (short, toggle for the long story) -> vitals -> members
-> story trailer/eras -> releases -> now -> go deeper -> collections
-> community -> play -> footer (the canonical 12 remain the spine;
new inside: era chapters visual-first, awards table behind toggle,
gallery, fandom-culture section: lightstick, colors, fanchants).

## D4 - ATLAS INDEX REDESIGN

Owner ask: the atlas MAP is great; the INDEX view is useless as-is.
Make the index a TEXT-ONLY version of the map: a hierarchical tree
like a web project sitemap, with toggles (expand/collapse branches).
Cowork: agreed, the current flat kind-list duplicates search. Index
v2 = the five-hub tree (People/Music/Story/Culture/Collect) rendered
as a collapsible outline, crawlable (details/summary, links real),
same data as the map. Ships in Phase 3 (atlas alignment) or as a
small standalone step. Co-design mockup before build.

## D5 - FANDOM.COM READER FEATURES

Owner ask: explore fandom.com features for inspiration: the floating
reading rail (expand view, summary/ToC overlay, edit pencil,
save/bookmark), full side navbar, page tools.
Cowork mapping onto us: READER RAIL v1: (a) ToC overlay from heading
structure (exists partly via auto-ToC block: make it a floating rail
control) (b) SAVE page to profile (new, pairs with D7) (c) edit
pencil = the existing suggest/edit affordance by role (d) expand view:
we have no ads; our reader is already clean: SKIP (their expand
exists because ads eat the page; copying it copies their disease).
Full side navbar: WARNING: collides with the locked lean-navbar law
(5 tabs + More) and the four-door shell. Recommendation: do NOT
clone the sidebar; our node map + doorways ARE the navigation. The
rail = small floating cluster on article pages only.

## D6 - DENSITY RULING: 70%

Owner ask: should a fandom page be 100% like now or 70% clearer? He
thinks 70%. RULING CAPTURED: target ~70% density: visual-first,
long-form behind crawlable toggles, fandom-level completeness but
never fandom-level wall-of-text. Applies to D3 structure and all
templates. (SEO note: toggled content stays in the HTML: collapse
law: so completeness is not lost to crawlers.)

## D7 - MY VERSE (the Verse profile)

Owner ask: fandom.com has "My Fandom" (saved pages, history,
progress). Build our equivalent: a special profile section for the
Verse. Think deeply about its content. Also SPLIT the profile page in
two nav buttons: VERSE PROFILE and GAME/QUIZ PROFILE (current profile
is game-centric).
Cowork proposal to co-design (V-PROFILE-2 "MY VERSE"):
- Verse tab: my spaces (member/curator roles + quick links to admin/
  build), my contributions (edits, pages created, suggestions +
  their status), my badges (the 22 tiered), my collections (binder/
  shelf shortcuts), SAVED pages (D5), reading HISTORY, followed
  spaces feed, my drafts, curator stats (coverage), covenant standing.
- Play tab: the existing game profile (Elo, streaks, quiz stats).
- One identity, two tabs, deep-linkable. Fandom's progress-tracking
  trio (map/table/page check-offs) is their stickiest feature; our
  equivalent = collection progress + coverage meters + quiz history,
  already partly built: surface them here.

## F-RESEARCH digest (fandom sweep, caveat: reconstruction, bot-wall)

BTS page skeleton: infobox (photo tabs, name/hangul, origin, genres,
years, label, fandom, color, members) -> intro -> membres -> disco
(split KR/JP, typed lists) -> filmographie -> tours -> awards ->
anecdotes -> galerie -> references -> navbox -> categories. FR wiki =
list-heavy, prose-light. Components: portable infobox, hatnotes,
tables, galleries, floated image+text, tracklists, reflist, navbox,
category bar. Platform: reading rail (expand/ToC/edit/save), My
Fandom (saved, history, progress trackers), global profile (wall,
blog, contributions), watchlist, achievements. Steal: progress
tracking, one identity hub, infobox discipline, navbox lateral nav,
edit-everywhere. Exploit: ad-crushed reading, inconsistent hand-
rolled structure, no API (402 bot wall), gamification editor-only,
monolithic pages + weak search.

## SEQUENCING PROPOSAL (owner ratifies)

1. NOW: Phase 2 step 7 owner gate + step 8 sweep (close the canvas).
2. V-BUILDER-3 BLOCK EDITORS (D1 + D2): editorSchema per BlockSpec,
   content tab, image policy per ruling, member/hero/data/timeline/
   image/embed editors, sticker system co-design. THE game changer.
3. PHASE 3 (blueprint): grid/rows + new layout blocks (D3 components,
   D4 atlas index, D6 density templates) + entity-page migration.
4. V-PROFILE-2 MY VERSE (D5 save + D7 split profile).
5. V-SHOWCASE-BTS content op: compose the flagship page with all of
   it, sourced facts only.
Parallel: G-HUB fork continues on its branch.

## OPEN OWNER QUESTIONS (answer to unlock)

Q1 (D1, legal): image sources ruling: (a) policy sources + owned
   uploads behind the W5.4 moderation gate (Cowork recommends) or
   (b) arbitrary external URLs (copyright + hotlink rot, Cowork
   advises NO)?
Q2 (D1): stickers: OK to co-design on the micro-lattice proposal
   (near-free feel, serializable, capped, SEO-invisible)?
Q3 (D5): confirm we SKIP cloning the full fandom sidebar (lean-navbar
   law stands) and build the small reader rail instead?
Q4 (sequencing): ratify the 1-5 order above?
