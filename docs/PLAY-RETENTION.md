# PLAY-RETENTION - identity, retention, community on the quiz side
(2026-08-06 · Cowork analysis of the external ChatGPT audit + own verdict)

Owner asked for an honest independent analysis of the ChatGPT product
audit (Phases 1-2) of kpopquiz.org, quiz side only, focus retention /
identity / community. Verdict first, then the plan.

## 1. Audit of the audit (honest)

RIGHT, and worth keeping:
- The central diagnosis is correct and crisply put: "the user leaves
  exactly the same person they arrived as". Content is strong, the
  self is not persistent. We knew it (G-CLAIM, G-PULSE); this framing
  is better than ours.
- "Navigation ends at the score" is the sharpest single observation:
  the post-score screen is the most under-used surface on the site.
- People-discoverability (creators, best players) is genuinely absent
  from navigation. We had not designed for this at all.
- Its Stage-6 endgame ("IMDb / Letterboxd / Steam for K-pop") is
  LITERALLY the Verse vision. Convergent validation from an outside
  eye that never saw our docs.

WEAK, and to be discarded:
- The scores (9.5 content, 10 potential) are vibes, not measurement.
  Directional map yes, scorecard no.
- "Profiles should become the product" is HALF right: on the QUIZ
  side alone it would duplicate MY VERSE (D7). One identity across
  Play + Verse, two facets: the quiz side FEEDS the profile, the
  Verse DISPLAYS it. The audit does not know the Verse exists behind
  the teaser, so it cannot see the split.
- It ignores every real constraint: the covenant (no fake activity:
  its "leaderboards as destinations" needs REAL density, which is
  exactly why rankings has the threshold-30 rule), the audio legal
  wall (retention built on blindtest must stay Apple-CDN), no new
  deps, and one worker pipeline of capacity.
- Community section adds nothing beyond G-PULSE (which already has
  Editor's Take, vote-first reveal, celebration, opinion book,
  prediction league, post-game prompt). Confirmation, not novelty.
- Phases 3+ of that audit will be diminishing returns: we have the
  map; the codebase truth lives here.

## 2. The plan: four pillars (quiz side, covenant-bound)

P1 THE DAILY SPINE (retention). One "Today on KpopQuiz" ritual
   surface: daily blindtest (exists) + daily quiz + K-pop Idle
   (backlog L-032) under ONE streak with freezes, no guilt copy
   (Snapchat-anxiety finding, G-PULSE law) + spoiler-free share grid
   (Wordle logic; Stage A already planned). The genre's proven
   comeback machine. Cheap: mostly assembling existing pieces.

P2 THE PERSISTENT SELF (identity). The post-score moment writes to
   ONE cross-site profile: per-group MASTERY ("BTS mastery 72%", real
   coverage of real quizzes), streaks, badges (the 5-tier rarity look
   from the merge backlog finds its home HERE), best scores. NO
   farmable global XP (Mekler/Hanus: paying for clicks buys noise);
   mastery + badges + streak only. G-CLAIM is the front door: guest
   progress accumulates and is claimed at signup (doc exists,
   includes the founder welcome notification). THE BRIDGE, our moat
   neither fandom nor any quiz site can copy: playing EARNS real
   catalogued collectibles (photocards from the Verse catalog) into
   your binder, displayed on MY VERSE when the Verse opens. Play
   feeds identity; Verse displays it. Real items only, never
   generated fakes.

P3 THE PEOPLE LAYER (community). Surface creators and players in
   navigation: creator credit on every quiz card with plays count,
   a creator page (their quizzes, total plays), "top players" strip
   on group hubs (threshold-30 rule respected: shown only when
   real density exists), and the G-PULSE post-game prompt as the
   evergreen community door. Follow/notifications later, on the
   G-CLAIM notification rails, not before.

P4 THE POST-SCORE SCREEN (the wedge, build first). Redesign the
   score screen into the identity moment: score -> what changed for
   YOU (streak +1, mastery %, badge progress, rank delta) -> one-tap
   next (rematch / harder / next daily) -> share card -> community
   prompt. Highest leverage per line of code on the whole site.

## 3. Sequencing (honest capacity)

Verse V-FOUNDATION stays the critical path with the Verse worker.
PLAY-RETENTION goes to the GAMES worker (play-games branch), which
is currently spending itself on ad-hoc polish: this gives it a
direction worth its commits. Prototype-first law applies: Cowork
mockups (post-score screen, daily hub, profile games facet) ->
owner lock -> games-worker missions. Pushes are routine now (P3,
L-078): retention features can ship weekly.

