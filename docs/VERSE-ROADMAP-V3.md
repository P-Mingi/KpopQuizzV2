# VERSE ROADMAP V3 - THE VERSER

Supersedes V2 for everything after the W-CUSTOM/QA cycle. Owner directive
2026-07-30: the push is OFF until Verse is a complete product. This document
reframes the whole project: kpopquiz.org is the funnel and the proving ground;
VERSE is the company. Target frame: a real business, six figures a year,
credible, not defeatable. Build every new piece as if the platform were called
THE VERSER and K-pop were merely its first verse.

## 1. The global vision (think Verser, build K-pop)

- THE VERSER = a multi-niche network of fandom universes ("verses"). Verse 1:
  K-pop. Future verses: anime, gaming, others. Same engine, same editor, same
  roles, same collections, same customization studio; only the entity types
  and the seed sources change per niche.
- ARCHITECTURE LAW from now on: no new K-pop hardcoding in core logic. Entity
  types, section keys, seed adapters, quest kinds, collection kinds live in a
  per-verse CONFIG; core code reads config. We do not refactor the existing
  W1-W5 stack now (risk without benefit pre-launch), but every NEW workstream
  below writes niche-agnostic core + kpop config. The extraction gets cheaper
  every week instead of harder.
- The kpopquiz link becomes SOFT: Verse is its own brand and its own product.
  Games are one of many modules a space can choose, not the front door.
  Cross-funnel stays (result pages link spaces, spaces can embed games) but
  reads as "powered by the same passport", never as "a quiz site's side page".

## 2. Competitor audit (fetched 2026-07-30 + the absorbed fandom teardown)

### fandom.com (the giant)
- Homepage = entertainment news feed + trending wikis + QUIZZES on the front
  page. They run trivia as a first-class engagement product. This validates
  the funnel thesis: the giant agrees games drive fandom traffic.
- Strengths: scale, SEO monopoly, discussions product, per-wiki theming.
- Exploitable weaknesses (from the teardown): ad-crushed reading experience,
  monetizing AGAINST community (wikis fork and leave: wiki.gg exists BECAUSE
  of this), identical template feel, walls of unstructured text, buried
  contributor credit, corporate distrust.
- We take: homepage trending + featured model (done cleaner), per-space
  theming (ours is already deeper via W-CUSTOM), quizzes-as-engagement (ours
  are native, theirs are content-farm). We reject: ad-first reading.

### wiki.gg (the refuge)
- Positioning: "editors come first", indie, 800+ wikis, and THE key promise:
  "if you decide to leave, we will not compete with your community". Their
  entire brand is built on fandom.com's betrayal. Partner logos (Terraria,
  ARK) as social proof. New wiki requests currently CLOSED (capacity-bound;
  a hosted-MediaWiki weakness we do not share).
- We take: the editors-first covenant made explicit and public (our export
  promise + credited-curator model formalized as a CHARTER page), partner/
  social-proof strip on the Verse home. Their gap: no games, no structured
  entities, dated MediaWiki UX; we are a product, they are hosting.

### fextralife (the media company)
- The revenue model to study: wiki network + editorial (news/reviews/guides)
  + YouTube (their videos hit 100k+ views) + forums + Discord + merch store +
  PREMIUM SUBSCRIPTION (ad-free tier) + newsletter, all cross-feeding. Owned
  by Valnet (a real publishing group): proof this category builds companies.
- "Expert-authored" credibility framing ("By Top Players") instead of
  anonymous crowd: maps to our credited curators ("By the fans who know").
- We take: the ecosystem loop (wiki <-> editorial <-> video <-> community),
  the premium ad-free supporter tier as the honest monetization path, page
  counts as trust signals ("4.6K pages"), newsletter. Their gap: gaming-only,
  cluttered layout, no per-community identity.

### miraheze (the nonprofit)
- 100% donation-funded, community-governed, in-house extensions, "little
  oversight from staff" self-governance. 100k+ users on goodwill.
