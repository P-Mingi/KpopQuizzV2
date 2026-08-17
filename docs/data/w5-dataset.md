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

---
---

# PART 0b - tests that can kill a finding

Same snapshot, read-only, 2026-08-17. Raw output and scripts: `docs/proofs/w5-part0b/`.

## H. THE GROUP LADDER, DIFFICULTY-STANDARDISED

**Method.** Direct standardisation. For each group, its score is recomputed as if it had
faced the reference difficulty mix instead of its own. Reference = the combined **play**
mix across all groups in scope: easy 12,922, medium 46,034, hard 451 (59,407 plays).
Weights are renormalised over the tiers a group actually has plays in, and the tiers
covered are stated on every row, because a group with no `easy` plays cannot be
standardised across a mix that contains them.

```sql
-- per group per difficulty tier, then reweight to the combined mix
select g.slug, q.difficulty, count(*) as plays,
       100.0*sum(p.score)/sum(p.total_questions) as tier_pct
from plays p join quizzes q on q.id=p.quiz_id join groups g on g.id=q.group_id
where p.total_questions>0 and p.score between 0 and p.total_questions
  and q.difficulty in ('easy','medium','hard')
group by g.slug, q.difficulty;
```

### H1. Raw vs standardised, 27 groups above floor (100 plays)

| rank std | group | raw | std | plays | rank raw | move | tiers covered |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | babymonster | 82.8% | 82.4% | 263 | 2 | +1 | easy+medium |
| 2 | cortis | 84.6% | 81.4% | 582 | 1 | -1 | easy+medium |
| 3 | illit | 75.1% | 75.4% | 463 | 4 | +1 | easy+medium |
| 4 | got7 | 70.2% | 71.3% | 125 | 8 | +4 | easy+medium |
| 5 | twice | 68.3% | 71.0% | 2,286 | 10 | +5 | easy+medium |
| 6 | ateez | 69.9% | 69.8% | 1,088 | 9 | +3 | medium+hard |
| 7 | itzy | 67.7% | 69.5% | 959 | 14 | +7 | easy+medium |
| 8 | newjeans | 65.9% | 69.1% | 2,319 | 17 | +9 | easy+medium+hard |
| 9 | nct | 66.3% | 69.0% | 286 | 16 | +7 | easy+medium |
| 10 | stray-kids | 73.4% | 68.7% | 6,395 | 5 | -5 | easy+medium |
| 11 | red-velvet | 67.8% | 68.6% | 886 | 13 | +2 | easy+medium+hard |
| 12 | txt | 70.5% | 68.5% | 999 | 7 | -5 | easy+medium |
| 13 | blackpink | 63.6% | 68.3% | 4,469 | 24 | **+11** | easy+medium+hard |
| 14 | aespa | 65.0% | 68.3% | 1,751 | 20 | +6 | easy+medium |
| 15 | seventeen | 71.7% | 68.0% | 2,940 | 6 | -9 | easy+medium |
| 16 | ive | 67.9% | 67.7% | 1,585 | 12 | -4 | medium+hard |
| 17 | monsta-x | 63.4% | 67.6% | 187 | 25 | +8 | easy+medium |
| 18 | general-kpop | 67.9% | 67.3% | 15,464 | 11 | -7 | easy+medium+hard |
| 19 | shinee | 67.2% | 66.0% | 589 | 15 | -4 | easy+medium+hard |
| 20 | exo | 65.2% | 65.9% | 1,180 | 19 | -1 | easy+medium |
| 21 | g-i-dle | 63.1% | 65.9% | 1,064 | 26 | +5 | easy+medium |
| 22 | le-sserafim | 65.6% | 65.6% | 1,358 | 18 | -4 | medium only |
| 23 | bts | 62.8% | 65.0% | 9,169 | 27 | +4 | easy+medium |
| 24 | nmixx | 64.4% | 64.4% | 164 | 21 | -3 | medium only |
| 25 | bigbang | 64.1% | 64.1% | 185 | 22 | -3 | medium only |
| 26 | enhypen | 64.0% | 63.0% | 2,258 | 23 | -3 | easy+medium |
| 27 | loona | 78.3% | 61.7% | 158 | 3 | **-24** | easy+medium |

Per-tier plays and per-tier scores for every row: `raw-H-I-ladders.txt`.

**Rows where standardisation does nothing:** le-sserafim, nmixx, bigbang have plays in
`medium` only, so std = raw by construction. They are not evidence for or against
standardisation.

**The largest single move, loona, is a renormalisation artefact:** 146 of its 158 plays are
`easy` (80.1%) and 12 are `medium` (56.5%). Standardising to a mix that is 77.5% medium
reweights 12 plays up to dominate the score. Its standardised figure rests on those 12
plays and should not be read as a measurement.

### H2. The plays-vs-score correlation

```sql
-- Pearson r between log10(plays) and score %, across groups above floor
```

| | raw score | standardised score |
| --- | --- | --- |
| all 27 groups | **-0.242** | **-0.141** |
| 26 groups, excluding general-kpop | **-0.254** | **-0.129** |