## 4. Owner rulings (2026-08-06)

RQ1-RQ4 all ruled OK with ONE AMENDMENT that governs everything:
PROTOTYPE TOGETHER before any implementation. The site already has
badges, XP, streaks etc.: the work is to make them better AS ONE
SYSTEM, not to bolt on new pieces. Ratified as the workstream law.

## 5. THE INVENTORY (code truth, read 2026-08-06)

Cowork correction, owned: RQ1 was ruled on my recommendation "no
global XP" WITHOUT knowing the codebase truth. Reality: a full XP +
FAN LEVEL system already exists (lib/constants.ts: level curve with
named levels, polynomial then linear endgame, L50=151,820; a
level-up overlay component exists). Removing it would be waste plus
a regression for existing accounts. REVISED RQ1 below.

What ALREADY EXISTS quiz-side (a half-built identity platform,
"Workstream M - K-pop Passport", spine at M0.1):
- PASSPORT SPINE (lib/passport.ts): typed accessor over profiles
  (xp, totals, likes) + per-group store player_group_mastery
  (songs_correct/played per group per player). Write-hooks (M0.2)
  and UI never finished.
- DAILY STREAK server-side (lib/daily-streak.ts): +5 XP/day,
  milestones 3/7/14/30, streak badges 7/30/100, idempotent UTC;
  streak states played_today / at_risk / none with loss-aversion
  nudge and "render nothing when none" (empty-room law respected).
- BADGES: DB badge_definitions (migrations 101/102/104) + art for
  11 badges + the NEW rarity ladder (common->legendary ring colors,
  BADGE_FAMILIES tiers) ALREADY integrated locally; pinned badge on
  PersonCard. Some badge categories already marked 'verse'
  (pc_first / pc_collector / pc_set / group_master / founding_fan):
  the Play->Verse bridge was SKETCHED in the data already.
- PEOPLE: profiles carry follower_count, bias, avatar system,
  pinned badge; getTopCreatorsThisWeek / AllTime / TopPlayer
  queries exist; quiz-hall-of-fame + quiz-my-rank components exist.
- NOTIFICATIONS: types include streak_milestone + group_mastered.

CONCLUSION, sharper than the external audit: identity is not
missing, it is BUILT BUT BURIED. Fragments exist (passport, mastery,
streak, levels, badges, followers) with no unified language, no
place in the post-score moment, no destination page, no people
discovery. The workstream is UNIFY + SURFACE, not invent.

## 6. Revised ruling + new ideas (put to owner)

REVISED RQ1: KEEP XP + Fan Levels as the base layer (it exists, it
is sound: daily-capped, milestone-based, non-farmable by design).
Do NOT add new farmable XP sources. Mastery-per-group + badges +
streak become the VISIBLE language; XP/level stays the quiet
long-term meter under it. One progression grammar everywhere.

New ideas for the unified system (each = oui/non):
N1 KPOPQUIZ WRAPPED: monthly mini + yearly recap of YOUR real
   stats (mastery, bias proof, percentiles), shareable cards.
   The single biggest share moment in consumer apps; all real data.
N2 COMEBACK EVENTS: retention tied to the REAL K-pop calendar we
   already hold (releases/eras): comeback week = event quiz set +
   limited-time badge. Real events only. Our data moat; generic
   quiz sites cannot follow.
N3 DUEL LINKS (async): "beat my score" challenge URL; accepting
   needs NO account; the result screen invites G-CLAIM. A viral
   loop with zero realtime infra.
N4 PACK MOMENT: bridge photocards (RQ2) arrive as a pack-opening
   animation; odds transparent, cards = real catalog entries only.
N5 TITLES: equipable profile titles earned by real feats (BTS
   mastery 90% -> a named title), next to the pinned badge.
N6 NEAR-MISS mechanics on post-score: "1 question from perfect,
   rematch?" (the strongest honest retry pull).
N7 BIAS PROOF: the profile's bias (field exists) backed by your
   real playtime/mastery on that group: identity flex, all real.

## 7. Prototype scope (after owner answers)

ONE integrated prototype file, one visual language: post-score
screen + daily hub ("Today on KpopQuiz") + the Passport (profile,
games facet) + group-hub people strip + the pack moment if N4.
Existing pieces (streak states, rarity coins, level meter, mastery)
appear IN the prototype as one system. Owner critique -> LOCK ->
games-worker missions.

