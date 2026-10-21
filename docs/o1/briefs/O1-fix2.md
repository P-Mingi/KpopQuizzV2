# Fix of lot a, lane O1: kpop /bts-name-all-members changed in the production comparison
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-O1, branch o1/O1 (head 043b2a5, base 894cb7c). Q = apps/quiz/src.
Read this brief, `git diff 894cb7c 043b2a5` of the name-all files (Q/components/name-all/about.tsx, game.tsx, Q/lib/name-all/words.ts,
Q/app/sites/[site]/(anime)/name-all/[group]/page.tsx and their tests) and the code you change; nothing else.
## Rules
- No production, no push, no connector, no supabase, vercel or gh. Never open or list ~/kpq-o1/secrets. Never edit an existing test or gate,
  docs/o1/**, scripts/o1/**. Write files with Bash only. No en or em dash, no emoji. Keep every anime change of lot a.
## The defect (production comparison through the read-only proxy)
On kpopquiz.org /bts-name-all-members (status 200 on both sides) the head meta tags come in another order (base: theme-color light,
theme-color dark, color-scheme, next-size-adjust; head: next-size-adjust first), a client reference row (I[...]) moves earlier in the Flight
payload, and the page is 86 bytes shorter. The HTML snapshots of lot a did not see it: what changed is the module graph or the client
boundary (for example a new import in the client component game.tsx, or words.ts pulling the registry into a client bundle), or a page
export (metadata, viewport, dynamic) on the kpop route.
## Fix
On the kpop path the name-all page must produce today's output: same client boundaries and imports reached from kpop's page, same page
exports, same element tree. Give the anime words to the client component as plain props from its server parent, or keep the anime code in
a module the kpop page never imports. Prove it:
1. Q/lib/o1-flight-tree.ts snapshot of the kpop name-all page tree and of the props passed into game.tsx, made from the base files
   (`git checkout 894cb7c -- <files>`, write, then back to your version), equal.
2. Build the kpop site offline twice, at 894cb7c and at your head (S=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1;
   `S/env.sh offline -- pnpm -C apps/quiz build`, in a temporary copy of the worktree or with git stash of nothing: use `git worktree`-free
   means, for example two clones of the files into /tmp is not allowed; instead compare the client reference manifest of the name-all
   route, apps/quiz/.next/server/app/(site)/[slug]/page_client-reference-manifest.js, and the route's chunk list from the build output of
   base and head built one after the other in your worktree): identical.
3. `pnpm -C apps/quiz exec tsc --noEmit` 0; `pnpm -C apps/quiz exec vitest run src/components src/lib` green; anime build green.
Commit on o1/O1 ("o1: O1 fix name-all kpop output"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 6 lines: sha, the cause, the fix, the proofs.
