# Verified explanations, lot E2 (SEO strategy of 2026-10-27)

197 explanations, each with its source, for 40 quizzes. Every quiz of the lot had no
explanation at all and was listed "Crawled" or "Discovered, currently not indexed" in the Search Console export of
2026-10-13; among those, the most played first. Quizzes going to draft, opinion polls, lyrics quizzes, quizzes not in
English and picture or intruder quizzes were left out. SQL: `docs/pending-migrations/seo-explanations-e2.sql` and its
rollback, applied by Claude only on the owner's go, after `seo-quiz-explanations.sql`. Nothing in the quizzes changes.

## The circuit (same as lot E1)

1. Four writers (rules: ../e1/EXPLAIN-BRIEF.md): 240 questions. Writer verdicts: ok 201, ambiguous 13, out_of_rules 12, answer_wrong 12, unverifiable 2.
2. Four independent checkers (../e1/VERIFY-EXPL-BRIEF.md): OK 180, CONFIRMED 38, FIX 16, DROP 5, OVERTURNED 1.
3. The dedicated recheck of every flagged point (../e1/RECHECK-EXPL-BRIEF.md): 17 points, keep 11, rewrite 6.
   Reports in French: E2-recheck-ABD.md and E2-recheck-C.md.
4. A last independent reading of the 6 rewritten texts: all OK.
5. Format checked by script on every published text: 60 to 220 characters, https source, no em or en dash, no double
   hyphen, no quotation marks around titles, no run of 8 or more words copied from its source. Groups with minors get no
   age, birth, nationality or family explanation; birth names and birthplaces appear only for adults, as their sources
   show them.

E2-final.json is the published list. QUIZ-ISSUES-E2.md lists what the circuit found in the quizzes themselves. The raw
notes of the writers and checkers stay out of this public repository.

## The SQL

Same guard as E1: every quiz still published, the question and right answer at each index exactly the checked ones,
else nothing is applied. Checked against the live quizzes on 2026-10-27: 197 of 197 rows match. Tested on a local
Postgres loaded with the live content of the 40 quizzes: 197 rows, second run refused, rollback to 0, one edited
question makes the whole lot refuse.
