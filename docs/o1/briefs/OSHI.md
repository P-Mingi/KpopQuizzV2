# "Set as oshi" on otakuquiz.org, like the bias on KpopQuiz (owner, 2026-10-26)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-oshi, branch o1/oshi (= o1/integration). Q = apps/quiz/src.
Read this brief, docs/o1/briefs/LD.md (rule 18, kpop rules), how the bias works on kpop (Q/components/personality/quiz.tsx biasOffer,
the save path in Q/lib/personality/save.ts, the profile display), favourite_characters in docs/o1/contracts/schema.sql (011, RLS own
rows), Q/lib/network/profile.ts (profileForSite), Q/components/hub/hub-shares.tsx and the passport code that shares data, and the code
you change.
## Rules
No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets. SQL only on o1-scratch, and only if
truly needed (then a pending migration with rollback and a request for review R; prefer the existing favourite_characters table).
No en or em dash, no emoji. Never `git add -A`. kpopquiz.org unchanged (two kpop chunk scripts, kpop render tree).
## Do
1. On the anime result page, the offer "Set as oshi" (already worded by PERS-2) is on: a signed-in fan saves the character as their
   oshi for that series, stored per site (anime only), like the bias on kpop; signed out: the sign-in sheet, as kpop does.
2. The oshi shows on the fan's OtakuQuiz profile only (the oshi slot of the anime profile, vocabulary pickLabel "Oshi").
3. Never shared by the passport: not in HubShares, not on fanquiz.org, not on kpopquiz.org, not in any cross-site payload. A test
   proves each of these.
## Checks
Unit tests (save, show on the anime profile, absent everywhere else, signed out), tsc 0, full vitest green, check.sh ok, three builds,
the two kpop chunk scripts; one e2e on o1-dev with the dual fixture (save, see it on the anime profile, absent on hub and kpop).
One commit ("o1: OSHI ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back in 5 lines.
