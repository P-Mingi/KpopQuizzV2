# Launching W3 (owner steps)

W2 keeps running. Nothing below touches W2's checkout, branches or worktrees.

## 1. Create the W3 worktree (terminal, once)

```bash
cd /Users/louis/IT/Dev/projects/KpopQuizzV2
git fetch origin
git worktree add --no-track -b feat/growth-w3 ../KpopQuizzV2-w3 origin/main
cd ../KpopQuizzV2-w3
claude
```

`--no-track` keeps the branch from following main. Export the same test env as for W2 before `claude`
(`UX_V1_TEST_EMAIL`, `UX_V1_TEST_USER_ID`) if you want the signed-in checks.

## 2. Paste this into the new session

```
You are the W3 orchestrator. Your working directory is the git worktree ../KpopQuizzV2-w3 on the branch
feat/growth-w3, created from origin/main. Read
/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/growth-v12/W3-PROMPT-MULTIAGENT.md from disk
(never run git inside /Users/louis/IT/Dev/projects/KpopQuizzV2) and execute it from Phase 0. If
docs/growth/RUN-STATE.md exists on your branch, this is a resume: follow section 4b and continue from
NEXT ACTION. Another run, W2, is active in the same repository: sections 0 and 3 are absolute. Never
apply SQL without my exact "go <filename>". Push only your own branches, always with an explicit
branch name. Talk to me in French, short, no dashes.
```

To resume after a stop: open `claude` again in `../KpopQuizzV2-w3` and paste the same block.

## 3. Tell W2 (once W3 is launched)

Paste the block from `MESSAGE-TO-W2.md` into the W2 session. It is information only; W2 keeps its plan.

## 4. During the run

- W3 will show you the SQL files one by one with what they do. Type `go <filename>` for each one you
  accept. Nothing reaches the database before that.
- After `go w3-t1-bt-runs.sql` and a green preview: set `NEXT_PUBLIC_BT_TRACKING=1` on Vercel production
  when you merge.
- You merge `feat/growth-w3` into main yourself. If W2 merges first, W3 merges main into its branch.
