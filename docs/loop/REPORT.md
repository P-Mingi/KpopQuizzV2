# REPORT - W8 answer-first shipped on the group quiz and trivia pages.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched. PART 1 was already closed and was not reopened.

Gates: `npx tsc --noEmit` -> **0** - `npm run build` -> **0** - `check:routes` -> **0** -
`check:indexability` -> **0** - `check:metadata-dupes` **unchanged** (see below).

Commit: `78810a4`. Proofs: `docs/proofs/w8-answer-first/answer-first.txt`.

---

## What renders (TWICE, production build)

**Lead, 47 words, inside the 40-60 window:**

> TWICE is a K-pop group with 9 members. Their fandom is called ONCE. TWICE belongs to
> the 3rd Gen of K-pop. The group is from South Korea. On kpopquiz.org you can play 14
> free fan-made TWICE quizzes. 18 of their songs are playable in the blind test.

**Six chunks**, each headed by the literal question a fan types: how many members, what
the fandom is called, what generation, where they are from, what label, how many songs
in the blind test. Each answer repeats the group name, so a chunk lifted alone still
says what it is about.

The proof file lists every value beside the SQL that produces it. **TWICE has no
`inception_date`, so the page shows no debut sentence and no debut question** rather
than guessing a year.

Both pages use the same module, so `/twice-quiz` and `/twice-trivia` cannot drift into
different answers for the same group.

## Two things only rendering it could have found

1. **`fandom_name` is the literal string "fan" on 7 groups.** A placeholder someone
   typed, not a fandom. The page was publishing "Their fandom is called fan": a real
   value rendered as a non-answer. Those are now treated as absent. Known placeholders
   only; a real name is never rewritten or guessed.
2. **The min-gate was too loose.** With no chunks the lead degraded to "Cortis is a
   K-pop group. On kpopquiz.org you can play 5 quizzes", which answers nothing and
   repeats the intro already on the page. The block is now withheld entirely unless at
   least one real fact exists, so Cortis renders nothing rather than a 15-word
   non-answer.

## The gate that mattered here

`check:metadata-dupes` is **unchanged**: FAILED with the same 8 collision groups before
and after (1 duplicate-quiz title pair, the open BLOCKED.md item, plus 7 pre-existing
`/verse` groups), 0 non-verse skips, no new collision. Enriching bodies did not touch a
single title or description.

## Deviations and flags (loud)

1. **My first covenant grep was a false clean.** It ran through `git diff`, which never
   saw the new files because they were untracked. Redone against the files themselves,
   which is where the two `around` / `approximately` hits turned out to be one comment
   stating the rule. Worth carrying: a diff-based grep proves nothing about new files.
2. **Sparse groups get less, by design.** Of 37 groups with quizzes, `inception_date`
   covers 17, `origin_country` 20, `record_label` 20, `generation` 30. Those pages show
   fewer chunks, and 7 with a placeholder fandom and no members show no block at all.
   That is the honest outcome, not a bug, but it does mean the lever lands hardest on
   the groups that already have data.
3. **The 40-60 word window is met where data allows.** TWICE lands at 47. A sparse group
   would fall short, which is why the block is withheld instead of padded.

## Covenant

Every rendered value is a DB column or a live count. No hedging words, no estimates, no
invented numbers, and the 7 groups with no generation are not guessed at.

## Next

Nothing outstanding on W8. The remaining open items across the arc are the duplicate
SEVENTEEN quiz (BLOCKED.md, yours) and the partner log (BLOCKED.md, agreed to defer).

---

STOP. **Nothing was pushed.** report pret.
