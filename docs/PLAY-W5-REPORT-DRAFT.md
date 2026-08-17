# The K-pop Knowledge Report 2026

### Fans know the people. They don't know the catalogue.

**DRAFT v4 — internal.** Two figures in v3 were wrong and are corrected here: the
perfect-score and zero-score shares were computed on all history, including the period this
report excludes, and the catalogue sentence counted 21 groups while quoting a range that
held for 20. Both are now measured on the report's own window. Every figure is traceable to
`docs/data/w5-dataset.md`.

---

## Method, before any finding

This report measures quiz scores. It is not a survey and it contains no opinion data. Every
claim reduces to the same sentence: on this many attempts, the average score was this.

**Window: 1 May 2026 to a snapshot taken on 17 August 2026. 17,425 completed attempts across
76 quizzes.** The snapshot boundary is published to the microsecond in the dataset, because
we found that a boundary rounded to the second reproduces our own headline number one
attempt short. Anyone re-running these figures should use the value in the dataset, and will
then get exactly what is printed here.

We hold a longer history and we are deliberately not using most of it. In March and April
the site took an unusual burst of traffic: 56 accounts produced just over half of that
period's attempts, at a median of 249 attempts each, against a median of six per account
afterwards. Ten of them scored within 2.4 points of each other and finished within four
seconds of the same median time. That is not ordinary use, so it is excluded — at a cost of
70.7% of our raw volume.

Minimum samples were fixed before any result was looked at: 100 attempts per group, 50 per
quiz, 100 votes per matchup. Anything below is named and never ranked. No table here mixes
the two. Everything is computed from individual play records at read time, never from stored
counters.

## The finding: it depends what you ask about

The five hardest quizzes on the site all ask about output or history. Four of the five
easiest ask who is in the group.

**Hardest**

| score | attempts | quiz |
| --- | --- | --- |
| 40.0% | 71 | BLACKPINK world records and achievements |
| 41.5% | 86 | Stray Kids: Guess the Song |
| 41.6% | 781 | Ultimate BTS era quiz — only real ARMYs survive |
| 52.3% | 59 | BTS concerts and tour moments |
| 54.2% | 400 | BLACKPINK ultimate fan challenge |

**Easiest**

| score | attempts | quiz |
| --- | --- | --- |
| 99.4% | 53 | Find the Non-BLACKPINK Member |
| 97.5% | 61 | BTS members real names |
| 97.2% | 96 | SEVENTEEN true or false |
| 96.8% | 101 | How well do you know SKZ members? |
| 96.3% | 378 | K-pop fandom names true or false |

The same fandoms appear on both lists. ARMY sits at 97.5% naming BTS members and 41.6% on
BTS eras — a 56 point drop between two quizzes about the same group, taken by the same
population, weeks apart. Fans have the roster memorised. Ask which album a B-side came from,
or what year a group debuted, and the floor gives way.

Every quiz in the hard list is also about a group with a deep catalogue, and that is not a
coincidence — you cannot write a hard B-sides quiz about a group with one album. Which is
also why we are not turning this into a ranking of fandoms. See below.

Across the window, **6,257 of 17,425 attempts are perfect scores — 35.9%, better than one in
three** — and 109, or 0.6%, score zero. That says as much about the quizzes as about the
players: an identity question is a question most fans get right, and we have written a lot
of them.

## What we cannot say, and why we are telling you

We set out to publish a ranking of fandoms by knowledge. We could not, and the reasons are
more useful than the ranking would have been.

**The ranking is not real.** In raw numbers the biggest fandoms score worst — BTS last,
attempts correlating negatively with score. Adjust for the fact that big fandoms are given
harder quizzes and 41.7% of that relationship disappears. What was left changed sign
depending on which months we looked at, and the two periods ranked the groups in nearly
opposite order. There is no stable ladder in our data.

**Neither is the gender comparison.** Girl-group fandoms appeared to outscore boy-group
fandoms by 5.6 points once we adjusted for difficulty, and the result survived removing any
single group. Then we matched quizzes by format instead — members quizzes against members
quizzes — and the advantage split three formats to three, with the four largest gaps
pointing in opposite directions. A result that reverses depending on whether you look at
photo quizzes or fan-knowledge quizzes is not a result about knowledge.

**Neither is the generation gradient.** Fifth-generation fandoms score highest in our
window, on 12 quizzes across 4 groups, with no history before May to check against. And
second-generation fandoms score higher than all of them — on 85 attempts, below our own
minimum, which is the only reason they are not sitting on top of the chart.

**The root cause is us.** We did not write comparable quizzes. Across the 21 rows compared
here — 20 groups plus a general K-pop bucket that is not a group at all — the share of
attempts on easy quizzes runs from 0% to 92.3%. Published quizzes run from 3 to 27 per
group, with 152 in that general bucket. Two boy groups make it concrete: 70.1% of Stray Kids
attempts are on easy quizzes, against 7.6% for BTS. They are not sitting the same exam, and
any table that ranks them is measuring our editorial history.

**We cannot tell you which questions people miss.** We record a score per attempt, not an
answer per question. The single most interesting thing we could publish, we do not yet
store. We are changing that.

**This is our audience, not K-pop fans in general.** People who choose to take a K-pop quiz
are not a representative sample of anything, and we claim nothing beyond our own players.

## The fan votes, for colour only

Separately from the quizzes, 891 people have cast 60,364 head-to-head votes, all of it
inside the report window. Too small a panel to carry a claim, so we use it for texture: the
most one-sided matchups nearly all come from a single "best of the third generation" prompt,
and the most evenly split come from asking ARMY to name a bias — which is exactly the
question a fandom refuses to settle.

---

*Data: kpopquiz.org, 1 May 2026 to a snapshot on 17 August 2026, 17,425 attempts. Full
figures, queries, sample sizes and the exact snapshot boundary — including the findings we
discarded — are published alongside this report.*
