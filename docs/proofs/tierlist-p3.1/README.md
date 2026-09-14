# TIERLIST phase 3.1 proofs (engage hardening)

Built on `next build` + `next start` (:3021), never dev. Live checks seeded via the service role and
TORE DOWN (final query [][], DB + bucket clean). See `docs/loop/REPORT.md`.

- `part0-probe.txt` - 147 applied, WITH a control (groups -> BTS proves the live DB).
- `live-verify.txt` - item 1 like idempotency (PK 409, trigger counter, logged-out 401 no-write);
  item 2 view RPC + 30/min throttle (27x200 / 13x429); item 3 cookie beats body (200 then 403);
  item 4 forged content-type rejected 400, real jpg 200. Teardown clean.
- `tests.txt` - 51 unit + 25 e2e passed / 7 skipped.
- `route-modes.txt` - /engage removed, /like + /view added; public/subject pages still ● ISR; no
  existing URL changed.
- `gates.txt` - docs-secrets + routes + indexability + orphans PASS; metadata-dupes reports only
  pre-existing verse dupes (no tier-list).
- `no-emoji.txt` - 0 emoji across 37 phase-3.1 files.
