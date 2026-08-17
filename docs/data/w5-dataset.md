# W5 DATASET - numbers and the queries that produced them

Snapshot taken 2026-08-17 against the live database, read-only. No writes, no DDL.
Raw output and the exact scripts: `docs/proofs/w5-part0/`.

This file contains numbers, queries, denominators and data notes. **No interpretation and
no conclusions** - those belong to the report.

---

## 0. THE FLOOR, set before any result was looked at

| level | floor | reasoning |
| --- | --- | --- |
| per group | **100 usable plays** | Below ~100 plays a single unusual play moves a group's percentage by more than a rank position, and the top of a ladder is exactly where a small sample hides. 100 keeps one play worth under ~1 point. |
| per quiz | **50 usable plays** | There are 400 published quizzes, so a "hardest quiz" list would otherwise be a list of quizzes played five times. |
| per duel matchup | **100 votes** | The whole duel panel is 891 voters; a matchup under 100 votes is a handful of people. |
| per question | **n/a** | Not answerable, see section C2. |

Anything under a floor is listed separately as **below floor** and never ranked.

## 0b. WHAT "SCORE" MEANS HERE

`plays` stores `score` and `total_questions` per play. Percentage is **pooled**:
`SUM(score) / SUM(total_questions)`, so a 20-question play counts more than a
5-question play.

