# C2 backend check (UX v11.2 run, Phase 3, loop 1)

Checker: C2 (backend). Branch `ux11/c2-check`. Target: the shared flag-on production build of
`feat/ux-v1-v11` served by ORCH on http://localhost:3021 (48189d5 at spawn, rebuilt at dcc3159 with P8
merged; every row below that cites a :3021 proof taken after 16:00 UTC is on dcc3159). Flag off: my own
`next dev` of the same head on :4202 with `NEXT_PUBLIC_UX_V1=0` (stopped after use). Flag-on dev (for the
nested route check only): `next dev` on :4202 with `NEXT_PUBLIC_UX_V1=1`.

Method (C2.md + CHECKERS.md):
- Each WIRING-MAP row (old tables + v10 + v11), corrected by WIRING-MAP.verified.md, has one file
  `R<line>.md` (row id = the row's line number in WIRING-MAP.md, as the run already cites rows).
- Controls are triggered in headless Chromium 1234 (guest, and the test user through the Playwright
  `setup` project storage state) with a copy of `guardWrites`: every POST/PUT/PATCH/DELETE to /api/** or
  Supabase is answered locally with 200 {} and recorded; its payload is the write evidence. Reads go
  through and are logged with their status. No production write was sent.
- Database side: read-only `select` through supabase-js with the service role (`c2tmp/q.mjs`, scratch,
  not committed), limited to the test user's rows or to head counts. Never insert/update/delete/rpc.
- Pages never loaded signed in: /me, /profile (write on view).
- Fail-soft routes that need an unapplied migration are probed with a body that passes validation, only
  after a read-only check that the table does not exist (so no write is possible): they must answer 503
  before any write. Verdict for such rows: "NOT VERIFIED until <migration>" with the fail-soft proof.
- Flag off: every endpoint added since main answers 404 (one exception filed: C2-001), the new pages are
  301/404, and flag-off pages send no request to a v11 endpoint (`proofs/flag-off-*`).
- Data guard before and after (`proofs/data-guard-before.json`, `proofs/data-guard-after.json`).

Verdicts: PASS, FAIL (issue filed in `v11/issues/<owner>.md`), NOT VERIFIED (why), PENDING (P2 not merged:
/quizzes rows), N/A (dropped by design).

`gen.mjs` builds the row files and this README from `rows/*.json`.
