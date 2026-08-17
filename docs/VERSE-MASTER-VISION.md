# KPOP VERSE - Master Vision Document

Status: founding document, owner-approved decisions locked 2026-07-28.
This is the project bible for the Verse product and the umbrella architecture.
Workstream letter: W (the knowledge/wiki track expands into this).

---

## 1. What we are building

Two products, one platform, one identity:

- **KpopQuiz (exists):** the games and quiz product. Quizzes, blind tests, duels,
  name-them-all, sort-it, match-up, personality quizzes, battles, dailies. It stays
  exactly what it is: separate, focused, untouched.
- **Verse (new):** the collaborative home of every K-pop fandom. Each fandom gets a
  SPACE: its group's full knowledge base (group, idols, albums, songs, eras),
  community features, collections, and a fan team that runs it.
- **The umbrella:** kpopquiz.org root becomes a thin PORTAL over both worlds
  ("Play" -> games product, "Verse" -> spaces directory). Shared across both: one
  account, one passport/profile, one community layer (war map, feed, debates), one
  search. Everything else stays separated by product.

Long-term brand: "Kpop Verse" as the umbrella name. For now everything lives under
kpopquiz.org (domain authority is the scarcest asset; no new domains, no subdomain
split). Umbrella rebrand = a someday decision that traction makes for us.

## 2. Positioning

Not "a quiz website". Not "a wiki". The platform where K-pop fans prove their
knowledge, build their identity, run their fandom's home, and belong.

Verse's one-line pitch to fans: "Your fandom's home on the open web - run by you,
credited to you, with no ads in your face."

The benchmark is not other quiz sites. It is fandom.com's failures: we win on
clean fast pages, credited volunteers, structured data, and a games layer they
can never bolt on.

## 3. The moat (why this combination wins)

1. **Structured entities, not text soup.** Every page is a typed entity (idol,
   group, album, song, company, show, era) with database-backed infoboxes +
   rich-text sections. Queryable, source-cited, JSON-LD-perfect, AI-citable.
2. **The games loop.** Wiki facts generate quiz questions; quiz stats display on
   wiki pages ("fans get Karina's position right 84% of the time"); space
   membership + quiz mastery = certified-fan status. The wiki manufactures game
   content; the games manufacture wiki engagement. Nobody else owns both sides.
3. **Credited fan labor.** Curators get roles, mastheads, contribution graphs,
   passport badges. fandom.com's editors get ads shoved on their work. Ours get
   credit. That recruits the serious ones.
4. **Winner-take per fandom:** readers go where content is, editors go where
   readers are, and switching costs (history, roles, links) compound.

## 4. The Verse product

### 4.1 Spaces