**Standardisation removes 41.7% of the correlation's magnitude** across all 27 groups
(-0.242 to -0.141), and 49.2% excluding general-kpop (-0.254 to -0.129). It does not
remove all of it: the sign stays negative in both cuts.

bts moves from **rank 27 of 27 (last) on raw** to **rank 23 of 27 on standardised**, at
65.0%. blackpink moves from 24 to 13.

---

## I. EVERYTHING SPLIT BY REGIME

Mar+Apr = 41,982 usable plays. May-Aug = 17,425. Split at 2026-05-01.

### I1. Mar+Apr, 22 groups above floor

Reference play mix: easy 5,849, medium 35,808, hard 325.

Standardised score range across the 22 groups: **60.3% (enhypen) to 67.0% (twice)**, a
spread of **6.7 points**. Top five standardised: twice 67.0, newjeans 65.7, red-velvet
65.6, itzy 65.2, aespa 64.7. bts is **14th of 22** at 63.2%.

| | raw score | standardised score |
| --- | --- | --- |
| all 22 groups | **+0.066** | **+0.199** |
| 21 groups, excluding general-kpop | **+0.057** | **+0.243** |

**The correlation is POSITIVE in this period.**

### I2. May-Aug, 21 groups above floor

Reference play mix: easy 7,073, medium 10,226, hard 126.

Standardised range: **66.0% (loona) to 85.2% (itzy)**, a spread of **19.2 points**. Top
five standardised: itzy 85.2, le-sserafim 84.6, cortis 84.4, ive 83.6, babymonster 83.4.
bts is **20th of 21** at 68.3%.

| | raw score | standardised score |
| --- | --- | --- |
| all 21 groups | **-0.421** | **-0.267** |
| 20 groups, excluding general-kpop | **-0.488** | **-0.294** |

**The correlation is NEGATIVE in this period.**

### I3. Is the ladder the same in both periods?

17 groups clear the floor in both. Spearman rank correlation of the standardised ladders:

    rho = -0.474   (n = 17)

| group | rank Mar+Apr | rank May-Aug | std Mar+Apr | std May-Aug |
| --- | --- | --- | --- | --- |
| twice | 1 | 7 | 67.0% | 81.6% |
| newjeans | 2 | 11 | 65.7% | 78.1% |
| red-velvet | 3 | 18 | 65.6% | 73.8% |
| itzy | 4 | 1 | 65.2% | 85.2% |
| aespa | 5 | 10 | 64.7% | 79.0% |
| blackpink | 6 | 15 | 64.6% | 76.7% |
| ateez | 7 | 12 | 64.6% | 78.0% |
| seventeen | 9 | 6 | 63.9% | 82.0% |
| stray-kids | 10 | 17 | 63.4% | 75.2% |
| general-kpop | 11 | 13 | 63.4% | 77.9% |
| exo | 12 | 14 | 63.4% | 77.4% |
| ive | 13 | 4 | 63.4% | 83.6% |
| bts | 14 | 20 | 63.2% | 68.3% |
| txt | 15 | 9 | 63.1% | 79.3% |
| le-sserafim | 20 | 2 | 62.0% | 84.6% |
| g-i-dle | 21 | 8 | 60.6% | 79.9% |
| enhypen | 22 | 19 | 60.3% | 70.2% |

The two periods' rankings are **negatively** rank-correlated.

### I4. Girl vs boy groups, by period (published quizzes)

| period | raw gg | raw bg | raw gap | std gg | std bg | std gap |
| --- | --- | --- | --- | --- | --- | --- |
| Mar+Apr | 62.9% (n=13,611) | 63.3% (n=15,445) | -0.4 pt | 66.0% | 62.6% | **+3.4 pt** |
| May-Aug | 76.2% (n=4,194) | 74.2% (n=9,135) | +2.0 pt | 77.9% | 73.4% | **+4.5 pt** |

The standardised gap favours girl groups in **both** periods, +3.4 and +4.5 points, and
the two are within 1.1 points of each other. The raw gap changes sign between periods
(-0.4 then +2.0).

---

## J. WHAT CHANGED BETWEEN APRIL AND MAY

### J1. What was played

| month | plays | score | easy % | medium % | hard % |
| --- | --- | --- | --- | --- | --- |
| 2026-03 | 17,860 | 62.7% | 15.5 | 84.2 | 0.3 |
| 2026-04 | 24,122 | 63.7% | 12.8 | 86.1 | 1.1 |
| 2026-05 | 3,281 | 77.1% | 38.3 | 61.5 | 0.2 |
| 2026-06 | 5,991 | 75.9% | 46.1 | 53.8 | 0.1 |
| 2026-07 | 4,955 | 75.8% | 38.7 | 59.9 | 1.4 |
| 2026-08 | 3,198 | 75.3% | 35.6 | 63.0 | 1.4 |

The easy share is 2.99x higher in May than in April (12.8% to 38.3%).

### J2. What was published (`quizzes.created_at`, published only)

