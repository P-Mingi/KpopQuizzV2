# Workstream Q - creation overhaul: AUDIT + comparison report (no build yet)

## Claude Code Prompt

---

REPORT ONLY. No code changes, no commits except the report file itself. Output:
`docs/workstream-q-report.md`. /caveman the summary back.

Context: we are redesigning quiz creation around an owner-approved target flow
(below). Before spec'ing the build, audit the CURRENT funnel exhaustively and map
every existing feature against the target, so the final spec loses nothing.

## The owner-approved target flow (3 steps)

NO AI ANYWHERE. No AI question generation, no AI answer suggestions. Owner decision,
final: creators write every question themselves; the overhaul is pure UX.

**Step 1 - Set up:**
- Title: MANDATORY (currently optional-ish? verify), max length as today.
- Group: searchable picker over the EXISTING groups list (search bar in the feed,
  not a chip wall) + "add a new group" option (the API path exists per the Notion
  audit - verify what it supports).
- Language: NEW - the language the quiz is written in. Picker, default from browser
  locale. Stored on the quiz, displayed as a chip on quiz cards, filterable in
  /quizzes browse.
- Cover/header image: keep optional BUT visibly RECOMMENDED ("quizzes with a cover
  get more plays" nudge - check if we have real data to back that line; if yes cite
  it, if no use softer copy).
- Difficulty: creator-selectable (kill the hardcoded medium).
- Question count target (5/10/15/20) as a soft guide, min 3 max 20 as today.

**Step 2 - Review/build (the list editor):**
- Question LIST view: all questions visible, drag-to-reorder, per-row edit/
  duplicate/delete, inline validity badges (missing correct answer, dup options...).
- Tap a row -> inline editor: question text, 4 answers, correct radio, fun fact.
- Add question appends to the list. No more one-at-a-time dot navigation.

**Step 3 - Publish:**
- Summary card: title, group, count, difficulty, language chip.
- Anonymous-first flow + draft-survives-OAuth: PRESERVED EXACTLY (the funnel's best
  part).
- SHARE EMPHASIS: after publish, the share step becomes the hero: "quizzes that get
  shared get played" framing, share buttons prominent (existing share infra),
  creator-badge progress nudge ("1 more quiz to Creator: Silver" - real data from
  the badge system).

## What to audit and report

1. **Current funnel inventory** (create-funnel.tsx + page + APIs): every feature,
   every validation, every limit, the draft system, the auth round-trip, the image
   pipeline, the publish path (create_quiz_bypass RPC), post-publish wiring
   (IndexNow, fan-out, XP). Table: feature -> keep / change / drop in target flow.
2. **The 5 quiz types** (multiple_choice, true_false, guess_from_clues, image,
   intruder): what each needs at creation time, which are creatable today vs
   admin-only, and what the target list editor must support PER TYPE if we unlock
   them later (do not design the unlock now - just map the constraints so the list
   editor does not paint us into a corner).
3. **Owner edit mode** (the Q0-a fix already shipped): how /quiz/[id]/edit works
   now, and what the new flow must do to serve BOTH create and edit from one
   component (the audit said reuse-funnel-in-edit-mode - verify current state).
4. **Language:** schema change needed (quizzes.language), where cards/browse/filters
   need touching, what existing quizzes default to (en? unknown?), how the Turkish
   quizzes already on prod should be handled (owner note: they exist - find them,
   report how many non-English quizzes are live).
5. **Migration needs list** (columns, indexes) - numbered against current prod state.
6. **Risk map:** what breaks if we replace the wizard (drafts in old format,
   deep links, the /create-preview route, analytics events, i18n pt page).
7. **Effort estimate per chunk** + a proposed build order that ships value early
   (e.g. searchable group picker + mandatory title can land before the list editor).

Also verify against the prototype description above: anything in the current funnel
the prototype forgot (rights checkbox, cover moderation queue, username claim,
share step details, pt locale...). List every such item explicitly - the point of
this audit is that the final spec loses NOTHING.

NO em dashes in the report. Real findings only, file:line references.