The alternative (mean of each play's own percentage) was computed for every group as a
check. The two agree within **1 point for 26 of 27 groups above floor**. The exception:

    enhypen   pooled 64.0%   mean 68.7%   difference 4.7 pt

All other groups: |difference| <= 2.0 pt, most under 1 pt. Full comparison in
`docs/proofs/w5-part0/raw-addendum.txt`.

## 0c. USABLE ROWS

```sql
-- usable play = a score that can be expressed as a percentage
select count(*) from plays
where total_questions > 0 and score >= 0 and score <= total_questions;
```

| rows | count |
| --- | --- |
| `plays` total | 59,513 |
| `total_questions <= 0` or null | 0 |
| `score < 0` | 0 |
| **`score > total_questions`** | **106** |
| **usable for scoring** | **59,407** |

**Data note:** 106 plays record a score higher than the number of questions. They are
excluded from every figure in this file. Cause not investigated (this is a read-only
mission). 106 / 59,513 = 0.18%.

---

## A. SCOPE

```sql
select count(*), min(created_at), max(created_at),
       count(player_id) as signed_in,
       count(*) - count(player_id) as anonymous
from plays;
```

| figure | value |
| --- | --- |
| plays (all rows) | 59,513 |
| plays usable for scoring | 59,407 |
| oldest play | 2026-03-10T05:01:49Z |
| newest play | 2026-08-17T12:30:50Z |
| window length | 160 days |
| plays with a `player_id` (signed in) | 22,899 (38.5%) |
| plays with `player_id` null (anonymous) | 36,614 (61.5%) |
| plays with `anon_id` set | 18 |
| distinct quizzes with >= 1 usable play | 402 |
| of those, `status = 'published'` | 400 |
| of those, quiz row missing | 0 |
| published quizzes in total | 400 |
| distinct groups with >= 1 usable play | 37 |

Denominator for every percentage below: usable plays, 59,407, over 2026-03-10 to
2026-08-17.

---

## B. PER GROUP

```sql
select g.slug,
       count(*) as plays,
       100.0 * sum(p.score) / sum(p.total_questions) as score_pct
from plays p
join quizzes q on q.id = p.quiz_id
join groups  g on g.id = q.group_id
where p.total_questions > 0 and p.score between 0 and p.total_questions
group by g.slug
having count(*) >= 100          -- the floor
order by score_pct desc;
```

**27 groups above floor, 10 below.**

### B1. Ranked by score

| # | group | score | plays | generation | gender (derived) |
| --- | --- | --- | --- | --- | --- |
| 1 | cortis | 84.6% | 582 | not recorded | bg |
| 2 | babymonster | 82.8% | 263 | 5th Gen | gg |
| 3 | loona | 78.3% | 158 | not recorded | gg |
| 4 | illit | 75.1% | 463 | 5th Gen | gg |
| 5 | stray-kids | 73.4% | 6,395 | 4th Gen | bg |
| 6 | seventeen | 71.7% | 2,940 | 3rd Gen | bg |
| 7 | txt | 70.5% | 999 | 4th Gen | bg |
| 8 | got7 | 70.2% | 125 | 3rd Gen | bg |
| 9 | ateez | 69.9% | 1,088 | 4th Gen | bg |
| 10 | twice | 68.3% | 2,286 | 3rd Gen | gg |
| 11 | **general-kpop** | 67.9% | 15,464 | not recorded | n/a |
| 12 | ive | 67.9% | 1,585 | 4th Gen | gg |
| 13 | red-velvet | 67.8% | 886 | 3rd Gen | gg |
| 14 | itzy | 67.7% | 959 | 4th Gen | gg |
| 15 | shinee | 67.2% | 589 | 2nd Gen | bg |
| 16 | nct | 66.3% | 286 | 3rd Gen | n/a |
| 17 | newjeans | 65.9% | 2,319 | 4th Gen | gg |
| 18 | le-sserafim | 65.6% | 1,358 | 4th Gen | gg |
| 19 | exo | 65.2% | 1,180 | 3rd Gen | bg |
| 20 | aespa | 65.0% | 1,751 | 4th Gen | gg |
| 21 | nmixx | 64.4% | 164 | 4th Gen | gg |
| 22 | bigbang | 64.1% | 185 | 2nd Gen | bg |
| 23 | enhypen | 64.0% | 2,258 | 4th Gen | bg |
| 24 | blackpink | 63.6% | 4,469 | 3rd Gen | gg |
| 25 | monsta-x | 63.4% | 187 | 3rd Gen | bg |
| 26 | g-i-dle | 63.1% | 1,064 | 4th Gen | gg |
| 27 | bts | 62.8% | 9,169 | 3rd Gen | bg |

Spread top to bottom, above floor: **84.6% to 62.8% = 21.8 points**.
Excluding `general-kpop`: same, 84.6% to 62.8%.

**Data note on row 11:** `general-kpop` is a catch-all bucket, not a K-pop group. Its
`groups` row is `id=30, name="General K-pop"`. It carries 15,464 plays, the largest of any
row, and it has no generation and no derivable gender.

### B2. Ranked by plays (same 27 rows)

| # | group | plays | score |
| --- | --- | --- | --- |
| 1 | general-kpop | 15,464 | 67.9% |
| 2 | bts | 9,169 | 62.8% |
| 3 | stray-kids | 6,395 | 73.4% |
| 4 | blackpink | 4,469 | 63.6% |
| 5 | seventeen | 2,940 | 71.7% |
| 6 | newjeans | 2,319 | 65.9% |
| 7 | twice | 2,286 | 68.3% |
| 8 | enhypen | 2,258 | 64.0% |
| 9 | aespa | 1,751 | 65.0% |
| 10 | ive | 1,585 | 67.9% |
| 11 | le-sserafim | 1,358 | 65.6% |
| 12 | exo | 1,180 | 65.2% |
| 13 | ateez | 1,088 | 69.9% |
| 14 | g-i-dle | 1,064 | 63.1% |
| 15 | txt | 999 | 70.5% |
| 16 | itzy | 959 | 67.7% |
| 17 | red-velvet | 886 | 67.8% |
| 18 | shinee | 589 | 67.2% |
| 19 | cortis | 582 | 84.6% |
| 20 | illit | 463 | 75.1% |
| 21 | nct | 286 | 66.3% |
| 22 | babymonster | 263 | 82.8% |
| 23 | monsta-x | 187 | 63.4% |
| 24 | bigbang | 185 | 64.1% |
| 25 | nmixx | 164 | 64.4% |
| 26 | loona | 158 | 78.3% |
| 27 | got7 | 125 | 70.2% |

### B3. Do the most-played groups score better?

Pearson correlation between `log10(plays)` and score %, across the 27 groups above floor:

    r = -0.242

Excluding `general-kpop` (26 groups): **r = -0.254**.
The three most-played real groups are bts (62.8%), stray-kids (73.4%), blackpink (63.6%);
the group ranked last by score, bts, is second by plays.

### B4. Below floor (listed, never ranked)

| group | plays | score |
| --- | --- | --- |
| kickflip | 70 | 93.6% |
| artms | 57 | 61.8% |
| loossemble | 42 | 72.1% |
| akmu | 15 | 43.3% |
| mamamoo | 15 | 68.0% |
| tws | 12 | 90.5% |
| dreamcatcher | 8 | 66.7% |
| astro | 6 | 88.3% |
| xikers | 6 | 96.7% |
| treasure | 4 | 72.5% |

---

## C1. PER QUIZ

```sql
select q.slug, q.title, q.difficulty,
       count(*) as plays,
       100.0 * sum(p.score) / sum(p.total_questions) as score_pct
from plays p join quizzes q on q.id = p.quiz_id
where q.status = 'published'
  and p.total_questions > 0 and p.score between 0 and p.total_questions
group by q.slug, q.title, q.difficulty
having count(*) >= 50           -- the floor
order by score_pct asc;
```

**227 of 400 published quizzes are above floor.**

### Lowest scoring, above floor

| # | score | plays | difficulty | title |
| --- | --- | --- | --- | --- |
| 1 | 41.5% | 86 | medium | Stray Kids: Guess the Song Quiz |
| 2 | 53.1% | 2,123 | medium | Ultimate BTS era quiz - only real ARMYs survive |
| 3 | 54.1% | 74 | hard | K-pop boy group generations timeline |
| 4 | 55.6% | 147 | medium | Which year did this song come out? |
| 5 | 56.8% | 80 | medium | ATEEZ discography challenge |
| 6 | 56.9% | 884 | medium | ENHYPEN Quiz: Ultimate Fan Challenge |
| 7 | 57.0% | 307 | medium | BLACKPINK world records and achievements |
| 8 | 57.5% | 60 | medium | Name That Album Cover |
| 9 | 57.6% | 84 | medium | Can You Recognize These Idols as Kids? |
| 10 | 57.8% | 86 | medium | Which group is this member from? |
| 11 | 57.8% | 102 | medium | JYP Entertainment groups quiz |
| 12 | 58.0% | 1,278 | medium | BLACKPINK ultimate fan challenge |
| 13 | 59.0% | 172 | medium | IU - the nation's little sister |
| 14 | 59.0% | 102 | medium | Stray Kids: Guess the member Quiz Part-1 |
| 15 | 59.6% | 113 | medium | K-pop girl group generations timeline |

### Highest scoring, above floor

| # | score | plays | difficulty | title |
| --- | --- | --- | --- | --- |
| 1 | 97.9% | 62 | easy | Find the Non-BLACKPINK Member |
| 2 | 97.8% | 172 | easy | How well do you know SKZ members? |
| 3 | 96.4% | 56 | easy | TWICE members facts quiz |
| 4 | 95.9% | 60 | easy | KickFlip mega quiz!! |
| 5 | 93.7% | 284 | easy | Are you a real coer??!! |
| 6 | 93.5% | 53 | easy | Only real ARMYs can pass this BTS debut quiz |
| 7 | 92.3% | 136 | easy | Only real STAYs can ace this Stray Kids quiz |
| 8 | 91.4% | 127 | easy | Find the 3rd Gen Intruder Among 4th Gen |
| 9 | 91.4% | 51 | easy | True or false stray kids quiz |
| 10 | 91.1% | 64 | easy | How well do you know BTS members? |
| 11 | 88.4% | 88 | easy | Can You Recognize These K-pop Idols ? |
| 12 | 87.9% | 99 | easy | TWICE title tracks challenge - name that song |
| 13 | 87.5% | 184 | easy | Stray Kids discography challenge |
| 14 | 86.5% | 86 | easy | How well do you know SEVENTEEN ? |
| 15 | 86.4% | 138 | easy | ONLY REAL MONSTIEZ |

**Data note:** all 15 of the highest are labelled `easy`; 13 of the 15 lowest are
labelled `medium`. See section G1 for score by difficulty label.

## C2. PER QUESTION - **NOT ANSWERABLE**

The schema does not record which questions a player got right.

- `plays` columns: `id, quiz_id, player_id, score, total_questions, time_taken_seconds,
  created_at, per_question_times, anon_id`. Only the **total** score is stored.
- `per_question_times` is the only per-question column, it holds timings not correctness,
  **and it is null on all 59,513 rows**:

```sql
select count(*) from plays where per_question_times is not null;  -- 0
```

- No `play_answers`, `quiz_questions` or `question_stats` table exists (all three return
  "Could not find the table in the schema cache").
- `quizzes.questions` is the question **content**, not per-player results.

So "the questions most people get wrong" cannot be produced, and cannot be approximated
from quiz-level data without inventing it. Answering it would require a schema change and
new writes, both out of scope for a read-only mission.

---

## D. GIRL GROUPS vs BOY GROUPS

**Gender is DERIVED, not stored on `groups`.** `groups` has no gender/type column. The
derivation uses `songs.gender`, a real column whose values are
`gg, bg, solo_female, solo_male, coed`:

```sql
-- a group's gender = the single distinct songs.gender across its songs
select group_id, count(distinct gender) from songs where group_id is not null
group by group_id;   -- 81 groups, 81 with exactly one distinct value, 0 mixed, 0 null
```

All 81 groups that have songs resolve to exactly one value, so the derivation is
unambiguous where it applies. Groups with no songs (including `general-kpop` and `nct`)
have no derived gender and are excluded from this section.

Only `gg` and `bg` are compared; `solo_female`, `solo_male` and `coed` are not group
categories and are excluded.

| | girl groups (gg) | boy groups (bg) |
| --- | --- | --- |
| groups above floor | 13 | 12 |
| plays (those groups, any quiz status) | 17,725 | 25,697 |
| pooled score | **66.5%** | **67.7%** |
| published quizzes | 113 | 124 |
| difficulty mix | easy 28, medium 80, hard 5 | easy 40, medium 81, hard 3 |

Raw gap: **1.2 points, girl groups LOWER**.

**Denominator note, because two different play counts appear in this section.** The table
above counts every play of a group above floor (17,725 gg / 25,697 bg). The difficulty
table below restricts to plays of **published** quizzes and drops the group floor, since
it is aggregating by difficulty rather than by group (17,805 gg / 24,580 bg). The two are
different cuts, not a discrepancy; each table states which it uses.

### D1. The raw gap reverses when difficulty is controlled

The raw comparison is not difficulty-matched: easy quizzes are 24.8% of gg quizzes
(28/113) but 32.3% of bg quizzes (40/124), and section G1 shows easy quizzes score 14.5
points above medium ones. So the same query was run split by difficulty:

```sql
select gender_derived, q.difficulty, count(*) as plays,
       100.0 * sum(p.score)/sum(p.total_questions) as score_pct
from plays p join quizzes q on q.id = p.quiz_id
where q.status='published' and p.total_questions>0 and p.score between 0 and p.total_questions
group by 1,2;
```

| difficulty | gg score (plays) | bg score (plays) | gap (gg - bg) |
| --- | --- | --- | --- |
| easy | 84.1% (1,043) | 77.1% (8,288) | **+7.0 pt** |
| medium | 65.3% (16,732) | 63.2% (16,262) | **+2.2 pt** |
| hard | 66.0% (30) | 72.8% (30) | -6.8 pt |
| **pooled** | **66.5% (17,805)** | **67.7% (24,580)** | **-1.2 pt** |

Direct-standardised to the combined difficulty mix of both sides:

    gg = 69.5%    bg = 66.2%    gap = +3.2 pt, girl groups HIGHER

**The pooled gap and the controlled gap have opposite signs.** Pooled, girl groups are 1.2
points lower; within each difficulty tier above floor they are higher (easy +7.0, medium
+2.2), and standardised they are 3.2 points higher. This is Simpson's paradox: boy-group
plays are concentrated in easy quizzes (8,288 of 24,580 = 33.7%) while girl-group plays
are concentrated in medium ones (16,732 of 17,805 = 94.0%).

The `hard` row is **below every floor in this file**: 30 plays per side. It is shown for
completeness and carries no weight; excluding it does not change the direction of the
standardised gap.

**Data note:** neither number is difficulty-matched at the quiz level, only at the label
level, and section G1 shows the labels are author-assigned rather than measured (hard
scores 0.2 pt below medium overall). A comparison matched on measured difficulty was not
computed.

---

## E. GENERATIONS

`groups.generation` is a real stored column, not inferred.

```sql
select coalesce(g.generation,'(not recorded)') as generation,
       count(distinct g.id) as groups, count(*) as plays,
       100.0 * sum(p.score)/sum(p.total_questions) as score_pct
from plays p join quizzes q on q.id=p.quiz_id join groups g on g.id=q.group_id
where p.total_questions>0 and p.score between 0 and p.total_questions
group by 1;
```

| generation | groups | plays | score |
| --- | --- | --- | --- |
| 2nd Gen | 2 | 774 | 66.5% |
| 3rd Gen | 12 | 21,557 | 65.2% |
| 4th Gen | 12 | 19,944 | 68.3% |
| 5th Gen | 4 | 795 | 76.2% |
| (not recorded) | 7 | 16,337 | 69.2% |

**Data notes:** no 1st Gen row exists in the data at all. The "(not recorded)" row is
16,337 plays, second largest, and 15,464 of those are `general-kpop` alone. 5th Gen rests
on 4 groups and 795 plays; 2nd Gen on 2 groups and 774 plays. These are group counts, not
per-group floors: the floor in section B applies per group, not per generation.

---

## F. DUEL VOTES - **COLOUR ONLY**

```sql
select count(*) as votes, count(distinct voter_hash) as voters from duel_votes;
```

| figure | value |
| --- | --- |
| total votes | 60,364 |
| distinct `voter_hash` | 891 |
| votes per voter (mean) | 67.7 |
| distinct matchups | 3,525 |
| matchups with >= 100 votes | 62 |

**891 self-selected voters.** Per the plan this supports colour, never a headline.
`voter_hash` is a hash, so "distinct voters" is an upper bound on people and a lower bound
on ambiguity: one person on two devices counts twice, and it is not verified that one hash
equals one person.

### Most lopsided matchups (>= 100 votes)

| share | winner over loser | votes | prompt |
| --- | --- | --- | --- |
| 94.6% | Irene over Sana | 111 | Best of the 3rd generation |
| 94.5% | Irene over Nayeon | 127 | Best of the 3rd generation |
| 94.2% | Seulgi over Sana | 139 | Best of the 3rd generation |
| 91.4% | Seulgi over Irene | 162 | Best of the 3rd generation |
| 90.0% | Seulgi over Nayeon | 100 | Best of the 3rd generation |
| 89.7% | Irene over Joy | 116 | Best of the 3rd generation |
| 87.5% | Momo over Hwasa | 120 | Best of the 3rd generation |
| 87.4% | (G)I-DLE over aespa | 119 | Best 4th generation group? |
| 87.4% | Nayeon over Hwasa | 119 | Best of the 3rd generation |
| 86.8% | TWICE over aespa | 114 | Best K-pop girl group ever? |

### Most contested matchups (>= 100 votes)

| share | matchup | votes | prompt |
| --- | --- | --- | --- |
| 50.5% | Suga vs J-Hope | 329 | Who is your BTS bias? |
| 50.6% | Jin vs Jimin | 257 | Who is your BTS bias? |
| 50.9% | V vs Jungkook | 346 | Who is your BTS bias? |
| 50.9% | J-Hope vs RM | 269 | Who is your BTS bias? |
| 51.8% | Lee Know vs Seungmin | 139 | Who is your SKZ bias? |
| 52.8% | Rose vs Jennie | 108 | Who is your BLACKPINK bias? |
| 53.3% | Jisoo vs Jennie | 122 | Who is your BLACKPINK bias? |
| 54.3% | Jin vs J-Hope | 350 | Who is your BTS bias? |
| 55.5% | Suga vs Jin | 321 | Who is your BTS bias? |
| 56.6% | Suga vs Jimin | 304 | Who is your BTS bias? |

**Data note:** 8 of the 10 most lopsided come from one prompt, "Best of the 3rd
generation", and 6 of the 10 most contested from one prompt, "Who is your BTS bias?". The
two lists are each dominated by a single question rather than spread across the 20 duel
questions. The plan's earlier figure of 59,508 votes / ~870 voters is now 60,364 / 891;
the table is live.

---

## G. THINGS NOT ASKED FOR

### G1. Score by difficulty label (published quizzes)

| difficulty | plays | score |
| --- | --- | --- |
| easy | 12,921 | 78.6% |
| medium | 44,890 | 64.1% |
| hard | 451 | 63.9% |

easy is 14.5 points above medium. **hard is 0.2 points below medium on only 451 plays**,
so the three labels are not a monotonic difficulty scale in the measured data.

### G2. Signed-in vs anonymous

| | plays | score |
| --- | --- | --- |
| signed in (`player_id` not null) | 22,895 | 63.4% |
| anonymous | 36,512 | 69.8% |

Anonymous plays score **6.4 points higher**. Not controlled for which quizzes each group
played.

### G3. Plays and score by month - a regime change

| month | plays | score |
| --- | --- | --- |
| 2026-03 | 17,860 | 62.7% |
| 2026-04 | 24,122 | 63.7% |
| 2026-05 | 3,281 | 77.1% |
| 2026-06 | 5,991 | 75.9% |
| 2026-07 | 4,955 | 75.8% |
| 2026-08 | 3,198 | 75.3% |

**This is the most important caveat in the file.** Computed directly rather than read off
the month table:

    Mar + Apr : 41,982 usable plays, pooled 63.2%   (70.7% of all usable plays)
    May - Aug : 17,425 usable plays, pooled 75.9%
    break     : 12.7 points

The break between April and May is not gradual. Every pooled figure in this file mixes
those two periods, weighted 70.7 / 29.3 toward the low-scoring one. Cause not investigated
(read-only mission).

### G4. Score by quiz length

| questions | plays | score |
| --- | --- | --- |
| 5 | 10,316 | 65.7% |
| 6 | 15,175 | 67.7% |
| 7 | 17,230 | 68.8% |
| 8 | 10,786 | 64.3% |
| 9 | 1,210 | 73.4% |
| 10 | 2,245 | 73.2% |
| 11 | 231 | 73.0% |
| 12 | 352 | 74.9% |
| 20 | 1,382 | 64.9% |

Lengths with fewer than 200 plays are omitted.

### G5. Distribution shape

| | count | share of 59,407 |
| --- | --- | --- |
| perfect scores (`score = total_questions`) | 12,245 | 20.6% |
| zero scores | 1,228 | 2.1% |

---

## COLUMNS WHOSE MEANING WAS INFERRED

Stated because the mission asks for it.

1. **`songs.gender`** taken as the gender of the group, used for section D. It is a column
   on songs, not on groups. Consistent across all 81 groups that have songs, but the
   mapping itself is an inference.
2. **`plays.player_id is null` taken as "anonymous"**. It is the only signed-in signal on
   the row and `anon_id` is set on just 18 rows.
3. **`quizzes.difficulty`** taken as the author's difficulty label, not a measured one.
   G1 shows it does not order the measured scores monotonically.
4. **`duel_votes.voter_hash`** taken as one person. It is a hash; one person on two
   devices counts twice.

## NOT USED

- `quizzes.play_count`, `quizzes.total_score_sum`, `quizzes.total_completions`,
  `groups.total_plays`: denormalised counters. Everything here is counted from `plays`
  directly instead. They were not compared against the computed figures.
- `game_plays` (1,546 rows): blind test and game modes, a different scoring model. Out of
  scope for a report about quiz scores.