| month | published | easy | medium | hard |
| --- | --- | --- | --- | --- |
| 2026-03 | 124 | 34 | 86 | 4 |
| 2026-04 | 132 | 27 | 101 | 4 |
| 2026-05 | 33 | 18 | 12 | 3 |
| 2026-06 | 51 | 25 | 24 | 2 |
| 2026-07 | 54 | 4 | 41 | 9 |
| 2026-08 | 6 | 2 | 3 | 1 |

### J3. Who played

| month | plays | signed-in % | distinct signed-in accounts | plays per account | perfect % | zero % |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03 | 17,860 | 55.3 | **54** | **182.8** | 12.9 | 2.5 |
| 2026-04 | 24,122 | 48.8 | **56** | **210.3** | 15.3 | 2.8 |
| 2026-05 | 3,281 | 7.0 | 12 | 19.2 | 38.2 | 0.4 |
| 2026-06 | 5,991 | 5.3 | 24 | 13.1 | 35.0 | 0.6 |
| 2026-07 | 4,955 | 10.0 | 43 | 11.5 | 36.1 | 0.5 |
| 2026-08 | 3,198 | 6.4 | 24 | 8.5 | 34.9 | 1.0 |

Denominator note: "plays per account" is signed-in plays divided by distinct signed-in
accounts. Anonymous plays carry no identifier (`anon_id` is set on 18 rows total), so no
per-person figure exists for them.

### J4. Concentration of volume on quizzes

| month | plays | distinct quizzes | top 1 | top 5 | top 10 | top 20 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03 | 17,860 | 123 | 6.8% | 23.9% | 39.0% | 61.0% |
| 2026-04 | 24,122 | 250 | 1.4% | 6.8% | 12.8% | 22.7% |
| 2026-05 | 3,281 | 222 | 6.2% | 21.8% | 34.7% | 51.4% |
| 2026-06 | 5,991 | 273 | 5.0% | 20.0% | 33.5% | 50.5% |
| 2026-07 | 4,955 | 349 | 3.7% | 15.5% | 27.4% | 43.5% |
| 2026-08 | 3,198 | 284 | 4.3% | 18.6% | 30.3% | 47.5% |

April is the *least* concentrated month, not the most.

### J5. Speed and length

| month | mean questions | median seconds |
| --- | --- | --- |
| 2026-03 | 7.42 | 104 |
| 2026-04 | 6.13 | 90 |
| 2026-05 | 7.55 | 33 |
| 2026-06 | 8.20 | 38 |
| 2026-07 | 8.22 | 37 |
| 2026-08 | 8.69 | 38 |

After the boundary plays are **longer** (6.13 to 8.69 mean questions) and **faster**
(90 to 38 median seconds).

### J6. Signed-in account concentration

| | Mar+Apr | May-Aug |
| --- | --- | --- |
| signed-in plays | 21,650 (51.6%) | 1,245 (7.1%) |
| distinct accounts | 56 | 87 |
| median plays per account | **249** | **6** |
| accounts with >= 100 plays | **54 of 56** | **1 of 87** |
| accounts with >= 500 plays | 22 | 0 |
| top 1 account, share of all plays | 1.6% | 1.3% |
| top 10 accounts, share of all plays | 15.6% | 4.1% |

### J7. The ten heaviest Mar+Apr accounts

| rank | plays | score | median seconds | distinct quizzes | plays per quiz |
| --- | --- | --- | --- | --- | --- |
| 1 | 674 | 61.8% | 100 | 153 | 4.4 |
| 2 | 664 | 60.6% | 100 | 151 | 4.4 |
| 3 | 661 | 61.3% | 100 | 150 | 4.4 |
| 4 | 654 | 61.0% | 101 | 163 | 4.0 |
| 5 | 651 | 61.6% | 99 | 153 | 4.3 |
| 6 | 651 | 62.4% | 102 | 147 | 4.4 |
| 7 | 646 | 62.5% | 101 | 151 | 4.3 |
| 8 | 646 | 60.4% | 103 | 151 | 4.3 |
| 9 | 645 | 60.6% | 100 | 160 | 4.0 |
| 10 | 642 | 60.1% | 101 | 147 | 4.4 |

Ranges across those ten: plays 642-674 (5.0%), score 60.1-62.5% (2.4 pt), median seconds
99-103 (4 s), plays per quiz 4.0-4.4.

### J8. The fingerprint across ALL accounts, with May-Aug as the control

| statistic | Mar+Apr (56 accounts) | May-Aug (87 accounts) |
| --- | --- | --- |
| plays per account: min / p25 / median / p75 / max | 5 / 233 / **249** / 628 / 674 | 1 / 2 / **6** / 13 / 219 |
| score %: min / p25 / median / p75 / max | 54.7 / 61.0 / **61.8** / 62.9 / 67.6 | 25.0 / 71.3 / **84.7** / 95.4 / 100.0 |
| median seconds: min / p25 / median / p75 / max | 65 / 92 / **95** / 100 / 104 | 9 / 26 / **34** / 44 / 214 |
| accounts scoring 58-65% | **50 of 56** | **3 of 87** |
| accounts with median 90-115 s | **52 of 56** | n/a |
| accounts with >= 100 plays | **54 of 56** | **1 of 87** |

