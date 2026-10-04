# AU3 audit: hubs, creators, community, editorial (2026-10-04)

## Progress
- Done: setup, data reads, sweeps running.
- Next: feature table, issues, test write.
- Blockers: see "Test writes".

## Method
- Target: ORCH's flag-on production build of the feat/v12 head on http://localhost:3071, production data.
- Browser sweep (`AU3-sweep.mjs`, scratchpad, Playwright with the cached headless shell): every page at 1440 and
  390 light, every non-GET request answered locally (wider than `guardWrites`: any host, server actions included),
  console errors, responses >= 400, broken images, sideways scroll, Team tags counted. Screenshots
  `run/audit/AU3/<name>-<width>.png` (local only).
- `e2e/ux-v12/g8.spec.ts` re-run against :3071 (`G8_EXPECT=v12`, guardWrites in every test, signed in only through
  the setup project).
- Read-only SQL through supabase-js with the service role (selects and head counts only).
- Normalisation: `/s/<code>` on :3071 redirects to `http://localhost:3021/api/share/click/<code>` because the build
  bakes `NEXT_PUBLIC_SITE_URL`; the sweep rewrites that host to :3071 (environment, not a product issue).
