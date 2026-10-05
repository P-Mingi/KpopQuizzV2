# Launch order (owner steps)

One Claude Code conversation, the worker, runs every mission in turn as orchestrator with its subagents: the v11
run (finished), then R1, then V12. Each mission starts with one message from the owner in that conversation.

## 1. R1: fix the live site, ship v11 (the flag stays off in production)

The worktree `../KpopQuizzV2-r1` (branch `r1/fixes`, no commits yet) already exists. Send to the worker:
```
New mission: R1. You are its orchestrator, in this same conversation. Read
/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/growth-v12/R1-RELEASE-PROMPT.md and execute it in full.
Your working copy is ../KpopQuizzV2-r1 (branch r1/fixes, already created). The v11 run is finished and its
:3021 server is off: the "W2 stopped" conditions are met and you may merge PR #66. I authorize what its section 0
lists, nothing more. The flag stays off in production. If docs/release/R1-STATE.md exists on main or on
r1/fixes, resume from its NEXT ACTION. Talk to me in French, short, no dashes.
```
During R1 you answer: the Supabase backup check, `go migrations`, later `go rls`, and any "applied <file>" if
it cannot run SQL itself.

Done already: `NEXT_PUBLIC_UX_V1` = `1` for Preview in Vercel (production stays off).

## 2. V12: build all of v12

As soon as R1 says DONE (done on 2026-10-01), open a NEW worker session in the main checkout, so the run
starts with an empty context:
```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2
claude
```
Paste:
```
New mission: V12. You are its orchestrator. In this main checkout
/Users/louis/IT/Dev/projects/KpopQuizzV2 run git fetch origin, then read
docs/design/growth-v12/V12-PROMPT-MULTIAGENT.md and execute it from Phase 0 (it creates feat/v12 from
origin/main). If docs/design/growth-v12/run/RUN-STATE.md exists on feat/v12, resume from its NEXT ACTION.
Never apply SQL without my exact "go <filename>". Talk to me in French, short, no dashes.
```
Create the 3 to 5 editorial accounts yourself (normal sign-up with your own mail aliases, names like Mina, Jae,
Sol) only when the editorial agent asks, and give their user ids. No agent creates them.
