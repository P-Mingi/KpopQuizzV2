# V-PROFILE-ONE - one passport, both worlds (the fan resume)

## Claude Code Implementation Prompt

---

Per VERSE-ROADMAP-V3.md (V-PROFILE-ONE) and the owner-approved profile
prototype (2026-08-01). The profile gathers everything the flagships
seeded into one fan resume: game stats + Verse identity (spaces + roles,
contribution XP, pages written, essays, card shelf, quests, atlas
contributions). Owner decision locked: PRIVATE by default, per-section
opt-in public (consistent with the shipped binder-shelf privacy model).
This workstream also builds the shared IDENTITY + ACTIVITY plumbing that
V-COMM-3 will reuse: build it clean and general.

Hard rules: NO em dashes. Commit per step, do NOT push. No new deps. ONE
migration budget (profile visibility settings + activity, if a rail does
not already fit), owner-run, stop-and-wait. Real data only: every stat is
a live count, never fabricated; a zero is shown honestly or the section
min-gates. No user-facing AI. Dual-skill design. Play triple-proof.

## Shared plumbing (built here, reused by V-COMM-3)

- IDENTITY RESOLVER: one server helper resolving a user to their public
  display identity (name, avatar/initials, per-space roles + badges),
  honoring the SYSTEM_AUTHOR_DISPLAY constant and block state. Every
  byline everywhere (essays, wiki attribution, discussions later) reads
  from this one place.
- ACTIVITY MODEL: a unified read over existing sources (revisions,
  essays, quiz plays, card adds, quest completions, joins) producing a
  typed activity list. Computed/aggregated, NOT a new write-log unless a
  rail is truly missing (justify). V-COMM-3's feeds read this.

## Steps

1. MIGRATION if needed: profile_visibility (per-user, per-section flags,
   default private) + anything the activity read cannot derive. Prefer
   deriving; add storage only with justification. CHECK prod for next
   free number. STOP, owner runs. (If nothing is needed, say so and skip:
   do not invent a migration.)
2. The identity resolver + activity model (the shared plumbing), unit
   tested on real fixtures. Commit.
3. THE PROFILE PAGE per the prototype: header (name, avatar, join, the
   cross-space role/badge chips), the stat band (XP, pages, essays,
   cards, avg quiz score: each real, each min-gated at zero, each an
   opt-in public toggle), the showcase shelf (from the binder shelf
   already shipped), recent activity (from the activity model). Own view
   shows everything + the per-section toggles; other viewers see only
   opted-in sections. Commit.
3b. THE PRIVACY CONTROLS: per-section public/private toggles, all default
   OFF, one clear settings surface; proven that a fresh profile is blank
   to strangers. Commit.
4. CROSS-LINKS: essays/wiki/discussion bylines now link to the profile
   via the resolver; the profile links back to each contribution. The
   card shelf's existing opt-in feeds the showcase. Commit.
5. STOP: owner review. Matrix: own view (all sections + toggles), a
   stranger's view of the same profile (only opted-in), a brand-new
   empty profile (honest min-gates), a rich profile, mobile. 3
   breakpoints x light/dark.
6. Closing sweep after approval: dual-skill audit, a11y, privacy probe
   (stranger sees only opted-in, default-private proven per section),
   SEO (profile indexable only for opted-in public content; private =
   noindex), account-deletion cleanup covers any new table, gate suites,
   Play triple-proof, full build, em-dash grep, check:routes. Commit.

## Verify

- [ ] Fresh profile is blank to strangers; every section default private
      (probe per section)
- [ ] Every stat is a real live count; zeros honest or min-gated; no
      fabricated numbers anywhere
- [ ] Identity resolver is the single byline source (grep: no ad-hoc
      name rendering left); block state + system display honored
- [ ] Activity model derives from existing data (no redundant write-log
      unless justified)
- [ ] Toggles persist, default OFF, survive reload; stranger view
      respects them live
- [ ] Deletion cleanup covers new storage; Play triple-proof; suites
      green; tsc/build/routes green; zero em dashes; no new deps;
      migration budget respected

/caveman report per step; step 5 is the owner gate. Build the shared
plumbing general: V-COMM-3 depends on it.
