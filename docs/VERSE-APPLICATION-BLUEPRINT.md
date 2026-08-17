# VERSE APPLICATION BLUEPRINT - how every pattern lands in Kpop Verse

Companion to VERSE-PAGES-UNIVERSE.md (read it first: this doc APPLIES its
Parts 2 and 4 to our actual stack). Written 2026-07-30. This is the concrete
"what a finished K-pop space contains and how each piece is built" document.
Data-honesty notes are load-bearing: every pattern states what data we have
today (Wikidata/MusicBrainz seeded, 204 idols, 348 albums, 2682 tracks,
eras, tours, awards, shows, osts) vs what is curator-entered vs what we do
NOT build for lack of legal data. House rules apply everywhere: no scraping,
sources on facts, min-gate, living-persons structural, no em dashes.

---

## 1. THE PAGE INVENTORY of a finished space (concrete, per group)

Using STAY (Stray Kids) as the reference. Every URL flat under the space.

CORE (exist today, upgraded by this blueprint):
- /verse/stray-kids .................. space home (canonical order, 3a)
- /members + /members/{idol} ......... roster index + idol pages
- /discography + /albums/{slug} ...... discography index + album pages
- /timeline, /story (eras) ........... era-driven narrative
- /awards, /tours, /appearances ...... typed entity pages (W3K)
- /collectibles, /photocards ......... collections
- /community ......................... space discussions

NEW INDEXES (section 2):
- /songs ............................. the Song Deck (all tracks, faceted)
- /mvs .............................. MV index (faceted by era/year)
- /content .......................... the index-of-indexes router

NEW LEAF KINDS via V-PAGES (section 3):
- /wiki/{slug} for: song stories, MV pages, choreography pages, lightstick
  page, merch items, concert pages, episode pages, comeback hubs, culture
  guides, glossary entries, universe/lore archive pages

TOOLS (section 4):
- /tools/ladder ...................... new-fan discography ladder
- /tools/collection .................. discography + photocard trackers
- /tools/tour-map .................... tour stop explorer (data-gated)

EDITORIAL (section 5):
- /faq, /news (comeback timeline), ranked pages as wiki kinds

Every page: breadcrumb, kicker label, H1 + one-line dek, "how to use this
page" box where complex, trust footer (section 6), related exits. NOTHING
ships as an empty doorway: min-gate hides any of the above until its data
exists (the inventory is the CEILING, not the launch requirement).

## 2. THE INDEX SYSTEM (our Paldeck moment)

Powered entirely by data we already hold. Every index: facet filters +
search-within + live counters ("214 matching · 214 total") + Reset + jump
chips with counts + card grids. Server-rendered lists, client-enhanced
filtering (the truth is in the HTML).

- SONG DECK /songs: all tracks. Facets: album, year, era, type (title/
  b-side/unit/solo/ost), language version. Jump chips: "Title tracks 27 ·
  B-sides 141 · OSTs 12". Card: title, album chip, year, one HOOK line
  (curator-editable: "the fan-scream bridge").
- DISCOGRAPHY /discography upgraded: facets year/type/language; version
  counts on cards ("3 versions") once version data exists.
- MV INDEX /mvs: from music_videos where we have them + curator-added
  official links. Facets: era, year. Card: thumbnail (official embed
  poster, click-to-load), views NOT shown unless sourced snapshot exists.
- IDOL DECK stays /members but adopts the microformat: photo, name, chips
  (positions), capability line, hook line. Space-level; the GLOBAL idol
  deck across groups is a /verse-level index (V-HOME satellite, later).
- COUNTS IN TITLES: "All 214 Stray Kids songs · STAY Verse" pattern on
  every index title/og. ONLY when our count is genuinely complete for
  that scope; if ingestion is partial, the title says "the catalog" and
  no number (the honesty rule applied to SEO).

## 3. LEAF PAGE ANATOMIES (per V-PAGES kind, Assault-Rifle-grade)

Every leaf: infobox (typed fields, sourced) + prose sections + structured
tables + curated related exits (6-8 links + one "view full index"), never
100-link category walls. Anatomies:

