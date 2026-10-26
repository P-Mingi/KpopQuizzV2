# Personality on otakuquiz.org, part 2: the shared components speak anime (requests 5a to 5c of docs/o1/requests/PERS.md)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-pers2, branch o1/pers2 (= o1/integration, PERS merged).
Q = apps/quiz/src. Rules of docs/o1/briefs/PERS.md apply (rule 18, kpop unchanged: same client modules, chunk count, render tree).
Read this brief, request 5 of docs/o1/requests/PERS.md, Q/components/personality/about.tsx, quiz.tsx, Q/lib/ux-v1/a0/nav.ts, the
site vocabulary in Q/lib/site/registry.ts, and the code you change.
## Do
a. about.tsx: optional `words` (member, bias) and `pathFor(slug)` props, defaults today's; the anime page passes the vocabulary
   (character, oshi) and whichCharacterPath, and shows the "other series" block with the series that have a set.
b. quiz.tsx: the story image call to action and the oshi offer read the site (registry name and origin, vocabulary); on anime
   "Play at otakuquiz.org" and "set as oshi"; kpop unchanged.
c. nav.ts: /which-*-character-are-you marks the Series item active on anime (client module: prove the kpop chunks with the two
   kpop chunk scripts and the kpop render tree snapshot).
## Checks
Unit tests per change (kpop default output unchanged, anime words), tsc 0, full vitest green, check.sh ok, three builds, the two kpop
chunk scripts. One commit ("o1: PERS-2 ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back in 4 lines.
