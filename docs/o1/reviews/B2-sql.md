# B2 SQL review (R, run O1): 001, L01, 002a to 002d and rollbacks, lib/site/scope.ts

Verdict: PASS. Branch o1/B2 at 170bbaeb. Blockers: none.

Proof (local PG18 cluster on 127.0.0.1:54417, no unix socket, en_US.UTF-8, platform part of schema.base.sql then ~/kpq-o1/prod-public.sql; o1-scratch not touched, B2's scratch log shows 17.11):

- Tables: the 24 names of 002a (ALTERs, FK loop, self-check), 002a rollback, 002b and 002b rollback equal schema.sql "@file 002a"; each is a CREATE TABLE in prod-public.sql. No site_id column, no sites table, none of the 9 index names, trigger or function exists there; no partitioned table (NOT VALID FKs on those fail on PG17).
- 002a is catalog only: seq_scan sum over the 24 tables 0 before and 0 after 002a (24 after 002b); relfilenode of quizzes, groups, activity_events unchanged. Locks: one transaction, lock_timeout 3s (002a line 25), fails whole rather than queue.
- Row shape: no production function returns SETOF or a rowtype of the 24 tables; no NEW.*, INSERT ... SELECT * or RETURNING * into them; live_join's live_rooms%ROWTYPE takes SELECT * INTO, so the extra column is absorbed.
- Idempotent: the 6 files applied twice, ok; full reverse rollback twice, ok; pg_dump --schema-only after it is identical to the base copy; 002d, 002c, 002b each rolled back then reapplied, ok (24 of 24 FKs valid again).
- Refusals hold: 001 rollback refused while the 24 FKs exist (001 rollback line 26); 002a rollback refused while the trigger exists (line 30).
- Transaction mode: 002b line 12, 002c line 12, 002c rollback line 9 carry "-- o1-transaction: none" (migrate-dev.sh line 73); VALIDATE alone in 002b; CREATE INDEX CONCURRENTLY one per statement with an invalid-index check (002c lines 31 to 51). The 9 index definitions equal schema.sql.
- RLS: sites relrowsecurity t, one policy sites_read (select). As authenticated, an insert into sites is refused by RLS; as anon, update and delete touch 0 rows.
- 002d: SECURITY DEFINER with search_path = public (line 28), the only definer function; EXECUTE revoked from public, anon, authenticated (line 48). As role authenticated (no EXECUTE), a kpop quiz insert and a group_id update pass with site_id kpop: firing does not check EXECUTE.
- Guard cost: 20000-row quiz insert, other triggers off, 1.19 to 1.37 s with the guard vs 1.07 to 1.22 s without (about 5 to 11 microseconds per row, one groups primary key read); with production's triggers on, 32.3 s vs 32.7 s. It returns early on a null or missing group and raises 23514 only when NEW.site_id differs from the group's (lines 33 to 43); play and counter updates do not fire it (UPDATE OF site_id, group_id).
- Rollbacks undo their file: 002d drops trigger then function; 002c drops the 9 indexes concurrently; 002b puts the 24 keys back to NOT VALID; 002a drops keys and columns, refusing while a non-kpop row exists; L01 deletes anime and hub, refusing while any FK row references them; 001 drops sites.
- Production ref: absent from every file B2 added or changed (SQL, launch files, report, evidence, lib/site, readers, scripts).
- scope.ts: on the kpop build with SITE_SCOPE off, siteScoped is false (line 28), forSite returns the query and withSite the same row, so kpopquiz.org sends today's requests before and after 002a.