- SONG (/wiki/{song-slug} or upgraded track page): infobox (album, track
  no, length, credits from MusicBrainz, language). Sections: About (fan-
  written), Live history (curator), In numbers (ONLY sourced-cited stats,
  Industry-Pulse-style quoted context, never scraped charts). Related:
  album, era, MV page, choreography page, "more from {album}".
- ALBUM (upgrade existing): + VERSION MATRIX table (one row per physical
  version: tracklist deltas, photocard set link, release date) - curator-
  entered rows, sourced from official listings. + "About this release"
  (the gap fresh-eyes found). Comparative context line where computable
  ("their longest tracklist").
- MV: official embed (click-to-load), release date, era chip, teaser
  chronology table (dates + official links), fan notes section.
- CHOREOGRAPHY: choreographer credit (sourced), key moves glossary (fan-
  written), dance-practice official link, "songs with related choreo".
- LIGHTSTICK: the owner's canonical example. Infobox (name, generation,
  release year, official-store link). Sections: Design story (fan-written
  + sourced facts), Versions table, In the crowd (fan culture: ocean
  colors, chant moments). Related: fandom identity page, collections.
- CONCERT (/wiki/{tour}-{city}-{date}): date, venue, tour chip, setlist
  (curator-entered), "I was there" button (tool section 4). Related: tour
  page, era, other stops.
- COMEBACK HUB: the era's live page: countdown, teaser chronology (dated
  official links), release-day checklist, then becomes the era archive.
- EPISODE (own shows): show chip, ep number, air date, fan summary.
- CULTURE GUIDE / GLOSSARY ENTRY: fan-written badge, no source required
  (owner decision), moderation applies.
