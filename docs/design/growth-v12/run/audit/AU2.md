# AU2 audit: play modes on real data (2026-10-04)

Progress: Which member and the KPop Demon Hunters quiz done; Name them all, This or that and Fans picked in progress.

Target: ORCH's flag-on production build of feat/v12 (a247dee code) on http://localhost:3071, production data.
Screenshots: `run/audit/AU2/` (local only), `d-` = 1440 light, `m-` = 390 light. Raw run data: `run/audit/AU2/*.json` (local).
Method: scratch Playwright scripts (system Chromium headless shell 1234), every non-GET to `/api/**` or Supabase
answered locally (guardWrites semantics), except the two owner-approved writes listed under "Test writes".

## Normalizations (not issues)
- Every page logs `SyntaxError: Unexpected token '<'`: the Vercel Analytics and Speed Insights scripts
  (`/_vercel/insights/script.js`, `/_vercel/speed-insights/script.js`) do not exist on a local build and the
  middleware 301s them to `/` (HTML). Served by the platform on Vercel. Seen on `/` too, so not a v12 page error.
- `/api/duel/pairs` is rate limited per voter (about 20 requests per window, in memory): my first probe of the 84
  groups with one anon id returned `pairs: []` after 20 groups. With a fresh anon id per group all 84 answer.
