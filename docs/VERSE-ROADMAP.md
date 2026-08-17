# VERSE ROADMAP - Workstream W, granular build steps

Companion to VERSE-MASTER-VISION.md. Every step = one Claude Code prompt when its
turn comes, one commit block, verify-first, house rules (real data, gates,
static/ISR, allowlist, one spine, no em dashes). Migrations = owner stop-and-wait.
Steps are ordered but phases W2/W3 can overlap once W1 is stable.

## W0 - Feasibility spike (days; read-only; STOP gate)

- W0.1 Wikidata probe: SPARQL coverage audit for K-pop - how many groups, idols,
  with which fields (debut date, members, agency, positions, birthdays)? Sample
  our 20 flagship groups, produce a field-completeness matrix.
- W0.2 MusicBrainz probe: discography coverage for the same 20 (albums, release
  dates, tracklists). Same matrix.
- W0.3 Verdict report: coverage tables, gaps needing curator entry, entity-schema
  recommendation, ingestion-effort estimate. STOP for owner review. W1's design
  follows this verdict.

## W1 - Entity foundation (schema + ingestion engine)

- W1.1 Schema migration: extend EXISTING groups/songs as canonical; add idols,
  albums, entity relations, era records. Typed fields per the living-persons
  policy (no personal-life fields exist, by design).
- W1.2 Source attribution model: every ingested fact row carries source + date;
  curator corrections table outranks ingestion on conflict.
- W1.3 Wikidata backfill script: one-time, rate-limited, resumable (the T1.5
  backfill pattern). Report per-entity coverage after.
- W1.4 MusicBrainz backfill: discographies for launch groups first, rest after.
- W1.5 Refresh cron: weekly delta sync, conflict surfacing (never overwrite
  curator corrections), Discord ops alert on failure (existing pattern).
- W1.6 Admin ingestion dashboard: counts, conflicts, re-run buttons (existing
  admin patterns).

## W2 - Reading experience (the launchable product; valuable with zero editors)

- W2.1 Verse shell: /verse index = spaces directory, Verse design accent
  (distinct-but-family), nav entry. Route allowlist.
- W2.2 Space skeleton: /verse/{fandom} home - themed hero (fandom name, group,
  colors), fixed module system (the SEO skeleton), per-space theme config.
- W2.3 Idol pages: /verse/{fandom}/members/{idol} - infobox (sourced facts),
  photo (strict-legal), quiz-stat integration ("fans get her position right
  84%"), games links. THE kprofiles-competitor pages, data-differentiated.
- W2.4 Discography: album index -> album page (art, date, tracklist) -> song
  pages. MusicBrainz-seeded, blindtest links where songs exist in our catalog.
- W2.5 Era timeline: visual timeline component (eras, comebacks, releases,
  awards) from entity dates.
- W2.6 "On this day" + birthday/anniversary calendar engine: auto-generated from
  entity dates; feeds space pages, notifications later, Discord.
- W2.7 Game widgets: the group's quizzes, blindtest playlist, name-all,
  personality quiz embedded in the space (windows into the games product).
- W2.8 Fan-knowledge layer: mastery counts, accuracy, recognition stats on
  entity pages (the moat data, min-gated as always).
- W2.9 Space feed: space-scoped activity (reuses activity_events spine; new
  event types for verse actions).
- W2.10 Umbrella portal v1 + SEO wiring: root becomes the thin Play/Verse portal
  (quiz home untouched at its surface), entity JSON-LD, sitemaps, breadcrumbs,
  cross-product internal mesh, llms.txt.
- W2.11 Launch pass: 3 seed spaces (owner picks groups), content QA, the
  no-ghost-town gate check, ship read-only Verse publicly.

## W3 - The editor (Stage A collaboration)

- W3.1 Revision model migration: revisions table (entity sections + infobox
  changes), author, timestamp, diff storage.
- W3.2 Block editor: TipTap integration for rich-text sections (glossary, lore,
  starter packs, fanchants), schema-constrained.
- W3.3 Infobox editing: typed field forms (dates, relations, enums) - structural
  policy enforcement lives HERE (no free-text facts, sources required).
- W3.4 History + diff view + one-click revert per page.
- W3.5 Suggest-an-edit: structured form for visitors/members -> review queue.
- W3.6 Review queue v1: owner/invited-curator approval UI (the minimal mod deck).

## W4 - Collaboration + roles (GATED: opens only with recruited curators)

- W4.1 Roles migration: space_members (user, space, role, joined_at), role enum
  Visitor->Member->Contributor->Curator->SpaceAdmin.
- W4.2 Join flow: "Join the ARMY space" -> membership on the passport (badge,
  count on space), member directory (PersonCards).
- W4.3 Curator tools: approve/reject edits, feature/pin content, theme editor
  (within skeleton), masthead management.
- W4.4 Reputation: editor XP into the existing XP spine, contributor badges,
  GitHub-style contribution graphs per space + per user.
- W4.5 Charters + hygiene: charter template (rules, roles, owner-as-arbiter),
  per-space charter page, activity-based role decay.
- W4.6 Recruitment kit (owner-led, my drafting): Reddit/Discord founding-curator
  posts, application flow, onboarding checklist per curator.
- W4.7 Stage B switch: member edits allowed (pre-moderated) per space when its
  curator team is active. Stage C (earned live editing) = per-space config,
  later.

## W5 - Collections + media

- W5.1 Photocard schema: sets per album/era, card entries (structured,
  curator-entered - no scraped databases).
- W5.2 Checklists: "I own 34/120" personal collection UX, passport integration,
  collection badges.
- W5.3 Merch + lightstick galleries (versions, strict-legal images).
- W5.4 The media decision: fan-upload policy (ToS, moderation queue, takedown
  path) - owner decision with full risk brief before any build.

## Cross-cutting laws (every step)

- One spine: auth, passport, PersonCard, notifications, analytics, activity -
  extended, never duplicated.
- Living-persons policy enforced structurally from W1 schema onward.
- Real data only; every section min-gated; no ghost spaces.
- Citation over extraction: open data in, sources shown, nothing scraped.
- Games product untouched; its home page untouched; cross-links additive.
- Each phase independently shippable; W2 is the public launch moment.

## Tracking

Notion: master vision page (created) + tracker rows per step in the project DB
when W0 starts. Reports in /caveman per step, as always.