- UNIVERSE/LORE ARCHIVE: per-storyline index with counts ("All 12 chapter
  notes") + full fan-written summaries. NO copyrighted text dumps: unlike
  Palworld's verbatim game text, K-pop lore lives in MVs/albums we cannot
  reproduce; ours are fan-written synopses + official links. This is the
  legal line, stated here so nobody crosses it.

## 4. TOOLS (calculator doctrine: interactive layer OVER published truth)

- NEW-FAN LADDER /tools/ladder: progression-sorted entry path ("work down
  as your fandom grows"): 3 gateway titles -> era pillars -> deep cuts ->
  units/solos. Curator-ordered from a template; static list is the page,
  interactivity = check-off progress (member-only, stored like photocard
  checklists). Ends by linking quizzes (the funnel, tastefully).
- COLLECTION TRACKERS /tools/collection: discography completion (owned/
  heard toggles per release) + photocard checklist (exists) unified in one
  surface. Counts feed the profile (V-PROFILE-ONE).
- "I WAS THERE" on concert pages: attendance record per member, count
  shown on the page ("312 STAYs were there"), feeds profile. Real users
  only, no backfill fakery, obviously.
- TOUR MAP /tools/tour-map: DATA-GATED. Step 1 is a Wikidata/MusicBrainz
  coverage probe for tour-stop data (the W0 pattern: verify before build).
  Good coverage -> map with per-tour layers, era colors, multi-tour
  compare, pins -> concert pages, static stops-table below (the truth
  table). Poor coverage -> curator-entered stops table first, map later.
  NO fabricated geodata ever.
- LINEUP/UNIT RESOLVER: pick 2 members -> every unit, subunit, duet, co-
  written track they share (computable from our credits + units data).
  Published as static pair tables under the tool. V2 candidate: ship if
  credits linkage proves rich enough in the probe, else post-launch.
- PHOTOCARD EXPLORER: browse card pools per album version (curator data).
  NOT an odds calculator (official odds do not exist publicly; we do not
  invent probabilities).

## 5. EDITORIAL LAYER (kinds with rules)

- RANKED PAGES (tier-list kind): ONLY with a mandatory methodology block
  (weights + data source + date, the Palworld lesson) and only over real
  data (plays, votes via space polls, sourced figures). No methodology,
  no publish: the form enforces it. "Hot picks" strip = "Gateway songs".
- FAQ kind: bolded Q + short A, key number bold, every answer links the
  proving page. Great SEO surface ("how many members does X have").
- COMEBACK/NEWS TIMELINE /news: ISO-dated table linking OFFICIAL sources
  only + "Current era" callout. Summaries on-page (no link-farm), cite
  out (the Patch Notes lesson applied honestly).
- TOP-N + ESCAPE HATCH everywhere: any "best/top" module shows N with a
  count + two exits (filtered index + full page).
- CONCEPT MATRIX (verse-level, later): concepts x groups count-links; a
  V-HOME satellite once multiple spaces are rich.

## 6. THE TRUST SYSTEM (site-wide, cheap, high-return)

- TRUST FOOTER on every content page: last-edited stamp + history link +
  per-page discussion entry + "started by X, maintained by N fans". All
  machinery exists (revisions, diffs, discussions, attribution): this is
  a rendering task, one component, everywhere.
- PROVENANCE LINES under every data table ("Source: MusicBrainz, as of
  2026-07 · curator-verified"). Extends the existing [wd]/[cur] badges.
- "HOW TO USE THIS PAGE" box: one bolded paragraph under the H1 of every
  index/tool. Curator-editable text, template-provided default.
- COMPLETENESS METER (new idea, section 8): per-space public coverage
  score ("Discography 92% documented · Eras 4/6 written") on the space
  home, computed from the quality engine (W3K.10). Trust signal + quest
  advertisement in one. Min-gated: shows only past a floor (no shaming
  empty new spaces).
- SIGN-IN returns to the page you were on (verify ours does; fix if not).
- RANDOM PAGE per space ("Surprise me") in the explore grid: serendipity
  = session depth, trivially cheap from our page list.

## 7. PERSONALIZATION MAPPING (nothing above is a fixed layout)

Registry placement of everything in this doc:
- MODULES (W-CUSTOM registry, curator-arranged): every index teaser, tool
  teaser, completeness meter, news timeline strip, hot-picks strip, lore
  doorway, random-page button.
- PAGE KINDS (V-PAGES registry, curator-created): song/mv/choreo/item/
  lightstick/concert/comeback/episode/culture/glossary/lore/faq/ranked.
- NAV SLOTS: tools and indexes are eligible nav tabs (the 3-7 composer);
  Encyclopedia template puts tools at nav level (the fextralife lesson).
- STRUCTURE TEMPLATES preselect bundles (3b of the universe doc): Starter
  enables core + ladder; Complete adds tools + news; Encyclopedia enables
  every kind. Empty enables none.
- The skeleton stays identical (SEO, counts, provenance, trust footer,
  URL scheme); selection, arrangement, and skin never are. One space
  leads with the tour map, another with lore, another with collections.

## 8. NEW IDEAS (proposals beyond the teardown, be-strong-of-proposition)

1. COMEBACK MODE: during a comeback window (curator-armed, auto-expiring)
   the space wears an event skin: comeback hub pinned, countdown in hero,
   release-day live discussion thread. The wiki that breathes with the
   fandom's calendar. (Extends existing liveNow + countdown machinery.)
2. THIS DAY IN {GROUP} HISTORY module: computed from dates we hold
   (debuts, releases, awards, tour stops). Zero new data, infinite daily
   freshness, shareable.
3. COMPLETENESS METER (section 6): public coverage score per space.
4. CONTRIBUTOR SPOTLIGHT module: "this month in STAY Verse: 214 edits by
   31 fans; top contributor {name}" - real numbers, credited labor made
   visible (the exact thing every competitor hides).
5. WEEKLY SPACE DIGEST: templated auto-summary of real activity (new
   pages, top discussion, quests closed) posted to the space + optional
   curator Discord webhook. Templated numbers, zero AI prose.
6. FAN RESUME UPGRADE (feeds V-PROFILE-ONE): "founding curator", "wrote
   14 pages", "attended 3 tours", "completed the ladder" - the profile
   becomes the fan's portable K-pop CV. No other site can grant this.
7. ANNIVERSARY AUTO-MOMENTS: debut/birthday days computed -> the space
   hero quietly celebrates (confetti accent, "8 years today"), curator
   can disable. Costs nothing, feels alive.
8. VERSE-LEVEL "ON THIS DAY" + trending strip on V-HOME: computed across
   all spaces; the portal feels alive from day one without editorial
   staff.

## 8b. IDEAS WAVE 2 (owner asked for more, 2026-07-30; wave 1 all LOCKED)

SPACE-LEVEL:
9. LISTENING PARTIES: curator schedules a listen-along; at T0 fans press
   play on their own streaming service and the space runs a synchronized
   timed discussion thread (track-by-track prompts). We stream NOTHING
   (fully legal), yet the fandom listens together. No competitor has it.
10. DAILY RITUAL: one rotating daily moment per space (today's track,
    on-this-day fact, quick poll) computed from real content; check-in
    feeds the existing streak machinery. The reason to open the space
    every single day.
11. MEMORY WALL: "how I became a fan" short stories (culture kind,
    length-capped, moderated, curator-featured). The emotional archive
    no database site can copy.
12. ERA TIME CAPSULE: when an era closes, its comeback hub auto-archives
    with that window's real community stats (discussions, quiz plays,
    attendance): "we were here together". Pure rendering over data we
    already log.
13. GLOSSARY HOVER: glossary entries auto-highlight in any prose on the
    space with hover-preview definitions. The wiki teaches its own slang
    inline. (Extends the existing mention-preview system.)
14. FAN GAUNTLET: curator-picked quiz sequence as the space's "prove your
    fandom" ladder with rank titles. Existing quizzes, new frame; the
    funnel dressed as a rite of passage.
15. FAN-PROJECT BOARDS: curator-run goal/project pages (streaming goals,
    birthday projects) where progress updates are curator-entered WITH
    sources. Real numbers only; no live fabricated tickers.

PLATFORM-LEVEL:
16. VERSE GAMES: seasonal inter-space tournaments (quiz/blindtest leagues,
    stats-only rivalry per the locked decision). The platform's Olympics;
    existing games engine, new event frame. Massive recurring engagement.
17. NEWCOMER PORTAL: "new to K-pop? start here" guided path on V-HOME
    (pick a vibe -> gateway groups -> their ladders). Top-of-funnel for
    total newcomers, feeds every space.
18. PASSPORT STAMPS: joining/contributing to spaces earns visual stamps
    on the profile passport. Collection mechanic over membership; zero
    new data.
19. EMBED CARDS: every Verse page gets a shareable OG-rendered PNG card
    (Industry-Pulse machinery) with the site watermark: the Reddit/
    Discord backlink engine.
20. CURATOR ACADEMY: onboarding path + certification badge for curators
    (guide pages + a completion quest). Raises floor quality, formalizes
    the covenant, makes "Verse curator" a title worth listing.
21. TRANSPARENCY PAGE: live public platform stats (spaces, pages, edits,
    contributors, funding posture): the miraheze goodwill lesson
    institutionalized, updated by cron from real counts.
22. EXPORT + READ API (post-launch, promised in the charter now): space
    export and a public read API. The wiki.gg covenant made mechanical:
    fork-proofing BY generosity.

Mapping: 9-15 attach to V-SPACE-FLOW/V-COMM-3/V-PAGES phases; 16-18 to
V-COMM-3/V-PROFILE-ONE/V-HOME; 19 reuses Industry Pulse OG machinery;
20-22 to V-TRUST. Sequencing unchanged; these fill the existing slots.

## 9. WORKSTREAM MAPPING (where each section builds)

- Section 2 (indexes) + 6 (trust) ......... V-PAGES phase 1 (no migration
  for indexes over existing entities; trust footer = rendering)
- Section 3 (kinds) ....................... V-PAGES phase 2 (the custom
  pages migration, owner-gated, spec-first)
- Section 4 (tools) ....................... V-PAGES phase 3 (ladder +
  trackers first: they reuse checklist machinery; tour map + resolver
  behind coverage probes)
- Section 5 (editorial kinds) ............. V-PAGES phase 2 (they are
  kinds with extra form rules)
- Section 7 (personalization) ............. lands inside W-CUSTOM registry
  + V-TEMPLATES as each piece ships
- Section 8 ideas 1-3, 7 .................. small workstreams attachable
  to V-SPACE-FLOW; 4-5 to V-COMM-3; 6 to V-PROFILE-ONE; 8 to V-HOME
- Sequencing stays as V3 states; this doc changes WHAT gets built in
  those slots, not the order. V-DESIGN remains first and is unaffected.
