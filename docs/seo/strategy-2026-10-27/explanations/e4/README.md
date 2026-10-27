# Verified explanations, lot E4 (SEO strategy of 2026-10-27)

188 explanations, each with its source, for 39 quizzes. The lot took the 40 most played quizzes that still had no
explanation at all, once lots E1 to E3 are counted. Quizzes going to draft, opinion polls, lyrics quizzes, quizzes not in
English and picture or intruder quizzes were left out. One quiz of the lot (k-pop-positions-explained-quiz) gets no
explanation: no allowed source defines its terms. SQL: `docs/pending-migrations/seo-explanations-e4.sql` and its rollback,
pasted by the owner after `seo-quiz-explanations.sql`, then checked by Claude. Nothing in the quizzes changes.

## The circuit (same as lots E1 to E3)

1. Four writers (rules: ../e1/EXPLAIN-BRIEF.md): 248 questions. Writer verdicts: ok 192, unverifiable 26, ambiguous 13, out_of_rules 10, answer_wrong 7.
2. Four independent checkers (../e1/VERIFY-EXPL-BRIEF.md): OK 179, CONFIRMED 53, FIX 9, DROP 4, OVERTURNED 3.
3. The dedicated recheck (../e1/RECHECK-EXPL-BRIEF.md) of every flagged point, plus two points the coordinator added
   (a comparison of members' ages, and a label stated in the present tense): 14 points, keep 10, rewrite 3, drop 1. The
   drop is the age comparison: only the French Wikipedia page proves it on one page. Reports in French:
   E4-recheck-AB.md and E4-recheck-CD.md.
4. A last independent reading of the 3 rewritten texts: one small correction kept, two texts left out (one rested on a
   transliteration only, the other on a label no allowed page states with a date).
5. Format checked by script on every published text: 60 to 220 characters, https source, no em or en dash, no double
   hyphen, no quotation marks around titles, no run of 8 or more words copied from its source. Groups with a member born
   in 2008 or later get no age, birth, nationality or family explanation; a member's heritage resting on the parents'
   origin is never explained. Lineups and labels are dated and never give a departure or its reason. A shopping or
   affiliate guide is not a source.

E4-final.json is the published list. QUIZ-ISSUES-E4.md lists what the circuit found in the quizzes themselves: the 7 wrong
answers, all in player quizzes, become correction requests to their creators (`docs/pending-migrations/quiz-corrections-e4.sql`,
sources opened again on 2026-10-27). The raw notes of the writers and checkers stay out of this public repository.

## The SQL

Same guard as lots E1 to E3: every quiz still published, the question and right answer at each index exactly the checked
ones, else nothing is applied. Checked against the live quizzes on 2026-10-27: 188 of 188 rows match, and no row shares a
quiz and question with lots E1 to E3 or the Team quiz fixes. Tested on a local Postgres loaded with the live content of
the 39 quizzes: 188 rows, second run refused, rollback to 0, one edited question makes the whole lot refuse.