URL: `kpopquiz.org/verse/{fandom-name}` (e.g. /verse/army, /verse/stay).
Fandom-name slugs = the SEO play (fandom-name queries: "army kpop", "atiny
meaning"). Groups without a distinct fandom name use the group slug.

Every space, same skeleton (SEO-structured), individually themed (fandom soul):
- Group page + idol pages + discography (albums -> tracklists -> songs) + eras
  timeline + awards cabinet - all typed entities.
- Community: space feed, polls/predictions, lore and theory pages, glossary,
  fanchant guides, new-fan starter pack, fan project boards.
- Collections: photocard database with personal checklists ("34/120 owned"),
  merch and lightstick galleries. (Trading/marketplace: explicitly out of scope.)
- Identity: membership (on the passport), fandom-skinned fan cards, space
  leaderboards (stats-only), curator masthead.
- Games embedded: the group's quizzes, blindtest playlist, name-all, personality
  quiz as widgets inside the space. The games product stays where it is; spaces
  window into it.
- "On this day" auto-events from entity dates; comeback mode via the existing
  comebacks/MV tracking machine.

Personalization = theme (group colors, banner, motif, module order, featured
content) + governance (space charter) within a fixed structural skeleton. Never
free CSS, never structural divergence: SEO and design coherence are platform law.

### 4.2 Roles (per space)

Visitor (read, play) -> Member (joined; passport badge) -> Contributor (edits go
to review) -> Curator (approve edits, feature content, theme, pin; public
masthead credit) -> Space Admin (lead) -> Platform (owner = final arbiter, year
one, written into the charter template).

Role hygiene from fandom-platform history: activity-based role decay (inactive
curator seats reopen), charters define how each space runs, disputes escalate to
the platform. Staff comms: Discord (channels per space) at first - zero build.

### 4.3 The collaboration ladder (anti-empty-wiki, anti-vandalism)

- Stage A (launch): everything readable and ALIVE day one - entities auto-seeded
  from open data + games + feeds. Editing: owner + invited curators. Everyone
  else: "suggest an edit" (structured form -> review queue).
- Stage B: signed-in members edit; edits enter pre-moderation; approved edits
  earn reputation (editor XP, contributor badges - the existing passport spine).
- Stage C: reputation unlocks live editing (post-moderation), watchlists, revert
  powers. fandom.com freedom, earned.

### 4.4 Content policy (structural, non-negotiable)

- **Living-persons hard policy:** no dating/rumors/scandal/controversy content
  anywhere in v1. Enforced by SCHEMA: entity templates contain no fields for
  personal life; no "controversy" section type exists. Facts require sources.
  This protects fans, idols, the platform, and the brand ("the respectful wiki")
  and is our defense posture toward agencies.
- No sasaeng-adjacent info ever (locations, schedules, private data). Banned at
  policy AND template level.
- Rivalry stays stats-only (plays, streaks, collections). Zero comparative
  editorial between fandoms. Spaces do not host commentary about other groups.
- No lyrics reproduction (licensing); link out. Fanchants and fan-written
  guides: original fan content, allowed.
- Images v1: strict-legal only (official album art, press assets, existing site
  photos). Fan uploads under ToS + moderation = a separate later decision.
- English-only v1. PT and others follow the existing i18n pattern later.

### 4.5 Data foundation (Workstream W core)

- Sources: Wikidata + MusicBrainz (open, structured, legal) + Wikipedia facts,
  cross-verified; refreshed by cron like the MV tracker. NEVER scraped from
  kprofiles, Fandom, or any protected database - the citation-over-extraction
  doctrine applies platform-wide.
- Every ingested fact carries source attribution. Curators correct on top;
  corrections outrank ingestion; conflicts surface for review.
- Export/portability promise: structured data stays exportable; fan-written text
  under an open license. The anti-fork trust signal: contributors keep what they
  make. Network effects, not lock-in, retain them.

## 5. Monetization stance (public wording)

"Verse is built for fans first. It is free, and the experience will never be
buried under ads - growing the community is the goal, not squeezing it. If the
platform someday needs revenue to keep growing, it will come in ways that respect
the experience: optional cosmetics, supporter perks, and partnerships fans
actually want - the experience always comes first."

(Internal note: this promises priorities honestly without promising "no ads
forever". Tasteful ads remain possible later; exploitative UX does not.)

## 6. Umbrella architecture (technical)

- Same Next.js app, new route namespace (/verse/...), own design accent, shared
  spine: auth, passport, PersonCard, notifications, analytics, search.
- Root portal v1: a thin chooser (Play / Verse) + shared nav; the current quiz
  home moves to its product surface UNCHANGED (it converts; we do not touch it).
  Community + profile become cross-product surfaces.
- All house rules apply: real data only, min-volume gates, static/ISR, NANO-safe
  queries, route allowlist, no em dashes, accessibility, dark/light parity.

## 7. Roadmap (Workstream W phases)

- **W0 - feasibility spike:** query Wikidata/MusicBrainz coverage for K-pop
  (groups, idols, albums, field completeness). STOP and report. This decides
  seeding quality and W1's schema.
- **W1 - entity schema + ingestion engine:** typed entities, relations, source
  attribution, refresh cron.
- **W2 - the reading experience:** space pages + entity pages + games widgets +
  feeds + "on this day". Spaces are valuable BEFORE any editor exists.
- **W3 - the editor:** block editor (TipTap), revisions, diffs, revert,
  suggest-an-edit queue (Stage A).
- **W4 - collaboration:** roles, review queues, reputation, charters, mod tools
  (Stage B/C). Gated on real curators recruited.
- **W5 - collections + media policy:** photocard database, galleries, the image
  decision.
- Launch plan: 3 spaces first, curators recruited on Reddit/Discord/fan Twitter
  ("become a founding curator of your fandom's home"). Two more spaces from
  scratch with new recruits after the first 3 prove the model. Spaces open ONLY
  with curators attached - no ghost towns, doctrine.

## 8. Harmony rules with the games product

- Games product: untouched, separate, its home page unchanged.
- Spaces embed game widgets; games result screens link the group's space.
- One passport across both: memberships, editor XP, curator credits, quiz
  mastery all on the same profile.
- The community layer (war map, feed, debates) serves both worlds and becomes
  the umbrella's connective tissue.
- Cross-product analytics reuse existing events; no parallel systems - ONE
  spine, always (the founding law of this codebase).

## 9. What we explicitly do NOT do

No scraping anyone. No fabricated activity or counts, ever. No controversy/
gossip content. No fan-photo grey zone in v1. No marketplace/trading. No ads
subordinating UX. No new domains/subdomains now. No space without curators. No
percentile/status claims without real denominators. No lyrics. No parallel
notification/identity/analytics systems.

## 10. Success measures (honest ones)

- W2: spaces indexed + fandom-name queries entering GSC; entity pages cited by
  AI engines; time-on-space.
- W4: curators recruited per space (target 3-10), edit approval throughput,
  contributor retention.
- Platform: cross-product session flow (space -> game plays, game -> space
  visits), passport adoption (memberships, editor badges), referring domains.
