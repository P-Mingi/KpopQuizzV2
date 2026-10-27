# Run O1 SQL: multi-site, passport, OtakuQuiz and FanQuiz

Every file here is written by a run O1 lane and applied to production only by the owner, after a backup, in the
order of `docs/o1/contracts/manifest.md` (BACKLOG section 4.4). Nothing in this folder has been applied to production.

- `NNN-<topic>.sql` with its `NNN-<topic>.rollback.sql`: schema, functions, policies (idempotent, header: what, why,
  rows, verify, undo). A file that must run outside a transaction (CREATE INDEX CONCURRENTLY, one statement) says
  `-- o1-transaction: none` in its header.
- `launch/LNN-<lane>-<topic>.sql`: rows, applied on launch day only (Verrou 0: no anime or hub row before launch).
- On the dev branches `o1-scratch` and `o1-dev`, files are applied by `scripts/o1/migrate-dev.sh`, which refuses the
  production project. The log is `docs/o1/migration-log.md`.
