# Manhwa label on quiz cards and rails (follow-up of MANHWA.md)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-manhwa, branch o1/manhwa (at o1/integration). Q = apps/quiz/src.
Rules of docs/o1/briefs/MANHWA.md apply (kpop unchanged: same client modules, same chunk count; no shared kpop query changes).
Read this brief, Q/components/anime/register-art.tsx, dress-quiz-card.tsx, Q/lib/ux-v1/a0/group-photos.ts (the SERIES_ART slot),
Q/lib/anime/manhwa.ts and the code you change. Never `git add -A`; add files by path.
## Do
Quiz cards and rails on otakuquiz.org name a series by slug (group_slug). Show the "Manhwa" label on them through the anime-only
SERIES_ART dress (dressQuizCard already receives the slug), from a map slug to type that comes from the data, not a slug list typed
by hand: either the series rows the anime layout already loads, or a module generated from docs/anime/data/series/*.json by a
script with a test that the generated map equals the data (choose the one that stays correct when a series is added). Same label
and copy key as the series page.
## Checks
Unit tests (the three manhwa cards labelled, others not; the map equals the data). tsc 0, vitest of touched folders green,
check.sh ok, anime build green, the two kpop chunk scripts against the base. One commit ("o1: Manhwa label on quiz cards").
Hand back at most 4 lines: sha, files, where the label shows now, checks.
