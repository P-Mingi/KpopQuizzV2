# LOOP follow-ups: allowlist guard + button contrast

Two small, independent tasks. NO em dashes. Git commit only after each, do NOT push.

---

## Task 1 - Middleware allowlist guard (kill the recurring 301 bug)

A public page has been silently 301'd to home 5 times because it wasn't in the middleware
`needsAuth()` allowlist. Build a guard so this class of bug fails loudly at build/test time
instead of shipping to prod.

**File:** `apps/quiz/src/middleware.ts` - read `needsAuth()` and the public-path list first.

Build a test (or a `scripts/` check wired into the build) that:
1. Enumerates every top-level route under `apps/quiz/src/app` that renders a page
   (has a `page.tsx`), excluding auth-gated groups (e.g. `/me`, `/admin`, anything intended
   private) and dynamic API routes.
2. For each public page route, asserts it is reachable through the middleware allowlist logic
   (i.e. `needsAuth(path)` returns false for it). Import the real `needsAuth` / public-path
   predicate from the middleware module and run the paths through it - do NOT re-implement the
   matching logic in the test (that would let the two drift).
3. Fails with a clear message naming the offending route(s): e.g.
   `"/daily renders a page but is not in the middleware public allowlist - it will 301 to home."`

Maintain a small explicit `PRIVATE_ROUTES` set in the test for the genuinely auth-required
pages, so the guard knows the difference between "should be public but forgotten" and
"intentionally private."

Prefer a lightweight unit test (Vitest/Jest, whatever the repo uses) over a full e2e - it must
run in CI cheaply. If the repo has no test runner wired for this, a `node` script invoked in
the build step is acceptable, but a unit test is preferred.

Also add the missing route(s) found right now to the allowlist if any beyond `/daily` exist.

**Verify:** the guard passes on current main after `/daily` is allowlisted; temporarily remove
`/daily` from the allowlist and confirm the guard FAILS naming `/daily`; restore. Commit.

---

## Task 2 - Fix btn-primary contrast site-wide (WCAG AA)

`btn-primary` is white text on brand pink `#E8457A` = ~3.7:1, under the 4.5:1 AA floor. Fix
everywhere, including the quiz result screen (the freeze is lifted for THIS token only - it is
an accessibility fix, not a redesign).

- Darken the primary-button pink until white text hits >= 4.5:1. Starting point: about
  `#D13A6E` measures ~4.6:1 white-on-fill. Tune to keep it clearly in the brand family (do not
  shift hue toward red/purple); land at >= 4.5:1 with the smallest change that passes.
- Apply via the existing color token/variable that `btn-primary` uses, so it propagates
  everywhere in ONE place. Do not hand-edit individual buttons.
- Keep the hover/active states in the same family and also >= 4.5:1 (hover is usually darker, so
  it should pass automatically - verify).
- This is the ONE sanctioned change to the quiz result screen. No other quiz-result edits.

**Verify:** measure white-on-fill contrast for default + hover >= 4.5:1 (state the numbers in
the report). Screenshot the primary button on: quiz result, blindtest result, a ResultLoop
footer, home hero CTA, create page. Light + dark both. Confirm no unintended color changes to
non-primary buttons. tsc clean, build green, zero em dashes. Commit.

---

/caveman report each: what changed, the guard failing + passing demo, the measured contrast
numbers before/after.
