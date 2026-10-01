# Completeness audit (owner request, 2026-09-27: "verify that v11 is totally finished")

Two read-only auditors, X1 (scope) and X2 (strict visual). Neither edits app code, commits or pushes: you write your findings under the session scratchpad folder ORCH gives you and send ORCH a gap list. Start by invoking the Skill tool with skill `verse-laws`, then read `v11/briefs/CHECKERS.md` (its run rules bind you: no production writes, guardWrites, never load /me or /profile signed in, signed in only through the setup project, no push, no secrets).

Implementation under test: the LOCAL preview on http://localhost:3021 (flag on, integration head + P2's /quizzes, not published). Never start or stop a server on 3021. Reference: `docs/design/ux-dashboard-v1/prototype.html` (THE reference), `DESIGN-SPEC.md` (17 wins over 16, 16 over 1 to 15), `WIRING-MAP.md` (+ `.verified.md`), `v11/WORKER-PROMPT-V11-MULTIAGENT.md` sections 2, 6 and 8, the reference PNGs in the main checkout `v11/checks/reference/`, and what the run already proved: `v11/RUN-STATE.md`, `v11/checks/pixel/README.md`, `v11/checks/backend/README.md`, `v11/reports/*.md`. Do not re-prove what a checker already proved with evidence; look for what nobody checked.

## X1: scope completeness
1. Enumerate EVERY view and interactive state the prototype offers, not only the 38 capture states: every `go('...')` target, every popover (`pop(...)`), sheet and dialog (`open...`), tab (`ptab`, `utabs`...), game mode and variant (`startQuiz(...)`, `btStart(...)`), menu (avatar menu, playlist menu...), guest vs signed-in variants, empty and error states, and every control inside them. For each: the implementation's route or component, and verdict IMPLEMENTED / MISSING / PARTIAL / DEFERRED (only if RUN-STATE names the migration or owner decision that defers it).
2. Walk the worker prompt section 2 scope table and section 6 backend list, item by item, per agent: done, partial or missing, with the file that implements it.
3. Walk DESIGN-SPEC 17.1 to 17.11 bullet by bullet: implemented or not (with where).
4. Walk section 8 (definition of done) and say which lines are met, which are open and why.
Output: `x1-scope.md` (tables) and a gap list: id X1-nnn, owner agent, severity (blocker / should / nit), what is missing, where the prototype shows it.

## X2: strict visual pass
For each of the 38 capture states, at 1440 light and 390 dark (and the other two combos for any state that shows a difference): drive the preview to the same state (reuse `apps/quiz/e2e/ux-v1/p*.spec.ts` drivers and C1's approach in `v11/checks/pixel/`), screenshot, and compare side by side with the reference, looking at EVERYTHING a person would notice: missing or extra elements, order, icons, copy, typography, colours, spacing, alignment, borders, radii, shadows, image crops, empty areas. Real data may change text and photos: that is not a difference; a different layout, component, icon or style is. Also compare the quizzes state in detail (it was never checked: P2 was unpublished).
Output: `x2-visual.md` with, per state, the side-by-side image path and a list of concrete differences (element, expected, actual, owner agent, severity), and a gap list with ids X2-nnn.

Final answer to ORCH: 25 lines max: counts by severity per owner, the blockers one line each, where the files are.
