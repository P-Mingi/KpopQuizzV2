# Workstream P - Personality quizzes: "Which {group} member are you?"

## Claude Code Implementation Prompt

---

New content type: personality quizzes, the highest-virality K-pop quiz format (S2
analysis). Owner-approved UX (result screen validated as prototype; UI follows the
site's existing tokens/components - your job, not the prototype's). Zero AI at
runtime: hand-authored question bank + weighted-axis engine.

Hard rules: NO em dashes. Real data only (result counts, breakdowns = real). Commit
per step, do NOT push. Routes -> allowlist. Dual-skill on UI. Migrations ->
stop-and-wait for owner. Curation source: docs/p-question-archetype-bank.md
(owner-curated; if still marked DRAFT at build time, STOP and ask).

## The engine (6-axis weighted match)

- 6 axes, each 0-100: energy (quiet->loud), chaos (calm->feral), care (cares for
  others->gets cared for), craft (stage performer->behind-scenes creator), heart
  (soft->tough-love), spotlight (center->lowkey).
- Each member of a group has an axis profile (from the bank; anchored on official
  positions + fan-consensus traits, MBTI soft input only - NEVER claim MBTI).
- 10 shared questions, 4 options each; each option adds weighted points on 1-3 axes
  (weights in the bank).
- Player vector = sum of picks, normalized 0-100 per axis. Result = nearest member
  by Euclidean distance; match % = 100 - normalized distance (floor 55% so no
  insulting "12% match" - cosmetic floor, breakdown still ordered by true distance).
- 2nd/3rd places shown with real relative %s. Deterministic: same answers = same
  result.
- Result explanation: each member profile carries 3 hand-written trait lines (the
  bank); the card shows them.

## Schema (migration, next free number - CHECK prod)

- `personality_questions` (id, ord, question, options jsonb [{text, weights:{axis:pts}}])
- `personality_profiles` (group_id, member_name, photo_url, axes jsonb, trait_lines
  text[], active bool) - seeded for the top-15 groups from the bank
- `personality_results` (id, group_id, member_name, user_id nullable, created_at)
  - one row per completed run (anon allowed, no PII beyond optional user_id);
  powers "3,412 fans got Felix" real counts + monthly windows. Index (group_id,
  member_name, created_at).
- RLS: questions/profiles public read; results insert-anyone (rate-limit at API),
  read aggregated only via a counts RPC (no row-level browsing of who-got-what
  for other users).

## Pages + flow

- `/which-{group-slug}-member-are-you` programmatic per active group (top-15 at
  launch): intro (group-colored, member faces row, "10 questions, 1 result") ->
  question flow (one per screen, progress bar, site quiz-player visual language) ->
  result.
- Result: the validated UX - big member card (photo, YOU GOT {NAME}, match %, 3
  trait lines, group colors), share button (native share + OG image of the result
  card - photos allowed per owner decision), full breakdown %s, real "N fans got
  {member} this month" (min-gated 20), CTA loop: group knowledge quiz + next
  group's personality quiz + ResultLoop-style footer consistency.
- Result permalink: /which-...-are-you/r/{member-slug}?p=87 style shareable URL
  rendering that member's card + "Find out yours" CTA (the BuzzFeed loop). OG image
  per member. No per-run storage needed for the permalink (member + % in URL,
  clamped/validated).
- SEO: these pages target "which {group} member are you" head terms. Full metadata,
  Quiz/FAQ-free (no fake schema), sitemap, internal links from group pages + games
  hub + articles. Static/ISR everything; the run itself is client-state.
- Analytics: existing events only - game_start/game_complete with type
  'personality' (widen the union), share_click 'personality'.
- i18n: en at launch; strings dictionary-ready for pt later.

## Owner decisions locked (Jul 2026)

- ALL 15 groups launch at once (programmatic; no drip).
- GOTD ROTATION: personality quizzes join the Game-of-the-Day rotation pool as
  DISCOVERY dailies ("Today: which IVE member are you?"). Streak credit via the
  normal completeDaily('game') path. NO leaderboard attached. If the rotated group
  was already played by the viewer, the card shows their saved result + "retake or
  try {next group}".
- PASSPORT TIE-IN: signed-in results save; the user's latest member match renders
  as an optional flair line on the passport meta ("Felix-coded", toggleable in
  settings, off by default). Extends personality_results with the user link that
  already exists; passport read = same profile fetch, no new hot query.
- RETAKE + COUNT HONESTY: retakes free; personality_results logs max ONE row per
  user per group per UTC day (anon: one per device per day via localStorage guard +
  API rate limit). "N fans got X" counts stay honest.
- BREAKDOWN UI: top 5 + "see all" expander (SEVENTEEN's 13 = the stress test).
- HOME: one launch-week banner only; afterwards home presence comes solely from the
  GOTD rotation. Games hub gets the permanent section (group tiles with member-face
  strips); group pages get a "Which {group} member are you?" card.

## Steps
1. Migration written -> OWNER RUNS -> verify. Commit.
2. Seed questions + top-15 profiles from the curated bank -> second migration or
   seed script -> OWNER RUNS. Verify counts. Commit.
3. Engine lib (pure, unit-tested with 3 hand-computed fixtures) + question flow UI.
   Commit.
4. Result screen + share + permalinks + OG images + retake/count guards. Commit.
5. Programmatic pages + SEO wiring + games hub section + group page cards + launch
   banner. Commit.
6. GOTD rotation integration + passport flair tie-in + settings toggle. Commit.
7. Consistency pass: 430px+desktop, dark/light, anon flow, real-count gating,
   13-member breakdown, check:routes, tsc, build, zero em dashes. Commit.

/caveman report per step. Engine fixtures must show the math.