Interquartile spread, Mar+Apr vs May-Aug: score **1.9 pt** vs **24.1 pt**; median seconds
**8 s** vs **18 s**; plays per account **395** vs **11**.

### J9. Removing the heavy accounts does not move the period

| set | plays | score |
| --- | --- | --- |
| Mar+Apr, all | 41,982 | 63.2% |
| Mar+Apr, minus the top 10 accounts | 35,448 | 63.6% |
| Mar+Apr, anonymous only | 20,332 | 64.7% |
| Mar+Apr, signed-in only | 21,650 | 61.8% |
| May-Aug, all | 17,425 | 75.9% |
| May-Aug, anonymous only | 16,180 | 75.4% |
| May-Aug, signed-in only | 1,245 | 82.5% |

Excluding the ten heaviest accounts changes Mar+Apr by **0.4 points**. The anonymous half
of Mar+Apr scores 64.7%, also far below the May-Aug anonymous figure of 75.4%.

### J10. What the evidence supports, and what it does not

Supported by the rows above:

1. In Mar+Apr, 51.6% of all plays came from **56 accounts**, median 249 plays each, and
   54 of those 56 have at least 100 plays. In May-Aug, 87 accounts produced 7.1% of plays
   with a median of 6 each and one account above 100.
2. Those 56 accounts are **tightly clustered on three independent axes at once**: 50 of 56
   score within 58-65%, 52 of 56 have a median play time within 90-115 seconds, and the
   ten heaviest agree to within 2.4 points of score and 4 seconds of median time while
   each playing 640-674 times. The May-Aug control shows the dispersion normally seen
   across accounts (score IQR 24.1 points against 1.9).
3. The anomaly is **not confined to the heavy accounts**: removing the top ten moves the
   period by 0.4 points, and Mar+Apr anonymous plays (20,332 of them) score 64.7%, also
   10.7 points below the May-Aug anonymous figure of 75.4%.

What the data **cannot** distinguish:

- Whether the Mar+Apr pattern is seeded/synthetic data, automated play, or a real campaign
  that drove a small cohort to grind the catalogue. Nothing in `plays` records source, IP,
  user agent or session, so no row can separate those.
- Whether the May-Aug figures are themselves representative: they are 7.1% signed-in and
  the anonymous majority carries no identifier, so repeat play by one person is invisible.

Not investigated, as this is a read-only mission: whether the 56 accounts exist in
`profiles` with distinguishing metadata, and what the 106 `score > total_questions` rows
have in common.

### J11. Below-floor groups, with quiz counts (PART 4.2)

| group | plays | published quizzes | difficulty mix | oldest quiz | newest quiz |
| --- | --- | --- | --- | --- | --- |
| kickflip | 70 | 3 | e2 m1 h0 | 2026-06-07 | 2026-06-15 |
| artms | 57 | 4 | e1 m3 h0 | 2026-06-01 | 2026-06-01 |
| loossemble | 42 | 4 | e2 m1 h1 | 2026-06-08 | 2026-06-10 |
| akmu | 15 | 1 | e0 m1 h0 | 2026-03-27 | 2026-03-27 |
| mamamoo | 15 | 2 | e1 m0 h1 | 2026-04-21 | 2026-04-26 |
| tws | 12 | 1 | e0 m1 h0 | 2026-07-13 | 2026-07-13 |
| dreamcatcher | 8 | 1 | e0 m1 h0 | 2026-07-10 | 2026-07-10 |
| astro | 6 | 1 | e1 m0 h0 | 2026-04-11 | 2026-04-11 |
| xikers | 6 | 1 | e1 m0 h0 | 2026-07-19 | 2026-07-19 |
| treasure | 4 | 1 | e0 m1 h0 | 2026-06-30 | 2026-06-30 |

The difficulty mix sums to the published quiz count on all ten rows.

Seven of the ten were first published in June or July 2026; three (akmu, mamamoo, astro)
date from March and April.

---
---

# PART 0c - the same two tests on everything that was left

Same snapshot, read-only. Raw output and script: `docs/proofs/w5-part0c/`.

**Reference mix for every standardised figure in K, L, M, N** is section H's, so the
numbers here are comparable with H: easy 12,922, medium 46,034, hard 451 (59,407 plays).
Note this differs from I1/I2/I4, which used each period's own mix. A standardised score is
only meaningful against a stated reference, and the two references give different values
for the same underlying data.

## K. GENERATIONS, STANDARDISED AND SPLIT

```sql
select coalesce(nullif(trim(g.generation),''),'(not recorded)') as generation,
       q.difficulty, count(*) as plays,
       100.0*sum(p.score)/sum(p.total_questions) as tier_pct
from plays p join quizzes q on q.id=p.quiz_id join groups g on g.id=q.group_id
where p.total_questions>0 and p.score between 0 and p.total_questions
  and q.difficulty in ('easy','medium','hard')
group by 1,2;   -- then reweight to the reference mix above
```

### K1. All history

