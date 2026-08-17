# V-UPGRADE-1 - badges (more tiers) + shared surfaces (both worlds)

## Claude Code Implementation Prompt

---

Owner-approved 2026-08-01. Two upgrades in one workstream, each its own
phase with its own owner STOP. Phase A: expand the badge system (more
badges, more tiers, across Play AND Verse) so unlocking takes real effort.
Phase B: the deferred seam-1 fix, in the owner's chosen shape: shared
surfaces (Community, Notifications, Profile) render the SAME content inside
the chrome of the world you are in, so you never get kicked across the
toggle.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps.
Migrations owner-run stop-and-wait (only if truly needed). Play
triple-proof on anything touching shared/Play chrome. Real data only:
every badge maps to genuinely tracked activity, no fake progress. Min-gate
laws hold, EXCEPT locked badges are shown as targets on purpose (the
grind). Dual-skill design (/ui-ux-pro-max + /frontend-design) on the badge
art and any new surface.

## PHASE A - the badge expansion

### Reuse, do not rebuild
The badge system EXISTS: migrations 009_likes_xp_badges, 102_badge_tiers,
104_badge_awards; components badge-coin, badge-shelf, badge-grid,
badge-icon, badge-detail-modal, badge-showcase, level-badge; art in
public/badges/*.png (creator_bronze/silver/gold, streak_7/30/100,
perfect_score, group_mastered, first_quiz_played, founding_fan...). READ
this system first and report how it works (how a badge is defined, how
tiers are stored, how an award is checked/granted, how the shelf renders).
Extend it; do not fork it.

### The badge set (owner-validated, all tiered)
PLAY:
- Marathoner - quizzes played: 10 / 50 / 250 / 1000
- Perfectionist - 100% scores: 1 / 10 / 50 / 200
- Golden Ear - blindtest wins: 5 / 25 / 100
- Name Them All - full clears: 1 / 10 / 50
- Bias Radar - "which member" plays: 5 / 25 / 100
- Daily Devotion - play streak days: 7 / 30 / 100 / 365
- Debater - daily debate votes: 5 / 25 / 100
- Quizmaker - quizzes created: 1 / 5 / 25
- Reached - your quizzes played by others: 100 / 1k / 10k
- Fandom Traveler - distinct fandoms played: 5 / 15 / 40
VERSE:
- Wordsmith - wiki pages written: 1 / 5 / 25 / 100
- Sourcerer - sources added: 10 / 50 / 250
- Essayist - essays published: 1 / 5 / 25
- Quest Runner - quests completed: 5 / 25 / 100
- Collector - photocard sets completed: 1 / 5 / 25 (+ one-time 100% binder)
- Cartographer - nested wiki pages created (depth reached): 3 / 5 / 8
- Chronicler - era stories written: 1 / 3 / all-of-a-group
- Steady Hand - contribution streak days: 7 / 30 / 100
- First Fan - among the first 50 members of a space (one-time, rare)
- Founding Curator - one-time, rarest
CROSS-WORLD:
- Dual Citizen - active in both Play and Verse
- Multi-Fandom - spaces joined: 3 / 7 / 15
- Veteran - account age: 1 / 2 / 3 years
- Completionist - hold a badge in every category (capstone)

### Steps
A1. Read + report the existing badge system. Then map each new badge to a
    REAL tracked source (plays, scores, streaks, XP, edits, sources,
    quests, collections, memberships, account age...). Flag any badge
    whose source is NOT yet tracked (candidates: blindtest wins,
    distinct-fandom count) and either find existing tracking or, if a new
    counter needs storage, STOP and ask before migrating. Deliver the
    badge -> source map.
A2. Definitions + thresholds: add the new badges + tiers to the existing
    definition store (rows if data, config if code - justify). If seeding
    definitions needs a migration, STOP for owner to run. Award-check
    logic grants tiers from real activity; backfill existing users'
    earned tiers honestly (a user who already has 60 perfect scores gets
    the 50 tier). Commit.
A3. Badge ART: Claude Code designs the new badge coins, dual-skill,
    matching the existing visual language (bronze/silver/gold/platinum
    tiers, the coin style already in public/badges). On-brand, legal
    imagery only (no idol photos). Commit.
A4. Surfaces: the profile badge shelf (both /me and public /u/) shows all
    badges grouped by category, EARNED bright + LOCKED shown as targets
    with the next threshold ("Marathoner silver: 50 plays, you have 31").
    Detail modal explains each tier. Commit.
A5. STOP: owner review. Matrix: the full badge shelf (earned + locked
    targets), a detail modal, the new coin art, a backfilled account,
    3 breakpoints x light/dark.
A6. Closing sweep: award-checks fire on real activity (prove a threshold
    crossing grants the tier); no fake progress; backfill correct; a11y
    (badges have text names); Play triple-proof; full build; em-dash
    grep; check:routes. Commit.

## PHASE B - shared surfaces, both worlds

### The model (owner-specified)
Community (leaderboard), Notifications, and Profile currently live only in
the Play world (world.ts classes them Play), so reaching them from Verse
flips you to Play chrome. Fix: the CONTENT is one component; it renders
inside the CURRENT world's shell. In Verse you stay in Verse chrome
(violet, VerseLogo, Verse nav/footer, toggle still Verse); in Play you get
Play chrome. Content identical; only the chrome differs. Never kicked
across the toggle.

### The SEO guardrail (LAW)
The content now reachable at two URLs (a Play URL and a Verse URL) must
carry a CANONICAL pointing both to ONE canonical URL, so Google never sees
duplicate content. Auth-gated surfaces (Notifications, /me) are noindex
anyway; the public one (community/leaderboard) MUST canonicalize. Prove
the canonical + no-duplicate-index in the sweep.

### Steps
B1. Extract the shared CONTENT of community/leaderboard, notifications,
    profile into world-agnostic components (if not already), so the same
    content can mount under either world's layout. Commit.
B2. World-aware rendering: reaching a shared surface from Verse renders it
    under the Verse shell (nav/footer/toggle/accent), from Play under the
    Play shell. Decide the cleanest mechanism (world-aware layout vs
    per-world route) and justify; whichever, the toggle/nav must stay
    in-world and the content stay identical. Commit.
B3. Canonical + SEO: canonical tags on the dual URLs point to one;
    noindex the auth-gated; sitemap unchanged; prove no duplicate-content
    exposure. Play triple-proof (Play versions byte-identical). Commit.
B4. STOP: owner review. Matrix: from Verse -> Community / Notifications /
    Profile all stay in Verse chrome (same content), from Play they stay
    in Play chrome; the toggle never flips unexpectedly; 3 breakpoints x
    light/dark.
B5. Closing sweep: canonical proof (no duplicate index); Play
    triple-proof; a11y; full build; em-dash grep; check:routes; token
    gate. Commit.

## Verify (both phases)

- [ ] Badges: existing system extended not forked; every new badge maps
      to REAL tracked activity; unmapped sources flagged/stopped;
      backfill honest; locked shown as targets; art on-brand + legal;
      award-check fires on a real threshold crossing (proven)
- [ ] Shared surfaces: from Verse you stay in Verse chrome on Community/
      Notifications/Profile with identical content; from Play you stay in
      Play; toggle never flips unexpectedly
- [ ] Canonical law: dual URLs canonicalize to one; no duplicate content
      indexable (proven); auth-gated noindex
- [ ] Play triple-proof holds both phases; tsc/build/routes/token-gate
      green; zero em dashes; no new deps; migrations owner-run only

/caveman report per step; A5 and B4 are owner gates. Phase A first
(delight, lower risk), then Phase B (chrome + SEO care).