- We take: the transparency posture (public "how Verse is funded and what we
  promise" page; goodwill is a moat that giants cannot buy back), self-serve
  space governance tooling so curators need no staff. Their gap: zero
  product polish, no discovery, no identity; goodwill alone does not scale
  a company.

### The synthesis
Nobody in this market has ALL of: structured entities + beautiful per-space
identity + native games + credited curators + honest monetization + modern
product UX. Fandom has scale without love; wiki.gg has love without product;
fextralife has business without community-ownership; miraheze has trust
without polish. The Verser's lane: ALL FIVE, per niche, starting with K-pop.

## 3. The new workstreams

Ordered. Each gets its own spec doc before build; design-heavy ones get
prototype-first with the owner. All house rules apply (no em dashes, commit
not push, migrations owner-run, real data only, no user-facing AI).

### V-DESIGN - kill the boxes (FIRST, it poisons every screenshot)
The current space rendering is border-box soup: every module wears a visible
bordered rectangle, dotted dividers everywhere, cards inside cards (see the
ATINY screenshot). Dual-skill /ui-ux-pro-max + /frontend-design MANDATORY.
- Default module chrome becomes INVISIBLE: whitespace + typography hierarchy
  separate sections; frames/borders become an OPT-IN curator choice, not the
  base state. Dotted dividers die as a default.
- Redesign the 6 presets to magazine standard: full-bleed hero treatments,
  editorial type scale, breathing room. A space should look like a fan-made
  magazine cover, not an admin dashboard.
- Redesign the two showcases with the new system; owner reviews screenshots
  BEFORE this workstream closes. Exit bar: the owner does not say "wtf are
  those boxes".

### V-IDENTITY - Verse becomes its own product (same domain, own soul)
- Own wordmark/logo (Verse mark, not the kpopquiz logo), own header, own
  FOOTER (Verse links, charter, its own voice), own 404, own favicon/OG
  identity, own meta title patterns ("{Group} Verse · the {fandom} home").
- The kpopquiz link goes SOFT: a small "part of the kpopquiz.org network"
  line in the footer + the world toggle. Nothing louder.
- DOMAIN TRUTH (the honest SEO answer): staying on kpopquiz.org/verse keeps
  the domain authority that makes launch findable; a new domain restarts SEO
  from zero. The smart play: full brand separation on the same domain now;
  register the future standalone domain today as cheap insurance (parked,
  redirecting); IF Verse earns its own gravity, migrate later with 301s from
  a position of strength. Decision gate for the owner, not a default.

### V-HOME - the Verse homepage (a real front door)
Modeled on what works (fandom's trending/featured, fextralife's counts and
freshness) minus their noise:
- Hero: what Verse IS (fans build their fandom's home) + search-first entry.
- Trending spaces (real views/plays), featured space of the week (curator
  credited), newest content strip (real revisions), the numbers that build
  trust (spaces, pages, contributors: real counts only, min-gated).
- "Claim your fandom" curator recruitment block: the standing invitation.
- The quiz/games funnel appears as ONE tasteful module, not the headline.

### V-SPACE-FLOW - games out of the front seat
- Space home default order becomes: identity (hero/welcome), members, story/
  lore, latest releases, community activity. Games become (a) a nav link and
  (b) an optional compact widget the curator places, not the top strip.
- IN-SPACE QUIZ CREATOR: curators create quizzes scoped to their space from
  inside the space (the existing creation engine, reskinned into Verse, group
  pre-selected, published under the space's shelf + the main games catalog).
  Space quizzes credit the space and its curator. This is the funnel running
  BACKWARD (fandom -> games) and no competitor has it.

### V-TEXT - long text without the fandom fatigue
The anti-wall system, everywhere long text can exist:
- Every lore/era/about section renders as PREVIEW (first ~2 paragraphs) +
  "Read more" expansion; full text stays in the HTML (SEO unharmed), the
  UI simply folds it.
- Auto-TOC past 3 sections (already built, W3.5) + sticky section nav.
- Editor-side nudges: section length hints ("readers drop after ~300 words
  here; consider splitting"), never blocks, just guidance.
- Curator choice per section: inline, folded, or split to a sub-page.

### V-ROLES-CLEAR - who can do what, visible and managed
Competitor read: MediaWiki buries rights in Special: pages; fandom's mod
hierarchy (discussion mod / content mod / admin / bureaucrat) is invisible
until you hit a wall. We make roles a visible, warm system:
- Every page shows its edit affordance state to the current viewer: visitor
  sees "Suggest an edit" (never a dead Edit button), member sees what they
  can touch, contributor+ sees Edit. The barrier is EXPLAINED at the point
  of contact ("Members can suggest; contributors edit. You are 40 XP away").
- Role badges on profiles, member directory, and revision history.
- Space admin panel: a single "Roles" surface (promote/demote with reason,
  role log, pending suggestions count per member) replacing scattered
  controls. Charters (W4.9) linked right there.
- The progression ladder rendered as a PATH on the space join page: what
  each rung unlocks, computed from real thresholds. Progression is the
  product; fandom hides it, we sell it.

### V-EDITOR-MAX - the editor at maximum simplicity
The editor exists (W3, full machinery). This workstream is USABILITY war:
- Scripted first-edit usability run: 10 tasks (edit a section, add a source,
  mention an idol, suggest as visitor, resolve a conflict...) executed cold;
  every friction point logged, then fixed. Repeat until the 10 tasks flow.
- First-edit onboarding: a 3-step inline tour on first editor open (what
  blocks are, how sources work, where drafts live). Dismissable, never
  returns.
- Templates: "era story", "album note", "idol lore" starter skeletons
  (structure pre-filled, prose empty; zero AI, pure scaffolding).
- Mobile editing pass: the W3 editor is desktop-first; make the phone path
  honestly good for SHORT edits (fix a fact, add a source, approve a
  suggestion).

### V-PROFILE-ONE - one passport, two worlds
- Profile page merges both lives: game stats (existing) + Verse identity
  (spaces joined with role badges, contribution graph, edit count, quests
  completed, collections/photocard showcase, curator credits).
- Public profile = the fan's resume. "Founding curator of STAY Verse" is a
  status object no other site can grant.
- Settings: one account surface, per-world notification preferences.

### V-COMM-3 - community center v3
- The shared Community hub gains a Verse layer: per-space discussion
  highlights surface into the global feed (opt-in per space), space events
  (comeback countdowns) appear alongside game events (daily debate, war
  map). One community, two products feeding it.
- Cross-promo modules: "your spaces" strip for members, "claim a space"
  for non-members.

### V-TRUST - the covenant + the business layer (company-grade credibility)
- Public CHARTER page (the wiki.gg lesson made ours): curator credit
  promise, export promise, "your work stays yours", moderation principles,
  funding transparency (the miraheze lesson). This page is the moat.
- Supporter tier design (the fextralife lesson): ad-free-forever pledge for
  supporters + profile badge + early features. Design + pricing PROPOSAL
  only; owner decides when/if to ship. Honest wording per the master vision
  (we never promised no ads forever; supporters can be promised THEIR
  experience stays clean).
- Newsletter foundation (weekly Verse digest, real content, double opt-in):
  spec only this cycle; ship post-launch.

### V-DISCORD status (owner asked)
- W-DISCORD-lite is DONE and live in the module registry: curator sets the
  invite link + optional click-to-load server widget per space.
- FULL provisioning (we create/own each space's Discord, bot-managed roles
  synced to Verse roles) stays PARKED post-launch by earlier decision;
  revisit once real curators exist. Nothing new needed pre-push.

## 4. Sequencing

(Amended 2026-07-30: VERSE-PAGES-UNIVERSE.md adds V-PAGES, the custom-pages
infinite-depth system, and V-TEMPLATES, structure templates + the canonical
home order. Read that doc; it is part of this roadmap.)

1. V-DESIGN (everything screenshots better after it; blocks all demos)
2. V-IDENTITY + V-HOME (the product gets its face and its front door)
3. V-SPACE-FLOW + V-TEXT + V-TEMPLATES (the reading product reaches final
   form: canonical order, folding, structure templates)
3b. V-PAGES (the rabbit hole: custom pages with kinds, migration-gated,
   spec-first with owner)
4. V-ROLES-CLEAR + V-EDITOR-MAX (the contributing product reaches final form)
5. V-PROFILE-ONE + V-COMM-3 (the belonging product reaches final form)
6. V-TRUST (charter live; supporter tier as proposal)
7. Re-run QA-PRELAUNCH end to end (it exists and it worked)
8. THE PUSH, recruitment kit, founding curators

Owner gates on the way: V-DESIGN screenshots, V-IDENTITY brand (logo/wordmark
prototypes), V-HOME design, the domain-registration decision, supporter-tier
proposal. Everything else runs on the standing rules.

## 5. What we do NOT do (guardrails against ambition drift)

- No refactor of the shipped W1-W5 stack for multi-niche purity now; config-
  first applies to NEW code only. Extraction is a post-launch workstream.
- No second niche before K-pop proves the model with real curators.
- No user-facing AI (standing).
- No scraping, ever, no matter what competitors hold.
- No marketplace (standing: never).
- The games product stays untouched and profitable while all of this builds.