| generation | groups | plays | raw | standardised |
| --- | --- | --- | --- | --- |
| 2nd Gen | 2 | 774 | 66.5% | 65.5% |
| 3rd Gen | 12 | 21,557 | 65.2% | 66.3% |
| 4th Gen | 12 | 19,944 | 68.3% | 67.4% |
| 5th Gen | 4 | 795 | 76.2% | 76.9% |
| (not recorded) | 7 | 16,337 | 69.2% | 68.0% |

Standardisation moves each generation by at most 1.2 points (2nd 1.0, 3rd 1.1, 4th 0.9,
5th 0.7, not-recorded 1.2). **Difficulty mix does not explain the 5th Gen figure.**

### K2. Mar+Apr

| generation | groups | plays | raw | standardised |
| --- | --- | --- | --- | --- |
| 2nd Gen | 2 | 689 | 64.1% | **NOT STANDARDISABLE (medium only)** |
| 3rd Gen | 10 | 16,252 | 63.0% | 63.9% |
| 4th Gen | 11 | 12,975 | 63.2% | 63.0% |
| 5th Gen | 0 | **0** | - | **no plays in this window** |
| (not recorded) | 3 | 12,066 | 63.5% | 64.1% |

**5th Gen has zero plays before 2026-05-01.** Its entire contribution to K1 comes from
May-Aug. The three generations that do have plays here sit within 1.1 standardised points
of each other (63.0 to 64.1).

### K3. May-Aug

| generation | groups | plays | raw | standardised |
| --- | --- | --- | --- | --- |
| 2nd Gen | 2 | **85** | 84.0% | 83.4% |
| 3rd Gen | 12 | 5,305 | 71.4% | 71.8% |
| 4th Gen | 12 | 6,969 | 76.2% | 72.9% |
| 5th Gen | 4 | 795 | 76.2% | 76.9% |
| (not recorded) | 7 | 4,271 | 80.5% | 75.9% |

**The 2nd Gen row is below the 100-play floor** (85 plays, 2 groups) and is the
highest-scoring generation in this window. It is listed, not ranked.

Among the rows that clear the floor: 3rd 71.8%, 4th 72.9%, 5th 76.9%. A 5.1 point rise from
3rd to 5th.

### K4. Published quizzes per generation (all time)

| generation | quizzes | easy | medium | hard |
| --- | --- | --- | --- | --- |
| 2nd Gen | 5 | 1 | 3 | 1 |
| 3rd Gen | 101 | 30 | 68 | 3 |
| 4th Gen | 111 | 30 | 77 | 4 |
| 5th Gen | 12 | 3 | 9 | 0 |
| (not recorded) | 171 | 46 | 110 | 15 |

5th Gen rests on **12 quizzes across 4 groups**, with no `hard` quiz at all.

### K5. Does the generation gradient survive?

- **Standardisation: yes.** Every generation moves less than 1.2 points and the ordering in
  K1 is unchanged.
- **The period split: it cannot be tested for 5th Gen.** 5th Gen has 0 plays in Mar+Apr, so
  there is no second period to compare it against. In Mar+Apr the remaining generations are
  within 1.1 standardised points of each other; in May-Aug they span 71.8 to 76.9 among
  rows above floor, plus an 85-play 2nd Gen row at 83.4%.

## L. HARDEST AND EASIEST QUIZZES, RECOMPUTED ON MAY-AUG

| | quizzes above the 50-play floor |
| --- | --- |
| all history (section C1) | 227 |
| **May-Aug only** | **76** |
| May-Aug qualifiers also in C1's 227 | 76 (all of them) |

**Losing 70.7% of the plays costs 66.5% of the qualifying quizzes**: 227 to 76.

### L1. May-Aug, 15 lowest scoring above floor

| # | score | plays | difficulty | title |
| --- | --- | --- | --- | --- |
| 1 | 40.0% | 71 | medium | BLACKPINK world records and achievements |
| 2 | 41.5% | 86 | medium | Stray Kids: Guess the Song Quiz |
| 3 | 41.6% | 781 | medium | Ultimate BTS era quiz - only real ARMYs survive |
| 4 | 52.3% | 59 | medium | BTS concerts and tour moments quiz |
| 5 | 54.2% | 400 | medium | BLACKPINK ultimate fan challenge |
| 6 | 54.5% | 424 | medium | ENHYPEN Quiz: Ultimate Fan Challenge |
| 7 | 58.8% | 69 | medium | Guess the BTS member from clues |
| 8 | 59.0% | 102 | medium | Stray Kids: Guess the member Quiz Part-1 |
| 9 | 59.1% | 334 | medium | Which K-pop group debuted first? Timeline challenge |
| 10 | 60.0% | 68 | easy | BTS ARIRANG comeback quiz - only real ARMYs will pass |
| 11 | 60.3% | 85 | medium | aespa B-sides and deep cuts quiz |
| 12 | 61.5% | 102 | medium | ILLIT - guess the idol! |
| 13 | 62.8% | 145 | medium | Identify the Stray Kids sub-unit |
| 14 | 64.2% | 136 | medium | BTS discography challenge |
| 15 | 65.3% | 59 | medium | Stray Kids discography test |

### L2. May-Aug, 15 highest scoring above floor

