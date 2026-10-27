# Admin images on otakuquiz.org, part 3: join the server and the UI, prove it on o1-dev
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-adm, branch o1/adm (= o1/integration + ADM back 7aa6365 + ADM front
b13e76d, merged clean). Q = apps/quiz/src. Briefs ADM-back.md and ADM-front.md (same folder) and their rules apply. Read them,
docs/o1/requests/ADM.md and ADM-front.md, Q/app/api/admin/images/**, Q/lib/anime/entity-images-api.ts, entity-images-rules.ts and the
code you change. Never `git add -A`; files by path. Never print a sign-in link, token, key or password.
## Do
1. The UI calls the real routes and shapes of part 1 (paths, methods, JSON content type, `{ error, code }`); delete every guessed
   path; one typed client module, with tests against the real route handlers (not a mock of the guess).
2. Cache: one scheme for both sides. Writes revalidate exactly the tags the display reads (per slug and any list tag the UI uses).
3. 2x: the display uses the 2x file as srcset when present (naming from part 1).
4. Focal point on the personality result: an optional position prop on the shared ResultCard (rule 18: default keeps kpop byte for
   byte; prove it with the kpop render tree snapshot and the two kpop chunk scripts).
5. Signed out on /admin: keep the middleware redirect to /login (no information is shown); signed-in non admin: 404.
## Prove on o1-dev (scripts/o1-tools/dev-up.sh, dual fixture as the test admin for the run only)
Upload a file, import a URL (an allowed source), set a focal point, remove; each time check the series hub, a card and (for a
character) the personality result show the right image. Screenshots in docs/o1/reports/ADM/real-*.png: the list, an open series, an
upload in progress, light and dark. Remove every test image from o1-dev at the end (rows and files).
## Checks
tsc 0, full vitest green (--testTimeout=30000), check.sh ok, three builds, two kpop chunk scripts; the e2e specs of part 1 still pass.
Commits on o1/adm ("o1: ADM join ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 6 lines.
