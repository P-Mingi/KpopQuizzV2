# W2 - Verse reading experience (the public launch build)

## Claude Code Implementation Prompt

---

Build Verse's public face on the W1 data layer. Read first: docs/VERSE-MASTER-VISION.md,
docs/VERSE-ROADMAP.md, the W1 state (migration 124, /admin/verse, 204 idols, 348 albums,
2682 tracks). The two owner-approved prototypes described below are the DESIGN CONTRACT
for structure and content; the visual execution is YOURS to elevate: /ui-ux-pro-max +
/frontend-design MANDATORY, before designing and after building, on every page type.
This is UX/UI v1 of a flagship product - take the design seriously.

Hard rules: NO em dashes. REAL DATA ONLY, every module min-gated and hiding when empty
(a day-one space = locked skeleton only, still intentional). Static/ISR everything,
NANO-cheap queries, safeFetch. Routes -> allowlist, check:routes green. Commit per step,
do NOT push. Migrations = owner stop-and-wait. One spine: passport, PersonCard,
activity, notifications, analytics (existing event names; widen enums only). Games
product untouched. Living-persons policy: structural, everywhere.

## THREE DISTINCT LAYOUTS (owner requirement - not one stretched layout)

Design and verify THREE compositions per page type:
- MOBILE (430px ref): single column, tabs as horizontal scroll pills, module stack,
  members as scroll strip, sticky Join CTA.
- TABLET (768-1024): TWO-column compositions where content justifies (facts + fan-lore
  side by side on idol pages; space home = main column + right rail with on-this-day /
  birthday / masthead), tabs full-width.
- DESKTOP (1280+, container ~1200): space home = 3-zone grid (main content, right rail,
  full-bleed themed hero), idol page = infobox as a left sticky sidebar (wiki-style)
  with content flowing right, discography as multi-column grids.
Screenshots of ALL THREE per page type in reports, light + dark.

## Design contract (approved prototypes, condensed)

URL scheme: /verse (directory) · /verse/{group-slug} (space, e.g. /verse/stray-kids) ·
tabs Home/Members/Discography/Timeline/Community/About ·
/verse/{group-slug}/members/{idol-slug} · /verse/{group-slug}/albums/{album-slug}.
Fandom name owns the H1/branding ("STAY - Home of Stray Kids fans"), group slug owns
the URL.

SPACE HERO (themed by fandom tokens): fandom name huge, "Home of {group} fans",
est. year (fandom founding if curator-set, else debut year), Join CTA + member count,
war-rank chip (live, gated), group logo, curator welcome line, official SNS icon row
(curator-entered links, out-linking). COMEBACK MODE strip under hero when active
(countdown, from the comebacks table). Birthday strip when an idol's birthday < 30
days ("Felix's birthday in 12 days"); on the day itself the hero celebrates (birthday
mode v1: themed banner line).

