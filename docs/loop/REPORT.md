# REPORT - W4b PART 1 closed properly. PART 2 (W8) not started.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0** ·
`check:indexability` -> **0**.

Commit: `0f5ef7d`. Proofs: `docs/proofs/w8-answer-first/part1-theme-circle.txt`.

**PART 1 only. W8 was not started.**

---

## PART 1: the flag was right, but not for the reason I gave

**The floating circle is not ours.** Zero theme toggles and zero fixed-position elements
render in the embed DOM. The circle in my screenshot was the **Next dev-mode indicator**,
which does not exist in a production build. I flagged it twice as site furniture; it was
never our element, and gating it would have been a fix for nothing.

**But there was a real defect underneath it, and it was mine.** My item-1 fix passed the
chrome to a client component as a prop. It rendered nothing, but React **serialised the
whole chrome tree into the RSC payload**, so a partner's iframe still downloaded a nav it
would never show. Measured on a production build, the embed HTML carried a `theme-toggle`
reference. Unrendered is not absent, and you asked for absent.

### The fix

The decision moved to the **server**. Middleware forwards the pathname as `x-pathname`;
the root layout reads it and never builds the chrome tree for `/embed/*`. A missing
header falls back to rendering the chrome, which is the safe default for the site. The
client component is deleted.

```
PRODUCTION BUILD, served HTML:
  /embed/q/<slug>   theme-toggle 0   mobile-tab 0
  /q/<slug>         theme-toggle 2   mobile-tab 0
  /quizzes          theme-toggle 2   mobile-tab 1
  /                 theme-toggle 2   mobile-tab 1
```

Zero on the embed, unchanged on every normal page. W4 is closed.

## PART 2 (W8 answer-first): not started

I did not begin it. It is the larger half of this mission and it deserves a run where I
can do 2a, 2b and 2c together with the per-group proofs you asked for, including the
missing-value case, rather than a partial block landed without them.

Nothing about it is blocked: the data it needs (member count via the name-all game,
debut, fandom name, quiz count, generation) all exists, and the group with no generation
is already handled correctly elsewhere in the code.

## Deviations and flags (loud)

1. **I reported the circle as a real defect twice.** It was a dev artifact. The lesson is
   the same one from last run, in reverse: I trusted a screenshot over a DOM probe. The
   probe said zero fixed elements and I should have believed it the first time.
2. **The middleware now sets a header on every request.** It is one `Headers` copy on the
   passthrough path, but it is a change to the file that 301s unknown routes, so it is
   worth naming explicitly rather than burying.
3. `check:metadata-dupes` was not re-run. Nothing in this change touches a title or a
   description, and W8 (which would) was not started.

## Covenant

No invented number, no synthetic value, nothing approximated. This change only removes
markup.

## Next

W8 in full: the answer-first block, question headings and the fan-out chunks, with the
missing-value proof.

---

STOP (checkpoint). **Nothing was pushed.** report pret.
