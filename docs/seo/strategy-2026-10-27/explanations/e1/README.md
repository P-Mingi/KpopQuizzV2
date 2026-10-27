# Verified explanations, lot E1 (SEO strategy of 2026-10-27, phase 0 point 3)

233 explanations, each with its source, for 38 quizzes of the Search Console list "Crawled,
currently not indexed" (export of 2026-10-26, 41 /q/ pages). SQL:
`docs/pending-migrations/seo-explanations-e1.sql` and its rollback, applied by Claude only on the
owner's go, after `seo-quiz-explanations.sql` (the table). Nothing in the quizzes changes: the
explanations live in `quiz_explanations`, beside the creator's questions.

## Scope

| | Quizzes | Questions |
|---|---|---|
| Search Console list | 41 | 322 |
| Set aside: blackpink-easy-quiz (in Swedish, no native reviewer) and k-pop-dating-and-relationships-verified-facts-only (dating lives of real people) | 2 | 16 |
| Written and checked | 39 | 306 |
| Skipped at the check: itzy-the-crazy-in-love-era (rewritten by its fix, #133; explained after that fix is applied) | 1 | 10 |
| Published by this lot | 38 | 233 |

## The circuit (same as the daily bank lots)

1. Four writers (EXPLAIN-BRIEF.md): one record per question, verdict and, when the answer is
   proven, an explanation of 60 to 220 characters with an allowed source (official sites,
   Wikidata, MusicBrainz, Wikipedia, Circle, Billboard, bylined outlets; never Soompi, allkpop,
   kprofiles, Fandom or namu.wiki). Writer verdicts: 243 ok, 21 answer_wrong, 16 ambiguous,
   11 unverifiable, 15 out_of_rules.
2. Four independent checkers (VERIFY-EXPL-BRIEF.md), each answering the question from the pages
   before reading the writer: 195 OK, 39 FIX, 5 DROP, 57 non-ok verdicts confirmed, 0 overturned,
   10 skipped (ITZY).
3. The dedicated recheck (RECHECK-EXPL-BRIEF.md, owner's rule: every flagged point proved on a
   page the agent opened, anything not 100 % sure rewritten or dropped): 40 points, 21 kept,
   18 rewritten, 1 dropped. Reports in French: E1-recheck-ACD.md and E1-recheck-B.md.
4. A last independent reading of the 18 rewritten texts: 17 OK, 1 fixed (it named part of the
   answer of another question of the same quiz).
5. Format checked by script on every published text: 60 to 220 characters, https source, no em
   or en dash, no double hyphen, no quotation marks around titles, no run of 8 or more words
   copied from its source. Birth dates appear only for adults and only as Wikipedia gives them.

E1-final.json is the published list (quiz id, slug, question index, question and right answer as
checked, explanation, source). QUIZ-ISSUES-E1.md lists what the circuit found in the quizzes
themselves (wrong answers, out-of-rules questions); no quiz was changed. The writers' and
checkers' raw notes stay out of this public repository: some quote minors' personal data from
the pages they had to read to reject those questions.

## The SQL

- Guard: every quiz is still published, and the question and right answer at each index are
  still exactly the ones checked. If a creator edited one question since 2026-10-27, nothing is
  applied and the lot is regenerated (`gen-expl-sql.py`).
- A second run fails on the primary key and changes nothing; the rollback deletes the lot's rows
  only.
- Tested on a local Postgres loaded with the live content of the 41 quizzes (2026-10-27): 233
  rows for 38 quizzes, second run refused, rollback to 0, one edited question makes the whole lot
  refuse, the public role reads the 233 verified rows and cannot write.

Phase 1 shows an explanation only while the live question and right answer still match the
`question` and `answer` stored with it.