| # | score | plays | difficulty | title |
| --- | --- | --- | --- | --- |
| 1 | 99.4% | 53 | easy | Find the Non-BLACKPINK Member |
| 2 | 97.5% | 61 | medium | BTS members real names - complete test |
| 3 | 97.2% | 96 | easy | SEVENTEEN true or false |
| 4 | 96.8% | 101 | easy | How well do you know SKZ members? |
| 5 | 96.4% | 208 | easy | Which group is this member from? (boy groups) |
| 6 | 96.3% | 378 | easy | K-pop fandom names true or false |
| 7 | 96.2% | 114 | medium | BTS members - know your biases |
| 8 | 95.9% | 60 | easy | KickFlip mega quiz!! |
| 9 | 94.4% | 57 | medium | IVE true or false |
| 10 | 94.3% | 56 | medium | TWICE discography quiz |
| 11 | 94.1% | 478 | easy | Stray Kids basics |
| 12 | 93.9% | 79 | medium | K-pop positions explained quiz |
| 13 | 93.7% | 107 | easy | Complete the K-pop song title |
| 14 | 93.7% | 284 | easy | Are you a real coer??!! |
| 15 | 93.6% | 263 | easy | ENHYPEN debut and beyond quiz |

### L3. Overlap with the all-history lists in C1

| | in both lists |
| --- | --- |
| lowest-15 | **6 of 15** |
| highest-15 | **4 of 15** |

The six lowest in both: BLACKPINK world records and achievements; Stray Kids: Guess the
Song Quiz; Ultimate BTS era quiz; BLACKPINK ultimate fan challenge; ENHYPEN Quiz: Ultimate
Fan Challenge; Stray Kids: Guess the member Quiz Part-1.

The four highest in both: Find the Non-BLACKPINK Member; How well do you know SKZ members?;
KickFlip mega quiz!!; Are you a real coer??!!

**Nine of the fifteen lowest and eleven of the fifteen highest change** when the window
changes.

## M. THE GIRL-GROUP GAP, HARDENED (May-Aug only)

### M1. Baseline

| | standardised | plays |
| --- | --- | --- |
| girl groups | **76.5%** | 4,194 |
| boy groups | **70.9%** | 9,651 |
| **gap** | **+5.6 pt** | |

Per tier:

| side | easy | medium | hard |
| --- | --- | --- | --- |
| gg | n=751, 83.2% | n=3,421, 74.6% | n=22, 75.4% |
| bg | n=4,308, 85.5% | n=5,313, 66.8% | n=30, 72.8% |

Boy groups score **higher** on easy quizzes (85.5% vs 83.2%) and **lower** on medium ones
(66.8% vs 74.6%). 44.6% of bg plays are easy against 17.9% of gg plays, which is why the
raw and standardised gaps differ.

The `hard` cells are 22 and 30 plays, both far below any floor in this file.

### M2. Groups clearing 100 plays inside the window

| side | groups with any May-Aug play | clearing 100 in-window |
| --- | --- | --- |
| gg | 16 | **12** |
| bg | 16 | **8** |

gg: blackpink 1,023 · illit 463 · twice 454 · newjeans 405 · ive 319 · aespa 312 ·
babymonster 263 · le-sserafim 201 · itzy 200 · red-velvet 163 · loona 156 · g-i-dle 116

bg: stray-kids 3,556 · bts 2,658 · enhypen 1,157 · seventeen 781 · cortis 582 · txt 330 ·
ateez 330 · exo 110

### M3. Leave-one-out: is one group carrying the gap?

The standardised gap recomputed 32 times, once with each group removed. Largest movers:

| removed | side | plays removed | gg std | bg std | gap | change |
| --- | --- | --- | --- | --- | --- | --- |
| blackpink | gg | 1,023 | 78.5% | 70.9% | 7.6 | **+2.0 pt** |
| enhypen | bg | 1,157 | 76.5% | 72.7% | 3.8 | **-1.8 pt** |
| bts | bg | 2,658 | 76.5% | 72.3% | 4.2 | -1.4 pt |
| cortis | bg | 582 | 76.5% | 70.3% | 6.2 | +0.6 pt |
| ateez | bg | 330 | 76.5% | 70.3% | 6.2 | +0.6 pt |
| ive | gg | 319 | 75.9% | 70.9% | 5.0 | -0.6 pt |
| twice | gg | 454 | 76.0% | 70.9% | 5.0 | -0.5 pt |
| seventeen | bg | 781 | 76.5% | 70.4% | 6.1 | +0.5 pt |
| loona | gg | 156 | 77.0% | 70.9% | 6.1 | +0.5 pt |
| stray-kids | bg | 3,556 | 76.5% | 70.9% | 5.6 | -0.0 pt |

Full 32-row table in `raw-K-L-M-N.txt`.

| test | result |
| --- | --- |
| baseline gap | +5.6 pt |
| does any single removal move the gap by more than the gap itself? | **NO** |
| does the gap stay positive (gg above bg) in all 32 runs? | **YES** |
| range of the gap across all 32 runs | **3.8 to 7.6 pt** |

Removing stray-kids, the largest single contributor at 3,556 plays, moves the gap by
**0.0 points**.

## N. WHAT MAY-AUG CAN SUPPORT