SPACE HOME modules (three-zone system):
- Locked: on-this-day (entity dates) · play row (real game surfaces + counts) ·
  members strip · latest releases · feed preview (5) · curator masthead ("Run by N
  {fandom} curators · become one").
- Curator-arranged registry v1 (config-driven, default sensible order): featured slot,
  fan spotlight, lore highlight, projects preview, birthday card, stats flex,
  glossary teaser. V2 note: in W2 these render from config defaults; the curator UI
  to arrange them arrives with W4 - build the config plumbing NOW, hand-edit via
  admin until then.
MEMBERS tab: idol card grid (photo, name, hangul, positions, birthday); units as
sub-sections (NCT-style, from group_units); former members section only when
curator-toggled on (factual template only).
DISCOGRAPHY tab: filter chips (All/Album/EP/Single/KR/JP), album grid -> ALBUM page
(release facts sourced, tracklist with play-in-blindtest on linked tracks, era link,
authored-notes shell for W3) -> SONG page only for catalog-linked songs.
TIMELINE tab: auto entries from entity dates (debut, releases) + authored-era shells
(W3); clearly distinguish auto vs authored.
COMMUNITY tab: full space feed (space-scoped activity), top fans (gated, PersonCards),
group's debate archive; polls + projects = shells for W4.
ABOUT tab: charter placeholder, masthead, space stats, join-the-team CTA.

IDOL PAGE: header (photo from rosters, name big, hangul + birth name, group/unit chips,
position chips, birthday chip <30d) · FACTS box, every fact source-badged
([wd] ingested / [cur] curator): born, nationality, debut, height, blood type, MBTI
(NO weight - field must not exist; NO personal-life fields ever) · WHAT FANS KNOW
(min-gated real stats): name-recognition % from name-all, most-gotten personality
match, "N fans bias him" from real profiles.bias · FAN LORE section shell (labeled
"written by {fandom}", W3 fills it; render seeded placeholder invitation until then) ·
games row · albums-appears-on · footer: related members, suggest-an-edit (mailto or
form stub until W3), sources list, contributors line.

## Steps

1. W2.0 Migration (owner-run): verse_spaces config table (group_id PK, welcome_line,
   est_year, sns_links jsonb, theme jsonb, module_config jsonb, former_members_shown
   bool default false, charter_text null) + idols columns height_cm, blood_type, mbti
   (curator-entered fields, nullable) + any index needed. STOP for owner.
2. W2.1 Verse shell: /verse directory (spaces grid: themed tiles, member counts,
   launch spaces first), design accent system (fandom theme tokens: derive from
   groups.display_color; contrast-enforced against both modes), nav entry.
3. W2.2 Space Home (hero + comeback + birthday + locked modules + configured
   modules) - the flagship screen; all three layouts.
4. W2.3 Members tab + idol pages (all three layouts; sticky-sidebar desktop).
5. W2.4 Discography tab + album pages + song pages (blindtest links live).
6. W2.5 Timeline tab (auto entries + authored shells).
7. W2.6 Community + About tabs (feed, top fans, debates; shells for W4 pieces).
8. W2.7 "On this day" + birthday + comeback engines (shared lib, feeds space +
   future notifications).
9. W2.8 Games integration: widgets in spaces + games result screens gain a "visit
   the {fandom} space" loop link (ResultLoop addition, additive only).
10. W2.9 Umbrella portal v1: root becomes the thin Play/Verse portal. CRITICAL
    GUARD: the current quiz home moves to its product surface BYTE-IDENTICAL in
    content/SEO (verify how root vs product-surface URLs resolve - propose the
    safest structure BEFORE building: root portal must not damage the converting
    home or its rankings; if any SEO risk is found, STOP and present options).
11. W2.10 SEO wiring: entity JSON-LD (MusicGroup, Person, MusicAlbum), sitemaps,
    breadcrumbs, internal mesh (group hubs <-> spaces cross-links, articles, games),
    llms.txt. Metadata per page type, honest counts.
12. W2.11 Launch pass: seed 3 launch spaces' configs (owner picks groups + est
    years + welcome lines via admin), full QA across 3 layouts x 2 modes, empty-
    state audit on a non-launch space, perf check (page weight, query counts),
    check:routes, tsc, build. Ship-ready report.

## Verify (phase end)

- [ ] Three genuinely distinct layouts per page type, screenshotted, light + dark
- [ ] Fandom theming: 3 spaces show distinct identities from tokens alone;
      contrast AA everywhere in both modes
- [ ] Every fact source-badged; no weight field exists anywhere; living-persons
      grep proof repeated on all new queries
- [ ] Min-gates: empty space renders intentional skeleton; fan-knowledge cells
      hide below volume; war-rank chip hides unranked
- [ ] Comeback + birthday + on-this-day fire from real data (force-test each once)
- [ ] Quiz home SEO untouched (byte-diff on its head tags after the portal change)
- [ ] Games -> space loop links live; space -> games widgets live; analytics events
      existing-names-only (cross_promo_click from='verse')
- [ ] ISR symbols correct; no new hot-path writes; no new npm dependency except
      justified; zero em dashes; check:routes green

/caveman report per step: screenshots (3 layouts x 2 modes), gate results, query
costs, deviations + why. W2.9's structure proposal = stop-and-discuss before build.
