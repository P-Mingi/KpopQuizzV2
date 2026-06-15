# KpopQuiz — project rules for Claude

## Writing & copy rules (STRICT)

**NEVER use an em dash (—, U+2014). Ever.** This applies everywhere: UI copy,
page `<title>`s, meta descriptions, `alt`/`aria-label` text, generated quiz
intros, code comments, commit messages, and PR descriptions.

Use plain punctuation instead:

| Em dash was used for… | Use instead |
|---|---|
| A sentence break / aside ("X — Y") | A period (`X. Y`), comma (`X, Y`), or colon (`X: Y`) |
| A label separator ("Title — 8 questions") | A middot (`Title · 8 questions`) or a regular hyphen (`Title - 8 questions`) |
| A range ("0:30 — 5:00") | A regular hyphen (`0:30-5:00`) |

Also avoid the **en dash** (–, U+2013) for the same reason — use a regular
hyphen `-`. (Regular hyphen-minus `-` and the middot `·` are both fine and are
already the site's separator style, e.g. "12 quizzes · 4.2k plays".)

**Why:** em dashes read as "AI-written" and clash with the site's plain,
fan-made voice. Existing copy never uses them.

**Before finishing any task,** grep the diff for `—` and `–` and remove them:

```bash
grep -rn $'—\|–' apps/quiz/src   # must return nothing
```
