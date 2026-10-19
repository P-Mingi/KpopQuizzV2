# Lot (d), lane LD: fanquiz.org, the network page (one page)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-LD, branch o1/LD. Q = apps/quiz/src. Read this brief, the code you
change, Q/lib/site/registry.ts (NETWORK, SITE, vocabulary) and Q/lib/passport/types.ts; nothing else.
## Rules
- Never push, never touch production, never use a connector or the supabase, vercel or gh commands. Never open ~/kpq-o1/secrets.
- Never edit tests, gates, docs/o1/contracts, scripts/o1, Q/middleware.ts, apps/quiz/next.config.ts. No en or em dash, no emoji.
- Rule 18: the page reuses Q/components/ux-v1/page.tsx, section-header.tsx and panel.tsx (and any kpop component through an optional
  prop whose default keeps kpopquiz.org byte for byte). No copy of a kpop component. No Tailwind utility word in a new file; new CSS only
  in Q/styles/sites/hub/h1.css, every selector starting `html.ux-v1[data-site="hub"]`, classes hub-h1-*, locals --hub-*.
## The page: Q/app/sites/[site]/home-hub.tsx (served at / on the hub build; today a codemod copy of the kpop /about page)
1. Hero: h1 and lede (keys hub.h1 home.h1, home.lede). One line on what FanQuiz is: the home of one account shared by the fan quiz sites.
2. Sites (home.sitesTitle): one card per NETWORK entry other than the hub (kpopquiz.org, otakuquiz.org): name, one-line pitch from the
   registry, accent token of that site, a link "Open" (home.cardOpen) to the site origin from the registry, never a hardcoded URL.
3. What your passport shares (home.sharesTitle, then one key per line under shares.*): what the other sites see (username, avatar,
   level if public, the sites you joined) and what they do not (email, sign-in methods, private history). The same keys render the block on
   Q/app/sites/[site]/privacy/page.tsx for the hub, so both read word for word the same: add a test that compares them.
4. Account: signed out, a sign-in button that opens the sign-in sheet the shell already has; signed in, "Your passport" with the
   username, level and the sites joined (world_memberships through the existing server Supabase client; on any error, show the signed
   out view) and a link to /passport.
5. Metadata: title and description from the copy, canonical https://fanquiz.org/ from the registry, index allowed on the home only.
- Copy file Q/copy/hub/h1.ts, shape `export const COPY = { 'home.h1': '...' }`, full keys hub.h1.<key>. Plain fan-made voice, short lines.
## Checks (all must pass; never weaken a test)
1. Unit tests next to the code: the sites list comes from NETWORK (no literal origin in the page), the shares block of the home equals the
   privacy one, signed out and signed in renders (mocked Supabase), error falls back to signed out.
2. `pnpm -C apps/quiz exec tsc --noEmit` 0 errors; `pnpm -C apps/quiz exec vitest run <your tests>` green;
   `/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/check.sh $PWD` ok.
3. Hub build: `/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1/env.sh offline -- env NEXT_PUBLIC_SITE_ID=hub
   pnpm -C apps/quiz build` green (the page must render with an unreachable database: signed out view).
Commit on o1/LD ("o1: LD ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: last sha, files changed (count), the checks with results, open issues.
