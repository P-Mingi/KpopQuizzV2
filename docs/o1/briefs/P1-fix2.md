# Fix of lot b, lane P1: two copies of kpop components (rule 18) without changing kpop's client graph
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-P1, branch o1/P1 at o1/integration. Q = apps/quiz/src,
S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1. Read this brief and the files named; nothing else.
## Rules
- No production, no push, no connector, no supabase, vercel or gh. Never open or list ~/kpq-o1/secrets. Never edit an existing test or gate,
  docs/o1/**, scripts/o1/**, never rewrite a snapshot. Write files with Bash only. No en or em dash, no emoji. Never override core.hooksPath.
## The defect (`S/check.sh $PWD` on o1/integration)
- Q/components/passport-ui/login-body.tsx copies Q/app/(site)/login/page.tsx (58 lines).
- Q/components/passport-ui/world-settings.tsx copies Q/components/profile/ux-v1/settings.tsx (283 lines) and a block of
  Q/components/layout/ux-v1/ux-appearance-setting.tsx.
They were copied to keep kpop routes from reaching new client modules (an earlier production comparison refused a preload link added to kpop
pages). Both constraints hold: no copy, and kpop pages unchanged.
## Fix
Reuse the kpop components: the anime pages render Q/components/profile/ux-v1/settings.tsx, the kpop login body (moved to a shared component
if it is page-local) and ux-appearance-setting.tsx, with optional props whose defaults keep kpop byte for byte. Anything the anime site adds
lives in world-only modules that the kpop components load with next/dynamic only when the prop is set: never rendered on kpop, so never
preloaded there. Delete the two copies.
## Proofs (all must pass)
1. `S/check.sh $PWD`: twins ok (0 violations).
2. The existing kpop snapshot and Flight-tree tests pass unchanged (P1, O1 and B6 ones).
3. A kpop render with a fake Supabase (the way the earlier name-all fix did) of /login, /settings and one /q/<slug> page at the base
   (o1/integration) and at your head: the HTML is identical apart from build id and chunk file names, in particular the same list of
   <link rel="preload"> and <script> tags in the head.
4. `pnpm -C apps/quiz exec tsc --noEmit` 0; `pnpm -C apps/quiz exec vitest run src/components src/lib src/app --testTimeout=120000` green;
   anime and hub builds green. Delete apps/quiz/.next when done.
Commit on o1/P1 ("o1: P1 reuse the kpop settings and login, no copy"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 6 lines: sha, how each copy was removed, the proofs.
