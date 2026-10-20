# Fix of lot b, lane P1: kpop routes load a new client chunk; dash literals in tests
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-P1, branch o1/P1 (head 436bf21, base: its merge base with
o1/integration). Q = apps/quiz/src. Read this brief, `git diff $(git merge-base o1/integration o1/P1) o1/P1 --stat` and the files you change.
## Rules
- No production, no push, no connector, no supabase, vercel or gh. Never open or list ~/kpq-o1/secrets. Never edit docs/o1/**, scripts/o1/**.
  Write files with Bash only. Keep every anime change of P1. Do not create git worktrees or clones.
## Defect 1 (production comparison through the read-only proxy, 15 of 60 kpop pages)
Every kpop /q/<slug> page, /blindtest/group-bts, /kpop-demon-hunters-quiz and /which-bts-member-are-you now carry one more
`<link rel="preload" href="/_next/static/chunks/....js" as="script" fetchPriority="low"/>` in the head, and the head meta order shifts:
a kpop route now reaches a new client module (likely through the shared sign-in sheet reading the registry, PersonName or BiasTag tagIcon,
TeamTag, the passport or header components, or a new import in a 'use client' file). On kpop, every route must reach exactly the same
client modules as at the base. Keep anime-only code in modules the kpop routes never import (pass plain props from server parents, or
import anime pieces only from files under Q/app/sites/ or Q/components/passport-ui/ that kpop never reaches).
Proof: build the kpop site offline at the base files and at your head, one after the other in your worktree
(`/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/env.sh offline -- pnpm -C apps/quiz build`), and compare for the
kpop routes (app/(site)/q/[slug], app/(site)/[slug], app/(site)/blindtest/[mode], app/(site)/page) the client reference manifests under
apps/quiz/.next/server/app/ and the list of chunk files each route page loads (from .next/app-build-manifest.json or the route's
page_client-reference-manifest.js): identical sets. Write the comparison script once as apps/quiz/e2e/o1/P1/kpop-chunks.sh and report its output.
## Defect 2 (copy gate)
Three test files hold literal en and em dash characters in a regex: apps/quiz/src/components/passport-ui/passport-ui.site.test.ts,
apps/quiz/src/lib/passport-ui/copy.test.ts, apps/quiz/src/lib/passport-ui/settings-world.test.ts. Write them as – and — escapes.
## Checks
`pnpm -C apps/quiz exec tsc --noEmit` 0; `pnpm -C apps/quiz exec vitest run src/components src/lib src/app --testTimeout=120000` green;
anime build green; grep of the diff for literal en or em dash: none. Delete your apps/quiz/.next when done (the disk is nearly full).
Commit on o1/P1 ("o1: P1 fix kpop client graph"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 6 lines: sha, the cause, the fix, the chunk comparison result.
