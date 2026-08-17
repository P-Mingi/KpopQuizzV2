# Workstream Q - creation overhaul BUILD spec (final)

## Claude Code Implementation Prompt

---

Build the creation overhaul per the audit (docs/workstream-q-report.md - it is the
source of truth; re-read it fully, especially section 9's 15-item "prototype forgot
this" list: every item there must survive this build). Target flow = the owner-approved
3 steps (set up -> list editor -> share-hero publish).

Hard rules: NO AI features anywhere (owner decision, final). NO em dashes. Real data
only in any copy. Anonymous-first + draft-survives-OAuth + inline username claim +
image security pipeline: PRESERVED EXACTLY. Commit per step, do NOT push. Routes ->
allowlist. Dual-skill /ui-ux-pro-max + /frontend-design on the funnel UI steps.

Owner decisions locked:
- Badge nudge = CONTEXT-PICKED, always real: pre-10-quizzes show quiz-count countdown
  ("3 more quizzes to Prolific Creator"); after that show plays-received progress
  ("412/1,000 plays to Creator: Silver"). Numbers from the real badge tables/RPCs
  (104_badge_awards.sql thresholds). Never a fabricated progress claim.
- Cover nudge copy = identity framing: "A cover makes your quiz yours - it is the
  first thing fans see." (rendered with a middot or comma, NO dash). No stat claims.

## Build order (from the audit's recommendation; commit each)

### Q-B1 - Quick wins (ship value first, no structural change)
- Title mandatory (validation + UI), per audit findings.
- Kill hardcoded difficulty: creator-selectable Easy/Medium/Hard, wired through
  create + edit + the create_quiz_bypass path as needed.
- Group picker: searchable list over existing groups (search input, keyboard nav,
  mobile-friendly) + "add a new group" UI wired to the EXISTING custom-group API path
  (audit confirmed it works, has no UI). Paginate/lazy the groups fetch.
- Cover nudge with the locked identity copy.

### Q-B2 - Language
- Two migrations per the audit (next free numbers - CHECK prod, head was 115+):
  quizzes.language (default 'en', backfill existing to 'en') + the RE-ISSUED
  create_quiz_bypass with the fixed INSERT column list (the audit's easy-to-miss
  item - do not miss it). OWNER RUNS both on prod dashboard; stop and wait.
- Funnel: language picker in step 1 (default from browser locale; list: en, ko, tr,
  pt, es, id, ja, fr, de + "other"). Stored on publish.
- Display: language chip on quiz cards (only when != 'en'), filter in /quizzes
  browse (only shows languages that exist, real counts).
- The known Turkish quiz: set its language correctly in the backfill if identifiable.

### Q-B3 - The list editor (converge, do not duplicate)
- Extend the EXISTING 5-type quiz-editor.tsx (audit finding 3) with: drag-to-reorder,
  per-row duplicate, inline validity badges (no correct answer, duplicate options,
  correct==distractor, empty fields). Respect the per-type field polymorphism the
  audit mapped - the editor must not corner the future type unlock.
- Make CREATE use this editor as step 2 (list view replaces one-at-a-time dots);
  EDIT mode keeps using it (one component, two modes - create seeds empty, edit
  seeds from the quiz).
- Draft compatibility: migrate/adapt the localStorage draft shape safely (audit risk
  map) - an in-flight old-format draft must not be lost; convert on load.
- Extract validateQuestions into shared lib/quiz-validation.ts (audit P-11), used by
  both API routes + the editor's inline badges (one source of truth).

### Q-B4 - Share-hero publish step
- Step 3 summary card: title, group, count, difficulty, language chip.
- Publish -> the share step becomes the hero: share buttons prominent (existing
  share infra + tracked short-links), framing copy "quizzes that get shared get
  played" (true by construction), the context-picked badge nudge (locked decision
  above), and the existing celebrate mascot.
- Post-publish wiring untouched: IndexNow ping, follower fan-out, XP + first-time
  bonus (audit section: keep list).

### Q-B5 - Consistency + risk sweep
- The audit's risk map, item by item: old drafts, deep links, /create-preview route,
  analytics events (existing names only - game_start/complete don't apply; keep
  whatever create events exist), pt locale page parity for new strings.
- Verify EDIT parity: owner edits a published quiz through the same editor, PUT path
  works, validation identical.
- Mobile 430px + desktop, dark/light, tsc, build, check:routes, zero em dashes.
- Screenshot the full create journey (3 steps) + an edit session + a Turkish-language
  quiz card chip in browse.

## Verification (beyond per-step)
- [ ] Section 9's 15 forgot-items: each one explicitly confirmed preserved (list them
      in the final report with status)
- [ ] Anonymous full journey: build 3-question quiz -> OAuth -> draft survives ->
      publish -> claim -> share step
- [ ] Old-format draft converts, none lost
- [ ] Badge nudge shows real numbers in both regimes (test an account < 10 quizzes and
      one >= 10 if available; else force via harness and say so)
- [ ] Language filter shows only real languages with real counts
- [ ] No AI anything, no em dashes, no new npm dependency

/caveman report per step. Migrations = stop-and-wait for owner, everything else
straight through.
