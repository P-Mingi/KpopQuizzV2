# Verified explanations, lot E3 (SEO strategy of 2026-10-27)

239 explanations, each with its source, for 40 quizzes. No quiz of the lot had any explanation. 34 of them were listed
"Crawled" or "Discovered, currently not indexed" in the Search Console export of 2026-10-13: with lots E1 and E2, that
covers every quiz of that list that had no explanation, apart from those left out below. The other 6 are the most played
quizzes without any explanation outside that list. Quizzes going to draft, opinion polls, lyrics quizzes, quizzes not in
English and picture or intruder quizzes were left out. SQL: `docs/pending-migrations/seo-explanations-e3.sql` and its
rollback, pasted by the owner after `seo-quiz-explanations.sql`, then checked by Claude. Nothing in the quizzes changes.

## The circuit (same as lots E1 and E2)

1. Four writers (rules: ../e1/EXPLAIN-BRIEF.md): 282 questions. Writer verdicts: ok 243, unverifiable 12, ambiguous 10, out_of_rules 9, answer_wrong 8.
2. Four independent checkers (../e1/VERIFY-EXPL-BRIEF.md): OK 224, CONFIRMED 39, FIX 17, DROP 2.
3. The dedicated recheck of every flagged point (../e1/RECHECK-EXPL-BRIEF.md): 19 points, keep 11, rewrite 6, drop 2.
   The two drops are questions of a quiz on song titles shared by five acts: no single allowed page proves the title for
   all five. Reports in French: E3-recheck-AB.md and E3-recheck-CD.md.
4. A last independent reading of the 6 rewritten texts: all OK.
5. Format checked by script on every published text: 60 to 220 characters, https source, no em or en dash, no double
   hyphen, no quotation marks around titles, no run of 8 or more words copied from its source. Groups with minors get no
   age, birth, nationality or family explanation; birthplaces appear only for adults, as their sources show them.
   Lineups are dated and never give a departure or its reason.

E3-final.json is the published list. QUIZ-ISSUES-E3.md lists what the circuit found in the quizzes themselves: the 8 wrong
answers, all in player quizzes, become correction requests to their creators (`docs/pending-migrations/quiz-corrections-e3.sql`,
sources opened again on 2026-10-27). The raw notes of the writers and checkers stay out of this public repository.

## The SQL

Same guard as E1 and E2: every quiz still published, the question and right answer at each index exactly the checked
ones, else nothing is applied. Checked against the live quizzes on 2026-10-27: 239 of 239 rows match, and no row shares a
quiz and question with lot E1, lot E2 or the Team quiz fixes. Tested on a local Postgres loaded with the live content of
the 40 quizzes: 239 rows, second run refused, rollback to 0, one edited question makes the whole lot refuse.
