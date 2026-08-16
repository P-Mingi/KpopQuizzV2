# REPORT - W7b: the A-Z group directory, and an orphan gate that immediately found more.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL. Nothing pushed. Verse untouched. No existing page's metadata edited, so W1's July
control set stays inside its window to 2026-08-24.

Gates: `tsc` **0** - `build` **0** - `check:routes` **0** - `check:indexability` **0**
(against a RUNNING server this time) - `check:metadata-dupes` **unchanged** (still exactly
8 collision groups, 0 non-verse skips, `/groups` in none of them).

Proofs: `docs/proofs/w7b-directory/` (PROOFS.md + 5 raw logs).

---

## You were right and my recommendation was wrong

I proposed curating `RELATED_GROUPS` for the 11 orphans. That treats instances. The cause
is that the only global surfaces listing groups are capped, rail `slice(0, 10)` and pills
`slice(0, 13)`, against 37 groups, so 27 groups depended on hand curation and group 38
would have been born an orphan too. Structure, not curation. Built as specified.

## PART 1 - /groups

37 of 37 groups with a published quiz, **each linked exactly once** (37 link instances for
37 hubs), 0 missing, 0 extra, verified against the SQL that lists them.

**The count column would have lied.** `groups.quiz_count` is denormalised and counts
unpublished rows; it is wrong on 4 of 37. The directory computes from published rows
instead, so it shows bts **27** not 30, blackpink **22** not 27, stray-kids **26** not 27,
artms **4** not 5. A directory advertising "30 quizzes" over a list of 27 is the exact
failure the covenant exists to stop.

Generation is a tag per row, shown only where recorded: 2 x 2nd, 12 x 3rd, 12 x 4th,
4 x 5th, and **7 groups show no tag at all** rather than a guessed one.

**One judgement call, flagged:** the mission said "A-Z, and by generation" and also "each
linked once". A separate generation section would have meant a second link to all 37 hubs
on the same page. Same-page duplicate links add no destination and only the first anchor
counts, so I made generation a per-row tag plus a summary line and kept the A-Z list as
the single set of links. If you want a real second section, say so and I will add it.

## PART 2 - irrigated

Both capped surfaces now point at the directory with a descriptive anchor,
"All K-pop groups", instead of at `/quizzes`. Verified in the served home page HTML.

## PART 3 - the gate, and what it caught on its first run

RED before (71 orphans, 7 group hubs among them) -> after: **64, and zero group hubs**.
The delta is exactly the class the directory closed. Proven GREEN on that class, and
proven still able to FAIL on it via an injected orphan, so the pass is not the scope
hiding a failure. Inbound links are always counted from the full crawl; scope only
narrows what is asserted. Every run prints the sample size and says in words that a
sampled result is a floor on inbound links, not a proof of zero. Offenders are always
listed by URL.

**The gate is RED unscoped, on 64 real orphans, and that is the finding.** Two classes I
did not scope, written up in BLOCKED.md as `w7b-orphans`:

1. **53 blindtest playlists.** Cause confirmed, not guessed: `/blindtest` serves 45 links
   and **zero** of them point at any `/blindtest/` playlist. The index does not link its
   own children in HTML at all. Same shape as the group-hub bug, and bigger.
2. **5 name-all playlists**, siblings linked, these five not. Plus 6 landing pages
   (/trending, /new, /most-liked, /kpop-quiz-2026, /guess-the-kpop-idol, /data/pulse/2026-07).

I did not fix them: outside the stated scope, and the blindtest one is a design change to
an index page, not a mechanical edit. Recommendation in BLOCKED.md.

## Deviations and flags (loud)

1. **I reported "0 offenders, group-hub class closed" off a command that never ran.** The
   shell cwd had reset to the repo root, so `npm run check:orphans` printed "Missing
   script" and my grep counted zero `x` lines in an npm error. Caught and re-run from the
   right directory; the real answer was 64. This is the second time a cwd reset has nearly
   turned into a false green, and the tell both times was a summary line missing from
   output I did not read before summarising it.
2. **`--surface-2` does not exist in this codebase.** I used it for the jump bar and the
   generation tags, which would have rendered transparent. Found because a variable sweep
   said MISSING, and the first sweep was itself broken by a zsh glob so its MISSING
   verdicts were meaningless. Real token is `--surface-alt`. Fixed and re-verified in a
   headed browser, light and dark.
3. **A count-verification harness reported 37/37 mismatches and the page was fine.**
   React emits `<!-- -->` between adjacent text nodes, so stripping tags leaves "27" and
   "quizzes" two spaces apart and my single-space regex matched nothing. Harness bug.
   Worth carrying: collapse whitespace before matching rendered React text.
4. **The scope flag is a ratchet and could be abused as an excuse.** It is documented as
   "the unscoped run is the truth, the scope must only ever shrink". I would rather ship a
   gate that can block on the class we fixed than a permanently red one everybody ignores.

## Covenant

Every number on the directory is computed from published rows at render time. No floors,
no rounding, no filler for sparse groups, and no group placed in a generation we do not
have recorded.

## Next

`w7b-orphans` in BLOCKED.md is the live decision: fix the two index-page classes and the
gate can go green unscoped and become blocking. Still open: the duplicate SEVENTEEN quiz
and the partner log.

---

STOP. **Nothing was pushed.** report pret.
