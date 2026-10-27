# Content, lane K1: final verification of every new or changed question (owner, 2026-10-25)
Worktree: the one named in your prompt (a branch made from o1/integration). D = docs/anime/data. Your share of quizzes is in your prompt.
Read this brief, docs/o1/briefs/K1-series.md (sources and rules), and for each quiz of your share: the quiz file, the facts it cites
(D/facts/<slug>.json) and the pages those facts cite. Nothing else.
## Rules
No push, no production, no connector; never open ~/kpq-o1/secrets; database writes on o1-scratch only. No en or em dash, no emoji.
Never `git add -A`; files by path. Allowed sources only (Wikipedia with revision id, Wikidata, official, publisher, studio, Oricon for
sales, ANN for announcements); never MyAnimeList, Fandom, Jikan.
## For every question of your share
1. Open (WebFetch) the page each cited fact names, at the cited Wikipedia revision when there is one, and confirm with your own eyes:
   the fact's value and its excerpt are on that page; the question's right answer follows from it; every wrong answer is really
   wrong; nothing in the question can become false (a running figure carries its date).
2. A fact that is a date, a count or a creator (load_bearing per docs/o1/contracts/formats.md) needs 2 sources, one Wikidata or
   official (or the press rule): if it has one source, find the second or mark it load_bearing true and draft, and replace the
   question. A revision id or Wikidata QID that does not exist or does not carry the value: fix it from the page you opened.
3. Spoilers: a character whose spoiler level was lowered to silence a check (for example Yui in Sword Art Online, Shion in Slime)
   gets the level the series data says; the question is retagged or replaced.
4. Not 100% sure of any point: replace the question by one that you have proven on a page you opened (same quiz, same format), with
   its fact verified as C2 says. Never leave a doubtful question.
## Output
D/verify/<share>.json: one entry per question: quiz file, index, verdict (ok, fixed, replaced), the URL you opened, and for fixed or
replaced the reason in one line. Checks: `node scripts/anime/editorial/check.mjs D` 0 fail; node tests green; load D on o1-scratch.
Commit per 10 quizzes ("o1: K1 verify <share> ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 6 lines: sha, questions checked, ok, fixed, replaced (with the main reasons), checks.
