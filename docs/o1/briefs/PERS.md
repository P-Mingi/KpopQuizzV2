# Personality on otakuquiz.org: the engine of KpopQuiz with character profiles written by us (owner, 2026-10-26)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-pers, branch o1/pers (= o1/integration). Q = apps/quiz/src,
D = docs/anime/data. Read this brief, docs/o1/briefs/LD.md (rule 18, kpop render tree), Q/lib/personality/*, the kpop page
Q/app/(site)/personality/[group]/page.tsx and its anime twin Q/app/sites/[site]/(anime)/which-character/[group]/page.tsx,
personality_profiles in docs/o1/contracts/schema.sql (site_id, character_id exist), scripts/anime/k1/data-load.mjs,
apps/quiz/e2e/o1/L1/content-sql.mjs and the code you change.
## Rules
No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets. SQL only on o1-scratch (and o1-dev by
the loader). No en or em dash, no emoji. Never `git add -A`; files by path. Never edit docs/o1/contracts/** (requests in
docs/o1/requests/PERS.md). kpopquiz.org unchanged: same client modules and chunk count (the two kpop chunk scripts); the kpop
personality page and engine keep today's output for kpop data. No image of the work: characters show the existing initials tile
or the series art (Q/components/anime/series-art.tsx), never a picture.
## Do
1. Data: D/personality/<series-slug>.json, one personality quiz per series in the shape the engine reads from personality_profiles
   (questions, answers with trait weights, one profile per character: character slug from D/series, a profile text written by us,
   traits). Write its JSON schema next to the series fixture schema (in scripts/anime, not in contracts) with a validator and tests.
2. Loader and launch: data-load.mjs and content-sql.mjs write those rows (site_id anime, character_id resolved from the slug),
   idempotent, in the launch files (a new generated file or the catalogue one; say which and give the SQL-ORDER line in the
   requests). The editorial check gains what it needs to check these files (C1 schema, C3 characters exist, C5 spoiler level of
   each character profile against the quiz's arc, C12 voice) without weakening any check.
3. Page: /which-{series}-character-are-you on the anime build renders from those rows with the kpop engine and components
   (rule 18), canonical pretty URL, indexable like the kpop page, linked from the series hub only when the series has a set.
4. One complete example set for Death Note (6 characters, 8 questions) to prove the path end to end; the 10 real series come in
   the content lot after this one.
## Checks
Unit tests (schema, loader rows, check rules, page with a set and without one, kpop personality unchanged); tsc 0; full vitest green
(--testTimeout=30000 if loaded); check.sh ok; anime, hub and kpop builds green; the two kpop chunk scripts; load on o1-scratch twice;
the example page rendered on o1-dev (screenshot in docs/o1/reports/PERS/).
Commits on o1/pers ("o1: PERS ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 8
lines: sha, files, data path, launch file, checks, what the content lot must know.
