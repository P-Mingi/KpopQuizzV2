# REPORT - W5 PART 0: the dataset exists, and one headline number reverses under control.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every run. **Read-only: zero writes, zero DDL, and zero files under `apps/` changed**
(`git status --porcelain apps/` = 0). Nothing pushed.

Output: `docs/data/w5-dataset.md`. Raw output and the scripts: `docs/proofs/w5-part0/`.

---

## The three things you need to know before writing

**1. Girl groups vs boy groups reverses when you control for difficulty.** This is the
finding that would have shipped backwards.

    pooled          gg 66.5%   bg 67.7%   gap -1.2 pt  (girl groups LOWER)
    easy quizzes    gg 84.1%   bg 77.1%   gap +7.0 pt
    medium quizzes  gg 65.3%   bg 63.2%   gap +2.2 pt
    standardised    gg 69.5%   bg 66.2%   gap +3.2 pt  (girl groups HIGHER)

Simpson's paradox, and the cause is in the data: 33.7% of boy-group plays are on `easy`
quizzes versus 6.0% of girl-group plays. The raw gap is a selection artefact of what we
happened to write, exactly the case your plan says must not ship. Both cuts are in the
file with their denominators.

**2. There is a regime change in the middle of the window, and every pooled figure
straddles it.**

    Mar + Apr : 41,982 usable plays, pooled 63.2%   (70.7% of all usable plays)
    May - Aug : 17,425 usable plays, pooled 75.9%
    break     : 12.7 points, between April and May, not gradual

Every percentage in the file mixes those two periods weighted 70.7 / 29.3 toward the
low-scoring one. I did not investigate the cause: read-only mission. If the report quotes
a single site-wide average, this is the first thing a careful reader breaks it on.

**3. The question-level section is NOT ANSWERABLE, and it is the section your plan calls
the most quotable.** The schema stores only a total score per play. `per_question_times` is
the only per-question column, it holds timings not correctness, **and it is null on all
59,513 rows**. No `play_answers`, `quiz_questions` or `question_stats` table exists. It
cannot be approximated from quiz-level data without inventing it, so structure section 4
of the report around the hardest QUIZZES, which are real, or accept a schema change and new
writes as its own mission.

## What is in the file

A scope, B per group (27 above floor, 10 below), B2 by plays, B3 the correlation, C1 per
quiz (227 of 400 above floor), C2 the not-answerable note, D gender both raw and
controlled, E generations, F duels as colour only, G seven things you did not ask for.
Every table states its denominator and its window; every number carries its query.

**Floors, set before any result was looked at:** 100 usable plays per group, 50 per quiz,
100 votes per matchup. Below-floor rows are listed separately and never ranked.

**The score definition is pooled** (`SUM(score)/SUM(total_questions)`). Checked against the
alternative for every group: they agree within 1 point on 26 of 27, the exception being
enhypen at 4.7 points.

## Things in the data that will bite the report if nobody says them

- **`general-kpop` is the single largest row, 15,464 plays, and it is not a group.** It is
  a catch-all bucket (`groups.id=30, name="General K-pop"`). It tops the by-plays ranking.
  Excluding it changes the play-count story, not the score spread.
- **106 plays record a score higher than the number of questions** and are excluded from
  everything. 0.18% of rows. Cause not investigated.
- **Anonymous plays score 6.4 points higher than signed-in ones** (69.8% vs 63.4%),
  uncontrolled for which quizzes each played.
- **The difficulty labels are not a difficulty scale.** `hard` scores 0.2 points BELOW
  `medium`, on only 451 plays. The labels are author-assigned.
- **The duel lists are each dominated by one prompt.** 8 of the 10 most lopsided come from
  "Best of the 3rd generation"; 6 of the 10 most contested from "Who is your BTS bias?".
- **Gender is derived, not stored.** `groups` has no gender column. It comes from
  `songs.gender`, which resolves to exactly one value for all 81 groups that have songs.
  Flagged in the file as an inference.
- The duel panel is **891 voters, 60,364 votes** now, up from the plan's 59,508 / ~870.

## Two repo findings, because they affect whether you can read this at all

1. **`docs/data/` was gitignored.** `.gitignore` line 68 is `docs/*` with an explicit
   allowlist, and `docs/data/` was not on it, so the mission's own required output could
   not have been committed. I added `!docs/data/`. That is the only non-doc change in this
   commit.
2. **`docs/PLAY-W5-REPORT-PLAN.md` is itself untracked and ignored** by the same rule. The
   mission says to read it first and it exists only on this machine, so it is one disk
   failure from gone and Cowork cannot read it from git. I did **not** add it: keeping
   strategy docs out of the repo may be deliberate. One line if you want it.

## Deviations and flags (loud)

1. **I wrote three numbers in prose that the raw file did not support and corrected them.**
   G3 said "63.3% / 76.1% / 13.4 pt break" from reading the month table; computed directly
   it is **63.2% / 75.9% / 12.7 pt**. Your standing rule caught this exact failure last
   mission, so I recomputed rather than eyeballed and the file now carries the measured
   values.
2. **Two different play counts appear in section D** (17,725 / 25,697 versus 17,805 /
   24,580). They are different cuts, groups-above-floor versus published-quiz plays, not a
   discrepancy. Each table now says which it uses rather than leaving a reader to notice.
3. **I stated a correlation excluding general-kpop before computing it.** Written as "see
   raw output" when no such output existed. Computed: r = -0.254 against -0.242 for all 27.
4. **Verse and the ledger.** `docs/VERSE-LEDGER.md` already contained a new entry (L-197)
   that is not mine. I appended L-198 after it and did not touch it.

## Covenant

Every figure is counted from `plays` directly at read time. The denormalised counters
(`quizzes.play_count`, `groups.total_plays`) were deliberately not used and not compared.
No number is rounded to flatter, no below-floor row is ranked, and the one question that
cannot be answered says so instead of being approximated.

## Next

The dataset is ready to write from. The three things above decide the report's structure
more than any single number in it.

---

STOP. **Nothing was pushed.** report pret.