```sql
-- everything below counted on created_at >= '2026-05-01'
```

| | count |
| --- | --- |
| usable plays in window | **17,425** |
| groups with any play | 37 |
| groups clearing 100 plays | **21** |
| published quizzes with any play | 393 |
| quizzes clearing 50 plays | **76** |
| duel votes in window | **60,364** |
| duel matchups with any vote | 3,525 |
| duel matchups clearing 100 votes | **62** |

**Every duel vote in the database falls inside this window.** Oldest is
2026-06-11T21:42:13Z, newest 2026-08-17T11:05:17Z, and the count before 2026-05-01 is 0.
The duel figures in section F are therefore unaffected by the period decision.

---
---

# PART 0d - the last data pass: does the girl-group gap survive its own control?

Same snapshot, read-only. Raw output and script: `docs/proofs/w5-part0d/`.
All figures below are **May-Aug only** (17,425 usable plays).

## O. THE WITHIN-LABEL TEST

**Unit of analysis is the QUIZ, not the play.** Each quiz contributes one score, so a
heavily-played quiz cannot carry a side. A quiz's score is
`SUM(score)/SUM(total_questions)` over its May-Aug plays.

```sql
select q.id, q.difficulty, gender_derived, count(*) as plays,
       100.0*sum(p.score)/sum(p.total_questions) as quiz_pct
from plays p join quizzes q on q.id=p.quiz_id
where p.created_at >= '2026-05-01' and q.status='published'
  and p.total_questions>0 and p.score between 0 and p.total_questions
group by q.id, q.difficulty
having count(*) >= <floor>;
```

Reported at three floors, because the floor changes how many quizzes qualify.

### O1. `medium` quizzes

| floor | side | n | min | p25 | median | p75 | max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | gg | 19 | 40.0 | 70.2 | **81.2** | 82.9 | 94.4 |
| 50 | bg | 21 | 41.5 | 59.0 | **71.5** | 78.1 | 97.5 |
| 20 | gg | 47 | 40.0 | 68.8 | **81.3** | 88.9 | 96.4 |
| 20 | bg | 41 | 41.5 | 65.3 | **75.7** | 84.0 | 97.5 |
| 10 | gg | 59 | 40.0 | 65.0 | **81.3** | 89.2 | 98.9 |
| 10 | bg | 59 | 41.5 | 68.2 | **76.7** | 86.6 | 97.5 |

Median difference (gg - bg): **+9.7 pt** at floor 50, **+5.6 pt** at floor 20, **+4.7 pt**
at floor 10. The ranges overlap almost completely at every floor (gg 40.0-98.9, bg
41.5-97.5).

### O2. `easy` quizzes

| floor | side | n | min | p25 | median | p75 | max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | gg | 5 | 71.0 | 77.1 | **86.4** | 87.8 | 99.4 |
| 50 | bg | 20 | 60.0 | 76.0 | **91.1** | 92.9 | 97.2 |
| 20 | gg | 8 | 71.0 | 77.1 | **86.4** | 87.8 | 99.4 |
| 20 | bg | 27 | 57.3 | 78.3 | **91.1** | 92.9 | 97.2 |
| 10 | gg | 19 | 53.0 | 72.0 | **86.1** | 88.6 | 99.4 |
| 10 | bg | 31 | 57.3 | 78.8 | **89.8** | 92.7 | 97.2 |

Median difference (gg - bg): **-4.7 pt**, **-4.7 pt**, **-3.7 pt**. **The sign is the
opposite of O1.**

`hard`: no quizzes on either side clear floors 50 or 20. At floor 10 there are 2 bg
quizzes and 0 gg quizzes. **Not computable.**

### O3. What this test can and cannot separate

Within the `medium` label, girl-group quizzes score higher at every floor; within `easy`,
boy-group quizzes score higher at every floor.

The measurement above **cannot distinguish** "our boy-group medium quizzes are harder as
written" from "players know girl groups better", because a quiz's score is the only
difficulty measure in this schema. Section G1 already established that
`quizzes.difficulty` is an author-assigned label that does not order the measured scores
monotonically (`hard` sits 0.2 pt below `medium` overall), and there is no other
difficulty column. Any control built on that label controls the label.

## P. MATCHED FORMATS

A control that does **not** depend on score: match quizzes by what they ask.

**The rule, stated so the buckets can be judged.** Each quiz is assigned to the **first**
matching pattern, tested in this order against the lowercased title. Anything matching
nothing is `(unclassified)` and is shown rather than dropped.

| order | format | pattern |
| --- | --- | --- |
| 1 | true-or-false | `true or false`, `true-or-false`, `t/f` |
| 2 | members | `member`, `who is this`, `which member`, `name all`, `bias(es)` |
| 3 | discography | `discograph`, `album`, `title track`, `b-side`, `deep cut`, `song quiz`, `guess the song`, `name that song`, `complete the …title` |
| 4 | timeline-era | `timeline`, `debut`, `era`, `which year`, `came out`, `generation` |
| 5 | intruder | `intruder`, `non-`, `odd one`, `find the` |
| 6 | photo-visual | `recognise/recognize`, `photo`, `picture`, `image`, `kids` |
| 7 | label-company | `company`, `label`, `entertainment`, `jyp`, `sm`, `yg`, `hybe` |
| 8 | lyrics | `lyric` |
| 9 | general-fan | `how well do you know`, `ultimate`, `only real`, `real <fandom>`, `challenge`, `fan` |

