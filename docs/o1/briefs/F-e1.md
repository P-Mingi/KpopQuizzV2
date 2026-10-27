# Lot f, lane E1a: E1 minimal, the content checks C1 to C14 and the HTML review packet
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-E1a, branch o1/E1a. C = docs/o1/contracts. Read this brief,
docs/o1/briefs/E1a.md (the full definition of the checks; ignore its items 3 and 5), C/formats.md, C/schemas/*.json,
C/fixtures/series-fixture.schema.json and C/fixtures/series/death-note.json; nothing else.
## Rules
- No production, no push, no connector, no supabase, vercel or gh. Never open ~/kpq-o1/secrets. No network call in tests.
- Files only under scripts/anime/editorial/** and docs/anime/editorial/**. Write files with Bash, never the Write or Edit tools.
- No en or em dash, no emoji. No image field anywhere, no artwork.
## The content it checks (written by the K1, K2 and K3 lanes)
- docs/anime/data/series/<slug>.json: the series-fixture shape without quizzes (group, series, arcs, characters, themes).
- docs/anime/data/facts/<slug>.json: facts per C/schemas/fact.schema.json (value, entity, sources with URL, Wikipedia revision id when
  the source is Wikipedia, fetched_at, status), plus the source text excerpt used by the copy guard (C7).
- docs/anime/data/quizzes/<slug>/<quiz-slug>.json (quiz draft per the schema) and docs/anime/data/daily/<batch>.json (daily bank rows).
## Do
1. `node scripts/anime/editorial/check.mjs <file or folder>...`: runs C1 to C14 (as E1a.md lists them) on each file of the kinds above,
   with the facts of the same series loaded for C4 (every answer backed by a cited fact) and C7 (copy guard), and the whole corpus for C9
   (dedupe). Exit 0 only when nothing fails. JSON report with --json. Thresholds in the file header.
2. `node scripts/anime/editorial/packet.mjs --batch <name> <files...> --out docs/anime/editorial/packets/<name>.html`: one self-contained
   HTML file (no external asset), readable on a phone: summary counts, every flagged item first with its failing checks, then a 25 percent
   sample drawn with a seed printed in the page; each quiz question shows its answer and options next to the cited facts and source links;
   each series shows its facts with their sources. Plain HTML and CSS, no script needed to read it.
3. Fixtures and `node --test scripts/anime/editorial/`: each check has one passing and one failing fixture; a Death Note quiz built from 9
   sourced facts passes all; a copied source sentence fails C7; a spoiler mismatch fails C5.
Commit on o1/E1a ("o1: E1a ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: sha, the 2 exact commands, test results, thresholds chosen, anything the contract left open.
