# Manhwa label on otakuquiz.org (owner, 2026-10-25)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-manhwa, branch o1/manhwa (= o1/integration). Q = apps/quiz/src.
Read this brief, docs/o1/briefs/LD.md (rule 18 and the kpop render tree rules apply), the anime series page, series card and
series list components (find them from Q/app/sites/[site]/(anime)/series), Q/lib/anime/*, docs/anime/data/series/solo-leveling.json,
tower-of-god.json, omniscient-readers-viewpoint.json and the code you change. Nothing else.
## Rules
No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets; no en or em dash, no emoji. Never
edit docs/o1/contracts/**, scripts/o1/**, middleware, next.config. kpopquiz.org unchanged: same client modules on every route
(apps/quiz/e2e/o1/P1/kpop-chunks.sh) and same chunk count (apps/quiz/e2e/o1/O2/kpop-chunk-count.sh) against the base.
## Do
- A series whose `series.type` is `webtoon` (Korean webtoon: Omniscient Reader's Viewpoint, Solo Leveling, Tower of God) shows the
  label "Manhwa" on its series page (header), on its cards (wherever a series card or quiz card names the series) and in the series
  list. Derive it from the data (type webtoon), never from a list of slugs. Copy key in the anime copy file.
- On the series page of a manhwa that has an anime (the series data says so: anime years or seasons), one line says the anime is an
  adaptation of the manhwa, e.g. "The anime adapts the manhwa (Korean webtoon) <title>." from the data. ORV has no anime: no line.
- No new series, no data change beyond what the label needs (if the type must reach the database, use the existing column or say
  what is missing in the hand-back; no SQL in this lot).
## Checks
Unit tests: the label on the three manhwa and on no other series; the adaptation line on Solo Leveling and Tower of God only.
tsc 0; vitest of the touched folders green; `/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/check.sh $PWD` ok;
anime build green (`/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/env.sh offline -- env NEXT_PUBLIC_UX_V1=1
NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_SITE_ID=anime pnpm -C apps/quiz build`); the two kpop chunk scripts.
One commit ("o1: Manhwa label"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 5 lines:
sha, files, where the label shows, checks.