Pool: May-Aug quizzes with **>= 20 plays** whose group has a derived gender. Every
assignment is listed in `raw-O-P-Q.txt` so the buckets can be audited quiz by quiz.

### P1. Formats present on both sides

| format | gg quizzes | gg median | gg plays | bg quizzes | bg median | bg plays | median gap (gg-bg) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (unclassified) | 14 | 74.0% | 1,001 | 14 | 84.0% | 984 | **-10.1 pt** |
| discography | 11 | 76.9% | 580 | 9 | 69.2% | 714 | **+7.7 pt** |
| general-fan | 5 | 86.1% | 737 | 6 | 71.9% | 781 | **+14.3 pt** |
| members | 11 | 81.3% | 627 | 15 | 90.1% | 1,998 | **-8.8 pt** |
| photo-visual | 2 | 58.2% | 99 | 6 | 73.0% | 1,026 | **-14.8 pt** |
| timeline-era | 2 | 60.8% | 56 | 8 | 74.6% | 1,269 | **-13.8 pt** |
| true-or-false | 10 | 91.7% | 596 | 10 | 89.8% | 1,863 | **+1.9 pt** |

All 7 formats in the pool have quizzes on both sides.

### P2. Direction of the gap inside matched formats

| | gg median above bg | bg median above gg | tied |
| --- | --- | --- | --- |
| all 7 formats | **3** | **4** | 0 |
| 6 classified formats (excluding `(unclassified)`) | **3** | **3** | 0 |

The four largest absolute gaps point in different directions: general-fan +14.3 (gg),
photo-visual -14.8 (bg), timeline-era -13.8 (bg), unclassified -10.1 (bg).

**Bucket sizes are small and uneven**: 2 to 15 quizzes per side, and `(unclassified)` is
the joint-largest bucket at 14 quizzes each side, which is a limit of the rule set above.
Play counts are also lopsided within formats (members: 627 gg plays against 1,998 bg;
timeline-era: 56 against 1,269).

## Q. CATALOGUE UNEVENNESS

```sql
-- per group, May-Aug: published quizzes (all time), plays in window, easy-labelled plays
select g.slug, count(*) as plays,
       sum(case when q.difficulty='easy' then 1 else 0 end) as easy_plays
from plays p join quizzes q on q.id=p.quiz_id join groups g on g.id=q.group_id
where p.created_at >= '2026-05-01' and p.total_questions>0
  and p.score between 0 and p.total_questions
group by g.slug having count(*) >= 100;
```

21 groups clear 100 May-Aug plays.

| group | side | published quizzes | May-Aug plays | easy plays | easy share |
| --- | --- | --- | --- | --- | --- |
| stray-kids | bg | 26 | 3,557 | 2,493 | **70.1%** |
| general-kpop | - | 152 | 3,413 | 1,911 | 56.0% |
| bts | bg | 27 | 2,658 | 201 | **7.6%** |
| enhypen | bg | 7 | 1,157 | 543 | 46.9% |
| blackpink | gg | 22 | 1,023 | 93 | 9.1% |
| seventeen | bg | 11 | 781 | 527 | 67.5% |
| cortis | bg | 5 | 582 | 284 | 48.8% |
| illit | gg | 4 | 463 | 96 | 20.7% |
| twice | gg | 14 | 454 | 82 | 18.1% |
| newjeans | gg | 10 | 405 | 34 | 8.4% |
| txt | bg | 6 | 330 | 222 | 67.3% |
| ateez | bg | 20 | 330 | 0 | **0.0%** |
| ive | gg | 8 | 319 | 0 | **0.0%** |
| aespa | gg | 13 | 312 | 48 | 15.4% |
| babymonster | gg | 3 | 263 | 138 | 52.5% |
| le-sserafim | gg | 5 | 201 | 0 | **0.0%** |
| itzy | gg | 7 | 200 | 76 | 38.0% |
| red-velvet | gg | 7 | 163 | 10 | 6.1% |
| loona | gg | 5 | 156 | 144 | **92.3%** |
| g-i-dle | gg | 7 | 116 | 5 | 4.3% |
| exo | bg | 8 | 110 | 7 | 6.4% |

**The one number for the method section:**

| easy-share across the 21 compared groups | |
| --- | --- |
| min | **0.0%** (ateez, ive, le-sserafim) |
| p25 | 6.4% |
| median | 18.1% |
| p75 | 52.5% |
| max | **92.3%** (loona) |
| **range** | **92.3 percentage points** |

Published quizzes across the same 21 groups: min **3**, median **8**, max **152**
(general-kpop).

Two groups that are adjacent in the ladder can therefore have been measured on completely
different material: stray-kids at 70.1% easy plays against bts at 7.6%, both boy groups,
both above 2,500 plays in-window.