Open questions for owner:
QA Revised RQ1 (keep XP/levels as quiet base layer): oui/non.
QB Which of N1-N7 enter prototype v1 (list them).
QC Naming: adopt "K-pop Passport" as the quiz-side identity brand
   (the profile page IS your passport; MY VERSE stays the
   fandom-side facet, one account). Reco: OUI.
QD Prototype scope as section 7. Reco: OUI.

## 8. Owner rulings 2026-08-07 (ALL validated) + THE HARMONIZATION LAW

Everything validated ("je valide tout"). THE LAW, owner's words made
binding: every meaningful event (+5% BTS mastery, +5 XP, new badge,
level, streak, comment, duel result) must be VISIBLE and SATISFYING,
through ONE harmonized feedback grammar: the same delta component,
the same animation language, the same placement rules everywhere
(post-score stack, toast rail, passport). Amplified, never fake: all
numbers real. The trap named by the owner: features added side by
side. Refused; everything designed together.

Details ruled:
- N1 Wrapped: OUI, to prototype. Cadence answered: MONTHLY MINI
  (auto card on the passport, "Your August in K-pop", shareable,
  quiet) + YEARLY full animated Wrapped in December (the big share
  moment). Both real-data only.
- N2 Comeback events: OUI. Owner asked manual or automatic: answer
  = AUTOMATIC, no scraping needed: our own refresh pipeline
  (refresh.ts insertNewAlbums, Wikidata/MusicBrainz) already lands
  new releases; a new release for a covered group becomes a
  CANDIDATE EVENT in an admin queue; owner one-click approves ->
  event goes live (event quiz set + limited badge + banner).
  Owner's only manual act is the approval. Real events only.
- N3 Duels REDESIGN (owner directive captured): the existing duel
  feature is underused and near-useless today; it becomes a
  COMMUNITY OBJECT: launching a duel publishes an open challenge
  ("X launched a duel on quiz Y: 9/10 to beat"), ANYONE can attempt,
  every attempt joins a visible score list, with comments and
  reactions, surfaced on the community page (G-PULSE rails) and as
  a post-score CTA. Make duels cool: the prototype carries this.
- N5 Titles: OUI (badge already pinnable; titles sit next to it).
- N6 Near-miss: OUI.
- N7 Bias proof: OUI, "developpe": passport bias card = bias +
  proof (mastery %, real playtime, percentile among that group's
  players), honest bias history over time, shareable card.
- QC K-pop Passport naming + QD integrated prototype scope: OUI
  (validated within "je valide tout").

## 9bis. Prototype critique + PARKED (owner, 2026-08-07)

Owner critique of passport-prototypes.html, recorded for the future
workstream (workstream PARKED for now, Verse resumes):
- LAW: prototypes must follow the EXISTING site UI, never invent a
  parallel design language for the quiz side.
- 01 post-score: OK as designed.
- 02 Today: placement question OPEN (owner asks where it would
  live: homepage strip? /games? own route?). To answer at reprise.
- 03 Passport: direction accepted BUT must adapt to the CURRENT
  profile page (existing header etc. absent from the prototype).
  PREREQUISITE at reprise: a code audit of the existing profile
  page (and of every real number shown anywhere in the prototype)
  BEFORE re-prototyping in the current page's frame.
- 04 duels: accepted; find its spot INSIDE the existing community
  page.
- 05 pack moment: ABANDONED TOTALLY by owner ruling. The
  earned-photocard pack mechanic is dead; the RQ2 Play->Verse
  bridge is therefore shelved unless the owner revives it in
  another form.
Reprise order: code audit (profile + numbers) -> re-prototype in
existing UI -> lock -> games-worker missions starting post-score.

## 9. Cron incident note (2026-08-07, quiz ops)

GitHub Actions failures reported by owner (K-pop News Auto-post +
Group YouTube Auto-post on KpopQuizzV2 at post-push tip b5f5819;
plus Discord chapter notifications on the SEPARATE drops-monorepo
repo, out of this project's scope). Cowork verified: the workflows
and the "Kpop Quiz" Discord-bot folder are BYTE-IDENTICAL between
old origin/main and the pushed tip (git diff empty), lockfile
present, scripts intact: the push is NOT an obvious culprit. Logs
are not readable from outside (private repo API 403). Needs the
actual failure log from the owner (open a failed run, paste the
red step's first lines) before any fix. No blind fixes.
